<template>
  <div class="bg-orange-50 h-screen flex justify-center overflow-hidden font-sans">
    <div class="w-full max-w-md h-full bg-white flex flex-col shadow-xl relative">
      
      <header class="bg-violet-900 sagrada-header-texture text-white p-4 flex items-center gap-3 shadow-md z-20">
        <router-link to="/" class="hover:bg-violet-700 p-2 rounded-full transition">
          <i class="fa-solid fa-arrow-left"></i>
        </router-link>
        <h1 class="font-bold text-lg tracking-wide">Conjugaison</h1>
      </header>

      <main class="flex-1 overflow-y-auto p-6 relative bg-violet-50/30">
        
        <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-50 backdrop-blur-sm">
            <i class="fa-solid fa-shapes fa-spin text-4xl text-violet-600 mb-4"></i>
            <p class="text-violet-900 font-medium animate-pulse">L'IA réfléchit...</p>
        </div>

        <div v-if="step === 'setup'" class="space-y-6 animate-fade-in">
            <div class="text-center mb-6">
                <div class="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4 text-violet-600 text-3xl shadow-sm">
                    <i class="fa-solid fa-layer-group"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-800">Paramètres</h2>
                <p class="text-gray-500 text-sm">Choisis ton défi.</p>
            </div>

            <div class="bg-white p-4 rounded-2xl shadow-sm border border-violet-100">
                <label class="block text-xs font-bold text-violet-500 uppercase mb-2">Temps</label>
                <select v-model="selectedTense" class="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-violet-400">
                    <option>Présent de l'indicatif</option>
                    <option>Passé Composé (Pretérito Perfecto)</option>
                    <option>Passé Simple (Pretérito Indefinido)</option>
                    <option>Imparfait</option>
                    <option>Futur Simple</option>
                    <option>Conditionnel</option>
                    <option>Subjonctif Présent</option>
                    <option>Impératif</option>
                </select>
            </div>

            <div class="bg-white p-4 rounded-2xl shadow-sm border border-violet-100">
                <label class="block text-xs font-bold text-violet-500 uppercase mb-3">Verbe</label>
                
                <div class="flex gap-2 mb-4">
                    <button @click="inputMode = 'random'" 
                        :class="['flex-1 py-2 rounded-lg text-sm font-bold transition', inputMode === 'random' ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-gray-50 text-gray-400 border border-transparent']">
                        <i class="fa-solid fa-shuffle mr-1"></i> Aléatoire
                    </button>
                    <button @click="inputMode = 'manual'" 
                        :class="['flex-1 py-2 rounded-lg text-sm font-bold transition', inputMode === 'manual' ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-gray-50 text-gray-400 border border-transparent']">
                        <i class="fa-solid fa-keyboard mr-1"></i> Saisir
                    </button>
                </div>

                <input v-if="inputMode === 'manual'" v-model="manualVerb" type="text" placeholder="Ex: Comer" 
                    class="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-violet-400 placeholder-gray-300">
                
                <p v-else class="text-xs text-gray-400 italic text-center">
                    L'IA choisira un verbe de ton dictionnaire (si possible).
                </p>
            </div>

            <button @click="launchTable" :disabled="inputMode === 'manual' && !manualVerb.trim()"
                class="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 transition active:scale-95 disabled:opacity-50 mt-4">
                Conjuguer !
            </button>
        </div>

        <div v-else-if="step === 'learn' && conjugationData" class="animate-fade-in pb-20">
            <div class="text-center mb-6">
                <h2 class="text-3xl font-bold text-violet-800 capitalize">{{ conjugationData.verb }}</h2>
                <p class="text-gray-500 italic">{{ conjugationData.translation }}</p>
                <div class="inline-block bg-violet-100 text-violet-600 text-xs font-bold px-3 py-1 rounded-full mt-2 border border-violet-200">
                    {{ conjugationData.tense }}
                </div>
            </div>

            <div class="bg-white rounded-3xl shadow-sm border border-violet-100 overflow-hidden mb-6">
                <div v-for="(row, idx) in conjugationData.table" :key="idx" 
                    class="flex justify-between items-center p-4 border-b border-gray-50 last:border-0 hover:bg-violet-50/50 transition">
                    <span class="text-gray-400 text-sm font-medium">{{ row.pronoun }}</span>
                    <span class="text-gray-800 font-bold text-lg">{{ row.conjugation }}</span>
                </div>
            </div>

            <button @click="startPractice" 
                class="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-violet-200 hover:scale-[1.02] transition flex items-center justify-center gap-2">
                <i class="fa-solid fa-dumbbell"></i> S'exercer (10 questions)
            </button>
            
            <button @click="reset" class="w-full text-gray-400 text-sm font-medium py-3 mt-2 hover:text-gray-600">
                Choisir un autre verbe
            </button>
        </div>

        <div v-else-if="step === 'practice'" class="animate-fade-in w-full max-w-sm mx-auto pt-4">
            
            <div class="flex justify-between items-center mb-6">
                <span class="text-xs font-bold text-gray-400 uppercase">Question {{ currentIndex + 1 }} / {{ exercises.length }}</span>
                <span class="text-xs font-bold text-violet-600 bg-violet-100 px-2 py-1 rounded">{{ conjugationData.verb }}</span>
            </div>

            <div class="bg-white p-8 rounded-3xl shadow-lg border border-violet-50 text-center mb-6 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400 to-fuchsia-400"></div>
                <h2 class="text-xl text-gray-800 leading-relaxed font-medium">
                    {{ currentEx.sentence.split('___')[0] }}
                    <span class="inline-block w-24 border-b-2 border-violet-300 text-violet-600 font-bold px-1 mx-1">{{ userAnswer || '?' }}</span>
                    {{ currentEx.sentence.split('___')[1] }}
                </h2>
                <p class="mt-4 text-sm text-gray-400">Pronom : <span class="text-violet-500 font-bold">{{ currentEx.pronoun }}</span></p>
            </div>

            <div v-if="!resultMessage" class="space-y-4">
                <input v-model="userAnswer" @keyup.enter="validate" type="text" placeholder="Conjugue le verbe..." :disabled="isChecking" autofocus
                    class="w-full bg-white border-2 border-gray-100 text-gray-800 rounded-2xl py-4 px-5 text-lg text-center focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition shadow-inner disabled:opacity-50">
                
                <button @click="validate" :disabled="!userAnswer.trim() || isChecking"
                    class="w-full bg-violet-600 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 active:scale-95 transition disabled:opacity-70">
                    <span v-if="isChecking"><i class="fa-solid fa-circle-notch fa-spin"></i></span>
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
                <button @click="next" class="w-full bg-gray-900 text-white py-3.5 rounded-2xl font-bold hover:bg-gray-800 transition">
                    Suivant <i class="fa-solid fa-arrow-right ml-2"></i>
                </button>
            </div>
        </div>

        <div v-else-if="step === 'end'" class="text-center animate-fade-in pt-10">
            <div class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 text-4xl shadow-sm">
                <i class="fa-solid fa-medal"></i>
            </div>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Session terminée !</h2>
            <p class="text-gray-500 mb-6">Score : <strong class="text-violet-600 text-xl">{{ score }} / 10</strong></p>
            <button @click="reset" class="w-full bg-violet-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-violet-700 transition mb-3">
                Nouveau verbe
            </button>
            <router-link to="/" class="block w-full text-gray-400 font-bold py-3 hover:text-gray-600">
                Accueil
            </router-link>
        </div>

      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useUser } from '../composables/useUser';
import { useConjugation } from '../composables/useConjugation';

const { user } = useUser();
const {
    step, loading, selectedTense, inputMode, manualVerb, conjugationData,
    exercises, currentIndex, score, isChecking, resultMessage,
    fetchTable, startPractice, checkAnswer, nextQuestion, reset
} = useConjugation();

const userAnswer = ref('');

const currentEx = computed(() => exercises.value[currentIndex.value]);

const launchTable = async () => {
    if(user.value) await fetchTable(user.value.uid);
};

const validate = async () => {
    if (!userAnswer.value.trim() || isChecking.value) return;
    await checkAnswer(userAnswer.value);
};

const next = () => {
    userAnswer.value = '';
    nextQuestion();
};
</script>

<style scoped>
.sagrada-header-texture { background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.07' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E"); }
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>