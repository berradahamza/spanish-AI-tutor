import { ref } from 'vue';
import { db } from '../firebase-config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, writeBatch } from "firebase/firestore";
import { useDictionary } from './useDictionary';
import { generateTargetWords, sendChatMessage, generateIntroMessage } from '../services/aiService';

export function useChat() {
    const messages = ref([]);
    const targetWords = ref([]);
    const loading = ref(false);
    let unsubscribe = null;
    
    const { fetchDictionary, processEndOfConversation } = useDictionary();

    // 1. Démarrage
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
                glossary: introData.glossary, 
                createdAt: serverTimestamp()
            });
        }
        loading.value = false;
    };

    // 2. Envoi Message
    const sendMessage = async (userId, userText, chatId) => {
        if (!userText.trim()) return;

        const messagesRef = collection(db, "users", userId, "conversations", chatId, "messages");
        
        await addDoc(messagesRef, { text: userText, role: 'user', createdAt: serverTimestamp() });

        loading.value = true;
        
        const systemContext = `
            RÔLE : Coach espagnol.
            Objectifs : Utiliser ${targetWords.value.join(', ')}.
            
            RÈGLES :
            1. Utilise au moins 1 mot cible.
            2. Pose une question ouverte.
            3. GLOSSAIRE OBLIGATOIRE : Traduis CHAQUE MOT de ta réponse (même les simples comme "y", "es", "bien"). TOUT DOIT ÊTRE TRADUIT.
        `;
        
        const aiResponse = await sendChatMessage(messages.value, userText, systemContext);
        
        loading.value = false;

        const textToSave = aiResponse.spanish || "...";
        const glossaryToSave = aiResponse.glossary || {};

        await addDoc(messagesRef, {
            text: textToSave,
            glossary: glossaryToSave,
            role: 'ai',
            createdAt: serverTimestamp()
        });
    };

    // 3. Fin Session (CORRIGÉ : Récupération des traductions)
    const endSession = async (userId) => {
        loading.value = true;
        
        // A. On construit un "Dictionnaire de la session" en fusionnant tous les glossaires reçus
        const sessionGlossary = {};
        messages.value.forEach(msg => {
            if (msg.role === 'ai' && msg.glossary) {
                // On met tout en minuscule pour faciliter la recherche
                Object.keys(msg.glossary).forEach(key => {
                    sessionGlossary[key.toLowerCase()] = msg.glossary[key];
                });
            }
        });

        // B. On prépare les mots à sauvegarder AVEC leur traduction trouvée
        const wordsToUpdate = targetWords.value.map(word => {
            const cleanWord = word.toLowerCase();
            // On cherche la trad, ou on met une valeur par défaut
            const translation = sessionGlossary[cleanWord] || "Traduction à vérifier";
            
            return {
                word: word,          // ex: "Gato"
                translation: translation, // ex: "Chat"
                isNew: true 
            };
        });

        // C. On sauvegarde dans Firebase
        await processEndOfConversation(userId, wordsToUpdate);
        
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