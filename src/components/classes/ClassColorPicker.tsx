/**
 * Reusable Class Color Theme Picker Component.
 * Supports selecting stylish color presets for class cards (Default, Yellow, Blue, Green, Pink, Purple, Orange).
 */
import type { ClassColor } from '@/types';
import { Palette, Check } from 'lucide-react';

export const CLASS_COLOR_KEYS: ClassColor[] = [
  'default',
  'yellow',
  'blue',
  'green',
  'pink',
  'purple',
  'orange',
];

export const CLASS_COLOR_CONFIGS: Record<
  ClassColor,
  {
    name: string;
    bgClass: string;
    borderClass: string;
    hoverBorderClass: string;
    badgeClass: string;
    dotColor: string;
    accentBg: string;
    swatchColor: string;
  }
> = {
  default: {
    name: 'Default',
    bgClass: 'bg-card',
    borderClass: 'border-border',
    hoverBorderClass: 'hover:border-primary/50',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
    dotColor: '#6366f1',
    accentBg: 'bg-primary/10',
    swatchColor: '#6366f1',
  },
  yellow: {
    name: 'Warm Amber',
    bgClass: 'bg-amber-500/5 dark:bg-amber-950/20',
    borderClass: 'border-amber-300/80 dark:border-amber-700/50',
    hoverBorderClass: 'hover:border-amber-500',
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300/70 dark:border-amber-700/60',
    dotColor: '#f59e0b',
    accentBg: 'bg-amber-500/15',
    swatchColor: '#f59e0b',
  },
  blue: {
    name: 'Sky Blue',
    bgClass: 'bg-sky-500/5 dark:bg-sky-950/20',
    borderClass: 'border-sky-300/80 dark:border-sky-700/50',
    hoverBorderClass: 'hover:border-sky-500',
    badgeClass: 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-300/70 dark:border-sky-700/60',
    dotColor: '#0ea5e9',
    accentBg: 'bg-sky-500/15',
    swatchColor: '#0ea5e9',
  },
  green: {
    name: 'Mint Green',
    bgClass: 'bg-emerald-500/5 dark:bg-emerald-950/20',
    borderClass: 'border-emerald-300/80 dark:border-emerald-700/50',
    hoverBorderClass: 'hover:border-emerald-500',
    badgeClass: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-300/70 dark:border-emerald-700/60',
    dotColor: '#10b981',
    accentBg: 'bg-emerald-500/15',
    swatchColor: '#10b981',
  },
  pink: {
    name: 'Rose Pink',
    bgClass: 'bg-pink-500/5 dark:bg-pink-950/20',
    borderClass: 'border-pink-300/80 dark:border-pink-700/50',
    hoverBorderClass: 'hover:border-pink-500',
    badgeClass: 'bg-pink-500/15 text-pink-800 dark:text-pink-300 border-pink-300/70 dark:border-pink-700/60',
    dotColor: '#ec4899',
    accentBg: 'bg-pink-500/15',
    swatchColor: '#ec4899',
  },
  purple: {
    name: 'Lavender',
    bgClass: 'bg-purple-500/5 dark:bg-purple-950/20',
    borderClass: 'border-purple-300/80 dark:border-purple-700/50',
    hoverBorderClass: 'hover:border-purple-500',
    badgeClass: 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-300/70 dark:border-purple-700/60',
    dotColor: '#a855f7',
    accentBg: 'bg-purple-500/15',
    swatchColor: '#a855f7',
  },
  orange: {
    name: 'Peach Orange',
    bgClass: 'bg-orange-500/5 dark:bg-orange-950/20',
    borderClass: 'border-orange-300/80 dark:border-orange-700/50',
    hoverBorderClass: 'hover:border-orange-500',
    badgeClass: 'bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-300/70 dark:border-orange-700/60',
    dotColor: '#f97316',
    accentBg: 'bg-orange-500/15',
    swatchColor: '#f97316',
  },
};

interface ClassColorPickerProps {
  selectedColor: ClassColor;
  onChange: (color: ClassColor) => void;
  disabled?: boolean;
}

export function ClassColorPicker({
  selectedColor,
  onChange,
  disabled = false,
}: ClassColorPickerProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
        <Palette className="h-3.5 w-3.5 text-primary" />
        <span>Class Card Color Theme</span>
      </label>

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        {CLASS_COLOR_KEYS.map((colorKey) => {
          const config = CLASS_COLOR_CONFIGS[colorKey];
          const isSelected = selectedColor === colorKey;

          return (
            <button
              key={colorKey}
              type="button"
              onClick={() => onChange(colorKey)}
              disabled={disabled}
              title={config.name}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/40 bg-accent text-foreground shadow-xs'
                  : 'border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <span
                className="h-3 w-3 rounded-full flex items-center justify-center shrink-0 shadow-2xs"
                style={{ backgroundColor: config.swatchColor }}
              >
                {isSelected && <Check className="h-2 w-2 text-white stroke-[3]" />}
              </span>
              <span>{config.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
