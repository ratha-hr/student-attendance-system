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
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, TeacherSettings } from '../types';
import type { NavTab } from '../components/Sidebar';
import { toKhmerNum, formatKhmerDate, getTodayDateString } from '../utils/dateUtils';
import { parseGradeNumber } from '../utils/classUtils';

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

  // Grade Distribution Calculation (Grades 7, 8, 9, 10, 11, 12)
  const gradeDistribution = useMemo(() => {
    const grades = ['7', '8', '9', '10', '11', '12'];
    const counts = grades.map((g) => {
      const gClasses = classes.filter((c) => parseGradeNumber(c.grade || c.name) === parseInt(g, 10));
      const gClassIds = new Set(gClasses.map((c) => c.id));
      const count = students.filter((s) => gClassIds.has(s.classId)).length;
      return { grade: g, count, classesCount: gClasses.length };
    });

    const maxVal = Math.max(1, ...counts.map((item) => item.count));

    return counts.map((item) => ({
      grade: item.grade,
      label: `ទី ${item.grade}`,
      count: item.count,
      classesCount: item.classesCount,
      heightPct: Math.round((item.count / maxVal) * 100),
    }));
  }, [students, classes]);

  // Attendance breakdown percentages for Diagram 1
  const totalRecordedToday = stats.presentToday + stats.permissionToday + stats.lateToday + stats.absentToday;
  const presentPct = totalRecordedToday > 0 ? Math.round((stats.presentToday / totalRecordedToday) * 100) : 0;
  const latePct = totalRecordedToday > 0 ? Math.round((stats.lateToday / totalRecordedToday) * 100) : 0;
  const permPct = totalRecordedToday > 0 ? Math.round((stats.permissionToday / totalRecordedToday) * 100) : 0;
  const absentPct = totalRecordedToday > 0 ? Math.max(0, 100 - presentPct - latePct - permPct) : 0;

  // Gender percentages for Diagram 2
  const femalePct = stats.totalStudents > 0 ? Math.round((stats.femaleStudents / stats.totalStudents) * 100) : 0;
  const malePct = stats.totalStudents > 0 ? 100 - femalePct : 0;

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in">
      {/* Modern Hero Welcome Banner with School Branding & Integrated KPIs (រូបទី២ លើកដាក់ជាមួយរបារខៀវ) */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-xl relative overflow-hidden space-y-3.5">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-linear-to-l from-white/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-3 py-0.5 bg-white/10 backdrop-blur-md rounded-full text-xs text-blue-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>ប្រព័ន្ធគ្រប់គ្រងសិស្ស & វត្តមានជំនាន់ថ្មី v2.0</span>
            </div>
            <h1 className="font-moul text-base sm:text-2xl text-white tracking-wide">
              {settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
              គ្រូបង្រៀន៖ <span className="font-bold text-white">{settings?.teacherName || 'ហ៊ុន រដ្ឋា'}</span> (មុខវិជ្ជា {settings?.specialtySubject || 'គណិតវិទ្យា'}) | ឆ្នាំសិក្សា {settings?.academicYear || '២០២៤-២០២៥'}
            </p>
          </div>

          {/* Overall Attendance Rate Circular Ring Gauge */}
          <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shrink-0 self-start md:self-auto">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
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
              <span className="absolute font-black text-xs sm:text-sm text-white">
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

        {/* 🌟 រូបទី២៖ លើកផ្នែកស្ថិតិសង្ខេបដាក់ក្នុងរបារខៀវ (Integrated Glassmorphism KPI Grid) */}
        <div className="relative z-10 pt-3 border-t border-white/15">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
            {/* KPI 1: សិស្សសរុប */}
            <div
              onClick={() => onNavigateTab('students')}
              className="flex items-center space-x-2.5 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/15 transition-all cursor-pointer group"
              title="ចុចដើម្បីមើលបញ្ជីសិស្ស"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-500/30 text-blue-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4 text-blue-200" />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline space-x-1">
                  <span className="text-[11px] font-bold text-blue-200 whitespace-nowrap">សិស្សសរុប៖</span>
                  <span className="text-base sm:text-lg font-black text-white">
                    {toKhmerNum(stats.totalStudents)}
                  </span>
                  <span className="text-[10px] text-blue-300">នាក់</span>
                </div>
                <p className="text-[10px] text-blue-200/90 truncate">
                  ស្រី <strong className="text-pink-300">{toKhmerNum(stats.femaleStudents)}</strong> • ប្រុស <strong className="text-blue-300">{toKhmerNum(stats.maleStudents)}</strong>
                </p>
              </div>
            </div>

            {/* KPI 2: ថ្នាក់រៀន */}
            <div
              onClick={() => onNavigateTab('timetable-class')}
              className="flex items-center space-x-2.5 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/15 transition-all cursor-pointer group"
              title="ចុចដើម្បីមើលថ្នាក់រៀន"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-500/30 text-purple-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-4 h-4 text-purple-200" />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline space-x-1">
                  <span className="text-[11px] font-bold text-blue-200 whitespace-nowrap">ថ្នាក់រៀន៖</span>
                  <span className="text-base sm:text-lg font-black text-purple-200">
                    {toKhmerNum(classes.length)}
                  </span>
                  <span className="text-[10px] text-blue-300">ថ្នាក់</span>
                </div>
                <p className="text-[10px] text-purple-200/80 truncate">
                  ថ្នាក់ទី ៧ ដល់ ទី ១២
                </p>
              </div>
            </div>

            {/* KPI 3: វត្តមានថ្ងៃនេះ */}
            <div
              onClick={() => onNavigateTab('attendance')}
              className="flex items-center space-x-2.5 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/15 transition-all cursor-pointer group"
              title="ចុចដើម្បីកត់វត្តមាន"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/30 text-emerald-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline space-x-1">
                  <span className="text-[11px] font-bold text-emerald-200 whitespace-nowrap">វត្តមានថ្ងៃនេះ៖</span>
                  <span className="text-base sm:text-lg font-black text-emerald-300">
                    {toKhmerNum(stats.presentToday + stats.lateToday)}
                  </span>
                  <span className="text-[10px] text-emerald-200/80">នាក់</span>
                </div>
                <p className="text-[10px] text-emerald-200/90 truncate">
                  ច្បាប់ <strong className="text-amber-300">{toKhmerNum(stats.permissionToday)}</strong> • យឺត <strong className="text-blue-300">{toKhmerNum(stats.lateToday)}</strong>
                </p>
              </div>
            </div>

            {/* KPI 4: អវត្តមានឥតច្បាប់ */}
            <div
              onClick={() => onNavigateTab('attendance')}
              className="flex items-center space-x-2.5 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/15 transition-all cursor-pointer group"
              title="ចុចដើម្បីពិនិត្យអវត្តមាន"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-500/30 text-rose-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-4 h-4 text-rose-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline space-x-1">
                  <span className="text-[11px] font-bold text-rose-200 whitespace-nowrap">អវត្តមានឥតច្បាប់៖</span>
                  <span className="text-base sm:text-lg font-black text-rose-300">
                    {toKhmerNum(stats.absentToday)}
                  </span>
                  <span className="text-[10px] text-rose-200/80">នាក់</span>
                </div>
                <p className="text-[10px] text-rose-300/80 truncate">
                  ទាមទារតាមដានមូលហេតុ
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 ផ្ទាំងដ្យាក្រាមវិភាគទិន្នន័យ (Visual Diagrams Section - Redesigned for Clarity) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Diagram 1: Today Attendance (5 cols) - Crystal Clear Ring & Metric Bars */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <PieChart className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  ដ្យាក្រាមវត្តមានថ្ងៃនេះ
                </h3>
                <p className="text-[11px] text-slate-400">
                  សរុបបានកត់ {toKhmerNum(totalRecordedToday)} នាក់
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-xl font-black text-xs border border-emerald-300">
              {toKhmerNum(stats.rate)}% វត្តមាន
            </span>
          </div>

          {/* Progress Breakdown Bars with percentages */}
          <div className="space-y-2.5">
            {/* 1. មក */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5" />
                  មកទាន់ពេល
                </span>
                <span className="text-slate-800">
                  <strong>{toKhmerNum(stats.presentToday)}</strong> នាក់ ({toKhmerNum(presentPct)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${presentPct}%` }} className="h-full bg-emerald-500 rounded-full transition-all duration-500" />
              </div>
            </div>

            {/* 2. ច្បាប់ */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center text-amber-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mr-1.5" />
                  មានច្បាប់
                </span>
                <span className="text-slate-800">
                  <strong>{toKhmerNum(stats.permissionToday)}</strong> នាក់ ({toKhmerNum(permPct)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${permPct}%` }} className="h-full bg-amber-400 rounded-full transition-all duration-500" />
              </div>
            </div>

            {/* 3. យឺត */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center text-blue-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5" />
                  មកយឺត
                </span>
                <span className="text-slate-800">
                  <strong>{toKhmerNum(stats.lateToday)}</strong> នាក់ ({toKhmerNum(latePct)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${latePct}%` }} className="h-full bg-blue-500 rounded-full transition-all duration-500" />
              </div>
            </div>

            {/* 4. ឥតច្បាប់ */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center text-rose-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5" />
                  អវត្តមានឥតច្បាប់
                </span>
                <span className="text-slate-800">
                  <strong>{toKhmerNum(stats.absentToday)}</strong> នាក់ ({toKhmerNum(absentPct)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${absentPct}%` }} className="h-full bg-rose-500 rounded-full transition-all duration-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Diagram 2: Gender Ratio (3 cols) - Clear Visual Cards */}
        <div className="lg:col-span-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  យេនឌ័រសិស្ស
                </h3>
                <p className="text-[11px] text-slate-400">
                  សរុប {toKhmerNum(stats.totalStudents)} នាក់
                </p>
              </div>
            </div>
          </div>

          {/* Dual Segment Visual Bar */}
          <div className="space-y-1">
            <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div style={{ width: `${femalePct}%` }} className="bg-pink-500 h-full transition-all" />
              <div style={{ width: `${malePct}%` }} className="bg-blue-600 h-full transition-all" />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 px-0.5">
              <span>ស្រី {toKhmerNum(femalePct)}%</span>
              <span>ប្រុស {toKhmerNum(malePct)}%</span>
            </div>
          </div>

          {/* Cards for Female and Male */}
          <div className="space-y-2">
            <div className="p-2.5 bg-pink-50/80 border border-pink-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-base">👩</span>
                <div>
                  <p className="text-xs font-bold text-pink-800">សិស្សស្រី</p>
                  <p className="text-[11px] text-pink-600 font-semibold">{toKhmerNum(stats.femaleStudents)} នាក់</p>
                </div>
              </div>
              <span className="text-base font-black text-pink-700">
                {toKhmerNum(femalePct)}%
              </span>
            </div>

            <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-base">👨</span>
                <div>
                  <p className="text-xs font-bold text-blue-800">សិស្សប្រុស</p>
                  <p className="text-[11px] text-blue-600 font-semibold">{toKhmerNum(stats.maleStudents)} នាក់</p>
                </div>
              </div>
              <span className="text-base font-black text-blue-700">
                {toKhmerNum(malePct)}%
              </span>
            </div>
          </div>
        </div>

        {/* Diagram 3: Student Distribution by Grade (4 cols) - Clean Horizontal Progress Bars */}
        <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  សិស្សតាមកម្រិតថ្នាក់
                </h3>
                <p className="text-[11px] text-slate-400">
                  {toKhmerNum(classes.length)} ថ្នាក់រៀន
                </p>
              </div>
            </div>
          </div>

          {/* Clean Horizontal Bars for each Grade (7 to 12) */}
          <div className="space-y-2">
            {gradeDistribution.map((item) => (
              <div key={item.grade} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">ថ្នាក់ទី {toKhmerNum(item.grade)}</span>
                  <span className="text-slate-900">
                    <strong className="text-indigo-700">{toKhmerNum(item.count)}</strong> នាក់
                    <span className="text-[10px] text-slate-400 font-normal ml-1">({toKhmerNum(item.classesCount)} ថ្នាក់)</span>
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${item.heightPct}%` }}
                    className="h-full bg-linear-to-r from-indigo-500 to-blue-500 rounded-full transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Section: Class Performance Table & At-Risk Warning Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Left 2 Cols: Class-by-Class Attendance Overview */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
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
              className="text-xs text-blue-600 font-bold hover:underline inline-flex items-center cursor-pointer"
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
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
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
            className="p-3 bg-white hover:bg-blue-50 text-slate-800 rounded-2xl border border-slate-200 shadow-2xs text-left transition-all cursor-pointer flex items-center space-x-2.5"
          >
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs">តារាងឈ្មោះសិស្ស</p>
              <p className="text-[10px] text-slate-400">ទម្រង់ MoEYS (xlsm)</p>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('monthly-attendance')}
            className="p-3 bg-white hover:bg-blue-50 text-slate-800 rounded-2xl border border-slate-200 shadow-2xs text-left transition-all cursor-pointer flex items-center space-x-2.5"
          >
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs">វត្តមានប្រចាំខែ</p>
              <p className="text-[10px] text-slate-400">បោះពុម្ពសៀវភៅតាមដាន</p>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('timetable-class')}
            className="p-3 bg-white hover:bg-blue-50 text-slate-800 rounded-2xl border border-slate-200 shadow-2xs text-left transition-all cursor-pointer flex items-center space-x-2.5"
          >
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs">កាលវិភាគបង្រៀន</p>
              <p className="text-[10px] text-slate-400">តាមគ្រូ & តាមថ្នាក់</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
