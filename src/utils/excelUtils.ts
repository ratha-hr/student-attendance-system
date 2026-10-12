import * as XLSX from 'xlsx';
import type { Student, Gender } from '../types';

export function calculateAge(dobStr: string): number {
  if (!dobStr) return 0;
  const birthYear = parseInt(dobStr.slice(0, 4), 10);
  if (isNaN(birthYear)) return 0;
  const currentYear = new Date().getFullYear();
  return Math.max(0, currentYear - birthYear);
}

export function exportStudentsToExcel(students: Student[], className: string) {
  const data = students.map((s, index) => {
    const age = s.age || calculateAge(s.dob);
    return {
      'ល.រ': s.rollNo || index + 1,
      'អត្តលេខ': s.studentCode,
      'គោត្តនាម នាម': s.nameKh,
      'ភេទ': s.gender,
      'ថ្ងៃខែឆ្នាំកំណើត': s.dob,
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
          const dob = String(row['ថ្ងៃខែឆ្នាំកំណើត'] || row['DOB'] || '2011-01-01');
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
            age: Number(row['អាយុ'] || calculateAge(dob)),
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

/**
 * Parse tab-separated or comma-separated text copied from Excel/XLSM/Sheets
 */
export function parsePastedExcelText(
  pastedText: string,
  classId: string,
  startRollNo = 1
): Partial<Student>[] {
  if (!pastedText || !pastedText.trim()) return [];

  const rawLines = pastedText
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) return [];

  // Check delimiter (Tab is standard for Excel clipboard, Comma fallback)
  const rows = rawLines.map((line) => {
    if (line.includes('\t')) {
      return line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    }
    return line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
  });

  // Check if first row is a table header
  let startIndex = 0;
  const firstRowStr = rows[0].join(' ').toLowerCase();
  const isHeader =
    firstRowStr.includes('ល.រ') ||
    firstRowStr.includes('អត្តលេខ') ||
    firstRowStr.includes('គោត្តនាម') ||
    firstRowStr.includes('ឈ្មោះ') ||
    firstRowStr.includes('ភេទ') ||
    firstRowStr.includes('name') ||
    firstRowStr.includes('gender') ||
    firstRowStr.includes('code');

  if (isHeader) {
    startIndex = 1;
  }

  // Khmer to Arabic digits map
  const khmerToArabic = (str: string) => {
    const kMap: Record<string, string> = {
      '០': '0', '១': '1', '២': '2', '៣': '3', '៤': '4',
      '៥': '5', '៦': '6', '៧': '7', '៨': '8', '៩': '9',
    };
    return str.replace(/[០-៩]/g, (ch) => kMap[ch] || ch);
  };

  const normalizeDate = (val: string): string => {
    if (!val) return '2011-01-01';
    val = khmerToArabic(val).trim();
    // Case 1: DD/MM/YYYY or DD-MM-YYYY
    const dmy = val.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }
    // Case 2: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    // Case 3: Excel serial number date
    const serial = Number(val);
    if (!isNaN(serial) && serial > 20000 && serial < 60000) {
      const utc_days = Math.floor(serial - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      return date_info.toISOString().slice(0, 10);
    }
    return val;
  };

  const results: Partial<Student>[] = [];
  let currentRoll = startRollNo;

  for (let i = startIndex; i < rows.length; i++) {
    const cells = rows[i];
    if (cells.length === 0 || cells.every((c) => !c)) continue;

    let rollNo = currentRoll;
    let studentCode = '';
    let nameKh = '';
    let gender: Gender = 'ប្រុស';
    let dob = '2011-01-01';
    let age = 0;
    let originSchool = '';
    let pobVillage = '';
    let pobCommune = '';
    let pobDistrict = '';
    let pobProvince = '';
    let addrVillage = '';
    let addrCommune = '';
    let addrDistrict = '';
    let addrProvince = '';
    let studentPhone = '';
    let fatherName = '';
    let fatherOccupation = '';
    let fatherPhone = '';
    let motherName = '';
    let motherOccupation = '';
    let motherPhone = '';
    let otherNotes = '';

    if (cells.length >= 15) {
      // Full MoEYS 23-column format
      if (cells[0] && !isNaN(Number(khmerToArabic(cells[0])))) {
        rollNo = Number(khmerToArabic(cells[0]));
      }
      studentCode = cells[1] || '';
      nameKh = cells[2] || '';
      gender =
        cells[3] === 'ស្រី' || /^(F|Female)$/i.test(cells[3]) ? 'ស្រី' : 'ប្រុស';
      dob = normalizeDate(cells[4]);
      if (cells[5] && !isNaN(Number(khmerToArabic(cells[5])))) {
        age = Number(khmerToArabic(cells[5]));
      }
      originSchool = cells[6] || '';
      pobVillage = cells[7] || '';
      pobCommune = cells[8] || '';
      pobDistrict = cells[9] || '';
      pobProvince = cells[10] || '';
      addrVillage = cells[11] || '';
      addrCommune = cells[12] || '';
      addrDistrict = cells[13] || '';
      addrProvince = cells[14] || '';
      studentPhone = cells[15] || '';
      fatherName = cells[16] || '';
      fatherOccupation = cells[17] || '';
      fatherPhone = cells[18] || '';
      motherName = cells[19] || '';
      motherOccupation = cells[20] || '';
      motherPhone = cells[21] || '';
      otherNotes = cells[22] || '';
    } else {
      // Dynamic column detector for custom / partial Excel pastes
      let colIdx = 0;
      // 1. Roll number (pure integer < 300)
      if (
        cells.length > 1 &&
        !isNaN(Number(khmerToArabic(cells[0]))) &&
        Number(khmerToArabic(cells[0])) < 300
      ) {
        rollNo = Number(khmerToArabic(cells[0]));
        colIdx = 1;
      }
      // 2. Student code (STU-xxx or numeric ID with > 4 digits)
      if (
        cells[colIdx] &&
        (/^STU/i.test(cells[colIdx]) || /^\d{4,8}$/.test(cells[colIdx]))
      ) {
        studentCode = cells[colIdx];
        colIdx++;
      }
      // 3. Name (mandatory)
      if (cells[colIdx]) {
        nameKh = cells[colIdx];
        colIdx++;
      }
      // 4. Gender (ប្រុស / ស្រី or M / F)
      if (cells[colIdx]) {
        if (
          cells[colIdx] === 'ស្រី' ||
          cells[colIdx] === 'ប្រុស' ||
          /^(F|M|Female|Male)$/i.test(cells[colIdx])
        ) {
          gender =
            cells[colIdx] === 'ស្រី' || /^(F|Female)$/i.test(cells[colIdx])
              ? 'ស្រី'
              : 'ប្រុស';
          colIdx++;
        }
      }
      // 5. DOB
      if (cells[colIdx]) {
        if (/\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(cells[colIdx])) {
          dob = normalizeDate(cells[colIdx]);
          colIdx++;
        }
      }
      // 6. Remaining columns sequentially
      if (cells[colIdx]) originSchool = cells[colIdx++];
      if (cells[colIdx]) pobProvince = cells[colIdx++];
      if (cells[colIdx]) addrProvince = cells[colIdx++];
      if (cells[colIdx]) studentPhone = cells[colIdx++];
      if (cells[colIdx]) fatherName = cells[colIdx++];
      if (cells[colIdx]) motherName = cells[colIdx++];
    }

    if (!studentCode) {
      studentCode = `STU-${String(currentRoll).padStart(3, '0')}`;
    }
    if (!nameKh) {
      nameKh = `សិស្ស ${currentRoll}`;
    }

    const calculatedAge = age || calculateAge(dob);

    results.push({
      id: `stu-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      classId,
      rollNo,
      studentCode,
      nameKh,
      gender,
      dob,
      age: calculatedAge,
      originSchool,
      pobVillage,
      pobCommune,
      pobDistrict,
      pobProvince,
      addrVillage,
      addrCommune,
      addrDistrict,
      addrProvince,
      studentPhone,
      fatherName,
      fatherOccupation,
      fatherPhone,
      motherName,
      motherOccupation,
      motherPhone,
      otherNotes,
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    currentRoll++;
  }

  return results;
}
