import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, TeacherSettings, LetterType } from '../types';
import { toKhmerNum, formatKhmerDate, getTodayDateString } from '../utils/dateUtils';

interface OfficialLettersPageProps {
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords: AttendanceRecord[];
  settings: TeacherSettings | null;
  selectedStudentId?: string;
}

export const OfficialLettersPage: React.FC<OfficialLettersPageProps> = ({
  students,
  classes,
  attendanceRecords,
  settings,
  selectedStudentId,
}) => {
  const warningThreshold = settings?.absenceWarningThreshold || 3;

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

  // List of students with absences
  const studentsWithAbsences = useMemo(() => {
    return students
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
  }, [students, classes, studentAbsenceMap]);

  // Selected student state
  const [currentStudentId, setCurrentStudentId] = useState<string>(
    selectedStudentId || studentsWithAbsences[0]?.id || students[0]?.id || ''
  );

  // Letter configuration state
  const [letterType, setLetterType] = useState<LetterType>('absence_warning');
  const [letterNumber, setLetterNumber] = useState('០៤៥/២៤');
  const [meetingDate, setMeetingDate] = useState(getTodayDateString());
  const [meetingTime, setMeetingTime] = useState('០៨:៣០ ព្រឹក');
  const [customNote, setCustomNote] = useState('');

  const currentStudent = students.find((s) => s.id === currentStudentId);
  const currentClass = classes.find((c) => c.id === currentStudent?.classId);
  const absenceData = currentStudent ? studentAbsenceMap.get(currentStudent.id) || { unexcused: 0, excused: 0, total: 0, dates: [] } : { unexcused: 0, excused: 0, total: 0, dates: [] };

  const todayKhmer = formatKhmerDate(getTodayDateString(), false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Controller Banner (Hidden on Print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center">
            <MailWarning className="w-6 h-6 text-amber-600 mr-2" />
            លិខិតផ្លូវការសម្រាប់ផ្ញើទៅអាណាព្យាបាល
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ទម្រង់ស្តង់ដារលិខិតរដ្ឋបាលអប់រំ ជូនដំណឹង និងអញ្ជើញអាណាព្យាបាលសិស្សអវត្តមានច្រើនដង
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4 mr-2" />
          បោះពុម្ពលិខិត (A4 Format)
        </button>
      </div>

      {/* Main Layout: Sidebar configuration + Letter Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form & Student Selector (Hidden on Print) */}
        <div className="lg:col-span-1 space-y-4 no-print">
          {/* Student Selector Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center">
              <User className="w-4 h-4 text-blue-600 mr-2" />
              ជ្រើសរើសសិស្សដើម្បីចេញលិខិត
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                សិស្សក្នុងបញ្ជី៖
              </label>
              <select
                value={currentStudentId}
                onChange={(e) => setCurrentStudentId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {students.map((stu) => {
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

            {/* Students at Risk Quick Pills */}
            <div>
              <span className="text-[11px] font-bold text-rose-700 block mb-2">
                សិស្សប្រឈមការព្រមាន (អវត្តមាន ≥ {toKhmerNum(warningThreshold)}ដង)៖
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {studentsWithAbsences
                  .filter((s) => s.unexcused >= warningThreshold)
                  .map((stu) => (
                    <button
                      key={stu.id}
                      type="button"
                      onClick={() => setCurrentStudentId(stu.id)}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        currentStudentId === stu.id
                          ? 'bg-rose-100 text-rose-900 font-bold border border-rose-300'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{stu.nameKh} ({stu.className})</span>
                      <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded font-extrabold shrink-0 ml-1">
                        ឥតច្បាប់ {toKhmerNum(stu.unexcused)}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Letter Settings Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center">
              <FileCheck2 className="w-4 h-4 text-blue-600 mr-2" />
              ការកំណត់លិខិត
            </h3>

            {/* Letter Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ប្រភេទលិខិត
              </label>
              <select
                value={letterType}
                onChange={(e) => setLetterType(e.target.value as LetterType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="absence_warning">លិខិតជូនដំណឹងអវត្តមាន (Warning Letter)</option>
                <option value="parent_invite">លិខិតអញ្ជើញអាណាព្យាបាល (Parent Invitation)</option>
                <option value="disciplinary_pledge">លិខិតកិច្ចសន្យាអប់រំកែប្រែ (Commitment Pledge)</option>
              </select>
            </div>

            {/* Letter Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                លេខលិខិតរដ្ឋបាល
              </label>
              <input
                type="text"
                value={letterNumber}
                onChange={(e) => setLetterNumber(e.target.value)}
                placeholder="ឧ. ០៤៥/២៤"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Meeting Date & Time */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  កាលបរិច្ឆេទណាត់
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

            {/* Custom Additional Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ចំណារ ឬសំណូមពរបន្ថែម
              </label>
              <textarea
                rows={3}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="សូមអញ្ជើញមកឱ្យបានទាន់ពេលវេលា..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Authentic Printable Letter Preview (Takes full width when printing!) */}
        <div className="lg:col-span-2">
          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-lg print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900 font-sans print-card">
            {/* Header: Kingdom of Cambodia & Ministry */}
            <div className="flex justify-between items-start">
              {/* Left Side: Ministry & School */}
              <div className="text-center text-xs sm:text-sm font-semibold space-y-0.5 leading-snug">
                <p className="font-moul text-xs">ក្រសួងអប់រំ យុវជន និងកីឡា</p>
                <p className="text-xs">មន្ទីរអប់រំ យុវជន និងកីឡា {settings?.provinceCity || 'រាជធានីភ្នំពេញ'}</p>
                <p className="font-bold text-xs">{settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន'}</p>
                <p className="text-[11px] text-slate-500 pt-1 font-mono">
                  លេខ៖ {letterNumber} / ល.ព.អ
                </p>
              </div>

              {/* Right Side: Kingdom of Cambodia Banner */}
              <div className="text-center space-y-1">
                <h3 className="font-moul text-sm sm:text-base text-slate-900 tracking-wide">
                  ព្រះរាជាណាចក្រកម្ពុជា
                </h3>
                <h4 className="font-moul text-xs sm:text-sm text-slate-900">
                  ជាតិ សាសនា ព្រះមហាក្សត្រ
                </h4>
                {/* Traditional Khmer flourish / underline */}
                <div className="flex items-center justify-center space-x-1 pt-1">
                  <span className="w-8 h-0.5 bg-slate-900 rounded-full" />
                  <span className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
                  <span className="w-8 h-0.5 bg-slate-900 rounded-full" />
                </div>
              </div>
            </div>

            {/* Letter Title */}
            <div className="text-center my-8">
              <h2 className="font-moul text-base sm:text-lg text-slate-900 leading-normal">
                {letterType === 'absence_warning' && 'លិខិតជូនដំណឹងអវត្តមានសិស្ស'}
                {letterType === 'parent_invite' && 'លិខិតអញ្ជើញអាណាព្យាបាលសិស្ស'}
                {letterType === 'disciplinary_pledge' && 'លិខិតកិច្ចសន្យាអប់រំកែប្រែ និងការគោរពវត្តមាន'}
              </h2>
              <p className="text-xs font-bold text-slate-600 mt-1">
                (ស្តីពីការអវត្តមានច្រើនដងដោយគ្មានការអនុញ្ញាត)
              </p>
            </div>

            {/* Letter Salutation */}
            <div className="space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
              <p className="font-bold">
                សូមគោរពជម្រាបជូន៖ លោក/លោកស្រី អាណាព្យាបាលសិស្សឈ្មោះ{' '}
                <span className="font-moul text-slate-950 font-normal px-1">
                  {currentStudent?.nameKh || '............................'}
                </span>
              </p>

              <div className="pl-4 space-y-1 text-xs sm:text-sm">
                <p>
                  - សិស្សឈ្មោះ៖ <span className="font-bold">{currentStudent?.nameKh}</span> (អក្សរឡាតាំង៖ {currentStudent?.nameEn || '-'}) ភេទ៖ <span className="font-bold">{currentStudent?.gender}</span>
                </p>
                <p>
                  - អត្តលេខ៖ <span className="font-mono font-bold">{currentStudent?.studentCode}</span> រៀននៅ៖ <span className="font-bold">{currentClass?.name}</span> ({currentClass?.room || 'បន្ទប់ទូទៅ'})
                </p>
                <p>
                  - ឆ្នាំសិក្សា៖ <span className="font-bold">{settings?.academicYear || '២០២៤-២០២៥'}</span>
                </p>
              </div>

              {/* Letter Main Content Body */}
              <div className="space-y-3 text-justify indent-6 pt-2">
                <p>
                  តាងនាមលោកគ្រូ/អ្នកគ្រូបន្ទុកថ្នាក់ និងគណៈគ្រប់គ្រងសាលា សូមជម្រាបជូនលោក/លោកស្រីជ្រាបថា កន្លងមកនេះ សិស្សឈ្មោះខាងលើ បានអវត្តមានពីការសិក្សាសរុបចំនួន{' '}
                  <span className="font-bold text-rose-700 underline px-1">
                    {toKhmerNum(absenceData.total)} លើក/ថ្ងៃ
                  </span>{' '}
                  (ក្នុងនោះ អវត្តមានឥតច្បាប់ចំនួន{' '}
                  <span className="font-bold text-rose-700 underline px-1">
                    {toKhmerNum(absenceData.unexcused)} លើក
                  </span>{' '}
                  និងមានច្បាប់ចំនួន {toKhmerNum(absenceData.excused)} លើក)។
                </p>

                {absenceData.dates.length > 0 && (
                  <p className="indent-0 pl-6 text-xs text-slate-600">
                    <span className="font-bold text-slate-800">កាលបរិច្ឆេទថ្ងៃអវត្តមានជាក់ស្តែង៖ </span>
                    {absenceData.dates.map((d) => formatKhmerDate(d)).join(', ')}
                  </p>
                )}

                <p>
                  ការអវត្តមានច្រើនដងដោយគ្មានការអនុញ្ញាតនេះ បានធ្វើឱ្យប៉ះពាល់យ៉ាងធ្ងន់ធ្ងរដល់ការទទួលយកចំណេះដឹង លទ្ធផលសិក្សា និងវិន័យទូទៅរបស់សាលារៀន។ អាស្រ័យហេតុនេះ ដើម្បីធានាបាននូវការសិក្សាជាប់លាប់ និងជោគជ័យរបស់សិស្ស សាលារៀនសូមគោរពអញ្ជើញលោក/លោកស្រីជាអាណាព្យាបាល មេត្តាឆ្លៀតពេលដ៏មានតម្លៃមកជួបផ្ទាល់ជាមួយលោកគ្រូ/អ្នកគ្រូបន្ទុកថ្នាក់៖
                </p>

                <div className="indent-0 my-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs sm:text-sm font-semibold">
                  <p className="flex items-center">
                    <Calendar className="w-4 h-4 text-blue-600 mr-2 shrink-0" />
                    កាលបរិច្ឆេទ៖ <span className="text-slate-900 ml-1.5">{formatKhmerDate(meetingDate, true)}</span>
                  </p>
                  <p className="flex items-center">
                    <Clock className="w-4 h-4 text-blue-600 mr-2 shrink-0" />
                    វេលាម៉ោង៖ <span className="text-slate-900 ml-1.5">{meetingTime}</span>
                  </p>
                  <p className="flex items-center">
                    <School className="w-4 h-4 text-blue-600 mr-2 shrink-0" />
                    ទីកន្លែង៖ <span className="text-slate-900 ml-1.5">{settings?.schoolName} ({currentClass?.name})</span>
                  </p>
                </div>

                {customNote && (
                  <p className="indent-0 text-xs italic text-slate-700 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200">
                    <span className="font-bold">កំណត់សម្គាល់បន្ថែម៖ </span>
                    {customNote}
                  </p>
                )}

                <p>
                  សេចក្តីដូចបានគោរពជម្រាបជូនខាងលើ សូម លោក/លោកស្រី អាណាព្យាបាលសិស្ស មេត្តាអញ្ជើញមកសាលារៀនតាមការកំណត់ដោយក្តីអនុគ្រោះ។
                </p>
                <p>
                  សូម លោក/លោកស្រី ទទួលនូវការរាប់អានដ៏ស្មោះស្ម័គ្រពីយើងខ្ញុំ!
                </p>
              </div>
            </div>

            {/* Letter Signatures */}
            <div className="mt-10 pt-4 flex justify-between items-start text-xs sm:text-sm">
              {/* Principal Approval block */}
              <div className="text-center space-y-1">
                <p className="font-bold">បានឃើញ និងឯកភាព</p>
                <p className="font-bold">នាយកសាលា</p>
                <div className="h-20" /> {/* Space for signature & stamp */}
                <p className="font-moul text-xs">{settings?.principalName || '................................'}</p>
              </div>

              {/* Class Teacher block */}
              <div className="text-center space-y-1">
                <p className="italic text-xs">
                  {settings?.provinceCity || 'រាជធានីភ្នំពេញ'}, {todayKhmer}
                </p>
                <p className="font-bold">គ្រូបន្ទុកថ្នាក់</p>
                <div className="h-20" /> {/* Space for signature */}
                <p className="font-moul text-xs">{settings?.teacherName || '................................'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
