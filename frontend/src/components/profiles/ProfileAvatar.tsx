import React from 'react';
import { Building2, User } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ProfileAvatarProps {
  url?: string;
  imageUrl?: string;
  name?: string;
  size?: number | 'sm' | 'md' | 'lg';
  isCompany?: boolean;
  className?: string;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  url,
  imageUrl,
  name,
  size = 56,
  isCompany = false,
  className,
}) => {
  const effectiveUrl = imageUrl || url;
  const numSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
      ? 36
      : size === 'md'
      ? 48
      : 72;

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  return (
    <div
      style={{ width: numSize, height: numSize }}
      className={cn(
        'rounded-2xl overflow-hidden bg-[#EDEBFC] text-[#6C5CE7] border border-[#E9EAF0] flex items-center justify-center shrink-0 shadow-xs select-none',
        className,
      )}
    >
      {effectiveUrl ? (
        <img src={effectiveUrl} alt={name || 'Avatar'} className="w-full h-full object-cover" />
      ) : initials ? (
        <span
          className="font-extrabold tracking-tight"
          style={{ fontSize: Math.max(12, numSize * 0.38) }}
        >
          {initials}
        </span>
      ) : isCompany ? (
        <Building2 style={{ width: numSize * 0.5, height: numSize * 0.5 }} />
      ) : (
        <User style={{ width: numSize * 0.5, height: numSize * 0.5 }} />
      )}
    </div>
  );
};
