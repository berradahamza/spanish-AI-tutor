import { ref } from 'vue';
import { db } from '../firebase-config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, writeBatch } from "firebase/firestore";
import { useDictionary } from './useDictionary';
import { generateTargetWords, sendChatMessage, generateIntroMessage } from '../services/aiService';
// 1. On importe le User pour gérer le Streak (Préservé)
import { useUser } from './useUser';

export function useChat() {
    const messages = ref([]);
    const targetWords = ref([]);
    const loading = ref(false);
    let unsubscribe = null;
    
    const { fetchDictionary, processEndOfConversation } = useDictionary();
    // 2. On récupère la fonction d'incrémentation (Préservé)
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
                glossary: introData.glossary, 
                createdAt: serverTimestamp()
            });
        }
        loading.value = false;
    };

    // 2. Envoi Message (UPDATE DU PROMPT ICI UNIQUEMENT)
    const sendMessage = async (userId, userText, chatId) => {
        if (!userText.trim()) return;

        const messagesRef = collection(db, "users", userId, "conversations", chatId, "messages");
        
        await addDoc(messagesRef, { text: userText, role: 'user', createdAt: serverTimestamp() });

        loading.value = true;
        
        // --- MISE A JOUR : TES 4 REGLES CRITIQUES ---
        const systemContext = `
            RÔLE : Tu es le personnage du scénario.
            Objectifs : ${targetWords.value.join(', ')}.
            
            ⚠️ RÈGLES CRITIQUES (IMPORTANCE MAXIMALE) ⚠️ :
            1. 🎭 ROLEPLAY : Ne sors JAMAIS du roleplay ni du contexte donné par l'utilisateur. Tu es un personnage, pas une IA.
            2. 🚫 ANTI-PERROQUET : Ne répète JAMAIS ce que l'utilisateur vient de dire. Fais avancer l'histoire.
            3. ✍️ CORRECTION FORMELLE : Si l'utilisateur fait une erreur (orthographe, grammaire, mot), tu DOIS commencer ta réponse par :
               ( correction : [la phrase corrigée] )
               Ensuite seulement, tu mets ta réponse roleplay.
            4. 💡 CRÉATIVITÉ : Si tu ne sais pas quoi dire, sois créatif, invente un détail du scénario.
            
            🚨 GLOSSAIRE TOTAL :
            Traduis CHAQUE MOT de ta réponse dans le JSON (y compris 'le', 'la', 'est', etc.).
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

    // 3. Fin Session (LOGIQUE PRÉSERVÉE : Traduction intelligente + Streak)
    const endSession = async (userId) => {
        loading.value = true;
        
        // A. On construit le "Dictionnaire de la session" (Ta logique préservée)
        const sessionGlossary = {};
        messages.value.forEach(msg => {
            if (msg.role === 'ai' && msg.glossary) {
                Object.keys(msg.glossary).forEach(key => {
                    sessionGlossary[key.toLowerCase()] = msg.glossary[key];
                });
            }
        });

        // B. On prépare les mots (Ta logique préservée)
        const wordsToUpdate = targetWords.value.map(word => {
            const cleanWord = word.toLowerCase();
            const translation = sessionGlossary[cleanWord] || "Traduction à vérifier";
            return {
                word: word,
                translation: translation, 
                isNew: true 
            };
        });

        // C. On sauvegarde
        await processEndOfConversation(userId, wordsToUpdate);
        
        // --- D. STREAK (Ta nouveauté préservée) ---
        await incrementStreak();
        // ------------------------------------------

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