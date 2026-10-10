export type Gender = 'ប្រុស' | 'ស្រី';

export interface ClassRoom {
  id: string;
  name: string; // ឧ. ថ្នាក់ទី ៧ ក, ថ្នាក់ទី ៨ ខ
  grade: string; // ឧ. ៧, ៨, ៩, ១០, ១១, ១២
  academicYear: string; // ឧ. ២០២៤-២០២៥
  homeroomTeacher?: string; // គ្រូទទួលបន្ទុកថ្នាក់ (Homeroom Teacher)
  room?: string; // ឧ. បន្ទប់ ១០២
  description?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  classId: string;
  rollNo: number; // លេខរៀង
  studentCode: string; // អត្តលេខសិស្ស
  nameKh: string; // ឈ្មោះខ្មែរ
  nameEn: string; // ឈ្មោះឡាតាំង
  gender: Gender; // ភេទ
  dob: string; // ថ្ងៃខែឆ្នាំកំណើត YYYY-MM-DD
  age?: number; // អាយុ
  originSchool?: string; // មកពីសាលា
  // ទីកន្លែងកំណើត
  pob?: string;
  pobVillage?: string; // ភូមិ
  pobCommune?: string; // ឃុំ/សង្កាត់
  pobDistrict?: string; // ស្រុក/ខណ្ឌ
  pobProvince?: string; // ខេត្ត/រាជធានី
  // អាសយដ្ឋានបច្ចុប្បន្ន
  currentAddress?: string;
  addrVillage?: string; // ភូមិ
  addrCommune?: string; // ឃុំ
  addrDistrict?: string; // ស្រុក
  addrProvince?: string; // ខេត្ត
  // លេខទូរស័ព្ទផ្ទាល់ខ្លួន
  studentPhone?: string;
  // ស្ថានភាពសិស្ស
  orphanStatus?: 'none' | 'father' | 'mother' | 'both'; // កំព្រា (ឪពុក/ម្តាយ/ឪពុកម្តាយ)
  isDisabled?: boolean; // ពិការ
  isPoor?: boolean; // ក្រីក្រ
  hasScholarship?: boolean; // អាហារូបករណ៍
  stayInPagoda?: boolean; // ស្នាក់នៅវត្ត
  // ព័ត៌មានឪពុក
  fatherName?: string;
  fatherOccupation?: string;
  fatherPhone?: string;
  // ព័ត៌មានម្តាយ
  motherName?: string;
  motherOccupation?: string;
  motherPhone?: string;
  // អាណាព្យាបាល (សម្រាប់ backward compatibility)
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianOccupation?: string;
  avatar?: string;
  notes?: string; // កំណត់ចំណាំ
  otherNotes?: string; // ផ្សេងៗ
  status: 'active' | 'suspended' | 'transferred';
  createdAt: string;
}

export type AttendanceStatus = 'present' | 'permission' | 'absent' | 'late';

export interface AttendanceRecord {
  id: string;
  classId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  session: 'morning' | 'afternoon' | 'all-day';
  timeSlot?: string; // 7:00-8:00, 8:00-9:00, etc.
  subject?: string;
  status: AttendanceStatus;
  reason?: string;
  createdAt: string;
}

export type ExtractCategory = 'reading' | 'lesson_summary' | 'dictation' | 'quote' | 'formula' | 'general';

export interface LessonExtract {
  id: string;
  title: string; // ចំណងជើងសម្រង់អត្ថបទ
  subject: string; // មុខវិជ្ជា ឧ. ភាសាខ្មែរ, គណិតវិទ្យា...
  grade: string; // កម្រិតថ្នាក់
  category: ExtractCategory;
  content: string; // ខ្លឹមសារពេញលេញ
  source?: string; // ប្រភព ឬសៀវភៅយោង
  tags: string[]; // ស្លាកពាក្យគន្លឹះ
  createdAt: string;
}

export type LetterType = 'absence_warning' | 'parent_invite' | 'disciplinary_pledge';

export interface OfficialLetter {
  id: string;
  type: LetterType;
  letterNumber: string; // លេខលិខិត
  classId: string;
  studentId: string;
  dateCreated: string;
  meetingDate?: string; // កាលបរិច្ឆេទណាត់ជួប
  meetingTime?: string; // ម៉ោងណាត់ជួប
  customReason?: string; // មូលហេតុបន្ថែម
  absenceThresholdNoticed?: number;
}

export type PlanStatus = 'pending' | 'in_progress' | 'completed';

export interface YearlyPlanItem {
  id: string;
  academicYear: string;
  term: 'term1' | 'term2';
  month: string; // ឧ. តុលា, វិច្ឆិកា...
  week: number; // សប្តាហ៍ទី ១, ២, ៣, ៤
  subject: string;
  grade: string;
  chapter: string; // ជំពូកទី...
  lessonTitle: string; // ចំណងជើងមេរៀន / សកម្មភាព
  durationHours: number; // ចំនួនម៉ោង
  objectives: string; // វត្ថុបំណង
  materials?: string; // សម្ភារៈឧបទេស
  assessment?: string; // ការវាយតម្លៃ
  status: PlanStatus;
  notes?: string;
}

export interface StudentGrade {
  id: string;
  classId: string;
  studentId: string;
  month: string; // ឧ. តុលា, វិច្ឆិកា, ប្រឡងឆមាសទី១...
  academicYear: string;
  scores: Record<string, number>; // e.g. { "khmer": 80, "math": 90 }
  conduct: 'ល្អណាស់' | 'ល្អ' | 'មធ្យម' | 'ខ្សោយ';
}

export interface TimetableSlot {
  id: string;
  dayOfWeek: number; // 1 = ច័ន្ទ, 2 = អង្គារ, ..., 6 = សៅរ៍
  timeSlot: string; // 07:00 - 07:50
  periodNumber?: number; // 1, 2, 3, 4, 5
  session?: 'morning' | 'afternoon';
  classId: string;
  subject: string;
  teacherName?: string;
  teacherPhone?: string;
  room?: string;
}

export interface TeacherSettings {
  teacherName: string;
  schoolName: string;
  schoolCode?: string;
  principalName: string;
  specialtySubject: string;
  academicYear: string;
  provinceCity: string;
  absenceWarningThreshold: number; // ចំនួនថ្ងៃអវត្តមានដែលត្រូវចេញលិខិតព្រមាន (Default: 3)
  phone: string;
  email?: string;
  customGradeCoefficients?: Record<string, Record<string, { maxScore: number; coefficient: number }>>;
}
