import OpenAI from "openai";

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true 
});

// Nettoyage robuste
const cleanJSON = (text) => {
    if (!text) return null;
    try {
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (e) {
        return null;
    }
};

// 1. Initialisation
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

// 2. GÉNÉRATION INTRO
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

        return {
            spanish: data?.spanish || `¡Hola! Hablemos de ${topic}.`,
            glossary: data?.glossary || {} 
        };

    } catch (e) {
        console.error("Erreur Intro:", e);
        return { spanish: `¡Hola! Empecemos a hablar de ${topic}.`, glossary: {} };
    }
};

// 3. CHAT
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

// 5. RÉVISION : Générer des exercices (Inchangé)
export const generateRevisionExercises = async (userWords) => {
    try {
        const wordsToPractice = userWords.sort(() => 0.5 - Math.random()).slice(0, 10);
        const wordsString = wordsToPractice.length > 0 ? JSON.stringify(wordsToPractice) : '["gato", "amigo", "fiesta"]';

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `
                    Tu es un professeur d'espagnol.
                    L'élève connait ces mots en espagnol : ${wordsString}.
                    
                    Tâche : Crée 5 exercices de traduction (Français -> Espagnol).
                    Pour chaque exercice :
                    1. Écris une phrase TRÈS SIMPLE en Français (niveau enfant/débutant).
                    2. Cette phrase doit nécessiter l'utilisation d'un des mots connus pour être traduite.
                    3. Donne la traduction correcte attendue en Espagnol.
                    
                    Format JSON attendu :
                    {
                        "exercises": [
                            {
                                "french": "Le chat mange.",
                                "spanish": "El gato come.",
                                "targetWord": "gato"
                            }
                        ]
                    }
                    `
                }
            ]
        });

        const data = JSON.parse(response.choices[0].message.content);
        return data.exercises || [];
    } catch (e) {
        console.error("Erreur Révision:", e);
        return [];
    }
};

// 6. LE JUGE IA (Version TOLÉRANCE EXTRÊME)
export const verifyRevisionAnswer = async (userAnswer, expectedSpanish, frenchOriginal) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `
                    Tu es un correcteur d'espagnol extrêmement cool et tolérant.
                    
                    CONTEXTE :
                    - Phrase en français : "${frenchOriginal}"
                    - Réponse attendue : "${expectedSpanish}"
                    - Réponse de l'élève : "${userAnswer}"
                    
                    TES ORDRES ABSOLUS :
                    1. **SI LES MOTS SONT BONS, C'EST GAGNÉ (isCorrect: true)**.
                    
                    2. **LES ACCENTS NE COMPTENT PAS COMME UNE FAUTE** : 
                       - Si l'élève écrit "tu" au lieu de "tú" -> TU DOIS METTRE **isCorrect: true**.
                       - Si l'élève écrit "esta" au lieu de "está" -> TU DOIS METTRE **isCorrect: true**.
                       - Dans ce cas, ton feedback doit être positif : "Bravo ! (Attention juste à l'accent sur 'tú')".
                    
                    3. **LES MAJUSCULES NE COMPTENT PAS**. Ignore-les complètement.
                    
                    4. **REFUSE (isCorrect: false) UNIQUEMENT SI** :
                       - L'élève utilise le mauvais mot (ex: "Chien" au lieu de "Chat").
                       - L'orthographe est tellement mauvaise qu'on ne reconnaît pas le mot.
                       - La phrase n'a pas de sens.

                    Format JSON attendu :
                    {
                        "isCorrect": boolean,
                        "feedback": "Ton commentaire (Sois positif si c'est juste un accent !)"
                    }
                    `
                }
            ]
        });

        const data = JSON.parse(response.choices[0].message.content);
        return data || { isCorrect: false, feedback: "Erreur d'analyse." };

    } catch (e) {
        console.error("Erreur Vérification:", e);
        const normalize = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return { 
            isCorrect: normalize(userAnswer) === normalize(expectedSpanish), 
            feedback: "Vérification hors ligne (tolérante)." 
        };
    }
};