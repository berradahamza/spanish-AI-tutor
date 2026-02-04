import { ref } from 'vue';
import { db } from '../firebase-config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, writeBatch } from "firebase/firestore";
import { useDictionary } from './useDictionary';
import { generateTargetWords, sendChatMessage, analyzeSession } from '../services/aiService';

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
        
        const introMessage = `¡Hola! El tema es "${topic}". Intentaremos usar: ${targetWords.value.join(', ')}. ¿Listo?`;
        
        const messagesRef = collection(db, "users", userId, "conversations", chatId, "messages");
        const snapshot = await getDocs(messagesRef);
        
        if (snapshot.empty) {
            await addDoc(messagesRef, {
                role: 'ai',
                text: introMessage,
                glossary: { "tema": "sujet", "usar": "utiliser" }, // Petit glossaire manuel pour l'intro
                createdAt: serverTimestamp()
            });
        }
        loading.value = false;
    };

    // 2. Envoi Message (Version JSON)
    const sendMessage = async (userId, userText, chatId) => {
        if (!userText.trim()) return;

        const messagesRef = collection(db, "users", userId, "conversations", chatId, "messages");
        
        // A. Sauvegarde User
        await addDoc(messagesRef, {
            text: userText,
            role: 'user',
            createdAt: serverTimestamp()
        });

        // B. Appel IA
        loading.value = true;
        const systemContext = `Prof espagnol. Cibles: ${targetWords.value.join(', ')}. Corrige erreurs.`;
        
        // On récupère l'objet { spanish, glossary }
        const aiResponse = await sendChatMessage(messages.value, userText, systemContext);
        
        loading.value = false;

        // C. Sauvegarde IA avec Glossaire
        // Sécurité : on vérifie si aiResponse est bien un objet ou juste du texte (au cas où)
        const textToSave = aiResponse.spanish || (typeof aiResponse === 'string' ? aiResponse : "Error");
        const glossaryToSave = aiResponse.glossary || {};

        await addDoc(messagesRef, {
            text: textToSave,
            glossary: glossaryToSave,
            role: 'ai',
            createdAt: serverTimestamp()
        });
    };

    // 3. Fin (Inchangé)
    const endSession = async (userId) => {
        loading.value = true;
        const analysis = await analyzeSession(messages.value, targetWords.value);
        
        const wordsToUpdate = [];
        analysis.userValidWords.forEach(w => wordsToUpdate.push({ word: w, isNew: false }));
        analysis.targetWordsLearned.forEach(w => {
            if (!wordsToUpdate.find(i => i.word === w)) wordsToUpdate.push({ word: w, isNew: true });
        });

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