/**
 * Reusable Class Schedule Days Picker component.
 * Allows multi-selection of days (Monday through Sunday) with a 'Daily' all-days shortcut.
 */
import { SCHEDULE_DAYS, SHORT_DAY_NAMES } from '@/lib/utils';
import { Calendar, Check } from 'lucide-react';

interface ScheduleDaysPickerProps {
  selectedDays: string[];
  onChange: (days: string[]) => void;
  disabled?: boolean;
}

export function ScheduleDaysPicker({
  selectedDays,
  onChange,
  disabled = false,
}: ScheduleDaysPickerProps) {
  const isDailySelected =
    selectedDays.includes('Daily') ||
    (SCHEDULE_DAYS.length > 0 && SCHEDULE_DAYS.every((d) => selectedDays.includes(d)));

  const handleToggleDaily = () => {
    if (disabled) return;
    if (isDailySelected) {
      onChange([]);
    } else {
      onChange([...SCHEDULE_DAYS]);
    }
  };

  const handleToggleDay = (day: string) => {
    if (disabled) return;
    const isSelected = selectedDays.includes(day);
    let next: string[];
    if (isSelected) {
      next = selectedDays.filter((d) => d !== day && d !== 'Daily');
    } else {
      next = [...selectedDays.filter((d) => d !== 'Daily'), day];
    }
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span>Class Schedule Days</span>
          <span className="text-[10px] text-muted-foreground font-normal">(optional)</span>
        </label>
        {selectedDays.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={disabled}
            className="text-[10px] text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
          >
            Clear days
          </button>
        )}
      </div>

      {/* Days Tag List */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {/* Daily Option */}
        <button
          type="button"
          onClick={handleToggleDaily}
          disabled={disabled}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none ${
            isDailySelected
              ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
              : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/80'
          }`}
        >
          {isDailySelected && <Check className="h-3 w-3 shrink-0" />}
          <span>Daily</span>
        </button>

        {/* Individual Days (Monday - Sunday) */}
        {SCHEDULE_DAYS.map((day) => {
          const isSelected = selectedDays.includes(day);
          const shortName = SHORT_DAY_NAMES[day] || day;

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleToggleDay(day)}
              disabled={disabled}
              title={day}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                  : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border/80'
              }`}
            >
              {isSelected && <Check className="h-3 w-3 shrink-0" />}
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{shortName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
