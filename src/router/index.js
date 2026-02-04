// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Setup from '../views/Setup.vue'
import Chat from '../views/Chat.vue'
import Dico from '../views/Dico.vue'
import Revision from '../views/Revision.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/setup', component: Setup },
  { path: '/chat', component: Chat },
  { path: '/dico', component: Dico },
  { path: '/revision', component: Revision },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router