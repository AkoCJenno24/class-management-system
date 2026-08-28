import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { GradingScale } from '@/types'
import { AVATAR_COLORS, AVATAR_PRESETS } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates uppercase 1-2 letter initials from a user's first and last name.
 * e.g., "John Doe" -> "JD", "Sarah" -> "S"
 */
export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = (firstName || '').trim().charAt(0).toUpperCase();
  const last = (lastName || '').trim().charAt(0).toUpperCase();
  return `${first}${last}` || '?';
}

/**
 * Returns a stable, deterministic avatar background color for initials avatars.
 * If an explicit hex color is provided, it is validated and returned.
 * Otherwise, it hashes the seed (e.g. student ID or full name) to select a permanent color from AVATAR_COLORS.
 */
export function getDeterministicAvatarColor(
  seed?: string | null,
  explicitColor?: string | null
): string {
  if (explicitColor && explicitColor.trim() && explicitColor.startsWith('#') && explicitColor.length >= 4) {
    return explicitColor.trim();
  }
  if (!seed || !seed.trim()) return AVATAR_COLORS[0];

  let hash = 0;
  const str = seed.trim();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export type ResolvedAvatar =
  | { mode: 'photo'; src: string; initials: string; bgColor: string }
  | { mode: 'preset'; presetId: string; src: string; label: string; initials: string; bgColor: string }
  | { mode: 'initials'; src: null; initials: string; bgColor: string };

/**
 * Resolves avatar data with explicit 3-way distinction:
 * 1. Photo (Custom uploaded URL)
 * 2. Preset (Preset character)
 * 3. Initials (Initials with custom/deterministic background color)
 *
 * This ensures no colliding states (e.g. preset showing an initials background color).
 */
export function resolveAvatarSource(data?: {
  avatarUrl?: string | null;
  avatarPreset?: string | null;
  avatarColor?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  id?: string | null;
}): ResolvedAvatar {
  const firstName = data?.firstName || '';
  const lastName = data?.lastName || '';
  const initials = getInitials(firstName, lastName);
  const bgColor = getDeterministicAvatarColor(
    data?.id || `${firstName}_${lastName}`,
    data?.avatarColor
  );

  // 1. Custom Uploaded Photo
  if (data?.avatarUrl && data.avatarUrl.trim()) {
    return {
      mode: 'photo',
      src: data.avatarUrl.trim(),
      initials,
      bgColor,
    };
  }

  // 2. Preset Character Avatar
  if (data?.avatarPreset && data.avatarPreset.trim()) {
    const presetId = data.avatarPreset.trim();
    const preset = AVATAR_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      return {
        mode: 'preset',
        presetId: preset.id,
        src: preset.src,
        label: preset.label,
        initials,
        bgColor,
      };
    }
  }

  // 3. Initials with Background Color
  return {
    mode: 'initials',
    src: null,
    initials,
    bgColor,
  };
}

/**
 * Formats a Firestore Timestamp or Date object into a readable date string.
 * e.g., "Oct 15, 2024"
 */
export function formatDate(date: { toDate?: () => Date } | Date | string | number | undefined | null): string {
  if (!date) return '—';
  const d = typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function'
    ? date.toDate()
    : new Date(date as string | number | Date);
  
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculates percentage from score and maxScore.
 */
export function calculatePercentage(score: number, maxScore: number): number {
  if (!maxScore || maxScore <= 0) return 0;
  return Math.round((score / maxScore) * 100);
}

/**
 * Formats a numerical score into the teacher's grading scale representation.
 */
export function formatGrade(score: number, maxScore: number, scale: GradingScale): string {
  const percentage = calculatePercentage(score, maxScore);

  switch (scale.type) {
    case 'letter': {
      if (percentage >= 97) return 'A+';
      if (percentage >= 93) return 'A';
      if (percentage >= 90) return 'A-';
      if (percentage >= 87) return 'B+';
      if (percentage >= 83) return 'B';
      if (percentage >= 80) return 'B-';
      if (percentage >= 77) return 'C+';
      if (percentage >= 73) return 'C';
      if (percentage >= 70) return 'C-';
      if (percentage >= 67) return 'D+';
      if (percentage >= 63) return 'D';
      if (percentage >= 60) return 'D-';
      return 'F';
    }
    case 'percentage':
      return `${percentage}%`;
    case 'numeric':
      return `${score}/${maxScore}`;
    case 'custom':
      return `${percentage}%`;
    default:
      return `${percentage}%`;
  }
}

/**
 * Returns a color for a grade score based on percentage.
 */
export function getGradeColor(score: number, maxScore: number, _scale?: GradingScale): string {
  const percentage = calculatePercentage(score, maxScore);

  if (percentage >= 90) return '#10B981'; // Emerald
  if (percentage >= 80) return '#3B82F6'; // Blue
  if (percentage >= 70) return '#F59E0B'; // Amber
  if (percentage >= 60) return '#F97316'; // Orange
  return '#EF4444'; // Red
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalizeFirst(str: string | undefined | null): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a student's full name with middle name/initial and suffix.
 * e.g., "John", "Michael", "Doe", "Jr." -> "John Michael Doe Jr."
 */
export function formatStudentFullName(
  student: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
    suffix?: string | null;
  },
  options?: { middleInitialOnly?: boolean }
): string {
  if (!student) return '';
  const first = student.firstName?.trim() || '';
  const last = student.lastName?.trim() || '';
  const middle = student.middleName?.trim() || '';
  const suffix = student.suffix?.trim() || '';

  const parts: string[] = [];
  if (first) parts.push(first);
  if (middle) {
    parts.push(options?.middleInitialOnly ? `${middle.charAt(0).toUpperCase()}.` : middle);
  }
  if (last) parts.push(last);
  if (suffix) parts.push(suffix);

  return parts.join(' ');
}

/**
 * Automatically capitalizes the first character of the text,
 * as well as the first letter following sentence-ending punctuation (. ! ? or newline).
 * Does not capitalize every word, preserving normal sentence casing.
 */
export function autoCapitalizeSentences(text: string): string {
  if (!text) return text;

  return text.replace(
    /(^\s*|[.!?]\s+|\n\s*)([a-z\u00E0-\u00FC])/gu,
    (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`
  );
}

/**
 * Day options for class scheduling.
 */
export const SCHEDULE_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const SHORT_DAY_NAMES: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

/**
 * Converts a 24-hour time string ("09:00", "13:30") or already formatted string to 12-hour AM/PM format ("9:00 AM", "1:30 PM").
 */
export function formatTime12Hour(timeStr?: string | null): string {
  if (!timeStr || !timeStr.trim()) return '';
  const trimmed = timeStr.trim();
  if (/am|pm/i.test(trimmed)) {
    return trimmed;
  }
  const parts = trimmed.split(':');
  if (parts.length < 2) return trimmed;

  const hours = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2);
  if (isNaN(hours)) return trimmed;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
}

/**
 * Formats a list of selected class days into a concise summary.
 * e.g. all 7 days -> "Daily", weekdays -> "Mon – Fri", or "Mon, Wed, Fri"
 */
export function formatScheduleDays(days?: string[] | null): string {
  if (!days || days.length === 0) return '';
  if (days.includes('Daily') || days.length === 7) return 'Daily';

  // Check if Mon-Fri are all selected and no weekends
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const isAllWeekdays =
    weekdays.every((d) => days.includes(d)) && !days.includes('Saturday') && !days.includes('Sunday');
  if (isAllWeekdays) return 'Mon – Fri';

  // Map to short day names preserving weekday order
  const orderedSelected = SCHEDULE_DAYS.filter((d) => days.includes(d)).map(
    (d) => SHORT_DAY_NAMES[d] || d
  );

  return orderedSelected.join(', ');
}

/**
 * Combines class schedule days and start/end time into a readable label.
 * e.g., "Mon, Wed, Fri • 9:00 AM – 10:00 AM" or "Daily • 8:00 AM – 9:30 AM"
 */
export function formatClassSchedule(
  days?: string[] | null,
  startTime?: string | null,
  endTime?: string | null
): string {
  const daysText = formatScheduleDays(days);
  const formattedStart = formatTime12Hour(startTime);
  const formattedEnd = formatTime12Hour(endTime);

  let timeText = '';
  if (formattedStart && formattedEnd) {
    timeText = `${formattedStart} – ${formattedEnd}`;
  } else if (formattedStart) {
    timeText = `From ${formattedStart}`;
  } else if (formattedEnd) {
    timeText = `Until ${formattedEnd}`;
  }

  if (daysText && timeText) {
    return `${daysText} • ${timeText}`;
  }
  return daysText || timeText;
}
