<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { getAnimals } from "../services/animals";
import {
  getUsers,
  createUser,
  deleteUser,
  resetUserPassword,
  addUserPoints,
  updateUserAvatar,
  getBestVolunteer,
} from "../services/users";
import { api } from "../api";
import { me } from "../auth";
import { getNews, createNews, updateNews, deleteNews } from "../services/news";
import {
  getDonations,
  createDonation,
  updateDonation,
  deleteDonation,
} from "../services/donations";
import "../assets/admin.css";
const currentAdminTabLabel = computed(() => {
  const item = tabs.find((item) => item.key === tab.value);
  return item?.label || "Раздел";
});

const loadedTabs = reactive({
  users: false,
  animals: false,
  tasks: false,
  found: false,
  adoption: false,
  news: false,
  donations: false,
  rewards: false,
  orders: false,
});

const tab = ref("users");
const adminTabsOpen = ref(false);

const tabs = [
  { key: "users", label: "Пользователи" },
  { key: "animals", label: "Животные" },
  { key: "tasks", label: "Задачи" },
  { key: "found", label: "Найденные" },
  { key: "adoption", label: "Пристройство" },
  { key: "news", label: "Новости" },
  { key: "donations", label: "Донаты" },
  { key: "rewards", label: "Награды" },
  { key: "reward-orders", label: "Обмены" },
];

function selectAdminTab(key) {
  tab.value = key;
  adminTabsOpen.value = false;
}
const loading = ref(false);
const error = ref("");

const toast = reactive({
  show: false,
  message: "",
  type: "info",
  timer: null,
});

const confirmModal = reactive({
  show: false,
  message: "",
  resolve: null,
});

function notify(message, type = "info") {
  if (toast.timer) {
    clearTimeout(toast.timer);
  }

  toast.message = message;
  toast.type = type;
  toast.show = true;

  toast.timer = setTimeout(() => {
    toast.show = false;
  }, 3000);
}

function askConfirm(message) {
  confirmModal.message = message;
  confirmModal.show = true;

  return new Promise((resolve) => {
    confirmModal.resolve = resolve;
  });
}

function confirmYes() {
  confirmModal.show = false;

  if (confirmModal.resolve) {
    confirmModal.resolve(true);
    confirmModal.resolve = null;
  }
}

function confirmNo() {
  confirmModal.show = false;

  if (confirmModal.resolve) {
    confirmModal.resolve(false);
    confirmModal.resolve = null;
  }
}

const adminPerPage = 5;

const adminFilters = reactive({
  usersSearch: "",
  usersRole: "all",

  animalsSearch: "",
  animalsStatus: "active",

  tasksSearch: "",
  tasksStatus: "all",
  tasksAssignee: "all",

  foundSearch: "",
  foundStatus: "all",

  adoptionSearch: "",
  adoptionStatus: "all",

  newsSearch: "",

  donationsSearch: "",

  rewardsSearch: "",
  rewardsCategory: "all",
  rewardsActive: "all",

  ordersSearch: "",
  ordersStatus: "all",
});

const adminPages = reactive({
  users: 1,
  animals: 1,
  tasks: 1,
  found: 1,
  adoption: 1,
  news: 1,
  donations: 1,
  rewards: 1,
  orders: 1,
});

function text(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function includesAny(item, search, fields) {
  const query = text(search);
  if (!query) return true;

  return fields.some((field) => text(item?.[field]).includes(query));
}

function paginate(items, pageKey) {
  const list = asList(items);
  const page = adminPages[pageKey] || 1;
  const start = (page - 1) * adminPerPage;

  return list.slice(start, start + adminPerPage);
}

function getPageCount(items) {
  return Math.max(1, Math.ceil(asList(items).length / adminPerPage));
}

function goAdminPage(pageKey, pageNum, pageCount) {
  if (pageNum < 1 || pageNum > pageCount) return;
  adminPages[pageKey] = pageNum;
}

watch(adminFilters, () => {
  Object.keys(adminPages).forEach((key) => {
    adminPages[key] = 1;
  });
});

const currentUser = ref(null);
const bestVolunteer = ref(null);

const users = ref([]);
const animals = ref([]);
const tasks = ref([]);
const foundRequests = ref([]);
const adoptionRequests = ref([]);

const userForm = reactive({
  name: "",
  email: "",
  password: "",
  role: "volunteer",
});

const animalForm = reactive({
  name: "",
  species: "",
  age: "",
  city: "",
  status: "looking_home",
  description: "",
  photo: null,
});

const taskForm = reactive({
  title: "",
  description: "",
  status: "open",
  assigned_to: "",
  points: 10,
});

const actionForm = reactive({
  passwordByUserId: {},
  pointsByUserId: {},
  avatarFileByUserId: {},
});

const animalPhotoName = ref("");
const taskPhotoName = ref("");
const taskPhotoFile = ref(null);

const rewards = ref([]);
const rewardOrders = ref([]);
const rewardPhotoName = ref("");
const rewardPhotoFile = ref(null);
const newsImageFile = ref(null);
const newsImageInput = ref(null);

const animalStatusText = {
  looking_home: "ищет дом",
  treatment: "на лечении",
  adopted: "пристроен",
};

const taskStatusText = {
  open: "открыта",
  in_progress: "в работе",
  done_pending: "на проверке",
  done: "выполнена",
};

const requestStatusOptions = ["new", "in_progress", "done", "rejected"];

const volunteers = computed(() =>
  asList(users.value).filter((u) => u.role === "volunteer"),
);
const usersSorted = computed(() =>
  [...asList(users.value)].sort((a, b) => a.id - b.id),
);
const animalsSorted = computed(() =>
  [...asList(animals.value)].sort((a, b) => a.id - b.id),
);

const tasksSorted = computed(() =>
  [...asList(tasks.value)].sort((a, b) => a.id - b.id),
);
const foundSorted = computed(() =>
  [...asList(foundRequests.value)].sort((a, b) => a.id - b.id),
);
const adoptionSorted = computed(() =>
  [...asList(adoptionRequests.value)].sort((a, b) => a.id - b.id),
);
const newsSorted = computed(() =>
  [...asList(news.value)].sort((a, b) => Number(b.id) - Number(a.id)),
);
const rewardsSorted = computed(() =>
  [...asList(rewards.value)].sort((a, b) => Number(b.id) - Number(a.id)),
);
const rewardOrdersSorted = computed(() =>
  [...asList(rewardOrders.value)].sort((a, b) => Number(b.id) - Number(a.id)),
);

const usersFiltered = computed(() => {
  let items = usersSorted.value;

  if (adminFilters.usersRole !== "all") {
    items = items.filter((u) => u.role === adminFilters.usersRole);
  }

  return items.filter((u) =>
    includesAny(u, adminFilters.usersSearch, ["name", "email", "role"]),
  );
});

const usersPaged = computed(() => paginate(usersFiltered.value, "users"));
const usersPageCount = computed(() => getPageCount(usersFiltered.value));

const animalsFiltered = computed(() => {
  let items = animalsSorted.value;

  if (adminFilters.animalsStatus === "active") {
    items = items.filter((a) => a.status !== "adopted");
  }

  if (adminFilters.animalsStatus === "archived") {
    items = items.filter((a) => a.status === "adopted");
  }

  return items.filter((a) =>
    includesAny(a, adminFilters.animalsSearch, [
      "name",
      "species",
      "age",
      "city",
      "status",
      "description",
    ]),
  );
});

const animalsPaged = computed(() => paginate(animalsFiltered.value, "animals"));
const animalsPageCount = computed(() => getPageCount(animalsFiltered.value));

const activeAnimalsCount = computed(
  () => asList(animals.value).filter((a) => a.status !== "adopted").length,
);

const archivedAnimalsCount = computed(
  () => asList(animals.value).filter((a) => a.status === "adopted").length,
);

const tasksFiltered = computed(() => {
  let items = tasksSorted.value;

  if (adminFilters.tasksStatus !== "all") {
    items = items.filter((t) => t.status === adminFilters.tasksStatus);
  }

  if (adminFilters.tasksAssignee !== "all") {
    if (adminFilters.tasksAssignee === "none") {
      items = items.filter((t) => !t.assignee && !t.assigned_to);
    } else {
      items = items.filter(
        (t) =>
          String(t.assignee?.id || t.assigned_to || "") ===
          String(adminFilters.tasksAssignee),
      );
    }
  }

  return items.filter((t) =>
    includesAny(t, adminFilters.tasksSearch, [
      "title",
      "description",
      "status",
    ]),
  );
});

const tasksPaged = computed(() => paginate(tasksFiltered.value, "tasks"));
const tasksPageCount = computed(() => getPageCount(tasksFiltered.value));

const foundFiltered = computed(() => {
  let items = foundSorted.value;

  if (adminFilters.foundStatus !== "all") {
    items = items.filter((i) => i.status === adminFilters.foundStatus);
  }

  return items.filter((i) =>
    includesAny(i, adminFilters.foundSearch, [
      "city",
      "address",
      "description",
      "status",
    ]),
  );
});

const foundPaged = computed(() => paginate(foundFiltered.value, "found"));
const foundPageCount = computed(() => getPageCount(foundFiltered.value));

const adoptionFiltered = computed(() => {
  let items = adoptionSorted.value;

  if (adminFilters.adoptionStatus !== "all") {
    items = items.filter((i) => i.status === adminFilters.adoptionStatus);
  }

  return items.filter((i) =>
    includesAny(i, adminFilters.adoptionSearch, [
      "animal_name",
      "name",
      "phone",
      "message",
      "status",
    ]),
  );
});

const adoptionPaged = computed(() =>
  paginate(adoptionFiltered.value, "adoption"),
);
const adoptionPageCount = computed(() => getPageCount(adoptionFiltered.value));

const newsFiltered = computed(() => {
  return newsSorted.value.filter((i) =>
    includesAny(i, adminFilters.newsSearch, ["title", "text", "published_at"]),
  );
});

const newsPaged = computed(() => paginate(newsFiltered.value, "news"));
const newsPageCount = computed(() => getPageCount(newsFiltered.value));

const donationsFiltered = computed(() => {
  return asList(donations.value).filter((i) =>
    includesAny(i, adminFilters.donationsSearch, [
      "id",
      "goal",
      "raised",
      "text",
    ]),
  );
});

const donationsPaged = computed(() =>
  paginate(donationsFiltered.value, "donations"),
);
const donationsPageCount = computed(() =>
  getPageCount(donationsFiltered.value),
);

const rewardsFiltered = computed(() => {
  let items = rewardsSorted.value;

  if (adminFilters.rewardsCategory !== "all") {
    items = items.filter((r) => r.category === adminFilters.rewardsCategory);
  }

  if (adminFilters.rewardsActive !== "all") {
    const needActive = adminFilters.rewardsActive === "active";
    items = items.filter((r) => Boolean(r.is_active) === needActive);
  }

  return items.filter((r) =>
    includesAny(r, adminFilters.rewardsSearch, [
      "title",
      "partner_name",
      "description",
      "category",
    ]),
  );
});

const rewardsPaged = computed(() => paginate(rewardsFiltered.value, "rewards"));
const rewardsPageCount = computed(() => getPageCount(rewardsFiltered.value));

const rewardOrdersFiltered = computed(() => {
  let items = rewardOrdersSorted.value;

  if (adminFilters.ordersStatus !== "all") {
    items = items.filter((o) => o.status === adminFilters.ordersStatus);
  }

  const query = text(adminFilters.ordersSearch);
  if (!query) return items;

  return items.filter(
    (o) =>
      text(o.id).includes(query) ||
      text(o.status).includes(query) ||
      text(o.reward?.title).includes(query) ||
      text(o.user?.name).includes(query) ||
      text(o.user?.email).includes(query),
  );
});

const rewardOrdersPaged = computed(() =>
  paginate(rewardOrdersFiltered.value, "orders"),
);
const rewardOrdersPageCount = computed(() =>
  getPageCount(rewardOrdersFiltered.value),
);

const apiOrigin = new URL(api.defaults.baseURL).origin;

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function getImageUrl(path) {
  const value = String(path || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `http:${value}`;
  const normalized = value.startsWith("/") ? value : `/${value}`;
  return `${apiOrigin}${normalized}`;
}

function getMediaUrl(path) {
  return getImageUrl(path);
}

function rewardCategoryText(category) {
  const map = {
    certificates: "Сертификаты",
    discounts: "Скидки",
    merch: "Мерч",
    gifts: "Подарки",
    other: "Другое",
  };
  return map[category] || category || "Другое";
}

function resetUserForm() {
  userForm.name = "";
  userForm.email = "";
  userForm.password = "";
  userForm.role = "volunteer";
}

function resetAnimalForm() {
  animalForm.name = "";
  animalForm.species = "";
  animalForm.age = "";
  animalForm.city = "";
  animalForm.status = "looking_home";
  animalForm.description = "";
  animalForm.photo = null;
  animalPhotoName.value = "";
}

function resetTaskForm() {
  taskForm.title = "";
  taskForm.description = "";
  taskForm.status = "open";
  taskForm.assigned_to = "";
  taskForm.points = 10;
  taskPhotoFile.value = null;
  taskPhotoName.value = "";
}

function resetRewardForm() {
  rewardForm.title = "";
  rewardForm.partner_name = "";
  rewardForm.description = "";
  rewardForm.price_points = 0;
  rewardForm.stock = 0;
  rewardForm.category = "other";
  rewardForm.is_active = true;
  rewardPhotoFile.value = null;
  rewardPhotoName.value = "";
}

async function loadUsersData() {
  users.value = asList(await getUsers());
  bestVolunteer.value = await getBestVolunteer().catch(() => null);
}

async function loadAnimals() {
  const response = await getAnimals({
    status: "all",
    page: 1,
    per_page: 1000,
  });

  animals.value = asList(response);
}

async function loadTasks() {
  const { data } = await api.get("/tasks");
  tasks.value = asList(data);
}

async function loadFoundRequests() {
  const { data } = await api.get("/found-requests");
  foundRequests.value = asList(data);
}

async function loadAdoptionRequests() {
  const { data } = await api.get("/adoption-requests");
  adoptionRequests.value = asList(data);
}

async function loadCurrentUser() {
  currentUser.value = await me();
}

async function loadTabData(tabName) {
  error.value = ""

  const alreadyLoaded =
    (tabName === "users" && loadedTabs.users) ||
    (tabName === "animals" && loadedTabs.animals) ||
    (tabName === "tasks" && loadedTabs.tasks) ||
    (tabName === "found" && loadedTabs.found) ||
    (tabName === "adoption" && loadedTabs.adoption) ||
    (tabName === "news" && loadedTabs.news) ||
    (tabName === "donations" && loadedTabs.donations) ||
    (tabName === "rewards" && loadedTabs.rewards) ||
    (tabName === "reward-orders" && loadedTabs.orders)

  if (alreadyLoaded) {
    return
  }

  loading.value = true

  try {
    if (tabName === "users") {
      await loadUsersData()
      loadedTabs.users = true
    }

    if (tabName === "animals") {
      await loadAnimals()
      loadedTabs.animals = true
    }

    if (tabName === "tasks") {
      await loadTasks()
      loadedTabs.tasks = true
    }

    if (tabName === "found") {
      await loadFoundRequests()
      loadedTabs.found = true
    }

    if (tabName === "adoption") {
      await loadAdoptionRequests()
      loadedTabs.adoption = true
    }

    if (tabName === "news") {
      await loadNews()
      loadedTabs.news = true
    }

    if (tabName === "donations") {
      await loadDonations()
      loadedTabs.donations = true
    }

    if (tabName === "rewards") {
      await loadRewards()
      loadedTabs.rewards = true
    }

    if (tabName === "reward-orders") {
      await loadRewardOrders()
      loadedTabs.orders = true
    }
  } catch (e) {
    console.error(e)
    error.value =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      "Не удалось загрузить раздел."
  } finally {
    loading.value = false
  }
}

function handleNewsImageChange(event) {
  newsImageFile.value = event.target.files?.[0] || null;
}
async function handleCreateUser() {
  if (
    !userForm.name.trim() ||
    !userForm.email.trim() ||
    !userForm.password.trim()
  ) {
    notify("Заполни имя, email и пароль");
    return;
  }

  try {
    await createUser({
      name: userForm.name.trim(),
      email: userForm.email.trim(),
      password: userForm.password.trim(),
      role: userForm.role,
    });

    resetUserForm();
    await loadUsersData();
    notify("Пользователь добавлен ✅");
  } catch (e) {
    console.error(e);
    notify(e?.response?.data?.message || "Не удалось создать пользователя");
  }
}

async function handleDeleteUser(user) {
  const confirmed = await askConfirm(`Удалить пользователя ${user.name}?`);
  if (!confirmed) return;

  try {
    await deleteUser(user.id);
    await Promise.all([loadUsersData(), loadTasks()]);
    notify("Пользователь удалён", "success");
  } catch (e) {
    console.error(e);
    notify(
      e?.response?.data?.message || "Не удалось удалить пользователя",
      "error",
    );
  }
}

async function handleResetPassword(user) {
  const password = String(actionForm.passwordByUserId[user.id] || "").trim();

  if (!password) {
    notify("Введи новый пароль");
    return;
  }

  if (password.length < 6) {
    notify("Пароль должен быть минимум 6 символов");
    return;
  }

  try {
    await resetUserPassword(user.id, password);
    actionForm.passwordByUserId[user.id] = "";
    notify("Пароль обновлён ✅");
  } catch (e) {
    console.error(e);
    notify(e?.response?.data?.message || "Не удалось обновить пароль");
  }
}

async function handleAddPoints(user) {
  const raw = actionForm.pointsByUserId[user.id];
  const delta = Number(raw);

  if (!Number.isFinite(delta) || delta === 0) {
    notify("Введи число баллов");
    return;
  }

  try {
    await addUserPoints(user.id, delta);
    actionForm.pointsByUserId[user.id] = "";
    await loadUsersData();
  } catch (e) {
    console.error(e);
    notify("Не удалось обновить баллы");
  }
}

async function handleUpdateAvatar(user) {
  const file = actionForm.avatarFileByUserId[user.id];

  if (!file) {
    notify("Выбери файл аватара");
    return;
  }

  if (!file.type.startsWith("image/")) {
    notify("Нужна картинка");
    return;
  }

  try {
    await updateUserAvatar(user.id, file);
    actionForm.avatarFileByUserId[user.id] = null;
    await loadUsersData();
    notify("Аватар обновлён ✅");
  } catch (e) {
    console.error(e);
    notify(e?.response?.data?.message || "Не удалось обновить аватар");
  }
}

function handleAvatarFileChange(user, event) {
  actionForm.avatarFileByUserId[user.id] = event.target.files?.[0] || null;
}

function onAnimalPhotoChange(e) {
  const file = e.target.files?.[0] || null;
  if (!file) {
    animalForm.photo = null;
    animalPhotoName.value = "";
    return;
  }

  const max = 4 * 1024 * 1024;
  if (file.size > max) {
    notify("Файл слишком большой. Максимум 4MB");
    e.target.value = "";
    animalForm.photo = null;
    animalPhotoName.value = "";
    return;
  }

  if (!file.type.startsWith("image/")) {
    notify("Нужна картинка (jpg/png/webp)");
    e.target.value = "";
    animalForm.photo = null;
    animalPhotoName.value = "";
    return;
  }

  animalForm.photo = file;
  animalPhotoName.value = file.name;
}

function formatDate(value) {
  if (!value) return "Дата не указана";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

async function handleCreateAnimal() {
  if (
    !animalForm.name.trim() ||
    !animalForm.species.trim() ||
    !animalForm.age.trim() ||
    !animalForm.city.trim()
  ) {
    notify("Заполни имя, вид, возраст и город");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("name", animalForm.name.trim());
    formData.append("species", animalForm.species.trim());
    formData.append("age", animalForm.age.trim());
    formData.append("city", animalForm.city.trim());
    formData.append("status", animalForm.status);
    formData.append("description", animalForm.description.trim());

    if (animalForm.photo) {
      formData.append("photo", animalForm.photo);
    }

    await api.post("/animals", formData);

    resetAnimalForm();
    await loadAnimals();
    notify("Животное добавлено", "success");
  } catch (e) {
    console.error(e);
    notify("Не удалось добавить животное");
  }
}

async function handleDeleteAnimal(animal) {
  const confirmed = await askConfirm(`Удалить животное "${animal.name}"?`);
  if (!confirmed) return;

  try {
    await api.delete(`/animals/${animal.id}`);
    notify("Животное удалено", "success");
    await loadAnimals();
  } catch (e) {
    console.error(e);
    notify("Не удалось удалить животное", "error");
  }
}

async function handleAnimalStatus(animal, status) {
  try {
    await api.put(`/animals/${animal.id}`, { status });
    await loadAnimals();
  } catch (e) {
    console.error(e);
    notify("Не удалось обновить статус животного");
  }
}

function onTaskPhotoChange(e) {
  const file = e.target.files?.[0] || null;
  if (!file) {
    taskPhotoFile.value = null;
    taskPhotoName.value = "";
    return;
  }

  if (!file.type.startsWith("image/")) {
    notify("Нужна картинка (jpg/png/webp)");
    e.target.value = "";
    taskPhotoFile.value = null;
    taskPhotoName.value = "";
    return;
  }

  taskPhotoFile.value = file;
  taskPhotoName.value = file.name;
}

async function handleCreateTask() {
  try {
    const formData = new FormData();

    formData.append("title", taskForm.title || "");
    formData.append("description", taskForm.description || "");
    formData.append("points", taskForm.points || 10);

    if (taskForm.assigned_to) {
      formData.append("assigned_to", taskForm.assigned_to);
    }

    if (taskForm.photo) {
      formData.append("photo", taskForm.photo);
    }

    await api.post("/tasks", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    resetTaskForm();
    notify("Задача создана", "success");

    try {
      await loadTasks();
    } catch (e) {
      console.error(e);
      notify("Задача создана, но список не обновился", "info");
    }
  } catch (e) {
    console.error(e);
    notify(e?.response?.data?.message || "Не удалось создать задачу", "error");
  }
}

async function handleDeleteTask(task) {
  const confirmed = await askConfirm(`Удалить задачу "${task.title}"?`);
  if (!confirmed) return;

  try {
    await api.delete(`/tasks/${task.id}`);
    await loadTasks();

    notify("Задача удалена", "success");
  } catch (e) {
    console.error(e);

    notify("Не удалось удалить задачу", "error");
  }
}

async function handleTaskStatus(task, status) {
  try {
    await api.put(`/tasks/${task.id}`, { status });
    await loadTasks();
  } catch (e) {
    console.error(e);
    notify("Не удалось обновить статус задачи");
  }
}

async function handleTaskAssignee(task, assignedTo) {
  try {
    await api.put(`/tasks/${task.id}`, {
      assigned_to: assignedTo ? Number(assignedTo) : null,
      status: assignedTo ? "in_progress" : "open",
    });
    await loadTasks();
  } catch (e) {
    console.error(e);
    notify("Не удалось назначить задачу");
  }
}

async function handleFoundStatus(item, status) {
  try {
    await api.put(`/found-requests/${item.id}`, { status });
    await loadFoundRequests();
  } catch (e) {
    console.error(e);
    notify("Не удалось обновить статус заявки");
  }
}

async function handleDeleteFound(item) {
  const confirmed = await askConfirm(`Удалить заявку #${item.id}?`);
  if (!confirmed) return;

  try {
    await api.delete(`/found-requests/${item.id}`);
    await loadFoundRequests();

    notify("Заявка удалена", "success");
  } catch (e) {
    console.error(e);

    notify("Не удалось удалить заявку", "error");
  }
}

async function handleAdoptionStatus(item, status) {
  try {
    await api.put(`/adoption-requests/${item.id}`, { status });
    await loadAdoptionRequests();
  } catch (e) {
    console.error(e);
    notify("Не удалось обновить статус заявки");
  }
}

async function handleDeleteAdoption(item) {
  const confirmed = await askConfirm(`Удалить заявку #${item.id}?`);
  if (!confirmed) return;

  try {
    await api.delete(`/adoption-requests/${item.id}`);
    await loadAdoptionRequests();

    notify("Заявка удалена", "success");
  } catch (e) {
    console.error(e);

    notify("Не удалось удалить заявку", "error");
  }
}

const news = ref([]);
const donations = ref([]);

const newsForm = reactive({
  title: "",
  published_at: "",
  text: "",
});

const donationForm = reactive({
  goal: 50000,
  raised: 0,
  text: "",
});

const rewardForm = reactive({
  title: "",
  partner_name: "",
  description: "",
  image: "",
  price_points: 0,
  stock: 0,
  category: "other",
  is_active: true,
});
const requestStatusText = {
  new: "Новая",
  approved: "Подтверждена",
  in_progress: "В работе",
  done: "Выполнена",
  rejected: "Отклонена",
};

function requestStatusClass(status) {
  if (status === "new") return "info";
  if (status === "approved") return "ok";
  if (status === "in_progress") return "warn";
  if (status === "done") return "ok";
  if (status === "rejected") return "danger-soft";
  return "info";
}
async function loadNews() {
  news.value = asList(await getNews());
}

async function loadDonations() {
  donations.value = asList(await getDonations());
}

async function handleCreateNews() {
  if (!newsForm.title.trim()) {
    notify("Заполни заголовок новости");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("title", newsForm.title.trim());
    formData.append("published_at", newsForm.published_at || "");
    formData.append("text", newsForm.text.trim());

    if (newsImageFile.value) {
      formData.append("image", newsImageFile.value);
    }

    await createNews(formData);

    resetNewsForm();
    await loadNews();
    notify("Новость добавлена ✅");
  } catch (e) {
    console.error(e);
    notify(e?.response?.data?.message || "Не удалось добавить новость");
  }
}

async function handleDeleteNews(item) {
  const confirmed = await askConfirm(`Удалить новость "${item.title}"?`);
  if (!confirmed) return;

  try {
    await deleteNews(item.id);
    await loadNews();

    notify("Новость удалена", "success");
  } catch (e) {
    console.error(e);

    notify("Не удалось удалить новость", "error");
  }
}

async function handleUpdateDonation(item) {
  try {
    await updateDonation(item.id, {
      goal: Number(item.goal),
      raised: Number(item.raised),
      text: item.text || "",
    });

    await loadDonations();
    notify("Сбор обновлён ✅");
  } catch (e) {
    console.error(e);
    notify("Не удалось обновить сбор");
  }
}

async function handleCreateDonation() {
  try {
    await createDonation({
      goal: Number(donationForm.goal),
      raised: Number(donationForm.raised),
      text: donationForm.text.trim(),
    });

    donationForm.goal = 50000;
    donationForm.raised = 0;
    donationForm.text = "";

    await loadDonations();
    notify("Сбор добавлен ✅");
  } catch (e) {
    console.error(e);
    notify("Не удалось создать сбор");
  }
}

async function handleDeleteDonation(item) {
  const confirmed = await askConfirm("Удалить сбор?");
  if (!confirmed) return;

  try {
    await deleteDonation(item.id);
    await loadDonations();

    notify("Сбор удалён", "success");
  } catch (e) {
    console.error(e);

    notify("Не удалось удалить сбор", "error");
  }
}
function resetNewsForm() {
  newsForm.title = "";
  newsForm.published_at = "";
  newsForm.text = "";
  newsImageFile.value = null;

  if (newsImageInput.value) {
    newsImageInput.value.value = "";
  }
}

async function loadRewards() {
  const { data } = await api.get("/rewards", {
    params: {
      page: 1,
      per_page: 30,
    },
  })

  rewards.value = asList(data)
}

async function loadRewardOrders() {
  const { data } = await api.get("/reward-orders", {
    params: {
      page: 1,
      per_page: 100,
      all: 1,
    },
  });

  rewardOrders.value = asList(data);
}

function onRewardPhotoChange(e) {
  const file = e.target.files?.[0] || null;
  if (!file) {
    rewardPhotoFile.value = null;
    rewardPhotoName.value = "";
    return;
  }

  if (!file.type.startsWith("image/")) {
    notify("Нужна картинка (jpg/png/webp)");
    e.target.value = "";
    rewardPhotoFile.value = null;
    rewardPhotoName.value = "";
    return;
  }

  rewardPhotoFile.value = file;
  rewardPhotoName.value = file.name;
}

async function handleCreateReward() {
  if (!rewardForm.title.trim()) {
    notify("Заполни название награды");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("title", rewardForm.title.trim());
    formData.append("partner_name", rewardForm.partner_name.trim());
    formData.append("description", rewardForm.description.trim());
    formData.append(
      "price_points",
      String(Number(rewardForm.price_points || 0)),
    );
    formData.append("stock", String(Number(rewardForm.stock || 0)));
    formData.append("category", rewardForm.category || "other");
    formData.append("is_active", rewardForm.is_active ? "1" : "0");

    if (rewardPhotoFile.value) {
      formData.append("image", rewardPhotoFile.value);
    }

    await api.post("/rewards", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    resetRewardForm();
    await loadRewards();
    notify("Награда добавлена ✅");
  } catch (e) {
    console.error(e);
    notify(e?.response?.data?.message || "Не удалось добавить награду");
  }
}

async function handleChangeRewardStock(reward, diff) {
  const newStock = Math.max(0, Number(reward.stock || 0) + diff)

  try {
    await api.put(`/rewards/${reward.id}`, {
      title: reward.title,
      partner_name: reward.partner_name || "",
      description: reward.description || "",
      price_points: Number(reward.price_points || 0),
      stock: newStock,
      category: reward.category || "other",
      is_active: Boolean(reward.is_active),
    })

    reward.stock = newStock
    notify("Количество подарков обновлено", "success")
  } catch (e) {
    console.error(e)
    notify(e?.response?.data?.message || "Не удалось изменить количество", "error")
  }
}

async function handleDeleteReward(reward) {
  const confirmed = await askConfirm(`Удалить награду "${reward.title}"?`);
  if (!confirmed) return;

  try {
    await api.delete(`/rewards/${reward.id}`);
    await loadRewards();

    notify("Награда удалена", "success");
  } catch (e) {
    console.error(e);

    notify(e?.response?.data?.message || "Не удалось удалить награду", "error");
  }
}

async function handleRewardOrderStatus(order, status) {
  try {
    await api.put(`/reward-orders/${order.id}`, {
      status,
      comment: order.comment || "",
    });
    await loadRewardOrders();
  } catch (e) {
    console.error(e);
    notify(e?.response?.data?.message || "Не удалось обновить статус обмена");
  }
}

async function handleDeleteRewardOrder(order) {
  const confirmed = await askConfirm(`Удалить заявку на обмен #${order.id}?`);

  if (!confirmed) return;

  try {
    await api.delete(`/reward-orders/${order.id}`);

    await loadRewardOrders();

    notify("Заявка на обмен удалена", "success");
  } catch (e) {
    console.error(e);

    notify(
      e?.response?.data?.message || "Не удалось удалить заявку на обмен",
      "error",
    );
  }
}
getNews({ page: 1, per_page: 10 });
watch(tab, async (newTab) => {
  await loadTabData(newTab);
});

onMounted(async () => {
  await loadCurrentUser();
  await loadTabData(tab.value);
});
</script>

<template>
  <div class="container">
    <div class="top">
      <div>
        <h1 class="h1">Админ-панель</h1>
        <div v-if="currentUser" class="muted">
          Вошли как: <b>{{ currentUser.name }}</b>
        </div>
      </div>

      <div class="admin-mobile-tabs">
        <button
          type="button"
          class="admin-mobile-tabs-btn"
          @click="adminTabsOpen = !adminTabsOpen"
        >
          <span>{{ currentAdminTabLabel }}</span>
          <span>☰</span>
        </button>

        <div v-if="adminTabsOpen" class="admin-mobile-tabs-menu">
          <button
            v-for="item in tabs"
            :key="item.key"
            type="button"
            class="admin-mobile-tab"
            :class="{ active: tab === item.key }"
            @click="selectAdminTab(item.key)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="tabs desktop-admin-tabs">
        <button
          v-for="item in tabs"
          :key="item.key"
          class="tab-btn"
          :class="{ active: tab === item.key }"
          @click="tab = item.key"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="state">Загрузка...</div>

    <div v-if="!loading && error" class="state error">{{ error }}</div>

    <template v-if="!loading">
      <div v-if="tab === 'users'" class="grid">
        <div class="card">
          <div class="card-title">Добавить пользователя</div>

          <div class="form">
            <label class="label"
              >Имя
              <input class="input" v-model="userForm.name" />
            </label>

            <label class="label"
              >Email
              <input class="input" type="email" v-model="userForm.email" />
            </label>

            <label class="label"
              >Пароль
              <input
                class="input"
                type="password"
                v-model="userForm.password"
              />
            </label>

            <label class="label"
              >Роль
              <select class="input" v-model="userForm.role">
                <option value="volunteer">Волонтёр</option>
                <option value="admin">Админ</option>
              </select>
            </label>

            <button
              class="btn btn-primary"
              style="width: auto"
              @click="handleCreateUser"
            >
              Добавить
            </button>
          </div>

          <div v-if="bestVolunteer" class="best-box">
            <div class="card-title" style="margin-bottom: 4px">
              Лучший волонтёр
            </div>
            <div>
              <b>{{ bestVolunteer.name }}</b>
            </div>
            <div class="muted small">Баллы: {{ bestVolunteer.points }}</div>
          </div>
        </div>

        <div class="list">
          <div class="admin-tools item">
            <input
              class="input"
              placeholder="Поиск по имени или email"
              v-model="adminFilters.usersSearch"
            />

            <select class="input" v-model="adminFilters.usersRole">
              <option value="all">Все роли</option>
              <option value="admin">Админы</option>
              <option value="volunteer">Волонтёры</option>
            </select>

            <div class="muted small">Найдено: {{ usersFiltered.length }}</div>
          </div>
          <div
            v-for="u in usersPaged"
            :key="u.id"
            class="item user-card better-user-card"
          >
            <div class="user-header-line">
              <div class="user-info">
                <div class="user-avatar-preview">
                  <img
                    v-if="getMediaUrl(u.avatar)"
                    :src="getMediaUrl(u.avatar)"
                    :alt="u.name"
                  />
                  <span v-else>{{ u.name?.[0] || "U" }}</span>
                </div>

                <div>
                  <div class="user-name">{{ u.name }}</div>
                  <div class="user-email">{{ u.email }}</div>
                  <div class="muted small">
                    ID: {{ u.id }} • Баллы: {{ u.points || 0 }}
                  </div>
                </div>
              </div>

              <span
                class="role-badge"
                :class="u.role === 'admin' ? 'admin' : 'volunteer'"
              >
                {{ u.role === "admin" ? "admin" : "volunteer" }}
              </span>
            </div>

            <div class="better-controls">
              <div class="better-control">
                <label class="better-label">Новый пароль</label>

                <div class="better-row">
                  <input
                    class="input better-input password-input"
                    type="password"
                    placeholder="Введите новый пароль"
                    v-model="actionForm.passwordByUserId[u.id]"
                  />

                  <button
                    class="btn soft-btn better-btn"
                    @click="handleResetPassword(u)"
                  >
                    Сменить
                  </button>
                </div>
              </div>

              <div v-if="u.role === 'volunteer'" class="better-control">
                <label class="better-label">Баллы</label>

                <div class="better-row">
                  <input
                    class="input better-input points-input"
                    type="number"
                    step="1"
                    placeholder="+10 / -5"
                    v-model="actionForm.pointsByUserId[u.id]"
                  />

                  <button
                    class="btn btn-primary better-btn"
                    @click="handleAddPoints(u)"
                  >
                    Начислить
                  </button>
                </div>
              </div>

              <div class="better-control">
                <label class="better-label">Аватар</label>

                <div class="better-row">
                  <input
                    class="input better-file"
                    type="file"
                    accept="image/*"
                    @change="handleAvatarFileChange(u, $event)"
                  />

                  <button
                    class="btn soft-btn better-btn"
                    @click="handleUpdateAvatar(u)"
                  >
                    Загрузить
                  </button>
                </div>
              </div>
            </div>

            <div v-if="u.role !== 'admin'" class="user-delete-row">
              <button
                class="btn danger-btn delete-user-btn"
                @click="handleDeleteUser(u)"
              >
                Удалить пользователя
              </button>
            </div>
          </div>
          <div v-if="usersPageCount > 1" class="admin-pagination item">
            <button
              class="page-btn"
              :disabled="adminPages.users === 1"
              @click="
                goAdminPage('users', adminPages.users - 1, usersPageCount)
              "
            >
              ‹
            </button>

            <button
              v-for="num in usersPageCount"
              :key="num"
              class="page-btn"
              :class="{ active: adminPages.users === num }"
              @click="goAdminPage('users', num, usersPageCount)"
            >
              {{ num }}
            </button>

            <button
              class="page-btn"
              :disabled="adminPages.users === usersPageCount"
              @click="
                goAdminPage('users', adminPages.users + 1, usersPageCount)
              "
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div v-if="tab === 'animals'" class="grid">
        <div class="card">
          <div class="card-title">Добавить животное</div>

          <div class="form">
            <label class="label"
              >Имя
              <input class="input" v-model="animalForm.name" />
            </label>

            <label class="label"
              >Вид
              <input class="input" v-model="animalForm.species" />
            </label>

            <label class="label"
              >Возраст
              <input class="input" v-model="animalForm.age" />
            </label>

            <label class="label"
              >Город
              <input class="input" v-model="animalForm.city" />
            </label>

            <label class="label"
              >Статус
              <select class="input" v-model="animalForm.status">
                <option value="looking_home">Ищет дом</option>
                <option value="treatment">На лечении</option>
                <option value="adopted">Пристроен</option>
              </select>
            </label>

            <label class="label"
              >Описание
              <textarea
                class="input"
                rows="4"
                v-model="animalForm.description"
              ></textarea>
            </label>

            <label class="label"
              >Фото
              <input
                class="input"
                type="file"
                accept="image/*"
                @change="onAnimalPhotoChange"
              />
            </label>

            <div class="muted small" style="margin-top: -4px">
              {{
                animalPhotoName
                  ? `Файл: ${animalPhotoName}`
                  : "Фото пока не выбрано"
              }}
            </div>

            <button
              class="btn btn-primary"
              style="width: auto"
              @click="handleCreateAnimal"
            >
              Добавить
            </button>
          </div>
        </div>

        <div class="animals-admin-panel">
          <div class="animals-admin-head">
            <div>
              <div class="card-title">Животные</div>
              <div class="muted small">
                Актуальные животные и архив пристроенных
              </div>
            </div>

            <div class="admin-animal-filter">
              <button
                type="button"
                class="animal-filter-chip"
                :class="{ active: adminFilters.animalsStatus === 'active' }"
                @click="adminFilters.animalsStatus = 'active'"
              >
                <span>Актуальные</span>
                <b>{{ activeAnimalsCount }}</b>
              </button>

              <button
                type="button"
                class="animal-filter-chip archive"
                :class="{ active: adminFilters.animalsStatus === 'archived' }"
                @click="adminFilters.animalsStatus = 'archived'"
              >
                <span>Архив</span>
                <b>{{ archivedAnimalsCount }}</b>
              </button>

              <button
                type="button"
                class="animal-filter-chip"
                :class="{ active: adminFilters.animalsStatus === 'all' }"
                @click="adminFilters.animalsStatus = 'all'"
              >
                <span>Все</span>
                <b>{{ asList(animals).length }}</b>
              </button>
            </div>
          </div>

          <div class="admin-tools animals-search-tools">
            <input
              class="input"
              placeholder="Поиск по имени, виду, городу, статусу"
              v-model="adminFilters.animalsSearch"
            />

            <div class="muted small">Найдено: {{ animalsFiltered.length }}</div>
          </div>

          <div v-if="animalsFiltered.length === 0" class="state-card">
            В этом разделе пока нет животных.
          </div>

          <div v-else class="list animals-admin-list">
            <div
              v-for="animal in animalsPaged"
              :key="animal.id"
              class="item animal-admin-item"
            >
              <div class="animal-admin-photo">
                <img
                  v-if="getImageUrl(animal.photo)"
                  :src="getImageUrl(animal.photo)"
                  :alt="animal.name"
                  @error="$event.target.style.display = 'none'"
                />

                <div v-else class="animal-admin-placeholder">🐾</div>
              </div>

              <div class="animal-admin-content">
                <div class="item-top">
                  <div>
                    <div class="strong">{{ animal.name }}</div>
                    <div class="muted small">
                      {{ animal.species }} • {{ animal.age }} •
                      {{ animal.city }}
                    </div>
                  </div>

                  <span
                    class="badge"
                    :class="{
                      info: animal.status === 'looking_home',
                      warn: animal.status === 'treatment',
                      ok: animal.status === 'adopted',
                    }"
                  >
                    {{ animalStatusText[animal.status] || animal.status }}
                  </span>
                </div>

                <div class="desc">
                  {{ animal.description || "Описание пока не добавлено." }}
                </div>

                <div class="actions">
                  <select
                    class="input slim"
                    :value="animal.status"
                    @change="handleAnimalStatus(animal, $event.target.value)"
                  >
                    <option value="looking_home">Ищет дом</option>
                    <option value="treatment">На лечении</option>
                    <option value="adopted">Пристроен</option>
                  </select>

                  <button
                    class="btn danger"
                    style="width: auto"
                    @click="handleDeleteAnimal(animal)"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-if="animalsPageCount > 1" class="admin-pagination">
            <button
              class="page-btn"
              :disabled="adminPages.animals === 1"
              @click="
                goAdminPage('animals', adminPages.animals - 1, animalsPageCount)
              "
            >
              ‹
            </button>

            <button
              v-for="num in animalsPageCount"
              :key="num"
              class="page-btn"
              :class="{ active: adminPages.animals === num }"
              @click="goAdminPage('animals', num, animalsPageCount)"
            >
              {{ num }}
            </button>

            <button
              class="page-btn"
              :disabled="adminPages.animals === animalsPageCount"
              @click="
                goAdminPage('animals', adminPages.animals + 1, animalsPageCount)
              "
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div v-if="tab === 'tasks'" class="grid">
        <div class="card">
          <div class="card-title">Создать задачу</div>

          <div class="form">
            <label class="label"
              >Название
              <input class="input" v-model="taskForm.title" />
            </label>

            <label class="label"
              >Описание
              <textarea
                class="input"
                rows="4"
                v-model="taskForm.description"
              ></textarea>
            </label>

            <label class="label"
              >Статус
              <select class="input" v-model="taskForm.status">
                <option value="open">Открыта</option>
                <option value="in_progress">В работе</option>
                <option value="done_pending">На проверке</option>
                <option value="done">Выполнена</option>
              </select>
            </label>

            <label class="label"
              >Назначить волонтёру
              <select class="input" v-model="taskForm.assigned_to">
                <option value="">Без исполнителя</option>
                <option v-for="u in volunteers" :key="u.id" :value="u.id">
                  {{ u.name }} ({{ u.id }})
                </option>
              </select>
            </label>

            <label class="label"
              >Баллы
              <input class="input" type="number" v-model="taskForm.points" />
            </label>

            <label class="label"
              >Фото задачи
              <input
                class="input"
                type="file"
                accept="image/*"
                @change="onTaskPhotoChange"
              />
            </label>

            <div class="muted small" style="margin-top: -4px">
              {{
                taskPhotoName
                  ? `Файл: ${taskPhotoName}`
                  : "Фото пока не выбрано"
              }}
            </div>

            <button
              class="btn btn-primary"
              style="width: auto"
              @click="handleCreateTask"
            >
              Добавить
            </button>
          </div>
        </div>

        <div class="list">
          <div class="admin-tools item">
            <input
              class="input"
              placeholder="Поиск по названию или описанию"
              v-model="adminFilters.tasksSearch"
            />

            <select class="input" v-model="adminFilters.tasksStatus">
              <option value="all">Все статусы</option>
              <option value="open">Открыта</option>
              <option value="in_progress">В работе</option>
              <option value="done_pending">На проверке</option>
              <option value="done">Выполнена</option>
            </select>

            <select class="input" v-model="adminFilters.tasksAssignee">
              <option value="all">Все исполнители</option>
              <option value="none">Без исполнителя</option>
              <option v-for="u in volunteers" :key="u.id" :value="u.id">
                {{ u.name }}
              </option>
            </select>

            <div class="muted small">Найдено: {{ tasksFiltered.length }}</div>
          </div>
          <div v-for="task in tasksPaged" :key="task.id" class="item">
            <div class="item-top">
              <div>
                <div class="strong">{{ task.title }}</div>
                <div class="muted small">Баллы: {{ task.points }}</div>
              </div>

              <span
                class="badge"
                :class="{
                  info: task.status === 'open',
                  warn:
                    task.status === 'in_progress' ||
                    task.status === 'done_pending',
                  ok: task.status === 'done',
                }"
              >
                {{ taskStatusText[task.status] || task.status }}
              </span>
            </div>

            <div class="desc">{{ task.description }}</div>

            <div v-if="task.photo" class="admin-photo-preview">
              <img :src="getImageUrl(task.photo)" :alt="task.title" />
            </div>

            <div class="muted small" v-if="task.assignee">
              Назначено: {{ task.assignee.name }} (ID: {{ task.assignee.id }})
            </div>

            <div class="actions">
              <select
                class="input slim"
                :value="task.status"
                @change="handleTaskStatus(task, $event.target.value)"
              >
                <option value="open">Открыта</option>
                <option value="in_progress">В работе</option>
                <option value="done_pending">На проверке</option>
                <option value="done">Выполнена</option>
              </select>

              <select
                class="input slim"
                :value="task.assignee?.id || ''"
                @change="handleTaskAssignee(task, $event.target.value)"
              >
                <option value="">Без исполнителя</option>
                <option v-for="u in volunteers" :key="u.id" :value="u.id">
                  {{ u.name }} ({{ u.id }})
                </option>
              </select>

              <button
                class="btn danger"
                style="width: auto"
                @click="handleDeleteTask(task)"
              >
                Удалить
              </button>
            </div>
          </div>
          <div v-if="tasksPageCount > 1" class="admin-pagination item">
            <button
              class="page-btn"
              :disabled="adminPages.tasks === 1"
              @click="
                goAdminPage('tasks', adminPages.tasks - 1, tasksPageCount)
              "
            >
              ‹
            </button>

            <button
              v-for="num in tasksPageCount"
              :key="num"
              class="page-btn"
              :class="{ active: adminPages.tasks === num }"
              @click="goAdminPage('tasks', num, tasksPageCount)"
            >
              {{ num }}
            </button>

            <button
              class="page-btn"
              :disabled="adminPages.tasks === tasksPageCount"
              @click="
                goAdminPage('tasks', adminPages.tasks + 1, tasksPageCount)
              "
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div v-if="tab === 'found'" class="list">
        <div class="admin-tools item">
          <input
            class="input"
            placeholder="Поиск по городу, адресу или описанию"
            v-model="adminFilters.foundSearch"
          />

          <select class="input" v-model="adminFilters.foundStatus">
            <option value="all">Все статусы</option>
            <option value="new">Новая</option>
            <option value="in_progress">В работе</option>
            <option value="done">Выполнена</option>
            <option value="rejected">Отклонена</option>
          </select>

          <div class="muted small">Найдено: {{ foundFiltered.length }}</div>
        </div>
        <div v-for="item in foundPaged" :key="item.id" class="item">
          <div class="item-top">
            <div>
              <div class="strong">#{{ item.id }} • {{ item.city }}</div>
              <div class="muted small">{{ item.address }}</div>
            </div>

            <span class="badge" :class="requestStatusClass(item.status)">
              {{ requestStatusText[item.status] || item.status }}
            </span>
          </div>

          <div class="desc">{{ item.description }}</div>

          <div v-if="item.photo" class="admin-photo-preview">
            <img
              :src="getImageUrl(item.photo)"
              alt="Фото найденного животного"
            />
          </div>

          <div class="actions">
            <select
              class="input slim"
              :value="item.status"
              @change="handleFoundStatus(item, $event.target.value)"
            >
              <option value="new">Новая</option>
              <option value="in_progress">В работе</option>
              <option value="done">Выполнена</option>
              <option value="rejected">Отклонена</option>
            </select>

            <button
              class="btn danger"
              style="width: auto"
              @click="handleDeleteFound(item)"
            >
              Удалить
            </button>
          </div>
        </div>
        <div v-if="foundPageCount > 1" class="admin-pagination item">
          <button
            class="page-btn"
            :disabled="adminPages.found === 1"
            @click="goAdminPage('found', adminPages.found - 1, foundPageCount)"
          >
            ‹
          </button>

          <button
            v-for="num in foundPageCount"
            :key="num"
            class="page-btn"
            :class="{ active: adminPages.found === num }"
            @click="goAdminPage('found', num, foundPageCount)"
          >
            {{ num }}
          </button>

          <button
            class="page-btn"
            :disabled="adminPages.found === foundPageCount"
            @click="goAdminPage('found', adminPages.found + 1, foundPageCount)"
          >
            ›
          </button>
        </div>
      </div>

      <div v-if="tab === 'adoption'" class="list">
        <div class="admin-tools item">
          <input
            class="input"
            placeholder="Поиск по животному, имени или телефону"
            v-model="adminFilters.adoptionSearch"
          />

          <select class="input" v-model="adminFilters.adoptionStatus">
            <option value="all">Все статусы</option>
            <option value="new">Новая</option>
            <option value="in_progress">В работе</option>
            <option value="done">Выполнена</option>
            <option value="rejected">Отклонена</option>
          </select>

          <div class="muted small">Найдено: {{ adoptionFiltered.length }}</div>
        </div>
        <div v-for="item in adoptionPaged" :key="item.id" class="item">
          <div class="item-top">
            <div>
              <div class="strong">#{{ item.id }} • {{ item.animal_name }}</div>
              <div class="muted small">{{ item.name }} • {{ item.phone }}</div>
            </div>

            <span class="badge" :class="requestStatusClass(item.status)">
              {{ requestStatusText[item.status] || item.status }}
            </span>
          </div>

          <div class="desc">{{ item.message }}</div>

          <div class="actions">
            <select
              class="input slim"
              :value="item.status"
              @change="handleAdoptionStatus(item, $event.target.value)"
            >
              <option value="new">Новая</option>
              <option value="in_progress">В работе</option>
              <option value="done">Выполнена</option>
              <option value="rejected">Отклонена</option>
            </select>

            <button
              class="btn danger"
              style="width: auto"
              @click="handleDeleteAdoption(item)"
            >
              Удалить
            </button>
          </div>
        </div>
        <div v-if="adoptionPageCount > 1" class="admin-pagination item">
          <button
            class="page-btn"
            :disabled="adminPages.adoption === 1"
            @click="
              goAdminPage(
                'adoption',
                adminPages.adoption - 1,
                adoptionPageCount,
              )
            "
          >
            ‹
          </button>

          <button
            v-for="num in adoptionPageCount"
            :key="num"
            class="page-btn"
            :class="{ active: adminPages.adoption === num }"
            @click="goAdminPage('adoption', num, adoptionPageCount)"
          >
            {{ num }}
          </button>

          <button
            class="page-btn"
            :disabled="adminPages.adoption === adoptionPageCount"
            @click="
              goAdminPage(
                'adoption',
                adminPages.adoption + 1,
                adoptionPageCount,
              )
            "
          >
            ›
          </button>
        </div>
      </div>
      <div v-if="tab === 'news'" class="grid">
        <div class="card">
          <div class="card-title">Добавить новость</div>

          <div class="form">
            <label class="label"
              >Заголовок
              <input class="input" v-model="newsForm.title" />
            </label>

            <label class="label"
              >Дата
              <input
                class="input"
                type="date"
                v-model="newsForm.published_at"
              />
            </label>

            <label class="label"
              >Текст
              <textarea
                class="input"
                rows="5"
                v-model="newsForm.text"
              ></textarea>
            </label>

            <label class="label"
              >Фото новости
              <input
                ref="newsImageInput"
                class="input"
                type="file"
                accept="image/*"
                @change="handleNewsImageChange"
              />
            </label>

            <button
              class="btn btn-primary"
              style="width: auto"
              @click="handleCreateNews"
            >
              Добавить
            </button>
          </div>
        </div>

        <div class="list">
          <div class="admin-tools item">
            <input
              class="input"
              placeholder="Поиск по заголовку или тексту новости"
              v-model="adminFilters.newsSearch"
            />

            <div class="muted small">Найдено: {{ newsFiltered.length }}</div>
          </div>
          <div v-for="item in newsPaged" :key="item.id" class="item">
            <div class="news-admin-card">
              <div class="news-admin-media">
                <img
                  v-if="getImageUrl(item.image)"
                  :src="getImageUrl(item.image)"
                  :alt="item.title"
                  @error="$event.target.style.display = 'none'"
                />

                <div v-else class="news-admin-placeholder">📰</div>
              </div>

              <div class="news-admin-content">
                <div class="strong">{{ item.title }}</div>

                <div class="muted small">
                  {{
                    formatDate(
                      item.published_at || item.date || item.created_at,
                    )
                  }}
                </div>

                <div class="desc">
                  {{ item.text || "Текст новости пока не добавлен." }}
                </div>

                <button
                  class="btn danger"
                  style="width: auto"
                  @click="handleDeleteNews(item)"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
          <div v-if="newsPageCount > 1" class="admin-pagination item">
            <button
              class="page-btn"
              :disabled="adminPages.news === 1"
              @click="goAdminPage('news', adminPages.news - 1, newsPageCount)"
            >
              ‹
            </button>

            <button
              v-for="num in newsPageCount"
              :key="num"
              class="page-btn"
              :class="{ active: adminPages.news === num }"
              @click="goAdminPage('news', num, newsPageCount)"
            >
              {{ num }}
            </button>

            <button
              class="page-btn"
              :disabled="adminPages.news === newsPageCount"
              @click="goAdminPage('news', adminPages.news + 1, newsPageCount)"
            >
              ›
            </button>
          </div>
        </div>
      </div>
      <div v-if="tab === 'donations'" class="grid">
        <div class="card">
          <div class="card-title">Добавить сбор</div>

          <div class="form">
            <label class="label"
              >Цель
              <input class="input" type="number" v-model="donationForm.goal" />
            </label>

            <label class="label"
              >Собрано
              <input
                class="input"
                type="number"
                v-model="donationForm.raised"
              />
            </label>

            <label class="label"
              >Текст
              <textarea
                class="input"
                rows="4"
                v-model="donationForm.text"
              ></textarea>
            </label>

            <button
              class="btn btn-primary"
              style="width: auto"
              @click="handleCreateDonation"
            >
              Добавить
            </button>
          </div>
        </div>

        <div class="list">
          <div class="admin-tools item">
            <input
              class="input"
              placeholder="Поиск по тексту или сумме"
              v-model="adminFilters.donationsSearch"
            />

            <div class="muted small">
              Найдено: {{ donationsFiltered.length }}
            </div>
          </div>
          <div v-for="item in donationsPaged" :key="item.id" class="item">
            <div class="item-top">
              <div>
                <div class="strong">Сбор #{{ item.id }}</div>
                <div class="muted small">
                  Цель: {{ item.goal }} • Собрано: {{ item.raised }}
                </div>
              </div>
            </div>

            <div class="form" style="margin-top: 10px">
              <label class="label"
                >Цель
                <input class="input" type="number" v-model="item.goal" />
              </label>

              <label class="label"
                >Собрано
                <input class="input" type="number" v-model="item.raised" />
              </label>

              <label class="label"
                >Текст
                <textarea class="input" rows="4" v-model="item.text"></textarea>
              </label>
            </div>

            <div class="actions">
              <button
                class="btn btn-primary"
                style="width: auto"
                @click="handleUpdateDonation(item)"
              >
                Сохранить
              </button>

              <button
                class="btn danger"
                style="width: auto"
                @click="handleDeleteDonation(item)"
              >
                Удалить
              </button>
            </div>
          </div>
          <div v-if="donationsPageCount > 1" class="admin-pagination item">
            <button
              class="page-btn"
              :disabled="adminPages.donations === 1"
              @click="
                goAdminPage(
                  'donations',
                  adminPages.donations - 1,
                  donationsPageCount,
                )
              "
            >
              ‹
            </button>

            <button
              v-for="num in donationsPageCount"
              :key="num"
              class="page-btn"
              :class="{ active: adminPages.donations === num }"
              @click="goAdminPage('donations', num, donationsPageCount)"
            >
              {{ num }}
            </button>

            <button
              class="page-btn"
              :disabled="adminPages.donations === donationsPageCount"
              @click="
                goAdminPage(
                  'donations',
                  adminPages.donations + 1,
                  donationsPageCount,
                )
              "
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div v-if="tab === 'rewards'" class="grid">
        <div class="card">
          <div class="card-title">Добавить награду</div>

          <div class="form">
            <label class="label"
              >Название
              <input class="input" v-model="rewardForm.title" />
            </label>

            <label class="label"
              >Партнёр
              <input class="input" v-model="rewardForm.partner_name" />
            </label>

            <label class="label"
              >Описание
              <textarea
                class="input"
                rows="4"
                v-model="rewardForm.description"
              ></textarea>
            </label>

            <label class="label"
              >Цена в баллах
              <input
                class="input"
                type="number"
                min="0"
                v-model="rewardForm.price_points"
              />
            </label>
            <label class="label">
              Количество подарков
              <input
                class="input"
                type="number"
                min="0"
                step="1"
                v-model.number="rewardForm.stock"
                placeholder="Например 10"
              />
            </label>

            <label class="label"
              >Категория
              <select class="input" v-model="rewardForm.category">
                <option value="other">Другое</option>
                <option value="certificates">Сертификаты</option>
                <option value="discounts">Скидки</option>
                <option value="merch">Мерч</option>
                <option value="gifts">Подарки</option>
              </select>
            </label>

            <label class="label check-row">
              <input type="checkbox" v-model="rewardForm.is_active" />
              <span>Показывать в магазине</span>
            </label>

            <label class="label"
              >Фото награды
              <input
                class="input"
                type="file"
                accept="image/*"
                @change="onRewardPhotoChange"
              />
            </label>

            <div class="muted small" style="margin-top: -4px">
              {{
                rewardPhotoName
                  ? `Файл: ${rewardPhotoName}`
                  : "Фото пока не выбрано"
              }}
            </div>

            <button
              class="btn btn-primary"
              style="width: auto"
              @click="handleCreateReward"
            >
              Добавить
            </button>
          </div>
        </div>

        <div class="list">
          <div class="admin-tools item">
            <input
              class="input"
              placeholder="Поиск по названию, партнёру или описанию"
              v-model="adminFilters.rewardsSearch"
            />

            <select class="input" v-model="adminFilters.rewardsCategory">
              <option value="all">Все категории</option>
              <option value="other">Другое</option>
              <option value="certificates">Сертификаты</option>
              <option value="discounts">Скидки</option>
              <option value="merch">Мерч</option>
              <option value="gifts">Подарки</option>
            </select>

            <select class="input" v-model="adminFilters.rewardsActive">
              <option value="all">Все</option>
              <option value="active">Активные</option>
              <option value="hidden">Скрытые</option>
            </select>

            <div class="muted small">Найдено: {{ rewardsFiltered.length }}</div>
          </div>
          <div v-for="reward in rewardsPaged" :key="reward.id" class="item">
            <div class="item-top">
              <div>
                <div class="strong">{{ reward.title }}</div>
                <div class="muted small">
                  {{ reward.partner_name || "Партнёр" }} •
                  {{ rewardCategoryText(reward.category) }}
                </div>
              </div>

              <span class="badge info">{{ reward.price_points }} б.</span>
            </div>

            <div v-if="reward.image" class="admin-photo-preview">
              <img :src="getImageUrl(reward.image)" :alt="reward.title" />
            </div>

            <div class="desc">{{ reward.description }}</div>

            <div class="actions">
              <span class="badge" :class="reward.is_active ? 'ok' : 'warn'">
                {{ reward.is_active ? "Активна" : "Скрыта" }}
              </span>
              <div class="stock-control">
                <button
                  type="button"
                  class="stock-btn"
                  @click="handleChangeRewardStock(reward, -1)"
                >
                  −
                </button>

                <span class="stock-value">
                  Количество: {{ reward.stock ?? 0 }}
                </span>

                <button
                  type="button"
                  class="stock-btn"
                  @click="handleChangeRewardStock(reward, 1)"
                >
                  +
                </button>
              </div>

              <button
                class="btn danger"
                style="width: auto"
                @click="handleDeleteReward(reward)"
              >
                Удалить
              </button>
            </div>
          </div>
          <div v-if="rewardsPageCount > 1" class="admin-pagination item">
            <button
              class="page-btn"
              :disabled="adminPages.rewards === 1"
              @click="
                goAdminPage('rewards', adminPages.rewards - 1, rewardsPageCount)
              "
            >
              ‹
            </button>

            <button
              v-for="num in rewardsPageCount"
              :key="num"
              class="page-btn"
              :class="{ active: adminPages.rewards === num }"
              @click="goAdminPage('rewards', num, rewardsPageCount)"
            >
              {{ num }}
            </button>

            <button
              class="page-btn"
              :disabled="adminPages.rewards === rewardsPageCount"
              @click="
                goAdminPage('rewards', adminPages.rewards + 1, rewardsPageCount)
              "
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div v-if="tab === 'reward-orders'" class="list">
        <div class="admin-tools item">
          <input
            class="input"
            placeholder="Поиск по пользователю, email или награде"
            v-model="adminFilters.ordersSearch"
          />

          <select class="input" v-model="adminFilters.ordersStatus">
            <option value="all">Все статусы</option>
            <option value="new">Новая</option>
            <option value="approved">Подтверждена</option>
            <option value="done">Выдана</option>
            <option value="rejected">Отклонена</option>
          </select>

          <div class="muted small">
            Найдено: {{ rewardOrdersFiltered.length }}
          </div>
        </div>
        <div v-for="order in rewardOrdersPaged" :key="order.id" class="item">
          <div class="item-top">
            <div>
              <div class="strong">
                #{{ order.id }} • {{ order.reward?.title || "Награда" }}
              </div>
              <div class="muted small">
                {{ order.user?.name || "Пользователь" }} •
                {{ order.user?.email || "" }}
              </div>
            </div>

            <span class="badge" :class="requestStatusClass(order.status)">
              {{ requestStatusText[order.status] || order.status }}
            </span>
          </div>

          <div class="desc">Списано баллов: {{ order.points_spent }}</div>

          <div v-if="order.reward?.image" class="admin-photo-preview">
            <img
              :src="getImageUrl(order.reward.image)"
              :alt="order.reward.title"
            />
          </div>

          <div class="actions">
            <select
              class="input slim"
              :value="order.status"
              @change="handleRewardOrderStatus(order, $event.target.value)"
            >
              <option value="new">Новая</option>
              <option value="approved">Подтверждена</option>
              <option value="done">Выдана</option>
              <option value="rejected">Отклонена</option>
            </select>

            <button
              type="button"
              class="danger-btn"
              @click="handleDeleteRewardOrder(order)"
            >
              Удалить
            </button>
          </div>
        </div>

        <div v-if="!rewardOrdersFiltered.length" class="item muted">
          Заявок на обмен пока нет.

          <div v-if="rewardOrdersPageCount > 1" class="admin-pagination item">
            <button
              class="page-btn"
              :disabled="adminPages.orders === 1"
              @click="
                goAdminPage(
                  'orders',
                  adminPages.orders - 1,
                  rewardOrdersPageCount,
                )
              "
            >
              ‹
            </button>

            <button
              v-for="num in rewardOrdersPageCount"
              :key="num"
              class="page-btn"
              :class="{ active: adminPages.orders === num }"
              @click="goAdminPage('orders', num, rewardOrdersPageCount)"
            >
              {{ num }}
            </button>

            <button
              class="page-btn"
              :disabled="adminPages.orders === rewardOrdersPageCount"
              @click="
                goAdminPage(
                  'orders',
                  adminPages.orders + 1,
                  rewardOrdersPageCount,
                )
              "
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </template>
    <Transition name="toast">
      <div v-if="toast.show" class="toast" :class="toast.type">
        {{ toast.message }}
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="confirmModal.show" class="modal-overlay">
        <div class="confirm-card">
          <div class="confirm-icon">!</div>

          <div class="confirm-content">
            <h3>Подтверждение действия</h3>
            <p>{{ confirmModal.message }}</p>
          </div>

          <div class="confirm-actions">
            <button type="button" class="btn ghost" @click="confirmNo">
              Отмена
            </button>

            <button type="button" class="btn danger" @click="confirmYes">
              Подтвердить
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
