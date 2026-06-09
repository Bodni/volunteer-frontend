<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { getNewsItem } from '../services/news'

const route = useRoute()
const item = ref(null)
const loading = ref(true)

onMounted(loadItem)

async function loadItem() {
  loading.value = true
  try {
    item.value = await getNewsItem(route.params.id)
  } catch (e) {
    console.error('Не удалось загрузить новость', e)
  } finally {
    loading.value = false
  }
}

function formatNewsDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="container news-page">
    <RouterLink to="/" class="back-link">← Назад</RouterLink>

    <div v-if="loading" class="muted">Загрузка...</div>

    <article v-else-if="item" class="news-article">
      <BaseImg v-if="item.image" :src="item.image" :alt="item.title" class="hero-image" />
      <h1>{{ item.title }}</h1>
      <div class="muted">{{ formatNewsDate(item.published_at) }}</div>
      <div class="text">{{ item.text }}</div>
    </article>

    <div v-else class="muted">Новость не найдена</div>
  </div>
</template>

<style scoped>
.news-page{ padding-bottom:30px; }
.back-link{ text-decoration:none; font-weight:800; color:#0f172a; }
.news-article{
  margin-top:14px;
  background:#fff;
  border:1px solid var(--border);
  border-radius:var(--radius);
  box-shadow:var(--shadow);
  padding:18px;
}
.hero-image{
  width:100%;
  max-height:420px;
  object-fit:cover;
  border-radius:14px;
  margin-bottom:14px;
}
.text{
  margin-top:16px;
  line-height:1.7;
  white-space:pre-line;
}
.muted{ color:var(--muted); }

@media (max-width: 900px){
  .news-detail-card,
  .news-card,
  .hero-card{
    grid-template-columns:1fr;
  }

  .news-media,
  .hero-media{
    min-height:260px;
  }
}

@media (max-width: 390px){
  .news-detail-page,
  .news-page{
    padding-top:20px;
    padding-bottom:28px;
  }

  .back-link{
    margin-bottom:14px;
    font-size:14px;
  }

  .news-detail-card,
  .news-card,
  .hero-card{
    padding:14px;
    border-radius:20px;
    gap:16px;
  }

  .news-image,
  .hero-image{
    min-height:220px;
    height:220px;
    border-radius:16px;
  }

  .eyebrow{
    font-size:11px;
  }

  .title,
  .hero-title{
    font-size:32px;
    line-height:1.08;
  }

  .date-pill{
    margin-top:14px;
    font-size:12px;
    padding:7px 10px;
  }

  .text,
  .news-text{
    margin-top:16px;
    font-size:15px;
    line-height:1.65;
  }
}
</style>