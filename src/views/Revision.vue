<template>
  <div class="bg-orange-50 h-screen flex justify-center overflow-hidden font-sans">
    <div class="w-full max-w-md h-full bg-white flex flex-col shadow-xl relative">
      
      <header class="bg-red-800 sagrada-header-texture text-white p-4 shadow-md z-20 relative">
        <div class="flex items-center gap-3">
          <router-link to="/" class="hover:bg-red-700 p-2 rounded-full transition">
            <i class="fa-solid fa-arrow-left"></i>
          </router-link>
          <div>
            <h1 class="font-bold text-lg tracking-wide">Révisions</h1>
            <p class="text-xs text-red-200" v-if="exercises.length > 0">
                Question {{ currentIndex + 1 }} / {{ exercises.length }}
            </p>
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center relative sagrada-light-bg">
        
        <div v-if="loading" class="text-center">
            <i class="fa-solid fa-brain fa-spin text-4xl text-red-600 mb-4"></i>
            <p class="text-gray-600 font-medium animate-pulse">L'IA prépare tes phrases...</p>
        </div>

        <div v-else-if="errorState === 'PAS_ASSEZ_DE_MOTS'" class="text-center px-4">
            <i class="fa-solid fa-book-open text-4xl text-gray-300 mb-3"></i>
            <h3 class="font-bold text-gray-700 mb-2">Dictionnaire trop vide</h3>
            <p class="text-gray-500 text-sm mb-6">Apprends encore quelques mots avec le tuteur !</p>
            <router-link to="/" class="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition">
                Retour
            </router-link>
        </div>

        <div v-else-if="completed" class="text-center animate-fade-in w-full">
            <div class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 text-4xl shadow-sm">
                <i class="fa-solid fa-trophy"></i>
            </div>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Terminé !</h2>
            <p class="text-gray-500 mb-6">Score : <strong class="text-red-600 text-xl">{{ score }} / {{ exercises.length }}</strong></p>
            <button @click="init" class="w-full bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg hover:scale-[1.02] transition">
                Recommencer
            </button>
        </div>

        <div v-else-if="currentExercise" class="w-full max-w-sm animate-fade-in">
            
            <div class="bg-white p-6 rounded-3xl shadow-lg border border-red-50 text-center mb-8 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 to-amber-400"></div>
                <p class="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Traduire en Espagnol</p>
                <h2 class="text-2xl font-bold text-gray-800 leading-relaxed">
                    "{{ currentExercise.french }}"
                </h2>
            </div>

            <div v-if="!resultMessage" class="space-y-4">
                <input 
                    v-model="userAnswer" 
                    @keyup.enter="validate"
                    type="text" 
                    placeholder="Écris en espagnol..." 
                    :disabled="isChecking"
                    class="w-full bg-white border-2 border-gray-100 text-gray-800 rounded-2xl py-4 px-5 text-lg text-center focus:outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition shadow-inner placeholder-gray-300 disabled:opacity-50"
                    autofocus
                >
                <button 
                    @click="validate" 
                    :disabled="!userAnswer.trim() || isChecking"
                    class="w-full bg-red-600 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition disabled:opacity-70 disabled:shadow-none flex items-center justify-center gap-2">
                    <span v-if="isChecking"><i class="fa-solid fa-circle-notch fa-spin"></i> Correction...</span>
                    <span v-else>Valider</span>
                </button>
            </div>

            <div v-else class="text-center animate-fade-in">
                <div :class="['p-4 rounded-2xl mb-6 border-2', resultMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800']">
                    <i :class="['fa-solid text-2xl mb-2', resultMessage.type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark']"></i>
                    
                    <p class="font-bold text-lg">{{ resultMessage.text }}</p>
                    
                    <p v-if="resultMessage.correction" class="text-sm mt-2 font-medium bg-white/50 py-1 px-3 rounded-lg inline-block">
                        Réponse : {{ resultMessage.correction }}
                    </p>
                </div>
                
                <button @click="next" class="w-full bg-gray-900 text-white py-3.5 rounded-2xl font-bold hover:bg-gray-800 transition shadow-lg">
                    Question suivante <i class="fa-solid fa-arrow-right ml-2"></i>
                </button>
            </div>

        </div>

      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUser } from '../composables/useUser';
import { useRevision } from '../composables/useRevision';

const { user } = useUser();
const { 
    exercises, 
    currentIndex, 
    loading, 
    isChecking, // On récupère l'état de chargement
    completed, 
    score, 
    resultMessage,
    startRevision, 
    checkAnswer, 
    nextQuestion 
} = useRevision();

const userAnswer = ref('');
const errorState = ref(null);

const currentExercise = computed(() => exercises.value[currentIndex.value]);

const init = async () => {
    if (user.value) {
        errorState.value = null;
        const res = await startRevision(user.value.uid);
        if (res !== "OK") errorState.value = res;
    }
};

onMounted(() => {
    setTimeout(() => {
        if(user.value) init();
    }, 500);
});

const validate = async () => {
    if (!userAnswer.value.trim() || isChecking.value) return;
    await checkAnswer(userAnswer.value); // On attend la réponse de l'IA
};

const next = () => {
    userAnswer.value = '';
    nextQuestion();
};
</script>

<style scoped>
.sagrada-light-bg { background-color: #fffbf5; background-image: radial-gradient(at 20% 30%, hsla(45, 100%, 85%, 0.4) 0px, transparent 50%), radial-gradient(at 50% 80%, hsla(10, 100%, 90%, 0.4) 0px, transparent 50%); }
.sagrada-header-texture { background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.07' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E"); }
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>