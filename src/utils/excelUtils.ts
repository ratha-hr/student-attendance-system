import * as XLSX from 'xlsx';
import type { Student, Gender } from '../types';

export function exportStudentsToExcel(students: Student[], className: string) {
  const data = students.map((s, index) => ({
    'លេខរៀង': index + 1,
    'អត្តលេខ': s.studentCode,
    'គោត្តនាម-នាម': s.nameKh,
    'ឈ្មោះជាអក្សរឡាតាំង': s.nameEn,
    'ភេទ': s.gender,
    'ថ្ងៃខែឆ្នាំកំណើត': s.dob,
    'ទីកន្លែងកំណើត': s.pob,
    'ឈ្មោះអាណាព្យាបាល': s.guardianName,
    'ទំនាក់ទំនង': s.guardianRelationship,
    'លេខទូរស័ព្ទ': s.guardianPhone,
    'អាសយដ្ឋានបច្ចុប្បន្ន': s.currentAddress,
    'កំណត់ចំណាំ': s.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'បញ្ជីរាយនាមសិស្ស');

  // Auto-width columns
  const colWidths = [
    { wch: 8 },  // លេខរៀង
    { wch: 12 }, // អត្តលេខ
    { wch: 22 }, // គោត្តនាម-នាម
    { wch: 22 }, // ឈ្មោះឡាតាំង
    { wch: 8 },  // ភេទ
    { wch: 14 }, // ថ្ងៃខែឆ្នាំកំណើត
    { wch: 24 }, // ទីកន្លែងកំណើត
    { wch: 20 }, // អាណាព្យាបាល
    { wch: 12 }, // ទំនាក់ទំនង
    { wch: 16 }, // ទូរស័ព្ទ
    { wch: 28 }, // អាសយដ្ឋាន
    { wch: 20 }, // កំណត់ចំណាំ
  ];
  worksheet['!cols'] = colWidths;

  const fileName = `បញ្ជីសិស្ស_${className.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function downloadStudentTemplate() {
  const templateData = [
    {
      'លេខរៀង': 1,
      'អត្តលេខ': 'STU-001',
      'គោត្តនាម-នាម': 'ចាន់ សុខា',
      'ឈ្មោះជាអក្សរឡាតាំង': 'Chan Sokha',
      'ភេទ': 'ប្រុស',
      'ថ្ងៃខែឆ្នាំកំណើត': '2010-05-15',
      'ទីកន្លែងកំណើត': 'ខេត្តកណ្តាល',
      'ឈ្មោះអាណាព្យាបាល': 'ចាន់ សុវណ្ណ',
      'ទំនាក់ទំនង': 'ឪពុក',
      'លេខទូរស័ព្ទ': '012 345 678',
      'អាសយដ្ឋានបច្ចុប្បន្ន': 'ភូមិ១ សង្កាត់បឹងកក់ ភ្នំពេញ',
      'កំណត់ចំណាំ': 'សិស្សពូកែ',
    },
    {
      'លេខរៀង': 2,
      'អត្តលេខ': 'STU-002',
      'គោត្តនាម-នាម': 'កែវ មុន្នី',
      'ឈ្មោះជាអក្សរឡាតាំង': 'Keo Mony',
      'ភេទ': 'ស្រី',
      'ថ្ងៃខែឆ្នាំកំណើត': '2010-08-20',
      'ទីកន្លែងកំណើត': 'រាជធានីភ្នំពេញ',
      'ឈ្មោះអាណាព្យាបាល': 'កែវ វិបុល',
      'ទំនាក់ទំនង': 'ឪពុក',
      'លេខទូរស័ព្ទ': '098 765 432',
      'អាសយដ្ឋានបច្ចុប្បន្ន': 'ខណ្ឌទួលគោក ភ្នំពេញ',
      'កំណត់ចំណាំ': '',
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'គំរូបញ្ចូលទិន្នន័យ');
  XLSX.writeFile(workbook, 'គំរូ_បញ្ចូលបញ្ជីសិស្ស.xlsx');
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
          return {
            id: 'stu_' + Date.now() + '_' + idx,
            classId: classId,
            rollNo: Number(row['លេខរៀង'] || row['Roll'] || idx + 1),
            studentCode: String(row['អត្តលេខ'] || row['Code'] || `STU-${String(idx + 1).padStart(3, '0')}`),
            nameKh: String(row['គោត្តនាម-នាម'] || row['ឈ្មោះ'] || row['Name'] || `សិស្ស ទី${idx + 1}`),
            nameEn: String(row['ឈ្មោះជាអក្សរឡាតាំង'] || row['ឈ្មោះឡាតាំង'] || row['Latin Name'] || ''),
            gender: gender,
            dob: String(row['ថ្ងៃខែឆ្នាំកំណើត'] || row['DOB'] || '2010-01-01'),
            pob: String(row['ទីកន្លែងកំណើត'] || row['POB'] || ''),
            currentAddress: String(row['អាសយដ្ឋានបច្ចុប្បន្ន'] || row['អាសយដ្ឋាន'] || row['Address'] || ''),
            guardianName: String(row['ឈ្មោះអាណាព្យាបាល'] || row['អាណាព្យាបាល'] || row['Guardian'] || ''),
            guardianRelationship: String(row['ទំនាក់ទំនង'] || 'អាណាព្យាបាល'),
            guardianPhone: String(row['លេខទូរស័ព្ទ'] || row['ទូរស័ព្ទ'] || row['Phone'] || ''),
            notes: String(row['កំណត់ចំណាំ'] || row['Notes'] || ''),
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
