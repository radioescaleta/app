// js/services/dbService.js
import { collection, doc, setDoc, getDoc, getDocs, query, where, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
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
            const q1 = query(collection(db, "programs"), where("ownerId", "==", userId));
            // Buscar donde es editor o lector (usando in)
            const q2 = query(collection(db, "programs"), where(`collaborators.${userId}`, "in", ["editor", "lector", "comentador"]));
            
            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            
            const programsMap = new Map();
            
            snap1.forEach((doc) => {
                programsMap.set(doc.id, { id: doc.id, ...doc.data() });
            });
            
            snap2.forEach((doc) => {
                programsMap.set(doc.id, { id: doc.id, ...doc.data(), shared: true });
            });
            
            return Array.from(programsMap.values());
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

    async deleteProgram(programId) {
        if (!db) {
            // Modo demo
            let programs = JSON.parse(localStorage.getItem('demoPrograms') || '[]');
            programs = programs.filter(p => p.id !== programId);
            localStorage.setItem('demoPrograms', JSON.stringify(programs));
            return;
        }
        
        try {
            await deleteDoc(doc(db, "programs", programId));
        } catch (error) {
            console.error("Error borrando programa: ", error);
            throw error;
        }
    }

    async saveUser(user) {
        if (!db) return;
        try {
            const docRef = doc(db, "users", user.uid);
            await setDoc(docRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName
            }, { merge: true });
        } catch (e) {
            console.error("Error guardando usuario: ", e);
        }
    }

    async getUserByEmail(email) {
        if (!db) {
            // Modo demo
            return email === 'demo@educaand.es' ? { uid: 'demo999', email: 'demo@educaand.es' } : null;
        }
        try {
            const q = query(collection(db, "users"), where("email", "==", email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data();
            }
            return null;
        } catch (e) {
            console.error("Error buscando usuario: ", e);
            return null;
        }
    }
}

export const dbService = new DbService();
