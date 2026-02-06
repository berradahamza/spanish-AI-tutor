<template>
  <div class="bg-indigo-50 h-screen flex justify-center overflow-hidden font-sans">
    <div class="w-full max-w-md h-full bg-white flex flex-col shadow-xl relative">
      <header class="bg-indigo-900 sagrada-header-texture text-white p-4 flex items-center gap-3 shadow-md z-10">
          <router-link to="/" class="hover:bg-indigo-700 p-2 rounded-full transition">
            <i class="fa-solid fa-arrow-left"></i>
          </router-link>
          <h1 class="font-bold text-lg tracking-wide">Mon Histoire</h1>
      </header>

      <main class="flex-1 p-6 space-y-6 flex flex-col justify-center relative">
        <div class="text-center">
            <div class="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 text-3xl border-2 border-indigo-200 shadow-sm animate-bounce-slow">
                <i class="fa-solid fa-book-journal-whills"></i>
            </div>
            <h2 class="text-2xl font-bold text-gray-800">Créons ton aventure</h2>
            <p class="text-gray-500 text-sm mt-2 px-4">Tu es le héros. Tes choix dictent l'histoire en 5 pages.</p>
        </div>

        <div class="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 focus-within:ring-2 focus-within:ring-indigo-400 transition">
            <label class="block text-xs font-bold text-indigo-500 uppercase mb-2">Thème ou Idée de départ</label>
            <textarea v-model="theme" rows="3" 
                class="w-full text-lg text-gray-800 placeholder-gray-300 outline-none resize-none font-medium"
                placeholder="Ex: Un détective cherche un chat perdu à Barcelone..."></textarea>
        </div>

        <button @click="launch" :disabled="!theme.trim()"
            class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            Commencer <i class="fa-solid fa-wand-magic-sparkles"></i>
        </button>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const theme = ref('');

const launch = () => {
    localStorage.setItem('storyTheme', theme.value);
    router.push('/story-mode');
};
</script>

<style scoped>
.sagrada-header-texture { background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.07' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E"); }
.animate-bounce-slow { animation: bounce 3s infinite; }
</style>