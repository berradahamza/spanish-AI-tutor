<template>
  <div class="bg-indigo-50 h-screen flex justify-center overflow-hidden font-sans">
    <div class="w-full max-w-md h-full bg-white flex flex-col shadow-xl relative">
      
      <header class="bg-indigo-900 sagrada-header-texture text-white p-4 flex justify-between items-center shadow-md z-20">
        <div class="flex items-center gap-3">
            <button @click="quit" class="hover:bg-indigo-700 p-2 rounded-full transition">
                 <i class="fa-solid fa-xmark"></i>
            </button>
            <h1 class="font-bold text-lg">Page {{ loading ? currentPage + 1 : currentPage }} / 5</h1>
        </div>
        <div class="text-[10px] bg-indigo-800 px-2 py-1 rounded border border-indigo-600 uppercase font-bold tracking-wider">
            Théâtre
        </div>
      </header>

      <main class="flex-1 overflow-y-auto p-6 space-y-6 bg-white relative" @click="clearSelection" ref="mainContainer">
        
        <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center bg-white z-30">
            <i class="fa-solid fa-pen-nib fa-bounce text-4xl text-indigo-600 mb-4"></i>
            <p class="text-indigo-900 font-medium animate-pulse">L'IA écrit la suite...</p>
        </div>

        <div v-if="storyContent" class="space-y-6 animate-fade-in pb-24">
            
            <div v-for="(line, idx) in parsedLines" :key="idx" 
                :class="line.isNarrator ? 'text-gray-500 italic text-sm text-center my-6 bg-gray-50 p-3 rounded-xl border border-gray-100' : 'text-gray-800 pl-2 border-l-4 border-indigo-200'">
                
                <strong v-if="!line.isNarrator" class="text-indigo-600 uppercase text-[10px] font-bold block mb-1 tracking-wider">
                    {{ line.speaker }}
                </strong>

                <p :class="line.isNarrator ? '' : 'text-lg leading-relaxed'">
                    <template v-for="(token, tIndex) in splitText(line.text)" :key="tIndex">
                        <span v-if="isWord(token)" 
                            @click.stop="handleWordClick(token, $event)"
                            class="cursor-pointer hover:bg-indigo-100 hover:text-indigo-800 rounded transition px-0.5 border-b border-transparent hover:border-indigo-300">
                            {{ token }}
                        </span>
                        <span v-else>{{ token }}</span>
                    </template>
                </p>
            </div>
            
            <div v-if="!isFinished && storyContent.question" class="bg-indigo-50 p-5 rounded-2xl border-2 border-indigo-100 mt-8 text-center shadow-sm">
                <i class="fa-solid fa-code-branch text-2xl text-indigo-400 mb-2"></i>
                <p class="text-indigo-900 font-bold text-lg leading-snug">
                    {{ storyContent.question }}
                </p>
            </div>

            <div v-if="isFinished" class="text-center mt-10 p-8 bg-green-50 rounded-3xl border border-green-200">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 text-2xl">
                    <i class="fa-solid fa-check"></i>
                </div>
                <h2 class="text-2xl font-bold text-green-700 mb-2">Histoire Terminée !</h2>
                <p class="text-gray-600 mb-6 font-medium">Streak mis à jour 🔥</p>
                <router-link to="/" class="block w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-green-700 transition">
                    Retour à l'accueil
                </router-link>
            </div>
        </div>
      </main>

      <div v-if="tooltip.visible" 
           :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }"
           class="fixed z-50 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl transform -translate-x-1/2 -translate-y-full mt-[-8px] pointer-events-none min-w-[80px] text-center">
        <div class="font-bold capitalize mb-0.5">{{ tooltip.word }}</div>
        <div v-if="tooltip.loading" class="py-1"><i class="fa-solid fa-circle-notch fa-spin text-gray-400"></i></div>
        <div v-else class="text-gray-300 italic">{{ tooltip.translation }}</div>
        <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-gray-900 rotate-45"></div>
      </div>

      <footer v-if="!isFinished" class="bg-white p-4 border-t border-indigo-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
        <div class="relative flex items-center gap-2">
            <input 
                v-model="userChoice" 
                @keyup.enter="handleNext" 
                type="text" 
                placeholder="Ta décision (en espagnol)..." 
                :disabled="loading"
                class="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition font-medium"
            >
            <button @click="handleNext" :disabled="loading || !userChoice.trim()"
                class="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50">
                <i class="fa-solid fa-paper-plane"></i>
            </button>
        </div>
      </footer>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useStory } from '../composables/useStory';
import { translateWord } from '../services/aiService';

const router = useRouter();
// On récupère aussi 'storyContent' depuis le composable pour pouvoir le manipuler ici
const { loading, currentPage, storyContent, isFinished, startStory, nextSegment } = useStory();
const mainContainer = ref(null);

const userChoice = ref('');
const theme = localStorage.getItem('storyTheme') || 'Aventure';

// Gestion Traduction
const tooltip = ref({ visible: false, x: 0, y: 0, word: '', translation: '', loading: false });
const translationCache = new Map();

onMounted(() => {
    startStory(theme);
});

const parsedLines = computed(() => {
    if (!storyContent.value?.spanishContent) return [];
    const rawLines = storyContent.value.spanishContent.split('\n');
    return rawLines.map(line => {
        line = line.trim();
        if (!line) return null;
        
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1 && colonIndex < 20) { 
             const potentialSpeaker = line.substring(0, colonIndex).toUpperCase();
             if (potentialSpeaker.includes('NARRADOR')) {
                 return { isNarrator: true, text: line.substring(colonIndex + 1).trim() };
             }
             return {
                 isNarrator: false,
                 speaker: line.substring(0, colonIndex),
                 text: line.substring(colonIndex + 1).trim()
             };
        }
        return { isNarrator: true, text: line };
    }).filter(l => l);
});

const handleNext = async () => {
    if (!userChoice.value.trim()) return;
    const choice = userChoice.value;
    userChoice.value = '';
    
    // 1. ON VIDE L'ECRAN IMMEDIATEMENT
    // Comme storyContent est une ref du composable, on peut la modifier si le composable l'exporte bien.
    // NOTE : Si le composable exporte une ref en readonly, il faudra modifier le composable.
    // Mais ici on suppose que storyContent est modifiable ou qu'on le force à null visuellement.
    storyContent.value = null; 
    
    // 2. L'appel déclenche le loading=true dans le composable
    await nextSegment(theme, choice);
    
    // 3. UNE FOIS CHARGÉ, ON SCROLL EN HAUT
    scrollToTop();
};

const quit = () => {
    if(confirm("Quitter l'histoire ? La progression sera perdue.")) router.push('/');
};

// Fonction pour remonter tout en haut
function scrollToTop() {
  nextTick(() => {
    if (mainContainer.value) mainContainer.value.scrollTop = 0;
  });
}

function splitText(text) { return text ? text.split(/([a-zA-ZáéíóúñÁÉÍÓÚÑüÜ]+)/g).filter(t => t) : []; }
function isWord(token) { return /^[a-zA-ZáéíóúñÁÉÍÓÚÑüÜ]+$/.test(token); }

async function handleWordClick(word, event) {
  const rect = event.target.getBoundingClientRect();
  tooltip.value = { visible: true, x: rect.left + rect.width/2, y: rect.top, word, translation: '...', loading: true };
  
  const cleanWord = word.toLowerCase().trim();
  if (translationCache.has(cleanWord)) {
      tooltip.value.translation = translationCache.get(cleanWord);
      tooltip.value.loading = false;
      return;
  }
  const translation = await translateWord(cleanWord);
  tooltip.value.translation = translation;
  tooltip.value.loading = false;
  translationCache.set(cleanWord, translation);
}
function clearSelection() { tooltip.value.visible = false; }
</script>

<style scoped>
.sagrada-header-texture { background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.07' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E"); }
.animate-fade-in { animation: fadeIn 0.5s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>