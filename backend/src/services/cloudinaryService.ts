import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const isCloudinaryConfigured = (): boolean => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

/**
 * Uploads a Buffer (from multer memoryStorage) directly to Cloudinary
 * without ever touching disk. Works for both images and videos.
 */
export const uploadBufferToCloudinary = (
  buffer: Buffer,
  resourceType: 'image' | 'video',
  folder: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      reject(new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env'));
      return;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder,
        // Videos over ~100MB need chunked upload; this covers typical WhatsApp-sized media.
        chunk_size: resourceType === 'video' ? 6_000_000 : undefined,
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
};

export const deleteFromCloudinary = async (url: string): Promise<void> => {
  try {
    // Extract public_id from a Cloudinary secure_url
    const match = url.match(/\/upload\/(?:v\d+\/)?([^.]+)\.\w+$/);
    if (!match) return;
    const publicId = match[1];
    await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
  } catch (err) {
    console.error('Cloudinary delete failed (non-fatal):', err);
  }
};
