import type { Student, Gender } from '../types';

const VILLAGES = [
  'ភូមិកំពង់ត្រឡាចលើ',
  'ភូមិកំពង់ត្រឡាចក្រោម',
  'ភូមិថ្មី',
  'ភូមិព្រែកកក់',
  'ភូមិសាលាលេខ៥',
  'ភូមិកោះតូច',
  'ភូមិត្រពាំងគល់',
  'ភូមិបាក់ចង្អៀរ',
  'ភូមិពានី',
  'ភូមិស្នាពេជ្រ',
];

const COMMUNES = [
  'ឃុំកំពង់ត្រឡាច',
  'ឃុំសាលាលេខ៥',
  'ឃុំតាជេស',
  'ឃុំឈូកស',
  'ឃុំអំបិល',
  'ឃុំពានី',
  'ឃុំសែប',
];

const FATHERS = [
  { name: 'សេង សុវណ្ណ', occ: 'គ្រូបង្រៀន' },
  { name: 'ស្រ៊ុន ពិសិដ្ឋ', occ: 'មន្ត្រីរាជការ' },
  { name: 'ឈឹម សម្បត្តិ', occ: 'កសិករ' },
  { name: 'នួន សុផល', occ: 'អាជីវករ' },
  { name: 'កែវ សារ៉ាត់', occ: 'ជាងសំណង់' },
  { name: 'ហេង វិបុល', occ: 'បើកបររថយន្ត' },
  { name: 'សុខ សារឿន', occ: 'កសិករ' },
  { name: 'ចាន់ សុខុម', occ: 'មន្ត្រីរាជការ' },
  { name: 'អ៊ុំ វ៉ាន់ដា', occ: 'អាជីវករ' },
  { name: 'ម៉ៅ ចំរើន', occ: 'វិស្វករ' },
];

const MOTHERS = [
  { name: 'ស៊ូ គឹមស្រ៊ុន', occ: 'មេផ្ទះ' },
  { name: 'ចាន់ ផល្លា', occ: 'កសិករ' },
  { name: 'អ៊ុក សុគន្ធា', occ: 'អាជីវករ' },
  { name: 'មាស សុខា', occ: 'គ្រូបង្រៀន' },
  { name: 'លឹម គឹមហៀង', occ: 'កាត់ដេរ' },
  { name: 'ទិត្យ ស្រីមុំ', occ: 'មេផ្ទះ' },
  { name: 'ជា ស្រីពៅ', occ: 'អាជីវករ' },
  { name: 'ស៊្រុន ចិន្តា', occ: 'កសិករ' },
  { name: 'រស់ វណ្ណា', occ: 'មេផ្ទះ' },
  { name: 'អ៊ិន សោភា', occ: 'គិលានុបដ្ឋាក' },
];

/**
 * Enriches a Student object with full Image 2 MoEYS fields
 * (Villages, Communes, Districts in Kampong Chhnang, Father, Mother, etc.)
 */
export function enrichStudentWithMoEYSFields(student: Student, index: number): Student {
  const vIndex = index % VILLAGES.length;
  const cIndex = index % COMMUNES.length;
  const fIndex = index % FATHERS.length;
  const mIndex = index % MOTHERS.length;

  const father = FATHERS[fIndex];
  const mother = MOTHERS[mIndex];

  // Specific phone format
  const phoneSuffix1 = String(100 + ((index * 37) % 900)).padStart(3, '0');
  const phoneSuffix2 = String(100 + ((index * 71) % 900)).padStart(3, '0');

  return {
    ...student,
    originSchool:
      student.originSchool ||
      (student.classId === 'class-7'
        ? 'សាលាបឋមសិក្សាកំពង់ត្រឡាច'
        : student.classId === 'class-8' || student.classId === 'class-9'
        ? 'អនុវិទ្យាល័យកំពង់ត្រឡាច'
        : 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'),
    pobVillage: student.pobVillage || VILLAGES[vIndex],
    pobCommune: student.pobCommune || COMMUNES[cIndex],
    pobDistrict: student.pobDistrict || 'ស្រុកកំពង់ត្រឡាច',
    pobProvince: student.pobProvince || student.pob || 'ខេត្តកំពង់ឆ្នាំង',
    addrVillage: student.addrVillage || VILLAGES[vIndex],
    addrCommune: student.addrCommune || COMMUNES[cIndex],
    addrDistrict: student.addrDistrict || 'ស្រុកកំពង់ត្រឡាច',
    addrProvince: student.addrProvince || 'ខេត្តកំពង់ឆ្នាំង',
    studentPhone:
      student.studentPhone ||
      (index % 2 === 0
        ? `09${(index % 8) + 2} ${phoneSuffix1} ${phoneSuffix2}`
        : ''),
    orphanStatus:
      student.orphanStatus ||
      (index % 23 === 0 ? 'father' : index % 37 === 0 ? 'mother' : 'none'),
    isDisabled: student.isDisabled ?? (index === 18 || index === 92),
    isPoor: student.isPoor ?? (index % 7 === 0),
    hasScholarship: student.hasScholarship ?? (index % 11 === 0),
    stayInPagoda: student.stayInPagoda ?? (index % 29 === 0 && student.gender === 'ប្រុស'),
    fatherName: student.fatherName || student.guardianName || father.name,
    fatherOccupation:
      student.fatherOccupation || student.guardianOccupation || father.occ,
    fatherPhone:
      student.fatherPhone ||
      student.guardianPhone ||
      `012 ${phoneSuffix1} ${phoneSuffix2}`,
    motherName: student.motherName || mother.name,
    motherOccupation: student.motherOccupation || mother.occ,
    motherPhone:
      student.motherPhone ||
      `088 ${phoneSuffix2} ${phoneSuffix1}`,
  };
}
