import type { AttendanceRecord, AttendanceStatus, Student } from '../types';

export interface DecodedAttendanceItem {
  status: AttendanceStatus;
  reason?: string;
}

/**
 * Compact encoding of attendance records for URL sharing.
 * Maps student roll numbers to status letters:
 * P = present
 * L = permission (Leave)
 * A = absent
 * T = late (Tardy)
 *
 * Optional reason is appended with '~': e.g. "1P.2L~ឈឺក្បាល.3A~មានការរវល់.4T"
 * Compact, URL-safe, backwards-compatible.
 */
export function encodeAttendanceForUrl(
  students: Student[],
  records: AttendanceRecord[],
  selectedDate: string,
  selectedSession: 'morning' | 'afternoon'
): string {
  const sessionRecords = records.filter(
    (r) => r.date === selectedDate && r.session === selectedSession
  );
  const recordMap = new Map(sessionRecords.map((r) => [r.studentId, r]));

  const chunks: string[] = [];
  students.forEach((stu, idx) => {
    const rec = recordMap.get(stu.id);
    if (rec && rec.status) {
      const code =
        rec.status === 'present'
          ? 'P'
          : rec.status === 'permission'
          ? 'L'
          : rec.status === 'absent'
          ? 'A'
          : rec.status === 'late'
          ? 'T'
          : '';
      if (code) {
        const roll = idx + 1;
        if (rec.reason && rec.reason.trim()) {
          chunks.push(`${roll}${code}~${encodeURIComponent(rec.reason.trim())}`);
        } else {
          chunks.push(`${roll}${code}`);
        }
      }
    }
  });

  return chunks.join('.');
}

/**
 * Decodes attendance string from URL back to a map of rollNo -> { status, reason }
 */
export function decodeAttendanceFromUrl(
  encoded: string | null | undefined
): Map<number, DecodedAttendanceItem> {
  const map = new Map<number, DecodedAttendanceItem>();
  if (!encoded) return map;

  // Split on '.' by default, or fallback to '_' if old URL without '.'
  const separator = encoded.includes('.') ? '.' : encoded.includes('_') && !encoded.includes('~') ? '_' : '.';
  const parts = encoded.split(separator);

  for (const part of parts) {
    if (!part) continue;
    // Format: "1P", "2L~sick", "3A", "4T~traffic"
    const match = part.match(/^(\d+)([PLATU])(?:~(.+))?$/i);
    if (match) {
      const rollNo = parseInt(match[1], 10);
      const code = match[2].toUpperCase();
      const rawReason = match[3];
      let reason = '';
      if (rawReason) {
        try {
          reason = decodeURIComponent(rawReason);
        } catch {
          reason = rawReason;
        }
      }

      let status: AttendanceStatus | null = null;
      if (code === 'P') status = 'present';
      else if (code === 'L') status = 'permission';
      else if (code === 'A') status = 'absent';
      else if (code === 'T') status = 'late';

      if (status && !isNaN(rollNo)) {
        map.set(rollNo, { status, reason });
      }
    }
  }
  return map;
}

/**
 * Compact Base64URL-encoding of student roster for multi-device link sharing.
 * Ensures student names, roll numbers, genders, and codes are never lost when
 * opened on mobile phones or other devices that lack local IndexedDB data.
 */
export function encodeRosterForUrl(students: Student[]): string {
  if (!students || students.length === 0) return '';
  try {
    const rows = students.map((s, idx) => {
      const roll = s.rollNo || idx + 1;
      const g = s.gender === 'ស្រី' ? 'F' : 'M';
      const name = (s.nameKh || '').replace(/[,|~]/g, ' ').trim();
      const code = (s.studentCode || '').replace(/[,|~]/g, ' ').trim();
      return `${roll},${g},${name},${code}`;
    });
    const text = rows.join('|');
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (err) {
    console.error('Failed to encode roster for URL', err);
    return '';
  }
}

/**
 * Decodes compressed student roster from URL parameter back to full Student objects.
 */
export function decodeRosterFromUrl(
  encoded: string | null | undefined,
  targetClassId: string
): Student[] {
  if (!encoded || !encoded.trim()) return [];
  try {
    let base64 = encoded.trim().replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const text = new TextDecoder().decode(bytes);
    if (!text) return [];

    const rows = text.split('|');
    const students: Student[] = [];

    rows.forEach((row, idx) => {
      if (!row || !row.trim()) return;
      const parts = row.split(',');
      const rollNo = parseInt(parts[0], 10) || idx + 1;
      const g: 'ប្រុស' | 'ស្រី' = parts[1] === 'F' ? 'ស្រី' : 'ប្រុស';
      const nameKh = (parts[2] || '').trim();
      const studentCode = (parts[3] || '').trim();

      if (nameKh) {
        students.push({
          id: `stu-${targetClassId}-${rollNo}`,
          classId: targetClassId,
          rollNo,
          studentCode: studentCode || `STU-${String(rollNo).padStart(3, '0')}`,
          nameKh,
          gender: g,
          status: 'active',
          createdAt: new Date().toISOString(),
        } as Student);
      }
    });

    return students;
  } catch (err) {
    console.error('Failed to decode roster from URL', err);
    return [];
  }
}
