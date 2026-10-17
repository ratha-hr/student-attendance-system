import * as XLSX from 'xlsx';
import type { Student, Gender } from '../types';

export function calculateAge(dobStr: string): number {
  if (!dobStr || !dobStr.trim()) return 0;
  const birthYear = parseInt(dobStr.slice(0, 4), 10);
  if (isNaN(birthYear) || birthYear < 1920 || birthYear > new Date().getFullYear()) return 0;
  const currentYear = new Date().getFullYear();
  return Math.max(0, currentYear - birthYear);
}

// Khmer to Arabic digits map
export const khmerToArabic = (str: string | number | undefined | null): string => {
  if (str === undefined || str === null) return '';
  const kMap: Record<string, string> = {
    '០': '0', '១': '1', '២': '2', '៣': '3', '៤': '4',
    '៥': '5', '៦': '6', '៧': '7', '៨': '8', '៩': '9',
  };
  return String(str).replace(/[០-៩]/g, (ch) => kMap[ch] || ch);
};

// Normalize dates in any common Cambodian / Excel format to YYYY-MM-DD (NEVER return fake dates)
export const normalizeDate = (val: string | number | Date | undefined | null): string => {
  if (!val) return '';
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      return val.toISOString().slice(0, 10);
    }
    return '';
  }

  const cleanVal = khmerToArabic(String(val)).trim();
  if (!cleanVal) return '';

  // Case 1: DD/MM/YYYY, DD-MM-YYYY, or DD.MM.YYYY
  const dmy = cleanVal.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  // Case 2: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanVal)) {
    return cleanVal;
  }

  // Case 3: YYYY/MM/DD or YYYY.MM.DD
  const ymd = cleanVal.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (ymd) {
    const year = ymd[1];
    const month = ymd[2].padStart(2, '0');
    const day = ymd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Case 4: Excel serial number date
  const serial = Number(cleanVal);
  if (!isNaN(serial) && serial > 20000 && serial < 60000) {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().slice(0, 10);
  }

  // Case 5: 4-digit Year only (e.g. 2010)
  if (/^\d{4}$/.test(cleanVal)) {
    const y = parseInt(cleanVal, 10);
    if (y >= 1950 && y <= new Date().getFullYear()) {
      return `${cleanVal}-01-01`;
    }
  }

  return '';
};

export interface ColumnDef {
  key: keyof Student;
  name: string;
  aliases: string[];
}

export const SPREADSHEET_COLUMNS: ColumnDef[] = [
  { key: 'rollNo', name: 'ល.រ', aliases: ['ល.រ', 'លរ', 'លេខរៀង', 'roll', 'no', '#'] },
  { key: 'studentCode', name: 'អត្តលេខ', aliases: ['អត្តលេខ', 'អត្តលេខសិស្ស', 'កូដ', 'code', 'id', 'student_id'] },
  {
    key: 'nameKh',
    name: 'គោត្តនាម នាម',
    aliases: [
      'គោត្តនាម និងនាម',
      'គោត្តនាម និង នាម',
      'គោត្តនាម នាម',
      'គោត្តនាម-នាម',
      'គោត្តនាម',
      'ឈ្មោះសិស្ស',
      'ឈ្មោះ',
      'នាម',
      'នាមត្រកូល',
      'name',
      'namekh',
      'full name',
      'student name',
    ],
  },
  { key: 'gender', name: 'ភេទ', aliases: ['ភេទ', 'gender', 'sex', 'f/m'] },
  {
    key: 'dob',
    name: 'ថ្ងៃខែឆ្នាំកំណើត',
    aliases: ['ថ្ងៃខែឆ្នាំកំណើត', 'ថ្ងៃ ខែ ឆ្នាំកំណើត', 'ថ្ងៃកំណើត', 'កំណើត', 'dob', 'birthdate', 'birth_date'],
  },
  { key: 'age', name: 'អាយុ', aliases: ['អាយុ', 'age'] },
  { key: 'originSchool', name: 'មកពីសាលា', aliases: ['មកពីសាលា', 'សាលាចាស់', 'school', 'origin_school'] },
  { key: 'pobVillage', name: 'ភូមិ (កំណើត)', aliases: ['ទីកន្លែងកំណើត_ភូមិ', 'ភូមិកំណើត', 'ភូមិ (កំណើត)', 'ភូមិ', 'pob_village', 'village'] },
  { key: 'pobCommune', name: 'ឃុំ/សង្កាត់ (កំណើត)', aliases: ['ទីកន្លែងកំណើត_ឃុំ_សង្កាត់', 'ទីកន្លែងកំណើត_ឃុំ', 'ឃុំកំណើត', 'សង្កាត់កំណើត', 'ឃុំ/សង្កាត់ (កំណើត)', 'ឃុំ', 'សង្កាត់', 'ឃុំ/សង្កាត់', 'pob_commune', 'commune'] },
  { key: 'pobDistrict', name: 'ស្រុក/ខណ្ឌ (កំណើត)', aliases: ['ទីកន្លែងកំណើត_ស្រុក_ខណ្ឌ', 'ទីកន្លែងកំណើត_ស្រុក', 'ស្រុកកំណើត', 'ខណ្ឌកំណើត', 'ស្រុក/ខណ្ឌ (កំណើត)', 'ស្រុក', 'ខណ្ឌ', 'ស្រុក/ខណ្ឌ', 'pob_district', 'district'] },
  { key: 'pobProvince', name: 'ខេត្ត/រាជធានី (កំណើត)', aliases: ['ទីកន្លែងកំណើត_ខេត្ត_រាជធានី', 'ទីកន្លែងកំណើត_ខេត្ត', 'ទីកន្លែងកំណើត', 'ខេត្តកំណើត', 'រាជធានីកំណើត', 'ខេត្ត/រាជធានី (កំណើត)', 'ខេត្ត', 'រាជធានី', 'ខេត្ត/រាជធានី', 'pob_province', 'province'] },
  { key: 'addrVillage', name: 'ភូមិ (អាសយដ្ឋាន)', aliases: ['អាសយដ្ឋាន_ភូមិ', 'ភូមិបច្ចុប្បន្ន', 'ភូមិ (អាសយដ្ឋាន)', 'អាសយដ្ឋានបច្ចុប្បន្ន_ភូមិ'] },
  { key: 'addrCommune', name: 'ឃុំ (អាសយដ្ឋាន)', aliases: ['អាសយដ្ឋាន_ឃុំ', 'ឃុំបច្ចុប្បន្ន', 'ឃុំ (អាសយដ្ឋាន)', 'អាសយដ្ឋានបច្ចុប្បន្ន_ឃុំ'] },
  { key: 'addrDistrict', name: 'ស្រុក (អាសយដ្ឋាន)', aliases: ['អាសយដ្ឋាន_ស្រុក', 'ស្រុកបច្ចុប្បន្ន', 'ស្រុក (អាសយដ្ឋាន)', 'អាសយដ្ឋានបច្ចុប្បន្ន_ស្រុក'] },
  { key: 'addrProvince', name: 'ខេត្ត (អាសយដ្ឋាន)', aliases: ['អាសយដ្ឋាន_ខេត្ត', 'អាសយដ្ឋានបច្ចុប្បន្ន', 'ខេត្តបច្ចុប្បន្ន', 'ខេត្ត (អាសយដ្ឋាន)', 'អាសយដ្ឋានបច្ចុប្បន្ន_ខេត្ត'] },
  { key: 'studentPhone', name: 'ទូរស័ព្ទផ្ទាល់ខ្លួន', aliases: ['ទូរស័ព្ទផ្ទាល់ខ្លួន', 'លេខទូរស័ព្ទផ្ទាល់ខ្លួន', 'ទូរស័ព្ទសិស្ស', 'ទូរស័ព្ទ', 'phone'] },
  { key: 'fatherName', name: 'ឪពុក (ឈ្មោះ)', aliases: ['ឪពុក_ឈ្មោះ', 'ឈ្មោះឪពុក', 'ឪពុក', 'ឈ្មោះអាណាព្យាបាល', 'អាណាព្យាបាល'] },
  { key: 'fatherOccupation', name: 'ឪពុក (មុខរបរ)', aliases: ['ឪពុក_មុខរបរ', 'មុខរបរឪពុក', 'មុខរបរ'] },
  { key: 'fatherPhone', name: 'ឪពុក (ទូរស័ព្ទ)', aliases: ['ឪពុក_ទូរស័ព្ទ', 'លេខទូរស័ព្ទឪពុក'] },
  { key: 'motherName', name: 'ម្តាយ (ឈ្មោះ)', aliases: ['ម្តាយ_ឈ្មោះ', 'ឈ្មោះម្តាយ', 'ម្តាយ'] },
  { key: 'motherOccupation', name: 'ម្តាយ (មុខរបរ)', aliases: ['ម្តាយ_មុខរបរ', 'មុខរបរម្តាយ'] },
  { key: 'motherPhone', name: 'ម្តាយ (ទូរស័ព្ទ)', aliases: ['ម្តាយ_ទូរស័ព្ទ', 'លេខទូរស័ព្ទម្តាយ'] },
  { key: 'otherNotes', name: 'ផ្សេងៗ', aliases: ['ផ្សេងៗ', 'កំណត់ចំណាំ', 'ចំណាំ', 'notes', 'remark'] },
];

export function exportStudentsToExcel(students: Student[], className: string) {
  const data = students.map((s, index) => {
    const age = s.age || (s.dob ? calculateAge(s.dob) : '');
    return {
      'ល.រ': s.rollNo || index + 1,
      'អត្តលេខ': s.studentCode,
      'គោត្តនាម នាម': s.nameKh,
      'ភេទ': s.gender,
      'ថ្ងៃខែឆ្នាំកំណើត': s.dob || '',
      'អាយុ': age || '',
      'មកពីសាលា': s.originSchool || '',
      'ទីកន្លែងកំណើត_ភូមិ': s.pobVillage || '',
      'ទីកន្លែងកំណើត_ឃុំ_សង្កាត់': s.pobCommune || '',
      'ទីកន្លែងកំណើត_ស្រុក_ខណ្ឌ': s.pobDistrict || '',
      'ទីកន្លែងកំណើត_ខេត្ត_រាជធានី': s.pobProvince || s.pob || '',
      'អាសយដ្ឋាន_ភូមិ': s.addrVillage || '',
      'អាសយដ្ឋាន_ឃុំ': s.addrCommune || '',
      'អាសយដ្ឋាន_ស្រុក': s.addrDistrict || '',
      'អាសយដ្ឋាន_ខេត្ត': s.addrProvince || s.currentAddress || '',
      'ទូរស័ព្ទផ្ទាល់ខ្លួន': s.studentPhone || '',
      'កំព្រា': s.orphanStatus === 'both' ? 'ឪពុកម្តាយ' : s.orphanStatus === 'father' ? 'ឪពុក' : s.orphanStatus === 'mother' ? 'ម្តាយ' : 'ទេ',
      'ពិការ': s.isDisabled ? 'ពិការ' : '',
      'ក្រីក្រ': s.isPoor ? 'ក្រីក្រ' : '',
      'អាហារូបករណ៍': s.hasScholarship ? 'មាន' : '',
      'ស្នាក់នៅវត្ត': s.stayInPagoda ? 'ស្នាក់នៅ' : '',
      'ឪពុក_ឈ្មោះ': s.fatherName || s.guardianName || '',
      'ឪពុក_មុខរបរ': s.fatherOccupation || s.guardianOccupation || '',
      'ឪពុក_ទូរស័ព្ទ': s.fatherPhone || s.guardianPhone || '',
      'ម្តាយ_ឈ្មោះ': s.motherName || '',
      'ម្តាយ_មុខរបរ': s.motherOccupation || '',
      'ម្តាយ_ទូរស័ព្ទ': s.motherPhone || '',
      'ផ្សេងៗ': s.otherNotes || s.notes || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ប្រវត្តិរូបសិស្ស');

  const fileName = `ប្រវត្តិរូបសិស្ស_${className.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function downloadStudentTemplate() {
  const templateData = [
    {
      'ល.រ': 1,
      'អត្តលេខ': 'STU-001',
      'គោត្តនាម នាម': 'ចាន់ សុខា',
      'ភេទ': 'ប្រុស',
      'ថ្ងៃខែឆ្នាំកំណើត': '2010-05-15',
      'អាយុ': 14,
      'មកពីសាលា': 'អនុវិទ្យាល័យកំពង់ត្រឡាច',
      'ទីកន្លែងកំណើត_ភូមិ': 'ត្រពាំងព្រីង',
      'ទីកន្លែងកំណើត_ឃុំ_សង្កាត់': 'កំពង់ត្រឡាច',
      'ទីកន្លែងកំណើត_ស្រុក_ខណ្ឌ': 'កំពង់ត្រឡាច',
      'ទីកន្លែងកំណើត_ខេត្ត_រាជធានី': 'កំពង់ឆ្នាំង',
      'អាសយដ្ឋាន_ភូមិ': 'ត្រពាំងព្រីង',
      'អាសយដ្ឋាន_ឃុំ': 'កំពង់ត្រឡាច',
      'អាសយដ្ឋាន_ស្រុក': 'កំពង់ត្រឡាច',
      'អាសយដ្ឋាន_ខេត្ត': 'កំពង់ឆ្នាំង',
      'ទូរស័ព្ទផ្ទាល់ខ្លួន': '093123456',
      'កំព្រា': 'ទេ',
      'ពិការ': '',
      'ក្រីក្រ': 'ក្រីក្រ',
      'អាហារូបករណ៍': 'មាន',
      'ស្នាក់នៅវត្ត': '',
      'ឪពុក_ឈ្មោះ': 'ចាន់ សុវណ្ណ',
      'ឪពុក_មុខរបរ': 'កសិករ',
      'ឪពុក_ទូរស័ព្ទ': '012345678',
      'ម្តាយ_ឈ្មោះ': 'កែវ ស៊ីណាត',
      'ម្តាយ_មុខរបរ': 'មេផ្ទះ',
      'ម្តាយ_ទូរស័ព្ទ': '098765432',
      'ផ្សេងៗ': '',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'គំរូប្រវត្តិរូបសិស្ស');
  XLSX.writeFile(workbook, 'គំរូ_បញ្ជីប្រវត្តិរូបសិស្ស.xlsx');
}

/**
 * Robust Excel File Parser for any Cambodian school Excel format.
 * Scans all sheets and searches for header rows dynamically (ignoring title/cover rows).
 * Skips empty or non-student rows. NEVER creates fake dummy students.
 */
export async function parseExcelStudents(file: File, classId: string): Promise<Partial<Student>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        let bestRows: any[][] = [];
        let headerRowIdx = -1;

        // Check all sheets in the workbook
        for (const sheetName of workbook.SheetNames) {
          const ws = workbook.Sheets[sheetName];
          if (!ws) continue;
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (!rows || rows.length === 0) continue;

          // Find header row in first 25 rows
          for (let r = 0; r < Math.min(25, rows.length); r++) {
            const rowStr = rows[r].map((c) => String(c).trim()).join(' ').toLowerCase();
            const hasName = /គោត្តនាម|ឈ្មោះ|នាម|name/i.test(rowStr);
            const hasOther = /ភេទ|gender|sex|ល\.?រ|លេខរៀង|អត្តលេខ|roll/i.test(rowStr);
            if (hasName && hasOther) {
              headerRowIdx = r;
              bestRows = rows;
              break;
            }
          }
          if (headerRowIdx !== -1) break;
        }

        // Fallback to first sheet if no clear header row found
        if (headerRowIdx === -1) {
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          bestRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
        }

        if (!bestRows || bestRows.length === 0) {
          resolve([]);
          return;
        }

        // Map column indices from header row
        const colMap: Record<string, number> = {};
        if (headerRowIdx !== -1) {
          const headerCells = bestRows[headerRowIdx].map((c) =>
            String(c).toLowerCase().replace(/[\s_\-#.]/g, '')
          );
          headerCells.forEach((h, colIdx) => {
            if (/^(លរ|លេខរៀង|no|roll)$/i.test(h)) colMap.rollNo = colIdx;
            else if (/^(អត្តលេខ|អត្តលេខសិស្ស|កូដ|code|id|studentid)$/i.test(h)) colMap.studentCode = colIdx;
            else if (/គោត្តនាម.*នាម|គោត្តនាម|ឈ្មោះសិស្ស|ឈ្មោះ|name/i.test(h)) {
              if (colMap.nameKh === undefined) colMap.nameKh = colIdx;
            } else if (/^(ភេទ|gender|sex)$/i.test(h)) colMap.gender = colIdx;
            else if (/^ថ្ងៃ(ទី)?$/i.test(h) || h === 'day') colMap.day = colIdx;
            else if (/^ខែ$/i.test(h) || h === 'month') colMap.month = colIdx;
            else if (/^ឆ្នាំ$/i.test(h) || h === 'year') colMap.year = colIdx;
            else if (/ថ្ងៃ.*កំណើត|កំណើត|dob|birth/i.test(h)) colMap.dob = colIdx;
            else if (/^អាយុ|age$/i.test(h)) colMap.age = colIdx;
            else if (/សាលា|school/i.test(h)) colMap.originSchool = colIdx;
            else if (/ទីកន្លែងកំណើត.*ខេត្ត|ខេត្ត.*កំណើត|ទីកន្លែងកំណើត/i.test(h)) colMap.pobProvince = colIdx;
            else if (/ទូរស័ព្ទ|phone/i.test(h)) colMap.studentPhone = colIdx;
            else if (/ឪពុក|father|អាណាព្យាបាល/i.test(h)) colMap.fatherName = colIdx;
            else if (/ម្តាយ|mother/i.test(h)) colMap.motherName = colIdx;
            else if (/ផ្សេងៗ|កំណត់ចំណាំ|ចំណាំ|remark|notes/i.test(h)) colMap.otherNotes = colIdx;
          });
        }

        const startDataIdx = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;
        const parsedStudents: Partial<Student>[] = [];
        let rollCounter = 1;

        for (let r = startDataIdx; r < bestRows.length; r++) {
          const cells = bestRows[r];
          if (!cells || cells.length === 0 || cells.every((c) => !String(c).trim())) continue;

          // 1. Extract Name
          let name = '';
          if (colMap.nameKh !== undefined && cells[colMap.nameKh]) {
            name = String(cells[colMap.nameKh]).trim();
          } else {
            // Find first cell containing text/letters (not pure digits, not header keywords)
            for (let c = 0; c < cells.length; c++) {
              const val = String(cells[c] || '').trim();
              if (
                val &&
                !/^\d+$/.test(val) &&
                val.length >= 2 &&
                !/^(ល\.?រ|ភេទ|ប្រុស|ស្រី|អត្តលេខ|no)$/i.test(val)
              ) {
                name = val;
                break;
              }
            }
          }

          // If no genuine name found, or if it's a title/header line, SKIP IT!
          if (!name || /^\d+$/.test(name) || /^(ល\.?រ|អត្តលេខ|គោត្តនាម|ឈ្មោះ|name)$/i.test(name)) {
            continue;
          }

          // 2. Extract Gender
          let genderStr = colMap.gender !== undefined ? String(cells[colMap.gender] || '').trim() : '';
          if (!genderStr) {
            for (const cell of cells) {
              const s = String(cell).trim();
              if (s === 'ស្រី' || s === 'ប្រុស' || /^(F|M|Female|Male)$/i.test(s)) {
                genderStr = s;
                break;
              }
            }
          }
          const gender: Gender =
            genderStr === 'ស្រី' || /^(F|Female)$/i.test(genderStr) ? 'ស្រី' : 'ប្រុស';

          // 3. Extract DOB
          let dob = '';
          if (colMap.day !== undefined && colMap.month !== undefined && colMap.year !== undefined) {
            const d = String(cells[colMap.day] || '').trim();
            const m = String(cells[colMap.month] || '').trim();
            const y = String(cells[colMap.year] || '').trim();
            if (d && m && y) {
              const dayStr = String(Number(khmerToArabic(d))).padStart(2, '0');
              const monthStr = String(Number(khmerToArabic(m))).padStart(2, '0');
              const yearStr = String(Number(khmerToArabic(y)));
              if (Number(yearStr) >= 1990 && Number(yearStr) <= 2030) {
                dob = `${yearStr}-${monthStr}-${dayStr}`;
              }
            }
          }
          if (!dob && colMap.dob !== undefined && cells[colMap.dob]) {
            dob = normalizeDate(cells[colMap.dob]);
          } else if (!dob) {
            for (const cell of cells) {
              const d = normalizeDate(cell);
              if (d) {
                dob = d;
                break;
              }
            }
          }

          // 4. Extract Roll No
          let rollNo = rollCounter;
          if (colMap.rollNo !== undefined && cells[colMap.rollNo]) {
            const parsedRoll = Number(khmerToArabic(cells[colMap.rollNo]));
            if (!isNaN(parsedRoll) && parsedRoll > 0) rollNo = parsedRoll;
          }

          // 5. Extract Code (Leave blank if not provided)
          let studentCode = '';
          if (colMap.studentCode !== undefined && cells[colMap.studentCode]) {
            studentCode = String(cells[colMap.studentCode]).trim();
          }

          parsedStudents.push({
            id: `stu_${Date.now()}_${r}_${Math.random().toString(36).substring(2, 6)}`,
            classId,
            rollNo,
            studentCode,
            nameKh: name,
            gender,
            dob,
            age: dob ? calculateAge(dob) : (colMap.age !== undefined && cells[colMap.age] ? Number(khmerToArabic(cells[colMap.age])) || 0 : 0),
            originSchool: colMap.originSchool !== undefined ? String(cells[colMap.originSchool] || '').trim() : '',
            pobProvince: colMap.pobProvince !== undefined ? String(cells[colMap.pobProvince] || '').trim() : '',
            studentPhone: colMap.studentPhone !== undefined ? String(cells[colMap.studentPhone] || '').trim() : '',
            fatherName: colMap.fatherName !== undefined ? String(cells[colMap.fatherName] || '').trim() : '',
            motherName: colMap.motherName !== undefined ? String(cells[colMap.motherName] || '').trim() : '',
            otherNotes: colMap.otherNotes !== undefined ? String(cells[colMap.otherNotes] || '').trim() : '',
            status: 'active',
            createdAt: new Date().toISOString(),
          });

          rollCounter++;
        }

        resolve(parsedStudents);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export interface ParsedGridResult {
  isHeaderRow: boolean;
  columnKeys: (keyof Student | null)[];
  rows: Record<string, any>[];
}

/**
 * Helper to match a header string to a known Student column key or date part
 */
export function matchHeaderToColumnKey(header: string): keyof Student | 'day' | 'month' | 'year' | null {
  if (!header) return null;
  const clean = header
    .toLowerCase()
    .replace(/[\s_\-#.():\/]/g, '')
    .trim();
  if (!clean) return null;

  // Day, Month, Year
  if (/^ថ្ងៃ(ទី)?$/i.test(clean) || clean === 'day') return 'day';
  if (/^ខែ$/i.test(clean) || clean === 'month') return 'month';
  if (/^ឆ្នាំ$/i.test(clean) || clean === 'year') return 'year';

  // Specific compound addresses first before general ones (POB - Place of Birth)
  if (/ទីកន្លែងកំណើត.*ភូមិ|ភូមិ.*កំណើត|ឈ្មោះភូមិ|pobvillage/i.test(clean)) return 'pobVillage';
  if (/ទីកន្លែងកំណើត.*(ឃុំ|សង្កាត់)|(ឃុំ|សង្កាត់).*កំណើត|ឈ្មោះ(ឃុំ|សង្កាត់)|pobcommune/i.test(clean)) return 'pobCommune';
  if (/ទីកន្លែងកំណើត.*(ស្រុក|ខណ្ឌ)|(ស្រុក|ខណ្ឌ).*កំណើត|ឈ្មោះ(ស្រុក|ខណ្ឌ)|pobdistrict/i.test(clean)) return 'pobDistrict';
  if (/ទីកន្លែងកំណើត.*(ខេត្ត|រាជធានី)|(ខេត្ត|រាជធានី).*កំណើត|ទីកន្លែងកំណើត|ឈ្មោះ(ខេត្ត|រាជធានី)|pobprovince/i.test(clean)) return 'pobProvince';

  // Current Address
  if (/អាសយដ្ឋាន.*ភូមិ|ភូមិ.*(បច្ចុប្បន្ន|អាសយដ្ឋាន)|addrvillage/i.test(clean)) return 'addrVillage';
  if (/អាសយដ្ឋាន.*(ឃុំ|សង្កាត់)|(ឃុំ|សង្កាត់).*(បច្ចុប្បន្ន|អាសយដ្ឋាន)|addrcommune/i.test(clean)) return 'addrCommune';
  if (/អាសយដ្ឋាន.*(ស្រុក|ខណ្ឌ)|(ស្រុក|ខណ្ឌ).*(បច្ចុប្បន្ន|អាសយដ្ឋាន)|addrdistrict/i.test(clean)) return 'addrDistrict';
  if (/អាសយដ្ឋាន.*(ខេត្ត|រាជធានី)|(ខេត្ត|រាជធានី).*(បច្ចុប្បន្ន|អាសយដ្ឋាន)|អាសយដ្ឋានបច្ចុប្បន្ន|addrprovince/i.test(clean)) return 'addrProvince';

  // Simple address terms (often copied as column headers in 4-column address blocks: ភូមិ, ឃុំ/សង្កាត់, ស្រុក/ខណ្ឌ, ខេត្ត/រាជធានី)
  if (/^ភូមិ$/i.test(clean) || clean === 'village') return 'pobVillage';
  if (/^(ឃុំ|សង្កាត់|ឃុំសង្កាត់)$/i.test(clean) || clean === 'commune') return 'pobCommune';
  if (/^(ស្រុក|ខណ្ឌ|ស្រុកខណ្ឌ)$/i.test(clean) || clean === 'district') return 'pobDistrict';
  if (/^(ខេត្ត|រាជធានី|ខេត្តរាជធានី)$/i.test(clean) || clean === 'province') return 'pobProvince';

  // Parents
  if (/ឪពុក.*ឈ្មោះ|ឈ្មោះឪពុក|fathername/i.test(clean)) return 'fatherName';
  if (/ឪពុក.*មុខរបរ|មុខរបរឪពុក|fatheroccupation/i.test(clean)) return 'fatherOccupation';
  if (/ឪពុក.*ទូរស័ព្ទ|fatherphone/i.test(clean)) return 'fatherPhone';
  if (/^ឪពុក$/i.test(clean) || clean === 'father') return 'fatherName';

  if (/ម្តាយ.*ឈ្មោះ|ឈ្មោះម្តាយ|mothername/i.test(clean)) return 'motherName';
  if (/ម្តាយ.*មុខរបរ|មុខរបរម្តាយ|motheroccupation/i.test(clean)) return 'motherOccupation';
  if (/ម្តាយ.*ទូរស័ព្ទ|motherphone/i.test(clean)) return 'motherPhone';
  if (/^ម្តាយ$/i.test(clean) || clean === 'mother') return 'motherName';

  if (/អាណាព្យាបាល.*ឈ្មោះ|guardianname/i.test(clean)) return 'fatherName';
  if (/អាណាព្យាបាល.*មុខរបរ|guardianoccupation/i.test(clean)) return 'fatherOccupation';
  if (/អាណាព្យាបាល.*ទូរស័ព្ទ|guardianphone/i.test(clean)) return 'fatherPhone';
  if (/^អាណាព្យាបាល$/i.test(clean) || clean === 'guardian') return 'fatherName';

  // Standard student fields
  if (/^(លរ|លេខរៀង|no|roll|#)$/i.test(clean)) return 'rollNo';
  if (/^(អត្តលេខ|អត្តលេខសិស្ស|កូដ|code|id|studentid|studentcode)$/i.test(clean)) return 'studentCode';
  // ONLY match student name if explicitly intended, never match address or parent headers containing ឈ្មោះ!
  if (/^(គោត្តនាម.*នាម|គោត្តនាម|ឈ្មោះសិស្ស|fullname|studentname|namekh)$/i.test(clean)) return 'nameKh';
  if (/^ឈ្មោះ$/i.test(clean)) return 'nameKh';
  if (/^(ភេទ|gender|sex|fm)$/i.test(clean)) return 'gender';
  if (/ថ្ងៃ.*កំណើត|កំណើត|dob|birthdate|birth/i.test(clean)) return 'dob';
  if (/^អាយុ|age$/i.test(clean)) return 'age';
  if (/សាលា|school|originschool/i.test(clean)) return 'originSchool';

  // Contacts
  if (/ទូរស័ព្ទ.*(ផ្ទាល់ខ្លួន|សិស្ស)|លេខទូរស័ព្ទផ្ទាល់ខ្លួន|studentphone/i.test(clean)) return 'studentPhone';
  if (/^(ទូរស័ព្ទ|លេខទូរស័ព្ទ|phone)$/i.test(clean)) return 'studentPhone';
  if (/ផ្សេងៗ|កំណត់ចំណាំ|ចំណាំ|remark|notes|othernotes/i.test(clean)) return 'otherNotes';

  return null;
}

/**
 * Intelligent Content-Aware Grid Parser for clipboard text (Excel, Sheets, CSV, TSV)
 * Respects active focused cell. Never overwrites student names with addresses or numbers.
 * Accurately preserves empty cells as empty string "" and retains 1-to-1 row alignment.
 */
export function parseClipboardGrid(
  pastedText: string,
  targetStartColKey?: keyof Student
): ParsedGridResult {
  if (pastedText === undefined || pastedText === null) {
    return { isHeaderRow: false, columnKeys: [], rows: [] };
  }

  // Strip trailing carriage returns / newlines that Excel appends at the end
  const normalizedText = pastedText.replace(/[\r\n]+$/, '');
  if (normalizedText === '') {
    if (targetStartColKey) {
      return {
        isHeaderRow: false,
        columnKeys: [targetStartColKey],
        rows: [{ [targetStartColKey]: '' }],
      };
    }
    return { isHeaderRow: false, columnKeys: [], rows: [] };
  }

  // Split lines WITHOUT trimming leading/trailing tabs, so column positions are preserved!
  const rawLines = normalizedText.split(/\r?\n/).map((l) => l.replace(/\r$/, ''));

  if (rawLines.length === 0) {
    return { isHeaderRow: false, columnKeys: [], rows: [] };
  }

  const rawGrid = rawLines.map((line) => {
    if (line.includes('\t')) {
      return line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, '').trim());
    }
    return line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, '').trim());
  });

  // Calculate maximum column count across all lines
  const maxColCount = Math.max(...rawGrid.map((r) => r.length), 1);

  // Normalize all rows to have exact maxColCount cells, padding missing trailing cells with ''
  const normalizedGrid = rawGrid.map((row) => {
    if (row.length < maxColCount) {
      return [...row, ...new Array(maxColCount - row.length).fill('')];
    }
    return row;
  });

  const firstRow = normalizedGrid[0];
  const colCount = maxColCount;

  // 1. Check if first row is an explicit table header
  let matchedHeaderCount = 0;
  firstRow.forEach((c) => {
    if (matchHeaderToColumnKey(c) !== null) matchedHeaderCount++;
  });

  const isHeader =
    matchedHeaderCount >= 1 &&
    firstRow.some((c) =>
      /^(ល\.?រ|លេខរៀង|អត្តលេខ|គោត្តនាម|ឈ្មោះ|ភេទ|gender|sex|ភូមិ|ឃុំ|ស្រុក|ខេត្ត|ទីកន្លែងកំណើត|អាសយដ្ឋាន|ទូរស័ព្ទ|ឪពុក|ម្តាយ|ថ្ងៃ)/i.test(
        c.replace(/[\s_\-#.():\/]/g, '')
      )
    );

  let startIndex = 0;
  let dayColIdx = -1;
  let monthColIdx = -1;
  let yearColIdx = -1;
  let columnKeys: (keyof Student | null)[] = new Array(colCount).fill(null);

  if (isHeader) {
    startIndex = 1;
    let lastParent: 'father' | 'mother' | null = null;
    let seenAddrVillage = false;

    // Map from header row using matchHeaderToColumnKey with contextual awareness
    firstRow.forEach((c, idx) => {
      const clean = c.toLowerCase().replace(/[\s_\-#.():\/]/g, '').trim();
      let match = matchHeaderToColumnKey(c);

      // Contextual tracking for parents (father/mother -> occupation, phone)
      if (clean === 'ឪពុក' || clean === 'father') {
        lastParent = 'father';
        match = 'fatherName';
      } else if (clean === 'ម្តាយ' || clean === 'mother') {
        lastParent = 'mother';
        match = 'motherName';
      } else if (/^មុខរបរ$/i.test(clean) || clean === 'occupation') {
        if (lastParent === 'father') match = 'fatherOccupation';
        else if (lastParent === 'mother') match = 'motherOccupation';
      } else if (/^(លេខទូរស័ព្ទ|ទូរស័ព្ទ|phone)$/i.test(clean)) {
        if (lastParent === 'father') match = 'fatherPhone';
        else if (lastParent === 'mother') match = 'motherPhone';
        else match = 'studentPhone';
      } else if (clean.includes('អាសយដ្ឋាន') || clean.includes('កំណើត') || clean.includes('ឈ្មោះសិស្ស') || clean.includes('គោត្តនាម')) {
        lastParent = null;
      }

      // Contextual tracking for current address (village -> commune, district, province)
      if (match === 'addrVillage') {
        seenAddrVillage = true;
      } else if (seenAddrVillage) {
        if (/^(ឃុំ|សង្កាត់|ឃុំសង្កាត់)$/i.test(clean)) match = 'addrCommune';
        else if (/^(ស្រុក|ខណ្ឌ|ស្រុកខណ្ឌ)$/i.test(clean)) match = 'addrDistrict';
        else if (/^(ខេត្ត|រាជធានី|ខេត្តរាជធានី)$/i.test(clean)) match = 'addrProvince';
      }

      if (match === 'day') dayColIdx = idx;
      else if (match === 'month') monthColIdx = idx;
      else if (match === 'year') yearColIdx = idx;
      else if (match !== null) columnKeys[idx] = match;
      else columnKeys[idx] = null;
    });
  } else {
    // Intelligent Column Type Inference on raw student data rows
    const sampleRows = normalizedGrid.slice(0, 10);

    // Helper: is column completely empty in all rows
    const isColAllEmpty = (c: number) => normalizedGrid.every((r) => !String(r[c] || '').trim());

    // 1. Detect gender column: >50% of cells are 'ប្រុស' or 'ស្រី' or 'F'/'M'
    let detectedGenderCol = -1;
    for (let c = 0; c < colCount; c++) {
      const matchCount = sampleRows.filter((r) => {
        const val = String(r[c] || '').trim();
        return val === 'ស្រី' || val === 'ប្រុស' || /^(F|M|Female|Male)$/i.test(val);
      }).length;
      if (matchCount >= Math.min(2, sampleRows.length) && matchCount / sampleRows.length >= 0.5) {
        detectedGenderCol = c;
        break;
      }
    }

    // 2. Detect 3-column date: [Day (1-31), Month (1-12), Year (1990-2030)]
    for (let c = 0; c < colCount - 2; c++) {
      const is3ColDate = sampleRows.every((r) => {
        const d = Number(khmerToArabic(r[c] || ''));
        const m = Number(khmerToArabic(r[c + 1] || ''));
        const y = Number(khmerToArabic(r[c + 2] || ''));
        return !isNaN(d) && d >= 1 && d <= 31 && !isNaN(m) && m >= 1 && m <= 12 && !isNaN(y) && y >= 1990 && y <= 2030;
      });
      if (is3ColDate) {
        dayColIdx = c;
        monthColIdx = c + 1;
        yearColIdx = c + 2;
        break;
      }
    }

    // 3. Single-column date check if 3-col date wasn't found
    let detectedSingleDobCol = -1;
    if (dayColIdx === -1) {
      for (let c = 0; c < colCount; c++) {
        const dateMatchCount = sampleRows.filter((r) => Boolean(normalizeDate(r[c]))).length;
        if (dateMatchCount >= Math.min(2, sampleRows.length)) {
          detectedSingleDobCol = c;
          break;
        }
      }
    }

    // 4. Detect roll number column (small numbers < 500 in column 0 or 1)
    let detectedRollCol = -1;
    if (colCount > 1) {
      const c0IsRoll = sampleRows.every((r) => {
        const val = Number(khmerToArabic(r[0] || ''));
        return !isNaN(val) && val > 0 && val < 500;
      });
      if (c0IsRoll) detectedRollCol = 0;
    }

    // 5. Detect Cambodian Province in any column
    const CAMBODIAN_PROVINCES = [
      'កំពង់ឆ្នាំង', 'ភ្នំពេញ', 'កណ្ដាល', 'កណ្តាល', 'សៀមរាប', 'បាត់ដំបង',
      'ព្រៃវែង', 'តាកែវ', 'កំពត', 'កំពង់ចាម', 'កំពង់ស្ពឺ', 'កំពង់ធំ',
      'ពោធិ៍សាត់', 'ក្រចេះ', 'ស្ទឹងត្រែង', 'រតនគិរី', 'មណ្ឌលគិរី',
      'ព្រះវិហារ', 'បន្ទាយមានជ័យ', 'ឧត្តរមានជ័យ', 'ស្វាយរៀង', 'កែប',
      'ប៉ៃលិន', 'ព្រះសីហនុ', 'កោះកុង', 'ត្បូងឃ្មុំ'
    ];
    let detectedProvinceCol = -1;
    for (let c = 0; c < colCount; c++) {
      const matchCount = sampleRows.filter((r) => {
        const val = String(r[c] || '').trim();
        return CAMBODIAN_PROVINCES.some((p) => val.includes(p));
      }).length;
      if (matchCount >= 1 && matchCount / sampleRows.length >= 0.3) {
        detectedProvinceCol = c;
        break;
      }
    }

    columnKeys = new Array(colCount).fill(null);

    // PATH 1: User explicitly selected a target cell (e.g. pobVillage, addrVillage, studentPhone, motherPhone, etc.)
    // When no gender column is found, this is NOT a student roster! Align columns sequentially from target cell!
    if (targetStartColKey && detectedGenderCol === -1) {
      const startColIdx = SPREADSHEET_COLUMNS.findIndex((col) => col.key === targetStartColKey);
      if (startColIdx !== -1) {
        if (targetStartColKey === 'dob' && dayColIdx !== -1) {
          // dayColIdx, monthColIdx, yearColIdx combine into dob
          let offset = 0;
          for (let c = 0; c < colCount; c++) {
            if (c === dayColIdx || c === monthColIdx || c === yearColIdx) continue;
            if (colCount > 2 && isColAllEmpty(c)) {
              columnKeys[c] = null;
              continue;
            }
            const targetDef = SPREADSHEET_COLUMNS[startColIdx + 1 + offset];
            if (targetDef) columnKeys[c] = targetDef.key;
            offset++;
          }
        } else {
          // Direct positional mapping from targetStartColKey along SPREADSHEET_COLUMNS
          let offset = 0;
          for (let c = 0; c < colCount; c++) {
            if (colCount > 2 && isColAllEmpty(c)) {
              columnKeys[c] = null; // empty spacer column (like col S in Excel), do not consume table column
              continue;
            }
            const targetDef = SPREADSHEET_COLUMNS[startColIdx + offset];
            if (targetDef) {
              columnKeys[c] = targetDef.key;
            }
            offset++;
          }
        }
      }
    }
    // PATH 2: Full Student Roster (Contains Gender Column)
    else if (detectedGenderCol !== -1) {
      columnKeys[detectedGenderCol] = 'gender';
      // In Cambodian school spreadsheets, Student Name ALWAYS immediately precedes Gender!
      if (detectedGenderCol > 0) {
        columnKeys[detectedGenderCol - 1] = 'nameKh';
      }
      if (detectedRollCol !== -1 && columnKeys[detectedRollCol] === null) {
        columnKeys[detectedRollCol] = 'rollNo';
      }
      if (detectedSingleDobCol !== -1 && columnKeys[detectedSingleDobCol] === null) {
        columnKeys[detectedSingleDobCol] = 'dob';
      }

      // Check remaining columns (Origin School, Code, Phones, etc.)
      for (let c = 0; c < colCount; c++) {
        if (c === dayColIdx || c === monthColIdx || c === yearColIdx) continue;
        if (columnKeys[c] !== null) continue;

        const sampleVal = sampleRows.map((r) => String(r[c] || '').trim()).find(Boolean) || '';

        if (/សាលា|បឋមសិក្សា|អនុវិទ្យាល័យ|វិទ្យាល័យ/i.test(sampleVal)) {
          columnKeys[c] = 'originSchool';
        } else if (/^STU/i.test(sampleVal) || (c === 1 && detectedRollCol === 0 && detectedGenderCol > 2)) {
          columnKeys[c] = 'studentCode';
        } else if (/^\d{8,11}$/.test(sampleVal) || /^0\d{8,9}$/.test(sampleVal)) {
          columnKeys[c] = 'studentPhone';
        } else if (CAMBODIAN_PROVINCES.some((p) => sampleVal.includes(p))) {
          columnKeys[c] = 'pobProvince';
        }
      }
    }
    // PATH 3: Multi-column or Single-column without target cell and without gender column
    else {
      // Check if this matches address column pattern: e.g. 4 columns ending with province
      if (detectedProvinceCol !== -1) {
        if (colCount === 4 && detectedProvinceCol === 3) {
          columnKeys = ['pobVillage', 'pobCommune', 'pobDistrict', 'pobProvince'];
        } else if (colCount === 3 && detectedProvinceCol === 2) {
          columnKeys = ['pobCommune', 'pobDistrict', 'pobProvince'];
        } else if (colCount === 1) {
          columnKeys = ['pobProvince'];
        }
      } else if (colCount === 1) {
        if (targetStartColKey) {
          columnKeys[0] = targetStartColKey;
        } else if (detectedSingleDobCol === 0) {
          columnKeys[0] = 'dob';
        } else if (detectedRollCol === 0) {
          columnKeys[0] = 'rollNo';
        } else {
          const sample = sampleRows.map((r) => String(r[0] || '').trim()).find(Boolean) || '';
          if (/^0\d{8,9}$/.test(sample) || /^\d{8,10}$/.test(sample)) {
            columnKeys[0] = 'studentPhone';
          } else {
            columnKeys[0] = 'nameKh';
          }
        }
      } else {
        // Multi-column unknown: only map text to nameKh if targetStartColKey is explicitly 'nameKh' or undefined AND no address keywords
        for (let c = 0; c < colCount; c++) {
          if (c === dayColIdx || c === monthColIdx || c === yearColIdx) continue;
          if (columnKeys[c] !== null) continue;

          const sampleVal = sampleRows.map((r) => String(r[c] || '').trim()).find(Boolean) || '';
          if (/សាលា|បឋមសិក្សា|អនុវិទ្យាល័យ|វិទ្យាល័យ/i.test(sampleVal)) {
            columnKeys[c] = 'originSchool';
          } else if (/^\d{8,11}$/.test(sampleVal) || /^0\d{8,9}$/.test(sampleVal)) {
            columnKeys[c] = 'studentPhone';
          } else if (!targetStartColKey && columnKeys.filter((k) => k === 'nameKh').length === 0 && !/^\d+$/.test(sampleVal)) {
            columnKeys[c] = 'nameKh';
          }
        }
      }
    }
  }

  const rows: Record<string, any>[] = [];

  for (let i = startIndex; i < normalizedGrid.length; i++) {
    const cells = normalizedGrid[i];
    const rowObj: Record<string, any> = {};

    for (let c = 0; c < cells.length; c++) {
      if (c === dayColIdx || c === monthColIdx || c === yearColIdx) continue;
      const colKey = columnKeys[c];
      if (!colKey) continue;
      const cellVal = cells[c];

      // Explicitly preserve empty cells as empty string ""
      if (cellVal === '' || cellVal === undefined || cellVal === null) {
        rowObj[colKey] = '';
        continue;
      }

      if (colKey === 'gender') {
        rowObj.gender = cellVal === 'ស្រី' || /^(F|Female)$/i.test(cellVal) ? 'ស្រី' : 'ប្រុស';
      } else if (colKey === 'dob') {
        const cleanDob = normalizeDate(cellVal);
        rowObj.dob = cleanDob || cellVal;
        if (cleanDob) {
          rowObj.age = calculateAge(cleanDob);
        }
      } else if (colKey === 'rollNo') {
        const num = Number(khmerToArabic(cellVal));
        if (!isNaN(num) && num > 0) rowObj.rollNo = num;
        else rowObj.rollNo = cellVal;
      } else if (colKey === 'age') {
        const num = Number(khmerToArabic(cellVal));
        if (!isNaN(num)) rowObj.age = num;
        else rowObj.age = cellVal;
      } else {
        rowObj[colKey] = cellVal;
      }
    }

    // Combine 3-column date (Day, Month, Year) if present
    if (dayColIdx !== -1 && monthColIdx !== -1 && yearColIdx !== -1) {
      const d = String(cells[dayColIdx] || '').trim();
      const m = String(cells[monthColIdx] || '').trim();
      const y = String(cells[yearColIdx] || '').trim();
      if (d && m && y) {
        const dayStr = String(Number(khmerToArabic(d))).padStart(2, '0');
        const monthStr = String(Number(khmerToArabic(m))).padStart(2, '0');
        const yearStr = String(Number(khmerToArabic(y)));
        if (Number(yearStr) >= 1990 && Number(yearStr) <= 2030) {
          rowObj.dob = `${yearStr}-${monthStr}-${dayStr}`;
          rowObj.age = calculateAge(rowObj.dob);
        }
      } else if (!d && !m && !y) {
        rowObj.dob = '';
        rowObj.age = 0;
      }
    }

    // Always push rowObj so row index matches 1-to-1 with table rows
    rows.push(rowObj);
  }

  return { isHeaderRow: isHeader, columnKeys, rows };

  return { isHeaderRow: isHeader, columnKeys, rows };
}

/**
 * Parse tab-separated or comma-separated text copied from Excel/XLSM/Sheets
 * into full Partial<Student> objects. NEVER creates fake dummy students.
 */
export function parsePastedExcelText(
  pastedText: string,
  classId: string,
  startRollNo = 1,
  targetStartColKey?: keyof Student
): Partial<Student>[] {
  const parsedGrid = parseClipboardGrid(pastedText, targetStartColKey);
  if (parsedGrid.rows.length === 0) return [];

  const results: Partial<Student>[] = [];
  let currentRoll = startRollNo;

  for (let i = 0; i < parsedGrid.rows.length; i++) {
    const row = parsedGrid.rows[i];
    const nameKh = String(row.nameKh || '').trim();

    // Skip row if it doesn't have a valid student name (e.g. blank lines, stray numbers)
    if (!nameKh || /^\d+$/.test(nameKh) || /^(ល\.?រ|អត្តលេខ|គោត្តនាម|ឈ្មោះ|name)$/i.test(nameKh)) {
      continue;
    }

    const rollNo = row.rollNo !== undefined ? Number(row.rollNo) : currentRoll;
    const studentCode = (row.studentCode || '').trim();
    const gender: Gender = row.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស';
    const dob = row.dob || '';
    const age = row.age !== undefined ? Number(row.age) : dob ? calculateAge(dob) : 0;

    results.push({
      id: `stu-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      classId,
      rollNo,
      studentCode,
      nameKh,
      nameEn: row.nameEn || '',
      gender,
      dob,
      age,
      originSchool: row.originSchool || '',
      pobVillage: row.pobVillage || '',
      pobCommune: row.pobCommune || '',
      pobDistrict: row.pobDistrict || '',
      pobProvince: row.pobProvince || '',
      addrVillage: row.addrVillage || '',
      addrCommune: row.addrCommune || '',
      addrDistrict: row.addrDistrict || '',
      addrProvince: row.addrProvince || '',
      studentPhone: row.studentPhone || '',
      fatherName: row.fatherName || '',
      fatherOccupation: row.fatherOccupation || '',
      fatherPhone: row.fatherPhone || '',
      motherName: row.motherName || '',
      motherOccupation: row.motherOccupation || '',
      motherPhone: row.motherPhone || '',
      otherNotes: row.otherNotes || '',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    currentRoll++;
  }

  return results;
}
