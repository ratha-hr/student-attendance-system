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
