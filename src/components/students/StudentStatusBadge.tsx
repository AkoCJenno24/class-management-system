import { Badge } from '@/components/ui/badge';
import type { StudentStatus } from '@/types';
import { STUDENT_STATUS_OPTIONS } from '@/types';
import { cn } from '@/lib/utils';

interface StudentStatusBadgeProps {
  status?: StudentStatus | null;
  className?: string;
  showDot?: boolean;
}

export function StudentStatusBadge({
  status = 'active',
  className,
  showDot = true,
}: StudentStatusBadgeProps) {
  const currentStatus = status || 'active';
  const option =
    STUDENT_STATUS_OPTIONS.find((opt) => opt.value === currentStatus) ||
    STUDENT_STATUS_OPTIONS[0];

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium text-xs border inline-flex items-center gap-1.5 px-2 py-0.5 shadow-2xs',
        option.badgeClass,
        className
      )}
    >
      {showDot && (
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: option.dotColor }}
          aria-hidden="true"
        />
      )}
      <span>{option.label}</span>
    </Badge>
  );
}
