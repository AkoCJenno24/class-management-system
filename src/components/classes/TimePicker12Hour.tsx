import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface TimePicker12HourProps {
  id?: string;
  value?: string; // Expects "HH:mm" (e.g. "14:30") or "h:mm A" (e.g. "2:30 PM") or ""
  onChange: (time24: string) => void;
  disabled?: boolean;
  className?: string;
}

const HOURS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const BASE_MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

/**
 * Parses any time string into 12-hour components: hour (1-12), minute (00-59), and period (AM/PM).
 */
export function parse12HourTime(timeStr?: string | null): {
  hour: string;
  minute: string;
  period: 'AM' | 'PM';
  hasValue: boolean;
} {
  if (!timeStr || !timeStr.trim()) {
    return { hour: '', minute: '', period: 'AM', hasValue: false };
  }

  const trimmed = timeStr.trim();

  // Check if format is "9:30 AM" or "09:30 PM"
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    const rawH = parseInt(ampmMatch[1], 10);
    const minute = ampmMatch[2];
    const period = ampmMatch[3].toUpperCase() as 'AM' | 'PM';
    const hour = rawH >= 1 && rawH <= 12 ? String(rawH) : '12';
    return { hour, minute, period, hasValue: true };
  }

  // Otherwise assume 24-hour "HH:mm"
  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    const h24 = parseInt(parts[0], 10);
    const min = parts[1].slice(0, 2);
    if (!isNaN(h24)) {
      const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 || 12;
      return {
        hour: String(h12),
        minute: min.padStart(2, '0'),
        period,
        hasValue: true,
      };
    }
  }

  return { hour: '', minute: '', period: 'AM', hasValue: false };
}

/**
 * Converts 12-hour components into a standard 24-hour "HH:mm" string for storage.
 */
export function to24HourString(hour: string, minute: string, period: 'AM' | 'PM'): string {
  if (!hour) return '';
  const h = parseInt(hour, 10);
  if (isNaN(h)) return '';

  let h24 = h;
  if (period === 'PM' && h < 12) {
    h24 = h + 12;
  } else if (period === 'AM' && h === 12) {
    h24 = 0;
  }

  const minStr = (minute || '00').padStart(2, '0');
  return `${String(h24).padStart(2, '0')}:${minStr}`;
}

export function TimePicker12Hour({
  id,
  value = '',
  onChange,
  disabled = false,
  className,
}: TimePicker12HourProps) {
  const parsed = useMemo(() => parse12HourTime(value), [value]);

  // Dynamic minutes list: include standard 5-minute steps, plus custom minute if loaded
  const minuteOptions = useMemo(() => {
    if (parsed.minute && !BASE_MINUTES.includes(parsed.minute)) {
      return [...BASE_MINUTES, parsed.minute].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    }
    return BASE_MINUTES;
  }, [parsed.minute]);

  const handleHourChange = (newHour: string) => {
    if (!newHour) {
      onChange('');
      return;
    }
    const minute = parsed.minute || '00';
    const period = parsed.period || 'AM';
    onChange(to24HourString(newHour, minute, period));
  };

  const handleMinuteChange = (newMin: string) => {
    const hour = parsed.hour || '9'; // Default to 9 if hour was not selected
    const period = parsed.period || 'AM';
    onChange(to24HourString(hour, newMin, period));
  };

  const handlePeriodChange = (newPeriod: 'AM' | 'PM') => {
    if (parsed.period === newPeriod && parsed.hasValue) return;
    const hour = parsed.hour || '9'; // Default to 9 if hour was not selected
    const minute = parsed.minute || '00';
    onChange(to24HourString(hour, minute, newPeriod));
  };

  return (
    <div
      id={id}
      className={cn(
        'flex items-center gap-1 rounded-lg border border-input bg-card/60 px-2 py-1 shadow-2xs transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      {/* Hour Select */}
      <select
        value={parsed.hour}
        onChange={(e) => handleHourChange(e.target.value)}
        disabled={disabled}
        aria-label="Hour (1-12)"
        className="h-7 w-12 bg-transparent text-xs font-semibold text-foreground text-center rounded focus:outline-hidden cursor-pointer hover:bg-muted/60 transition-colors"
      >
        <option value="" disabled className="bg-popover text-muted-foreground">
          Hr
        </option>
        {HOURS.map((h) => (
          <option key={h} value={h} className="bg-popover text-foreground">
            {h}
          </option>
        ))}
      </select>

      <span className="text-muted-foreground/80 font-bold text-xs select-none">:</span>

      {/* Minute Select */}
      <select
        value={parsed.minute}
        onChange={(e) => handleMinuteChange(e.target.value)}
        disabled={disabled}
        aria-label="Minute (00-55)"
        className="h-7 w-12 bg-transparent text-xs font-semibold text-foreground text-center rounded focus:outline-hidden cursor-pointer hover:bg-muted/60 transition-colors"
      >
        <option value="" disabled className="bg-popover text-muted-foreground">
          Min
        </option>
        {minuteOptions.map((m) => (
          <option key={m} value={m} className="bg-popover text-foreground">
            {m}
          </option>
        ))}
      </select>

      {/* AM / PM Segmented Control */}
      <div className="ml-auto flex items-center rounded-md bg-muted/70 p-0.5 border border-border/50">
        <button
          type="button"
          onClick={() => handlePeriodChange('AM')}
          disabled={disabled}
          className={cn(
            'px-1.5 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer select-none leading-none',
            parsed.hasValue && parsed.period === 'AM'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => handlePeriodChange('PM')}
          disabled={disabled}
          className={cn(
            'px-1.5 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer select-none leading-none',
            parsed.hasValue && parsed.period === 'PM'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          PM
        </button>
      </div>
    </div>
  );
}
