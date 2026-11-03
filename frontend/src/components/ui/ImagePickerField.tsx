import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2, Upload } from 'lucide-react';
import { uploadImage } from '@/lib/api/upload';
import type { UploadAssetType } from '@/types/upload';
import { cn } from '@/utils/cn';

export interface ImagePickerFieldProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  assetType?: UploadAssetType;
  className?: string;
}

export const ImagePickerField: React.FC<ImagePickerFieldProps> = ({
  label,
  value,
  onChange,
  assetType = 'photo',
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploading) return;

    setError(null);

    // Client-side quick validation before network request
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, or WebP).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image is too large. Maximum file size is 5 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);

    try {
      const url = await uploadImage(assetType, file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setError(null);
  };

  const isCompanyLogo = assetType === 'employer_logo';
  const noun = isCompanyLogo ? 'Company Logo' : 'Photo';

  return (
    <div className={cn('flex flex-col gap-2 text-left', className)}>
      {label && <span className="text-[13px] font-semibold text-[#5A5F6E] pl-0.5">{label}</span>}

      <div className="flex items-center gap-4">
        {/* Image / Avatar Container */}
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={cn(
            'relative w-20 h-20 rounded-2xl border-2 border-dashed border-[#D8DAE3] bg-[#F2F3F8] overflow-hidden flex items-center justify-center cursor-pointer transition-all hover:border-[#6C5CE7] hover:bg-[#EDEBFC]/30 group',
            uploading && 'cursor-wait pointer-events-none opacity-80',
          )}
        >
          {value ? (
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-7 h-7 text-[#9BA1AE] group-hover:text-[#6C5CE7] transition-colors" />
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-1.5 flex-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#6C5CE7] hover:text-[#5A4BD1] disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {value ? `Change ${noun}` : `Upload ${noun}`}
          </button>

          {value && (
            <button
              type="button"
              disabled={uploading}
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#E5484D] hover:text-[#D43F44] disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove {noun}
            </button>
          )}

          <span className="text-[11px] text-[#9BA1AE]">Max 5 MB (JPEG, PNG, WebP)</span>
        </div>
      </div>

      {error && <span className="text-[12px] text-[#E5484D] font-medium pl-0.5">{error}</span>}
    </div>
  );
};
