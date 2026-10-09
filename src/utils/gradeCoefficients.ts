// MoEYS Standard Grading Configuration (Exact replica of Image 3)

export interface SubjectScoreRule {
  id: string;
  name: string;
  maxScore: number;
  coefficient: number;
}

export type GradeTrackKey =
  | '7-8'
  | '9'
  | '10'
  | '11-sci'
  | '11-soc'
  | '12-sci'
  | '12-soc';

export interface GradeTrackDef {
  key: GradeTrackKey;
  label: string;
  shortLabel: string;
}

export const GRADE_TRACKS: GradeTrackDef[] = [
  { key: '7-8', label: 'ថ្នាក់ទី ៧-៨', shortLabel: '៧-៨' },
  { key: '9', label: 'ថ្នាក់ទី ៩ (ឌីប្លូម)', shortLabel: '៩' },
  { key: '10', label: 'ថ្នាក់ទី ១០', shortLabel: '១០' },
  { key: '11-sci', label: 'ថ្នាក់ទី ១១ វិទ្យាសាស្ត្រពិត', shortLabel: '១១ វិ.ពិត' },
  { key: '11-soc', label: 'ថ្នាក់ទី ១១ វិទ្យាសាស្ត្រសង្គម', shortLabel: '១១ វិ.សង្គម' },
  { key: '12-sci', label: 'ថ្នាក់ទី ១២ វិទ្យាសាស្ត្រពិត (បាក់ឌុប)', shortLabel: '១២ វិ.ពិត' },
  { key: '12-soc', label: 'ថ្នាក់ទី ១២ វិទ្យាសាស្ត្រសង្គម (បាក់ឌុប)', shortLabel: '១២ វិ.សង្គម' },
];

export interface SubjectDef {
  id: string;
  name: string;
}

export const ALL_SUBJECTS: SubjectDef[] = [
  { id: 'khmer', name: 'ភាសាខ្មែរ' },
  { id: 'civics', name: 'សីលធម៌-ពលរដ្ឋ' },
  { id: 'history', name: 'ប្រវត្តិវិទ្យា' },
  { id: 'geography', name: 'ភូមិវិទ្យា' },
  { id: 'math', name: 'គណិតវិទ្យា' },
  { id: 'physics', name: 'រូបវិទ្យា' },
  { id: 'chem', name: 'គីមីវិទ្យា' },
  { id: 'bio', name: 'ជីវវិទ្យា' },
  { id: 'earth', name: 'ផែនដីវិទ្យា' },
  { id: 'english', name: 'អង់គ្លេស' },
  { id: 'sport', name: 'អប់រំកាយ' },
  { id: 'agri', name: 'កសិកម្ម' },
  { id: 'health', name: 'សុខភាព' },
  { id: 'ict', name: 'ICT' },
  { id: 'art', name: 'សិល្បៈ' },
  { id: 'env', name: 'បរិស្ថាន' },
];

// Default Matrix from Image 3: [subjectId]: { [trackKey]: { maxScore, coefficient } }
export const DEFAULT_GRADE_MATRIX: Record<
  string,
  Partial<Record<GradeTrackKey, { maxScore: number; coefficient: number }>>
> = {
  khmer: {
    '7-8': { maxScore: 100, coefficient: 2 },
    '9': { maxScore: 100, coefficient: 2 },
    '10': { maxScore: 150, coefficient: 3 },
    '11-sci': { maxScore: 75, coefficient: 1.5 },
    '11-soc': { maxScore: 125, coefficient: 2.5 },
    '12-sci': { maxScore: 75, coefficient: 1.5 },
    '12-soc': { maxScore: 125, coefficient: 2.5 },
  },
  civics: {
    '7-8': { maxScore: 50, coefficient: 1 },
    '9': { maxScore: 35, coefficient: 0.7 },
    '10': { maxScore: 38, coefficient: 0.8 },
    '11-sci': { maxScore: 50, coefficient: 1 },
    '11-soc': { maxScore: 75, coefficient: 1.5 },
    '12-sci': { maxScore: 50, coefficient: 1 },
    '12-soc': { maxScore: 75, coefficient: 1.5 },
  },
  history: {
    '7-8': { maxScore: 50, coefficient: 1 },
    '9': { maxScore: 33, coefficient: 0.7 },
    '10': { maxScore: 37, coefficient: 0.7 },
    '11-sci': { maxScore: 50, coefficient: 1 },
    '11-soc': { maxScore: 75, coefficient: 1.5 },
    '12-sci': { maxScore: 50, coefficient: 1 },
    '12-soc': { maxScore: 75, coefficient: 1.5 },
  },
  geography: {
    '7-8': { maxScore: 50, coefficient: 1 },
    '9': { maxScore: 32, coefficient: 0.6 },
    '10': { maxScore: 38, coefficient: 0.8 },
    '11-sci': { maxScore: 50, coefficient: 1 },
    '11-soc': { maxScore: 75, coefficient: 1.5 },
    '12-sci': { maxScore: 50, coefficient: 1 },
    '12-soc': { maxScore: 75, coefficient: 1.5 },
  },
  math: {
    '7-8': { maxScore: 100, coefficient: 2 },
    '9': { maxScore: 100, coefficient: 2 },
    '10': { maxScore: 150, coefficient: 3 },
    '11-sci': { maxScore: 125, coefficient: 2.5 },
    '11-soc': { maxScore: 75, coefficient: 1.5 },
    '12-sci': { maxScore: 125, coefficient: 2.5 },
    '12-soc': { maxScore: 75, coefficient: 1.5 },
  },
  physics: {
    '7-8': { maxScore: 50, coefficient: 1 },
    '9': { maxScore: 35, coefficient: 0.7 },
    '10': { maxScore: 50, coefficient: 1 },
    '11-sci': { maxScore: 75, coefficient: 1.5 },
    '11-soc': { maxScore: 50, coefficient: 1 },
    '12-sci': { maxScore: 75, coefficient: 1.5 },
    '12-soc': { maxScore: 50, coefficient: 1 },
  },
  chem: {
    '7-8': { maxScore: 50, coefficient: 1 },
    '9': { maxScore: 25, coefficient: 0.5 },
    '10': { maxScore: 37, coefficient: 0.7 },
    '11-sci': { maxScore: 75, coefficient: 1.5 },
    '11-soc': { maxScore: 50, coefficient: 1 },
    '12-sci': { maxScore: 75, coefficient: 1.5 },
    '12-soc': { maxScore: 50, coefficient: 1 },
  },
  bio: {
    '7-8': { maxScore: 50, coefficient: 1 },
    '9': { maxScore: 35, coefficient: 0.7 },
    '10': { maxScore: 38, coefficient: 0.8 },
    '11-sci': { maxScore: 75, coefficient: 1.5 },
    '11-soc': { maxScore: 50, coefficient: 1 },
    '12-sci': { maxScore: 75, coefficient: 1.5 },
    '12-soc': { maxScore: 50, coefficient: 1 },
  },
  earth: {
    '7-8': { maxScore: 50, coefficient: 1 },
    '9': { maxScore: 25, coefficient: 0.5 },
    '10': { maxScore: 25, coefficient: 0.5 },
    '11-sci': { maxScore: 50, coefficient: 1 },
    '11-soc': { maxScore: 50, coefficient: 1 },
    '12-sci': { maxScore: 50, coefficient: 1 },
    '12-soc': { maxScore: 50, coefficient: 1 },
  },
  english: {
    '7-8': { maxScore: 50, coefficient: 1 },
    '9': { maxScore: 50, coefficient: 1 },
    '10': { maxScore: 100, coefficient: 2 },
    '11-sci': { maxScore: 50, coefficient: 1 },
    '11-soc': { maxScore: 50, coefficient: 1 },
    '12-sci': { maxScore: 50, coefficient: 1 },
    '12-soc': { maxScore: 50, coefficient: 1 },
  },
  sport: {
    '7-8': { maxScore: 50, coefficient: 1 },
  },
  agri: {
    '7-8': { maxScore: 50, coefficient: 1 },
  },
  health: {
    '7-8': { maxScore: 50, coefficient: 1 },
  },
  ict: {},
  art: {
    '7-8': { maxScore: 50, coefficient: 1 },
  },
  env: {
    '7-8': { maxScore: 50, coefficient: 1 },
  },
};

// Percentage Cutoffs table from Image 3 (Table 2)
export const MAX_SCORE_PERCENTAGE_TABLE = [
  { max: 25, f: 0.0, e: 12.5, d: 15.0, c: 17.5, b: 20.0, a: 22.5 },
  { max: 32, f: 0.0, e: 16.0, d: 19.2, c: 22.4, b: 25.6, a: 28.8 },
  { max: 33, f: 0.0, e: 16.5, d: 19.8, c: 23.1, b: 26.4, a: 29.7 },
  { max: 34, f: 0.0, e: 17.0, d: 20.4, c: 23.8, b: 27.2, a: 30.6 },
  { max: 35, f: 0.0, e: 17.5, d: 21.0, c: 24.5, b: 28.0, a: 31.5 },
  { max: 37, f: 0.0, e: 18.5, d: 22.2, c: 25.9, b: 29.6, a: 33.3 },
  { max: 38, f: 0.0, e: 19.0, d: 22.8, c: 26.6, b: 30.4, a: 34.2 },
  { max: 50, f: 0.0, e: 25.0, d: 30.0, c: 35.0, b: 40.0, a: 45.0 },
  { max: 75, f: 0.0, e: 37.5, d: 45.0, c: 52.5, b: 60.0, a: 67.5 },
  { max: 100, f: 0.0, e: 50.0, d: 60.0, c: 70.0, b: 80.0, a: 90.0 },
  { max: 125, f: 0.0, e: 62.5, d: 75.0, c: 87.5, b: 100.0, a: 112.5 },
  { max: 150, f: 0.0, e: 75.0, d: 90.0, c: 105.0, b: 120.0, a: 135.0 },
];

/**
 * Determine track key from class name or grade number
 */
export function resolveGradeTrack(className: string, gradeStr: string): GradeTrackKey {
  const g = parseInt(gradeStr, 10);
  const name = className.toLowerCase();

  if (g === 7 || g === 8 || name.includes('៧') || name.includes('៨')) return '7-8';
  if (g === 9 || name.includes('៩')) return '9';
  if (g === 10 || name.includes('១០')) return '10';

  if (g === 11 || name.includes('១១')) {
    if (name.includes('សង្គម') || name.includes('soc')) return '11-soc';
    return '11-sci';
  }

  if (g === 12 || name.includes('១២')) {
    if (name.includes('សង្គម') || name.includes('soc')) return '12-soc';
    return '12-sci';
  }

  return '7-8';
}

/**
 * Get active subjects for a specific track, applying user custom overrides if any
 */
export function getTrackSubjects(
  trackKey: GradeTrackKey,
  customOverrides?: Record<string, Record<string, { maxScore: number; coefficient: number }>>
): SubjectScoreRule[] {
  const list: SubjectScoreRule[] = [];

  ALL_SUBJECTS.forEach((sub) => {
    // Check custom override first, then default matrix
    const custom = customOverrides?.[sub.id]?.[trackKey];
    const def = DEFAULT_GRADE_MATRIX[sub.id]?.[trackKey];
    const rule = custom || def;

    if (rule && rule.coefficient > 0) {
      list.push({
        id: sub.id,
        name: sub.name,
        maxScore: rule.maxScore,
        coefficient: rule.coefficient,
      });
    }
  });

  return list;
}

/**
 * Letter Grade Calculation from Percentage based on Image 3 Table 2
 */
export function calculateLetterMention(percentage: number): {
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  khmerLabel: string;
  badgeClass: string;
} {
  if (percentage >= 90) {
    return { grade: 'A', khmerLabel: 'និទ្ទេស A (ល្អប្រសើរ)', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  }
  if (percentage >= 80) {
    return { grade: 'B', khmerLabel: 'និទ្ទេស B (ល្អណាស់)', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' };
  }
  if (percentage >= 70) {
    return { grade: 'C', khmerLabel: 'និទ្ទេស C (ល្អ)', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
  }
  if (percentage >= 60) {
    return { grade: 'D', khmerLabel: 'និទ្ទេស D (ល្អបង្គួរ)', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' };
  }
  if (percentage >= 50) {
    return { grade: 'E', khmerLabel: 'និទ្ទេស E (មធ្យម / ជាប់)', badgeClass: 'bg-orange-100 text-orange-800 border-orange-300' };
  }
  return { grade: 'F', khmerLabel: 'និទ្ទេស F (ធ្លាក់)', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' };
}
