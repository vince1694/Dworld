/**
 * Cloudinary Storage Integration for D.WORLD
 * 
 * Secure cloud storage for user profile pictures and lookbook portfolios.
 * Falls back safely if environment credentials are not yet configured.
 */

const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const isCloudinaryConfigured = () => {
    return Boolean(
        process.env.CLOUDINARY_CLOUD_NAME && 
        process.env.CLOUDINARY_API_KEY && 
        process.env.CLOUDINARY_API_SECRET &&
        process.env.CLOUDINARY_CLOUD_NAME.trim() !== '' &&
        process.env.CLOUDINARY_API_KEY.trim() !== ''
    );
};

if (isCloudinaryConfigured()) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
        api_key: process.env.CLOUDINARY_API_KEY.trim(),
        api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
        secure: true
    });
    console.log('[CLOUDINARY] Initialized successfully with cloud:', process.env.CLOUDINARY_CLOUD_NAME);
} else {
    console.log('[CLOUDINARY] Cloudinary credentials not detected in .env. Falling back to local data storage mode.');
}

/**
 * Upload an image to Cloudinary (or fallback if unconfigured)
 * @param {string} fileBase64OrUrl - Base64 data URI or image URL
 * @param {string} folder - Folder name in Cloudinary (e.g., 'dworld_avatars')
 * @returns {Promise<string>} - The hosted image URL
 */
const uploadImage = async (fileBase64OrUrl, folder = 'dworld_avatars') => {
    if (!fileBase64OrUrl) return '';

    // If Cloudinary is not configured yet, return base64/URL directly so UI always works
    if (!isCloudinaryConfigured()) {
        return fileBase64OrUrl;
    }

    try {
        const result = await cloudinary.uploader.upload(fileBase64OrUrl, {
            folder,
            resource_type: 'image',
            transformation: [
                { width: 600, height: 600, crop: 'fill', gravity: 'face' },
                { quality: 'auto', fetch_format: 'auto' }
            ]
        });
        return result.secure_url;
    } catch (err) {
        console.error('[CLOUDINARY UPLOAD ERROR]:', err.message);
        // Fallback to storing string so user never encounters a hard crash
        return fileBase64OrUrl;
    }
};

module.exports = {
    cloudinary,
    isCloudinaryConfigured,
    uploadImage
};
