import { ref } from 'vue';
import { auth, db, googleProvider } from '../firebase-config';
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export function useUser() {
    const user = ref(null);
    const streak = ref(0);
    const loading = ref(true);

    // Initialisation & Surveillance de l'Auth
    onAuthStateChanged(auth, async (currentUser) => {
        loading.value = true;
        if (currentUser) {
            user.value = currentUser;
            await syncUserData(currentUser);
        } else {
            user.value = null;
            streak.value = 0;
        }
        loading.value = false;
    });

    // Helper : Obtenir la date au format YYYY-MM-DD (pour éviter les soucis d'heures)
    const getTodayDateString = () => {
        return new Date().toISOString().split('T')[0];
    };

    // Synchronisation : On vérifie si le streak est toujours valide au chargement
    async function syncUserData(currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const data = userDoc.data();
            const lastDate = data.lastActivityDate;
            const today = getTodayDateString();
            
            // Calcul de la différence en jours
            let currentStreak = data.streak || 0;
            
            if (lastDate) {
                const diffTime = new Date(today) - new Date(lastDate);
                const diffDays = diffTime / (1000 * 60 * 60 * 24);

                // Si plus de 1 jour d'écart (hier), on remet à 0
                if (diffDays > 1) {
                    currentStreak = 0;
                    // On met à jour la DB pour refléter la perte du streak
                    await updateDoc(userRef, { streak: 0 });
                }
            }
            
            streak.value = currentStreak;
        } else {
            // Création profil
            await setDoc(userRef, {
                displayName: currentUser.displayName,
                email: currentUser.email,
                streak: 0,
                lastActivityDate: null
            });
        }
    }

    // Fonction appelée quand une activité est TERMINÉE
    const incrementStreak = async () => {
        if (!user.value) return;
        
        const userRef = doc(db, "users", user.value.uid);
        const today = getTodayDateString();
        const userDoc = await getDoc(userRef);
        const data = userDoc.data();
        
        const lastDate = data.lastActivityDate;
        let newStreak = data.streak || 0;

        // Si c'est la première activité d'aujourd'hui
        if (lastDate !== today) {
            const diffTime = lastDate ? (new Date(today) - new Date(lastDate)) : 0;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (diffDays === 1 || !lastDate) {
                // Si c'était hier (ou jamais fait), on continue le streak
                newStreak++;
            } else {
                // Si on a raté des jours, on recommence à 1
                newStreak = 1;
            }

            await updateDoc(userRef, {
                streak: newStreak,
                lastActivityDate: today
            });
            
            streak.value = newStreak;
        }
        // Si lastDate === today, on a déjà compté pour aujourd'hui, on ne fait rien.
    };

    const login = () => signInWithPopup(auth, googleProvider);
    
    const logout = async () => {
        await signOut(auth);
        user.value = null;
        streak.value = 0;
    };

    return { user, streak, loading, login, logout, incrementStreak };
}