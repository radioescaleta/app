// js/services/classroomService.js
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { app } from "./firebaseConfig.js";

class ClassroomService {
    async getAccessToken() {
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/classroom.courses.readonly');
        provider.addScope('https://www.googleapis.com/auth/classroom.rosters.readonly');
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        try {
            const result = await signInWithPopup(auth, provider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            return credential.accessToken;
        } catch (error) {
            console.error('Error obteniendo token de Classroom:', error);
            throw new Error('No se pudo conectar con Google Classroom.');
        }
    }

    async getTeacherCourses(accessToken) {
        try {
            const response = await fetch('https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!response.ok) throw new Error('Error al obtener cursos');
            const data = await response.json();
            return data.courses || [];
        } catch (error) {
            console.error(error);
            throw new Error('Error al obtener tus clases de Classroom.');
        }
    }

    async getCourseStudents(courseId, accessToken) {
        try {
            const response = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/students`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!response.ok) throw new Error('Error al obtener alumnos');
            const data = await response.json();
            return data.students || [];
        } catch (error) {
            console.error(error);
            throw new Error('Error al obtener los alumnos de la clase.');
        }
    }
}

export const classroomService = new ClassroomService();
