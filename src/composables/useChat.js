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
                glossary: { "tema": "sujet", "usar": "utiliser" },
                createdAt: serverTimestamp()
            });
        }
        loading.value = false;
    };

    // 2. Envoi Message
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
        
        // --- C'EST ICI QU'ON CHANGE LA PERSONNALITÉ ---
        const systemContext = `
            Tu es un ami espagnol. 
            Ton but est de discuter simplement du sujet.
            Mots cibles à utiliser si possible : ${targetWords.value.join(', ')}.
            
            CONSIGNES STRICTES :
            1. FAIS COURT (1 ou 2 phrases maximum).
            2. Utilise un langage simple, naturel et courant.
            3. Ne répète jamais ce que dit l'utilisateur.
            4. Relance la conversation avec une question simple.
            5. Si l'utilisateur fait une faute, ignore-la dans la conversation, mais ajoute la correction entre parenthèses à la toute fin.
        `;
        
        const aiResponse = await sendChatMessage(messages.value, userText, systemContext);
        
        loading.value = false;

        // C. Sauvegarde IA avec Glossaire
        const textToSave = aiResponse.spanish || (typeof aiResponse === 'string' ? aiResponse : "...");
        const glossaryToSave = aiResponse.glossary || {};

        await addDoc(messagesRef, {
            text: textToSave,
            glossary: glossaryToSave,
            role: 'ai',
            createdAt: serverTimestamp()
        });
    };

    // 3. Fin Session
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