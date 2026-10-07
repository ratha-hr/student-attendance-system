import React from 'react';
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  GraduationCap,
  Calendar,
  FileText,
  MailWarning,
  PlusCircle,
  ArrowRight,
  Clock,
  Printer,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import type { ClassRoom, Student, AttendanceRecord, TeacherSettings } from '../types';
import { toKhmerNum, formatKhmerDate, getTodayDateString } from '../utils/dateUtils';
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
  const today = getTodayDateString();
  const warningThreshold = settings?.absenceWarningThreshold || 3;

  // Filter students based on selected class
  const filteredStudents = selectedClassId === 'ALL'
    ? students
    : students.filter((s) => s.classId === selectedClassId);

  const studentIds = new Set(filteredStudents.map((s) => s.id));

  // Today's attendance
  const todayRecords = attendanceRecords.filter(
    (a) => a.date === today && studentIds.has(a.studentId)
  );

  const presentToday = todayRecords.filter((r) => r.status === 'present').length;
  const permissionToday = todayRecords.filter((r) => r.status === 'permission').length;
  const absentToday = todayRecords.filter((r) => r.status === 'absent').length;
  const lateToday = todayRecords.filter((r) => r.status === 'late').length;

  const totalStudents = filteredStudents.length;
  const femaleStudents = filteredStudents.filter((s) => s.gender === 'ស្រី').length;
  const maleStudents = filteredStudents.filter((s) => s.gender === 'ប្រុស').length;

  // Calculate total absences per student (both permission & absent)
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
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-linear-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30 mb-3">
            📚 {settings?.schoolName || 'សាលារៀន'} • ឆ្នាំសិក្សា {settings?.academicYear || '២០២៤-២០២៥'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            សួស្តី {settings?.teacherName || 'លោកគ្រូ/អ្នកគ្រូ'}!
          </h2>
          <p className="mt-2 text-sm text-blue-100 leading-relaxed">
            សូមស្វាគមន៍មកកាន់ប្រព័ន្ធគ្រប់គ្រងសិស្ស និងវត្តមាន។ អ្នកកំពុងគ្រប់គ្រង{' '}
            <span className="font-bold text-amber-300">{toKhmerNum(classes.length)} ថ្នាក់រៀន</span> និងសិស្សសរុប{' '}
            <span className="font-bold text-amber-300">{toKhmerNum(students.length)} នាក់</span>។
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('attendance')}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-white text-blue-700 text-xs sm:text-sm font-bold shadow-md hover:bg-blue-50 transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4 mr-2" />
              កត់ត្រាវត្តមានថ្ងៃនេះ
            </button>
            <button
              onClick={() => onNavigate('letters')}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
            >
              <MailWarning className="w-4 h-4 mr-2" />
              ចេញលិខិតព្រមានអាណាព្យាបាល
            </button>
            <button
              onClick={() => onNavigate('annual-plan')}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold backdrop-blur-xs transition-all cursor-pointer"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              មើលផែនការ ១ ឆ្នាំ
            </button>
          </div>
        </div>

        {/* Decorative circle */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Students */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">សិស្សសរុប</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              {toKhmerNum(totalStudents)} <span className="text-xs font-normal text-slate-500">នាក់</span>
            </div>
            <div className="mt-2 flex items-center text-xs text-slate-500 space-x-2">
              <span className="text-pink-600 font-medium">ស្រី: {toKhmerNum(femaleStudents)}</span>
              <span>•</span>
              <span className="text-blue-600 font-medium">ប្រុស: {toKhmerNum(maleStudents)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Today Attendance Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">វត្តមានថ្ងៃនេះ</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {toKhmerNum(presentToday)} <span className="text-xs font-normal text-slate-500">បានមក</span>
            </div>
            <div className="mt-2 flex items-center text-xs space-x-2">
              <span className="text-amber-600">ច្បាប់: {toKhmerNum(permissionToday)}</span>
              <span>•</span>
              <span className="text-rose-600">ឥតច្បាប់: {toKhmerNum(absentToday)}</span>
            </div>
          </div>
        </div>

        {/* Card 3: High Absences Alert */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">អវត្តមានច្រើន (≥ {toKhmerNum(warningThreshold)}ដង)</span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600">
              {toKhmerNum(atRiskStudents.length)}{' '}
              <span className="text-xs font-normal text-slate-500">នាក់ប្រឈម</span>
            </div>
            <p className="mt-2 text-xs text-rose-500 font-medium">
              {atRiskStudents.length > 0 ? 'ត្រូវការចេញលិខិតជូនដំណឹង' : 'គ្មានសិស្សប្រឈមទេ'}
            </p>
          </div>
        </div>

        {/* Card 4: Total Classes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ថ្នាក់រៀនសរុប (n ថ្នាក់)</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
              {toKhmerNum(classes.length)} <span className="text-xs font-normal text-slate-500">ថ្នាក់</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              បង្រៀនមុខវិជ្ជា {settings?.specialtySubject || 'ចំណេះទូទៅ'}
            </p>
          </div>
        </div>
      </div>

      {/* Critical Alert Banner: Students with High Absences */}
      {atRiskStudents.length > 0 && (
        <div className="bg-linear-to-r from-rose-50 via-red-50 to-amber-50 border-2 border-rose-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-rose-600 text-white rounded-xl shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-900">
                  ⚠️ ការដាស់តឿន៖ សិស្សអវត្តមានឥតច្បាប់ចាប់ពី {toKhmerNum(warningThreshold)} ដងឡើងទៅ!
                </h3>
                <p className="text-xs text-rose-700 mt-1">
                  មានសិស្សចំនួន <span className="font-bold underline">{toKhmerNum(atRiskStudents.length)} នាក់</span> បានអវត្តមានឥតច្បាប់ច្រើនដង។ សូមចេញលិខិតផ្លូវការផ្ញើជូនអាណាព្យាបាលជាបន្ទាន់ ដើម្បីសហការដោះស្រាយ។
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('letters')}
              className="shrink-0 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              ចេញលិខិតទាំងអស់
            </button>
          </div>

          {/* List of At-risk students */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {atRiskStudents.map((stu) => (
              <div
                key={stu.id}
                className="bg-white rounded-xl p-3.5 border border-rose-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">{stu.nameKh}</span>
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[11px] font-extrabold rounded-full">
                      ឥតច្បាប់ {toKhmerNum(stu.unexcusedCount)} ដង
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 space-y-0.5">
                    <p>ថ្នាក់៖ <span className="font-semibold text-slate-700">{stu.className}</span></p>
                    <p>អាណាព្យាបាល៖ <span className="font-semibold text-slate-700">{stu.guardianName}</span> ({stu.guardianRelationship})</p>
                    <p>ទូរស័ព្ទ៖ <a href={`tel:${stu.guardianPhone}`} className="text-blue-600 font-semibold hover:underline">{stu.guardianPhone}</a></p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    សរុប {toKhmerNum(stu.totalAbsences)} ដង (មានច្បាប់ {toKhmerNum(stu.excusedCount)})
                  </span>
                  <button
                    onClick={() => {
                      onSelectStudentForLetter(stu.id);
                      onNavigate('letters');
                    }}
                    className="inline-flex items-center px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <MailWarning className="w-3.5 h-3.5 mr-1" />
                    ចេញលិខិត
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Columns: Quick Shortcuts + System Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Actions & Modules */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-base flex items-center">
              <Calendar className="w-5 h-5 text-blue-600 mr-2" />
              មុខងារសំខាន់ៗរហ័ស (Quick Actions)
            </h3>
            <span className="text-xs text-slate-400">ជ្រើសរើសដើម្បីចាប់ផ្តើម</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => onNavigate('attendance')}
              className="p-4 rounded-xl border border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/40 transition-all cursor-pointer group flex items-start space-x-3"
            >
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 group-hover:text-blue-700">ស្រង់វត្តមានប្រចាំថ្ងៃ</h4>
                <p className="text-xs text-slate-500 mt-0.5">កត់ត្រា មក, ច្បាប់, ឥតច្បាប់, យឺត ដោយចុចតែម្តង</p>
              </div>
            </div>

            <div
              onClick={() => onNavigate('letters')}
              className="p-4 rounded-xl border border-slate-200/90 hover:border-amber-400 hover:bg-amber-50/40 transition-all cursor-pointer group flex items-start space-x-3"
            >
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl group-hover:scale-105 transition-transform">
                <MailWarning className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 group-hover:text-amber-700">លិខិតជូនដំណឹងអវត្តមាន</h4>
                <p className="text-xs text-slate-500 mt-0.5">បោះពុម្ពលិខិតផ្លូវការផ្ញើទៅអាណាព្យាបាលតាមទម្រង់ក្រសួង</p>
              </div>
            </div>

            <div
              onClick={() => onNavigate('extracts')}
              className="p-4 rounded-xl border border-slate-200/90 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all cursor-pointer group flex items-start space-x-3"
            >
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 group-hover:text-indigo-700">សម្រង់អត្ថបទ & មេរៀន</h4>
                <p className="text-xs text-slate-500 mt-0.5">កម្រងអត្ថបទអាន គតិបណ្ឌិត វិធាន និងកិច្ចតែងការសង្ខេប</p>
              </div>
            </div>

            <div
              onClick={() => onNavigate('annual-plan')}
              className="p-4 rounded-xl border border-slate-200/90 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all cursor-pointer group flex items-start space-x-3"
            >
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 group-hover:text-emerald-700">ផែនការគ្រូ ១ ឆ្នាំ</h4>
                <p className="text-xs text-slate-500 mt-0.5">តាមដានកម្មវិធីបង្រៀនប្រចាំខែ និងសប្តាហ៍ ឆមាសទី១-២</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Classes Snapshot */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-base">បញ្ជីថ្នាក់រៀន ({toKhmerNum(classes.length)})</h3>
            <button
              onClick={() => onNavigate('classes')}
              className="text-xs text-blue-600 hover:underline font-semibold flex items-center cursor-pointer"
            >
              មើលទាំងអស់ <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {classes.map((cls) => {
              const count = students.filter((s) => s.classId === cls.id).length;
              return (
                <div
                  key={cls.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                      {cls.grade}
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-slate-800">{cls.name}</p>
                      <p className="text-[11px] text-slate-400">{cls.room || 'បន្ទប់ទូទៅ'}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-white rounded-lg text-slate-700 border border-slate-200 shadow-2xs">
                    {toKhmerNum(count)} សិស្ស
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
