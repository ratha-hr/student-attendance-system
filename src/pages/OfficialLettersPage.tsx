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
  Users,
  Layers,
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, TeacherSettings, LetterType } from '../types';
import { toKhmerNum, formatKhmerDate, getTodayDateString } from '../utils/dateUtils';
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
  React.useEffect(() => {
    if (selectedStudentId && scopedStudents.some((s) => s.id === selectedStudentId)) {
      setCurrentStudentId(selectedStudentId);
    } else if (!scopedStudents.some((s) => s.id === currentStudentId)) {
      setCurrentStudentId(studentsWithAbsences[0]?.id || scopedStudents[0]?.id || '');
    }
  }, [activeClassId, scopedStudents, studentsWithAbsences, selectedStudentId]);

  // Letter configuration state
  const [letterType, setLetterType] = useState<LetterType>('absence_warning');
  const [letterNumber, setLetterNumber] = useState('០៤៥/២៤');
  const [meetingDate, setMeetingDate] = useState(getTodayDateString());
  const [meetingTime, setMeetingTime] = useState('០៨:៣០ ព្រឹក');
  const [customNote, setCustomNote] = useState('');

  const currentStudent = scopedStudents.find((s) => s.id === currentStudentId) || scopedStudents[0];
  const currentClass = classes.find((c) => c.id === currentStudent?.classId);
  const absenceData = currentStudent
    ? studentAbsenceMap.get(currentStudent.id) || { unexcused: 0, excused: 0, total: 0, dates: [] }
    : { unexcused: 0, excused: 0, total: 0, dates: [] };

  const todayKhmer = formatKhmerDate(getTodayDateString(), false);

  const handlePrint = () => {
    window.print();
  };

  // Helper to render an individual letter card
  const renderLetterContent = (stu: Student, stuClass: ClassRoom | undefined, abs: { unexcused: number; excused: number; total: number; dates: string[] }, idx?: number) => {
    const datesFormatted = abs.dates.length > 0
      ? abs.dates.slice(-5).map((d) => formatKhmerDate(d, false)).join(', ')
      : 'កាលបរិច្ឆេទក្នុងខែបច្ចុប្បន្ន';

    return (
      <div
        key={stu.id}
        className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-md print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900 font-sans print-page"
        style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
      >
        {/* Header: Kingdom of Cambodia & Ministry */}
        <div className="flex justify-between items-start">
          {/* Left Side: Ministry & School */}
          <div className="text-center text-xs sm:text-sm font-semibold space-y-0.5 leading-snug">
            <p className="font-moul text-xs">ក្រសួងអប់រំ យុវជន និងកីឡា</p>
            <p className="text-xs">មន្ទីរអប់រំ យុវជន និងកីឡា {settings?.provinceCity || 'ខេត្តកំពង់ឆ្នាំង'}</p>
            <p className="font-bold text-xs">{settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}</p>
            <p className="text-[11px] text-slate-500 pt-1 font-mono">
              លេខ៖ {letterNumber} {idx !== undefined ? `-${toKhmerNum(idx + 1)}` : ''} / វ.ហ.ស.ក.ត្រ
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
            <div className="flex items-center justify-center space-x-1 pt-1">
              <span className="w-8 h-0.5 bg-slate-900 rounded-full" />
              <span className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
              <span className="w-8 h-0.5 bg-slate-900 rounded-full" />
            </div>
          </div>
        </div>

        {/* Letter Title */}
        <div className="text-center my-6">
          <h2 className="font-moul text-base sm:text-lg text-slate-900 leading-normal">
            {letterType === 'absence_warning' && 'លិខិតជូនដំណឹងអវត្តមានសិស្ស'}
            {letterType === 'parent_invite' && 'លិខិតអញ្ជើញអាណាព្យាបាលសិស្ស'}
            {letterType === 'disciplinary_pledge' && 'លិខិតកិច្ចសន្យាអប់រំកែប្រែ និងការគោរពវត្តមាន'}
          </h2>
          <p className="text-xs font-bold text-slate-600 mt-1">
            (ស្តីពីការអវត្តមានច្រើនដងដោយគ្មានការអនុញ្ញាត)
          </p>
        </div>

        {/* Recipient */}
        <div className="text-xs sm:text-sm space-y-2 mb-4">
          <p>
            <span className="font-bold">សូមគោរពជូនចំពោះ៖ </span>
            លោក/លោកស្រី <span className="font-bold underline">{stu.guardianName || 'អាណាព្យាបាល'}</span> (ត្រូវជា {stu.guardianRelationship || 'អាណាព្យាបាល'})
          </p>
          <p>
            <span className="font-bold">អាណាព្យាបាលសិស្សឈ្មោះ៖ </span>
            <span className="font-bold underline text-blue-900 text-sm">{stu.nameKh}</span>
            <span className="ml-2 font-medium">ភេទ៖ {stu.gender}</span>
            <span className="ml-2 font-medium">អត្តលេខ៖ {stu.studentCode}</span>
            <span className="ml-2 font-bold">ថ្នាក់ទី៖ {stuClass?.name || 'ថ្នាក់រៀន'}</span>
          </p>
        </div>

        {/* Body Paragraphs */}
        <div className="text-xs sm:text-sm leading-relaxed space-y-3 text-justify indent-6">
          <p>
            គណៈគ្រប់គ្រង{settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'} និងលោកគ្រូបន្ទុកថ្នាក់ សូមជម្រាបជូនលោក/លោកស្រីអាណាព្យាបាលមេត្តាជ្រាបថា កន្លងមកនេះ សិស្សឈ្មោះ{' '}
            <span className="font-bold">{stu.nameKh}</span> បានអវត្តមានពីការសិក្សាសរុបចំនួន{' '}
            <span className="font-black text-rose-600 underline text-sm">{toKhmerNum(abs.total)} ដង</span>{' '}
            ក្នុងនោះអវត្តមានឥតច្បាប់ចំនួន{' '}
            <span className="font-black text-rose-600 underline text-sm">{toKhmerNum(abs.unexcused)} ដង</span>{' '}
            និងមានច្បាប់ចំនួន {toKhmerNum(abs.excused)} ដង (កាលបរិច្ឆេទអវត្តមាន៖ {datesFormatted})។
          </p>

          <p>
            ការអវត្តមានញឹកញាប់នេះបានធ្វើឱ្យប៉ះពាល់យ៉ាងធ្ងន់ធ្ងរដល់លទ្ធផលនៃការសិក្សា និងការយល់ដឹងមេរៀនរបស់សិស្ស ព្រមទាំងផ្ទុយនឹងបទបញ្ជាផ្ទៃក្នុងរបស់សាលារៀន។
          </p>

          {letterType === 'parent_invite' ? (
            <p className="font-semibold text-slate-800">
              អាស្រ័យហេតុនេះ សូមលោក/លោកស្រីអាណាព្យាបាលមេត្តាអញ្ជើញមកជួបគណៈគ្រប់គ្រងសាលា និងលោកគ្រូបន្ទុកថ្នាក់ នៅថ្ងៃទី{' '}
              <span className="font-bold underline">{formatKhmerDate(meetingDate, false)}</span> វេលាម៉ោង{' '}
              <span className="font-bold underline">{meetingTime}</span> នៅបន្ទប់ការិយាល័យសិក្សា ដើម្បីពិភាក្សា និងស្វែងរកដំណោះស្រាយរួមគ្នា។
            </p>
          ) : (
            <p>
              អាស្រ័យហេតុនេះ សូមលោក/លោកស្រីអាណាព្យាបាលមេត្តាជួយដាស់តឿន អប់រំ និងតាមដានវត្តមានរបស់កូនឱ្យបានហ្មត់ចត់ ដើម្បីធានាថាការសិក្សាប្រព្រឹត្តទៅបានទៀងទាត់ និងជោគជ័យ។
            </p>
          )}

          {customNote && (
            <p className="italic text-slate-700 font-medium">
              * ចំណារបន្ថែម៖ {customNote}
            </p>
          )}
        </div>

        {/* Closing & Signatures */}
        <div className="mt-8 text-xs sm:text-sm">
          <div className="flex justify-between items-start">
            {/* Left: Parent Pledge */}
            <div className="text-center w-52 space-y-1">
              <p className="font-bold">បានឃើញ និងទទួលដំណឹង</p>
              <p className="text-xs text-slate-500">ហត្ថលេខាអាណាព្យាបាលសិស្ស</p>
              <div className="h-16" />
              <p className="font-medium underline">{stu.guardianName || '................................'}</p>
            </div>

            {/* Right: Teacher & Principal */}
            <div className="text-center w-64 space-y-1">
              <p className="italic text-slate-600 text-[11px]">
                {settings?.provinceCity || 'កំពង់ឆ្នាំង'}, {todayKhmer}
              </p>
              <p className="font-bold text-sm">គ្រូបង្រៀនទទួលបន្ទុក</p>
              <div className="h-16" />
              <p className="font-bold text-sm">{settings?.teacherName || 'ហ៊ុន រដ្ឋា'}</p>
              <p className="text-[11px] text-slate-500">
                ទូរស័ព្ទ៖ {settings?.phone || '093 486 987'}
              </p>
            </div>
          </div>

          <div className="text-center mt-6">
            <p className="font-bold text-sm">បានឃើញ និងអនុញ្ញាត</p>
            <p className="font-bold text-sm">នាយកវិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច</p>
            <div className="h-14" />
            <p className="font-bold text-sm">{settings?.principalName || 'នាយកសាលា'}</p>
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
            លិខិតផ្លូវការសម្រាប់ផ្ញើទៅអាណាព្យាបាល
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ទម្រង់ព្រីនអូតូសម្រាប់សិស្សអវត្តមានច្រើននាក់ (Batch Auto-Print) និងព្រីនសិស្សម្នាក់ៗ (Single Print)
          </p>
        </div>

        {/* Controls: Class switcher & Print Mode switcher & Print action */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Class Badge (Controlled by top Navbar) */}
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

          {/* Print Trigger with Orientation Selector */}
          <PrintButton
            defaultOrientation="portrait"
            label={printMode === 'batch' ? `បោះពុម្ពទាំងអស់ (${toKhmerNum(batchStudents.length)} នាក់)` : 'បោះពុម្ពលិខិត'}
          />
        </div>
      </div>

      {/* Main Layout */}
      {printMode === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form & Student Selector (Hidden on Print) */}
          <div className="lg:col-span-1 space-y-4 no-print">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center">
                <User className="w-4 h-4 text-blue-600 mr-2" />
                ជ្រើសរើសសិស្សដើម្បីចេញលិខិត
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  សិស្សក្នុងថ្នាក់ ({scopedStudents.length} នាក់)៖
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
                  <option value="absence_warning">១. លិខិតជូនដំណឹងអវត្តមាន (ព្រមានលើកទី១/២)</option>
                  <option value="parent_invite">២. លិខិតអញ្ជើញអាណាព្យាបាលមកជួបផ្ទាល់</option>
                  <option value="disciplinary_pledge">៣. លិខិតកិច្ចសន្យាអប់រំកែប្រែវត្តមាន</option>
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
              {letterType === 'parent_invite' && (
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
                មានសិស្សចំនួន <strong>{toKhmerNum(batchStudents.length)} នាក់</strong> ដែលមានអវត្តមានច្រើនដង (≥ {toKhmerNum(warningThreshold)} ដង) ក្នុង{activeClassId === 'ALL' ? 'គ្រប់ថ្នាក់' : currentClass?.name}។ ពេលចុច «បោះពុម្ព» ប្រព័ន្ធនឹងចេញលិខិតរៀងៗខ្លួនដាច់ដោយឡែកពីគ្នាលើក្រដាស A4 ស្វ័យប្រវត្តិ។
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
