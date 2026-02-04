import OpenAI from "openai";

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true 
});

const cleanJSON = (text) => {
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
};

// 1. Initialisation (Inchangé)
export const generateTargetWords = async (topic, knownWords) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `Expert pédagogique. Sujet: "${topic}". Connu: ${JSON.stringify(knownWords.slice(0, 50))}. 
                    Génère JSON { "words": ["mot1", "mot2", ...] } de 10 mots utiles.`
                }
            ]
        });
        const data = JSON.parse(response.choices[0].message.content);
        return data.words || ["hola", "amigo"];
    } catch (e) {
        return ["hola", "amigo", "fiesta", "gracias", "si", "no"];
    }
};

// 2. CHAT - CORRECTION DU DOUBLON
export const sendChatMessage = async (history, userMessage, systemContext) => {
    try {
        // CORRECTION : On filtre l'historique pour NE PAS inclure le message qu'on vient d'envoyer
        // Sinon on envoie [User: "Hola", User: "Hola"] et l'IA bug.
        const previousMessages = history.filter(msg => msg.text !== userMessage);

        const openAIHistory = previousMessages.map(msg => ({
            role: msg.role === 'ai' ? 'assistant' : 'user',
            content: msg.text
        }));

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `
                    ${systemContext}
                    
                    FORMAT JSON OBLIGATOIRE :
                    {
                        "spanish": "Ta réponse conversationnelle ici",
                        "glossary": { "mot_espagnol": "traduction_fr" }
                    }
                    `
                },
                ...openAIHistory,
                // On ajoute le message utilisateur UNE SEULE FOIS ici à la fin
                { role: "user", content: userMessage }
            ]
        });

        const content = response.choices[0].message.content;
        return cleanJSON(content) || { spanish: "...", glossary: {} };

    } catch (e) {
        console.error("Erreur OpenAI Chat:", e);
        return { 
            spanish: "Lo siento, error de conexión.", 
            glossary: { "error": "erreur" } 
        };
    }
};

// 3. Analyse (Inchangé)
export const analyzeSession = async (messages, targetWords) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `Analyse. Cibles: ${JSON.stringify(targetWords)}. Hist: ${JSON.stringify(messages)}. 
                    JSON: { "userValidWords": [], "targetWordsLearned": [] }`
                }
            ]
        });
        return cleanJSON(response.choices[0].message.content) || { userValidWords: [], targetWordsLearned: [] };
    } catch (e) {
        return { userValidWords: [], targetWordsLearned: [] };
    }
};