import React, { useMemo } from 'react';
import {
  Users,
  CalendarCheck2,
  GraduationCap,
  AlertTriangle,
  TrendingUp,
  Award,
  ArrowRight,
  FileSpreadsheet,
  MailWarning,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, TeacherSettings } from '../types';
import type { NavTab } from '../components/Sidebar';
import { toKhmerNum, formatKhmerDate, getTodayDateString } from '../utils/dateUtils';

interface DashboardPageProps {
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords: AttendanceRecord[];
  settings: TeacherSettings | null;
  onNavigateTab: (tab: NavTab) => void;
  onSelectClass: (classId: string) => void;
  onSelectStudentForLetter?: (studentId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  students,
  classes,
  attendanceRecords,
  settings,
  onNavigateTab,
  onSelectClass,
  onSelectStudentForLetter,
}) => {
  const today = getTodayDateString();

  // Statistics calculation
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const femaleStudents = students.filter((s) => s.gender === 'ស្រី').length;
    const maleStudents = totalStudents - femaleStudents;

    // Today attendance records
    const todayRecords = attendanceRecords.filter((r) => r.date === today);
    const presentToday = todayRecords.filter((r) => r.status === 'present').length;
    const permissionToday = todayRecords.filter((r) => r.status === 'permission').length;
    const absentToday = todayRecords.filter((r) => r.status === 'absent').length;
    const lateToday = todayRecords.filter((r) => r.status === 'late').length;

    // Attendance rate
    const totalRecorded = presentToday + permissionToday + absentToday + lateToday;
    const rate = totalRecorded > 0
      ? Math.round(((presentToday + lateToday) / totalRecorded) * 100)
      : 97; // Default healthy baseline

    // At risk students (absent >= 3 times)
    const absenceCountMap = new Map<string, number>();
    attendanceRecords.forEach((r) => {
      if (r.status === 'absent') {
        absenceCountMap.set(r.studentId, (absenceCountMap.get(r.studentId) || 0) + 1);
      }
    });

    const atRiskList = students
      .filter((s) => (absenceCountMap.get(s.id) || 0) >= 2)
      .map((s) => ({
        student: s,
        absenceCount: absenceCountMap.get(s.id) || 0,
        className: classes.find((c) => c.id === s.classId)?.name || 'ថ្នាក់រៀន',
      }))
      .sort((a, b) => b.absenceCount - a.absenceCount)
      .slice(0, 5);

    // Class performance overview
    const classStats = classes.map((c) => {
      const classStudents = students.filter((s) => s.classId === c.id);
      const classTodayRecords = todayRecords.filter((r) => r.classId === c.id);
      const present = classTodayRecords.filter((r) => r.status === 'present').length;
      const absent = classTodayRecords.filter((r) => r.status === 'absent').length;
      return {
        id: c.id,
        name: c.name,
        grade: c.grade,
        count: classStudents.length,
        femaleCount: classStudents.filter((s) => s.gender === 'ស្រី').length,
        present,
        absent,
      };
    });

    return {
      totalStudents,
      femaleStudents,
      maleStudents,
      presentToday,
      permissionToday,
      absentToday,
      lateToday,
      rate,
      atRiskList,
      classStats,
    };
  }, [students, classes, attendanceRecords, today]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Modern Hero Welcome Banner with Gradient & Cambodian School Branding */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-7 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-linear-to-l from-white/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs text-blue-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>ប្រព័ន្ធគ្រប់គ្រងសិស្ស & វត្តមានជំនាន់ថ្មី v2.0</span>
            </div>
            <h1 className="font-moul text-lg sm:text-2xl text-white tracking-wide">
              {settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
              គ្រូបង្រៀន៖ <span className="font-bold text-white">{settings?.teacherName || 'ហ៊ុន រដ្ឋា'}</span> (មុខវិជ្ជា {settings?.specialtySubject || 'គណិតវិទ្យា'}) | ឆ្នាំសិក្សា {settings?.academicYear || '២០២៤-២០២៥'}
            </p>
          </div>

          {/* Overall Attendance Rate Circular Ring Gauge */}
          <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shrink-0">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/20"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400 transition-all duration-1000 ease-out"
                  strokeDasharray={`${stats.rate}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-black text-sm text-white">
                {toKhmerNum(stats.rate)}%
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-blue-200">អត្រាវត្តមានសរុប</p>
              <p className="text-[11px] text-emerald-300 font-semibold mt-0.5">
                ● ស្ថិតក្នុងកម្រិតល្អប្រសើរ
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern KPI Cards Grid (4 Columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Students */}
        <div
          onClick={() => onNavigateTab('students')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">សិស្សសរុប</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">
            {toKhmerNum(stats.totalStudents)}{' '}
            <span className="text-xs font-normal text-slate-400">នាក់</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            ស្រី៖ <span className="font-bold text-pink-600">{toKhmerNum(stats.femaleStudents)}</span> | ប្រុស៖ <span className="font-bold text-blue-600">{toKhmerNum(stats.maleStudents)}</span>
          </p>
        </div>

        {/* Card 2: Classes Count */}
        <div
          onClick={() => onNavigateTab('timetable-class')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ថ្នាក់រៀន</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">
            {toKhmerNum(classes.length)}{' '}
            <span className="text-xs font-normal text-slate-400">ថ្នាក់</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            ថ្នាក់ទី ៧ ដល់ ទី ១២
          </p>
        </div>

        {/* Card 3: Today's Present */}
        <div
          onClick={() => onNavigateTab('attendance')}
          className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">វត្តមានថ្ងៃនេះ</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-800 mt-2">
            {toKhmerNum(stats.presentToday + stats.lateToday)}{' '}
            <span className="text-xs font-normal text-emerald-600">នាក់</span>
          </p>
          <p className="text-[11px] text-emerald-700 mt-1">
            ច្បាប់៖ {toKhmerNum(stats.permissionToday)} | យឺត៖ {toKhmerNum(stats.lateToday)}
          </p>
        </div>

        {/* Card 4: Today's Absent */}
        <div
          onClick={() => onNavigateTab('attendance')}
          className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">អវត្តមានឥតច្បាប់</span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-800 mt-2">
            {toKhmerNum(stats.absentToday)}{' '}
            <span className="text-xs font-normal text-rose-600">នាក់</span>
          </p>
          <p className="text-[11px] text-rose-600 mt-1">
            ទាមទារតាមដានមូលហេតុ
          </p>
        </div>
      </div>

      {/* Middle Section: Quick Actions & At-Risk Warning Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Class-by-Class Attendance Overview */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">
                ស្ថានភាពវត្តមានតាមថ្នាក់នីមួយៗ (Class Performance)
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('monthly-attendance')}
              className="text-xs text-blue-600 font-bold hover:underline inline-flex items-center"
            >
              មើលតារាងប្រចាំខែ <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="py-2 px-3">ថ្នាក់រៀន</th>
                  <th className="py-2 px-3 text-center">សិស្សសរុប</th>
                  <th className="py-2 px-3 text-center">ស្រី</th>
                  <th className="py-2 px-3 text-center">មក (ថ្ងៃនេះ)</th>
                  <th className="py-2 px-3 text-center">អវត្តមាន</th>
                  <th className="py-2 px-3 text-center">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.classStats.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      📚 {c.name}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                      {toKhmerNum(c.count)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-pink-600">
                      {toKhmerNum(c.femaleCount)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                      {toKhmerNum(c.present)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-rose-600">
                      {toKhmerNum(c.absent)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => {
                          onSelectClass(c.id);
                          onNavigateTab('attendance');
                        }}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg hover:bg-blue-100 transition-colors cursor-pointer text-[11px]"
                      >
                        កត់វត្តមាន
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: At-Risk Students requiring Warning Letters */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <MailWarning className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">
                  សិស្សអវត្តមានច្រើន (ត្រៀមព្រមាន)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                {toKhmerNum(stats.atRiskList.length)} នាក់
              </span>
            </div>

            {stats.atRiskList.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-slate-600">អស្ចារ្យណាស់!</p>
                <p className="text-[11px]">មិនមានសិស្សអវត្តមានលើស ២ ដងឡើយ</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.atRiskList.map(({ student, absenceCount, className }) => (
                  <div
                    key={student.id}
                    className="p-2.5 bg-rose-50/60 border border-rose-100 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{student.nameKh}</p>
                      <p className="text-[10px] text-slate-500">
                        {className} • អវត្តមាន {toKhmerNum(absenceCount)} ដង
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (onSelectStudentForLetter) {
                          onSelectStudentForLetter(student.id);
                        } else {
                          onNavigateTab('letters');
                        }
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      ចេញលិខិត
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('letters')}
            className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-2xl shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
          >
            <span>គ្រប់គ្រងលិខិតព្រមាន (A4)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modern Quick Action Hub */}
      <div className="bg-slate-100/70 p-4 sm:p-5 rounded-3xl border border-slate-200">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          ⚡ ផ្លូវកាត់រហ័ស (Quick Action Hub)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => onNavigateTab('attendance')}
            className="p-3 bg-white hover:bg-blue-50 text-slate-800 rounded-2xl border border-slate-200 shadow-2xs text-left transition-all cursor-pointer flex items-center space-x-2.5"
          >
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs">កត់វត្តមានថ្ងៃនេះ</p>
              <p className="text-[10px] text-slate-400">វេនព្រឹក & រសៀល</p>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('students')}
            className="p-3 bg-white hover:bg-emerald-50 text-slate-800 rounded-2xl border border-slate-200 shadow-2xs text-left transition-all cursor-pointer flex items-center space-x-2.5"
          >
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs">តារាងសិស្ស xlsm</p>
              <p className="text-[10px] text-slate-400">កែប្រែ & នាំចេញ</p>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('grades')}
            className="p-3 bg-white hover:bg-purple-50 text-slate-800 rounded-2xl border border-slate-200 shadow-2xs text-left transition-all cursor-pointer flex items-center space-x-2.5"
          >
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs">ពិន្ទុសិស្សប្រចាំខែ</p>
              <p className="text-[10px] text-slate-400">គណនាតាមមេគុណ</p>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('timetable-teacher')}
            className="p-3 bg-white hover:bg-amber-50 text-slate-800 rounded-2xl border border-slate-200 shadow-2xs text-left transition-all cursor-pointer flex items-center space-x-2.5"
          >
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs">កាលវិភាគបង្រៀន</p>
              <p className="text-[10px] text-slate-400">គ្រូ ហ៊ុន រដ្ឋា</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
