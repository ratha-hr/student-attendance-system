import * as XLSX from 'xlsx';
import type { TeachingPlan, TeachingPlanGradeRow, ClassRoom, TeacherSettings } from '../types';

export interface MonthColDef {
  key: string;
  monthName: string;
  actualName: string;
}

export const TABLE_1_MONTHS: MonthColDef[] = [
  { key: 'dec', monthName: 'ខែធ្នូ', actualName: 'ចុងខែមករា' },
  { key: 'jan', monthName: 'ខែមករា', actualName: 'ចុងខែកុម្ភៈ' },
  { key: 'feb', monthName: 'ខែកុម្ភៈ', actualName: 'ចុងខែមីនា' },
];

export const TABLE_2_MONTHS: MonthColDef[] = [
  { key: 'mar', monthName: 'ខែមីនា', actualName: 'ចុងខែមេសា' },
  { key: 'apr', monthName: 'ខែមេសា', actualName: 'ចុងខែឧសភា' },
  { key: 'may', monthName: 'ខែឧសភា', actualName: 'ចុងខែមិថុនា' },
];

export const TABLE_3_MONTHS: MonthColDef[] = [
  { key: 'jun', monthName: 'ខែមិថុនា', actualName: 'ចុងខែកក្កដា' },
  { key: 'jul', monthName: 'ខែកក្កដា', actualName: 'ចុងខែសីហា' },
];

export const TABLE_4_MONTHS: MonthColDef[] = [
  { key: 'aug', monthName: 'ខែសីហា', actualName: 'ចុងខែកញ្ញា' },
  { key: 'sep', monthName: 'ខែកញ្ញា', actualName: 'ចុងឆ្នាំ' },
];

export const KHMER_MONTH_LIST = [
  'ខែមករា',
  'ខែកុម្ភៈ',
  'ខែមីនា',
  'ខែមេសា',
  'ខែឧសភា',
  'ខែមិថុនា',
  'ខែកក្កដា',
  'ខែសីហា',
  'ខែកញ្ញា',
  'ខែតុលា',
  'ខែវិច្ឆិកា',
  'ខែធ្នូ',
];

export function getNextKhmerMonth(monthName: string): string {
  const idx = KHMER_MONTH_LIST.indexOf(monthName);
  if (idx === -1) return monthName;
  return KHMER_MONTH_LIST[(idx + 1) % KHMER_MONTH_LIST.length];
}

export function generateMonthSequence(startMonthName: string): {
  table1: MonthColDef[];
  table2: MonthColDef[];
  table3: MonthColDef[];
  table4: MonthColDef[];
} {
  const startIdx = KHMER_MONTH_LIST.indexOf(startMonthName);
  const safeIdx = startIdx >= 0 ? startIdx : 11; // default 'ខែធ្នូ' (index 11)
  const keys = ['dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep'];

  const getCol = (offset: number, key: string, isLast: boolean = false): MonthColDef => {
    const curMonth = KHMER_MONTH_LIST[(safeIdx + offset) % 12];
    const nxtMonth = KHMER_MONTH_LIST[(safeIdx + offset + 1) % 12];
    return {
      key,
      monthName: curMonth,
      actualName: isLast ? 'ចុងឆ្នាំ' : `ចុង${nxtMonth}`,
    };
  };

  return {
    table1: [getCol(0, keys[0]), getCol(1, keys[1]), getCol(2, keys[2])],
    table2: [getCol(3, keys[3]), getCol(4, keys[4]), getCol(5, keys[5])],
    table3: [getCol(6, keys[6]), getCol(7, keys[7])],
    table4: [getCol(8, keys[8]), getCol(9, keys[9], true)],
  };
}

export function calculateBalancedPercentages(counts: number[], total: number): number[] {
  if (total <= 0) return counts.map(() => 0);
  const sumCounts = counts.reduce((a, b) => a + b, 0);
  if (sumCounts === 0) return counts.map(() => 0);

  // Unrounded percentages
  const rawPcts = counts.map((c) => Math.round((c / total) * 100));

  // If the sum of counts matches total, auto-balance so percentage sum is exactly 100%
  if (sumCounts === total) {
    return balancePctList(rawPcts);
  }

  // If sum of counts > 0 and raw percentage sum is slightly off (e.g. 99% or 101%)
  const pctSum = rawPcts.reduce((a, b) => a + b, 0);
  if (pctSum > 0 && Math.abs(100 - pctSum) <= 2 && sumCounts === total) {
    return balancePctList(rawPcts);
  }

  return rawPcts;
}

export function clearPlanAndActualData(plan: TeachingPlan): TeachingPlan {
  const clearedRows = plan.rows.map((row) => {
    const newMonthly: Record<
      string,
      { planCount: number; planPct: number; actualCount: number; actualPct: number }
    > = {};
    Object.keys(row.monthly || {}).forEach((k) => {
      newMonthly[k] = { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 };
    });
    // Ensure all 10 standard keys exist
    ['dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep'].forEach((k) => {
      newMonthly[k] = { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 };
    });
    return {
      ...row,
      baselineCount: 0,
      baselinePct: 0,
      monthly: newMonthly,
      yearEndActualCount: 0,
      yearEndActualPct: 0,
    };
  });

  return {
    ...plan,
    rows: clearedRows,
    updatedAt: new Date().toISOString(),
  };
}

export function isOldDummyPlan(plan: TeachingPlan): boolean {
  const rowA = plan.rows.find((r) => r.grade === 'A');
  if (!rowA) return false;
  // If dec or jan actualCount has the initial sample numbers 4 or 26
  const hasDummyMonthly = rowA.monthly?.dec?.actualCount === 4 || rowA.monthly?.jan?.actualCount === 26;
  // If baseline count has old mock numbers (e.g. A=3 or 1, or total baseline counts = 23 or 61 while monthly is 0)
  const baseCountSum = plan.rows.reduce((sum, r) => sum + (r.baselineCount || 0), 0);
  const hasDummyBaseline = baseCountSum === 61 || baseCountSum === 23;
  return hasDummyMonthly || hasDummyBaseline;
}

export const ALL_MONTH_KEYS = [
  ...TABLE_1_MONTHS,
  ...TABLE_2_MONTHS,
  ...TABLE_3_MONTHS,
  ...TABLE_4_MONTHS,
];

export const POPULAR_SUBJECTS = [
  'គណិតវិទ្យា',
  'ភាសាខ្មែរ',
  'រូបវិទ្យា',
  'គីមីវិទ្យា',
  'ជីវវិទ្យា',
  'ប្រវត្តិវិទ្យា',
  'ភូមិវិទ្យា',
  'ផែនដី និងបរិស្ថានវិទ្យា',
  'ពលរដ្ឋវិទ្យា',
  'ភាសាអង់គ្លេស',
  'ព័ត៌មានវិទ្យា',
  'សេដ្ឋកិច្ច',
  'កីឡា',
];

export type BenchmarkYearKey = 'year1' | 'year2' | 'year3' | 'year4' | 'year5' | 'year6';

export interface ModelSchoolBenchmark {
  yearName: string; // ឧ. ឆ្នាំទី១, ឆ្នាំទី២, ឆ្នាំទី៣, ឆ្នាំទី៤, ឆ្នាំទី៥, ឆ្នាំទី៦
  calendarYear: string; // 2026, 2027, 2028, 2029, 2030, 2031
  displayLabel: string; // ឆ្នាំទី១ (2026)
  yearKey: BenchmarkYearKey;
  targetABC: number; // 17%, 24%, 40%, 52%, 66%, 80%
  title: string;
  description: string;
  targets: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', number>; // Must sum to 100%
}

export const MODEL_SCHOOL_YEAR_KEYS: BenchmarkYearKey[] = [
  'year1',
  'year2',
  'year3',
  'year4',
  'year5',
  'year6',
];

export const MODEL_SCHOOL_TARGET_DATA: Record<
  BenchmarkYearKey,
  {
    yearName: string;
    targetABC: number;
    targets: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', number>;
  }
> = {
  year1: {
    yearName: 'ឆ្នាំទី១',
    targetABC: 17,
    targets: { A: 2, B: 5, C: 10, D: 10, E: 23, F: 50 }, // 2+5+10+10+23+50 = 100%
  },
  year2: {
    yearName: 'ឆ្នាំទី២',
    targetABC: 24,
    targets: { A: 4, B: 6, C: 14, D: 20, E: 26, F: 30 }, // 4+6+14+20+26+30 = 100%
  },
  year3: {
    yearName: 'ឆ្នាំទី៣',
    targetABC: 40,
    targets: { A: 8, B: 15, C: 17, D: 30, E: 20, F: 10 }, // 8+15+17+30+20+10 = 100%
  },
  year4: {
    yearName: 'ឆ្នាំទី៤',
    targetABC: 52,
    targets: { A: 12, B: 20, C: 20, D: 38, E: 10, F: 0 }, // 12+20+20+38+10+0 = 100%
  },
  year5: {
    yearName: 'ឆ្នាំទី៥',
    targetABC: 66,
    targets: { A: 16, B: 25, C: 25, D: 29, E: 5, F: 0 }, // 16+25+25+29+5+0 = 100%
  },
  year6: {
    yearName: 'ឆ្នាំទី៦',
    targetABC: 80,
    targets: { A: 20, B: 30, C: 30, D: 20, E: 0, F: 0 }, // 20+30+30+20+0+0 = 100%
  },
};

/**
 * Dynamically generate model school benchmarks given any Year 1 start year
 */
export function getModelSchoolBenchmarks(
  startYear: number = 2026
): Record<BenchmarkYearKey, ModelSchoolBenchmark> {
  const safeStart = !isNaN(startYear) && startYear >= 1900 ? startYear : 2026;
  const result = {} as Record<BenchmarkYearKey, ModelSchoolBenchmark>;

  MODEL_SCHOOL_YEAR_KEYS.forEach((yKey, index) => {
    const data = MODEL_SCHOOL_TARGET_DATA[yKey];
    const calYear = String(safeStart + index);
    const desc = `ក្រុមគោលដៅ ABC(${data.targetABC}%) | A: ${data.targets.A}%, B: ${data.targets.B}%, C: ${data.targets.C}%, D: ${data.targets.D}%, E: ${data.targets.E}%, F: ${data.targets.F}%`;
    result[yKey] = {
      yearName: data.yearName,
      calendarYear: calYear,
      displayLabel: `${data.yearName} (${calYear})`,
      yearKey: yKey,
      targetABC: data.targetABC,
      title: `ផែនការសាលារៀនគំរូ ${data.yearName} (${calYear})`,
      description: desc,
      targets: data.targets,
    };
  });

  return result;
}

export const MODEL_SCHOOL_BENCHMARKS: Record<BenchmarkYearKey, ModelSchoolBenchmark> =
  getModelSchoolBenchmarks(2026);

/**
 * Auto-balance an array of percentage numbers so their sum is exactly 100
 */
export function balancePctList(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum === 100 || sum === 0) return [...values];
  const diff = 100 - sum;
  const res = [...values];
  let maxIdx = 0;
  for (let i = 1; i < res.length; i++) {
    if (res[i] > res[maxIdx]) maxIdx = i;
  }
  res[maxIdx] = Math.max(0, res[maxIdx] + diff);
  return res;
}

export function createDefaultTeachingPlan(
  selectedClass?: ClassRoom | null,
  totalStudents: number = 61,
  femaleStudents: number = 36,
  settings?: TeacherSettings | null
): TeachingPlan {
  const className = selectedClass?.name || '៧ BS';
  const classId = selectedClass?.id || 'class-default';
  const academicYear = selectedClass?.academicYear || settings?.academicYear || '២០២៦-២០២៧';
  const subject = settings?.specialtySubject || 'គណិតវិទ្យា';

  // Clean default rows: all monthly plan and actual data initialized to 0
  const emptyMonthly = {
    dec: { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 },
    jan: { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 },
    feb: { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 },
    mar: { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 },
    apr: { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 },
    may: { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 },
    jun: { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 },
    jul: { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 },
    aug: { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 },
    sep: { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 },
  };

  const defaultRows: TeachingPlanGradeRow[] = [
    {
      grade: 'A',
      baselineCount: 0,
      baselinePct: 0,
      monthly: { ...emptyMonthly },
      yearEndTargetPct: 8,
    },
    {
      grade: 'B',
      baselineCount: 0,
      baselinePct: 0,
      monthly: { ...emptyMonthly },
      yearEndTargetPct: 15,
    },
    {
      grade: 'C',
      baselineCount: 0,
      baselinePct: 0,
      monthly: { ...emptyMonthly },
      yearEndTargetPct: 17,
    },
    {
      grade: 'D',
      baselineCount: 0,
      baselinePct: 0,
      monthly: { ...emptyMonthly },
      yearEndTargetPct: 30,
    },
    {
      grade: 'E',
      baselineCount: 0,
      baselinePct: 0,
      monthly: { ...emptyMonthly },
      yearEndTargetPct: 20,
    },
    {
      grade: 'F',
      baselineCount: 0,
      baselinePct: 0,
      monthly: { ...emptyMonthly },
      yearEndTargetPct: 10,
    },
  ];

  return {
    id: `plan_${classId}_${subject}_${academicYear}`,
    classId,
    className,
    subject,
    academicYear,
    schoolName: settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច',
    districtOffice: settings?.districtOffice || 'ការិ.អយកស្រុកកំពង់ត្រឡាច',
    teacherName: settings?.teacherName || 'ហ៊ុន ឡោ',
    teacherPhone: settings?.phone || '093486987',
    deputyDirectorName: 'ណាត សំណាង',
    deputyDirectorPhone: '012 925 739',
    totalStudents,
    femaleStudents,
    scoreScale: 'scale100',
    rows: defaultRows,
    monthCols: {
      table1: [...TABLE_1_MONTHS],
      table2: [...TABLE_2_MONTHS],
      table3: [...TABLE_3_MONTHS],
      table4: [...TABLE_4_MONTHS],
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Returns baseline data for a table block.
 * Per MoEYS requirements, baseline data for all quarters (គ្រប់ត្រីមាស) is taken directly
 * from the beginning-of-year diagnostic test (តេស្តដើមឆ្នាំ): row.baselineCount & row.baselinePct.
 */
export function getTableBaseline(
  _plan: TeachingPlan,
  _tableKey: 'table1' | 'table2' | 'table3' | 'table4',
  row: TeachingPlanGradeRow
): { count: number; pct: number } {
  return {
    count: row.baselineCount ?? 0,
    pct: row.baselinePct ?? 0,
  };
}

/**
 * Calculates sum and percentage for a column of counts
 */
export function calculateTotals(
  rows: TeachingPlanGradeRow[],
  getCount: (row: TeachingPlanGradeRow) => number,
  getPct: (row: TeachingPlanGradeRow) => number
) {
  let countSum = 0;
  let pctSum = 0;
  rows.forEach((r) => {
    countSum += getCount(r) || 0;
    pctSum += getPct(r) || 0;
  });
  return { countSum, pctSum };
}

/**
 * Exports teaching plan to Excel (.xlsx) matching the official template format
 */
export function exportTeachingPlanToExcel(plan: TeachingPlan) {
  const wb = XLSX.utils.book_new();

  const aoa: any[][] = [];
  const merges: XLSX.Range[] = [];

  // Title & Kingdom Header
  aoa.push(['', '', '', '', '', '', 'ព្រះរាជាណាចក្រកម្ពុជា']);
  merges.push({ s: { r: 0, c: 6 }, e: { r: 0, c: 10 } });

  aoa.push(['', '', '', '', '', '', 'ជាតិ សាសនា ព្រះមហាក្សត្រ']);
  merges.push({ s: { r: 1, c: 6 }, e: { r: 1, c: 10 } });

  aoa.push([plan.districtOffice]);
  aoa.push([plan.schoolName]);
  aoa.push([]);

  aoa.push([
    '',
    '',
    `ផែនការបង្រៀនប្រចាំឆ្នាំរបស់គ្រូ មុខវិជ្ជា ${plan.subject} ( ឆ្នាំសិក្សា${plan.academicYear} )`,
  ]);
  merges.push({ s: { r: 5, c: 2 }, e: { r: 5, c: 13 } });
  aoa.push([]);

  // Meta Info
  aoa.push(['ឈ្មោះសាលា:', plan.schoolName]);
  aoa.push([
    'ថ្នាក់ទី:',
    plan.className,
    '',
    'ចំនួនសិស្ស សរុប:',
    plan.totalStudents,
    'នាក់',
    'ស្រី',
    plan.femaleStudents,
    'នាក់',
  ]);
  aoa.push(['ឈ្មោះគ្រូ:', plan.teacherName, '', 'លេខទូរស័ព្ទ:', plan.teacherPhone]);
  aoa.push([
    'ឈ្មោះនាយករងបច្ចេកទេស:',
    plan.deputyDirectorName,
    '',
    'លេខទូរស័ព្ទ:',
    plan.deputyDirectorPhone,
  ]);
  aoa.push([
    'កម្រិតពិន្ទុ:',
    'F ក្រោម៥០ពិន្ទុ',
    'E ពី៥១-៦០ពិន្ទុ',
    'D ពី៦១-៧០ពិន្ទុ',
    'C ពី៧១-៧៩ពិន្ទុ',
    'B ពី៨០-៨៩ពិន្ទុ',
    'A ពី៩០-១០០ពិន្ទុ',
  ]);
  aoa.push([
    'កម្រិតពិន្ទុ:',
    'F ក្រោម 25ពិន្ទុ',
    'E ពី 25-29ពិន្ទុ',
    'D ពី 30-34ពិន្ទុ',
    'C ពី 35-39ពិន្ទុ',
    'B ពី 40-44ពិន្ទុ',
    'A ពី 45-50ពិន្ទុ',
  ]);
  aoa.push([]);

  // Helper to append a table with exact 3-tier headers and cell merges
  const appendTable = (
    title: string,
    months: MonthColDef[],
    tableKey: 'table1' | 'table2' | 'table3' | 'table4'
  ) => {
    const startRow = aoa.length;
    // Standard 16 columns across all tables: Grade(1) + Baseline(2) + 3 Months(12) + Target(1) = 16
    const totalCols = 16;
    const lastColIdx = 15;

    // Row 0 of table: Banner
    const bannerRow = new Array(totalCols).fill('');
    bannerRow[0] = `ចំនួន និងភាគរយ ${plan.subject}`;
    aoa.push(bannerRow);
    merges.push({ s: { r: startRow, c: 0 }, e: { r: startRow, c: lastColIdx } });

    // Row 1 of table: Tier 1
    const r1 = new Array(totalCols).fill('');
    r1[0] = 'និទ្ទេស';
    r1[1] = 'ទិន្នន័យ មូលដ្ឋាន';
    months.forEach((m, mi) => {
      r1[3 + mi * 4] = m.monthName;
    });
    r1[lastColIdx] = 'ចំនួន % ចុងឆ្នាំសិក្សា';
    aoa.push(r1);

    // Merges for Row 1:
    // និទ្ទេស spans rows startRow+1 to startRow+3, col 0
    merges.push({ s: { r: startRow + 1, c: 0 }, e: { r: startRow + 3, c: 0 } });
    // ទិន្នន័យ មូលដ្ឋាន spans rows startRow+1 to startRow+2, cols 1 to 2
    merges.push({ s: { r: startRow + 1, c: 1 }, e: { r: startRow + 2, c: 2 } });
    // Each month spans row startRow+1, cols 3+mi*4 to 3+mi*4+3
    months.forEach((_, mi) => {
      merges.push({
        s: { r: startRow + 1, c: 3 + mi * 4 },
        e: { r: startRow + 1, c: 3 + mi * 4 + 3 },
      });
    });
    // ចំនួន % ចុងឆ្នាំសិក្សា spans rows startRow+1 to startRow+3, col lastColIdx
    merges.push({ s: { r: startRow + 1, c: lastColIdx }, e: { r: startRow + 3, c: lastColIdx } });

    // Row 2 of table: Tier 2
    const r2 = new Array(totalCols).fill('');
    months.forEach((m, mi) => {
      r2[3 + mi * 4] = 'ផែនការ';
      r2[3 + mi * 4 + 2] = m.actualName;
    });
    aoa.push(r2);

    // Merges for Row 2:
    months.forEach((_, mi) => {
      merges.push({
        s: { r: startRow + 2, c: 3 + mi * 4 },
        e: { r: startRow + 2, c: 3 + mi * 4 + 1 },
      });
      merges.push({
        s: { r: startRow + 2, c: 3 + mi * 4 + 2 },
        e: { r: startRow + 2, c: 3 + mi * 4 + 3 },
      });
    });

    // Row 3 of table: Tier 3
    const r3 = new Array(totalCols).fill('');
    r3[1] = 'ចំនួន';
    r3[2] = '%';
    months.forEach((_, mi) => {
      r3[3 + mi * 4] = 'ចំនួន';
      r3[3 + mi * 4 + 1] = '%';
      r3[3 + mi * 4 + 2] = 'ចំនួន';
      r3[3 + mi * 4 + 3] = '%';
    });
    aoa.push(r3);

    // Data rows
    plan.rows.forEach((r) => {
      const dataRow = new Array(totalCols).fill('');
      dataRow[0] = r.grade;
      const base = getTableBaseline(plan, tableKey, r);
      dataRow[1] = base.count;
      dataRow[2] = `${base.pct}%`;
      months.forEach((m, mi) => {
        const d = r.monthly[m.key] || { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 };
        dataRow[3 + mi * 4] = d.planCount;
        dataRow[3 + mi * 4 + 1] = `${d.planPct}%`;
        dataRow[3 + mi * 4 + 2] = d.actualCount;
        dataRow[3 + mi * 4 + 3] = `${d.actualPct}%`;
      });
      dataRow[lastColIdx] = `${r.yearEndTargetPct}%`;
      aoa.push(dataRow);
    });

    // Sum row
    const sumRow = new Array(totalCols).fill('');
    sumRow[0] = 'សរុប';
    let baseCountSum = 0;
    let basePctSum = 0;
    plan.rows.forEach((r) => {
      const base = getTableBaseline(plan, tableKey, r);
      baseCountSum += base.count;
      basePctSum += base.pct;
    });
    sumRow[1] = baseCountSum;
    sumRow[2] = `${basePctSum}%`;

    months.forEach((m, mi) => {
      let pcSum = 0;
      let ppSum = 0;
      let acSum = 0;
      let apSum = 0;
      plan.rows.forEach((r) => {
        const d = r.monthly[m.key] || { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 };
        pcSum += d.planCount;
        ppSum += d.planPct;
        acSum += d.actualCount;
        apSum += d.actualPct;
      });
      sumRow[3 + mi * 4] = pcSum;
      sumRow[3 + mi * 4 + 1] = `${ppSum}%`;
      sumRow[3 + mi * 4 + 2] = acSum;
      sumRow[3 + mi * 4 + 3] = `${apSum}%`;
    });

    let targetPctSum = 0;
    plan.rows.forEach((r) => {
      targetPctSum += r.yearEndTargetPct;
    });
    sumRow[lastColIdx] = `${targetPctSum}%`;
    aoa.push(sumRow);
    aoa.push([]);
  };

  // Table 1
  appendTable('តារាងទី ១', plan.monthCols?.table1 || TABLE_1_MONTHS, 'table1');
  // Table 2
  appendTable('តារាងទី ២', plan.monthCols?.table2 || TABLE_2_MONTHS, 'table2');
  // Table 3
  appendTable('តារាងទី ៣', plan.monthCols?.table3 || TABLE_3_MONTHS, 'table3');
  // Table 4
  appendTable('តារាងទី ៤', plan.monthCols?.table4 || TABLE_4_MONTHS, 'table4');

  // Bottom signatures
  aoa.push([]);
  aoa.push(['បានឃើញ និងឯកភាព', '', '', '', '', '', '', '', '', '', 'ថ្ងៃទី...........ខែ...........ឆ្នាំ២០២...']);
  aoa.push(['នាយករងបច្ចេកទេស', '', '', '', '', '', '', '', '', '', 'គ្រូបង្រៀនមុខវិជ្ជា']);
  aoa.push([]);
  aoa.push([]);
  aoa.push([plan.deputyDirectorName, '', '', '', '', '', '', '', '', '', plan.teacherName]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;

  // Set equal and balanced column widths across all 16 columns
  ws['!cols'] = [
    { wch: 8 },  // Grade
    { wch: 8 },  // Baseline Count
    { wch: 7 },  // Baseline %
    { wch: 8 },  // M1 Plan Count
    { wch: 7 },  // M1 Plan %
    { wch: 8 },  // M1 Actual Count
    { wch: 7 },  // M1 Actual %
    { wch: 8 },  // M2 Plan Count
    { wch: 7 },  // M2 Plan %
    { wch: 8 },  // M2 Actual Count
    { wch: 7 },  // M2 Actual %
    { wch: 8 },  // M3 Plan Count
    { wch: 7 },  // M3 Plan %
    { wch: 8 },  // M3 Actual Count
    { wch: 7 },  // M3 Actual %
    { wch: 14 }, // Target %
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'ផែនការបង្រៀន');

  const fileName = `ផែនការបង្រៀន_${plan.subject}_${plan.className.replace(/\s+/g, '_')}_${plan.academicYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
