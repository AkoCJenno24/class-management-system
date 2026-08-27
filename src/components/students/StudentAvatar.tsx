import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AVATAR_PRESETS, type StudentStatus } from '@/types';
import { getInitials, cn } from '@/lib/utils';

interface StudentAvatarProps {
  student?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    avatarPreset?: string | null;
    avatarColor?: string | null;
    status?: StudentStatus;
  } | null;
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
  firstName = student?.firstName || '',
  lastName = student?.lastName || '',
  avatarUrl = student?.avatarUrl,
  avatarPreset = student?.avatarPreset,
  avatarColor = student?.avatarColor || '#6366F1',
  status = student?.status || 'active',
  size = 'default',
  className,
  showStatusIndicator = false,
}: StudentAvatarProps) {
  const presetObj = avatarPreset ? AVATAR_PRESETS.find((p) => p.id === avatarPreset) : null;
  const imageSrc = avatarUrl || presetObj?.src;

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
      <Avatar className={cn(sizeClasses[size], 'overflow-hidden rounded-full shadow-2xs', className)}>
        {imageSrc ? (
          <AvatarImage
            src={imageSrc}
            alt={`${firstName} ${lastName}`}
            className="h-full w-full object-cover rounded-full"
          />
        ) : null}
        <AvatarFallback
          className="rounded-full text-white font-bold"
          style={{ backgroundColor: avatarColor || '#6366F1' }}
        >
          {getInitials(firstName, lastName)}
        </AvatarFallback>
      </Avatar>

      {showStatusIndicator && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-background shadow-xs',
            statusDotSizes[size],
            getStatusColor()
          )}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
}
