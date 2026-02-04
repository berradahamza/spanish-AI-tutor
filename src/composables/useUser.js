// src/composables/useUser.js
import { ref } from 'vue';
import { auth, db, googleProvider } from '../firebase-config';
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export function useUser() {
    const user = ref(null);
    const dailyCount = ref(10);
    const loading = ref(true);

    // Initialisation & Surveillance de l'Auth
    onAuthStateChanged(auth, async (currentUser) => {
        loading.value = true;
        if (currentUser) {
            user.value = currentUser;
            await syncUserData(currentUser);
        } else {
            user.value = null;
        }
        loading.value = false;
    });

    // Synchronisation avec Firestore
    async function syncUserData(currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            dailyCount.value = userDoc.data().dailyWordGoal || 10;
        } else {
            // Création automatique du profil si premier login
            await setDoc(userRef, {
                displayName: currentUser.displayName,
                email: currentUser.email,
                dailyWordGoal: 10,
                streak: 3 // Valeur par défaut de ta maquette
            });
        }
    }

    const login = () => signInWithPopup(auth, googleProvider);
    const logout = () => signOut(auth);

    const updateDailyGoal = async (newValue) => {
        dailyCount.value = newValue;
        if (user.value) {
            const userRef = doc(db, "users", user.value.uid);
            await updateDoc(userRef, { dailyWordGoal: newValue });
        }
    };

    return { user, dailyCount, loading, login, logout, updateDailyGoal };
}