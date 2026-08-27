/**
 * Validation utilities for form submission and user input verification.
 */

/** Validates email format using standard regex */
export function isValidEmail(email: string): boolean {
  if (!email || !email.trim()) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/** Validates phone numbers (minimum 7 digits, supports +, -, (), spaces) */
export function isValidPhone(phone: string): boolean {
  if (!phone || !phone.trim()) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/** Checks if a date string (YYYY-MM-DD) is in the future */
export function isFutureDate(dateStr: string): boolean {
  if (!dateStr || !dateStr.trim()) return false;
  const inputDate = new Date(dateStr);
  if (isNaN(inputDate.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return inputDate.getTime() > today.getTime();
}

/** Checks if a string is non-empty after trimming */
export function isNonEmpty(val: string | undefined | null): boolean {
  return typeof val === 'string' && val.trim().length > 0;
}

/** Validates grade score against max score */
export function validateGradeScore(
  scoreStr: string,
  maxScoreStr: string
): { valid: boolean; error?: string } {
  if (!scoreStr.trim()) {
    return { valid: false, error: 'Score is required.' };
  }

  const score = parseFloat(scoreStr);
  const max = parseFloat(maxScoreStr);

  if (isNaN(score)) {
    return { valid: false, error: 'Score must be a valid number.' };
  }

  if (score < 0) {
    return { valid: false, error: 'Score cannot be negative.' };
  }

  if (isNaN(max) || max <= 0) {
    return { valid: false, error: 'Max score must be greater than 0.' };
  }

  if (score > max) {
    return { valid: false, error: `Score cannot exceed maximum points (${max} pts).` };
  }

  return { valid: true };
}
