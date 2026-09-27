// js/services/dbService.js
import { collection, doc, setDoc, getDoc, getDocs, query, where, addDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { db } from "./firebaseConfig.js";

const SUPERADMIN_EMAIL = 'bernat13@gmail.com';

class DbService {

    // =============================
    // GESTIÓN DE USUARIOS
    // =============================

    /**
     * Se llama al iniciar sesión. Verifica si el usuario está invitado.
     * Si es el superadmin y no existe, lo crea automáticamente.
     * Si es cualquier otro y no existe, lanza un error de acceso denegado.
     * Retorna el perfil completo del usuario (con rol, centro, etc.)
     */
    async loginUser(user) {
        if (!db) return { ...user, role: 'alumno' }; // Modo demo

        const q = query(collection(db, "users"), where("email", "==", user.email));
        const snap = await getDocs(q);

        // Si es el superadmin y no tiene perfil, lo creamos
        if (snap.empty && user.email === SUPERADMIN_EMAIL) {
            const profileData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'Superadmin',
                role: 'superadmin',
                centro: 'IES Machado',
                clase: null,
                createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, "users", user.uid), profileData);
            return profileData;
        }

        // Si no existe en la BD y no es el superadmin: ACCESO DENEGADO
        if (snap.empty) {
            throw new Error('ACCESO_DENEGADO');
        }

        // Usuario encontrado: actualizar uid y displayName por si ha cambiado
        const userDoc = snap.docs[0];
        const existingData = userDoc.data();
        await updateDoc(doc(db, "users", userDoc.id), {
            uid: user.uid,
            displayName: user.displayName || existingData.displayName
        });

        return { ...existingData, uid: user.uid, docId: userDoc.id };
    }

    async getUserProfile(uid) {
        if (!db) return null;
        try {
            const q = query(collection(db, "users"), where("uid", "==", uid));
            const snap = await getDocs(q);
            if (!snap.empty) return { docId: snap.docs[0].id, ...snap.docs[0].data() };
            return null;
        } catch (e) {
            console.error("Error obteniendo perfil:", e);
            return null;
        }
    }

    /**
     * Invitar a un docente (solo superadmin puede llamar esto)
     */
    async inviteDocente(email, displayName, centro) {
        if (!db) throw new Error("No hay conexión con la base de datos");
        // Comprobar si ya existe
        const q = query(collection(db, "users"), where("email", "==", email));
        const snap = await getDocs(q);
        if (!snap.empty) throw new Error("Este email ya tiene un perfil en el sistema.");

        const profile = {
            email,
            displayName: displayName || email,
            role: 'docente',
            centro,
            clase: null,
            uid: null, // Se rellenará al iniciar sesión por primera vez
            createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, "users"), profile);
    }

    /**
     * Invitar a un alumno (un docente puede llamar esto para su mismo centro)
     */
    async inviteAlumno(email, displayName, centro, clase) {
        if (!db) throw new Error("No hay conexión con la base de datos");
        const q = query(collection(db, "users"), where("email", "==", email));
        const snap = await getDocs(q);
        if (!snap.empty) throw new Error("Este email ya tiene un perfil en el sistema.");

        const profile = {
            email,
            displayName: displayName || email,
            role: 'alumno',
            centro,
            clase,
            uid: null,
            createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, "users"), profile);
    }

    /**
     * Obtener todos los docentes (solo superadmin)
     */
    async getDocentes() {
        if (!db) return [];
        const q = query(collection(db, "users"), where("role", "==", "docente"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    }

    async getAllUsers() {
        if (!db) return [];
        const snap = await getDocs(collection(db, "users"));
        return snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    }

    async migrateOldUsersToDocente() {
        if (!db) return 0;
        const snap = await getDocs(collection(db, "users"));
        let count = 0;
        const promises = [];
        snap.docs.forEach(d => {
            const data = d.data();
            if (!data.role || data.role === '') {
                promises.push(updateDoc(doc(db, "users", d.id), {
                    role: 'docente',
                    centro: data.centro || ''
                }));
                count++;
            }
        });
        await Promise.all(promises);
        return count;
    }

    async updateUserField(docId, fields) {
        if (!db) return;
        await updateDoc(doc(db, "users", docId), fields);
    }

    async getProgramsCountByUid(uid) {
        if (!db) return 0;
        if (!uid) return 0;
        const q = query(collection(db, "programs"), where("ownerId", "==", uid));
        const snap = await getDocs(q);
        return snap.size;
    }

    /**
     * Obtener alumnos de un centro (para docentes)
     */
    async getAlumnosByCentro(centro) {
        if (!db) return [];
        const q = query(collection(db, "users"),
            where("role", "==", "alumno"),
            where("centro", "==", centro)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    }

    /**
     * Eliminar usuario (superadmin y docentes)
     */
    async deleteUser(docId) {
        if (!db) return;
        await deleteDoc(doc(db, "users", docId));
    }

    /**
     * Obtener programas de un alumno (para que el docente pueda verlos)
     */
    async getProgramsByOwnerUid(ownerUid) {
        if (!db) return [];
        const q = query(collection(db, "programs"), where("ownerId", "==", ownerUid));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // =============================
    // GESTIÓN DE PROGRAMAS
    // =============================

    async saveProgram(programData) {
        if (!db) {
            const programs = JSON.parse(localStorage.getItem('demoPrograms') || '[]');
            const index = programs.findIndex(p => p.id === programData.id);
            if (index >= 0) programs[index] = programData;
            else programs.push(programData);
            localStorage.setItem('demoPrograms', JSON.stringify(programs));
            return programData.id;
        }

        try {
            if (!programData.id) {
                const docRef = await addDoc(collection(db, "programs"), programData);
                programData.id = docRef.id;
                await setDoc(docRef, programData);
                return programData.id;
            } else {
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
        if (!db) return JSON.parse(localStorage.getItem('demoPrograms') || '[]');
        try {
            const q1 = query(collection(db, "programs"), where("ownerId", "==", userId));
            const q2 = query(collection(db, "programs"), where(`collaborators.${userId}`, "in", ["editor", "lector", "comentador"]));
            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            const programsMap = new Map();
            snap1.forEach((doc) => programsMap.set(doc.id, { id: doc.id, ...doc.data() }));
            snap2.forEach((doc) => programsMap.set(doc.id, { id: doc.id, ...doc.data(), shared: true }));
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
            if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };
            return null;
        } catch (error) {
            console.error("Error obteniendo programa por ID: ", error);
            return null;
        }
    }

    async deleteProgram(programId) {
        if (!db) {
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
        // Método legacy, mantenido por compatibilidad. Ahora usamos loginUser().
        if (!db) return;
        try {
            const q = query(collection(db, "users"), where("uid", "==", user.uid));
            const snap = await getDocs(q);
            if (!snap.empty) {
                await updateDoc(doc(db, "users", snap.docs[0].id), {
                    displayName: user.displayName || snap.docs[0].data().displayName
                });
            }
        } catch (e) {
            console.error("Error en saveUser: ", e);
        }
    }

    async getUserByEmail(email) {
        if (!db) return null;
        try {
            const q = query(collection(db, "users"), where("email", "==", email));
            const snap = await getDocs(q);
            if (!snap.empty) return snap.docs[0].data();
            return null;
        } catch (e) {
            return null;
        }
    }
}

export const dbService = new DbService();
