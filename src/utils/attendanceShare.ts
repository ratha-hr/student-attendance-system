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
  students.forEach((stu) => {
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
        if (rec.reason && rec.reason.trim()) {
          chunks.push(`${stu.rollNo}${code}~${encodeURIComponent(rec.reason.trim())}`);
        } else {
          chunks.push(`${stu.rollNo}${code}`);
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
