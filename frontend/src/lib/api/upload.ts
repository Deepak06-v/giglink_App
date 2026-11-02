import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';
import type {
  ApiSuccessResponse,
  UploadAssetType,
  UploadAuthorization,
} from '@/types';

export async function getUploadSignature(
  type: UploadAssetType,
): Promise<UploadAuthorization> {
  const response = await apiClient.post<
    ApiSuccessResponse<{ upload: UploadAuthorization }>
  >('/profile/upload/signature', { type });
  return response.data.data.upload;
}

export function validateImageForUpload(
  file: File,
  authorization: UploadAuthorization,
): string | null {
  const allowedExtensions = authorization.allowedFormats.map((f) => f.toLowerCase());
  const fileName = file.name.toLowerCase();
  const hasValidExt = allowedExtensions.some((ext) => fileName.endsWith(`.${ext}`));

  if (!hasValidExt) {
    return 'Unsupported image format. Please choose a JPEG, PNG, or WebP image.';
  }

  if (authorization.maxBytes > 0 && file.size > authorization.maxBytes) {
    const mb = Math.round(authorization.maxBytes / (1024 * 1024));
    return `Image is too large. Maximum size is ${mb} MB.`;
  }

  return null;
}

export async function uploadImageToCloudinary(
  file: File,
  authorization: UploadAuthorization,
): Promise<string> {
  const url = `https://api.cloudinary.com/v1_1/${authorization.cloudName}/image/upload`;

  const formData = new FormData();
  formData.append('file', file);
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
    throw new Error('Network error while uploading. Please check your connection.');
  }

  if (!response.ok) {
    throw new Error('Upload failed. Please try again.');
  }

  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const secureUrl = typeof result?.secure_url === 'string' ? result.secure_url : undefined;
  const plainUrl = typeof result?.url === 'string' ? result.url : undefined;

  const finalUrl = secureUrl ?? plainUrl;
  if (!finalUrl) {
    throw new Error('Upload failed. Could not retrieve uploaded image URL.');
  }

  return finalUrl;
}

export async function uploadImage(
  type: UploadAssetType,
  file: File,
): Promise<string> {
  let authorization: UploadAuthorization;
  try {
    authorization = await getUploadSignature(type);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to initialize upload. Please try again.'));
  }

  const validationError = validateImageForUpload(file, authorization);
  if (validationError) {
    throw new Error(validationError);
  }

  try {
    return await uploadImageToCloudinary(file, authorization);
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Upload failed. Please try again.';
    throw new Error(message);
  }
}
