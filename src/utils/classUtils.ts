import type { ClassRoom, ClassStream } from '../types';
import { toKhmerNum } from './dateUtils';

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
 * Split configurations for High School Grade 11 & 12:
 * Grade 11:
 * - Science (11A - 11E)
 * - Social Science (11F - 11J)
 * Grade 12:
 * - Science (12A - 12F)
 * - Social Science (12G - 12M)
 */
export const HIGH_SCHOOL_STREAM_CONFIGS = {
  grade11Science: ['A', 'B', 'C', 'D', 'E'],
  grade11Social: ['F', 'G', 'H', 'I', 'J'],
  grade12Science: ['A', 'B', 'C', 'D', 'E', 'F'],
  grade12Social: ['G', 'H', 'I', 'J', 'K', 'L', 'M'],
};

/**
 * Determine the stream (វិទ្យាសាស្ត្រ ឬ វិទ្យាសាស្ត្រសង្គម) for a class
 */
export function getStreamForClass(
  grade: string | undefined,
  name: string,
  explicitStream?: ClassStream
): ClassStream {
  if (explicitStream && explicitStream !== 'general') {
    return explicitStream;
  }
  const gNum = parseGradeNumber(grade || name);
  if (gNum !== 11 && gNum !== 12) {
    return 'general';
  }

  // Extract letter from name (e.g. 11A, 11F, 12B, 12M)
  const upper = name.toUpperCase();
  const match = upper.match(/([A-Z])(?:\b|$|\s)/);
  const letter = match ? match[1] : '';

  if (gNum === 11) {
    if (HIGH_SCHOOL_STREAM_CONFIGS.grade11Science.includes(letter)) return 'science';
    if (HIGH_SCHOOL_STREAM_CONFIGS.grade11Social.includes(letter)) return 'social';
  } else if (gNum === 12) {
    if (HIGH_SCHOOL_STREAM_CONFIGS.grade12Science.includes(letter)) return 'science';
    if (HIGH_SCHOOL_STREAM_CONFIGS.grade12Social.includes(letter)) return 'social';
  }

  // Check if Khmer text indicates stream
  if (name.includes('សង្គម')) return 'social';
  if (name.includes('វិទ្យាសាស្ត្រ') || name.includes('វិទ្យា')) return 'science';

  return explicitStream || 'science';
}

export function getStreamBadge(stream: ClassStream): {
  label: string;
  badgeKh: string;
  colorClass: string;
  icon: string;
} {
  if (stream === 'science') {
    return {
      label: 'ថ្នាក់វិទ្យាសាស្ត្រ',
      badgeKh: 'វិទ្យាសាស្ត្រ',
      colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      icon: '🔬',
    };
  }
  if (stream === 'social') {
    return {
      label: 'ថ្នាក់វិទ្យាសាស្ត្រសង្គម',
      badgeKh: 'វិទ្យាសាស្ត្រសង្គម',
      colorClass: 'bg-amber-50 text-amber-900 border-amber-300',
      icon: '📚',
    };
  }
  return {
    label: 'ចំណេះទូទៅ',
    badgeKh: 'ទូទៅ',
    colorClass: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: '🎓',
  };
}

const DEFAULT_HOMEROOM_TEACHERS = [
  'ហ៊ុន រដ្ឋា',
  'ស៊ឹម វីរៈ',
  'ចាន់ សុផល',
  'កែវ សារ៉ាត់',
  'ហេង វិបុល',
  'សុខ សារឿន',
  'អ៊ុំ វ៉ាន់ដា',
  'ម៉ៅ ចំរើន',
  'លឹម គឹមហៀង',
  'ទិត្យ ស្រីមុំ',
  'ជា ស្រីពៅ',
  'អ៊ិន សោភា',
];

/**
 * Generate standard 49 classes:
 * 7A-E (5), 8A-E (5), 9A-D (4), 10A-L (12), 11A-J (10: 5 វិទ្យាសាស្ត្រ, 5 សង្គម), 12A-M (13: 6 វិទ្យាសាស្ត្រ, 7 សង្គម)
 * With assigned homeroom teachers (គ្រូទទួលបន្ទុក) and distinct streams for Grades 11 and 12.
 */
export function generateStandardClasses(academicYear = '២០២៤-២០២៥'): ClassRoom[] {
  const result: ClassRoom[] = [];
  let teacherCounter = 0;

  STANDARD_CLASS_CONFIGS.forEach((cfg) => {
    cfg.letters.forEach((letter, idx) => {
      const id = idx === 0 ? cfg.mainId : `class-${cfg.grade}-${letter.toLowerCase()}`;
      // Grade 7A is primary class of teacher Hun Ratha
      const homeroomTeacher = (cfg.grade === '7' && letter === 'A')
        ? 'ហ៊ុន រដ្ឋា'
        : DEFAULT_HOMEROOM_TEACHERS[teacherCounter % DEFAULT_HOMEROOM_TEACHERS.length];
      teacherCounter++;

      const stream = getStreamForClass(cfg.grade, `${cfg.grade}${letter}`);
      const streamInfo = getStreamBadge(stream);

      result.push({
        id,
        name: `ថ្នាក់ទី ${cfg.grade}${letter}`,
        grade: cfg.grade,
        academicYear,
        stream,
        homeroomTeacher,
        description: `ថ្នាក់ ${cfg.grade}${letter} (${cfg.grade === '11' || cfg.grade === '12' ? streamInfo.label : cfg.levelLabel})`,
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
    const label = !isNaN(num) ? `ថ្នាក់ទី ${toKhmerNum(key)}` : key;
    groups.push({
      grade: key,
      gradeNum: isNaN(num) ? 999 : num,
      label,
      classes: items,
    });
  });

  return groups.sort((a, b) => a.gradeNum - b.gradeNum);
}
