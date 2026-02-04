<template>
  <div class="bg-orange-50 h-screen flex justify-center overflow-hidden font-sans">
    <div class="w-full max-w-md h-full bg-white flex flex-col shadow-xl relative overflow-hidden">

      <header class="p-4 pt-6 flex items-center gap-4 bg-white z-10 border-b border-gray-50">
        <router-link to="/" class="text-gray-400 hover:text-gray-600 transition">
          <i class="fa-solid fa-xmark text-2xl"></i>
        </router-link>
        <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full bg-green-500 rounded-full transition-all duration-500 ease-out" 
               :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="text-green-600 font-bold text-sm">{{ currentIndex + 1 }}/{{ exercises.length }}</div>
      </header>

      <main class="flex-1 flex flex-col justify-center px-6 pb-20 relative z-0 sagrada-light-bg">
        <h2 class="text-xl font-bold text-gray-800 mb-8 leading-tight">
          Traduisez cette phrase en espagnol
        </h2>

        <div class="flex items-start gap-3 mb-8">
          <div class="w-10 h-10 bg-red-100 rounded-2xl rounded-tr-sm flex items-center justify-center border-2 border-red-200 shrink-0 shadow-sm">
            <i class="fa-solid fa-robot text-red-600 text-lg"></i>
          </div>
          <div class="bg-white border-2 border-gray-100 p-4 rounded-2xl rounded-tl-sm shadow-sm relative flex-1">
            <div class="absolute top-4 -left-2 w-4 h-4 bg-white border-l-2 border-b-2 border-gray-100 transform rotate-45"></div>
            <p class="text-lg text-gray-700 font-medium leading-relaxed">{{ currentEx.fr }}</p>
            <button @click="speak(currentEx.fr, 'fr-FR')" class="mt-2 text-red-400 hover:text-red-600 text-xs font-bold uppercase tracking-wide flex items-center gap-1">
              <i class="fa-solid fa-volume-high"></i> Écouter
            </button>
          </div>
        </div>

        <div class="space-y-4">
          <textarea v-model="userInput" rows="3" 
              class="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-800 placeholder-gray-300 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition resize-none shadow-sm"
              placeholder="Écrivez ou parlez..."></textarea>
          
          <div class="flex justify-end">
            <button @click="toggleListening" :class="{'ring-4 ring-red-200 border-red-500 text-red-500': isListening}"
                class="w-12 h-12 rounded-full bg-white border-2 border-gray-200 text-gray-400 shadow-sm flex items-center justify-center text-lg hover:border-red-400 hover:text-red-500 transition active:scale-95">
              <i class="fa-solid fa-microphone"></i>
            </button>
          </div>
        </div>
      </main>

      <footer class="p-4 border-t border-gray-100 bg-white z-10">
        <button @click="checkAnswer" v-if="!feedback.visible"
            class="w-full bg-green-500 hover:bg-green-600 text-white font-bold text-lg py-3.5 rounded-2xl shadow-md transform active:scale-[0.98] transition border-b-4 border-green-700 active:border-b-0 active:translate-y-1">
          VÉRIFIER
        </button>
      </footer>

      <div class="absolute bottom-0 left-0 w-full p-6 pb-8 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-50 transition-transform duration-300"
           :class="[
             feedback.visible ? 'translate-y-0' : 'translate-y-full',
             feedback.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
           ]">
        
        <div class="w-full">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm">
               <i :class="['fa-solid text-xl', feedback.isCorrect ? 'fa-check text-green-500' : 'fa-xmark text-red-500']"></i>
            </div>
            <h3 class="font-bold text-xl">{{ feedback.isCorrect ? 'Excellent !' : 'Oups...' }}</h3>
          </div>

          <div class="mb-6 pl-1">
            <p class="text-sm font-medium opacity-90" v-if="!feedback.isCorrect">La bonne réponse était :</p>
            <p class="text-lg font-bold mt-1" v-if="!feedback.isCorrect">{{ currentEx.es }}</p>
          </div>

          <button @click="nextExercise"
              class="w-full font-bold text-lg py-3.5 rounded-2xl shadow-sm border-b-4 transform active:scale-[0.98] transition active:border-b-0 active:translate-y-1"
              :class="feedback.isCorrect ? 'bg-green-500 text-white border-green-700 hover:bg-green-600' : 'bg-red-500 text-white border-red-700 hover:bg-red-600'">
            CONTINUER
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const currentIndex = ref(0);
const userInput = ref("");
const isListening = ref(false);
const feedback = ref({ visible: false, isCorrect: false });

const exercises = [
    { fr: "Je voudrais une table pour deux.", es: "Quisiera una mesa para dos", accepted: ["quisiera una mesa para dos", "me gustaría una mesa para dos"] },
    { fr: "Où sont les toilettes ?", es: "Donde estan los baños", accepted: ["donde estan los baños", "¿dónde están los baños?", "donde estan los servicios"] },
    { fr: "L'addition, s'il vous plaît.", es: "La cuenta, por favor", accepted: ["la cuenta por favor", "la cuenta, por favor"] },
];

const currentEx = computed(() => exercises[currentIndex.value]);
const progressPercent = computed(() => ((currentIndex.value) / exercises.length) * 100);

let recognition = null;
if ('webkitSpeechRecognition' in window) {
    recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'es-ES';
    recognition.onresult = (event) => {
        userInput.value = event.results[0][0].transcript;
        isListening.value = false;
    };
    recognition.onend = () => isListening.value = false;
}

function toggleListening() {
    if (!recognition) return alert("Micro non supporté (essayez Chrome)");
    if (isListening.value) recognition.stop();
    else recognition.start();
    isListening.value = !isListening.value;
}

function checkAnswer() {
    const cleanUser = userInput.value.trim().toLowerCase().replace(/[.,¡!¿?]/g, "");
    const isCorrect = currentEx.value.accepted.some(ans => {
        return cleanUser === ans.replace(/[.,¡!¿?]/g, "").toLowerCase();
    });
    
    feedback.value = { visible: true, isCorrect };
    if (!isCorrect) speak(currentEx.value.es, 'es-ES');
}

function nextExercise() {
    feedback.value.visible = false;
    userInput.value = "";
    if (currentIndex.value < exercises.length - 1) {
        currentIndex.value++;
    } else {
        alert("Bravo ! Session terminée.");
        router.push('/');
    }
}

function speak(text, lang) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        window.speechSynthesis.speak(utterance);
    }
}
</script>

<style scoped>
.sagrada-light-bg { background-color: #fffbf5; background-image: radial-gradient(at 20% 30%, hsla(45, 100%, 85%, 0.4) 0px, transparent 50%), radial-gradient(at 50% 80%, hsla(10, 100%, 90%, 0.4) 0px, transparent 50%); background-attachment: fixed; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>