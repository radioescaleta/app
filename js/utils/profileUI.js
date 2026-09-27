import { dbService } from '../services/dbService.js?v=4';
import { authService } from '../services/authService.js?v=2';

export function formatName(fullName) {
    if (!fullName) return 'Usuario';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const firstName = parts[0];
    const initials = parts.slice(1).map(p => p[0].toUpperCase()).join('');
    return `${firstName} ${initials}`;
}

export function setupUserProfile(user, profile) {
    const dropdown = document.getElementById('userProfileDropdown');
    const nameLabel = document.getElementById('userNameLabel');
    const avatarImg = document.getElementById('userAvatar');
    const btnLogout = document.getElementById('btnLogout');
    const btnEditProfile = document.getElementById('btnEditProfile');
    
    if (!dropdown) return;
    
    const newDropdown = dropdown.cloneNode(true);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);
    
    const d = document.getElementById('userProfileDropdown');
    d.addEventListener('click', (e) => {
        if (e.target.closest('.profile-menu-item')) return;
        d.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
        if (!d.contains(e.target)) d.classList.remove('open');
    });

    const displayName = profile.displayName || user.displayName || user.email.split('@')[0];
    document.getElementById('userNameLabel').textContent = formatName(displayName);
    
    const avatarUrl = profile.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.uid}`;
    document.getElementById('userAvatar').src = avatarUrl;

    document.getElementById('btnEditProfile').addEventListener('click', () => {
        d.classList.remove('open');
        openAvatarEditor(user, profile, avatarUrl);
    });

    document.getElementById('btnLogout').addEventListener('click', async () => {
        await authService.logout();
        sessionStorage.removeItem('userProfile');
        window.location.href = 'index.html';
    });
}

function openAvatarEditor(user, profile, currentUrl) {
    let currentStyle = 'avataaars';
    let currentSeed = user.uid;
    let currentSkin = '';
    let currentHair = '';
    let currentTop = '';
    let currentAccessories = '';
    
    try {
        const u = new URL(currentUrl);
        const pathParts = u.pathname.split('/');
        if (pathParts.length >= 3) {
            currentStyle = pathParts[2];
        }
        currentSeed = u.searchParams.get('seed') || user.uid;
        currentSkin = u.searchParams.get('skinColor') || '';
        currentHair = u.searchParams.get('hairColor') || '';
        
        // Reverse map the 'top' param if possible, else default to empty
        const topParam = u.searchParams.get('top') || '';
        if (topParam.includes('shortHair')) currentTop = 'corto';
        else if (topParam.includes('longHair')) currentTop = 'largo';
        else if (topParam.includes('hat')) currentTop = 'hat';
        else if (topParam.includes('hijab')) currentTop = 'hijab';
        else if (topParam.includes('turban')) currentTop = 'turban';
        
        currentAccessories = u.searchParams.get('accessories') || '';
    } catch(e){}

    const generateUrl = (style, seed, skin, hair, top, acc) => {
        let url = `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&backgroundColor=transparent`;
        
        if (style === 'avataaars') {
            if (skin) url += `&skinColor=${skin}`;
            if (hair) url += `&hairColor=${hair}`;
            
            const topMap = {
                'corto': ['shortHairDreads01','shortHairDreads02','shortHairFrizzle','shortHairShaggy','shortHairShortCurly','shortHairShortFlat','shortHairShortRound','shortHairShortWaved','shortHairSides','shortHairTheCaesar'],
                'largo': ['longHairBigHair','longHairBob','longHairBun','longHairCurly','longHairCurvy','longHairDreads','longHairFro','longHairNotTooLong','longHairStraight'],
                'hijab': ['hijab'],
                'turban': ['turban'],
                'hat': ['hat','winterHat1','winterHat2','winterHat3','winterHat4']
            };
            if (top && topMap[top]) {
                // En DiceBear v9, para mandar múltiples opciones a elegir, se repite el parámetro
                url += topMap[top].map(t => `&top=${t}`).join('');
            }
            if (acc) {
                // Es necesario forzar la probabilidad al 100% para que siempre salgan las gafas
                url += `&accessories=${acc}&accessoriesProbability=100`;
            } else {
                url += `&accessoriesProbability=0`; // Si no elige gafas, mejor quitarlas para evitar random
            }
        }
        return url;
    };

    let seeds = [currentSeed];
    for (let i = 1; i < 6; i++) {
        seeds.push(Math.random().toString(36).substring(7));
    }
    let selectedIndex = 0;

    Swal.fire({
        title: 'Elige tu Avatar',
        html: `
            <style>
                .avatar-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px; }
                .avatar-option { 
                    background: #e3f2fd; border-radius: 12px; cursor: pointer; 
                    border: 3px solid transparent; transition: all 0.2s; 
                    display: flex; justify-content: center; align-items: center; padding: 10px;
                }
                .avatar-option img { width: 100%; max-width: 70px; height: 70px; object-fit: contain !important; }
                .avatar-option.selected { border-color: #f06292; background: #fce4ec; transform: scale(1.05); }
            </style>
            
            <div class="avatar-grid" id="avatarGrid">
                ${seeds.map((s, i) => `
                    <div class="avatar-option ${i === selectedIndex ? 'selected' : ''}" data-idx="${i}">
                        <img src="" id="prev-${i}">
                    </div>
                `).join('')}
            </div>
            
            <button id="btnRandomizeGrid" class="btn btn-secondary" style="width:100%; margin-bottom:20px; font-size:14px; padding:8px;">
                <i class="fa-solid fa-dice"></i> Mostrar 6 opciones nuevas
            </button>
            
            <div style="margin-bottom:15px;">
                <label style="font-size:12px; margin-right:10px;">Estilo:</label>
                <select id="avStyle" class="swal2-select" style="display:inline-block; font-size:14px; padding:4px; margin:0; width:150px;">
                    <option value="avataaars" ${currentStyle==='avataaars'?'selected':''}>Personas</option>
                    <option value="fun-emoji" ${currentStyle==='fun-emoji'?'selected':''}>Emojis</option>
                    <option value="bottts" ${currentStyle==='bottts'?'selected':''}>Robots</option>
                    <option value="adventurer" ${currentStyle==='adventurer'?'selected':''}>Aventureros</option>
                    <option value="pixel-art" ${currentStyle==='pixel-art'?'selected':''}>Pixel Art</option>
                </select>
            </div>
            
            <div id="avataaarsOptions" style="display: ${currentStyle==='avataaars' ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr; gap:10px; padding-top: 15px; border-top: 1px solid #eee;">
                <div style="display:flex; flex-direction:column; text-align:left;">
                    <label style="font-size:12px; margin-bottom:2px; color:#555;">Tono de Piel</label>
                    <select id="avSkin" style="padding:6px; border-radius:6px; border:1px solid #ccc; font-size:13px;">
                        <option value="">(Cualquiera)</option>
                        <option value="ffdbb4" ${currentSkin==='ffdbb4'?'selected':''}>Claro 1</option>
                        <option value="edb98a" ${currentSkin==='edb98a'?'selected':''}>Claro 2</option>
                        <option value="d08b5b" ${currentSkin==='d08b5b'?'selected':''}>Medio 1</option>
                        <option value="ae5d29" ${currentSkin==='ae5d29'?'selected':''}>Medio 2</option>
                        <option value="614335" ${currentSkin==='614335'?'selected':''}>Oscuro</option>
                    </select>
                </div>

                <div style="display:flex; flex-direction:column; text-align:left;">
                    <label style="font-size:12px; margin-bottom:2px; color:#555;">Color de Pelo</label>
                    <select id="avHair" style="padding:6px; border-radius:6px; border:1px solid #ccc; font-size:13px;">
                        <option value="">(Cualquiera)</option>
                        <option value="2c1b18" ${currentHair==='2c1b18'?'selected':''}>Negro</option>
                        <option value="4a3123" ${currentHair==='4a3123'?'selected':''}>Castaño Oscuro</option>
                        <option value="a55728" ${currentHair==='a55728'?'selected':''}>Castaño Claro</option>
                        <option value="d6b370" ${currentHair==='d6b370'?'selected':''}>Rubio</option>
                        <option value="c93305" ${currentHair==='c93305'?'selected':''}>Pelirrojo</option>
                        <option value="e8e1e1" ${currentHair==='e8e1e1'?'selected':''}>Platino / Blanco</option>
                    </select>
                </div>

                <div style="display:flex; flex-direction:column; text-align:left;">
                    <label style="font-size:12px; margin-bottom:2px; color:#555;">Peinado / Cabeza</label>
                    <select id="avTop" style="padding:6px; border-radius:6px; border:1px solid #ccc; font-size:13px;">
                        <option value="">(Cualquiera)</option>
                        <option value="corto" ${currentTop==='corto'?'selected':''}>Corto</option>
                        <option value="largo" ${currentTop==='largo'?'selected':''}>Largo</option>
                        <option value="hijab" ${currentTop==='hijab'?'selected':''}>Hijab</option>
                        <option value="turban" ${currentTop==='turban'?'selected':''}>Turbante</option>
                        <option value="hat" ${currentTop==='hat'?'selected':''}>Sombrero / Gorro</option>
                    </select>
                </div>

                <div style="display:flex; flex-direction:column; text-align:left;">
                    <label style="font-size:12px; margin-bottom:2px; color:#555;">Gafas</label>
                    <select id="avAcc" style="padding:6px; border-radius:6px; border:1px solid #ccc; font-size:13px;">
                        <option value="">(Sin Gafas)</option>
                        <option value="round" ${currentAccessories==='round'?'selected':''}>Gafas Redondas</option>
                        <option value="prescription01" ${currentAccessories==='prescription01'?'selected':''}>Gafas Cuadradas</option>
                        <option value="prescription02" ${currentAccessories==='prescription02'?'selected':''}>Gafas Elegantes</option>
                        <option value="sunglasses" ${currentAccessories==='sunglasses'?'selected':''}>Gafas de Sol</option>
                    </select>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fa-solid fa-check"></i> Guardar',
        cancelButtonText: 'Cancelar',
        width: '500px',
        didOpen: () => {
            const styleSel = document.getElementById('avStyle');
            const optsDiv = document.getElementById('avataaarsOptions');
            const skinSel = document.getElementById('avSkin');
            const hairSel = document.getElementById('avHair');
            const topSel = document.getElementById('avTop');
            const accSel = document.getElementById('avAcc');
            const btnRand = document.getElementById('btnRandomizeGrid');
            const options = document.querySelectorAll('.avatar-option');

            const updateGrid = () => {
                seeds.forEach((seed, i) => {
                    document.getElementById(`prev-${i}`).src = generateUrl(
                        styleSel.value, seed, skinSel.value, hairSel.value, topSel.value, accSel.value
                    );
                });
                optsDiv.style.display = styleSel.value === 'avataaars' ? 'grid' : 'none';
            };

            // Selection Logic
            options.forEach(opt => {
                opt.addEventListener('click', () => {
                    options.forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    selectedIndex = parseInt(opt.dataset.idx);
                });
            });

            // On change any param, regenerate grid to apply params
            const selectors = [styleSel, skinSel, hairSel, topSel, accSel];
            selectors.forEach(sel => sel.addEventListener('change', updateGrid));

            // Generate new seeds
            btnRand.addEventListener('click', () => {
                seeds = seeds.map(() => Math.random().toString(36).substring(7));
                updateGrid();
            });

            // Initial load
            updateGrid();
        },
        preConfirm: () => {
            return generateUrl(
                document.getElementById('avStyle').value,
                seeds[selectedIndex],
                document.getElementById('avSkin').value,
                document.getElementById('avHair').value,
                document.getElementById('avTop').value,
                document.getElementById('avAcc').value
            );
        }
    }).then(async (result) => {
        if (result.isConfirmed && profile.docId) {
            const finalUrl = result.value;
            Swal.fire({title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
            
            await dbService.updateUserField(profile.docId, { avatarUrl: finalUrl });
            
            document.getElementById('userAvatar').src = finalUrl;
            profile.avatarUrl = finalUrl;
            sessionStorage.setItem('userProfile', JSON.stringify(profile));
            Swal.close();
        }
    });
}
