<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { api } from "../api";
import { getAnimal } from "../services/animals";

const route = useRoute();
const animal = ref(null);
const loading = ref(false);
const error = ref("");

const apiOrigin = new URL(api.defaults.baseURL).origin;

const statusText = computed(() => {
  if (!animal.value) return "";
  if (animal.value.status === "looking_home") return "Ищет дом";
  if (animal.value.status === "treatment") return "На лечении";
  if (animal.value.status === "adopted") return "Пристроен";
  return animal.value.status || "Без статуса";
});

const photoUrl = computed(() => getAnimalImage(animal.value?.photo));

function getAnimalImage(photo) {
  const value = String(photo || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `http:${value}`;
  const normalized = value.startsWith("/") ? value : `/${value}`;
  return `${apiOrigin}${normalized}`;
}

async function loadAnimal() {
  loading.value = true;
  error.value = "";

  try {
    animal.value = await getAnimal(route.params.id);
  } catch (e) {
    animal.value = null;
    error.value = "Не удалось открыть карточку животного";
    console.error(e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadAnimal);
watch(() => route.params.id, loadAnimal);
</script>

<template>
  <section class="container detail-page">
    <RouterLink to="/animals" class="back-link">← Ко всем животным</RouterLink>

    <div v-if="loading" class="state-card">Загрузка карточки...</div>
    <div v-else-if="error" class="state-card error">{{ error }}</div>

    <article v-else-if="animal" class="detail-card">
      <div class="detail-media-wrap">
        <BaseImg
          v-if="photoUrl"
          :src="photoUrl"
          :alt="animal.name"
          class="detail-image"
        />
        <div v-else class="detail-image detail-image-fallback">🐾</div>
      </div>

      <div class="detail-body">
        <div class="eyebrow">Карточка животного</div>
        <h1 class="detail-title">{{ animal.name }}</h1>

        <div class="detail-meta">
          <span
            class="badge"
            :class="{
              info: animal.status === 'looking_home',
              warn: animal.status === 'treatment',
              ok: animal.status === 'adopted',
            }"
          >
            {{ statusText }}
          </span>

          <span class="meta-chip">{{ animal.species }}</span>
          <span class="meta-chip">{{ animal.age }}</span>
          <span class="meta-chip">{{ animal.city }}</span>
        </div>

        <p class="lead">
          {{
            animal.description ||
            "Описание для этого животного пока не добавлено."
          }}
        </p>

        <div class="facts">
          <div class="fact-card">
            <div class="fact-label">Город</div>
            <div class="fact-value">{{ animal.city }}</div>
          </div>

          <div class="fact-card">
            <div class="fact-label">Возраст</div>
            <div class="fact-value">{{ animal.age }}</div>
          </div>

          <div class="fact-card">
            <div class="fact-label">Статус</div>
            <div class="fact-value">{{ statusText }}</div>
          </div>
        </div>

        <div class="actions">
          <RouterLink
            v-if="animal.status !== 'adopted'"
            class="action-btn action-btn-primary"
            :to="`/help?tab=forms&animal=${encodeURIComponent(animal.name)}`"
          >
            Подать заявку
          </RouterLink>

          <span v-else class="action-btn action-btn-disabled">
            Животное уже пристроено
          </span>

          <RouterLink class="action-btn action-btn-secondary" to="/animals">
            Назад к списку
          </RouterLink>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.detail-page {
  padding-top: 26px;
  padding-bottom: 36px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 18px;
  color: var(--muted);
}

.back-link:hover {
  text-decoration: none;
  color: var(--text);
}

.state-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 18px;
  box-shadow: var(--shadow);
}

.state-card.error {
  color: #b91c1c;
  border-color: rgba(185, 28, 28, 0.2);
  background: rgba(254, 242, 242, 0.9);
}

.detail-card {
  display: grid;
  grid-template-columns: minmax(300px, 420px) minmax(0, 1fr);
  gap: 24px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 28px;
  padding: 22px;
  box-shadow: var(--shadow);
}

.detail-media-wrap {
  min-height: 380px;
}

.detail-image {
  width: 100%;
  height: 100%;
  min-height: 380px;
  border-radius: 22px;
  object-fit: cover;
  display: block;
  background: linear-gradient(
    180deg,
    rgba(245, 158, 11, 0.08),
    rgba(15, 23, 42, 0.04)
  );
}

.detail-image-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px;
}

.detail-body {
  display: flex;
  flex-direction: column;
}

.eyebrow {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--primary-dark);
}

.detail-title {
  margin: 10px 0 0;
  font-size: clamp(32px, 4vw, 44px);
  line-height: 1.05;
}

.detail-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.badge,
.meta-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
}

.badge.info {
  background: rgba(59, 130, 246, 0.14);
  color: #1d4ed8;
}

.badge.warn {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
}

.badge.ok {
  background: rgba(34, 197, 94, 0.16);
  color: #15803d;
}

.meta-chip {
  background: rgba(148, 163, 184, 0.12);
  color: #334155;
}

.lead {
  margin: 18px 0 0;
  font-size: 16px;
  line-height: 1.7;
  color: #0f172a;
}

.facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 22px;
}

.fact-card {
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 14px;
  background: rgba(248, 250, 252, 0.9);
}

.fact-label {
  color: var(--muted);
  font-size: 13px;
}

.fact-value {
  margin-top: 6px;
  font-weight: 800;
  color: #0f172a;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: auto;
  padding-top: 24px;
}

.action-btn {
  position: relative;
  overflow: hidden;
  flex: 1;
  min-height: 46px;
  padding: 10px 14px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    color 0.18s ease;
}

.action-btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -140%;
  width: 60%;
  height: 100%;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(255, 255, 255, 0.12) 45%,
    rgba(255, 255, 255, 0.28) 50%,
    transparent 55%
  );
  transition: left 0.5s ease;
}

.action-btn:hover::before {
  left: 150%;
}

.action-btn:hover {
  transform: translateY(-2px);
}

.action-btn:active {
  transform: translateY(0) scale(0.985);
}

.action-btn-primary {
  background: linear-gradient(135deg, #f59e0b 0%, #f7b733 100%);
  color: #111827;
  box-shadow: 0 8px 18px rgba(245, 158, 11, 0.22);
}

.action-btn-primary:hover {
  box-shadow: 0 12px 22px rgba(245, 158, 11, 0.28);
}

.action-btn-secondary {
  background: #fff;
  color: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.05);
}

.action-btn-secondary:hover {
  background: #fffaf2;
  border-color: rgba(245, 158, 11, 0.3);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
}

.action-btn-disabled {
  background: #e5e7eb;
  color: #6b7280;
  border: 1px solid #d1d5db;
  cursor: not-allowed;
  box-shadow: none;
}

.action-btn-disabled:hover {
  transform: none;
  box-shadow: none;
}

@media (max-width: 920px) {
  .detail-card {
    grid-template-columns: 1fr;
  }

  .detail-media-wrap,
  .detail-image {
    min-height: 320px;
  }
}

@media (max-width: 640px) {
  .actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }
}

@media (max-width: 900px) {
  .animal-detail-card,
  .detail-card {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .animal-media,
  .detail-media,
  .animal-photo,
  .detail-photo {
    min-height: 260px;
  }
}

@media (max-width: 390px) {
  .animal-detail-page,
  .detail-page {
    padding-top: 20px;
    padding-bottom: 28px;
  }

  .back-link {
    margin-bottom: 14px;
    font-size: 14px;
  }

  .animal-detail-card,
  .detail-card {
    padding: 14px;
    border-radius: 20px;
    gap: 16px;
  }

  .animal-photo,
  .detail-photo {
    min-height: 220px;
    height: 220px;
    border-radius: 16px;
  }

  .eyebrow {
    font-size: 11px;
  }

  .title,
  .animal-title,
  .detail-title {
    font-size: 32px;
    line-height: 1.08;
  }

  .meta,
  .animal-meta {
    gap: 8px;
  }

  .badge,
  .chip {
    font-size: 12px;
    padding: 7px 10px;
  }

  .desc,
  .description {
    font-size: 15px;
    line-height: 1.65;
  }

  .actions,
  .animal-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .actions .btn,
  .animal-actions .btn {
    width: 100%;
  }
}

/* Детальная страница животного */
.detail-media-wrap {
  width: 100%;
  min-height: 380px;
  overflow: hidden;
  border-radius: 22px;
  background: linear-gradient(
    180deg,
    rgba(245, 158, 11, 0.08),
    rgba(15, 23, 42, 0.04)
  );
}

.detail-image {
  width: 100%;
  height: 100%;
  min-height: 380px;
  object-fit: cover;
  object-position: center 35%;
  display: block;
  border-radius: 22px;
}

.detail-image-fallback {
  width: 100%;
  height: 100%;
  min-height: 380px;
}

@media (max-width: 920px) {
  .detail-media-wrap,
  .detail-image,
  .detail-image-fallback {
    min-height: 320px;
  }
}

@media (max-width: 390px) {
  .detail-media-wrap,
  .detail-image,
  .detail-image-fallback {
    min-height: 230px;
    height: 230px;
    border-radius: 16px;
  }
}
</style>
