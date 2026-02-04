<template>
  <div class="bg-orange-50 h-screen flex justify-center overflow-hidden font-sans">
    <div class="w-full max-w-md h-full bg-white flex flex-col shadow-xl relative">
      
      <header class="bg-red-800 sagrada-header-texture text-white p-4 flex items-center justify-between shadow-md z-10">
        <div class="flex items-center gap-3">
          <router-link to="/setup" class="hover:bg-red-700 p-2 rounded-full transition"><i class="fa-solid fa-arrow-left"></i></router-link>
          <div>
            <h1 class="font-bold text-lg tracking-wide truncate max-w-[150px]">{{ currentTopic }}</h1>
            <div class="text-xs text-red-200 flex items-center gap-1">
              <span class="w-2 h-2 bg-green-400 rounded-full inline-block"></span>
              Objectif : 10 nuevos
            </div>
          </div>
        </div>
        <button class="hover:bg-red-700 p-2 rounded-full transition text-amber-400"><i class="fa-solid fa-gear"></i></button>
      </header>

      <main class="flex-1 overflow-y-auto p-4 space-y-6 sagrada-light-bg no-scrollbar" ref="chatContainer">
        
        <div v-for="(msg, index) in messages" :key="index" :class="['flex gap-3', msg.role === 'user' ? 'justify-end' : 'items-start']">
          
          <div v-if="msg.role === 'ai'" class="w-10 h-10 organic-shape bg-red-100 flex items-center justify-center shrink-0 border-2 border-red-200 shadow-sm">
            <i class="fa-solid fa-robot text-red-800 text-lg transform -rotate-6"></i>
          </div>

          <div :class="['max-w-[85%] flex flex-col gap-1', msg.role === 'user' ? 'items-end' : 'items-start']">
            <div :class="[
              'p-3 shadow-sm leading-relaxed',
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-red-700 to-red-800 text-white rounded-2xl rounded-tr-none' 
                : 'bg-white/95 backdrop-blur-sm rounded-2xl rounded-tl-none border border-red-100 text-gray-800'
            ]">
              <span v-html="msg.text"></span>
            </div>
            
            <button v-if="msg.role === 'ai'" @click="speak(msg.text)" class="text-xs text-red-600 font-medium flex items-center gap-1 hover:text-red-800 transition ml-1">
              <i class="fa-solid fa-volume-high"></i> Écouter
            </button>
          </div>
        </div>

      </main>

      <footer class="bg-white p-3 border-t border-red-100 flex items-center gap-2 shadow-lg z-10">
        <button class="w-10 h-10 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 transition shrink-0"><i class="fa-solid fa-keyboard"></i></button>
        <div class="flex-1 relative">
          <input v-model="userInput" @keyup.enter="handleSend" type="text" placeholder="Escribe tu respuesta..." class="w-full bg-gray-50 border border-gray-100 text-gray-800 rounded-full py-3 px-4 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition shadow-sm">
        </div>
        <button @click="handleSend" class="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-800 text-white shadow-lg hover:scale-105 transition"><i class="fa-solid fa-paper-plane text-lg"></i></button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, onUnmounted } from 'vue';
import { useUser } from '../composables/useUser'; // Ton composable existant
import { useChat } from '../composables/useChat'; // Le nouveau !

// 1. Récupération des outils
const { user } = useUser();
const { messages, initChat, sendMessage, simulateAIResponse } = useChat();

const currentTopic = ref('Chargement...');
const userInput = ref('');
const chatContainer = ref(null);

// 2. Démarrage
onMounted(() => {
  currentTopic.value = localStorage.getItem('currentScenario') || 'Conversation libre';
  
  // On attend que l'utilisateur soit chargé par Firebase Auth
  // Le watch permet de réagir dès que "user.value" n'est plus null
  watch(user, (newUser) => {
    if (newUser) {
      // On lance l'écoute des messages pour cet utilisateur
      // "currentScenario" servira d'ID de conversation pour l'instant
      const chatId = currentTopic.value.replace(/\s+/g, '_').toLowerCase(); 
      initChat(newUser.uid, chatId);
    }
  }, { immediate: true });
});

// 3. Envoi du message
async function handleSend() {
  if (!userInput.value.trim() || !user.value) return;

  const text = userInput.value;
  const chatId = currentTopic.value.replace(/\s+/g, '_').toLowerCase();
  
  userInput.value = ''; // Vider le champ tout de suite

  // Sauvegarde dans Firestore
  await sendMessage(user.value.uid, text, 'user', chatId);

  // Scroll vers le bas
  scrollToBottom();

  // Déclencher la fausse IA (qui va écrire dans Firestore aussi !)
  simulateAIResponse(user.value.uid, text);
}

// 4. Auto-scroll quand un nouveau message arrive (venant de toi ou de l'IA)
watch(messages, () => {
  scrollToBottom();
}, { deep: true });

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

// 5. Fonction TTS (Gardée de ton ancien code)
function speak(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}
</script>

<style scoped>
.sagrada-light-bg { background-color: #fffbf5; background-image: radial-gradient(at 20% 30%, hsla(45, 100%, 85%, 0.4) 0px, transparent 50%), radial-gradient(at 50% 80%, hsla(10, 100%, 90%, 0.4) 0px, transparent 50%); background-attachment: fixed; }
.sagrada-header-texture { background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.07' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E"); }
.organic-shape { border-radius: 45% 55% 70% 30% / 30% 60% 40% 70%; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>