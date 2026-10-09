import type { ClassRoom } from '../types';

export interface StandardGradeConfig {
  grade: string;
  levelLabel: string;
  letters: string[];
  mainId: string;
}

export const STANDARD_CLASS_CONFIGS: StandardGradeConfig[] = [
  {
    grade: '7',
    levelLabel: 'អនុវិទ្យាល័យ',
    letters: ['A', 'B', 'C', 'D', 'E'],
    mainId: 'class-7',
  },
  {
    grade: '8',
    levelLabel: 'អនុវិទ្យាល័យ',
    letters: ['A', 'B', 'C', 'D', 'E'],
    mainId: 'class-8',
  },
  {
    grade: '9',
    levelLabel: 'អនុវិទ្យាល័យ',
    letters: ['A', 'B', 'C', 'D'],
    mainId: 'class-9',
  },
  {
    grade: '10',
    levelLabel: 'វិទ្យាល័យ',
    letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
    mainId: 'class-10',
  },
  {
    grade: '11',
    levelLabel: 'វិទ្យាល័យ',
    letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    mainId: 'class-11',
  },
  {
    grade: '12',
    levelLabel: 'វិទ្យាល័យ',
    letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'],
    mainId: 'class-12',
  },
];

/**
 * Generate standard 49 classes:
 * 7A-E (5), 8A-E (5), 9A-D (4), 10A-L (12), 11A-J (10), 12A-M (13)
 * Completely free of room (បន្ទប់) and building (អគារ).
 */
export function generateStandardClasses(academicYear = '២០២៤-២០២៥'): ClassRoom[] {
  const result: ClassRoom[] = [];

  STANDARD_CLASS_CONFIGS.forEach((cfg) => {
    cfg.letters.forEach((letter, idx) => {
      const id = idx === 0 ? cfg.mainId : `class-${cfg.grade}-${letter.toLowerCase()}`;
      result.push({
        id,
        name: `ថ្នាក់ទី ${cfg.grade}${letter}`,
        grade: cfg.grade,
        academicYear,
        description: `ថ្នាក់ ${cfg.grade}${letter} (${cfg.levelLabel})`,
        createdAt: '2024-10-01T08:00:00Z',
      });
    });
  });

  return result;
}

/**
 * Extract numerical grade for reliable sorting (e.g. 7, 8, 9, 10, 11, 12).
 */
export function parseGradeNumber(grade: string | undefined): number {
  if (!grade) return 999;
  // Support both Khmer numbers (៧, ៨, ៩, ១០...) and Arabic numbers (7, 8, 9, 10...)
  const khmerToArabicMap: Record<string, string> = {
    '០': '0', '១': '1', '២': '2', '៣': '3', '៤': '4',
    '៥': '5', '៦': '6', '៧': '7', '៨': '8', '៩': '9',
  };
  const normalized = grade.replace(/[០-៩]/g, (ch) => khmerToArabicMap[ch] || ch);
  const match = normalized.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
}

/**
 * Sort classes logically by Grade number, then by Class Name
 */
export function sortClasses(classes: ClassRoom[]): ClassRoom[] {
  return [...classes].sort((a, b) => {
    const gA = parseGradeNumber(a.grade || a.name);
    const gB = parseGradeNumber(b.grade || b.name);
    if (gA !== gB) return gA - gB;
    return a.name.localeCompare(b.name, 'km', { numeric: true });
  });
}

export interface ClassGradeGroup {
  grade: string;
  gradeNum: number;
  label: string;
  classes: ClassRoom[];
}

/**
 * Group classes by Grade for optgroups in select dropdowns
 */
export function groupClassesByGrade(classes: ClassRoom[]): ClassGradeGroup[] {
  const sorted = sortClasses(classes);
  const map = new Map<string, ClassRoom[]>();

  sorted.forEach((c) => {
    const gNum = parseGradeNumber(c.grade || c.name);
    const gKey = gNum !== 999 ? `${gNum}` : 'ទូទៅ';
    if (!map.has(gKey)) {
      map.set(gKey, []);
    }
    map.get(gKey)!.push(c);
  });

  const groups: ClassGradeGroup[] = [];
  map.forEach((items, key) => {
    const num = parseInt(key, 10);
    const label = !isNaN(num) ? `ថ្នាក់ទី ${key}` : key;
    groups.push({
      grade: key,
      gradeNum: isNaN(num) ? 999 : num,
      label,
      classes: items,
    });
  });

  return groups.sort((a, b) => a.gradeNum - b.gradeNum);
}
