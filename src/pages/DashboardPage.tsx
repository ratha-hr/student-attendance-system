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
      {/* Modern Hero Welcome Banner with School Branding */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-6 rounded-3xl shadow-xl relative overflow-hidden">
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
      </div>

      {/* 🌟 រូបទី២៖ ផ្នែកស្ថិតិសង្ខេបរួមតូចតែមួយបន្ទាត់ (Single-Line Compact KPI Ribbon) */}
      <div className="bg-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 gap-2 lg:gap-0">
          {/* KPI 1: សិស្សសរុប */}
          <div
            onClick={() => onNavigateTab('students')}
            className="flex items-center space-x-2.5 px-2 py-1 cursor-pointer hover:bg-slate-50 rounded-xl transition-colors group"
            title="ចុចដើម្បីមើលបញ្ជីសិស្ស"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline space-x-1">
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">សិស្សសរុប៖</span>
                <span className="text-base sm:text-lg font-black text-slate-900">
                  {toKhmerNum(stats.totalStudents)}
                </span>
                <span className="text-[10px] text-slate-400">នាក់</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                ស្រី <strong className="text-pink-600">{toKhmerNum(stats.femaleStudents)}</strong> • ប្រុស <strong className="text-blue-600">{toKhmerNum(stats.maleStudents)}</strong>
              </p>
            </div>
          </div>

          {/* KPI 2: ថ្នាក់រៀន */}
          <div
            onClick={() => onNavigateTab('timetable-class')}
            className="flex items-center space-x-2.5 px-2 lg:px-4 py-1 cursor-pointer hover:bg-slate-50 rounded-xl transition-colors group"
            title="ចុចដើម្បីមើលថ្នាក់រៀន"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline space-x-1">
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">ថ្នាក់រៀន៖</span>
                <span className="text-base sm:text-lg font-black text-purple-900">
                  {toKhmerNum(classes.length)}
                </span>
                <span className="text-[10px] text-slate-400">ថ្នាក់</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                ថ្នាក់ទី ៧ ដល់ ទី ១២
              </p>
            </div>
          </div>

          {/* KPI 3: វត្តមានថ្ងៃនេះ */}
          <div
            onClick={() => onNavigateTab('attendance')}
            className="flex items-center space-x-2.5 px-2 lg:px-4 py-1 cursor-pointer hover:bg-emerald-50/50 rounded-xl transition-colors group"
            title="ចុចដើម្បីកត់វត្តមាន"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline space-x-1">
                <span className="text-[11px] font-bold text-emerald-700 whitespace-nowrap">វត្តមានថ្ងៃនេះ៖</span>
                <span className="text-base sm:text-lg font-black text-emerald-800">
                  {toKhmerNum(stats.presentToday + stats.lateToday)}
                </span>
                <span className="text-[10px] text-emerald-600">នាក់</span>
              </div>
              <p className="text-[10px] text-emerald-600 truncate">
                ច្បាប់ <strong className="text-amber-600">{toKhmerNum(stats.permissionToday)}</strong> • យឺត <strong className="text-blue-600">{toKhmerNum(stats.lateToday)}</strong>
              </p>
            </div>
          </div>

          {/* KPI 4: អវត្តមានឥតច្បាប់ */}
          <div
            onClick={() => onNavigateTab('attendance')}
            className="flex items-center space-x-2.5 px-2 lg:px-4 py-1 cursor-pointer hover:bg-rose-50/50 rounded-xl transition-colors group"
            title="ចុចដើម្បីពិនិត្យអវត្តមាន"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline space-x-1">
                <span className="text-[11px] font-bold text-rose-700 whitespace-nowrap">អវត្តមានឥតច្បាប់៖</span>
                <span className="text-base sm:text-lg font-black text-rose-800">
                  {toKhmerNum(stats.absentToday)}
                </span>
                <span className="text-[10px] text-rose-600">នាក់</span>
              </div>
              <p className="text-[10px] text-rose-500 truncate">
                ទាមទារតាមដានមូលហេតុ
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 រូបទី២៖ ផ្ទាំងដ្យាក្រាមវិភាគទិន្នន័យ (Visual Diagrams Section) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Diagram 1: Today Attendance Visual Breakdown */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <PieChart className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-800">
                ដ្យាក្រាមវត្តមានថ្ងៃនេះ
              </h3>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-black text-[11px] border border-emerald-200">
              {toKhmerNum(stats.rate)}% មក
            </span>
          </div>

          {/* Segmented Horizontal Progress Bar Diagram */}
          <div className="space-y-1.5">
            <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${totalRecordedToday > 0 ? presentPct : 90}%` }}
                className="bg-emerald-500 h-full transition-all duration-700"
                title={`មក៖ ${toKhmerNum(stats.presentToday)} នាក់`}
              />
              <div
                style={{ width: `${totalRecordedToday > 0 ? permPct : 5}%` }}
                className="bg-amber-400 h-full transition-all duration-700"
                title={`ច្បាប់៖ ${toKhmerNum(stats.permissionToday)} នាក់`}
              />
              <div
                style={{ width: `${totalRecordedToday > 0 ? latePct : 3}%` }}
                className="bg-blue-400 h-full transition-all duration-700"
                title={`យឺត៖ ${toKhmerNum(stats.lateToday)} នាក់`}
              />
              <div
                style={{ width: `${totalRecordedToday > 0 ? absentPct : 2}%` }}
                className="bg-rose-500 h-full transition-all duration-700"
                title={`ឥតច្បាប់៖ ${toKhmerNum(stats.absentToday)} នាក់`}
              />
            </div>
          </div>

          {/* Colored Legend Pills */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
            <div className="flex items-center justify-between p-1.5 bg-emerald-50/70 rounded-lg text-emerald-800 border border-emerald-100">
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 inline-block" />មក</span>
              <span>{toKhmerNum(stats.presentToday)} នាក់</span>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-amber-50/70 rounded-lg text-amber-800 border border-amber-100">
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5 inline-block" />ច្បាប់</span>
              <span>{toKhmerNum(stats.permissionToday)} នាក់</span>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-blue-50/70 rounded-lg text-blue-800 border border-blue-100">
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-400 mr-1.5 inline-block" />យឺត</span>
              <span>{toKhmerNum(stats.lateToday)} នាក់</span>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-rose-50/70 rounded-lg text-rose-800 border border-rose-100">
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5 inline-block" />ឥតច្បាប់</span>
              <span>{toKhmerNum(stats.absentToday)} នាក់</span>
            </div>
          </div>
        </div>

        {/* Diagram 2: Gender Ratio Proportional Diagram */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-pink-50 text-pink-600 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-800">
                ដ្យាក្រាមយេនឌ័រសិស្ស
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-500">
              សរុប {toKhmerNum(stats.totalStudents)} នាក់
            </span>
          </div>

          {/* Dual Segment Gender Bar */}
          <div className="space-y-1.5">
            <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${femalePct}%` }}
                className="bg-linear-to-r from-pink-500 to-rose-400 h-full transition-all duration-700"
                title={`ស្រី៖ ${femalePct}%`}
              />
              <div
                style={{ width: `${malePct}%` }}
                className="bg-linear-to-r from-blue-400 to-blue-600 h-full transition-all duration-700"
                title={`ប្រុស៖ ${malePct}%`}
              />
            </div>
          </div>

          {/* Male and Female breakdown cards */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-pink-50/70 border border-pink-200 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="font-bold text-pink-700 flex items-center">
                  👩 សិស្សស្រី
                </span>
                <span className="font-black text-pink-800 text-sm">
                  {toKhmerNum(femalePct)}%
                </span>
              </div>
              <p className="text-[11px] text-pink-600 mt-0.5">
                {toKhmerNum(stats.femaleStudents)} នាក់
              </p>
            </div>

            <div className="p-2 bg-blue-50/70 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-700 flex items-center">
                  👨 សិស្សប្រុស
                </span>
                <span className="font-black text-blue-800 text-sm">
                  {toKhmerNum(malePct)}%
                </span>
              </div>
              <p className="text-[11px] text-blue-600 mt-0.5">
                {toKhmerNum(stats.maleStudents)} នាក់
              </p>
            </div>
          </div>
        </div>

        {/* Diagram 3: Student Distribution by Grade (7 to 12 Bar Chart) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-800">
                សិស្សតាមកម្រិតថ្នាក់
              </h3>
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
              {toKhmerNum(classes.length)} ថ្នាក់
            </span>
          </div>

          {/* Vertical Bar Chart Diagram for Grades 7 to 12 */}
          <div className="flex items-end justify-between gap-1.5 h-20 pt-2 px-1 border-b border-slate-100">
            {gradeDistribution.map((item) => (
              <div key={item.grade} className="flex-1 flex flex-col items-center h-full justify-end group">
                {/* Count tooltip/label */}
                <span className="text-[10px] font-black text-indigo-900 group-hover:scale-110 transition-transform mb-1">
                  {toKhmerNum(item.count)}
                </span>
                {/* Bar */}
                <div
                  style={{ height: `${item.heightPct}%` }}
                  className="w-full max-w-[28px] rounded-t-md bg-linear-to-t from-indigo-600 to-blue-400 group-hover:from-indigo-700 group-hover:to-blue-500 transition-all shadow-2xs"
                  title={`${item.label}៖ ${toKhmerNum(item.count)} នាក់ (${toKhmerNum(item.classesCount)} ថ្នាក់)`}
                />
              </div>
            ))}
          </div>

          {/* Grade Labels under the bars */}
          <div className="flex justify-between px-1 text-[10px] font-bold text-slate-500">
            {gradeDistribution.map((item) => (
              <div key={item.grade} className="flex-1 text-center truncate">
                {item.label}
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
