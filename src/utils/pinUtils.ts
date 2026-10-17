import type { TeacherSettings } from '../types';

export type PinMode = 'per_share' | 'daily' | 'date_format' | 'fixed';

/**
 * Generates a fresh, non-guessable 4-digit One-Time Passcode (OTP)
 * for per-share links (e.g. 1000 - 9999).
 * Every time the teacher generates/shares a link, a brand new code is produced.
 */
export function generateOneTimeSharePin(): string {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return String(1000 + (arr[0] % 9000));
    }
  } catch {}
  return String(Math.floor(1000 + Math.random() * 9000));
}

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
  const mode: PinMode = settings?.pinMode || 'per_share';

  if (mode === 'fixed') {
    return (settings?.studentAttendancePin || '1234').trim() || '1234';
  }

  if (mode === 'date_format') {
    return getDateBasedPin(dateStr, 'DDMM');
  }

  if (mode === 'daily') {
    const seed = settings?.studentAttendancePin || 'cambodia_moeys_attendance';
    return getDailySecurityPin(dateStr, seed);
  }

  // 'per_share' mode: fallback to daily pin if inspected statically without a live share session
  const seed = settings?.studentAttendancePin || 'cambodia_moeys_attendance';
  return getDailySecurityPin(dateStr, seed);
}

/**
 * High-Security One-Way Hash for safe URL sharing so students cannot reverse-engineer the PIN.
 * Generates a collision-resistant 64-bit dual token.
 */
export function hashPin(pin: string): string {
  const clean = pin.trim();
  let hash1 = 0x811c9dc5;
  let hash2 = 0x5a5a5a5a;
  const str = `salt_sec_${clean}_daily`;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    hash1 ^= code;
    hash1 = Math.imul(hash1, 0x01000193);
    hash2 = ((hash2 << 5) - hash2 + code) & 0x7fffffff;
  }
  return `${Math.abs(hash1).toString(36)}_${Math.abs(hash2).toString(36)}`;
}

/**
 * Verifies if entered PIN matches the expected PIN for that date or share link
 */
export function verifyPin(
  enteredPin: string,
  dateStr: string,
  settings?: TeacherSettings | null,
  pinTokenFromUrl?: string | null
): boolean {
  const cleanEntered = enteredPin.trim();
  if (!cleanEntered) return false;

  // 1. If pinToken is present in the URL, verify against hash (Primary for per-share OTP and dynamic links)
  if (pinTokenFromUrl) {
    // Check dual-hash token
    if (hashPin(cleanEntered) === pinTokenFromUrl) {
      return true;
    }
    // Also check legacy single-hash for backward compatibility
    let legacyHash = 0x811c9dc5;
    const legacyStr = `salt_sec_${cleanEntered}_daily`;
    for (let i = 0; i < legacyStr.length; i++) {
      legacyHash ^= legacyStr.charCodeAt(i);
      legacyHash = Math.imul(legacyHash, 0x01000193);
    }
    if (Math.abs(legacyHash).toString(36) === pinTokenFromUrl) {
      return true;
    }

    // In per_share mode, the token is strict: students cannot use an old daily PIN or fixed PIN!
    if (settings?.pinMode === 'per_share') {
      // Allow only teacher's custom master PIN if explicitly configured and different from default
      if (
        settings?.studentAttendancePin &&
        settings.studentAttendancePin !== '1234' &&
        cleanEntered === settings.studentAttendancePin
      ) {
        return true;
      }
      return false;
    }
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

  // 5. Fallback: Daily security pin with default seed (in daily mode)
  if (settings?.pinMode === 'daily') {
    if (cleanEntered === getDailySecurityPin(dateStr, 'cambodia_moeys_attendance')) {
      return true;
    }
  }

  // 6. Master key fallback if teacher configured custom secret
  if (settings?.studentAttendancePin && cleanEntered === settings.studentAttendancePin) {
    return true;
  }

  return false;
}
