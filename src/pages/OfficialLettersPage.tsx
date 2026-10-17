import React, { useState, useMemo, useEffect } from 'react';
import {
  MailWarning,
  Printer,
  Calendar,
  Clock,
  User,
  School,
  AlertTriangle,
  FileCheck2,
  FileText,
  ChevronDown,
  CheckCircle2,
  Users,
  Layers,
  Building2,
  Phone,
  Hash,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, TeacherSettings, LetterType } from '../types';
import {
  toKhmerNum,
  formatKhmerDate,
  getTodayDateString,
  getKhmerOfficialDateHeader,
} from '../utils/dateUtils';
import { PrintButton } from '../components/common/PrintButton';

interface OfficialLettersPageProps {
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords: AttendanceRecord[];
  settings: TeacherSettings | null;
  selectedStudentId?: string;
  selectedClassId: string;
  onSelectClass: (id: string) => void;
}

export const OfficialLettersPage: React.FC<OfficialLettersPageProps> = ({
  students,
  classes,
  attendanceRecords,
  settings,
  selectedStudentId,
  selectedClassId,
  onSelectClass,
}) => {
  const warningThreshold = settings?.absenceWarningThreshold || 3;
  const [printMode, setPrintMode] = useState<'single' | 'batch'>('single');

  // Active class filter (if 'ALL', can show all or specific)
  const activeClassId = selectedClassId;

  // Calculate absences map for all students
  const studentAbsenceMap = useMemo(() => {
    const map = new Map<string, { unexcused: number; excused: number; total: number; dates: string[] }>();
    attendanceRecords.forEach((r) => {
      const curr = map.get(r.studentId) || { unexcused: 0, excused: 0, total: 0, dates: [] };
      if (r.status === 'absent') {
        curr.unexcused++;
        curr.total++;
        curr.dates.push(r.date);
      } else if (r.status === 'permission') {
        curr.excused++;
        curr.total++;
        curr.dates.push(r.date);
      }
      map.set(r.studentId, curr);
    });
    return map;
  }, [attendanceRecords]);

  // Filter students strictly by selected class (if not ALL)
  const scopedStudents = useMemo(() => {
    return students.filter((s) => activeClassId === 'ALL' || s.classId === activeClassId);
  }, [students, activeClassId]);

  // List of qualifying students who exceeded or have absences
  const studentsWithAbsences = useMemo(() => {
    return scopedStudents
      .map((stu) => {
        const abs = studentAbsenceMap.get(stu.id) || { unexcused: 0, excused: 0, total: 0, dates: [] };
        const cls = classes.find((c) => c.id === stu.classId);
        return {
          ...stu,
          className: cls?.name || '',
          unexcused: abs.unexcused,
          excused: abs.excused,
          total: abs.total,
          dates: abs.dates,
        };
      })
      .filter((s) => s.total > 0)
      .sort((a, b) => b.unexcused - a.unexcused);
  }, [scopedStudents, classes, studentAbsenceMap]);

  // High-priority absent students (unexcused >= threshold) for batch printing
  const batchStudents = useMemo(() => {
    const list = studentsWithAbsences.filter((s) => s.unexcused >= warningThreshold);
    return list.length > 0 ? list : studentsWithAbsences;
  }, [studentsWithAbsences, warningThreshold]);

  // Selected student state for single mode
  const [currentStudentId, setCurrentStudentId] = useState<string>(
    selectedStudentId || studentsWithAbsences[0]?.id || scopedStudents[0]?.id || ''
  );

  // When class or list changes, ensure currentStudentId is valid
  useEffect(() => {
    if (selectedStudentId && scopedStudents.some((s) => s.id === selectedStudentId)) {
      setCurrentStudentId(selectedStudentId);
    } else if (!scopedStudents.some((s) => s.id === currentStudentId)) {
      setCurrentStudentId(studentsWithAbsences[0]?.id || scopedStudents[0]?.id || '');
    }
  }, [activeClassId, scopedStudents, studentsWithAbsences, selectedStudentId]);

  // Letter configuration state
  const [letterType, setLetterType] = useState<LetterType>('absence_warning');
  const [warningLevel, setWarningLevel] = useState<'auto' | 'level1' | 'level2' | 'final'>('auto');
  const [letterNumber, setLetterNumber] = useState('០៤៥/២៦');
  const [schoolAcronym, setSchoolAcronym] = useState('វ.ហ.ស.ក.ត្រ');
  const [issuanceDate, setIssuanceDate] = useState(getTodayDateString());
  const [meetingDate, setMeetingDate] = useState(getTodayDateString());
  const [meetingTime, setMeetingTime] = useState('០៨:៣០ ព្រឹក');
  const [customNote, setCustomNote] = useState('');

  // Signatory Overrides (prefilled with teacher settings)
  const [principalNameOverride, setPrincipalNameOverride] = useState(settings?.principalName || 'នាយកសាលា');
  const [teacherNameOverride, setTeacherNameOverride] = useState(settings?.teacherName || 'លោកគ្រូ-អ្នកគ្រូ');
  const [teacherPhoneOverride, setTeacherPhoneOverride] = useState(settings?.phone || '093 486 987');

  useEffect(() => {
    if (settings?.principalName) setPrincipalNameOverride(settings.principalName);
    if (settings?.teacherName) setTeacherNameOverride(settings.teacherName);
    if (settings?.phone) setTeacherPhoneOverride(settings.phone);
  }, [settings]);

  const currentStudent = scopedStudents.find((s) => s.id === currentStudentId) || scopedStudents[0];
  const currentClass = classes.find((c) => c.id === currentStudent?.classId);
  const absenceData = currentStudent
    ? studentAbsenceMap.get(currentStudent.id) || { unexcused: 0, excused: 0, total: 0, dates: [] }
    : { unexcused: 0, excused: 0, total: 0, dates: [] };

  // Calculate official administrative date (Lunar on top, Solar below)
  const officialDate = useMemo(() => {
    return getKhmerOfficialDateHeader(issuanceDate, settings?.provinceCity || 'ខេត្តកំពង់ឆ្នាំង');
  }, [issuanceDate, settings?.provinceCity]);

  // Helper to determine warning level label
  const getWarningLevelInfo = (unexcused: number): { label: string; badge: string } => {
    if (warningLevel === 'level1') return { label: 'លើកទី១', badge: 'ព្រមានលើកទី១' };
    if (warningLevel === 'level2') return { label: 'លើកទី២', badge: 'ព្រមានលើកទី២' };
    if (warningLevel === 'final') return { label: 'លើកចុងក្រោយ', badge: 'ព្រមានលើកចុងក្រោយ' };
    // Auto detection
    if (unexcused <= 3) return { label: 'លើកទី១', badge: 'ព្រមានលើកទី១' };
    if (unexcused <= 6) return { label: 'លើកទី២', badge: 'ព្រមានលើកទី២' };
    return { label: 'លើកចុងក្រោយ', badge: 'ព្រមានលើកចុងក្រោយ' };
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to render an individual official school-level letter
  const renderLetterContent = (
    stu: Student,
    stuClass: ClassRoom | undefined,
    abs: { unexcused: number; excused: number; total: number; dates: string[] },
    idx?: number
  ) => {
    const datesFormatted =
      abs.dates.length > 0
        ? abs.dates.slice(-6).map((d) => formatKhmerDate(d, false)).join(', ')
        : 'កាលបរិច្ឆេទក្នុងខែបច្ចុប្បន្ន';

    const warningInfo = getWarningLevelInfo(abs.unexcused);
    const provinceName = settings?.provinceCity ? (settings.provinceCity.startsWith('ខេត្ត') || settings.provinceCity.startsWith('រាជធានី') ? settings.provinceCity : `ខេត្ត${settings.provinceCity}`) : 'ខេត្តកំពង់ឆ្នាំង';
    const schoolName = settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច';

    return (
      <div
        key={stu.id}
        className="official-letter-doc bg-white p-7 sm:p-10 md:p-12 rounded-3xl border border-slate-300 shadow-md print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900 font-kantumruy print-page text-[13px] sm:text-[13.5px] leading-[1.75]"
        style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
      >
        {/* Header: Kingdom of Cambodia & Ministry/School Level */}
        <div className="flex justify-between items-start gap-4">
          {/* Left Side: Ministry, Department & School */}
          <div className="text-center font-semibold space-y-0.5 leading-snug">
            <p className="font-moul text-xs sm:text-[13px] text-slate-950 tracking-wider">
              ក្រសួងអប់រំ យុវជន និងកីឡា
            </p>
            <p className="text-xs sm:text-[12px] font-bold text-slate-800">
              មន្ទីរអប់រំ យុវជន និងកីឡា {provinceName}
            </p>
            <p className="font-bold text-xs sm:text-[13px] text-indigo-950">
              {schoolName}
            </p>
            <p className="text-[11.5px] text-slate-600 pt-1 font-mono font-medium">
              លេខ ៖ {letterNumber} {idx !== undefined ? `-${toKhmerNum(idx + 1)}` : ''} / {schoolAcronym}
            </p>
          </div>

          {/* Right Side: Kingdom of Cambodia Banner & Administrative Divider */}
          <div className="text-center space-y-1">
            <h3 className="font-moul text-sm sm:text-[15px] text-slate-950 tracking-wide">
              ព្រះរាជាណាចក្រកម្ពុជា
            </h3>
            <h4 className="font-moul text-xs sm:text-[13px] text-slate-900">
              ជាតិ សាសនា ព្រះមហាក្សត្រ
            </h4>
            <div className="flex items-center justify-center space-x-1.5 pt-1 text-slate-800">
              <span className="w-10 h-[1.5px] bg-slate-800 rounded-full" />
              <span className="text-xs font-bold leading-none select-none">៚</span>
              <span className="w-10 h-[1.5px] bg-slate-800 rounded-full" />
            </div>
          </div>
        </div>

        {/* Letter Title & Warning Level */}
        <div className="text-center my-4 space-y-1">
          <h2 className="font-moul text-base sm:text-lg text-slate-950 leading-normal tracking-wide">
            {letterType === 'absence_warning' && 'លិខិតជូនដំណឹង និងព្រមានស្ដីពីអវត្តមានសិស្ស'}
            {letterType === 'parent_invite' && 'លិខិតអញ្ជើញមាតាបិតា ឬអាណាព្យាបាលសិស្ស'}
            {letterType === 'disciplinary_pledge' && 'លិខិតកិច្ចសន្យាអប់រំកែប្រែ និងការគោរពវត្តមានសិក្សា'}
          </h2>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs sm:text-[12.5px] font-bold text-slate-700">
              ( ស្ដីពីការអវត្តមានពីការសិក្សាដោយគ្មានការអនុញ្ញាតច្បាប់ )
            </span>
            {letterType === 'absence_warning' && (
              <span className="text-[11px] font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 print:border-slate-400 print:text-black">
                {warningInfo.badge}
              </span>
            )}
          </div>
        </div>

        {/* Official Subject & References (កម្មវត្ថុ និង យោង) */}
        <div className="text-xs sm:text-[12.5px] space-y-1.5 my-3 bg-slate-50/80 print:bg-transparent p-3 print:p-0 rounded-xl border border-slate-200 print:border-none">
          <div className="flex items-start">
            <span className="font-bold text-slate-900 shrink-0 w-16">កម្មវត្ថុ ៖</span>
            <span className="text-slate-800 leading-relaxed">
              ស្ដីពីការជូនដំណឹង ដាស់តឿន និងចាត់វិធានការអប់រំ {warningInfo.label} ចំពោះសិស្សឈ្មោះ{' '}
              <strong className="font-bold text-slate-950">{stu.nameKh}</strong> ភេទ{' '}
              <strong className="font-bold">{stu.gender}</strong> ថ្នាក់ទី{' '}
              <strong className="font-bold">{stuClass?.name || '...'}</strong> ដែលបានអវត្តមានពីការសិក្សាច្រើនដងដោយគ្មានការអនុញ្ញាតច្បាប់ត្រឹមត្រូវ។
            </span>
          </div>
          <div className="flex items-start">
            <span className="font-bold text-slate-900 shrink-0 w-16">យោង ៖</span>
            <div className="text-slate-800 leading-relaxed space-y-0.5">
              <p>- បទបញ្ជាផ្ទៃក្នុងរបស់{schoolName} ស្ដីពីវិន័យ និងការគោរពវត្តមានសិក្សារបស់សិស្សានុសិស្ស។</p>
              <p>
                - សៀវភៅតាមដានវត្តមានសិស្សប្រចាំថ្ងៃរបស់ថ្នាក់ទី{' '}
                <strong className="font-bold">{stuClass?.name || '...'}</strong> ឆ្នាំសិក្សា{' '}
                {settings?.academicYear || '២០២៥-២០២៦'}។
              </p>
            </div>
          </div>
        </div>

        {/* Recipient & Student Identity Card */}
        <div className="text-xs sm:text-[13px] space-y-2 mb-3.5">
          <p className="text-slate-900 leading-relaxed">
            <span className="font-bold">សូមគោរពជូនចំពោះ ៖ </span>
            លោក/លោកស្រី{' '}
            <span className="font-bold underline text-slate-950">
              {stu.guardianName || 'មាតាបិតា ឬអាណាព្យាបាល'}
            </span>{' '}
            (ត្រូវជា <span className="font-bold">{stu.guardianRelationship || 'អាណាព្យាបាល'}</span> របស់សិស្ស)
          </p>

          {/* Student Official Data Box */}
          <div className="border border-slate-300 rounded-xl p-2.5 sm:p-3 bg-white space-y-1.5 text-[12px] sm:text-[12.5px] print:text-[10pt]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-slate-600">សិស្សឈ្មោះ ៖ </span>
                <strong className="text-slate-950 font-bold text-[13px]">{stu.nameKh}</strong>
                {stu.nameEn && <span className="text-slate-600 font-mono text-[11px] ml-1">({stu.nameEn})</span>}
              </div>
              <div>
                <span className="text-slate-600">ភេទ ៖ </span>
                <strong className="text-slate-900 font-bold">{stu.gender}</strong>
              </div>
              <div>
                <span className="text-slate-600">អត្តលេខ ៖ </span>
                <strong className="text-slate-900 font-bold font-mono">{stu.studentCode || '---'}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100 print:border-slate-300">
              <div>
                <span className="text-slate-600">ថ្នាក់ទី ៖ </span>
                <strong className="text-slate-900 font-bold">{stuClass?.name || '---'}</strong>
                <span className="text-slate-500 text-[11px] ml-1.5">(លេខរៀង៖ {toKhmerNum(stu.rollNo || '---')})</span>
              </div>
              <div>
                <span className="text-slate-600">ថ្ងៃខែឆ្នាំកំណើត ៖ </span>
                <strong className="text-slate-900 font-bold">
                  {stu.dob ? formatKhmerDate(stu.dob, false) : '---'}
                </strong>
              </div>
              <div>
                <span className="text-slate-600">ទូរស័ព្ទអាណាព្យាបាល ៖ </span>
                <strong className="text-slate-900 font-bold font-mono">{stu.guardianPhone || stu.studentPhone || '---'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Body Paragraphs: Detailed Official Content */}
        <div className="text-xs sm:text-[13px] print:text-[10pt] leading-[1.8] text-justify space-y-2.5">
          {/* Paragraph 1: Notification & Detailed Absences */}
          <p className="indent-8 text-slate-900">
            តបតាមកម្មវត្ថុ និងយោងខាងលើ គណៈគ្រប់គ្រង{schoolName} រួមជាមួយលោកគ្រូ-អ្នកគ្រូបន្ទុកថ្នាក់ សូមជម្រាបជូនលោក/លោកស្រីមាតាបិតា ឬអាណាព្យាបាលមេត្តាជ្រាបថា ៖ កន្លងមកនេះ សិស្សឈ្មោះ{' '}
            <strong className="font-bold text-slate-950">{stu.nameKh}</strong> បានអវត្តមានពីការសិក្សាសរុបចំនួន{' '}
            <strong className="font-bold text-rose-600 print:text-black underline text-sm">{toKhmerNum(abs.total)} លើក/ម៉ោង</strong>{' '}
            ក្នុងនោះរួមមាន ៖ អវត្តមានឥតច្បាប់ (គ្មានមូលហេតុ ឬគ្មានការអនុញ្ញាត) ចំនួន{' '}
            <strong className="font-bold text-rose-600 print:text-black underline text-sm">{toKhmerNum(abs.unexcused)} លើក/ម៉ោង</strong>{' '}
            និងអវត្តមានមានច្បាប់ចំនួន <strong className="font-bold text-slate-900">{toKhmerNum(abs.excused)} លើក/ម៉ោង</strong>{' '}
            (កាលបរិច្ឆេទអវត្តមានជាក់ស្តែង ៖ {datesFormatted})។
          </p>

          {/* Paragraph 2: Impact & School Rules */}
          <p className="indent-8 text-slate-900">
            ការអវត្តមានពីការសិក្សាដោយគ្មានការអនុញ្ញាតច្បាប់ត្រឹមត្រូវនេះ បានធ្វើឱ្យសិស្សខកខានការក្រេបជញ្ជក់ចំណេះដឹង មេរៀនស្នូល និងការអនុវត្តលំហាត់សំខាន់ៗក្នុងថ្នាក់ ដែលបង្កផលប៉ះពាល់យ៉ាងធ្ងន់ធ្ងរដល់ការយល់ដឹង លទ្ធផលសិក្សាប្រចាំខែ ការប្រឡងឆមាស ព្រមទាំងផ្ទុយស្រឡះពីបទបញ្ជាផ្ទៃក្នុងរបស់សាលារៀន។ យោងតាមបទបញ្ជាផ្ទៃក្នុង ប្រសិនបើសិស្សានុសិស្សនៅតែបន្តអវត្តមានឥតច្បាប់លើសពីចំនួនកំណត់ នោះសាលារៀននឹងចាត់វិធានការរដ្ឋបាលជាធរមាន ឬអាចឈានដល់ការកាត់ពិន្ទុស្វ័យប្រវត្តិ និងបាត់បង់សិទ្ធិក្នុងការប្រឡងបញ្ចប់ឆ្នាំសិក្សា។
          </p>

          {/* Paragraph 3: Action Required */}
          {letterType === 'parent_invite' ? (
            <p className="indent-8 font-semibold text-slate-950 bg-amber-50/70 print:bg-transparent p-2.5 print:p-0 rounded-xl border border-amber-200 print:border-none">
              អាស្រ័យហេតុនេះ ដើម្បីរួមគ្នាដោះស្រាយបញ្ហា និងស្វែងរកវិធានការជួយជ្រោមជ្រែងដល់ការសិក្សារបស់កូន-ក្មួយ គណៈគ្រប់គ្រងសាលាសូមគោរពអញ្ជើញលោក/លោកស្រីមាតាបិតា ឬអាណាព្យាបាល មេត្តាអញ្ជើញមកកាន់{schoolName} (បន្ទប់ការិយាល័យសិក្សា) នៅថ្ងៃទី{' '}
              <strong className="font-bold underline">{formatKhmerDate(meetingDate, false)}</strong> វេលាម៉ោង{' '}
              <strong className="font-bold underline">{meetingTime}</strong> ដើម្បីជួបពិភាក្សាការងារផ្ទាល់ជាមួយគណៈគ្រប់គ្រងសាលា និងលោកគ្រូ-អ្នកគ្រូបន្ទុកថ្នាក់។
            </p>
          ) : letterType === 'disciplinary_pledge' ? (
            <p className="indent-8 font-semibold text-slate-950">
              អាស្រ័យហេតុនេះ សិស្សឈ្មោះ <strong>{stu.nameKh}</strong> សូមធ្វើកិច្ចសន្យាចំពោះមុខគណៈគ្រប់គ្រងសាលា លោកគ្រូ-អ្នកគ្រូបន្ទុកថ្នាក់ និងមាតាបិតា ថានឹងកែប្រែឥរិយាបថ គោរពបទបញ្ជាផ្ទៃក្នុង និងមកចូលរៀនឱ្យបានទៀងទាត់ជារៀងរាល់ថ្ងៃ ដោយមិនឱ្យមានការអវត្តមានឥតច្បាប់តទៅទៀតឡើយ។ ប្រសិនបើនៅតែប្រព្រឹត្តខុស ខ្ញុំបាទ/នាងខ្ញុំសូមទទួលខុសត្រូវចំពោះមុខវិន័យរបស់សាលារៀន។
            </p>
          ) : (
            <p className="indent-8 text-slate-900">
              អាស្រ័យហេតុនេះ ដើម្បីធានាអនាគត និងផលប្រយោជន៍សិក្សារបស់កូន-ក្មួយ គណៈគ្រប់គ្រងសាលា និងលោកគ្រូ-អ្នកគ្រូបន្ទុកថ្នាក់ សូមស្នើលោក/លោកស្រីមាតាបិតា ឬអាណាព្យាបាល មេត្តាជួយអប់រំ ទូន្មាន ដាស់តឿន និងតាមដានវត្តមានរបស់កូន-ក្មួយឱ្យបានហ្មត់ចត់ជាទីបំផុត។ ជាមួយគ្នានេះ សូមលោក/លោកស្រីមេត្តាចុះហត្ថលេខាទទួលដំណឹងលើលិខិតនេះ ហើយប្រគល់ជូនសិស្សយកមកជូនលោកគ្រូ-អ្នកគ្រូបន្ទុកថ្នាក់វិញឱ្យបានទាន់ពេលវេលា។
            </p>
          )}

          {/* Paragraph 4: Closing Politeness */}
          <p className="indent-8 text-slate-900">
            សាលារៀនសង្ឃឹមយ៉ាងមុតមាំលើស្មារតីសហការដ៏ល្អ និងការយកចិត្តទុកដាក់ខ្ពស់ពីសំណាក់លោក/លោកស្រីមាតាបិតា ឬអាណាព្យាបាល ដើម្បីអនាគតដ៏ភ្លឺស្វាងរបស់កូន-ក្មួយ។
          </p>
          <p className="indent-8 text-slate-900">
            សូមលោក/លោកស្រី មាតាបិតា ឬអាណាព្យាបាល ទទួលនូវការរាប់អានដ៏ស្មោះស្ម័គ្រ និងសេចក្តីគោរពដ៏ជ្រាលជ្រៅពីយើងខ្ញុំ។
          </p>

          {customNote && (
            <p className="italic text-slate-700 font-medium pt-1">
              * ចំណារបន្ថែម ៖ {customNote}
            </p>
          )}
        </div>

        {/* Signatures & Official Dates: 3-Column School-Level Layout */}
        <div className="mt-6 pt-2 text-xs sm:text-[13px] print:text-[10pt]">
          <div className="grid grid-cols-3 gap-3 items-start">
            {/* Column 1: Parent / Guardian Acknowledgement */}
            <div className="text-center space-y-1">
              <p className="font-bold text-slate-950 font-kantumruy">បានឃើញ និងទទួលដំណឹង</p>
              <p className="text-[11.5px] text-slate-600 font-medium">មាតាបិតា ឬអាណាព្យាបាលសិស្ស</p>
              <div className="h-14 sm:h-16" />
              <p className="font-bold text-slate-900 underline">
                {stu.guardianName || '................................'}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                {stu.guardianPhone || 'ទូរស័ព្ទ៖ ........................'}
              </p>
            </div>

            {/* Column 2: Class Homeroom Teacher */}
            <div className="text-center space-y-1">
              <p className="font-bold text-slate-950 font-kantumruy">បានពិនិត្យ និងរៀបចំ</p>
              <p className="text-[11.5px] text-slate-600 font-medium">គ្រូបង្រៀនបន្ទុកថ្នាក់</p>
              <div className="h-14 sm:h-16" />
              <p className="font-bold text-slate-950">
                {teacherNameOverride || settings?.teacherName || 'គ្រូបន្ទុកថ្នាក់'}
              </p>
              <p className="text-[11px] text-slate-600 font-mono">
                ទូរស័ព្ទ ៖ {teacherPhoneOverride || settings?.phone || '093 486 987'}
              </p>
            </div>

            {/* Column 3: Official Date (Lunar on top, Solar below) & School Principal */}
            <div className="text-center space-y-0.5">
              <div className="text-center pb-1 space-y-0.5">
                <p className="text-[11px] text-slate-700 font-medium leading-tight">
                  {officialDate.lunarDateStr}
                </p>
                <p className="text-[11.5px] sm:text-xs text-slate-950 font-bold leading-tight">
                  {officialDate.solarDateStr}
                </p>
              </div>
              <p className="font-bold text-slate-950 font-kantumruy">បានឃើញ និងឯកភាព</p>
              <p className="font-bold text-slate-900 text-[11.5px] leading-tight">
                នាយក{schoolName}
              </p>
              <div className="h-12 sm:h-14" />
              <p className="font-bold text-slate-950 text-xs sm:text-[13px]">
                {principalNameOverride || settings?.principalName || 'នាយកសាលា'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Mode Switcher (Hidden on Print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center">
            <MailWarning className="w-6 h-6 text-amber-600 mr-2" />
            លិខិតផ្លូវការកម្រិតសាលារៀន (ស្តង់ដាររដ្ឋបាល)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ទម្រង់ផ្លូវការកម្រិតសាលារៀន មានចន្ទគតិលើ សុរិយគតិក្រោម និងហត្ថលេខា ៣ ផ្នែក (អាណាព្យាបាល, គ្រូបន្ទុកថ្នាក់, នាយកសាលា)
          </p>
        </div>

        {/* Controls: Class switcher & Print Mode switcher & Print action */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Class Badge */}
          <span className="inline-flex items-center px-2.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-200">
            📚 {currentClass?.name || 'ថ្នាក់ទាំងអស់'}
          </span>

          {/* Mode Switcher: Single vs Batch */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setPrintMode('single')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                printMode === 'single'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ព្រីនសិស្សម្នាក់ៗ
            </button>
            <button
              onClick={() => setPrintMode('batch')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                printMode === 'batch'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ព្រីនអូតូទាំងអស់ ({toKhmerNum(batchStudents.length)} នាក់)
            </button>
          </div>

          {/* Print Trigger with Portrait Orientation */}
          <PrintButton
            defaultOrientation="portrait"
            label={printMode === 'batch' ? `បោះពុម្ពទាំងអស់ (${toKhmerNum(batchStudents.length)} នាក់)` : 'បោះពុម្ពលិខិតផ្លូវការ'}
          />
        </div>
      </div>

      {/* Main Layout */}
      {printMode === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form & Student Selector (Hidden on Print) */}
          <div className="lg:col-span-1 space-y-4 no-print">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="flex items-center">
                  <User className="w-4 h-4 text-blue-600 mr-2" />
                  កំណត់ទិន្នន័យលិខិត
                </span>
                <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-medium">
                  កម្រិតសាលារៀន
                </span>
              </h3>

              {/* Student Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ជ្រើសរើសសិស្ស ({scopedStudents.length} នាក់)៖
                </label>
                <select
                  value={currentStudentId}
                  onChange={(e) => setCurrentStudentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {scopedStudents.map((stu) => {
                    const abs = studentAbsenceMap.get(stu.id);
                    const unexcused = abs?.unexcused || 0;
                    const cls = classes.find((c) => c.id === stu.classId);
                    return (
                      <option key={stu.id} value={stu.id}>
                        {stu.nameKh} ({cls?.name}) - ឥតច្បាប់ {toKhmerNum(unexcused)} ដង
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Letter Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ប្រភេទលិខិតផ្លូវការ
                </label>
                <select
                  value={letterType}
                  onChange={(e) => setLetterType(e.target.value as LetterType)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  <option value="absence_warning">១. លិខិតជូនដំណឹង និងព្រមានស្ដីពីអវត្តមាន</option>
                  <option value="parent_invite">២. លិខិតអញ្ជើញមាតាបិតា ឬអាណាព្យាបាល</option>
                  <option value="disciplinary_pledge">៣. លិខិតកិច្ចសន្យាអប់រំកែប្រែ និងគោរពវត្តមាន</option>
                </select>
              </div>

              {/* Warning Level */}
              {letterType === 'absence_warning' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    កម្រិតព្រមាន
                  </label>
                  <select
                    value={warningLevel}
                    onChange={(e) => setWarningLevel(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium cursor-pointer"
                  >
                    <option value="auto">ស្វ័យប្រវត្តិតាមចំនួនអវត្តមាន (Auto)</option>
                    <option value="level1">ព្រមានលើកទី១ (First Notice)</option>
                    <option value="level2">ព្រមានលើកទី២ (Second Notice)</option>
                    <option value="final">ព្រមានលើកចុងក្រោយ (Final Notice)</option>
                  </select>
                </div>
              )}

              {/* Letter Issuance Date (Updates Lunar & Solar in real-time) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  កាលបរិច្ឆេទចេញលិខិត (ចន្ទគតិ & សុរិយគតិ)
                </label>
                <input
                  type="date"
                  value={issuanceDate}
                  onChange={(e) => setIssuanceDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold"
                />
                <div className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10.5px] text-slate-600 space-y-0.5">
                  <p className="font-medium text-slate-800">ចន្ទគតិ ៖ {officialDate.lunarDateStr}</p>
                  <p className="font-bold text-slate-900">សុរិយគតិ ៖ {officialDate.solarDateStr}</p>
                </div>
              </div>

              {/* Letter Registration Number & Acronym */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    លេខលិខិតរដ្ឋបាល
                  </label>
                  <input
                    type="text"
                    value={letterNumber}
                    onChange={(e) => setLetterNumber(e.target.value)}
                    placeholder="ឧ. ០៤៥/២៦"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    អក្សរកាត់សាលា
                  </label>
                  <input
                    type="text"
                    value={schoolAcronym}
                    onChange={(e) => setSchoolAcronym(e.target.value)}
                    placeholder="វ.ហ.ស.ក.ត្រ"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Signatories Customization */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">
                  អ្នកចុះហត្ថលេខាផ្លូវការ ៖
                </span>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    ឈ្មោះនាយកសាលា (អ្នកឯកភាព) ៖
                  </label>
                  <input
                    type="text"
                    value={principalNameOverride}
                    onChange={(e) => setPrincipalNameOverride(e.target.value)}
                    placeholder="នាយកសាលា"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      ឈ្មោះគ្រូបន្ទុកថ្នាក់ ៖
                    </label>
                    <input
                      type="text"
                      value={teacherNameOverride}
                      onChange={(e) => setTeacherNameOverride(e.target.value)}
                      placeholder="គ្រូបន្ទុកថ្នាក់"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      លេខទូរស័ព្ទគ្រូ ៖
                    </label>
                    <input
                      type="text"
                      value={teacherPhoneOverride}
                      onChange={(e) => setTeacherPhoneOverride(e.target.value)}
                      placeholder="093 486 987"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Meeting Date & Time (Parent Invite only) */}
              {letterType === 'parent_invite' && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      កាលបរិច្ឆេទណាត់ជួប
                    </label>
                    <input
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ម៉ោងជួប
                    </label>
                    <input
                      type="text"
                      value={meetingTime}
                      onChange={(e) => setMeetingTime(e.target.value)}
                      placeholder="០៨:៣០ ព្រឹក"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Custom Additional Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ចំណារ ឬសំណូមពរបន្ថែម
                </label>
                <textarea
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="សូមអញ្ជើញមកឱ្យបានទាន់ពេលវេលា..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Single Letter Preview */}
          <div className="lg:col-span-2">
            {currentStudent ? (
              renderLetterContent(currentStudent, currentClass, absenceData)
            ) : (
              <div className="p-8 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                សូមជ្រើសរើសសិស្សដើម្បីបង្ហាញលិខិត
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Batch Auto-Print Mode: Shows list of all qualifying students ready to print */
        <div className="space-y-6">
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between no-print">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                មានសិស្សចំនួន <strong>{toKhmerNum(batchStudents.length)} នាក់</strong> ដែលមានអវត្តមានច្រើនដង (≥ {toKhmerNum(warningThreshold)} ដង) ក្នុង{activeClassId === 'ALL' ? 'គ្រប់ថ្នាក់' : currentClass?.name}។ ពេលចុច «បោះពុម្ព» ប្រព័ន្ធនឹងចេញលិខិតផ្លូវការកម្រិតសាលារៀនរៀងៗខ្លួនដាច់ដោយឡែកពីគ្នាលើក្រដាស A4 ស្វ័យប្រវត្តិ។
              </span>
            </div>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap ml-3"
            >
              <Printer className="w-3.5 h-3.5 mr-1 inline-block" />
              ព្រីនទាំងអស់ ({toKhmerNum(batchStudents.length)} នាក់)
            </button>
          </div>

          {/* Stack of A4 Letters */}
          <div className="space-y-8 print:space-y-0">
            {batchStudents.map((stu, idx) => {
              const cls = classes.find((c) => c.id === stu.classId);
              const abs = studentAbsenceMap.get(stu.id) || { unexcused: 0, excused: 0, total: 0, dates: [] };
              return renderLetterContent(stu, cls, abs, idx);
            })}
          </div>
        </div>
      )}
    </div>
  );
};
