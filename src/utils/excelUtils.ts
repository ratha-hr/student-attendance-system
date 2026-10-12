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
export const normalizeDate = (val: string | number | undefined | null): string => {
  if (!val) return '';
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
  { key: 'studentCode', name: 'អត្តលេខ', aliases: ['អត្តលេខ', 'កូដ', 'code', 'id', 'student_id'] },
  { key: 'nameKh', name: 'គោត្តនាម នាម', aliases: ['គោត្តនាម នាម', 'គោត្តនាម-នាម', 'គោត្តនាម', 'នាម', 'ឈ្មោះ', 'ឈ្មោះសិស្ស', 'name', 'namekh', 'full name'] },
  { key: 'gender', name: 'ភេទ', aliases: ['ភេទ', 'gender', 'sex', 'f/m'] },
  { key: 'dob', name: 'ថ្ងៃខែឆ្នាំកំណើត', aliases: ['ថ្ងៃខែឆ្នាំកំណើត', 'ថ្ងៃកំណើត', 'កំណើត', 'dob', 'birthdate', 'birth_date'] },
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

export async function parseExcelStudents(file: File, classId: string): Promise<Partial<Student>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        const parsedStudents: Partial<Student>[] = jsonData.map((row, idx) => {
          const gender: Gender = row['ភេទ'] === 'ស្រី' || row['Gender'] === 'F' ? 'ស្រី' : 'ប្រុស';
          const rawDob = row['ថ្ងៃខែឆ្នាំកំណើត'] || row['DOB'] || row['ថ្ងៃកំណើត'] || '';
          const dob = rawDob ? normalizeDate(String(rawDob)) : '';
          const age = Number(row['អាយុ']) || (dob ? calculateAge(dob) : 0);
          const orphanStr = String(row['កំព្រា'] || '');
          let orphanStatus: 'none' | 'father' | 'mother' | 'both' = 'none';
          if (orphanStr.includes('ឪពុកម្តាយ')) orphanStatus = 'both';
          else if (orphanStr.includes('ឪពុក')) orphanStatus = 'father';
          else if (orphanStr.includes('ម្តាយ')) orphanStatus = 'mother';

          return {
            id: 'stu_' + Date.now() + '_' + idx,
            classId: classId,
            rollNo: Number(row['ល.រ'] || row['លេខរៀង'] || row['Roll'] || idx + 1),
            studentCode: String(row['អត្តលេខ'] || row['Code'] || `STU-${String(idx + 1).padStart(3, '0')}`),
            nameKh: String(row['គោត្តនាម នាម'] || row['គោត្តនាម-នាម'] || row['NameKh'] || `សិស្ស ${idx + 1}`),
            nameEn: String(row['ឈ្មោះជាអក្សរឡាតាំង'] || row['NameEn'] || ''),
            gender,
            dob,
            age,
            originSchool: String(row['មកពីសាលា'] || ''),
            pobVillage: String(row['ទីកន្លែងកំណើត_ភូមិ'] || ''),
            pobCommune: String(row['ទីកន្លែងកំណើត_ឃុំ_សង្កាត់'] || ''),
            pobDistrict: String(row['ទីកន្លែងកំណើត_ស្រុក_ខណ្ឌ'] || ''),
            pobProvince: String(row['ទីកន្លែងកំណើត_ខេត្ត_រាជធានី'] || row['ទីកន្លែងកំណើត'] || ''),
            addrVillage: String(row['អាសយដ្ឋាន_ភូមិ'] || ''),
            addrCommune: String(row['អាសយដ្ឋាន_ឃុំ'] || ''),
            addrDistrict: String(row['អាសយដ្ឋាន_ស្រុក'] || ''),
            addrProvince: String(row['អាសយដ្ឋាន_ខេត្ត'] || row['អាសយដ្ឋានបច្ចុប្បន្ន'] || ''),
            studentPhone: String(row['ទូរស័ព្ទផ្ទាល់ខ្លួន'] || ''),
            orphanStatus,
            isDisabled: !!(row['ពិការ'] && String(row['ពិការ']).trim() !== 'ទេ'),
            isPoor: !!(row['ក្រីក្រ'] && String(row['ក្រីក្រ']).trim() !== 'ទេ'),
            hasScholarship: !!(row['អាហារូបករណ៍'] && String(row['អាហារូបករណ៍']).trim() !== 'ទេ'),
            stayInPagoda: !!(row['ស្នាក់នៅវត្ត'] && String(row['ស្នាក់នៅវត្ត']).trim() !== 'ទេ'),
            fatherName: String(row['ឪពុក_ឈ្មោះ'] || row['ឈ្មោះអាណាព្យាបាល'] || ''),
            fatherOccupation: String(row['ឪពុក_មុខរបរ'] || row['មុខរបរ'] || ''),
            fatherPhone: String(row['ឪពុក_ទូរស័ព្ទ'] || row['លេខទូរស័ព្ទ'] || ''),
            motherName: String(row['ម្តាយ_ឈ្មោះ'] || ''),
            motherOccupation: String(row['ម្តាយ_មុខរបរ'] || ''),
            motherPhone: String(row['ម្តាយ_ទូរស័ព្ទ'] || ''),
            guardianName: String(row['ឪពុក_ឈ្មោះ'] || row['ឈ្មោះអាណាព្យាបាល'] || ''),
            guardianPhone: String(row['ឪពុក_ទូរស័ព្ទ'] || row['លេខទូរស័ព្ទ'] || ''),
            guardianRelationship: 'ឪពុក',
            otherNotes: String(row['ផ្សេងៗ'] || row['កំណត់ចំណាំ'] || ''),
            status: 'active',
            createdAt: new Date().toISOString(),
          };
        });

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
 * Intelligent Grid Parser for clipboard text (Excel, Sheets, CSV, TSV)
 * Accurately aligns columns starting from clicked target column or auto-detected headers.
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

  // 1. Check if first row is a table header
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
  } else if (targetStartColKey) {
    // User specifically selected a cell in the table (e.g. nameKh, dob, studentPhone)
    const startColIdx = SPREADSHEET_COLUMNS.findIndex((c) => c.key === targetStartColKey);
    if (startColIdx !== -1) {
      columnKeys = firstRow.map((_, idx) => {
        return SPREADSHEET_COLUMNS[startColIdx + idx]?.key || null;
      });
    }
  }

  // If still not determined (no header, no target column clicked)
  if (columnKeys.length === 0) {
    const colCount = firstRow.length;
    if (colCount === 1) {
      const val = firstRow[0];
      if (/^\d{8,11}$/.test(val) || /^0\d{8,9}$/.test(val)) {
        columnKeys = ['studentPhone'];
      } else if (/\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(val)) {
        columnKeys = ['dob'];
      } else if (!isNaN(Number(khmerToArabic(val))) && Number(khmerToArabic(val)) < 300) {
        columnKeys = ['rollNo'];
      } else {
        columnKeys = ['nameKh'];
      }
    } else if (colCount === 2) {
      const c1 = firstRow[1];
      if (c1 === 'ស្រី' || c1 === 'ប្រុស' || /^(F|M|Female|Male)$/i.test(c1)) {
        columnKeys = ['nameKh', 'gender'];
      } else if (!isNaN(Number(khmerToArabic(firstRow[0]))) && Number(khmerToArabic(firstRow[0])) < 300) {
        columnKeys = ['rollNo', 'nameKh'];
      } else {
        columnKeys = ['nameKh', 'gender'];
      }
    } else if (colCount === 3) {
      const c0Num = !isNaN(Number(khmerToArabic(firstRow[0]))) && Number(khmerToArabic(firstRow[0])) < 300;
      const c2Gender = firstRow[2] === 'ស្រី' || firstRow[2] === 'ប្រុស' || /^(F|M|Female|Male)$/i.test(firstRow[2]);
      if (c0Num && c2Gender) {
        columnKeys = ['rollNo', 'nameKh', 'gender'];
      } else if (c0Num && (/^STU/i.test(firstRow[1]) || /^\d{4,8}$/.test(firstRow[1]))) {
        columnKeys = ['rollNo', 'studentCode', 'nameKh'];
      } else if (firstRow[1] === 'ស្រី' || firstRow[1] === 'ប្រុស') {
        columnKeys = ['nameKh', 'gender', 'dob'];
      } else {
        columnKeys = ['rollNo', 'nameKh', 'gender'];
      }
    } else if (colCount === 4) {
      const c0Num = !isNaN(Number(khmerToArabic(firstRow[0]))) && Number(khmerToArabic(firstRow[0])) < 300;
      const c2Gender = firstRow[2] === 'ស្រី' || firstRow[2] === 'ប្រុស' || /^(F|M|Female|Male)$/i.test(firstRow[2]);
      if (c0Num && c2Gender) {
        columnKeys = ['rollNo', 'nameKh', 'gender', 'dob'];
      } else if (c0Num && (/^STU/i.test(firstRow[1]) || /^\d{4,8}$/.test(firstRow[1]))) {
        columnKeys = ['rollNo', 'studentCode', 'nameKh', 'gender'];
      } else {
        columnKeys = ['rollNo', 'nameKh', 'gender', 'dob'];
      }
    } else if (colCount >= 15) {
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
    } else {
      // 5 to 14 columns
      const c0Num = !isNaN(Number(khmerToArabic(firstRow[0]))) && Number(khmerToArabic(firstRow[0])) < 300;
      if (c0Num && (firstRow[2] === 'ស្រី' || firstRow[2] === 'ប្រុស')) {
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
        if (!isNaN(num)) rowObj.rollNo = num;
      } else if (colKey === 'age') {
        const num = Number(khmerToArabic(cellVal));
        if (!isNaN(num)) rowObj.age = num;
      } else {
        rowObj[colKey] = cellVal;
      }
    }

    if (Object.keys(rowObj).length > 0) {
      rows.push(rowObj);
    }
  }

  return { isHeaderRow: isHeader, columnKeys, rows };
}

/**
 * Parse tab-separated or comma-separated text copied from Excel/XLSM/Sheets
 * into full Partial<Student> objects. NEVER defaults dob to a fake date.
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
    const rollNo = row.rollNo !== undefined ? Number(row.rollNo) : currentRoll;
    const studentCode = row.studentCode || `STU-${String(currentRoll).padStart(3, '0')}`;
    const nameKh = row.nameKh || `សិស្ស ${currentRoll}`;
    const gender: Gender = row.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស';
    const dob = row.dob || ''; // NEVER fake date!
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
