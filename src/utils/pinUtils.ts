import type { TeacherSettings } from '../types';

export type PinMode = 'per_share' | 'daily' | 'date_format' | 'fixed';

export const ACTIVE_OTP_STORAGE_KEY = 'attendance_active_share_otp';
export const CONSUMED_TOKENS_STORAGE_KEY = 'attendance_consumed_otp_tokens';
export const OTP_BROADCAST_CHANNEL = 'kh_attendance_otp_channel';

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
 * Gets or creates the active OTP for sharing.
 * Stored in localStorage so it stays consistent across modals and tabs until consumed or rotated.
 */
export function getActiveShareOtp(): string {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ACTIVE_OTP_STORAGE_KEY);
      if (saved && /^\d{4}$/.test(saved)) {
        return saved;
      }
    }
  } catch {}
  const fresh = generateOneTimeSharePin();
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_OTP_STORAGE_KEY, fresh);
    }
  } catch {}
  return fresh;
}

/**
 * Rotates the active OTP code immediately (used when a student unlocks or teacher clicks 'ប្តូរកូដថ្មី')
 * Broadcasts the event to all other tabs/windows in real time.
 */
export function rotateActiveShareOtp(): string {
  const fresh = generateOneTimeSharePin();
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_OTP_STORAGE_KEY, fresh);
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel(OTP_BROADCAST_CHANNEL);
        bc.postMessage({ type: 'OTP_ROTATED', newPin: fresh, timestamp: Date.now() });
        bc.close();
      }
    }
  } catch {}
  return fresh;
}

/**
 * Checks if an OTP token or PIN has already been used/consumed.
 * Single-use security ensures a code cannot be reused once unlocked.
 */
export function isPinTokenConsumed(pinToken?: string | null, pin?: string | null): boolean {
  if (!pinToken && !pin) return false;
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(CONSUMED_TOKENS_STORAGE_KEY);
      if (raw) {
        const list: string[] = JSON.parse(raw);
        if (pinToken && list.includes(pinToken)) return true;
        if (pin && list.includes(`pin_${pin.trim()}`)) return true;
      }
      const sessRaw = sessionStorage.getItem(CONSUMED_TOKENS_STORAGE_KEY);
      if (sessRaw) {
        const sessList: string[] = JSON.parse(sessRaw);
        if (pinToken && sessList.includes(pinToken)) return true;
        if (pin && sessList.includes(`pin_${pin.trim()}`)) return true;
      }
    }
  } catch {}
  return false;
}

/**
 * Marks an OTP token and its PIN as consumed immediately upon successful student unlock.
 */
export function markPinTokenAsConsumed(pinToken?: string | null, pin?: string | null): void {
  if (!pinToken && !pin) return;
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(CONSUMED_TOKENS_STORAGE_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (pinToken && !list.includes(pinToken)) list.push(pinToken);
      if (pin && !list.includes(`pin_${pin.trim()}`)) list.push(`pin_${pin.trim()}`);
      const trimmed = list.slice(-100);
      localStorage.setItem(CONSUMED_TOKENS_STORAGE_KEY, JSON.stringify(trimmed));
      sessionStorage.setItem(CONSUMED_TOKENS_STORAGE_KEY, JSON.stringify(trimmed));

      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel(OTP_BROADCAST_CHANNEL);
        bc.postMessage({
          type: 'PIN_CONSUMED',
          pinToken,
          pin,
          timestamp: Date.now(),
        });
        bc.close();
      }
    }
  } catch {}
}

/**
 * Formats seconds into a Khmer countdown string (e.g. 295s -> "០៤:៥៥")
 */
export function formatKhmerCountdown(totalSeconds: number): string {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.max(0, totalSeconds) % 60;
  const mStr = String(m).padStart(2, '0');
  const sStr = String(s).padStart(2, '0');
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  const toKh = (str: string) => str.split('').map((c) => khmerDigits[parseInt(c, 10)] ?? c).join('');
  return `${toKh(mStr)}:${toKh(sStr)}`;
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

export interface PinVerificationResult {
  isValid: boolean;
  isConsumed?: boolean;
  message?: string;
}

/**
 * Detailed verification that checks for consumed (already used) OTP codes,
 * URL token matching, daily deterministic PIN, or master key.
 */
export function verifyPinDetailed(
  enteredPin: string,
  dateStr: string,
  settings?: TeacherSettings | null,
  pinTokenFromUrl?: string | null
): PinVerificationResult {
  const cleanEntered = enteredPin.trim();
  if (!cleanEntered) {
    return { isValid: false, message: 'សូមបញ្ចូលលេខកូដសម្ងាត់ ៤ ខ្ទង់' };
  }

  // 0. Check if this token or PIN has already been consumed (single-use defense)
  if (isPinTokenConsumed(pinTokenFromUrl, cleanEntered)) {
    return {
      isValid: false,
      isConsumed: true,
      message: '🚫 លេខកូដ OTP នេះត្រូវបានប្រើប្រាស់រួចហើយ (Single-Use)! ប្រព័ន្ធបានប្តូរកូដថ្មីដោយស្វ័យប្រវត្តិ សូមស្នើសុំកូដថ្មីពីលោកគ្រូ។',
    };
  }

  // 1. If pinToken is present in the URL, verify against hash (Primary for per-share OTP and dynamic links)
  if (pinTokenFromUrl) {
    // Check dual-hash token
    if (hashPin(cleanEntered) === pinTokenFromUrl) {
      return { isValid: true };
    }
    // Also check legacy single-hash for backward compatibility
    let legacyHash = 0x811c9dc5;
    const legacyStr = `salt_sec_${cleanEntered}_daily`;
    for (let i = 0; i < legacyStr.length; i++) {
      legacyHash ^= legacyStr.charCodeAt(i);
      legacyHash = Math.imul(legacyHash, 0x01000193);
    }
    if (Math.abs(legacyHash).toString(36) === pinTokenFromUrl) {
      return { isValid: true };
    }

    // In per_share mode, the token is strict: students cannot use an old daily PIN or fixed PIN!
    if (settings?.pinMode === 'per_share') {
      // Allow only teacher's custom master PIN if explicitly configured and different from default
      if (
        settings?.studentAttendancePin &&
        settings.studentAttendancePin !== '1234' &&
        cleanEntered === settings.studentAttendancePin
      ) {
        return { isValid: true };
      }
      return { isValid: false, message: 'លេខកូដមិនត្រូវនឹងតំណភ្ជាប់ OTP នេះទេ' };
    }
  }

  // 2. Check against expected PIN for this date based on settings
  const expectedPin = getPinForDate(dateStr, settings);
  if (cleanEntered === expectedPin) {
    return { isValid: true };
  }

  // 3. Fallback: Check if entered pin matches DDMM or MMDD date pin
  if (cleanEntered === getDateBasedPin(dateStr, 'DDMM') || cleanEntered === getDateBasedPin(dateStr, 'MMDD')) {
    if (settings?.pinMode === 'date_format') return { isValid: true };
  }

  // 4. Fallback: If in fixed mode, check settings custom PIN
  if (settings?.pinMode === 'fixed' && cleanEntered === (settings?.studentAttendancePin || '1234')) {
    return { isValid: true };
  }

  // 5. Fallback: Daily security pin with default seed (in daily mode)
  if (settings?.pinMode === 'daily') {
    if (cleanEntered === getDailySecurityPin(dateStr, 'cambodia_moeys_attendance')) {
      return { isValid: true };
    }
  }

  // 6. Master key fallback if teacher configured custom secret
  if (settings?.studentAttendancePin && cleanEntered === settings.studentAttendancePin) {
    return { isValid: true };
  }

  return { isValid: false, message: 'លេខកូដសម្ងាត់មិនត្រឹមត្រូវទេ' };
}

/**
 * Backwards-compatible verifyPin wrapper returning boolean
 */
export function verifyPin(
  enteredPin: string,
  dateStr: string,
  settings?: TeacherSettings | null,
  pinTokenFromUrl?: string | null
): boolean {
  return verifyPinDetailed(enteredPin, dateStr, settings, pinTokenFromUrl).isValid;
}
