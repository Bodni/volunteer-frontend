const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');

const app = express();
app.use(express.json());

const users = []; // для диплома можно заменить на БД

const JWT_SECRET = 'super_secret_key';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 15;

function validatePassword(password) {
  return (
    password.length >= 8 &&
    /[A-ZА-ЯЁ]/.test(password) &&
    /[a-zа-яё]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*()_\-+=[\]{};:'"\\|,.<>/?]/.test(password)
  );
}

app.post('/auth/register', async (req, res) => {
  try {
    let { name, email, password, phone } = req.body;

    email = String(email || '').trim().toLowerCase();
    name = String(name || '').trim();

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Заполните все обязательные поля' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        message: 'Пароль не соответствует требованиям безопасности',
      });
    }

    const exists = users.find(u => u.email === email);
    if (exists) {
      return res.status(409).json({ message: 'Пользователь уже существует' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const twoFactorSecret = speakeasy.generateSecret({
      name: `DiplomaApp (${email})`,
    });

    const user = {
      id: Date.now(),
      name,
      email,
      phone: phone || '',
      passwordHash,
      role: 'user',
      twoFactorEnabled: true,
      twoFactorSecret: twoFactorSecret.base32,
      loginAttempts: 0,
      lockUntil: null,
      resetTokenHash: null,
      resetTokenExpires: null,
    };

    users.push(user);

    return res.status(201).json({
      message: 'Пользователь зарегистрирован',
      twoFactorSetup: {
        secret: twoFactorSecret.base32,
        otpauth_url: twoFactorSecret.otpauth_url,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    email = String(email || '').trim().toLowerCase();

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      return res.status(423).json({
        message: 'Аккаунт временно заблокирован из-за большого числа неудачных попыток входа',
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockDate = new Date();
        lockDate.setMinutes(lockDate.getMinutes() + LOCK_TIME_MINUTES);
        user.lockUntil = lockDate.toISOString();
      }

      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    user.loginAttempts = 0;
    user.lockUntil = null;

    const tempToken = jwt.sign(
      { userId: user.id, stage: '2fa_pending' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    return res.json({
      message: 'Введите код двухфакторной аутентификации',
      need2fa: true,
      tempToken,
    });
  } catch (e) {
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.post('/auth/verify-2fa', (req, res) => {
  try {
    const { tempToken, otp } = req.body;

    const decoded = jwt.verify(tempToken, JWT_SECRET);
    if (decoded.stage !== '2fa_pending') {
      return res.status(401).json({ message: 'Некорректная сессия 2FA' });
    }

    const user = users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: String(otp),
      window: 1,
    });

    if (!verified) {
      return res.status(401).json({ message: 'Неверный код 2FA' });
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      message: 'Вход выполнен',
      token: accessToken,
      role: user.role,
    });
  } catch (e) {
    return res.status(401).json({ message: 'Ошибка подтверждения 2FA' });
  }
});

app.post('/auth/forgot-password', async (req, res) => {
  try {
    let { email } = req.body;
    email = String(email || '').trim().toLowerCase();

    const user = users.find(u => u.email === email);

    if (!user) {
      return res.json({
        message: 'Если пользователь существует, инструкция по восстановлению отправлена',
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetTokenHash = tokenHash;
    user.resetTokenExpires = Date.now() + 1000 * 60 * 15;

    // В реальном проекте здесь отправка email
    return res.json({
      message: 'Ссылка для восстановления сформирована',
      demoResetLink: `http://localhost:5173/reset-password/${rawToken}`,
    });
  } catch (e) {
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Пароли не совпадают' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Пароль не соответствует политике безопасности' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = users.find(
      u => u.resetTokenHash === tokenHash && u.resetTokenExpires && u.resetTokenExpires > Date.now()
    );

    if (!user) {
      return res.status(400).json({ message: 'Токен недействителен или истёк' });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetTokenHash = null;
    user.resetTokenExpires = null;
    user.loginAttempts = 0;
    user.lockUntil = null;

    return res.json({ message: 'Пароль успешно изменён' });
  } catch (e) {
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});