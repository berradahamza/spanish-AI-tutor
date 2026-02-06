import { ref } from 'vue';
import { generateStoryPage } from '../services/aiService';
import { useUser } from './useUser';

export function useStory() {
    const loading = ref(false);
    const currentPage = ref(0);
    const storyContent = ref(null); // Contient { spanishContent, question }
    const historySummary = ref(""); 
    const isFinished = ref(false);

    // On récupère le streak manager
    const { incrementStreak } = useUser();

    // Démarrage
    const startStory = async (theme) => {
        loading.value = true;
        currentPage.value = 1;
        historySummary.value = "";
        isFinished.value = false;
        storyContent.value = null;

        // Première page (Page 1)
        const data = await generateStoryPage(theme, 1, "Début de l'aventure.", "L'histoire commence.");
        storyContent.value = data;
        loading.value = false;
    };

    // Page suivante
    const nextSegment = async (theme, userChoice) => {
        if (!userChoice.trim()) return;
        
        // On garde une trace pour l'IA
        historySummary.value += `\nPage ${currentPage.value}: ... ${userChoice}`;

        loading.value = true;
        currentPage.value++;

        const data = await generateStoryPage(theme, currentPage.value, historySummary.value, userChoice);
        storyContent.value = data;

        // SI C'EST FINI (Page 5 ou flag isEnd)
        if (currentPage.value >= 5 || data.isEnd) {
            isFinished.value = true;
            // BOUM : ON VALIDE LE STREAK ICI !
            await incrementStreak();
        }

        loading.value = false;
    };

    return { 
        loading, 
        currentPage, 
        storyContent, 
        isFinished, 
        startStory, 
        nextSegment 
    };
}