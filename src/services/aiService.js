import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// --- CONFIGURATION DU MODÈLE ---
// On passe sur Gemma 3 12B (au lieu de 27B qui est surchargé/503).
// Il est plus léger, plus rapide et a le même quota énorme (14k/jour).
const model = genAI.getGenerativeModel({ 
    model: "gemma-3-12b-it"
});

// Nettoyage robuste (JSON + Extraction)
const cleanJSON = (text) => {
    if (!text) return null;
    try {
        const cleanText = text.replace(/```json|```/g, '').trim();
        let data;
        try {
            data = JSON.parse(cleanText);
        } catch (e) {
            // Extraction de secours si le JSON est noyé dans du texte
            const match = cleanText.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
            if (match) data = JSON.parse(match[0]);
        }
        return data;
    } catch (e) {
        return null;
    }
};

// 1. Initialisation (Mots cibles) - BLINDAGE ANTI-[OBJECT OBJECT]
export const generateTargetWords = async (topic, knownWords) => {
    const prompt = `
    Tâche: Liste vocabulaire espagnol. Sujet: "${topic}".
    Connu: ${JSON.stringify(knownWords.slice(0, 50))}.
    Donne 10 mots.
    IMPORTANT: Réponds UNIQUEMENT avec un tableau de Strings. PAS D'OBJETS.
    Exemple: ["gato", "perro", "casa"]
    `;

    try {
        const result = await model.generateContent(prompt);
        let data = cleanJSON(result.response.text());
        
        // Si c'est un tableau d'objets (le péché mignon de Gemma), on extrait le texte
        if (Array.isArray(data)) {
            return data.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return Object.values(item)[0] || "palabra"; 
                }
                return String(item);
            });
        }
        
        return data || ["hola", "amigo"];
    } catch (e) {
        console.error("Erreur Gemma Mots:", e);
        // Fallback propre
        return ["hola", "amigo", "fiesta", "gracias", "si", "no"];
    }
};

// 2. Chat (Conversation) - BLINDAGE ANTI-CRASH HISTORIQUE
export const sendChatMessage = async (history, userMessage, systemContext) => {
    try {
        const promptCompliance = `
        INSTRUCTION: ${systemContext}
        FORMAT JSON OBLIGATOIRE:
        {
            "spanish": "Phrase en espagnol",
            "glossary": { "mot": "traduction" }
        }
        `;

        // Conversion de l'historique
        const geminiHistory = history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }] 
        }));

        // SÉCURITÉ CRITIQUE : L'API plante si le 1er message est 'model'.
        // On le retire si c'est le cas (souvent le message de bienvenue).
        if (geminiHistory.length > 0 && geminiHistory[0].role === 'model') {
            geminiHistory.shift(); 
        }

        const chat = model.startChat({
            history: geminiHistory,
        });

        const fullMessage = `${promptCompliance}\n\nMessage utilisateur: "${userMessage}"`;
        const result = await chat.sendMessage(fullMessage);
        
        const data = cleanJSON(result.response.text());
        
        return data || { 
            spanish: result.response.text().slice(0, 300), 
            glossary: {} 
        };

    } catch (e) {
        console.error("Erreur Chat Gemma:", e);
        return { 
            spanish: "Lo siento, hubo un pequeño error técnico (503). Inténtalo de nuevo.", 
            glossary: { "error": "erreur" } 
        };
    }
};

// 3. Analyse de fin
export const analyzeSession = async (messages, targetWords) => {
    const prompt = `
    Analyse conversation.
    Cibles: ${JSON.stringify(targetWords)}
    Historique: ${JSON.stringify(messages)}
    JSON attendu: { "userValidWords": [], "targetWordsLearned": [] }
    `;
    try {
        const result = await model.generateContent(prompt);
        return cleanJSON(result.response.text()) || { userValidWords: [], targetWordsLearned: [] };
    } catch (e) {
        return { userValidWords: [], targetWordsLearned: [] };
    }
};