import OpenAI from "openai";

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true 
});

// Nettoyage JSON robuste
const cleanJSON = (text) => {
    if (!text) return null;
    try {
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (e) {
        return null;
    }
};

// Utilitaire pour normaliser (minuscule sans accents) pour comparer les mots
const normalize = (str) => {
    return str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// --- Service de Traduction API ---
export const translateWord = async (word) => {
    try {
        const cleanWord = word.toLowerCase().trim();
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${cleanWord}&langpair=es|fr`);
        const data = await response.json();
        
        if (data.responseData && data.responseData.translatedText) {
            const trad = data.responseData.translatedText.toLowerCase();
            return trad !== cleanWord ? trad : "Traduction indisponible";
        }
        return "Traduction indisponible";
    } catch (e) {
        console.error("Erreur API Traduction:", e);
        return "..."; 
    }
};

// 1. INITIALISATION (CORRIGÉ : FILTRE DES MOTS CONNUS)
export const generateTargetWords = async (topic, knownWords) => {
    try {
        // On prépare un Set des mots connus pour une recherche instantanée
        // On normalise tout pour éviter que "Hola" soit différent de "hola"
        const knownSet = new Set(knownWords.map(w => normalize(w)));

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `
                    Tu es un expert pédagogique espagnol. Sujet: "${topic}".
                    L'élève connait déjà ${knownWords.length} mots.
                    
                    TÂCHE :
                    Génère une liste de **15 mots** de vocabulaire EN ESPAGNOL pertinents pour ce sujet.
                    
                    CONTRAINTES :
                    1. Évite les mots trop basiques (el, la, un, soy, hola) sauf s'ils sont cruciaux.
                    2. Cherche des mots précis liés au thème.
                    3. Jamais de français dans la liste.
                    
                    Format JSON : { "words": ["palabra1", "palabra2", ...] }
                    `
                }
            ]
        });

        const data = JSON.parse(response.choices[0].message.content);
        const candidates = data.words || [];

        // FILTRAGE STRICT CÔTÉ CODE :
        // On ne garde que les mots qui NE SONT PAS dans le Set des mots connus.
        const newWords = candidates.filter(word => {
            return !knownSet.has(normalize(word));
        });

        // On retourne les 5 premiers mots inconnus trouvés.
        // Si on en a moins de 5 (l'élève sait tout !), on renvoie ce qu'on a, ou des mots par défaut.
        const finalSelection = newWords.slice(0, 5);
        
        return finalSelection.length > 0 ? finalSelection : ["genial", "super", "claro", "verdad", "quizas"];

    } catch (e) {
        console.error("Erreur génération mots:", e);
        return ["hola", "amigo", "fiesta", "gracias", "si"];
    }
};

// 2. GÉNÉRATION INTRO (Inchangé)
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
                    
                     Format JSON :
                    {
                        "spanish": "Ta phrase d'intro..."
                    }
                    `
                }
            ]
        });
        
        const content = response.choices[0].message.content;
        const data = cleanJSON(content);

        return {
            spanish: data?.spanish || `¡Hola! Hablemos de ${topic}.`,
            glossary: {} 
        };

    } catch (e) {
        return { spanish: `¡Hola! Empecemos a hablar de ${topic}.`, glossary: {} };
    }
};

// 3. CHAT (Inchangé)
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
                    
                    RAPPEL FORMAT JSON STRICT SI FAUTE AUTRE QUE ACCENT MANQUANT OU MAJUSCULE: 
                    { 
                        "spanish": "( correction : ... ) Ta réponse...(qui contient de préference un mot de la liste des 5 (essaie de varier pendant la conversation)"
                    }
                    RAPPEL FORMAT JSON STRICT SI AUCUNE FAUTE OU JUSTE UN ACCENT MANQUANT OU UNE MAJ MANQUANTE: 
                    { 
                        "spanish": "Ta réponse...(qui contient de préference un mot de la liste des 5 (essaie de varier pendant la conversation)"
                    }
                    Ne génère PAS de glossaire.
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

// 4. RÉVISION (Inchangé)
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
                    
                    RÈGLES CRITIQUES POUR LA PHRASE EN FRANÇAIS :
                    1. Choisis un mot de la liste (ex: "gato").
                    2. Traduis-le mentalement en français (ex: "chat").
                    3. Construis une phrase simple en FRANÇAIS avec ce mot traduit.
                    
                    ⛔ INTERDICTION ABSOLUE : N'écris JAMAIS le mot espagnol dans la phrase française.
                    - MAUVAIS : "Le gato mange."
                    - BON : "Le chat mange."
                    
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
        return [];
    }
};

// 5. JUGE IA (Inchangé)
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
                    2. **LES ACCENTS NE COMPTENT PAS COMME UNE FAUTE**.
                    3. **LES MAJUSCULES NE COMPTENT PAS**.
                    4. **REFUSE (isCorrect: false) UNIQUEMENT SI** le mot est faux ou incompréhensible.

                    Format JSON attendu :
                    {
                        "isCorrect": boolean,
                        "feedback": "Ton commentaire (Sois positif !)"
                    }
                    `
                }
            ]
        });

        const data = JSON.parse(response.choices[0].message.content);
        return data || { isCorrect: false, feedback: "Erreur d'analyse." };

    } catch (e) {
        const normalize = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return { 
            isCorrect: normalize(userAnswer) === normalize(expectedSpanish), 
            feedback: "Vérification hors ligne (tolérante)." 
        };
    }
};

// NOUVEAU : Générateur d'Histoire Interactive
export const generateStoryPage = async (theme, pageNumber, history, userChoice) => {
    try {
        const isFinalPage = pageNumber === 5;
        
        let systemPrompt = `
        Rôle : Tu es un écrivain d'histoires interactives pour débutants en espagnol.
        Tâche : Écris la **PAGE ${pageNumber}/5** de l'histoire sur le thème : "${theme}".
        
        FORMAT OBLIGATOIRE (Style Théâtre) :
        - Utilise "NARRADOR:" pour les descriptions de l'action.
        - Utilise "NOM_PERSONNAGE:" pour les dialogues.
        - Langage : ESPAGNOL TRÈS SIMPLE (Niveau A1). Phrases courtes.
        
        CONTEXTE PRÉCÉDENT :
        ${history}
        
        ACTION DU JOUEUR (qui dicte la suite) :
        "${userChoice}"
        `;

        if (isFinalPage) {
            systemPrompt += `
            Ceci est la DERNIÈRE PAGE. Conclus l'histoire de manière amusante ou intense.
            Ne pose PAS de question à la fin.
            Format JSON : { "spanishContent": "Texte de la fin...", "isEnd": true }
            `;
        } else {
            systemPrompt += `
            Fais avancer l'intrigue rapidement.
            À la fin, propose un dilemme ou une question pour la suite.
            Format JSON : 
            { 
                "spanishContent": "Texte de l'histoire...", 
                "question": "Question pour le joueur en espagnol (ex: ¿Qué debe hacer Pablo?)" 
            }
            `;
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: systemPrompt }]
        });

        return cleanJSON(response.choices[0].message.content) || { spanishContent: "Fin.", isEnd: true };

    } catch (e) {
        console.error("Erreur Story:", e);
        return { spanishContent: "Erreur de génération.", isEnd: true };
    }
};

// 1. Générer le tableau de conjugaison
export const getConjugationTable = async (tense, mode, specificVerb, userWords) => {
    try {
        let contentPrompt = "";
        
        if (mode === 'manual') {
            contentPrompt = `Conjugue le verbe espagnol "${specificVerb}" au temps "${tense}".`;
        } else {
            // Mode Aléatoire
            const sampleWords = userWords.slice(0, 50).join(', '); // On donne un échantillon pour aider
            contentPrompt = `
            Tâche : Choisis un verbe espagnol.
            Priorité : Choisis un verbe présent dans cette liste : [${sampleWords}].
            Si aucun verbe n'est trouvé ou si la liste est vide, choisis un verbe courant (ex: Comer, Hablar, Vivir).
            
            Une fois choisi, conjugue-le au temps "${tense}".
            `;
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `
                    ${contentPrompt}
                    
                    Format JSON ATTENDU :
                    {
                        "verb": "Infinitif (ex: Hablar)",
                        "translation": "Traduction FR (ex: Parler)",
                        "tense": "Le temps choisi",
                        "table": [
                            { "pronoun": "Yo", "conjugation": "hablo" },
                            { "pronoun": "Tú", "conjugation": "hablas" },
                            { "pronoun": "Él/Ella/Usted", "conjugation": "habla" },
                            { "pronoun": "Nosotros", "conjugation": "hablamos" },
                            { "pronoun": "Vosotros", "conjugation": "habláis" },
                            { "pronoun": "Ellos/Ellas", "conjugation": "hablan" }
                        ]
                    }
                    `
                }
            ]
        });

        return cleanJSON(response.choices[0].message.content);
    } catch (e) {
        console.error("Erreur Conjugaison Table:", e);
        return null;
    }
};

// 2. Générer les exercices à trous
export const generateConjugationExercises = async (verb, tense) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `
                    Tu es un prof d'espagnol.
                    Sujet : Exercice de conjugaison pour le verbe "${verb}" au temps "${tense}".
                    
                    Tâche : Crée **10 phrases** à trous.
                    Chaque phrase doit avoir un trou "___" où l'utilisateur doit mettre le verbe conjugué.
                    Varie les pronoms (Yo, Tú, Nosotros, etc.).
                    
                    Format JSON :
                    {
                        "exercises": [
                            {
                                "sentence": "Yo ___ en Madrid.",
                                "answer": "vivo",
                                "pronoun": "Yo",
                                "hint": "vivir"
                            }
                        ]
                    }
                    `
                }
            ]
        });

        const data = cleanJSON(response.choices[0].message.content);
        return data?.exercises || [];
    } catch (e) {
        console.error("Erreur Conjugaison Exercices:", e);
        return [];
    }
};