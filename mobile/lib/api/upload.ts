import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';
import type {
  ApiSuccessResponse,
  UploadAssetType,
  UploadAuthorization,
} from '@/types';

export interface UploadableImage {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}

const MIME_BY_FORMAT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/**
 * Request a signed upload authorization from GigLink for the current
 * authenticated user. The JWT identity (not any client-supplied id) decides
 * whether the requested asset type is permitted.
 */
export async function getUploadSignature(
  type: UploadAssetType,
): Promise<UploadAuthorization> {
  const response = await apiClient.post<
    ApiSuccessResponse<{ upload: UploadAuthorization }>
  >('/profile/upload/signature', { type });
  return response.data.data.upload;
}

/**
 * Client-side format/size checks before the bytes leave the device. Format and
 * size constraints are returned by the backend authorization. Returns a
 * user-friendly message, or null when the image is acceptable.
 */
export function validateImageForUpload(
  image: UploadableImage,
  authorization: UploadAuthorization,
): string | null {
  const mime = (image.mimeType ?? '').toLowerCase();
  const allowedMimes = authorization.allowedFormats
    .map((format) => MIME_BY_FORMAT[format])
    .filter(Boolean);

  if (mime && allowedMimes.length > 0 && !allowedMimes.includes(mime)) {
    return 'Unsupported image format. Please choose a JPEG, PNG, or WebP image.';
  }

  if (
    image.fileSize != null &&
    authorization.maxBytes > 0 &&
    image.fileSize > authorization.maxBytes
  ) {
    const mb = Math.round(authorization.maxBytes / (1024 * 1024));
    return `Image is too large. Maximum size is ${mb} MB.`;
  }

  return null;
}

/**
 * Upload the selected image directly to Cloudinary using the pre-signed
 * authorization. Returns the secure image URL on success. Throws a friendly
 * error on any failure — raw provider errors and secrets are never surfaced.
 */
export async function uploadImageToCloudinary(
  image: UploadableImage,
  authorization: UploadAuthorization,
): Promise<string> {
  const url = `https://api.cloudinary.com/v1_1/${authorization.cloudName}/image/upload`;

  const formData = new FormData();
  const fileField = {
    uri: image.uri,
    name: image.fileName || 'image.jpg',
    type: image.mimeType || 'image/jpeg',
  } as unknown as Blob;

  formData.append('file', fileField);
  formData.append('api_key', authorization.apiKey);
  formData.append('timestamp', String(authorization.timestamp));
  formData.append('signature', authorization.signature);
  formData.append('public_id', authorization.publicId);
  formData.append('overwrite', 'true');
  if (authorization.transformation) {
    formData.append('transformation', authorization.transformation);
  }

  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', body: formData });
  } catch {
    throw new Error('Network error while uploading. Please try again.');
  }

  if (!response.ok) {
    throw new Error('Upload failed. Please try again.');
  }

  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const secureUrl =
    typeof result?.secure_url === 'string' ? result.secure_url : undefined;
  const plainUrl = typeof result?.url === 'string' ? result.url : undefined;

  if (!secureUrl && !plainUrl) {
    throw new Error('Upload failed. Please try again.');
  }

  const finalUrl = secureUrl ?? plainUrl;
  if (!finalUrl) {
    throw new Error('Upload failed. Please try again.');
  }

  return finalUrl;
}

/**
 * Convenience wrapper: obtains a signature, validates, uploads, and returns the
 * final URL. Throws user-friendly errors for every failure mode.
 */
export async function uploadImage(
  type: UploadAssetType,
  image: UploadableImage,
): Promise<string> {
  let authorization: UploadAuthorization;
  try {
    authorization = await getUploadSignature(type);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to start the upload. Please try again.'));
  }

  const validationError = validateImageForUpload(image, authorization);
  if (validationError) {
    throw new Error(validationError);
  }

  try {
    return await uploadImageToCloudinary(image, authorization);
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : 'Upload failed. Please try again.';
    throw new Error(message);
  }
}
