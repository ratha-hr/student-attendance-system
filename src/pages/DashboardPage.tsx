import React from 'react';
import {
  Users,
  UserCheck,
  AlertTriangle,
  GraduationCap,
  Calendar,
  FileText,
  MailWarning,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import type { ClassRoom, Student, AttendanceRecord, TeacherSettings } from '../types';
import { toKhmerNum } from '../utils/dateUtils';
import type { NavTab } from '../components/Sidebar';

interface DashboardProps {
  classes: ClassRoom[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  settings: TeacherSettings | null;
  selectedClassId: string;
  onNavigate: (tab: NavTab) => void;
  onSelectStudentForLetter: (studentId: string) => void;
}

export const DashboardPage: React.FC<DashboardProps> = ({
  classes,
  students,
  attendanceRecords,
  settings,
  selectedClassId,
  onNavigate,
  onSelectStudentForLetter,
}) => {
  const warningThreshold = settings?.absenceWarningThreshold || 3;

  // Filter students based on selected class
  const filteredStudents = selectedClassId === 'ALL'
    ? students
    : students.filter((s) => s.classId === selectedClassId);

  const studentIds = new Set(filteredStudents.map((s) => s.id));

  // Today's attendance
  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = attendanceRecords.filter(
    (a) => a.date === today && studentIds.has(a.studentId)
  );

  const presentToday = todayRecords.filter((r) => r.status === 'present').length;
  const permissionToday = todayRecords.filter((r) => r.status === 'permission').length;
  const absentToday = todayRecords.filter((r) => r.status === 'absent').length;

  const totalStudents = filteredStudents.length;
  const femaleStudents = filteredStudents.filter((s) => s.gender === 'ស្រី').length;
  const maleStudents = filteredStudents.filter((s) => s.gender === 'ប្រុស').length;

  // Calculate total absences per student
  const studentAbsenceMap = new Map<string, { unexcused: number; excused: number; total: number; dates: string[] }>();
  
  attendanceRecords.forEach((rec) => {
    if (!studentIds.has(rec.studentId)) return;
    
    const curr = studentAbsenceMap.get(rec.studentId) || { unexcused: 0, excused: 0, total: 0, dates: [] };
    if (rec.status === 'absent') {
      curr.unexcused += 1;
      curr.total += 1;
      curr.dates.push(rec.date);
    } else if (rec.status === 'permission') {
      curr.excused += 1;
      curr.total += 1;
      curr.dates.push(rec.date);
    }
    studentAbsenceMap.set(rec.studentId, curr);
  });

  // Students exceeding or meeting the warning threshold
  const atRiskStudents = filteredStudents
    .map((stu) => {
      const abs = studentAbsenceMap.get(stu.id) || { unexcused: 0, excused: 0, total: 0, dates: [] };
      const studentClass = classes.find((c) => c.id === stu.classId);
      return {
        ...stu,
        className: studentClass?.name || '',
        unexcusedCount: abs.unexcused,
        excusedCount: abs.excused,
        totalAbsences: abs.total,
        dates: abs.dates,
      };
    })
    .filter((stu) => stu.unexcusedCount >= warningThreshold)
    .sort((a, b) => b.unexcusedCount - a.unexcusedCount);

  return (
    <div className="space-y-6">
      {/* Welcome Banner - Clean & Simple */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-md">
        <div className="max-w-2xl">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/20 mb-3">
            📚 {settings?.schoolName || 'សាលារៀន'} • ឆ្នាំសិក្សា {settings?.academicYear || '២០២៤-២០២៥'}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold">
            សួស្តី {settings?.teacherName || 'លោកគ្រូ/អ្នកគ្រូ'}!
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-blue-100">
            អ្នកកំពុងគ្រប់គ្រង <span className="font-bold text-amber-300">{toKhmerNum(classes.length)} ថ្នាក់រៀន</span> និងសិស្សសរុប <span className="font-bold text-amber-300">{toKhmerNum(students.length)} នាក់</span>។
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate('attendance')}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-white text-blue-700 text-xs font-bold shadow-sm hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              កត់ត្រាវត្តមាន
            </button>
            <button
              onClick={() => onNavigate('letters')}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <MailWarning className="w-3.5 h-3.5 mr-1.5" />
              លិខិតព្រមានអាណាព្យាបាល
            </button>
            <button
              onClick={() => onNavigate('students')}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              បញ្ជីឈ្មោះសិស្ស
            </button>
          </div>
        </div>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">សិស្សសរុប</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-800">
            {toKhmerNum(totalStudents)} <span className="text-xs font-normal text-slate-400">នាក់</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            ស្រី: {toKhmerNum(femaleStudents)} • ប្រុស: {toKhmerNum(maleStudents)}
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">វត្តមានថ្ងៃនេះ</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {toKhmerNum(presentToday)} <span className="text-xs font-normal text-slate-400">បានមក</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            ច្បាប់: {toKhmerNum(permissionToday)} • ឥតច្បាប់: {toKhmerNum(absentToday)}
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">អវត្តមានច្រើន</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">
            {toKhmerNum(atRiskStudents.length)} <span className="text-xs font-normal text-slate-400">នាក់</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-500 font-medium">
            {atRiskStudents.length > 0 ? 'ត្រូវចេញលិខិតព្រមាន' : 'គ្មានសិស្សប្រឈមទេ'}
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ថ្នាក់រៀន (n ថ្នាក់)</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-600">
            {toKhmerNum(classes.length)} <span className="text-xs font-normal text-slate-400">ថ្នាក់</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">
            {settings?.specialtySubject || 'ចំណេះទូទៅ'}
          </div>
        </div>
      </div>

      {/* Alert Banner: Students with High Absences */}
      {atRiskStudents.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center space-x-2 text-rose-900 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <span>សិស្សអវត្តមានឥតច្បាប់ចាប់ពី {toKhmerNum(warningThreshold)} ដងឡើងទៅ (ត្រូវចេញលិខិត)</span>
            </div>
            <button
              onClick={() => onNavigate('letters')}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
            >
              ចេញលិខិតព្រមាន
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {atRiskStudents.map((stu) => (
              <div
                key={stu.id}
                className="bg-white p-3 rounded-xl border border-rose-200 shadow-2xs flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-800">{stu.nameKh} ({stu.className})</p>
                  <p className="text-[11px] text-slate-500">
                    ទូរស័ព្ទ៖ <a href={`tel:${stu.guardianPhone}`} className="text-blue-600 font-semibold">{stu.guardianPhone}</a>
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-extrabold rounded-md text-[11px]">
                    {toKhmerNum(stu.unexcusedCount)} ដង
                  </span>
                  <button
                    onClick={() => {
                      onSelectStudentForLetter(stu.id);
                      onNavigate('letters');
                    }}
                    className="block text-[11px] text-rose-600 font-bold hover:underline mt-1 cursor-pointer"
                  >
                    ចេញលិខិត
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clean Bottom 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: 4 Direct Shortcuts */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center">
            <Calendar className="w-4 h-4 text-blue-600 mr-2" />
            មុខងារចម្បង (Main Modules)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => onNavigate('attendance')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
            >
              <div className="font-bold text-sm text-slate-800 group-hover:text-blue-700 flex items-center">
                <Calendar className="w-4 h-4 text-blue-600 mr-2" /> ស្រង់វត្តមានសិស្ស
              </div>
              <p className="text-xs text-slate-500 mt-1">កត់ត្រាវត្តមានប្រចាំថ្ងៃ និងតារាងប្រចាំខែ</p>
            </div>

            <div
              onClick={() => onNavigate('letters')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer group"
            >
              <div className="font-bold text-sm text-slate-800 group-hover:text-amber-700 flex items-center">
                <MailWarning className="w-4 h-4 text-amber-600 mr-2" /> លិខិតផ្លូវការ (ព្រមាន)
              </div>
              <p className="text-xs text-slate-500 mt-1">បោះពុម្ពលិខិតផ្លូវការផ្ញើទៅអាណាព្យាបាល A4</p>
            </div>

            <div
              onClick={() => onNavigate('students')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group"
            >
              <div className="font-bold text-sm text-slate-800 group-hover:text-indigo-700 flex items-center">
                <Users className="w-4 h-4 text-indigo-600 mr-2" /> ពត៌មានសិស្ស (Excel)
              </div>
              <p className="text-xs text-slate-500 mt-1">គ្រប់គ្រងប្រវត្តិរូបសិស្ស នាំចូល/ទាញចេញ Excel</p>
            </div>

            <div
              onClick={() => onNavigate('annual-plan')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group"
            >
              <div className="font-bold text-sm text-slate-800 group-hover:text-emerald-700 flex items-center">
                <FileText className="w-4 h-4 text-emerald-600 mr-2" /> ផែនការគ្រូ ១ ឆ្នាំ
              </div>
              <p className="text-xs text-slate-500 mt-1">បំណែងចែកកម្មវិធីបង្រៀនប្រចាំខែ និងសប្តាហ៍</p>
            </div>
          </div>
        </div>

        {/* Right: Classes List */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-800">ថ្នាក់រៀន ({toKhmerNum(classes.length)})</h3>
            <button
              onClick={() => onNavigate('classes')}
              className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
            >
              គ្រប់គ្រងថ្នាក់
            </button>
          </div>

          <div className="space-y-2">
            {classes.map((cls) => {
              const count = students.filter((s) => s.classId === cls.id).length;
              return (
                <div
                  key={cls.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <span className="font-bold text-slate-800">{cls.name}</span>
                  <span className="font-semibold text-slate-500">{toKhmerNum(count)} សិស្ស</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
