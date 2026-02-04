// Fonction utilitaire pour nettoyer les accents pour la comparaison (mais pas pour l'affichage)
export const normalizeText = (text) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export const buildSystemPrompt = (topic, knownWordsList, targetWordsList) => {
    // Si targetWordsList est vide, c'est le début, l'IA doit les choisir.
    // Sinon, l'IA doit les enseigner.
    
    let basePrompt = `
    Rôle: Tu es un tuteur d'espagnol immersif.
    Sujet de la conversation: "${topic}".
    Niveau de l'utilisateur: Il connait ${knownWordsList.length} mots.
    
    Règles strictes:
    1. Parle uniquement en espagnol (sauf si l'utilisateur est bloqué).
    2. Tes réponses doivent être courtes et encourageantes.
    `;

    if (targetWordsList.length === 0) {
        // Phase d'initialisation : L'IA doit choisir les mots
        basePrompt += `
        TACHE INITIALE: Choisis 10 mots de vocabulaire espagnol pertinents pour le sujet "${topic}" que l'utilisateur NE CONNAIT PAS encore (basé sur sa liste).
        IMPORTANT: Ne commence pas la conversation tout de suite. Réponds UNIQUEMENT avec la liste des 10 mots au format JSON: ["mot1", "mot2", ...].
        `;
    } else {
        // Phase de conversation
        basePrompt += `
        OBJECTIF PÉDAGOGIQUE: Utilise et fais utiliser ces 10 mots cibles : ${targetWordsList.join(', ')}.
        CONTEXTE: L'utilisateur connait déjà: [${knownWordsList.slice(0, 50).join(', ')}...] (liste tronquée).
        
        Si l'utilisateur fait une faute d'orthographe mineure (accents), ignore-la.
        Si l'utilisateur fait une vraie faute de grammaire ou utilise le mauvais mot, corrige-le gentiment en espagnol.
        `;
    }

    return basePrompt;
};

// Prompt pour l'analyse de fin de conversation (Le juge)
export const buildAnalysisPrompt = (conversationHistory, targetWords) => {
    return `
    Analyse cette conversation espagnole et extrais les données pour la base de données.
    
    Mots Cibles (Target) : ${targetWords.join(', ')}
    Historique : ${JSON.stringify(conversationHistory)}

    Tâche :
    1. Identifie tous les mots espagnols valides utilisés par l'utilisateur (ignore les accents manquants, rejette les fautes d'orthographe graves).
    2. Identifie les Mots Cibles qui ont été correctement introduits et compris.
    
    Réponds UNIQUEMENT au format JSON :
    {
        "userValidWords": ["mot1", "mot2", ...], (tous les mots valides utilisés par l'utilisateur)
        "targetWordsLearned": ["motCible1", ...] (parmi les 10 cibles)
    }
    `;
};