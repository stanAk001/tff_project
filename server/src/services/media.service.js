import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { cloudinaryEnabled, env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
const VIDEO_TYPES = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 120 * 1024 * 1024;

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

const uploadToCloudinary = (file, kind) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: env.cloudinary.folder, resource_type: kind === 'VIDEO' ? 'video' : 'image' },
      (error, result) => {
        if (error) return reject(new ApiError(502, 'The media service rejected this upload. Please try again.'));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width || null,
          height: result.height || null,
          // Cloudinary can generate a still frame for any video by swapping the extension
          posterUrl: kind === 'VIDEO' ? result.secure_url.replace(/\.[a-z0-9]+$/i, '.jpg') : null,
        });
      },
    );
    stream.end(file.buffer);
  });

const uploadToDisk = async (file, extension) => {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomUUID()}.${extension}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), file.buffer);
  return { url: `${env.serverUrl}/uploads/${name}`, publicId: `local:${name}`, width: null, height: null, posterUrl: null };
};

export const uploadMedia = async (file) => {
  if (!file) throw ApiError.badRequest('Choose a file to upload.');

  const imageExt = IMAGE_TYPES[file.mimetype];
  const videoExt = VIDEO_TYPES[file.mimetype];
  if (!imageExt && !videoExt) {
    throw ApiError.badRequest('Use a JPG, PNG, WebP or AVIF image, or an MP4, WebM or MOV video.');
  }
  const kind = imageExt ? 'IMAGE' : 'VIDEO';
  if (kind === 'IMAGE' && file.size > MAX_IMAGE_BYTES) {
    throw ApiError.badRequest('Images must be smaller than 12 MB.');
  }

  const stored = cloudinaryEnabled
    ? await uploadToCloudinary(file, kind)
    : await uploadToDisk(file, imageExt || videoExt);

  return { ...stored, type: kind };
};

export const deleteMedia = async (publicId, type = 'IMAGE') => {
  if (!publicId) return;
  if (publicId.startsWith('local:')) {
    // basename() prevents path traversal out of the uploads folder
    const name = path.basename(publicId.slice('local:'.length));
    await fs.rm(path.join(UPLOAD_DIR, name), { force: true });
    return;
  }
  if (cloudinaryEnabled) {
    await cloudinary.uploader.destroy(publicId, { resource_type: type === 'VIDEO' ? 'video' : 'image' });
  }
};
