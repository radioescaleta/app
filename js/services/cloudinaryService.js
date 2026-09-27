// js/services/cloudinaryService.js
const CLOUD_NAME = 'm30m9j1t';
const UPLOAD_PRESET = 'radioescaleta';

class CloudinaryService {
    async uploadAudio(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('resource_type', 'video'); // Cloudinary trata audio como 'video'
        formData.append('folder', 'radioescaleta');

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Error subiendo a Cloudinary');
        }

        const data = await response.json();

        return {
            id: data.public_id,
            name: file.name,
            url: data.secure_url
        };
    }
}

export const cloudinaryService = new CloudinaryService();
