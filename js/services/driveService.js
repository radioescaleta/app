// js/services/driveService.js
/**
 * Servicio para manejar la API de Google Drive.
 * Requiere Google Identity Services script en el HTML (<script src="https://accounts.google.com/gsi/client" async defer></script>)
 * o puede simplemente manejar una simulación si no está configurado.
 */

// TODO: Reemplaza con tu Client ID de Google Cloud
const CLIENT_ID = '1085067856726-8bbtkn0lon7scft3hgf3k0o6h8p7gv1d.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

class DriveService {
    constructor() {
        this.tokenClient = null;
        this.accessToken = null;
    }

    init() {
        if (typeof google === 'undefined') {
            console.warn("Google API no está cargada. Subida a Drive simulada.");
            return;
        }

        if (CLIENT_ID !== 'TU_CLIENT_ID_DE_GOOGLE.apps.googleusercontent.com') {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (tokenResponse) => {
                    this.accessToken = tokenResponse.access_token;
                }
            });
        }
    }

    async executeUpload(file) {
        const metadata = {
            name: file.name,
            mimeType: file.type || 'audio/mpeg'
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + this.accessToken
            },
            body: form
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error.message || "Error desconocido subiendo a Drive");
        }

        const data = await response.json();
        
        // Hacer el archivo público para que se pueda escuchar en la app
        await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + this.accessToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                role: 'reader',
                type: 'anyone'
            })
        });

        return {
            id: data.id,
            name: data.name,
            url: 'https://drive.google.com/uc?export=download&id=' + data.id
        };
    }

    async uploadAudio(file) {
        if (!this.tokenClient) {
            console.log("Simulando subida a Drive del archivo:", file.name);
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        id: 'fake_drive_id_' + Date.now(),
                        name: file.name,
                        url: URL.createObjectURL(file) 
                    });
                }, 1000);
            });
        }

        return new Promise((resolve, reject) => {
            if (!this.accessToken) {
                this.tokenClient.callback = (resp) => {
                    if (resp.error !== undefined) {
                        reject(resp.error);
                    }
                    this.accessToken = resp.access_token;
                    this.executeUpload(file).then(resolve).catch(reject);
                };
                this.tokenClient.requestAccessToken({prompt: 'consent'});
            } else {
                this.executeUpload(file).then(resolve).catch(reject);
            }
        });
    }
}

export const driveService = new DriveService();
