// js/docente.js
import { authService } from './services/authService.js?v=2';
import { classroomService } from './services/classroomService.js';
import { dbService } from './services/dbService.js?v=4';

document.addEventListener('DOMContentLoaded', () => {
    const userName = document.getElementById('userName');
    const centroNombre = document.getElementById('centroNombre');
    const alumnosList = document.getElementById('alumnosList');
    const btnInviteAlumno = document.getElementById('btnInviteAlumno');

    let docenteProfile = null;

    const btnImportClassroom = document.getElementById('btnImportClassroom');
    
    btnImportClassroom.addEventListener('click', async () => {
        if (!docenteProfile) return;
        try {
            btnImportClassroom.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Conectando...';
            btnImportClassroom.disabled = true;

            const accessToken = await classroomService.getAccessToken();
            const courses = await classroomService.getTeacherCourses(accessToken);

            if (courses.length === 0) {
                Swal.fire('Sin clases', 'No eres profesor en ninguna clase activa de Google Classroom.', 'info');
                return;
            }

            const optionsHtml = courses.map(c => `<option value="${c.id}">${c.name} ${c.section ? `(${c.section})` : ''}</option>`).join('');

            const { value: courseId } = await Swal.fire({
                title: 'Importar desde Classroom',
                html: `
                    <p style="margin-bottom:15px; text-align:left;">Selecciona una de tus clases:</p>
                    <select id="classroomCourse" class="swal2-select" style="display:flex; width:100%;">
                        ${optionsHtml}
                    </select>
                `,
                showCancelButton: true,
                confirmButtonText: 'Ver Alumnos',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    return document.getElementById('classroomCourse').value;
                }
            });

            if (courseId) {
                Swal.fire({ title: 'Cargando alumnos...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                
                const selectedCourse = courses.find(c => c.id === courseId);
                const className = `${selectedCourse.name} ${selectedCourse.section ? selectedCourse.section : ''}`.trim();
                
                const studentsData = await classroomService.getCourseStudents(courseId, accessToken);
                if (studentsData.length === 0) {
                    Swal.fire('Clase vacía', 'Esta clase no tiene alumnos.', 'info');
                    return;
                }

                const confirm = await Swal.fire({
                    title: `Importar ${studentsData.length} alumnos`,
                    text: `¿Quieres invitar a los ${studentsData.length} alumnos de "${className}"?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, invitar',
                    cancelButtonText: 'Cancelar'
                });

                if (confirm.isConfirmed) {
                    Swal.fire({ title: 'Importando...', html: 'Añadiendo alumnos a Radioescaleta...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                    
                    let successCount = 0;
                    let errorCount = 0;

                    for (const student of studentsData) {
                        console.log("Datos del alumno devueltos por Google:", student);
                        const email = student.profile?.emailAddress;
                        const name = student.profile?.name?.fullName || '';
                        if (email) {
                            try {
                                await dbService.inviteAlumno(email, name, docenteProfile.centro, className);
                                successCount++;
                            } catch(e) {
                                errorCount++;
                            }
                        }
                    }

                    Swal.fire(
                        'Importación completada', 
                        `Se han importado ${successCount} alumnos a tu centro.<br>${errorCount > 0 ? `Hubo ${errorCount} alumnos que ya estaban invitados.` : ''}`, 
                        'success'
                    );
                    loadAlumnos();
                }
            }
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        } finally {
            btnImportClassroom.innerHTML = '<i class="fa-brands fa-google"></i> Importar desde Google Classroom';
            btnImportClassroom.disabled = false;
        }
    });



    authService.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Verificar que sea docente o superadmin
        const profile = await dbService.getUserProfile(user.uid);
        if (!profile || (profile.role !== 'docente' && profile.role !== 'superadmin')) {
            Swal.fire('Acceso denegado', 'Esta página es solo para Docentes.', 'error')
                .then(() => window.location.href = 'index.html');
            return;
        }

        docenteProfile = profile;
        userName.textContent = profile.displayName || user.email;
        centroNombre.textContent = profile.centro || 'Sin centro asignado';

        loadAlumnos();
    });

    btnInviteAlumno.addEventListener('click', async () => {
        if (!docenteProfile) return;

        const email = document.getElementById('alumnoEmail').value.trim();
        const nombre = document.getElementById('alumnoNombre').value.trim();
        const clase = document.getElementById('alumnoClase').value.trim();

        if (!email || !clase) {
            Swal.fire('Faltan datos', 'El email y la clase son obligatorios.', 'warning');
            return;
        }

        const orig = btnInviteAlumno.innerHTML;
        btnInviteAlumno.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        btnInviteAlumno.disabled = true;

        try {
            await dbService.inviteAlumno(email, nombre, docenteProfile.centro, clase);
            Swal.fire({toast: true, position: 'bottom', icon: 'success', title: `Alumno invitado: ${email}`, showConfirmButton: false, timer: 3000});
            document.getElementById('alumnoEmail').value = '';
            document.getElementById('alumnoNombre').value = '';
            document.getElementById('alumnoClase').value = '';
            loadAlumnos();
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        } finally {
            btnInviteAlumno.innerHTML = orig;
            btnInviteAlumno.disabled = false;
        }
    });

    async function loadAlumnos() {
        if (!docenteProfile) return;
        alumnosList.innerHTML = '<li style="padding:10px; color:#888;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</li>';
        const alumnos = await dbService.getAlumnosByCentro(docenteProfile.centro);

        if (alumnos.length === 0) {
            alumnosList.innerHTML = '<li style="padding:12px; color:#888;">No hay alumnos en este centro todavía.</li>';
            return;
        }

        // Agrupar por clase
        const byClase = {};
        alumnos.forEach(a => {
            const k = a.clase || 'Sin clase';
            if (!byClase[k]) byClase[k] = [];
            byClase[k].push(a);
        });

        alumnosList.innerHTML = '';

        Object.entries(byClase).sort().forEach(([clase, alumnos]) => {
            // Cabecera de clase
            const claseLi = document.createElement('li');
            claseLi.style.padding = '8px 16px';
            claseLi.style.fontSize = '13px';
            claseLi.style.fontWeight = 'bold';
            claseLi.style.color = '#555';
            claseLi.style.background = '#f5f5f5';
            claseLi.style.borderRadius = '8px';
            claseLi.style.marginBottom = '6px';
            claseLi.innerHTML = `<i class="fa-solid fa-layer-group"></i> ${clase}`;
            alumnosList.appendChild(claseLi);

            alumnos.forEach(alumno => {
                const hasLoggedIn = !!alumno.uid;
                const li = document.createElement('li');
                li.className = 'alumno-item';

                li.innerHTML = `
                    <div class="alumno-header">
                        <i class="fa-solid fa-user-graduate" style="color: #1565c0; font-size: 20px;"></i>
                        <div class="alumno-info">
                            <div class="name">${alumno.displayName || alumno.email}</div>
                            <div class="detail">${alumno.email} · <span class="badge badge-clase">${alumno.clase}</span>
                                ${!hasLoggedIn ? ' <span class="badge badge-no-login" title="Aún no ha iniciado sesión">Pendiente</span>' : ''}
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-down toggle-icon" style="color:#888;"></i>
                    </div>
                    <div class="alumno-programs">
                        <div class="loading-programs" style="color:#888; font-size:13px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando programas...</div>
                    </div>
                `;

                alumnosList.appendChild(li);

                // Toggle para desplegar programas
                const header = li.querySelector('.alumno-header');
                const programsDiv = li.querySelector('.alumno-programs');
                const chevron = li.querySelector('.toggle-icon');
                let loaded = false;

                header.addEventListener('click', async () => {
                    const isOpen = programsDiv.classList.toggle('open');
                    chevron.style.transform = isOpen ? 'rotate(180deg)' : '';

                    if (isOpen && !loaded && hasLoggedIn) {
                        loaded = true;
                        try {
                            const programs = await dbService.getProgramsByOwnerUid(alumno.uid);
                            const loadingDiv = programsDiv.querySelector('.loading-programs');
                            if (programs.length === 0) {
                                loadingDiv.innerHTML = '<span style="color:#aaa; font-size:13px;">Este alumno aún no ha creado ningún programa.</span>';
                                return;
                            }
                            loadingDiv.remove();
                            programs.forEach(prog => {
                                const date = new Date(prog.createdAt).toLocaleDateString();
                                const progDiv = document.createElement('div');
                                progDiv.className = 'program-item';
                                progDiv.innerHTML = `
                                    <i class="fa-solid fa-file-audio" style="color: #1565c0;"></i>
                                    <span class="prog-title"><b>${prog.title}</b> <small style="color:#aaa;">${date}</small></span>
                                    <a href="editor.html?id=${prog.id}&readonly=1" class="btn btn-secondary" style="padding: 5px 12px; font-size: 13px;" title="Ver en modo lectura">
                                        <i class="fa-solid fa-eye"></i> Revisar
                                    </a>
                                `;
                                programsDiv.appendChild(progDiv);
                            });
                        } catch (err) {
                            programsDiv.innerHTML = `<span style="color:red; font-size:13px;">Error cargando programas: ${err.message}</span>`;
                        }
                    } else if (isOpen && !hasLoggedIn) {
                        programsDiv.querySelector('.loading-programs').innerHTML =
                            '<span style="color:#ff9800; font-size:13px;"><i class="fa-solid fa-clock"></i> El alumno aún no ha iniciado sesión por primera vez.</span>';
                        loaded = true;
                    }
                });

                // Botón eliminar alumno
                const delBtn = document.createElement('button');
                delBtn.className = 'btn btn-secondary';
                delBtn.style.cssText = 'background:#f44336; padding: 5px 10px; margin-top:8px;';
                delBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Eliminar alumno';
                delBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const result = await Swal.fire({
                        title: '¿Eliminar alumno?',
                        text: 'Sus programas no se borran, solo el acceso a la beta.',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#f44336',
                        confirmButtonText: 'Sí, eliminar'
                    });
                    if (result.isConfirmed) {
                        await dbService.deleteUser(alumno.docId);
                        Swal.fire({toast: true, position:'bottom', icon:'success', title:'Alumno eliminado', showConfirmButton:false, timer:2500});
                        loadAlumnos();
                    }
                });
                li.querySelector('.alumno-programs').appendChild(delBtn);
            });
        });
    }
});
