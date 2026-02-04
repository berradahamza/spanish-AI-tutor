import { ref } from 'vue';
import { db } from '../firebase-config';
import { collection, getDocs, doc, writeBatch, increment, getDoc, setDoc } from "firebase/firestore";

export function useDictionary() {
    const knownWords = ref([]);

    // 1. Récupérer tout le dictionnaire de l'utilisateur (optimisé : juste les mots-clés)
    const fetchDictionary = async (userId) => {
        if (!userId) return [];
        const dictRef = collection(db, "users", userId, "dictionary");
        const snapshot = await getDocs(dictRef);
        // On retourne un Set ou un Array simple pour l'envoyer au prompt IA
        knownWords.value = snapshot.docs.map(d => d.id); // ex: ['gato', 'casa', ...]
        return knownWords.value;
    };

    // 2. Mise à jour massive à la fin de la conversation
    const processEndOfConversation = async (userId, wordsToProcess) => {
        if (!userId || wordsToProcess.length === 0) return;

        const batch = writeBatch(db);
        const dictRef = collection(db, "users", userId, "dictionary");

        for (const item of wordsToProcess) {
            // item = { word: "gato", isNew: true/false }
            const wordKey = item.word.toLowerCase().trim();
            const docRef = doc(dictRef, wordKey);
            
            // On prépare l'update sans faire de lecture pour économiser (blind write)
            // Si le document n'existe pas, setDoc avec merge le créera
            // Si il existe, on incrémente juste le compteur "seenCount"
            batch.set(docRef, {
                word: wordKey,
                seenCount: increment(1), // On ajoute +1 à chaque fois qu'il est utilisé/vu
                lastSeen: new Date(),
                // Si c'est un nouveau mot cible appris ajd, on peut marquer la date d'apprentissage
                learnedAt: item.isNew ? new Date() : undefined 
            }, { merge: true });
        }

        await batch.commit();
        console.log("Dictionnaire mis à jour avec succès !");
    };

    return { knownWords, fetchDictionary, processEndOfConversation };
}