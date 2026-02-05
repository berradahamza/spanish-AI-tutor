import { ref } from 'vue';
import { db } from '../firebase-config';
import { collection, getDocs, doc, writeBatch, increment, onSnapshot, query, orderBy } from "firebase/firestore";

export function useDictionary() {
    const knownWords = ref([]);
    const dictionaryList = ref([]); // NOUVEAU : Liste réactive pour l'interface

    // 1. Récupérer juste les IDs (pour l'IA)
    const fetchDictionary = async (userId) => {
        if (!userId) return [];
        const dictRef = collection(db, "users", userId, "dictionary");
        const snapshot = await getDocs(dictRef);
        knownWords.value = snapshot.docs.map(d => d.id); 
        return knownWords.value;
    };

    // 2. NOUVEAU : Écouter le dictionnaire en temps réel (Pour Dico.vue)
    const listenToDictionary = (userId) => {
        if (!userId) return;
        
        const dictRef = collection(db, "users", userId, "dictionary");
        // On trie par 'lastSeen' pour avoir les mots récents en premier
        const q = query(dictRef, orderBy("lastSeen", "desc"));

        // OnSnapshot permet la mise à jour automatique sans recharger
        return onSnapshot(q, (snapshot) => {
            dictionaryList.value = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    es: data.displayWord || data.word, // Le mot espagnol
                    fr: data.translation || "...",   // La traduction
                    type: "mot",                     // Type par défaut
                    ...data
                };
            });
        });
    };

    // 3. Mise à jour massive à la fin (CORRIGÉ : Sauvegarde de la traduction)
    const processEndOfConversation = async (userId, wordsToProcess) => {
        if (!userId || wordsToProcess.length === 0) return;

        const batch = writeBatch(db);
        const dictRef = collection(db, "users", userId, "dictionary");

        for (const item of wordsToProcess) {
            // item = { word: "Gato", translation: "Chat", isNew: true }
            const wordKey = item.word.toLowerCase().trim(); // Clé unique minuscule
            const docRef = doc(dictRef, wordKey);
            
            batch.set(docRef, {
                word: wordKey,
                displayWord: item.word,          // On garde la casse ("Gato")
                translation: item.translation,   // On garde la traduction ("Chat")
                seenCount: increment(1),
                lastSeen: new Date(),
                learnedAt: item.isNew ? new Date() : undefined 
            }, { merge: true }); // Merge permet de ne pas écraser les anciennes données
        }

        await batch.commit();
        console.log("Dictionnaire sauvegardé avec traductions !");
    };

    return { knownWords, dictionaryList, fetchDictionary, listenToDictionary, processEndOfConversation };
}