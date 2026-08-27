import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { GradingScale } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates uppercase 1-2 letter initials from a user's first and last name.
 * e.g., "John Doe" -> "JD", "Sarah" -> "S"
 */
export function getInitials(firstName: string, lastName?: string): string {
  const first = firstName.trim().charAt(0).toUpperCase();
  const last = lastName ? lastName.trim().charAt(0).toUpperCase() : '';
  return `${first}${last}` || '?';
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


