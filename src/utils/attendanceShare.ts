import type { AttendanceRecord, AttendanceStatus, Student } from '../types';

/**
 * Compact encoding of attendance records for URL sharing.
 * Maps student roll numbers to status letters:
 * P = present
 * L = permission (Leave)
 * A = absent
 * T = late (Tardy)
 *
 * Example output: "1P.2L.3A.4P..."
 * Compact, URL-safe, typically ~90-120 characters for 35 students.
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
  const recordMap = new Map(sessionRecords.map((r) => [r.studentId, r.status]));

  const chunks: string[] = [];
  students.forEach((stu) => {
    const status = recordMap.get(stu.id);
    if (status) {
      const code =
        status === 'present'
          ? 'P'
          : status === 'permission'
          ? 'L'
          : status === 'absent'
          ? 'A'
          : status === 'late'
          ? 'T'
          : '';
      if (code) {
        chunks.push(`${stu.rollNo}${code}`);
      }
    }
  });

  return chunks.join('.');
}

/**
 * Decodes attendance string from URL back to a map of rollNo -> status
 */
export function decodeAttendanceFromUrl(
  encoded: string | null | undefined
): Map<number, AttendanceStatus> {
  const map = new Map<number, AttendanceStatus>();
  if (!encoded) return map;

  const parts = encoded.split(/[._-]/);
  for (const part of parts) {
    const match = part.match(/^(\d+)([PLATU])$/i);
    if (match) {
      const rollNo = parseInt(match[1], 10);
      const code = match[2].toUpperCase();
      let status: AttendanceStatus | null = null;
      if (code === 'P') status = 'present';
      else if (code === 'L') status = 'permission';
      else if (code === 'A') status = 'absent';
      else if (code === 'T') status = 'late';

      if (status && !isNaN(rollNo)) {
        map.set(rollNo, status);
      }
    }
  }
  return map;
}
