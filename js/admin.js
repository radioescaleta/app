// js/admin.js
import { authService } from './services/authService.js?v=2';
import { dbService } from './services/dbService.js?v=5';

document.addEventListener('DOMContentLoaded', () => {
    const userName = document.getElementById('userName');
    const docentesList = document.getElementById('docentesList');
    const statsBar = document.getElementById('statsBar');
    const btnInviteDocente = document.getElementById('btnInviteDocente');
    const btnMigrate = document.getElementById('btnMigrate');

    authService.onAuthStateChanged(async (user) => {
        if (!user) { window.location.href = 'index.html'; return; }

        const profile = await dbService.getUserProfile(user.uid);
        if (!profile || profile.role !== 'superadmin') {
            Swal.fire('Acceso denegado', 'Solo para Superadministrador.', 'error')
                .then(() => window.location.href = 'index.html');
            return;
        }
        userName.textContent = profile.displayName || user.email;
        loadAll();
    });

    // ─── Migrar usuarios sin rol ───────────────────────────────────────────
    btnMigrate.addEventListener('click', async () => {
        const result = await Swal.fire({
            title: '¿Migrar usuarios sin rol?',
            html: 'Todos los usuarios que no tienen rol asignado se convertirán en <b>Docente</b> con centro en blanco. Podrás asignarles el centro después.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, migrar',
            cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;

        btnMigrate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Migrando...';
        btnMigrate.disabled = true;
        const count = await dbService.migrateOldUsersToDocente();
        btnMigrate.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Migrar usuarios sin rol → Docente';
        btnMigrate.disabled = false;

        if (count > 0) {
            Swal.fire({toast:true, position:'bottom', icon:'success', title:`${count} usuarios migrados a Docente`, showConfirmButton:false, timer:3500});
            loadAll();
        } else {
            Swal.fire({toast:true, position:'bottom', icon:'info', title:'No hay usuarios sin rol que migrar', showConfirmButton:false, timer:3000});
        }
    });

    // ─── Invitar docente ───────────────────────────────────────────────────
    btnInviteDocente.addEventListener('click', async () => {
        const email  = document.getElementById('docenteEmail').value.trim();
        const nombre = document.getElementById('docenteNombre').value.trim();
        const centro = document.getElementById('docenteCentro').value.trim();
        if (!email) { Swal.fire('Falta el email', '', 'warning'); return; }

        const orig = btnInviteDocente.innerHTML;
        btnInviteDocente.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        btnInviteDocente.disabled = true;
        try {
            await dbService.inviteDocente(email, nombre, centro);
            Swal.fire({toast:true, position:'bottom', icon:'success', title:`Docente invitado: ${email}`, showConfirmButton:false, timer:3000});
            ['docenteEmail','docenteNombre','docenteCentro'].forEach(id => document.getElementById(id).value = '');
            loadAll();
        } catch(err) {
            Swal.fire('Error', err.message, 'error');
        } finally {
            btnInviteDocente.innerHTML = orig;
            btnInviteDocente.disabled = false;
        }
    });

    // ─── Cargar todo ──────────────────────────────────────────────────────
    async function loadAll() {
        docentesList.innerHTML = '<p style="color:#aaa;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</p>';
        statsBar.innerHTML     = '<div style="color:#aaa;"><i class="fa-solid fa-spinner fa-spin"></i> Calculando...</div>';

        const allUsers = await dbService.getAllUsers();
        const superadmins = allUsers.filter(u => u.role === 'superadmin');
        const docentes = allUsers.filter(u => u.role === 'docente');
        const alumnos  = allUsers.filter(u => u.role === 'alumno');
        const sinRol   = allUsers.filter(u => !u.role || u.role === '');

        // Stats globales
        statsBar.innerHTML = `
            <div class="stat-item"><div class="num">${superadmins.length}</div><div class="lbl">Superadmins</div></div>
            <div class="stat-item"><div class="num">${docentes.length}</div><div class="lbl">Docentes</div></div>
            <div class="stat-item"><div class="num">${alumnos.length}</div><div class="lbl">Alumnos</div></div>
            <div class="stat-item"><div class="num">${allUsers.length}</div><div class="lbl">Total</div></div>
        `;

        if (superadmins.length === 0 && docentes.length === 0 && sinRol.length === 0) {
            docentesList.innerHTML = '<p style="color:#aaa;">No hay docentes ni superadmins registrados.</p>';
            return;
        }

        // Mostrar superadmins + docentes + usuarios sin rol
        const toShow = [...superadmins, ...docentes, ...sinRol];
        docentesList.innerHTML = '';

        for (const d of toShow) {
            const item = await buildDocenteItem(d, alumnos);
            docentesList.appendChild(item);
        }
    }

    // ─── Construir fila de docente ────────────────────────────────────────
    async function buildDocenteItem(d, allAlumnos) {
        const hasLoggedIn = !!d.uid;
        const isDocente   = d.role === 'docente';
        const sinRol      = !d.role || d.role === '';

        // Programas del docente
        const progCount = await dbService.getProgramsCountByUid(d.uid || null);

        // Alumnos de su centro
        const misAlumnos = d.centro
            ? allAlumnos.filter(a => a.centro === d.centro)
            : [];

        // Programas totales de sus alumnos
        let alumnoProgTotal = 0;
        const alumnoProgCounts = {};
        for (const a of misAlumnos) {
            const c = await dbService.getProgramsCountByUid(a.uid || null);
            alumnoProgCounts[a.docId] = c;
            alumnoProgTotal += c;
        }

        const isSuperadmin = d.role === 'superadmin';
        const avatarColor = isSuperadmin ? '#b71c1c' : (isDocente ? '#f06292' : '#aaa');
        const avatarLetter = (d.displayName || d.email || '?')[0].toUpperCase();
        const roleLabel = isSuperadmin ? 'Superadmin' : (isDocente ? 'Docente' : 'Sin rol');
        const roleBg    = isSuperadmin ? '#b71c1c' : (isDocente ? '#f06292' : '#ff9800');

        const item = document.createElement('div');
        item.className = 'user-item';

        item.innerHTML = `
            <div class="user-header">
                <div class="user-avatar" style="background:${avatarColor};">${avatarLetter}</div>
                <div class="user-main">
                    <div class="name">${d.displayName || '(Sin nombre)'}</div>
                    <div class="email">${d.email} ${d.centro ? '· <b>' + d.centro + '</b>' : '<span style="color:#ff9800;">· Sin centro</span>'}</div>
                </div>
                <div class="user-stats">
                    <span class="stat-pill" title="Programas del docente"><i class="fa-solid fa-file-audio" style="color:#f06292;"></i> ${progCount}</span>
                    <span class="stat-pill" title="Alumnos en su centro"><i class="fa-solid fa-users" style="color:#00acc1;"></i> ${misAlumnos.length}</span>
                    ${misAlumnos.length > 0 ? `<span class="stat-pill" title="Programas de alumnos"><i class="fa-solid fa-graduation-cap" style="color:#00acc1;"></i> ${alumnoProgTotal}</span>` : ''}
                    ${!hasLoggedIn ? '<span class="pending-badge" title="Aún no ha iniciado sesión">Pendiente</span>' : ''}
                </div>
                <span class="role-badge" style="background:${roleBg};">${roleLabel}</span>
                <div class="user-actions">
                    ${isDocente ? `<button class="btn-icon btn-promote" title="Hacer Superadmin" style="background:#e8f5e9; color:#2e7d32;" data-docid="${d.docId}" data-email="${d.email}"><i class="fa-solid fa-arrow-up-right-dots"></i></button>` : ''}
                    ${isSuperadmin ? `<button class="btn-icon btn-demote" title="Quitar Superadmin (Hacer Docente)" style="background:#fff3e0; color:#ef6c00;" data-docid="${d.docId}" data-email="${d.email}"><i class="fa-solid fa-arrow-down"></i></button>` : ''}
                    <button class="btn-icon" title="Eliminar" style="background:#fce4ec; color:#f06292;" data-delete="${d.docId}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
                <i class="fa-solid fa-chevron-down chevron"></i>
            </div>
            <div class="user-expand">
                <!-- Editor de centro -->
                <div class="centro-edit">
                    <i class="fa-solid fa-school" style="color:#00acc1;"></i>
                    <input type="text" class="centro-input" placeholder="Asignar centro educativo..." value="${d.centro || ''}" />
                    <button class="btn btn-secondary btn-save-centro" data-docid="${d.docId}" style="padding: 6px 14px; font-size:13px;">
                        <i class="fa-solid fa-floppy-disk"></i> Guardar centro
                    </button>
                </div>

                <!-- Lista de alumnos -->
                ${misAlumnos.length > 0 ? `
                    <div class="alumnos-title"><i class="fa-solid fa-users"></i> Alumnos en ${d.centro || 'este centro'} (${misAlumnos.length})</div>
                    ${misAlumnos.map(a => `
                        <div class="alumno-row">
                            <i class="fa-solid fa-user-graduate" style="color:#00acc1;"></i>
                            <span class="al-name">${a.displayName || a.email}</span>
                            <span class="al-class">${a.clase || ''}</span>
                            <span class="stat-pill"><i class="fa-solid fa-file-audio" style="color:#f06292;"></i> ${alumnoProgCounts[a.docId] || 0} prog.</span>
                            ${!a.uid ? '<span class="pending-badge">Pendiente</span>' : ''}
                            <button class="btn-icon" title="Eliminar alumno" style="background:#fce4ec; color:#f06292;" data-delete="${a.docId}">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    `).join('')}
                ` : `<p style="font-size:13px; color:#aaa; margin:0;">${d.centro ? 'No tiene alumnos en este centro.' : 'Asigna un centro para poder ver sus alumnos.'}</p>`}
            </div>
        `;

        // Toggle expand
        const header  = item.querySelector('.user-header');
        const expand  = item.querySelector('.user-expand');
        const chevron = item.querySelector('.chevron');
        header.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            expand.classList.toggle('open');
            chevron.classList.toggle('open');
        });

        // Guardar centro
        item.querySelector('.btn-save-centro').addEventListener('click', async (e) => {
            const docId  = e.currentTarget.dataset.docid;
            const newCentro = item.querySelector('.centro-input').value.trim();
            const btn = e.currentTarget;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            await dbService.updateUserField(docId, { centro: newCentro, role: 'docente' });
            Swal.fire({toast:true, position:'bottom', icon:'success', title:'Centro actualizado', showConfirmButton:false, timer:2500});
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar centro';
            loadAll();
        });

        // Promover a superadmin
        const promoteBtn = item.querySelector('.btn-promote');
        if (promoteBtn) {
            promoteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const docId = promoteBtn.dataset.docid;
                const email = promoteBtn.dataset.email;
                const r = await Swal.fire({
                    title: '¿Hacer Superadmin?',
                    html: `<b>${email}</b> tendrá acceso a este panel y control total.`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, promover',
                    confirmButtonColor: '#2e7d32'
                });
                if (r.isConfirmed) {
                    await dbService.updateUserField(docId, { role: 'superadmin' });
                    Swal.fire({toast:true, position:'bottom', icon:'success', title:'Ahora es superadmin', showConfirmButton:false, timer:3000});
                    loadAll();
                }
            });
        }

        // Quitar superadmin
        const demoteBtn = item.querySelector('.btn-demote');
        if (demoteBtn) {
            demoteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const docId = demoteBtn.dataset.docid;
                const email = demoteBtn.dataset.email;
                const r = await Swal.fire({
                    title: '¿Quitar rol de Superadmin?',
                    html: `<b>${email}</b> pasará a ser Docente experto.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, quitar',
                    confirmButtonColor: '#ef6c00'
                });
                if (r.isConfirmed) {
                    await dbService.updateUserField(docId, { role: 'docente' });
                    Swal.fire({toast:true, position:'bottom', icon:'success', title:'Ahora es docente', showConfirmButton:false, timer:3000});
                    loadAll();
                }
            });
        }

        // Eliminar usuario(s)
        item.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const docId = btn.dataset.delete;
                const result = await Swal.fire({
                    title: '¿Eliminar usuario?',
                    text: 'Solo se borra el acceso. Sus programas no se eliminan.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#f44336',
                    confirmButtonText: 'Sí, eliminar'
                });
                if (result.isConfirmed) {
                    await dbService.deleteUser(docId);
                    Swal.fire({toast:true, position:'bottom', icon:'success', title:'Usuario eliminado', showConfirmButton:false, timer:2500});
                    loadAll();
                }
            });
        });

        return item;
    }
});
