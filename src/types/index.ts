export type Gender = 'ប្រុស' | 'ស្រី';

export interface ClassRoom {
  id: string;
  name: string; // ឧ. ថ្នាក់ទី ៧ ក, ថ្នាក់ទី ៨ ខ
  grade: string; // ឧ. ៧, ៨, ៩, ១០, ១១, ១២
  academicYear: string; // ឧ. ២០២៤-២០២៥
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
  pob: string; // ទីកន្លែងកំណើត
  currentAddress: string; // អាសយដ្ឋានបច្ចុប្បន្ន
  guardianName: string; // ឈ្មោះអាណាព្យាបាល
  guardianRelationship: string; // ឪពុក / ម្តាយ / អាណាព្យាបាល
  guardianPhone: string; // លេខទូរស័ព្ទអាណាព្យាបាល
  guardianOccupation?: string; // មុខរបរ
  avatar?: string;
  notes?: string; // កំណត់ចំណាំពិសេស
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
  classId: string;
  subject: string;
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
}
