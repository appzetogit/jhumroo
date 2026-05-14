import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload video to Cloudinary
 * @param {string} filePath - Path to the video file
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<Object>} Upload result
 */
export const uploadVideo = async (filePath, folder = 'jhumroo/reels') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: folder,
      chunk_size: 6000000, // 6MB chunks for reliable upload
      eager: [
        { width: 450, height: 800, crop: 'fill', format: 'mp4', video_codec: 'h264' }
      ],
      eager_async: true,
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
      format: result.format,
      width: result.width,
      height: result.height,
      thumbnail: result.eager?.[0]?.secure_url || result.secure_url
    };
  } catch (error) {
    console.error('Cloudinary video upload error:', error);
    throw new Error('Failed to upload video');
  }
};

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Path to the image file
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<Object>} Upload result
 */
export const uploadImage = async (filePath, folder = 'jhumroo/images') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'image',
      folder: folder,
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Cloudinary image upload error:', error);
    throw new Error('Failed to upload image');
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Type of resource ('image' or 'video')
 * @returns {Promise<Object>} Delete result
 */
export const deleteFile = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete file');
  }
};

export default cloudinary;
