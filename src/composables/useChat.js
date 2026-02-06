import { ref } from 'vue';
import { db } from '../firebase-config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, writeBatch } from "firebase/firestore";
import { useDictionary } from './useDictionary';
// ON IMPORTE LE SERVICE DE TRADUCTION
import { generateTargetWords, sendChatMessage, generateIntroMessage, translateWord } from '../services/aiService';
import { useUser } from './useUser';

export function useChat() {
    const messages = ref([]);
    const targetWords = ref([]);
    const loading = ref(false);
    let unsubscribe = null;
    
    const { fetchDictionary, processEndOfConversation } = useDictionary();
    const { incrementStreak } = useUser();

    // 1. Démarrage (Inchangé)
    const startSession = async (userId, topic, chatId) => {
        loading.value = true;
        const knownWords = await fetchDictionary(userId);
        
        targetWords.value = await generateTargetWords(topic, knownWords);
        
        const messagesRef = collection(db, "users", userId, "conversations", chatId, "messages");
        const snapshot = await getDocs(messagesRef);
        
        if (snapshot.empty) {
            const introData = await generateIntroMessage(topic, targetWords.value);
            
            await addDoc(messagesRef, {
                role: 'ai',
                text: introData.spanish,
                glossary: {}, // Vide maintenant
                createdAt: serverTimestamp()
            });
        }
        loading.value = false;
    };

    // 2. Envoi Message (Prompt sans glossaire)
    const sendMessage = async (userId, userText, chatId) => {
        if (!userText.trim()) return;

        const messagesRef = collection(db, "users", userId, "conversations", chatId, "messages");
        
        await addDoc(messagesRef, { text: userText, role: 'user', createdAt: serverTimestamp() });

        loading.value = true;
        
        const systemContext = `
            RÔLE : Tu es le personnage du scénario.
            Objectifs : ${targetWords.value.join(', ')}.
            
            ⚠️ RÈGLES CRITIQUES :
            1. 🎭 ROLEPLAY : Ne sors JAMAIS du roleplay.
            2. 🚫 ANTI-PERROQUET : Ne répète JAMAIS la phrase de l'utilisateur.
            3. ✍️ CORRECTION FORMELLE : Si l'utilisateur fait une erreur, commence par :
               ( correction : [la phrase corrigée] )
            4. 💡 CRÉATIVITÉ : Sois créatif.
            
            (Pas de glossaire nécessaire).
        `;
        
        const aiResponse = await sendChatMessage(messages.value, userText, systemContext);
        
        loading.value = false;

        const textToSave = aiResponse.spanish || "...";
        
        await addDoc(messagesRef, {
            text: textToSave,
            glossary: {}, // Vide
            role: 'ai',
            createdAt: serverTimestamp()
        });
    };

    // 3. Fin Session (LOGIQUE MISE A JOUR : Traduction API)
    const endSession = async (userId) => {
        loading.value = true;
        
        // On traduit les mots cibles un par un via l'API avant de sauvegarder
        const wordsToUpdatePromise = targetWords.value.map(async (word) => {
            // Appel API pour avoir la trad propre
            const translation = await translateWord(word);
            return {
                word: word,
                translation: translation, 
                isNew: true 
            };
        });

        const wordsToUpdate = await Promise.all(wordsToUpdatePromise);

        // Sauvegarde Firebase
        await processEndOfConversation(userId, wordsToUpdate);
        
        // Streak
        await incrementStreak();

        messages.value = [];
        targetWords.value = [];
        loading.value = false;
        return true;
    };

    const initChat = (userId, conversationId) => {
        if (!userId) return;
        if (unsubscribe) unsubscribe();
        const messagesRef = collection(db, "users", userId, "conversations", conversationId, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));
        loading.value = true;
        unsubscribe = onSnapshot(q, (snapshot) => {
            messages.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            loading.value = false;
        });
    };

    const resetConversation = async (userId, conversationId) => {
        if (!userId) return;
        const messagesRef = collection(db, "users", userId, "conversations", conversationId, "messages");
        const snapshot = await getDocs(messagesRef);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        messages.value = [];
    };

    return { messages, targetWords, loading, startSession, sendMessage, endSession, initChat, resetConversation };
}