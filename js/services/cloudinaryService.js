// js/services/cloudinaryService.js
const CLOUD_NAME = 'm30m9j1t';
const UPLOAD_PRESET = 'radioescaleta';

class CloudinaryService {
    uploadAudio(file, onProgress = null) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', UPLOAD_PRESET);
            formData.append('resource_type', 'video'); // Cloudinary trata audio como 'video'
            formData.append('folder', 'radioescaleta');

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);

            if (xhr.upload && typeof onProgress === 'function') {
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        onProgress(percent);
                    }
                };
            }

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        // En redes corporativas educativas (ej. Andared en la Junta de Andalucía),
                        // res.cloudinary.com suele estar bloqueado o provocar avisos SSL,
                        // mientras que res-1.cloudinary.com resuelve sin bloqueos.
                        let secureUrl = data.secure_url || '';
                        if (secureUrl.includes('res.cloudinary.com')) {
                            secureUrl = secureUrl.replace('res.cloudinary.com', 'res-1.cloudinary.com');
                        }

                        resolve({
                            id: data.public_id,
                            name: file.name,
                            url: secureUrl
                        });
                    } catch (e) {
                        reject(new Error('Respuesta inválida del servidor'));
                    }
                } else {
                    try {
                        const err = JSON.parse(xhr.responseText);
                        reject(new Error(err.error?.message || 'Error subiendo a Cloudinary'));
                    } catch (_) {
                        reject(new Error(`Error en la subida (${xhr.status})`));
                    }
                }
            };

            xhr.onerror = () => {
                reject(new Error('Error de conexión al subir el archivo a Cloudinary'));
            };

            xhr.send(formData);
        });
    }
}

export const cloudinaryService = new CloudinaryService();
