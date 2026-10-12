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
  { key: 'pobVillage', name: 'ភូមិ (កំណើត)', aliases: ['ទីកន្លែងកំណើត_ភូមិ', 'ភូមិកំណើត', 'ភូមិ (កំណើត)'] },
  { key: 'pobCommune', name: 'ឃុំ/សង្កាត់ (កំណើត)', aliases: ['ទីកន្លែងកំណើត_ឃុំ_សង្កាត់', 'ឃុំកំណើត', 'សង្កាត់កំណើត', 'ឃុំ/សង្កាត់ (កំណើត)'] },
  { key: 'pobDistrict', name: 'ស្រុក/ខណ្ឌ (កំណើត)', aliases: ['ទីកន្លែងកំណើត_ស្រុក_ខណ្ឌ', 'ស្រុកកំណើត', 'ខណ្ឌកំណើត', 'ស្រុក/ខណ្ឌ (កំណើត)'] },
  { key: 'pobProvince', name: 'ខេត្ត/រាជធានី (កំណើត)', aliases: ['ទីកន្លែងកំណើត_ខេត្ត_រាជធានី', 'ទីកន្លែងកំណើត', 'ខេត្តកំណើត', 'រាជធានីកំណើត'] },
  { key: 'addrVillage', name: 'ភូមិ (អាសយដ្ឋាន)', aliases: ['អាសយដ្ឋាន_ភូមិ', 'ភូមិបច្ចុប្បន្ន', 'ភូមិ (អាសយដ្ឋាន)'] },
  { key: 'addrCommune', name: 'ឃុំ (អាសយដ្ឋាន)', aliases: ['អាសយដ្ឋាន_ឃុំ', 'ឃុំបច្ចុប្បន្ន', 'ឃុំ (អាសយដ្ឋាន)'] },
  { key: 'addrDistrict', name: 'ស្រុក (អាសយដ្ឋាន)', aliases: ['អាសយដ្ឋាន_ស្រុក', 'ស្រុកបច្ចុប្បន្ន', 'ស្រុក (អាសយដ្ឋាន)'] },
  { key: 'addrProvince', name: 'ខេត្ត (អាសយដ្ឋាន)', aliases: ['អាសយដ្ឋាន_ខេត្ត', 'អាសយដ្ឋានបច្ចុប្បន្ន', 'ខេត្តបច្ចុប្បន្ន', 'ខេត្ត (អាសយដ្ឋាន)'] },
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
          if (colMap.dob !== undefined && cells[colMap.dob]) {
            dob = normalizeDate(cells[colMap.dob]);
          } else {
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

          // 5. Extract Code
          let studentCode = '';
          if (colMap.studentCode !== undefined && cells[colMap.studentCode]) {
            studentCode = String(cells[colMap.studentCode]).trim();
          }
          if (!studentCode) {
            studentCode = `STU-${String(rollNo).padStart(3, '0')}`;
          }

          parsedStudents.push({
            id: `stu_${Date.now()}_${r}_${Math.random().toString(36).substring(2, 6)}`,
            classId,
            rollNo,
            studentCode,
            nameKh: name,
            gender,
            dob,
            age: dob ? calculateAge(dob) : 0,
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
 * Intelligent Content-Aware Grid Parser for clipboard text (Excel, Sheets, CSV, TSV)
 * Identifies student row structures automatically. Never puts roll numbers into student names.
 */
export function parseClipboardGrid(
  pastedText: string,
  targetStartColKey?: keyof Student
): ParsedGridResult {
  if (!pastedText || !pastedText.trim()) {
    return { isHeaderRow: false, columnKeys: [], rows: [] };
  }

  const rawLines = pastedText
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) {
    return { isHeaderRow: false, columnKeys: [], rows: [] };
  }

  const rawGrid = rawLines.map((line) => {
    if (line.includes('\t')) {
      return line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    }
    return line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
  });

  const firstRow = rawGrid[0];
  const colCount = firstRow.length;

  // 1. Check if first row is an explicit table header
  let headerMatchCount = 0;
  const headerKeys: (keyof Student | null)[] = firstRow.map((cell) => {
    const cleanCell = cell.toLowerCase().replace(/[\s_\-#.]/g, '');
    for (const col of SPREADSHEET_COLUMNS) {
      if (
        col.aliases.some((alias) => {
          const a = alias.toLowerCase().replace(/[\s_\-#.]/g, '');
          return cleanCell === a || cleanCell.includes(a);
        })
      ) {
        headerMatchCount++;
        return col.key;
      }
    }
    return null;
  });

  const isHeader =
    headerMatchCount >= 1 &&
    (headerMatchCount >= Math.min(2, firstRow.length) ||
      firstRow.some((c) => /^(ល\.?រ|ឈ្មោះ|ភេទ|អត្តលេខ|name|gender|dob)/i.test(c)));

  let startIndex = 0;
  let columnKeys: (keyof Student | null)[] = [];

  if (isHeader) {
    startIndex = 1;
    columnKeys = headerKeys;
  } else {
    // Content-aware column mapping for data without headers
    const c0 = firstRow[0] || '';
    const c1 = firstRow[1] || '';
    const c2 = firstRow[2] || '';
    const c3 = firstRow[3] || '';

    const isC0Roll = !isNaN(Number(khmerToArabic(c0))) && Number(khmerToArabic(c0)) > 0 && Number(khmerToArabic(c0)) < 300;
    const isC0Code = /^STU/i.test(c0) || /^\d{4,8}$/.test(c0);
    const isC1Code = /^STU/i.test(c1) || /^\d{4,8}$/.test(c1);
    const isC1Gender = c1 === 'ស្រី' || c1 === 'ប្រុស' || /^(F|M|Female|Male)$/i.test(c1);
    const isC2Gender = c2 === 'ស្រី' || c2 === 'ប្រុស' || /^(F|M|Female|Male)$/i.test(c2);
    const isC3Gender = c3 === 'ស្រី' || c3 === 'ប្រុស' || /^(F|M|Female|Male)$/i.test(c3);

    // Case A: Single column paste (respect active target cell e.g. nameKh, dob, studentPhone)
    if (colCount === 1) {
      if (targetStartColKey) {
        columnKeys = [targetStartColKey];
      } else if (/^\d{8,11}$/.test(c0) || /^0\d{8,9}$/.test(c0)) {
        columnKeys = ['studentPhone'];
      } else if (/\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(c0)) {
        columnKeys = ['dob'];
      } else if (isC0Roll) {
        columnKeys = ['rollNo'];
      } else {
        columnKeys = ['nameKh'];
      }
    }
    // Case B: 2 columns [Name, Gender] or [Roll, Name]
    else if (colCount === 2) {
      if (isC1Gender) {
        columnKeys = ['nameKh', 'gender'];
      } else if (isC0Roll) {
        columnKeys = ['rollNo', 'nameKh'];
      } else {
        columnKeys = ['nameKh', 'gender'];
      }
    }
    // Case C: 3 columns [Roll, Name, Gender] or [Roll, Code, Name] or [Name, Gender, DOB]
    else if (colCount === 3) {
      if (isC0Roll && isC2Gender) {
        columnKeys = ['rollNo', 'nameKh', 'gender'];
      } else if (isC0Roll && isC1Code) {
        columnKeys = ['rollNo', 'studentCode', 'nameKh'];
      } else if (isC1Gender) {
        columnKeys = ['nameKh', 'gender', 'dob'];
      } else {
        columnKeys = ['rollNo', 'nameKh', 'gender'];
      }
    }
    // Case D: 4 columns [Roll, Name, Gender, DOB] or [Roll, Code, Name, Gender]
    else if (colCount === 4) {
      if (isC0Roll && isC2Gender) {
        columnKeys = ['rollNo', 'nameKh', 'gender', 'dob'];
      } else if (isC0Roll && isC1Code && isC3Gender) {
        columnKeys = ['rollNo', 'studentCode', 'nameKh', 'gender'];
      } else if (isC1Gender) {
        columnKeys = ['nameKh', 'gender', 'dob', 'studentPhone'];
      } else {
        columnKeys = ['rollNo', 'nameKh', 'gender', 'dob'];
      }
    }
    // Case E: Full 15-23 columns (MoEYS)
    else if (colCount >= 15) {
      columnKeys = [
        'rollNo',
        'studentCode',
        'nameKh',
        'gender',
        'dob',
        'age',
        'originSchool',
        'pobVillage',
        'pobCommune',
        'pobDistrict',
        'pobProvince',
        'addrVillage',
        'addrCommune',
        'addrDistrict',
        'addrProvince',
        'studentPhone',
        'fatherName',
        'fatherOccupation',
        'fatherPhone',
        'motherName',
        'motherOccupation',
        'motherPhone',
        'otherNotes',
      ];
    }
    // Case F: 5 to 14 columns
    else {
      if (isC0Roll && isC2Gender) {
        columnKeys = ['rollNo', 'nameKh', 'gender', 'dob', 'age', 'originSchool', 'pobProvince', 'addrProvince', 'studentPhone', 'fatherName', 'motherName'];
      } else {
        columnKeys = ['rollNo', 'studentCode', 'nameKh', 'gender', 'dob', 'age', 'originSchool', 'pobProvince', 'addrProvince', 'studentPhone', 'fatherName', 'motherName'];
      }
    }
  }

  const rows: Record<string, any>[] = [];

  for (let i = startIndex; i < rawGrid.length; i++) {
    const cells = rawGrid[i];
    if (cells.length === 0 || cells.every((c) => !c)) continue;

    const rowObj: Record<string, any> = {};

    for (let c = 0; c < cells.length; c++) {
      const colKey = columnKeys[c];
      if (!colKey) continue;
      const cellVal = cells[c];
      if (cellVal === undefined || cellVal === null || cellVal === '') continue;

      if (colKey === 'gender') {
        rowObj.gender = cellVal === 'ស្រី' || /^(F|Female)$/i.test(cellVal) ? 'ស្រី' : 'ប្រុស';
      } else if (colKey === 'dob') {
        const cleanDob = normalizeDate(cellVal);
        rowObj.dob = cleanDob;
        if (cleanDob) {
          rowObj.age = calculateAge(cleanDob);
        }
      } else if (colKey === 'rollNo') {
        const num = Number(khmerToArabic(cellVal));
        if (!isNaN(num) && num > 0) rowObj.rollNo = num;
      } else if (colKey === 'age') {
        const num = Number(khmerToArabic(cellVal));
        if (!isNaN(num)) rowObj.age = num;
      } else {
        rowObj[colKey] = cellVal;
      }
    }

    // Only accept row if it has at least one meaningful piece of data
    if (Object.keys(rowObj).length > 0) {
      rows.push(rowObj);
    }
  }

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
    const studentCode = row.studentCode || `STU-${String(currentRoll).padStart(3, '0')}`;
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
