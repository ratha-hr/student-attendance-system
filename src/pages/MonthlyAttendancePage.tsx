import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Printer,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  Send,
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, TeacherSettings, AttendanceStatus } from '../types';
import { PrintButton } from '../components/common/PrintButton';
import {
  toKhmerNum,
  formatKhmerDate,
  getTodayDateString,
  KHMER_MONTHS,
  getKhmerHoliday,
  isSunday,
  getDaysInMonth,
} from '../utils/dateUtils';

interface MonthlyAttendancePageProps {
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords: AttendanceRecord[];
  settings: TeacherSettings | null;
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  onRefresh: () => void;
  onGenerateLetterForStudent?: (studentId: string) => void;
}

export const MonthlyAttendancePage: React.FC<MonthlyAttendancePageProps> = ({
  students,
  classes,
  attendanceRecords,
  settings,
  selectedClassId,
  onSelectClass,
  onRefresh,
  onGenerateLetterForStudent,
}) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  // Strictly filter by active class
  const activeClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
  const currentClass = classes.find((c) => c.id === activeClassId);

  // Students for the active class only
  const classStudents = useMemo(() => {
    return students
      .filter((s) => s.classId === activeClassId)
      .sort((a, b) => a.rollNo - b.rollNo);
  }, [students, activeClassId]);

  const totalStudents = classStudents.length;
  const femaleStudents = classStudents.filter((s) => s.gender === 'ស្រី').length;
  const maleStudents = classStudents.filter((s) => s.gender === 'ប្រុស').length;

  // Days in selected month
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Analyze holidays and sundays in this month
  const monthHolidays = useMemo(() => {
    const holidays: { day: number; name: string }[] = [];
    daysArray.forEach((day) => {
      const hName = getKhmerHoliday(selectedMonth + 1, day);
      if (hName) holidays.push({ day, name: hName });
    });
    return holidays;
  }, [selectedMonth, daysArray]);

  const sundaysCount = useMemo(() => {
    return daysArray.filter((day) => isSunday(selectedYear, selectedMonth, day)).length;
  }, [selectedYear, selectedMonth, daysArray]);

  // Prefix for matching date strings (YYYY-MM-)
  const monthStr = String(selectedMonth + 1).padStart(2, '0');
  const datePrefix = `${selectedYear}-${monthStr}-`;

  // Matrix calculation per student
  const studentMatrix = useMemo(() => {
    return classStudents.map((stu) => {
      let present = 0;
      let permission = 0;
      let absent = 0;
      let late = 0;
      const dayMap: Record<number, { status: AttendanceStatus; reason?: string }> = {};

      attendanceRecords.forEach((r) => {
        if (r.studentId === stu.id && r.date.startsWith(datePrefix)) {
          const day = parseInt(r.date.slice(8, 10), 10);
          dayMap[day] = { status: r.status, reason: r.reason };
          if (r.status === 'present') present++;
          else if (r.status === 'permission') permission++;
          else if (r.status === 'absent') absent++;
          else if (r.status === 'late') late++;
        }
      });

      return {
        student: stu,
        dayMap,
        present,
        permission,
        absent,
        late,
        totalAbsence: permission + absent,
      };
    });
  }, [classStudents, attendanceRecords, datePrefix]);

  return (
    <div className="space-y-5">
      {/* Top Controller Header (Hidden on Print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center">
            <CalendarDays className="w-6 h-6 text-blue-600 mr-2" />
            តារាងសរុបវត្តមានប្រចាំខែ ({currentClass?.name || 'ថ្នាក់រៀន'})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            តាមដានវត្តមានប្រចាំខែ ផ្ទៀងផ្ទាត់ថ្ងៃឈប់បុណ្យជាតិ (អក្សរក្រហម) និងថ្ងៃអាទិត្យ (ពណ៌លឿង)
          </p>
        </div>

        {/* Controls: Class switcher, Month & Year picker, Print */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Class Badge (Controlled by top Navbar) */}
          <span className="inline-flex items-center px-2.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-200">
            📚 {currentClass?.name || 'ថ្នាក់រៀន'}
          </span>

          {/* Month Selector */}
          <div className="flex items-center space-x-1.5">
            <label className="text-xs font-bold text-slate-600 whitespace-nowrap">ខែ៖</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-50 border border-slate-300 font-bold text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-800 cursor-pointer shadow-2xs"
            >
              {KHMER_MONTHS.map((m, idx) => (
                <option key={m} value={idx}>
                  ខែ {m}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="flex items-center space-x-1.5">
            <label className="text-xs font-bold text-slate-600 whitespace-nowrap">ឆ្នាំ៖</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-50 border border-slate-300 font-bold text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-800 cursor-pointer shadow-2xs"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>
                  ឆ្នាំ {toKhmerNum(y)}
                </option>
              ))}
            </select>
          </div>

          {/* Print Button with Orientation Selector */}
          <PrintButton defaultOrientation="landscape" label="បោះពុម្ពតារាងខែ" />
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        {/* Total Students Card */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">សិស្សសរុបក្នុងថ្នាក់</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-800">{toKhmerNum(totalStudents)} នាក់</span>
            <span className="text-xs font-bold text-pink-600">ស្រី {toKhmerNum(femaleStudents)}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">ប្រុស {toKhmerNum(maleStudents)} នាក់</p>
        </div>

        {/* Khmer Holidays in this month */}
        <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 shadow-2xs">
          <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">ថ្ងៃឈប់បុណ្យជាតិក្នុងខែ</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-rose-700">{toKhmerNum(monthHolidays.length)} ថ្ងៃ</span>
            <span className="text-[11px] text-rose-600 font-semibold">(អក្សរក្រហម)</span>
          </div>
          <p className="text-[10px] text-rose-600/80 truncate mt-0.5">
            {monthHolidays.length > 0 ? monthHolidays.map((h) => h.name).join(', ') : 'គ្មានថ្ងៃបុណ្យជាតិ'}
          </p>
        </div>

        {/* Sundays in this month */}
        <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 shadow-2xs">
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">ថ្ងៃអាទិត្យ (ចុងសប្តាហ៍)</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-800">{toKhmerNum(sundaysCount)} ថ្ងៃ</span>
            <span className="text-[11px] text-amber-700 font-semibold">(ពណ៌លឿង)</span>
          </div>
          <p className="text-[10px] text-amber-700/80 mt-0.5">ឈប់សម្រាកប្រចាំសប្តាហ៍</p>
        </div>

        {/* School & Teacher Badge */}
        <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200 shadow-2xs">
          <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">គ្រូបង្រៀនទទួលបន្ទុក</p>
          <p className="text-sm font-black text-blue-900 mt-1 truncate">
            {settings?.teacherName || 'លោកគ្រូ ហ៊ុន រដ្ឋា'}
          </p>
          <p className="text-[10px] text-blue-600 truncate mt-0.5">
            {settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}
          </p>
        </div>
      </div>

      {/* Official Printable Header */}
      <div className="hidden print:block text-center my-4">
        <h3 className="font-moul text-base leading-relaxed">ព្រះរាជាណាចក្រកម្ពុជា</h3>
        <h4 className="font-moul text-sm">ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
        <div className="w-24 h-0.5 bg-black mx-auto my-1.5" />
        <div className="flex justify-between items-center text-xs mt-3 px-2">
          <div className="text-left">
            <p className="font-bold">{settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}</p>
            <p>គ្រូបង្រៀន៖ {settings?.teacherName || 'ហ៊ុន រដ្ឋា'}</p>
          </div>
          <div className="text-center font-moul text-base">
            តារាងស្រង់វត្តមានសិស្សប្រចាំខែ {KHMER_MONTHS[selectedMonth]} ឆ្នាំ {toKhmerNum(selectedYear)}
            <p className="font-sans text-xs font-bold text-slate-700">{currentClass?.name}</p>
          </div>
          <div className="text-right">
            <p>សិស្សសរុប៖ {toKhmerNum(totalStudents)} នាក់ (ស្រី {toKhmerNum(femaleStudents)})</p>
            <p>ឆ្នាំសិក្សា៖ {settings?.academicYear || '២០២៤-២០២៥'}</p>
          </div>
        </div>
      </div>

      {/* Highlight Legend (Instruction Bar) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 shadow-2xs no-print">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-slate-700">សម្គាល់ពណ៌តារាង៖</span>
          <span className="inline-flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-200 border border-rose-300 inline-block" />
            <span className="text-rose-700 font-bold">🔴 ថ្ងៃបុណ្យជាតិ (អក្សរក្រហម + មូលហេតុ)</span>
          </span>
          <span className="inline-flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-200 border border-amber-300 inline-block" />
            <span className="text-amber-800 font-bold">🟡 ថ្ងៃអាទិត្យ (ឈប់ចុងសប្តាហ៍)</span>
          </span>
          <span className="inline-flex items-center space-x-1">
            <span className="font-bold text-emerald-600">✓</span>
            <span className="text-slate-600">មក</span>
          </span>
          <span className="inline-flex items-center space-x-1">
            <span className="font-bold text-amber-600">ច</span>
            <span className="text-slate-600">ច្បាប់</span>
          </span>
          <span className="inline-flex items-center space-x-1">
            <span className="font-bold text-rose-600">អ</span>
            <span className="text-slate-600">ឥតច្បាប់</span>
          </span>
          <span className="inline-flex items-center space-x-1">
            <span className="font-bold text-blue-600">យ</span>
            <span className="text-slate-600">យឺត</span>
          </span>
        </div>
        {monthHolidays.length > 0 && (
          <span className="text-[11px] text-rose-600 font-bold truncate max-w-md">
            បុណ្យក្នុងខែ៖ {monthHolidays.map((h) => `${toKhmerNum(h.day)}: ${h.name}`).join(' | ')}
          </span>
        )}
      </div>

      {/* Main Monthly Attendance Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-auto max-h-[72vh] table-scrollbar">
          <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
            <thead className="sticky top-0 z-20 bg-slate-100 shadow-xs">
              <tr className="border-b border-slate-300 text-slate-700 font-bold">
                <th className="py-2.5 px-2 text-center w-10 border-r border-slate-200 sticky left-0 bg-slate-100 z-30">ល.រ</th>
                <th className="py-2.5 px-2.5 w-24 border-r border-slate-200 sticky left-10 bg-slate-100 z-30">អត្តលេខ</th>
                <th className="py-2.5 px-3 min-w-[150px] border-r border-slate-200 sticky left-34 bg-slate-100 z-30">គោត្តនាម-នាម</th>
                <th className="py-2.5 px-2 text-center w-12 border-r border-slate-300">ភេទ</th>

                {/* Day Columns */}
                {daysArray.map((day) => {
                  const holiday = getKhmerHoliday(selectedMonth + 1, day);
                  const isSun = isSunday(selectedYear, selectedMonth, day);

                  let thClass = 'py-1 px-1 text-center w-7 border-r border-slate-200 ';
                  if (holiday) {
                    thClass += 'bg-rose-100 text-rose-700 font-extrabold border-rose-300 ';
                  } else if (isSun) {
                    thClass += 'bg-amber-100 text-amber-900 font-bold border-amber-300 ';
                  } else {
                    thClass += 'text-slate-700 ';
                  }

                  return (
                    <th
                      key={day}
                      className={thClass}
                      title={holiday ? `ថ្ងៃទី ${toKhmerNum(day)}៖ ${holiday}` : isSun ? `ថ្ងៃអាទិត្យ ទី ${toKhmerNum(day)}` : `ថ្ងៃទី ${toKhmerNum(day)}`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] leading-tight">{toKhmerNum(day)}</span>
                        {holiday ? (
                          <span className="text-[8px] text-rose-600 truncate max-w-[28px] font-black">ឈប់</span>
                        ) : isSun ? (
                          <span className="text-[8px] text-amber-700 font-bold">អា</span>
                        ) : null}
                      </div>
                    </th>
                  );
                })}

                {/* Summary Totals Header */}
                <th className="py-2.5 px-2 text-center w-10 bg-emerald-50 text-emerald-800 border-r border-slate-200 font-bold">មក</th>
                <th className="py-2.5 px-2 text-center w-10 bg-amber-50 text-amber-800 border-r border-slate-200 font-bold">ច្បាប់</th>
                <th className="py-2.5 px-2 text-center w-10 bg-rose-50 text-rose-800 border-r border-slate-200 font-bold">ឥតច្បាប់</th>
                <th className="py-2.5 px-2 text-center w-10 bg-blue-50 text-blue-800 border-r border-slate-200 font-bold">យឺត</th>
                <th className="py-2.5 px-2 text-center w-14 bg-slate-200 text-slate-800 font-bold">សរុបឈប់</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {studentMatrix.map((item, idx) => {
                const s = item.student;
                const isFrequentAbsent = item.absent >= (settings?.absenceWarningThreshold || 3);

                return (
                  <tr
                    key={s.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isFrequentAbsent ? 'bg-rose-50/20' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    <td className="py-2 px-2 text-center font-bold text-slate-600 border-r border-slate-200 sticky left-0 bg-inherit z-10">
                      {toKhmerNum(s.rollNo)}
                    </td>
                    <td className="py-2 px-2.5 font-mono text-[11px] text-slate-500 border-r border-slate-200 sticky left-10 bg-inherit z-10">
                      {s.studentCode}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200 sticky left-34 bg-inherit z-10 whitespace-nowrap">
                      {s.nameKh}
                      {isFrequentAbsent && (
                        <span
                          className="ml-1.5 inline-block px-1.5 py-0.2 text-[9px] bg-rose-100 text-rose-700 rounded-full font-bold cursor-pointer"
                          title="អវត្តមានច្រើនដង អាចចេញលិខិតព្រមាន"
                          onClick={() => onGenerateLetterForStudent && onGenerateLetterForStudent(s.id)}
                        >
                          ព្រមាន
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center font-medium border-r border-slate-300">
                      <span className={s.gender === 'ស្រី' ? 'text-pink-600 font-bold' : 'text-blue-600'}>
                        {s.gender}
                      </span>
                    </td>

                    {/* Day Matrix Cells */}
                    {daysArray.map((day) => {
                      const holiday = getKhmerHoliday(selectedMonth + 1, day);
                      const isSun = isSunday(selectedYear, selectedMonth, day);
                      const record = item.dayMap[day];

                      if (holiday) {
                        return (
                          <td
                            key={day}
                            className="py-1 px-1 text-center bg-rose-50 border-r border-rose-200/80 text-rose-600 font-bold"
                            title={`${toKhmerNum(day)} ${KHMER_MONTHS[selectedMonth]}៖ ${holiday}`}
                          >
                            <span className="text-[10px] text-rose-600">ឈប់</span>
                          </td>
                        );
                      }

                      if (isSun) {
                        return (
                          <td
                            key={day}
                            className="py-1 px-1 text-center bg-amber-50/70 border-r border-amber-200/80 text-amber-800 font-medium"
                            title="ថ្ងៃអាទិត្យ ឈប់សម្រាក"
                          >
                            <span className="text-[10px] text-amber-700">-</span>
                          </td>
                        );
                      }

                      if (!record) {
                        return (
                          <td key={day} className="py-1 px-1 text-center border-r border-slate-200 text-slate-300">
                            -
                          </td>
                        );
                      }

                      let text = '-';
                      let colorClass = 'text-slate-400';
                      if (record.status === 'present') {
                        text = '✓';
                        colorClass = 'text-emerald-600 font-bold';
                      } else if (record.status === 'permission') {
                        text = 'ច';
                        colorClass = 'text-amber-600 font-bold';
                      } else if (record.status === 'absent') {
                        text = 'អ';
                        colorClass = 'text-rose-600 font-bold';
                      } else if (record.status === 'late') {
                        text = 'យ';
                        colorClass = 'text-blue-600 font-bold';
                      }

                      return (
                        <td
                          key={day}
                          className={`py-1 px-1 text-center border-r border-slate-200 ${colorClass}`}
                          title={record.reason ? `មូលហេតុ៖ ${record.reason}` : undefined}
                        >
                          {text}
                        </td>
                      );
                    })}

                    {/* Summary Counters */}
                    <td className="py-2 px-2 text-center font-bold text-emerald-700 bg-emerald-50/50 border-r border-slate-200">
                      {toKhmerNum(item.present)}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-amber-700 bg-amber-50/50 border-r border-slate-200">
                      {toKhmerNum(item.permission)}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-rose-700 bg-rose-50/50 border-r border-slate-200">
                      {toKhmerNum(item.absent)}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-blue-700 bg-blue-50/50 border-r border-slate-200">
                      {toKhmerNum(item.late)}
                    </td>
                    <td className="py-2 px-2 text-center font-black text-slate-800 bg-slate-100">
                      {toKhmerNum(item.totalAbsence)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
