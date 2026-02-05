import { ref } from 'vue';
import { useDictionary } from './useDictionary';
// On importe le juge IA
import { generateRevisionExercises, verifyRevisionAnswer } from '../services/aiService';

export function useRevision() {
    const exercises = ref([]);
    const currentIndex = ref(0);
    const loading = ref(false);
    const completed = ref(false);
    const score = ref(0);
    const resultMessage = ref(null);
    
    // NOUVEAU : État pour savoir si l'IA est en train de corriger
    const isChecking = ref(false);

    const { fetchDictionary } = useDictionary();

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

    // MODIFIÉ : Vérification via l'IA
    const checkAnswer = async (userAnswer) => {
        const currentEx = exercises.value[currentIndex.value];
        if (!currentEx || !userAnswer.trim()) return;

        isChecking.value = true; // On lance le chargement visuel

        // Appel au Juge IA
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
                correction: currentEx.spanish // On montre la bonne réponse
            };
        }

        isChecking.value = false; // Fin du chargement
    };

    const nextQuestion = () => {
        resultMessage.value = null;
        if (currentIndex.value < exercises.value.length - 1) {
            currentIndex.value++;
        } else {
            completed.value = true;
        }
    };

    return { 
        exercises, 
        currentIndex, 
        loading, 
        isChecking, // On l'exporte pour l'utiliser dans la vue
        completed, 
        score, 
        resultMessage,
        startRevision, 
        checkAnswer, 
        nextQuestion 
    };
}