import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '../views/HomeView.vue'
import AnimalsView from '../views/AnimalsView.vue'
import AnimalDetailView from '../views/AnimalDetailView.vue'
import RewardsView from '../views/RewardsView.vue'
import HelpView from '../views/HelpView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ProfileView from '../views/ProfileView.vue'
import AdminView from '../views/AdminView.vue'
import ForgotPasswordView from '../views/ForgotPasswordView.vue'
import ResetPasswordView from '../views/ResetPasswordView.vue'
import TaskDetailView from '../views/TaskDetailView.vue'
import NewsItemView from '../views/NewsItemView.vue'

function getToken() {
  return localStorage.getItem('token')
}

function getRole() {
  return localStorage.getItem('role')
}

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/animals', name: 'animals', component: AnimalsView },
  { path: '/animals/:id', name: 'animal-details', component: AnimalDetailView, props: true },
  { path: '/rewards', name: 'rewards', component: RewardsView, meta: { auth: true, rewards: true } },
  { path: '/help', name: 'help', component: HelpView },
  { path: '/tasks/:id', name: 'task-detail', component: TaskDetailView, props: true },
  { path: '/profile', name: 'profile', component: ProfileView, meta: { auth: true } },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/register', name: 'register', component: RegisterView },
  { path: '/forgot-password', name: 'forgot-password', component: ForgotPasswordView },
  { path: '/reset-password/:token', name: 'reset-password', component: ResetPasswordView, props: true },
  { path: '/admin', name: 'admin', component: AdminView, meta: { auth: true, admin: true } },
{ path: '/news/:id', name: 'news-item', component: NewsItemView, props: true },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const token = getToken()
  const role = getRole()

  if (to.meta.auth && !token) {
    return next('/login')
  }

  if (to.meta.admin && role !== 'admin') {
    return next('/')
  }

  if (to.meta.rewards && !['admin', 'volunteer'].includes(role || '')) {
    return next('/')
  }

  next()
})

export default router