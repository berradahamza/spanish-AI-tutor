import OpenAI from "openai";

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true 
});

// Nettoyage robuste (gère le Markdown ```json que GPT ajoute parfois)
const cleanJSON = (text) => {
    if (!text) return null;
    try {
        // On enlève les balises de code éventuelles
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (e) {
        return null;
    }
};

// 1. Initialisation (Mots cibles 100% Espagnol)
export const generateTargetWords = async (topic, knownWords) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `
                    Tu es un expert pédagogique espagnol. Sujet: "${topic}".
                    Génère 5 mots de vocabulaire EN ESPAGNOL (jamais de français).
                    Format JSON : { "words": ["palabra1", "palabra2", "palabra3", "palabra4", "palabra5"] }
                    `
                }
            ]
        });
        const data = JSON.parse(response.choices[0].message.content);
        return data.words ? data.words.slice(0, 5) : ["hola", "amigo", "fiesta", "gracias", "si"];
    } catch (e) {
        return ["hola", "amigo", "fiesta", "gracias", "si"];
    }
};

// 2. GÉNÉRATION INTRO (Correction du bug de traduction)
export const generateIntroMessage = async (topic, targetWords) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `
                    Tu es un prof d'espagnol dynamique.
                    Sujet : "${topic}".
                    Mots à utiliser : ${targetWords.join(', ')}.
                    
                    Tâche : 
                    1. Écris une phrase d'intro en espagnol qui utilise ces mots.
                    2. Pose une question ouverte.
                    
                    🚨 GLOSSAIRE OBLIGATOIRE (CRITIQUE) :
                    Tu dois remplir le champ "glossary" avec la traduction de **CHAQUE MOT** de ta phrase.
                    Absolument TOUS les mots (le, la, manger, table...).
                    ET SURTOUT les mots cibles : ${targetWords.join(', ')}.
                    Si un mot de ta phrase n'est pas dans le glossaire, c'est une erreur grave.
                    
                    Format JSON :
                    {
                        "spanish": "Ta phrase d'intro...",
                        "glossary": { "chaque_mot_espagnol": "traduction_fr" } 
                    }
                    `
                }
            ]
        });
        
        const content = response.choices[0].message.content;
        const data = cleanJSON(content);

        // Sécurité : Si le JSON est cassé ou le glossaire manquant, on renvoie un truc propre
        return {
            spanish: data?.spanish || `¡Hola! Hablemos de ${topic}.`,
            glossary: data?.glossary || {} 
        };

    } catch (e) {
        console.error("Erreur Intro:", e);
        return { spanish: `¡Hola! Empecemos a hablar de ${topic}.`, glossary: {} };
    }
};

// 3. CHAT (Inchangé mais avec le cleanJSON robuste)
export const sendChatMessage = async (history, userMessage, systemContext) => {
    try {
        let openAIHistory = history.map(msg => ({
            role: msg.role === 'ai' ? 'assistant' : 'user',
            content: msg.text
        }));

        if (openAIHistory.length > 0 && openAIHistory[openAIHistory.length - 1].content === userMessage) {
            openAIHistory.pop();
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `
                    ${systemContext}
                    FORMAT JSON : { "spanish": "...", "glossary": { "mot": "traduction" } }
                    `
                },
                ...openAIHistory,
                { role: "user", content: userMessage }
            ]
        });
        
        const data = cleanJSON(response.choices[0].message.content);
        return data || { spanish: "...", glossary: {} };

    } catch (e) {
        return { spanish: "Error de conexión", glossary: {} };
    }
};

// 4. Analyse (Inchangé)
export const analyzeSession = async (messages, targetWords) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: `Analyse JSON: { "userValidWords": [], "targetWordsLearned": [] }. Cibles: ${JSON.stringify(targetWords)}. Hist: ${JSON.stringify(messages)}.` }
            ]
        });
        return cleanJSON(response.choices[0].message.content) || { userValidWords: [], targetWordsLearned: [] };
    } catch (e) {
        return { userValidWords: [], targetWordsLearned: [] };
    }
};