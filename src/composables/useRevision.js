import { ref } from 'vue';
import { useDictionary } from './useDictionary';
import { generateRevisionExercises, verifyRevisionAnswer } from '../services/aiService';
// 1. IMPORT DU USER POUR LE STREAK
import { useUser } from './useUser';

export function useRevision() {
    const exercises = ref([]);
    const currentIndex = ref(0);
    const loading = ref(false);
    const completed = ref(false);
    const score = ref(0);
    const resultMessage = ref(null);
    const isChecking = ref(false);

    const { fetchDictionary } = useDictionary();
    
    // 2. RÉCUPÉRATION DE LA FONCTION STREAK
    const { incrementStreak } = useUser();

    const startRevision = async (userId) => {
        loading.value = true;
        completed.value = false;
        score.value = 0;
        currentIndex.value = 0;
        exercises.value = [];
        resultMessage.value = null;

        const myWords = await fetchDictionary(userId);

        if (myWords.length < 3) {
            loading.value = false;
            return "PAS_ASSEZ_DE_MOTS";
        }

        exercises.value = await generateRevisionExercises(myWords);
        loading.value = false;
        return "OK";
    };

    const checkAnswer = async (userAnswer) => {
        const currentEx = exercises.value[currentIndex.value];
        if (!currentEx || !userAnswer.trim()) return;

        isChecking.value = true;
        const result = await verifyRevisionAnswer(
            userAnswer, 
            currentEx.spanish, 
            currentEx.french
        );

        if (result.isCorrect) {
            score.value++;
            resultMessage.value = { 
                type: 'success', 
                text: result.feedback || '¡Muy bien! Exactement ça.',
                correction: null
            };
        } else {
            resultMessage.value = { 
                type: 'error', 
                text: result.feedback || 'Pas tout à fait...',
                correction: currentEx.spanish 
            };
        }

        isChecking.value = false;
    };

    // 3. QUESTION SUIVANTE (C'est ici qu'on valide le streak à la fin)
    const nextQuestion = async () => {
        resultMessage.value = null;
        if (currentIndex.value < exercises.value.length - 1) {
            currentIndex.value++;
        } else {
            // C'était la dernière question -> FINIE
            completed.value = true;
            
            // --- VALIDATION DU STREAK ---
            await incrementStreak(); // On ajoute +1 au compteur
            // ----------------------------
        }
    };

    return { 
        exercises, 
        currentIndex, 
        loading, 
        isChecking, 
        completed, 
        score, 
        resultMessage,
        startRevision, 
        checkAnswer, 
        nextQuestion 
    };
}