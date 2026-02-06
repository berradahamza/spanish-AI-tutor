<template>
  <div class="bg-orange-50 h-screen flex justify-center overflow-hidden font-sans">
    <div class="w-full max-w-md h-full bg-white flex flex-col shadow-xl relative">
      
      <header class="bg-red-800 sagrada-header-texture text-white p-4 shadow-md z-20 relative">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <button @click="handleBackRequest" class="hover:bg-red-700 p-2 rounded-full transition cursor-pointer">
              <i class="fa-solid fa-arrow-left"></i>
            </button>
            <div>
              <h1 class="font-bold text-lg tracking-wide truncate max-w-[150px] capitalize">{{ currentTopic }}</h1>
              <div class="text-xs text-red-200 flex items-center gap-1">
                <span class="w-2 h-2 bg-green-400 rounded-full inline-block animate-pulse"></span>
                <span>En direct</span>
              </div>
            </div>
          </div>
          
          <button @click="finishConversation" 
            class="bg-red-900/50 hover:bg-red-900 border border-red-400/30 text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-2">
            <span>Terminer</span>
            <i class="fa-solid fa-flag-checkered"></i>
          </button>
        </div>

        <div v-if="targetWords.length > 0" class="mt-2 pt-2 border-t border-red-700/50 overflow-x-auto no-scrollbar whitespace-nowrap">
            <span class="text-[10px] text-red-300 uppercase font-bold mr-2 tracking-wider">Objectifs :</span>
            <span v-for="word in targetWords" :key="word" 
                  class="inline-block bg-green-600/20 text-green-100 text-xs px-2 py-0.5 rounded-md mr-1.5 border border-green-500/30">
              {{ word }}
            </span>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto p-4 space-y-6 sagrada-light-bg no-scrollbar relative" ref="chatContainer" @click="clearSelection">
        
        <div v-if="loading && messages.length === 0" class="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10">
           <i class="fa-solid fa-circle-notch fa-spin text-3xl text-red-600 mb-3"></i>
           <p class="text-sm text-gray-500 font-medium animate-pulse">L'IA prépare tes mots...</p>
        </div>

        <div v-else-if="messages.length === 0" class="text-center text-gray-400 mt-10">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fa-solid fa-comments text-2xl text-gray-300"></i>
          </div>
          <p>Conversation prête.</p>
        </div>

        <div v-for="(msg, index) in messages" :key="index" :class="['flex gap-3', msg.role === 'user' ? 'justify-end' : 'items-start']">
          
          <div v-if="msg.role === 'ai'" class="w-10 h-10 organic-shape bg-red-100 flex items-center justify-center shrink-0 border-2 border-red-200 shadow-sm mt-1">
            <i class="fa-solid fa-robot text-red-800 text-lg transform -rotate-6"></i>
          </div>

          <div :class="['max-w-[85%] flex flex-col gap-1', msg.role === 'user' ? 'items-end' : 'items-start']">
            <div :class="[
              'p-3.5 shadow-sm leading-relaxed text-sm relative',
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-red-600 to-red-700 text-white rounded-2xl rounded-tr-none shadow-red-100' 
                : 'bg-white/95 backdrop-blur-sm rounded-2xl rounded-tl-none border border-red-100 text-gray-800'
            ]">
              
              <span v-if="msg.role === 'user'">{{ msg.text }}</span>

              <div v-else class="flex flex-wrap items-baseline gap-x-1">
                <template v-for="(token, tIndex) in splitText(msg.text)" :key="tIndex">
                  <span v-if="isWord(token)" 
                        @click.stop="handleWordClick(token, $event)"
                        :class="[
                            'cursor-pointer px-0.5 transition duration-150 rounded',
                            isTargetWord(token) 
                                ? 'text-green-700 font-bold border-b-2 border-green-500 bg-green-50' 
                                : 'border-b border-dashed border-gray-300 hover:bg-red-100 hover:text-red-800 hover:border-red-400'
                        ]">
                    {{ token }}
                  </span>
                  <span v-else>{{ token }}</span>
                </template>
              </div>

            </div>
            
            <button v-if="msg.role === 'ai'" @click="speak(msg.text)" class="text-[10px] text-red-400 font-bold uppercase tracking-wide flex items-center gap-1 hover:text-red-600 transition ml-1 px-1 py-0.5">
              <i class="fa-solid fa-volume-high"></i> Écouter
            </button>
          </div>
        </div>

      </main>

      <div v-if="tooltip.visible" 
           :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }"
           class="fixed z-50 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl transform -translate-x-1/2 -translate-y-full mt-[-8px] pointer-events-none animate-fade-in min-w-[80px] text-center">
        
        <div class="font-bold capitalize mb-0.5">{{ tooltip.word }}</div>
        
        <div v-if="tooltip.loading" class="flex justify-center py-1">
            <i class="fa-solid fa-circle-notch fa-spin text-gray-400"></i>
        </div>
        <div v-else class="text-gray-300 italic">{{ tooltip.translation }}</div>
        
        <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-gray-900 rotate-45"></div>
      </div>

      <footer class="bg-white p-3 border-t border-red-50 flex items-center gap-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
        <div class="flex-1 relative">
          <input 
            v-model="userInput" 
            @keyup.enter="handleSend" 
            type="text" 
            placeholder="Écris ta réponse..." 
            :disabled="loading"
            class="w-full bg-gray-50 border border-gray-100 text-gray-800 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white transition shadow-inner placeholder-gray-400 disabled:opacity-50"
          >
        </div>
        <button 
            @click="handleSend" 
            :disabled="loading || !userInput.trim()"
            class="w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg shadow-red-200 hover:scale-105 active:scale-95 transition disabled:opacity-50 disabled:scale-100 disabled:shadow-none">
            <i class="fa-solid fa-paper-plane text-lg"></i>
        </button>
      </footer>

      <div v-if="showExitModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-xs text-center border border-gray-100">
            
            <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 text-2xl animate-bounce-slow">
                <i class="fa-solid fa-person-walking-arrow-right"></i>
            </div>

            <h3 class="text-xl font-bold text-gray-800 mb-2">Quitter la session ?</h3>
            
            <p class="text-gray-500 text-sm mb-6 leading-relaxed">
                Si tu pars maintenant, <strong>les nouveaux mots ne seront pas enregistrés</strong> dans ton dictionnaire.
            </p>

            <div class="flex gap-3">
                <button @click="showExitModal = false" 
                    class="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition">
                    Rester
                </button>
                <button @click="confirmExit" 
                    class="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition">
                    Quitter
                </button>
            </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUser } from '../composables/useUser';
import { useChat } from '../composables/useChat';
// On importe le service de traduction pour le clic
import { translateWord } from '../services/aiService';

const router = useRouter();
const route = useRoute();
const { user } = useUser();
const { 
  messages, 
  targetWords, 
  loading, 
  startSession, 
  sendMessage, 
  endSession, 
  initChat, 
  resetConversation 
} = useChat();

const currentTopic = ref('');
const userInput = ref('');
const chatContainer = ref(null);

// Etat du tooltip enrichi avec 'loading'
const tooltip = ref({ visible: false, x: 0, y: 0, word: '', translation: '', loading: false });

// Cache simple pour éviter de rappeler l'API sur le même mot
const translationCache = new Map();

// AJOUT : Gestion de la modale de sortie
const showExitModal = ref(false);

const handleBackRequest = () => {
    // Si la conversation n'a pas vraiment commencé (0 message), on laisse sortir
    if (messages.value.length === 0) {
        router.push('/');
        return;
    }
    showExitModal.value = true;
};

const confirmExit = () => {
    showExitModal.value = false;
    router.push('/');
};

onMounted(() => {
  currentTopic.value = localStorage.getItem('currentScenario') || 'Général';
  
  watch(user, async (currentUser) => {
    if (currentUser) {
      const chatId = currentTopic.value.replace(/\s+/g, '_').toLowerCase();
      if (route.query.new === 'true') {
        await resetConversation(currentUser.uid, chatId);
        router.replace({ query: null });
      }
      initChat(currentUser.uid, chatId);
      startSession(currentUser.uid, currentTopic.value, chatId);
    }
  }, { immediate: true });
});

const handleSend = async () => {
  if (!userInput.value.trim() || !user.value) return;
  const text = userInput.value;
  userInput.value = ''; 
  const chatId = currentTopic.value.replace(/\s+/g, '_').toLowerCase();
  await sendMessage(user.value.uid, text, chatId);
  scrollToBottom();
};

const finishConversation = async () => {
  if (!confirm("Veux-tu terminer la session et sauvegarder les nouveaux mots appris ?")) return;
  try {
    const success = await endSession(user.value.uid);
    if (success) router.push('/');
  } catch (error) {
    console.error("Erreur sauvegarde", error);
    alert("Erreur lors de la sauvegarde.");
  }
};

// --- LOGIQUE INTERACTIVE ---

function splitText(text) {
  if (!text) return [];
  return text.split(/([a-zA-ZáéíóúñÁÉÍÓÚÑüÜ]+)/g).filter(t => t);
}

function isWord(token) {
  return /^[a-zA-ZáéíóúñÁÉÍÓÚÑüÜ]+$/.test(token);
}

function isTargetWord(token) {
    if (!token || targetWords.value.length === 0) return false;
    const cleanToken = token.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return targetWords.value.some(target => {
        const cleanTarget = target.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (cleanToken === cleanTarget) return true;
        if (cleanToken.includes(cleanTarget) && cleanToken.length <= cleanTarget.length + 2) return true;
        return false;
    });
}

// GESTION DU CLIC AVEC APPEL API
async function handleWordClick(word, event) {
  // 1. On affiche le tooltip tout de suite en mode "chargement"
  const rect = event.target.getBoundingClientRect();
  tooltip.value = {
    visible: true,
    x: rect.left + rect.width / 2,
    y: rect.top,
    word: word,
    translation: '...',
    loading: true
  };

  // 2. Vérif Cache
  const cleanWord = word.toLowerCase().trim();
  if (translationCache.has(cleanWord)) {
      tooltip.value.translation = translationCache.get(cleanWord);
      tooltip.value.loading = false;
      return;
  }

  // 3. Appel API (via notre service)
  const translation = await translateWord(cleanWord);
  
  // 4. Mise à jour UI + Cache
  tooltip.value.translation = translation;
  tooltip.value.loading = false;
  translationCache.set(cleanWord, translation);
}

function clearSelection() {
  tooltip.value.visible = false;
}

watch(messages, () => scrollToBottom(), { deep: true });

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  });
}

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
.sagrada-light-bg {
    background-color: #fffbf5;
    background-image: 
        radial-gradient(at 20% 30%, hsla(45, 100%, 85%, 0.4) 0px, transparent 50%),
        radial-gradient(at 50% 80%, hsla(10, 100%, 90%, 0.4) 0px, transparent 50%);
    background-attachment: fixed;
}
.sagrada-header-texture {
    background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.07' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E");
}
.organic-shape { border-radius: 45% 55% 70% 30% / 30% 60% 40% 70%; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.animate-fade-in { animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translate(-50%, -90%); } to { opacity: 1; transform: translate(-50%, -100%); } }

/* Ajout pour l'animation de la modale */
.animate-bounce-slow { animation: bounce 2s infinite; }
@keyframes bounce {
  0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
  50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
}
</style>