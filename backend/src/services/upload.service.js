import { getCloudinary } from "../config/cloudinary.js";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp"];

/**
 * Supported asset types and their constraints.
 *
 * Each asset type is bound to exactly one account role so a worker can never
 * authorize an employer asset and vice versa. Storage is organized per user so
 * each user's assets are logically isolated:
 *  - worker_profile -> giglink/users/{userId}/profile/avatar
 *  - employer_logo  -> giglink/users/{userId}/company-logo/logo
 *
 * A deterministic public_id (below) means a re-upload to the same asset key
 * overwrites the previous image in place, which cleanly implements replacement
 * without orphaned assets.
 */
export const ASSET_TYPES = {
  worker_profile: {
    allowedRole: "worker",
    publicIdSuffix: "profile/avatar",
    folder: "profile",
    field: "profileImage",
    // square, auto-gravity (face-aware fallback to center), 400x400
    transformation: "c_fill,g_auto,w_400,h_400",
    label: "profile photo",
    aspectRatio: "1:1",
  },
  employer_logo: {
    allowedRole: "employer",
    publicIdSuffix: "company-logo/logo",
    folder: "company-logo",
    field: "logo",
    // fit within a 400x400 box; preserves aspect ratio and PNG transparency
    transformation: "c_fit,w_400,h_400",
    label: "logo",
    aspectRatio: "1:1",
  },
};

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Validate the asset type against the authenticated role and derive the
 * deterministic upload parameters. Ownership is always derived from the
 * authenticated JWT `userId`; the client cannot influence it.
 *
 * Throws 400 for an unknown asset type and 403 when the role does not match
 * the asset type.
 */
const buildUploadAuthorization = ({ type, userId, role }) => {
  const asset = ASSET_TYPES[type];
  if (!asset) {
    throw createError("Unsupported asset type", 400);
  }
  if (role !== asset.allowedRole) {
    throw createError("Asset type not permitted for this account", 403);
  }

  const publicId = `giglink/users/${userId}/${asset.publicIdSuffix}`;

  return {
    assetType: type,
    publicId,
    folder: asset.folder,
    field: asset.field,
    transformation: asset.transformation,
    label: asset.label,
    aspectRatio: asset.aspectRatio,
  };
};

/**
 * Produce a secure Cloudinary signed-upload authorization for the given asset.
 *
 * The `CLOUDINARY_API_SECRET` is used server-side only to compute `signature`;
 * it is never included in the returned payload. The client uploads directly
 * to Cloudinary using the returned params + its own file bytes.
 *
 * Throws 503 when Cloudinary is not configured.
 */
const getUploadSignature = ({ type, userId, role }) => {
  const cloudinary = getCloudinary();
  if (!cloudinary) {
    throw createError("Upload service is not configured", 503);
  }

  const {
    assetType,
    publicId,
    folder,
    field,
    transformation,
    label,
    aspectRatio,
  } = buildUploadAuthorization({ type, userId, role });

  const timestamp = Math.round(Date.now() / 1000);

  // NOTE: `resource_type` is intentionally NOT included in the signed
  // parameters. Cloudinary's `/image/upload` signed-upload validation derives
  // the resource_type from the URL path and EXCLUDES it from the string that
  // is signed — it does not recompute the signature over `resource_type`.
  // Including it here would produce a signature that never matches what
  // Cloudinary validates, causing every upload to be rejected with
  // HTTP 401 "Invalid Signature". The signature must be computed over exactly
  // the parameters Cloudinary uses.
  const paramsToSign = {
    timestamp,
    public_id: publicId,
    overwrite: "true",
  };
  if (transformation) {
    paramsToSign.transformation = transformation;
  }

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET,
  );

  return {
    assetType,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    publicId,
    folder,
    field,
    transformation,
    label,
    aspectRatio,
    resourceType: "image",
    allowedFormats: ALLOWED_FORMATS,
    maxBytes: MAX_UPLOAD_BYTES,
  };
};

export { buildUploadAuthorization, getUploadSignature };
