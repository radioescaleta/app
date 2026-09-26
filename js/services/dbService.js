// js/services/dbService.js
import { collection, doc, setDoc, getDoc, getDocs, query, where, addDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { db } from "./firebaseConfig.js";

class DbService {
    async saveProgram(programData) {
        if (!db) {
            // Modo Demo: Guardar en localStorage
            const programs = JSON.parse(localStorage.getItem('demoPrograms') || '[]');
            const index = programs.findIndex(p => p.id === programData.id);
            if (index >= 0) programs[index] = programData;
            else programs.push(programData);
            localStorage.setItem('demoPrograms', JSON.stringify(programs));
            return programData.id;
        }

        try {
            if (!programData.id) {
                // Nuevo programa
                const docRef = await addDoc(collection(db, "programs"), programData);
                programData.id = docRef.id;
                await setDoc(docRef, programData);
                return programData.id;
            } else {
                // Actualizar programa existente
                const docRef = doc(db, "programs", programData.id);
                await setDoc(docRef, programData, { merge: true });
                return programData.id;
            }
        } catch (error) {
            console.error("Error guardando programa: ", error);
            throw error;
        }
    }

    async getPrograms(userId) {
        if (!db) {
            // Modo demo
            return JSON.parse(localStorage.getItem('demoPrograms') || '[]');
        }

        try {
            const q = query(collection(db, "programs"), where("ownerId", "==", userId));
            const querySnapshot = await getDocs(q);
            const programs = [];
            querySnapshot.forEach((doc) => {
                programs.push({ id: doc.id, ...doc.data() });
            });
            // TODO: También obtener programas donde el usuario es colaborador
            return programs;
        } catch (error) {
            console.error("Error obteniendo programas: ", error);
            return [];
        }
    }

    async getProgramById(programId) {
        if (!db) {
            const programs = JSON.parse(localStorage.getItem('demoPrograms') || '[]');
            return programs.find(p => p.id === programId) || null;
        }

        try {
            const docRef = doc(db, "programs", programId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error("Error obteniendo programa por ID: ", error);
            return null;
        }
    }
}

export const dbService = new DbService();
