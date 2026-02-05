import { ref } from 'vue';
import { db } from '../firebase-config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, writeBatch } from "firebase/firestore";
import { useDictionary } from './useDictionary';
import { generateTargetWords, sendChatMessage, generateIntroMessage } from '../services/aiService';
// 1. On importe le User pour gérer le Streak
import { useUser } from './useUser';

export function useChat() {
    const messages = ref([]);
    const targetWords = ref([]);
    const loading = ref(false);
    let unsubscribe = null;
    
    const { fetchDictionary, processEndOfConversation } = useDictionary();
    // 2. On récupère la fonction d'incrémentation
    const { incrementStreak } = useUser();

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
        
        // --- PROMPT SYSTÈME "NUCLÉAIRE" (Tes 4 Règles Critiques) ---
        const systemContext = `
            RÔLE : Tu es le personnage du scénario en cours. Tu n'es pas une IA standard.
            Objectifs lexicaux : ${targetWords.value.join(', ')}.
            
            RÈGLES CRITIQUES (A RESPECTER À LA LETTRE) :
            1. 🎭 ROLEPLAY STRICT : Ne sors JAMAIS du roleplay. Reste dans le contexte.
            2. ✍️ FORMAT CORRECTION : Si l'utilisateur fait une faute, ta réponse DOIT commencer par : "(Correction = [la correction]) " suivi de ta réponse. Si pas de faute, réponds direct.
            3. 🚫 ANTI-PERROQUET : Ne répète JAMAIS ce que dit l'utilisateur. Fais avancer la conversation.
            4. 💡 CRÉATIVITÉ : Si tu ne sais pas quoi dire, invente un détail ou pose une question liée au contexte.
            
            🚨 GLOSSAIRE OBLIGATOIRE (DICTIONNAIRE TOTAL) :
            Traduis **CHAQUE MOT** de ta réponse dans le JSON (verbes conjugués, noms, adjectifs, pronoms). Tout doit être cliquable.
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

    // 3. Fin Session (LOGIQUE PRESERVÉE + STREAK)
    const endSession = async (userId) => {
        loading.value = true;
        
        // A. On construit le "Dictionnaire de session" pour retrouver les traductions manquantes
        // (C'est ta logique que tu voulais absolument garder)
        const sessionGlossary = {};
        messages.value.forEach(msg => {
            if (msg.role === 'ai' && msg.glossary) {
                Object.keys(msg.glossary).forEach(key => {
                    sessionGlossary[key.toLowerCase()] = msg.glossary[key];
                });
            }
        });

        // B. On prépare les mots avec leurs traductions
        const wordsToUpdate = targetWords.value.map(word => {
            const cleanWord = word.toLowerCase();
            const translation = sessionGlossary[cleanWord] || "Traduction à vérifier";
            
            return {
                word: word,
                translation: translation,
                isNew: true 
            };
        });

        // C. Sauvegarde Firebase
        await processEndOfConversation(userId, wordsToUpdate);
        
        // --- D. MISE A JOUR DU STREAK ---
        await incrementStreak(); 
        // --------------------------------

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