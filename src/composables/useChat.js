import { ref } from 'vue';
import { db } from '../firebase-config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

export function useChat() {
    const messages = ref([]);
    const loading = ref(false);
    let unsubscribe = null; // Pour arrêter l'écoute quand on quitte la page

    // 1. Initialiser l'écoute des messages d'une conversation
    const initChat = (userId, conversationId = "demo_chat") => {
        if (!userId) return;

        // On pointe vers: users -> {uid} -> conversations -> {id} -> messages
        const messagesRef = collection(db, "users", userId, "conversations", conversationId, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));

        loading.value = true;
        
        // Écoute en temps réel (Realtime)
        unsubscribe = onSnapshot(q, (snapshot) => {
            messages.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            loading.value = false;
        });
    };

    // 2. Envoyer un message
    const sendMessage = async (userId, text, role = 'user', conversationId = "demo_chat") => {
        if (!text.trim() || !userId) return;

        const messagesRef = collection(db, "users", userId, "conversations", conversationId, "messages");
        
        await addDoc(messagesRef, {
            text: text,
            role: role, // 'user' ou 'ai'
            createdAt: serverTimestamp()
        });
    };

    // 3. Simulation IA (En attendant de brancher GPT-4)
    const simulateAIResponse = (userId, userText) => {
        setTimeout(() => {
            const responses = [
                "¡Interesante! Cuéntame más.",
                "No entiendo bien, ¿puedes repetir?",
                "¡Muy bien dicho!",
                "En español se dice diferente, pero te entiendo."
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            sendMessage(userId, randomResponse, 'ai');
        }, 1500);
    };

    return { messages, loading, initChat, sendMessage, simulateAIResponse };
}