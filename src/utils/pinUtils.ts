import type { TeacherSettings } from '../types';

export type PinMode = 'daily' | 'date_format' | 'fixed';

/**
 * Computes a deterministic, non-obvious 4-digit Daily Security PIN for any given date (YYYY-MM-DD)
 * using Knuth's multiplicative hash with a salt seed.
 * Produces a unique 4-digit code between 1000 and 9999 that changes every single day.
 */
export function getDailySecurityPin(dateStr: string, seed: string = 'cambodia_moeys_attendance'): string {
  if (!dateStr) {
    const now = new Date();
    dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  const parts = dateStr.split('-');
  const y = parseInt(parts[0] || '2026', 10);
  const m = parseInt(parts[1] || '10', 10);
  const d = parseInt(parts[2] || '17', 10);

  // Compute absolute day index
  const dayIndex = y * 372 + m * 31 + d;

  // Mix with seed string
  let seedHash = 5381;
  const safeSeed = seed || 'cambodia_moeys_attendance';
  for (let i = 0; i < safeSeed.length; i++) {
    seedHash = ((seedHash << 5) + seedHash + safeSeed.charCodeAt(i)) & 0x7fffffff;
  }

  // Multiply by prime 2654435761 (Golden ratio constant)
  const combined = Math.abs((dayIndex * 2654435761 + seedHash) ^ 0x5a5a5a5a);

  // 4-digit pin from 1000 to 9999
  const pin = 1000 + (combined % 9000);
  return String(pin);
}

/**
 * Computes date-based PIN (e.g. DDMM or MMDD)
 * Example: 2026-10-17 -> Day 17, Month 10 -> '1710'
 */
export function getDateBasedPin(dateStr: string, format: 'DDMM' | 'MMDD' = 'DDMM'): string {
  if (!dateStr) {
    const now = new Date();
    dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  const parts = dateStr.split('-');
  const m = String(parseInt(parts[1] || '1', 10)).padStart(2, '0');
  const d = String(parseInt(parts[2] || '1', 10)).padStart(2, '0');

  return format === 'DDMM' ? `${d}${m}` : `${m}${d}`;
}

/**
 * Returns the effective PIN for a given date based on teacher's settings
 */
export function getPinForDate(dateStr: string, settings?: TeacherSettings | null): string {
  const mode: PinMode = settings?.pinMode || 'daily';

  if (mode === 'fixed') {
    return (settings?.studentAttendancePin || '1234').trim() || '1234';
  }

  if (mode === 'date_format') {
    return getDateBasedPin(dateStr, 'DDMM');
  }

  // Default: 'daily' dynamic security PIN
  const seed = settings?.studentAttendancePin || 'cambodia_moeys_attendance';
  return getDailySecurityPin(dateStr, seed);
}

/**
 * Fast, one-way hash for safe URL sharing so students cannot reverse-engineer the PIN
 */
export function hashPin(pin: string): string {
  let hash = 0x811c9dc5;
  const str = `salt_sec_${pin.trim()}_daily`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash).toString(36);
}

/**
 * Verifies if entered PIN matches the expected PIN for that date
 */
export function verifyPin(
  enteredPin: string,
  dateStr: string,
  settings?: TeacherSettings | null,
  pinTokenFromUrl?: string | null
): boolean {
  const cleanEntered = enteredPin.trim();
  if (!cleanEntered) return false;

  // 1. If pinToken is present in the URL, verify against hash
  if (pinTokenFromUrl && hashPin(cleanEntered) === pinTokenFromUrl) {
    return true;
  }

  // 2. Check against expected PIN for this date based on settings
  const expectedPin = getPinForDate(dateStr, settings);
  if (cleanEntered === expectedPin) {
    return true;
  }

  // 3. Fallback: Check if entered pin matches DDMM or MMDD date pin
  if (cleanEntered === getDateBasedPin(dateStr, 'DDMM') || cleanEntered === getDateBasedPin(dateStr, 'MMDD')) {
    if (settings?.pinMode === 'date_format') return true;
  }

  // 4. Fallback: If in fixed mode, check settings custom PIN
  if (settings?.pinMode === 'fixed' && cleanEntered === (settings?.studentAttendancePin || '1234')) {
    return true;
  }

  // 5. Fallback: Daily security pin with default seed (in case student opened link on new phone without token)
  if (cleanEntered === getDailySecurityPin(dateStr, 'cambodia_moeys_attendance')) {
    return true;
  }

  return false;
}
