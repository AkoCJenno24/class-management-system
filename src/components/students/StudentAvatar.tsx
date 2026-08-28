import { useState, useEffect } from 'react';
import type { StudentStatus } from '@/types';
import { resolveAvatarSource, cn } from '@/lib/utils';

interface StudentAvatarProps {
  student?: {
    id?: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    avatarPreset?: string | null;
    avatarColor?: string | null;
    status?: StudentStatus;
  } | null;
  id?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  avatarPreset?: string | null;
  avatarColor?: string | null;
  status?: StudentStatus;
  size?: 'sm' | 'default' | 'md' | 'lg' | 'xl';
  className?: string;
  showStatusIndicator?: boolean;
}

const sizeClasses = {
  sm: 'h-7 w-7 text-[10px]',
  default: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base font-semibold',
  xl: 'h-20 w-20 text-xl font-bold',
};

const statusDotSizes = {
  sm: 'h-2 w-2 ring-1',
  default: 'h-2.5 w-2.5 ring-1.5',
  md: 'h-3 w-3 ring-2',
  lg: 'h-3.5 w-3.5 ring-2',
  xl: 'h-4 w-4 ring-2',
};

export function StudentAvatar({
  student,
  id = student?.id,
  firstName = student?.firstName || '',
  lastName = student?.lastName || '',
  avatarUrl = student?.avatarUrl,
  avatarPreset = student?.avatarPreset,
  avatarColor = student?.avatarColor,
  status = student?.status || 'active',
  size = 'default',
  className,
  showStatusIndicator = false,
}: StudentAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const effectiveAvatarUrl = avatarUrl ?? student?.avatarUrl;
  const effectiveAvatarPreset = avatarPreset ?? student?.avatarPreset;
  const effectiveAvatarColor = avatarColor ?? student?.avatarColor;

  // Reset image error state whenever avatar URL or preset prop changes
  useEffect(() => {
    setImageError(false);
  }, [effectiveAvatarUrl, effectiveAvatarPreset]);

  const resolved = resolveAvatarSource({
    avatarUrl: effectiveAvatarUrl,
    avatarPreset: effectiveAvatarPreset,
    avatarColor: effectiveAvatarColor,
    firstName,
    lastName,
    id,
  });

  const showImage = !imageError && (resolved.mode === 'photo' || resolved.mode === 'preset');

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500';
      case 'inactive':
        return 'bg-muted-foreground';
      case 'graduated':
        return 'bg-blue-500';
      case 'transferred':
        return 'bg-purple-500';
      case 'dropped':
        return 'bg-amber-500';
      case 'suspended':
        return 'bg-rose-500';
      default:
        return 'bg-emerald-500';
    }
  };

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={cn(
          sizeClasses[size],
          'relative flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none shadow-2xs ring-1 ring-border/40',
          className
        )}
        style={{
          backgroundColor: showImage ? 'transparent' : resolved.bgColor,
        }}
      >
        {showImage && resolved.src ? (
          <img
            src={resolved.src}
            alt={`${firstName} ${lastName}`}
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover rounded-full select-none pointer-events-none"
          />
        ) : (
          <span className="font-bold text-white leading-none tracking-tight select-none">
            {resolved.initials}
          </span>
        )}
      </div>

      {showStatusIndicator && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-background shadow-xs pointer-events-none',
            statusDotSizes[size],
            getStatusColor()
          )}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
}
