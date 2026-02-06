import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../firebase-config' // Import de l'auth pour vérifier le statut
import Home from '../views/Home.vue'
import Login from '../views/Login.vue' // Nouvelle vue
import Setup from '../views/Setup.vue'
import Chat from '../views/Chat.vue'
import Dico from '../views/Dico.vue'
import Revision from '../views/Revision.vue'
import StorySetup from '../views/StorySetup.vue'
import StoryMode from '../views/StoryMode.vue'

const routes = [
  { path: '/login', component: Login },
  { path: '/', component: Home, meta: { requiresAuth: true } },
  { path: '/setup', component: Setup, meta: { requiresAuth: true } },
  { path: '/chat', component: Chat, meta: { requiresAuth: true } },
  { path: '/dico', component: Dico, meta: { requiresAuth: true } },
  { path: '/revision', component: Revision, meta: { requiresAuth: true } },
  { path: '/story-setup', component: StorySetup },
  { path: '/story-mode', component: StoryMode },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Protection des routes
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  
  // Petite astuce pour attendre que Firebase vérifie si l'user est déjà connecté au rechargement de page
  const currentUser = await new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });

  if (requiresAuth && !currentUser) {
    next('/login');
  } else if (to.path === '/login' && currentUser) {
    next('/'); // Si déjà connecté, on va à l'accueil
  } else {
    next();
  }
});

export default router