<template>
  <div class="bg-orange-50 h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
    
    <div class="absolute top-0 left-0 w-64 h-64 bg-red-200 rounded-full blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
    <div class="absolute bottom-0 right-0 w-80 h-80 bg-amber-200 rounded-full blur-3xl opacity-20 translate-x-1/3 translate-y-1/3"></div>

    <div class="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-8 text-center relative z-10 border border-white/50">
      
      <div class="w-24 h-24 organic-shape bg-gradient-to-br from-red-600 to-amber-500 mx-auto flex items-center justify-center shadow-lg mb-6 text-white text-4xl">
        <i class="fa-solid fa-graduation-cap"></i>
      </div>

      <h1 class="text-3xl font-bold text-gray-800 mb-2">Spanish AI</h1>
      <p class="text-gray-500 mb-8">Ton tuteur personnel intelligent.</p>

      <button @click="handleLogin" 
        class="w-full bg-white border-2 border-gray-100 hover:border-red-200 text-gray-700 font-bold py-4 rounded-2xl shadow-sm hover:shadow-md transition flex items-center justify-center gap-3 active:scale-[0.98]">
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-6 h-6" alt="Google">
        <span>Continuer avec Google</span>
      </button>

      <p class="mt-6 text-xs text-gray-400">En continuant, tu acceptes notre politique de confidentialité.</p>
    </div>

  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useUser } from '../composables/useUser';

const router = useRouter();
const { login } = useUser();

const handleLogin = async () => {
  try {
    await login();
    router.push('/'); // Redirection vers l'accueil après connexion
  } catch (e) {
    console.error("Erreur de connexion", e);
  }
};
</script>

<style scoped>
.organic-shape { border-radius: 45% 55% 70% 30% / 30% 60% 40% 70%; }
</style>