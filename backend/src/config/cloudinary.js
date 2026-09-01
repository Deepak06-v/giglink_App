import cloudinary from "cloudinary";

/**
 * Return a configured Cloudinary v2 API instance, or null when not configured.
 *
 * Configuration is read from environment variables on every call:
 *  - CLOUDINARY_CLOUD_NAME
 *  - CLOUDINARY_API_KEY
 *  - CLOUDINARY_API_SECRET
 *
 * Re-reading env each call keeps the module correct under environment changes
 * (e.g. tests) at negligible cost for this low-frequency signature endpoint.
 * The API secret stays server-side and is never exposed to clients (mobile
 * only receives a pre-signed upload authorization).
 */
const getCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  cloudinary.v2.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return cloudinary.v2;
};

const isCloudinaryConfigured = () => getCloudinary() !== null;

export { getCloudinary, isCloudinaryConfigured };
