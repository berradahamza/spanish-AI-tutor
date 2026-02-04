<template>
  <div class="bg-orange-50 h-screen flex justify-center overflow-hidden font-sans">
    <div class="w-full max-w-md h-full bg-white flex flex-col shadow-xl relative">
      
      <header class="bg-red-800 sagrada-header-texture text-white p-6 pb-28 rounded-b-[2.5rem] shadow-lg z-10 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-xl"></div>
        <div class="flex items-center justify-between relative z-20">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 organic-shape bg-white flex items-center justify-center shrink-0 border-2 border-amber-400 shadow-md overflow-hidden">
              <img v-if="user?.photoURL" :src="user.photoURL" alt="User" class="w-full h-full object-cover">
              <img v-else src="/mustache.png" alt="User" class="w-full h-full object-contain p-1.5 opacity-90">
            </div>
            <div>
              <p class="text-red-200 text-xs font-medium uppercase tracking-wider mb-0.5">Hola,</p>
              <h1 class="font-bold text-2xl leading-none">{{ user?.displayName?.split(' ')[0] || 'Estudiante' }}</h1>
            </div>
          </div>
          <div class="flex items-center gap-2 bg-red-900/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-500/30 shadow-sm">
            <i class="fa-solid fa-fire text-amber-400 animate-pulse"></i>
            <span class="font-bold text-sm">--</span>
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto px-6 pb-6 -mt-16 space-y-5 sagrada-light-bg no-scrollbar z-20 pt-2">
        
        <router-link to="/setup" class="block bg-white p-6 rounded-3xl shadow-xl border border-white/50 card-hover transition transform relative overflow-hidden group">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h2 class="text-gray-800 font-bold text-xl">Nouvelle Conversation</h2>
              <p class="text-gray-500 text-sm mt-1">Pratiquer maintenant</p>
            </div>
            <div class="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition duration-300">
              <i class="fa-solid fa-comments text-xl"></i>
            </div>
          </div>
          <div class="mt-5 inline-flex items-center gap-2 text-sm font-bold text-red-700 group-hover:gap-3 transition-all">
            C'est parti <i class="fa-solid fa-arrow-right"></i>
          </div>
        </router-link>

        <div class="grid grid-cols-2 gap-4">
            <router-link to="/dico" class="bg-white p-5 rounded-3xl shadow-lg border border-white/50 flex flex-col items-center text-center gap-3 card-hover transition hover:shadow-xl cursor-pointer">
                <div class="w-14 h-14 organic-shape bg-amber-50 flex items-center justify-center text-amber-500 mb-1 shadow-sm"><i class="fa-solid fa-book-open text-2xl"></i></div>
                <div><h3 class="font-bold text-gray-800">Dictionnaire</h3></div>
            </router-link>
            <router-link to="/revision" class="bg-white p-5 rounded-3xl shadow-lg border border-white/50 flex flex-col items-center text-center gap-3 card-hover transition hover:shadow-xl cursor-pointer">
                <div class="w-14 h-14 organic-shape bg-green-50 flex items-center justify-center text-green-600 mb-1 shadow-sm"><i class="fa-solid fa-dumbbell text-2xl"></i></div>
                <div><h3 class="font-bold text-gray-800">Révisions</h3></div>
            </router-link>
        </div>

        <div class="bg-white/60 backdrop-blur-md p-5 rounded-3xl border border-white shadow-sm mt-4">
          <h3 class="text-gray-800 font-bold mb-4 text-sm flex items-center gap-2">
            <i class="fa-solid fa-sliders text-gray-400"></i> Préférences
          </h3>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 font-medium">Mots par jour</span>
            <div class="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
              <button @click="updateDailyGoal(dailyCount - 1)" class="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition">
                <i class="fa-solid fa-minus"></i>
              </button>
              <span class="font-bold text-gray-800 w-6 text-center text-sm">{{ dailyCount }}</span>
              <button @click="updateDailyGoal(dailyCount + 1)" class="w-8 h-8 flex items-center justify-center rounded-lg text-green-500 hover:bg-green-50 transition">
                <i class="fa-solid fa-plus"></i>
              </button>
            </div>
          </div>
        </div>
        
        <div class="h-4"></div>
      </main>

    </div>
  </div>
</template>

<script setup>
import { useUser } from '../composables/useUser';
// On récupère aussi dailyCount et updateDailyGoal pour les faire marcher
const { user, dailyCount, updateDailyGoal } = useUser();
</script>

<style scoped>
/* Tes styles habituels... */
.sagrada-light-bg { background-color: #fffbf5; background-image: radial-gradient(at 20% 30%, hsla(45, 100%, 85%, 0.4) 0px, transparent 50%), radial-gradient(at 50% 80%, hsla(10, 100%, 90%, 0.4) 0px, transparent 50%); background-attachment: fixed; }
.sagrada-header-texture { background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.07' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E"); }
.organic-shape { border-radius: 45% 55% 70% 30% / 30% 60% 40% 70%; }
.card-hover:active { transform: scale(0.98); }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>