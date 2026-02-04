<template>
  <div class="bg-orange-50 h-screen flex justify-center overflow-hidden font-sans">
    <div class="w-full max-w-md h-full bg-white flex flex-col shadow-xl relative">
      <header class="bg-red-800 sagrada-header-texture text-white p-4 flex items-center justify-between shadow-md z-10 relative">
        <div class="flex items-center gap-3 relative z-20">
          <router-link to="/" class="hover:bg-red-700 p-2 rounded-full transition flex items-center justify-center">
            <i class="fa-solid fa-arrow-left"></i>
          </router-link>
          <h1 class="font-bold text-lg tracking-wide">Nouvelle Conversation</h1>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto p-6 space-y-8 sagrada-light-bg no-scrollbar relative">
        <div class="text-center space-y-2 mt-4">
          <div class="w-16 h-16 organic-shape bg-red-100 mx-auto flex items-center justify-center border-2 border-red-200 mb-4 shadow-sm">
            <i class="fa-solid fa-comments text-3xl text-red-600"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-800">De quoi veux-tu parler ?</h2>
          <p class="text-gray-500 text-sm">Choisis un thème ou invente le tien.</p>
        </div>

        <div class="bg-white p-4 rounded-3xl shadow-md border border-red-50 relative group focus-within:ring-2 focus-within:ring-red-400 transition">
          <label class="block text-xs font-bold text-red-400 uppercase mb-2">Ton Scénario</label>
          <textarea v-model="scenario" rows="3" 
              class="w-full text-lg text-gray-800 placeholder-gray-300 outline-none resize-none font-medium"
              placeholder="Ex: Je veux acheter des chaussures à Madrid..."></textarea>
          <div class="absolute bottom-3 right-3 text-gray-300 group-focus-within:text-red-400 transition">
            <i class="fa-solid fa-pen"></i>
          </div>
        </div>

        <div>
          <h3 class="text-sm font-bold text-gray-400 uppercase mb-3 ml-1">Idées populaires</h3>
          <div class="flex flex-wrap gap-3">
            <button v-for="topic in topics" :key="topic.text" @click="selectTopic(topic.text)" 
              class="px-4 py-2 rounded-xl bg-white border-2 border-transparent shadow-sm text-gray-600 font-medium hover:bg-gray-50 transition flex items-center gap-2 active:scale-95">
              <span class="text-lg">{{ topic.icon }}</span> {{ topic.text }}
            </button>
          </div>
        </div>
      </main>

      <footer class="p-4 bg-white border-t border-red-50 shadow-lg z-20">
        <button @click="startConversation" 
            class="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-red-200 transform active:scale-[0.98] transition flex items-center justify-center gap-3">
            Commencer <i class="fa-solid fa-paper-plane"></i>
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const scenario = ref('');

const topics = [
  { text: 'Commander au restaurant', icon: '🍔' },
  { text: 'Rencontrer un nouvel ami', icon: '👋' },
  { text: 'Demander son chemin', icon: '🗺️' },
  { text: 'Réserver un hôtel', icon: '🏨' },
  { text: 'Marchander au marché', icon: '💰' }
];

function selectTopic(text) {
  scenario.value = text;
}

function startConversation() {
  if (!scenario.value.trim()) {
    alert("Choisis un sujet !");
    return;
  }
  // On sauvegarde le sujet pour la page Chat
  localStorage.setItem('currentScenario', scenario.value);
  router.push('/chat');
}
</script>

<style scoped>
/* Tes classes utilitaires habituelles */
.sagrada-light-bg { background-color: #fffbf5; background-image: radial-gradient(at 20% 30%, hsla(45, 100%, 85%, 0.4) 0px, transparent 50%), radial-gradient(at 50% 80%, hsla(10, 100%, 90%, 0.4) 0px, transparent 50%); background-attachment: fixed; }
.sagrada-header-texture { background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.07' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E"); }
.organic-shape { border-radius: 45% 55% 70% 30% / 30% 60% 40% 70%; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>