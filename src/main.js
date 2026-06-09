import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import BaseImg from './components/BaseImg.vue'
import './assets/main.css'

const app = createApp(App)

app.use(router)

app.component('BaseImg', BaseImg)

app.mount('#app')