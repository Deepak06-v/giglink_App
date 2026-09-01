export type UploadAssetType = 'worker_profile' | 'employer_logo';

export interface UploadAuthorization {
  assetType: UploadAssetType;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  folder: string;
  field: string;
  transformation: string;
  label: string;
  aspectRatio: string;
  resourceType: 'image';
  allowedFormats: string[];
  maxBytes: number;
}
