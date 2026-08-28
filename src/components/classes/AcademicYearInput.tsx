import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AcademicYearInputProps {
  id?: string;
  value?: string; // e.g. "2025 - 2026" or ""
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Parses academic year string like "2025 - 2026" or "2025-2026" into fromYear and toYear.
 */
function parseAcademicYear(value?: string): { from: string; to: string } {
  if (!value || !value.trim()) return { from: '', to: '' };
  const parts = value.split(/[-–—]/).map((p) => p.trim());
  if (parts.length >= 2) {
    return { from: parts[0], to: parts[1] };
  }
  return { from: parts[0] || '', to: '' };
}

export function AcademicYearInput({
  id,
  value = '',
  onChange,
  disabled = false,
  className,
}: AcademicYearInputProps) {
  const parsed = parseAcademicYear(value);
  const [fromYear, setFromYear] = useState(parsed.from);
  const [toYear, setToYear] = useState(parsed.to);

  // Synchronize internal state when value prop changes externally
  useEffect(() => {
    const p = parseAcademicYear(value);
    setFromYear(p.from);
    setToYear(p.to);
  }, [value]);

  const emitChange = (nextFrom: string, nextTo: string) => {
    const f = nextFrom.trim();
    const t = nextTo.trim();
    if (!f && !t) {
      onChange('');
    } else if (f && t) {
      onChange(`${f} - ${t}`);
    } else if (f) {
      onChange(f);
    } else {
      onChange(t);
    }
  };

  const handleFromChange = (val: string) => {
    const sanitized = val.replace(/\D/g, '').slice(0, 4);
    setFromYear(sanitized);

    // Auto-populate toYear if 4 digits entered and toYear is empty
    let nextTo = toYear;
    if (sanitized.length === 4 && !toYear) {
      const yearNum = parseInt(sanitized, 10);
      if (!isNaN(yearNum) && yearNum >= 1900 && yearNum <= 2100) {
        nextTo = String(yearNum + 1);
        setToYear(nextTo);
      }
    }
    emitChange(sanitized, nextTo);
  };

  const handleToChange = (val: string) => {
    const sanitized = val.replace(/\D/g, '').slice(0, 4);
    setToYear(sanitized);
    emitChange(fromYear, sanitized);
  };

  const handleSetCurrentAcademicYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    // In schools, if current month is >= August (month index >= 7), current academic year is currentYear - currentYear+1
    // otherwise previousYear - currentYear
    const start = now.getMonth() >= 7 ? currentYear : currentYear - 1;
    const end = start + 1;
    setFromYear(String(start));
    setToYear(String(end));
    emitChange(String(start), String(end));
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div id={id} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="From (e.g. 2025)"
            value={fromYear}
            onChange={(e) => handleFromChange(e.target.value)}
            disabled={disabled}
            maxLength={4}
            className="h-8.5 text-xs text-center font-medium shadow-2xs"
          />
        </div>

        <span className="text-xs font-semibold text-muted-foreground select-none">–</span>

        <div className="relative flex-1">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="To (e.g. 2026)"
            value={toYear}
            onChange={(e) => handleToChange(e.target.value)}
            disabled={disabled}
            maxLength={4}
            className="h-8.5 text-xs text-center font-medium shadow-2xs"
          />
        </div>

        <button
          type="button"
          onClick={handleSetCurrentAcademicYear}
          disabled={disabled}
          title="Set to Current Academic Year"
          className="inline-flex items-center gap-1 h-8.5 px-2 rounded-lg border border-input bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors shrink-0 cursor-pointer shadow-2xs select-none disabled:opacity-50"
        >
          <Calendar className="h-3 w-3 text-primary" />
          <span className="hidden sm:inline">Current Year</span>
        </button>
      </div>
    </div>
  );
}
