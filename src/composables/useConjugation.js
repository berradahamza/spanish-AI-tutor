import { ref } from 'vue';
import { useDictionary } from './useDictionary';
import { getConjugationTable, generateConjugationExercises, verifyRevisionAnswer } from '../services/aiService';
import { useUser } from './useUser';

export function useConjugation() {
    const step = ref('setup'); // 'setup', 'learn', 'practice', 'end'
    const loading = ref(false);
    
    // Setup Data
    const selectedTense = ref('Présent de l\'indicatif');
    const inputMode = ref('random'); // 'random' ou 'manual'
    const manualVerb = ref('');
    
    // Learning Data
    const conjugationData = ref(null); // { verb, table, ... }
    
    // Practice Data
    const exercises = ref([]);
    const currentIndex = ref(0);
    const score = ref(0);
    const isChecking = ref(false);
    const resultMessage = ref(null);

    const { fetchDictionary } = useDictionary();
    const { incrementStreak } = useUser();

    // ÉTAPE 1 : Obtenir le tableau
    const fetchTable = async (userId) => {
        loading.value = true;
        const userWords = inputMode.value === 'random' ? await fetchDictionary(userId) : [];
        
        const data = await getConjugationTable(
            selectedTense.value, 
            inputMode.value, 
            manualVerb.value, 
            userWords
        );

        if (data) {
            conjugationData.value = data;
            step.value = 'learn';
        }
        loading.value = false;
    };

    // ÉTAPE 2 : Lancer les exos
    const startPractice = async () => {
        loading.value = true;
        exercises.value = await generateConjugationExercises(conjugationData.value.verb, selectedTense.value);
        currentIndex.value = 0;
        score.value = 0;
        resultMessage.value = null;
        step.value = 'practice';
        loading.value = false;
    };

    // Vérification (Réutilisation du Juge IA pour la tolérance)
    const checkAnswer = async (userAnswer) => {
        const currentEx = exercises.value[currentIndex.value];
        if (!userAnswer.trim()) return;

        isChecking.value = true;
        
        // On construit une fausse phrase "française" pour que le juge comprenne le contexte
        const contextFr = `Conjugue le verbe ${conjugationData.value.verb} avec ${currentEx.pronoun}`;
        
        const result = await verifyRevisionAnswer(
            userAnswer, 
            currentEx.answer, 
            contextFr
        );

        if (result.isCorrect) {
            score.value++;
            resultMessage.value = { type: 'success', text: 'Correcto !', correction: null };
        } else {
            resultMessage.value = { 
                type: 'error', 
                text: 'Aïe...', 
                correction: currentEx.answer 
            };
        }
        isChecking.value = false;
    };

    const nextQuestion = async () => {
        resultMessage.value = null;
        if (currentIndex.value < exercises.value.length - 1) {
            currentIndex.value++;
        } else {
            step.value = 'end';
            await incrementStreak(); // On valide le streak
        }
    };

    const reset = () => {
        step.value = 'setup';
        conjugationData.value = null;
        exercises.value = [];
        manualVerb.value = '';
    };

    return {
        step, loading, selectedTense, inputMode, manualVerb, conjugationData,
        exercises, currentIndex, score, isChecking, resultMessage,
        fetchTable, startPractice, checkAnswer, nextQuestion, reset
    };
}