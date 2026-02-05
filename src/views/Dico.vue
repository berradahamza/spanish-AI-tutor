<template>
  <div class="bg-orange-50 h-screen flex justify-center overflow-hidden font-sans">
    <div class="w-full max-w-md h-full bg-white flex flex-col shadow-xl relative">

      <header class="bg-red-800 sagrada-header-texture text-white p-4 flex items-center justify-between shadow-md z-40 relative">
        <div class="flex items-center gap-3">
          <router-link to="/" class="hover:bg-red-700 p-2 rounded-full transition">
            <i class="fa-solid fa-arrow-left"></i>
          </router-link>
          <div>
            <h1 class="font-bold text-lg tracking-wide">Mon Dictionnaire</h1>
            <div class="text-xs text-red-200 flex items-center gap-1">
              <i class="fa-solid fa-book text-[10px]"></i>
              <span>{{ filteredCount }} mots appris</span>
            </div>
          </div>
        </div>
        <button class="hover:bg-red-700 p-2 rounded-full transition text-amber-400">
          <i class="fa-solid fa-arrow-down-a-z"></i>
        </button>
      </header>

      <main class="flex-1 overflow-y-auto sagrada-light-bg no-scrollbar relative">
        
        <div class="sticky top-0 z-30 bg-white/80 border-b border-red-50 p-4 shadow-sm backdrop-blur-md">
          <div class="relative">
            <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input v-model="search" type="text" placeholder="Rechercher un mot..." 
                class="w-full bg-white border border-gray-200 text-gray-800 rounded-full py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition shadow-sm placeholder-gray-400">
          </div>
        </div>

        <div class="p-4 space-y-2 pb-20">
          
          <div v-if="Object.keys(groupedWords).length === 0" class="text-center mt-10 text-gray-400">
            <i class="fa-regular fa-face-frown-open text-4xl mb-3"></i>
            <p>Aucun mot trouvé.</p>
            <p class="text-xs mt-2">Termine une conversation pour remplir ton dictionnaire !</p>
          </div>

          <div v-for="(words, letter) in groupedWords" :key="letter">
            <div class="flex items-center gap-3 mt-4 mb-3">
              <div class="w-10 h-10 organic-shape bg-red-100 flex items-center justify-center text-red-800 font-bold text-lg shadow-sm border border-red-200">
                {{ letter }}
              </div>
              <div class="h-px bg-red-100 flex-1"></div>
            </div>

            <div v-for="word in words" :key="word.es" @click="speak(word.es)"
                class="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center mb-3 active:scale-[0.99] transition cursor-pointer group hover:border-red-100">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-gray-800 font-bold text-lg capitalize">{{ word.es }}</span>
                  <span v-if="word.type" class="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded tracking-wider">{{ word.type }}</span>
                </div>
                <p class="text-gray-500 text-sm italic">{{ word.fr }}</p>
              </div>
              <button class="w-8 h-8 rounded-full bg-orange-50 text-orange-400 flex items-center justify-center group-hover:bg-orange-100 group-hover:text-orange-600 transition">
                <i class="fa-solid fa-volume-high text-sm"></i>
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useUser } from '../composables/useUser';
import { useDictionary } from '../composables/useDictionary';

const { user } = useUser();
// On récupère dictionaryList (la liste réactive) et la fonction d'écoute
const { dictionaryList, listenToDictionary } = useDictionary();

const search = ref('');

// Dès que le composant est monté ou que l'utilisateur change, on lance l'écoute
onMounted(() => {
  if (user.value) {
    listenToDictionary(user.value.uid);
  }
});

watch(user, (newUser) => {
  if (newUser) {
    listenToDictionary(newUser.uid);
  }
});

// Calcul des groupes (A, B, C...) basé sur la liste Firebase
const groupedWords = computed(() => {
  const term = search.value.toLowerCase();
  
  // On filtre dictionaryList au lieu de rawWords
  const filtered = dictionaryList.value.filter(w => 
    (w.es && w.es.toLowerCase().includes(term)) || 
    (w.fr && w.fr.toLowerCase().includes(term))
  );

  filtered.sort((a, b) => a.es.localeCompare(b.es));

  const groups = {};
  filtered.forEach(word => {
    // Sécurité si word.es est vide
    const letter = (word.es || '?').charAt(0).toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(word);
  });
  
  return groups;
});

const filteredCount = computed(() => {
  let count = 0;
  for (const letter in groupedWords.value) {
    count += groupedWords.value[letter].length;
  }
  return count;
});

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