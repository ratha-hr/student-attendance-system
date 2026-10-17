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
  { key: 'jul', monthName: 'ខែកក្កដា', actualName: 'ចុងឆ្នាំ' },
];

export const ALL_MONTH_KEYS = [
  ...TABLE_1_MONTHS,
  ...TABLE_2_MONTHS,
  ...TABLE_3_MONTHS,
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

export function createDefaultTeachingPlan(
  selectedClass?: ClassRoom | null,
  totalStudents: number = 61,
  femaleStudents: number = 36,
  settings?: TeacherSettings | null
): TeachingPlan {
  const className = selectedClass?.name || '៧ BS';
  const classId = selectedClass?.id || 'class-default';
  const academicYear = selectedClass?.academicYear || settings?.academicYear || '២០២៤-២០២៥';
  const subject = settings?.specialtySubject || 'គណិតវិទ្យា';

  const defaultRows: TeachingPlanGradeRow[] = [
    {
      grade: 'A',
      baselineCount: 3,
      baselinePct: 5,
      monthly: {
        dec: { planCount: 1, planPct: 2, actualCount: 4, actualPct: 7 },
        jan: { planCount: 2, planPct: 3, actualCount: 26, actualPct: 43 },
        feb: { planCount: 5, planPct: 8, actualCount: 11, actualPct: 18 },
        mar: { planCount: 1, planPct: 2, actualCount: 0, actualPct: 0 },
        apr: { planCount: 2, planPct: 3, actualCount: 0, actualPct: 0 },
        may: { planCount: 5, planPct: 8, actualCount: 0, actualPct: 0 },
        jun: { planCount: 3, planPct: 5, actualCount: 0, actualPct: 0 },
        jul: { planCount: 5, planPct: 8, actualCount: 0, actualPct: 0 },
      },
      yearEndTargetPct: 8,
    },
    {
      grade: 'B',
      baselineCount: 4,
      baselinePct: 7,
      monthly: {
        dec: { planCount: 2, planPct: 3, actualCount: 12, actualPct: 20 },
        jan: { planCount: 4, planPct: 7, actualCount: 8, actualPct: 13 },
        feb: { planCount: 9, planPct: 15, actualCount: 12, actualPct: 20 },
        mar: { planCount: 2, planPct: 3, actualCount: 0, actualPct: 0 },
        apr: { planCount: 4, planPct: 7, actualCount: 0, actualPct: 0 },
        may: { planCount: 9, planPct: 15, actualCount: 0, actualPct: 0 },
        jun: { planCount: 6, planPct: 10, actualCount: 0, actualPct: 0 },
        jul: { planCount: 9, planPct: 15, actualCount: 0, actualPct: 0 },
      },
      yearEndTargetPct: 15,
    },
    {
      grade: 'C',
      baselineCount: 4,
      baselinePct: 7,
      monthly: {
        dec: { planCount: 3, planPct: 5, actualCount: 16, actualPct: 26 },
        jan: { planCount: 5, planPct: 8, actualCount: 9, actualPct: 15 },
        feb: { planCount: 11, planPct: 18, actualCount: 5, actualPct: 8 },
        mar: { planCount: 3, planPct: 5, actualCount: 0, actualPct: 0 },
        apr: { planCount: 5, planPct: 8, actualCount: 0, actualPct: 0 },
        may: { planCount: 11, planPct: 18, actualCount: 0, actualPct: 0 },
        jun: { planCount: 8, planPct: 13, actualCount: 0, actualPct: 0 },
        jul: { planCount: 10, planPct: 16, actualCount: 0, actualPct: 0 },
      },
      yearEndTargetPct: 17,
    },
    {
      grade: 'D',
      baselineCount: 8,
      baselinePct: 13,
      monthly: {
        dec: { planCount: 5, planPct: 8, actualCount: 7, actualPct: 11 },
        jan: { planCount: 15, planPct: 25, actualCount: 5, actualPct: 8 },
        feb: { planCount: 18, planPct: 30, actualCount: 14, actualPct: 23 },
        mar: { planCount: 5, planPct: 8, actualCount: 0, actualPct: 0 },
        apr: { planCount: 15, planPct: 25, actualCount: 0, actualPct: 0 },
        may: { planCount: 18, planPct: 30, actualCount: 0, actualPct: 0 },
        jun: { planCount: 18, planPct: 30, actualCount: 0, actualPct: 0 },
        jul: { planCount: 18, planPct: 30, actualCount: 0, actualPct: 0 },
      },
      yearEndTargetPct: 30,
    },
    {
      grade: 'E',
      baselineCount: 16,
      baselinePct: 26,
      monthly: {
        dec: { planCount: 39, planPct: 64, actualCount: 12, actualPct: 20 },
        jan: { planCount: 26, planPct: 43, actualCount: 4, actualPct: 7 },
        feb: { planCount: 12, planPct: 20, actualCount: 9, actualPct: 15 },
        mar: { planCount: 39, planPct: 64, actualCount: 0, actualPct: 0 },
        apr: { planCount: 26, planPct: 43, actualCount: 0, actualPct: 0 },
        may: { planCount: 12, planPct: 20, actualCount: 0, actualPct: 0 },
        jun: { planCount: 15, planPct: 25, actualCount: 0, actualPct: 0 },
        jul: { planCount: 13, planPct: 21, actualCount: 0, actualPct: 0 },
      },
      yearEndTargetPct: 20,
    },
    {
      grade: 'F',
      baselineCount: 26,
      baselinePct: 43,
      monthly: {
        dec: { planCount: 11, planPct: 18, actualCount: 8, actualPct: 13 },
        jan: { planCount: 9, planPct: 15, actualCount: 8, actualPct: 13 },
        feb: { planCount: 6, planPct: 10, actualCount: 8, actualPct: 13 },
        mar: { planCount: 11, planPct: 18, actualCount: 0, actualPct: 0 },
        apr: { planCount: 9, planPct: 15, actualCount: 0, actualPct: 0 },
        may: { planCount: 6, planPct: 10, actualCount: 0, actualPct: 0 },
        jun: { planCount: 11, planPct: 17, actualCount: 0, actualPct: 0 },
        jul: { planCount: 6, planPct: 10, actualCount: 0, actualPct: 0 },
      },
      yearEndTargetPct: 10,
    },
  ];

  return {
    id: `plan_${classId}_${subject}_${academicYear}`,
    classId,
    className,
    subject,
    academicYear,
    schoolName: settings?.schoolName || 'វិ.ហ៊ុនសែនកំពង់ត្រឡាច',
    districtOffice: 'ការិ.អយកស្រុកកំពង់ត្រឡាច',
    teacherName: settings?.teacherName || 'ហ៊ុន ឡោ',
    teacherPhone: settings?.phone || '093486987',
    deputyDirectorName: 'ណាត សំណាង',
    deputyDirectorPhone: '012 925 739',
    totalStudents,
    femaleStudents,
    scoreScale: 'scale100',
    rows: defaultRows,
    updatedAt: new Date().toISOString(),
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

  // Title & Kingdom Header
  aoa.push(['', '', '', '', 'ព្រះរាជាណាចក្រកម្ពុជា']);
  aoa.push(['', '', '', '', 'ជាតិ សាសនា ព្រះមហាក្សត្រ']);
  aoa.push([plan.districtOffice]);
  aoa.push([plan.schoolName]);
  aoa.push([]);
  aoa.push([
    '',
    '',
    `ផែនការបង្រៀនប្រចាំឆ្នាំរបស់គ្រូ មុខវិជ្ជា ${plan.subject} (ឆ្នាំសិក្សា${plan.academicYear})`,
  ]);
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

  // Helper to append a table
  const appendTable = (title: string, months: MonthColDef[]) => {
    aoa.push(['', '', '', '', `ចំនួន និងភាគរយ ${plan.subject}`]);

    // Row 1 Header
    const row1 = ['និទ្ទេស', 'ទិន្នន័យ មូលដ្ឋាន', ''];
    months.forEach((m) => {
      row1.push(m.monthName, '', '', '');
    });
    row1.push('ចំនួន % ចុងឆ្នាំសិក្សា');
    aoa.push(row1);

    // Row 2 Subheader
    const row2 = ['', 'ចំនួន', '%'];
    months.forEach((m) => {
      row2.push('ផែនការ ចំនួន', 'ផែនការ %', `${m.actualName} ចំនួន`, `${m.actualName} %`);
    });
    row2.push('%');
    aoa.push(row2);

    // Data rows
    plan.rows.forEach((r) => {
      const dataRow = [r.grade, r.baselineCount, `${r.baselinePct}%`];
      months.forEach((m) => {
        const d = r.monthly[m.key] || { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 };
        dataRow.push(d.planCount, `${d.planPct}%`, d.actualCount, `${d.actualPct}%`);
      });
      dataRow.push(`${r.yearEndTargetPct}%`);
      aoa.push(dataRow);
    });

    // Sum row
    const sumRow: any[] = ['សរុប'];
    let baseCountSum = 0;
    let basePctSum = 0;
    plan.rows.forEach((r) => {
      baseCountSum += r.baselineCount;
      basePctSum += r.baselinePct;
    });
    sumRow.push(baseCountSum, `${basePctSum}%`);

    months.forEach((m) => {
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
      sumRow.push(pcSum, `${ppSum}%`, acSum, `${apSum}%`);
    });

    let targetPctSum = 0;
    plan.rows.forEach((r) => {
      targetPctSum += r.yearEndTargetPct;
    });
    sumRow.push(`${targetPctSum}%`);
    aoa.push(sumRow);
    aoa.push([]);
  };

  // Table 1
  appendTable('តារាងទី ១', TABLE_1_MONTHS);
  // Table 2
  appendTable('តារាងទី ២', TABLE_2_MONTHS);
  // Table 3
  appendTable('តារាងទី ៣', TABLE_3_MONTHS);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set column widths
  ws['!cols'] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'ផែនការបង្រៀន');

  const fileName = `ផែនការបង្រៀន_${plan.subject}_${plan.className.replace(/\s+/g, '_')}_${plan.academicYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
