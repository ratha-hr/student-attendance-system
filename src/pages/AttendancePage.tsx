import React, { useState, useMemo } from 'react';
import {
  CalendarCheck2,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Save,
  Printer,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  Search,
  Filter,
  Send,
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, AttendanceStatus, TeacherSettings } from '../types';
import { db } from '../db/db';
import { toKhmerNum, formatKhmerDate, getTodayDateString, KHMER_MONTHS } from '../utils/dateUtils';
import { TelegramShareModal } from '../components/TelegramShareModal';

interface AttendancePageProps {
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords: AttendanceRecord[];
  settings: TeacherSettings | null;
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  onRefresh: () => void;
  onGenerateLetterForStudent?: (studentId: string) => void;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({
  students,
  classes,
  attendanceRecords,
  settings,
  selectedClassId,
  onSelectClass,
  onRefresh,
  onGenerateLetterForStudent,
}) => {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedSession, setSelectedSession] = useState<'morning' | 'afternoon'>('morning');
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  // For monthly view
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Class selection (fallback to first class if ALL is selected)
  const activeClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
  const currentClass = classes.find((c) => c.id === activeClassId);

  // Students for the active class
  const classStudents = useMemo(() => {
    return students
      .filter((s) => s.classId === activeClassId)
      .sort((a, b) => a.rollNo - b.rollNo);
  }, [students, activeClassId]);

  // Today's attendance records map for fast lookup: studentId -> AttendanceRecord
  const dailyRecordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((r) => {
      if (r.classId === activeClassId && r.date === selectedDate && r.session === selectedSession) {
        map.set(r.studentId, r);
      }
    });
    return map;
  }, [attendanceRecords, activeClassId, selectedDate, selectedSession]);

  // Handle setting status for a student
  const handleSetStatus = async (studentId: string, status: AttendanceStatus, reason = '') => {
    const existing = dailyRecordMap.get(studentId);
    if (existing) {
      await db.attendance.update(existing.id, {
        status,
        reason: reason || existing.reason || '',
      });
    } else {
      const newRec: AttendanceRecord = {
        id: `att-${Date.now()}-${studentId}`,
        classId: activeClassId,
        studentId,
        date: selectedDate,
        session: selectedSession,
        status,
        reason,
        createdAt: new Date().toISOString(),
      };
      await db.attendance.add(newRec);
    }
    onRefresh();
  };

  // Handle setting reason note for a student
  const handleSetReason = async (studentId: string, reason: string) => {
    const existing = dailyRecordMap.get(studentId);
    if (existing) {
      await db.attendance.update(existing.id, { reason });
      onRefresh();
    }
  };

  // Mark all students present with 1 click!
  const handleMarkAllPresent = async () => {
    const recordsToPut: AttendanceRecord[] = classStudents.map((s) => {
      const existing = dailyRecordMap.get(s.id);
      return {
        id: existing?.id || `att-${Date.now()}-${s.id}`,
        classId: activeClassId,
        studentId: s.id,
        date: selectedDate,
        session: selectedSession,
        status: 'present' as AttendanceStatus,
        reason: '',
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
    });

    await db.attendance.bulkPut(recordsToPut);
    setIsSavedFeedback(true);
    setTimeout(() => setIsSavedFeedback(false), 2000);
    onRefresh();
  };

  // Daily statistics
  const dailyStats = useMemo(() => {
    let present = 0;
    let permission = 0;
    let absent = 0;
    let late = 0;
    let notRecorded = 0;

    classStudents.forEach((s) => {
      const rec = dailyRecordMap.get(s.id);
      if (!rec) notRecorded++;
      else if (rec.status === 'present') present++;
      else if (rec.status === 'permission') permission++;
      else if (rec.status === 'absent') absent++;
      else if (rec.status === 'late') late++;
    });

    return { present, permission, absent, late, notRecorded, total: classStudents.length };
  }, [classStudents, dailyRecordMap]);

  // Days in selected month for monthly view
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Monthly Matrix data
  const monthlyData = useMemo(() => {
    const monthStr = String(selectedMonth + 1).padStart(2, '0');
    const prefix = `${selectedYear}-${monthStr}-`;

    // Map: studentId -> { [day]: status, unexcused, excused, late }
    const res = classStudents.map((stu) => {
      let unexcused = 0;
      let excused = 0;
      let late = 0;
      const dayStatusMap: Record<number, AttendanceStatus> = {};

      attendanceRecords.forEach((r) => {
        if (r.studentId === stu.id && r.date.startsWith(prefix)) {
          const day = parseInt(r.date.slice(8, 10), 10);
          dayStatusMap[day] = r.status;
          if (r.status === 'absent') unexcused++;
          if (r.status === 'permission') excused++;
          if (r.status === 'late') late++;
        }
      });

      return {
        student: stu,
        dayStatusMap,
        unexcused,
        excused,
        late,
        totalAbsence: unexcused + excused,
      };
    });

    return res;
  }, [classStudents, attendanceRecords, selectedMonth, selectedYear]);

  return (
    <div className="space-y-6">
      {/* Top Controller Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center">
            <CalendarCheck2 className="w-6 h-6 text-blue-600 mr-2" />
            វត្តមានសិស្ស ({currentClass?.name || 'សូមជ្រើសរើសថ្នាក់'})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            កត់ត្រាវត្តមានប្រចាំថ្ងៃ និងតាមដានរបាយការណ៍វត្តមានប្រចាំខែ
          </p>
        </div>

        {/* View Mode Toggle & Print */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Daily vs Monthly Switch */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ស្រង់ប្រចាំថ្ងៃ
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              តារាងប្រចាំខែ
            </button>
          </div>

          {/* Telegram Share Button */}
          <button
            onClick={() => setIsTelegramOpen(true)}
            className="inline-flex items-center px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            ផ្ញើ Telegram
          </button>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            បោះពុម្ព
          </button>
        </div>
      </div>

      {/* Mode A: Daily Attendance */}
      {viewMode === 'daily' && (
        <div className="space-y-4">
          {/* Date & Session Selection + Mark All Present Button */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 no-print">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Date Input */}
              <div className="flex items-center space-x-2">
                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">កាលបរិច្ឆេទ៖</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              {/* Session Switch */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
                <button
                  onClick={() => setSelectedSession('morning')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedSession === 'morning' ? 'bg-white font-bold text-blue-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  🌅 វេនព្រឹក
                </button>
                <button
                  onClick={() => setSelectedSession('afternoon')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedSession === 'afternoon' ? 'bg-white font-bold text-amber-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  🌇 វេនរសៀល
                </button>
              </div>

              {/* Formatted Date Khmer */}
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                ({formatKhmerDate(selectedDate, true)})
              </span>
            </div>

            {/* Quick Action: Mark All Present */}
            <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
              <button
                onClick={handleMarkAllPresent}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                កត់វត្តមានទាំងអស់ (មក)
              </button>
            </div>
          </div>

          {/* Daily Summary Statistics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center">
              <span className="text-[11px] text-slate-500 font-medium">សិស្សសរុប</span>
              <p className="text-lg font-extrabold text-slate-800">{toKhmerNum(dailyStats.total)}</p>
            </div>
            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 shadow-2xs text-center">
              <span className="text-[11px] text-emerald-700 font-bold">មក (Present)</span>
              <p className="text-lg font-extrabold text-emerald-700">{toKhmerNum(dailyStats.present)}</p>
            </div>
            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 shadow-2xs text-center">
              <span className="text-[11px] text-amber-700 font-bold">ច្បាប់ (Excused)</span>
              <p className="text-lg font-extrabold text-amber-700">{toKhmerNum(dailyStats.permission)}</p>
            </div>
            <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 shadow-2xs text-center">
              <span className="text-[11px] text-rose-700 font-bold">ឥតច្បាប់ (Absent)</span>
              <p className="text-lg font-extrabold text-rose-700">{toKhmerNum(dailyStats.absent)}</p>
            </div>
            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 shadow-2xs text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] text-blue-700 font-bold">យឺត (Late)</span>
              <p className="text-lg font-extrabold text-blue-700">{toKhmerNum(dailyStats.late)}</p>
            </div>
          </div>

          {/* Printable Header */}
          <div className="hidden print:block text-center my-4">
            <h3 className="font-moul text-base">ព្រះរាជាណាចក្រកម្ពុជា</h3>
            <h4 className="font-moul text-sm">ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
            <div className="w-24 h-0.5 bg-black mx-auto my-2" />
            <h2 className="font-moul text-base mt-3">
              បញ្ជីវត្តមានប្រចាំថ្ងៃ {currentClass?.name} - {formatKhmerDate(selectedDate, true)}
            </h2>
          </div>

          {/* Daily Attendance Student Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] sm:text-xs font-bold uppercase">
                    <th className="py-3 px-3 text-center w-12">ល.រ</th>
                    <th className="py-3 px-3 w-28">អត្តលេខ</th>
                    <th className="py-3 px-3">គោត្តនាម-នាម</th>
                    <th className="py-3 px-3 text-center w-16">ភេទ</th>
                    <th className="py-3 px-3 text-center w-72">ស្ថានភាពវត្តមាន</th>
                    <th className="py-3 px-3">មូលហេតុ / កំណត់ចំណាំ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        មិនមានសិស្សនៅក្នុងថ្នាក់នេះទេ
                      </td>
                    </tr>
                  ) : (
                    classStudents.map((stu, index) => {
                      const rec = dailyRecordMap.get(stu.id);
                      const currentStatus = rec?.status;

                      return (
                        <tr key={stu.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 text-center font-bold text-slate-500">
                            {toKhmerNum(index + 1)}
                          </td>
                          <td className="py-3 px-3 font-mono text-xs font-bold text-slate-600">
                            {stu.studentCode}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900">{stu.nameKh}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                stu.gender === 'ស្រី'
                                  ? 'bg-pink-100 text-pink-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {stu.gender}
                            </span>
                          </td>
                          {/* Attendance Status Buttons */}
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center space-x-1 sm:space-x-1.5">
                              {/* Present */}
                              <button
                                type="button"
                                onClick={() => handleSetStatus(stu.id, 'present')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  currentStatus === 'present'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'
                                }`}
                              >
                                មក
                              </button>

                              {/* Permission */}
                              <button
                                type="button"
                                onClick={() => handleSetStatus(stu.id, 'permission')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  currentStatus === 'permission'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700'
                                }`}
                              >
                                ច្បាប់
                              </button>

                              {/* Absent */}
                              <button
                                type="button"
                                onClick={() => handleSetStatus(stu.id, 'absent')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  currentStatus === 'absent'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700'
                                }`}
                              >
                                ឥតច្បាប់
                              </button>

                              {/* Late */}
                              <button
                                type="button"
                                onClick={() => handleSetStatus(stu.id, 'late')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  currentStatus === 'late'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700'
                                }`}
                              >
                                យឺត
                              </button>
                            </div>
                          </td>

                          {/* Reason input */}
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={rec?.reason || ''}
                              onChange={(e) => handleSetReason(stu.id, e.target.value)}
                              placeholder={
                                currentStatus === 'absent' || currentStatus === 'permission'
                                  ? 'មូលហេតុអវត្តមាន...'
                                  : 'កំណត់ចំណាំ...'
                              }
                              className="w-full px-2.5 py-1 text-xs bg-transparent border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-500 rounded-lg"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Mode B: Monthly Attendance Matrix */}
      {viewMode === 'monthly' && (
        <div className="space-y-4">
          {/* Month & Year Selectors */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center space-x-3">
              <label className="text-xs font-bold text-slate-700">ខែ៖</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                {KHMER_MONTHS.map((m, idx) => (
                  <option key={idx} value={idx}>
                    ខែ {m}
                  </option>
                ))}
              </select>

              <label className="text-xs font-bold text-slate-700">ឆ្នាំ៖</label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-24 px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              />
            </div>

            {/* Legend */}
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center text-emerald-700 font-bold">
                <span className="w-3 h-3 bg-emerald-500 rounded-xs mr-1 inline-block" /> មក (P)
              </span>
              <span className="flex items-center text-amber-700 font-bold">
                <span className="w-3 h-3 bg-amber-500 rounded-xs mr-1 inline-block" /> ច្បាប់ (ច)
              </span>
              <span className="flex items-center text-rose-700 font-bold">
                <span className="w-3 h-3 bg-rose-500 rounded-xs mr-1 inline-block" /> ឥតច្បាប់ (A)
              </span>
              <span className="flex items-center text-blue-700 font-bold">
                <span className="w-3 h-3 bg-blue-500 rounded-xs mr-1 inline-block" /> យឺត (L)
              </span>
            </div>
          </div>

          {/* Printable Header */}
          <div className="hidden print:block text-center my-4">
            <h3 className="font-moul text-base">ព្រះរាជាណាចក្រកម្ពុជា</h3>
            <h4 className="font-moul text-sm">ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
            <div className="w-24 h-0.5 bg-black mx-auto my-2" />
            <h2 className="font-moul text-base mt-3">
              តារាងស្រង់វត្តមានសិស្សប្រចាំខែ {KHMER_MONTHS[selectedMonth]} ឆ្នាំ {toKhmerNum(selectedYear)}
            </h2>
            <p className="text-xs mt-1">ថ្នាក់៖ {currentClass?.name} • សាលា៖ {settings?.schoolName}</p>
          </div>

          {/* Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-2 px-2 text-center w-8 border-r border-slate-200">ល.រ</th>
                    <th className="py-2 px-3 w-36 border-r border-slate-200 sticky left-0 bg-slate-100 z-10">
                      គោត្តនាម-នាម
                    </th>
                    <th className="py-2 px-1 text-center w-8 border-r border-slate-200">ភេទ</th>
                    {/* Days 1 to 31 */}
                    {daysArray.map((d) => (
                      <th
                        key={d}
                        className="py-2 px-1 text-center w-6 min-w-[26px] text-[10px] font-bold border-r border-slate-200"
                      >
                        {toKhmerNum(d)}
                      </th>
                    ))}
                    {/* Totals */}
                    <th className="py-2 px-1 text-center w-10 bg-amber-50 text-amber-900 border-r border-slate-200 font-bold">
                      ច្បាប់
                    </th>
                    <th className="py-2 px-1 text-center w-10 bg-rose-50 text-rose-900 border-r border-slate-200 font-bold">
                      ឥតច្បាប់
                    </th>
                    <th className="py-2 px-1 text-center w-12 bg-slate-200 text-slate-900 font-bold">
                      សរុប
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {monthlyData.map((row, idx) => {
                    const isExcessive = row.unexcused >= (settings?.absenceWarningThreshold || 3);
                    return (
                      <tr
                        key={row.student.id}
                        className={`hover:bg-slate-50 ${
                          isExcessive ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <td className="py-1.5 px-2 text-center font-bold text-slate-500 border-r border-slate-200">
                          {toKhmerNum(idx + 1)}
                        </td>
                        <td className="py-1.5 px-3 font-bold text-slate-900 border-r border-slate-200 sticky left-0 bg-white z-10 whitespace-nowrap">
                          {row.student.nameKh}
                          {isExcessive && (
                            <span className="ml-1 text-[9px] text-rose-600 bg-rose-100 px-1 py-0.2 rounded font-bold">
                              ព្រមាន
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-1 text-center border-r border-slate-200 text-[11px]">
                          {row.student.gender === 'ស្រី' ? (
                            <span className="text-pink-600 font-bold">ស</span>
                          ) : (
                            <span className="text-blue-600 font-bold">ប</span>
                          )}
                        </td>

                        {/* 1..31 Days */}
                        {daysArray.map((d) => {
                          const status = row.dayStatusMap[d];
                          return (
                            <td
                              key={d}
                              className="py-1.5 px-1 text-center border-r border-slate-200 text-[10px] font-bold"
                            >
                              {status === 'present' && <span className="text-emerald-600 font-extrabold">•</span>}
                              {status === 'permission' && <span className="text-amber-600 font-extrabold">ច</span>}
                              {status === 'absent' && <span className="text-rose-600 font-extrabold">A</span>}
                              {status === 'late' && <span className="text-blue-600 font-extrabold">យ</span>}
                              {!status && <span className="text-slate-200">-</span>}
                            </td>
                          );
                        })}

                        {/* Sum Excused */}
                        <td className="py-1.5 px-1 text-center border-r border-slate-200 font-bold text-amber-700 bg-amber-50/40">
                          {row.excused > 0 ? toKhmerNum(row.excused) : '-'}
                        </td>

                        {/* Sum Unexcused */}
                        <td className="py-1.5 px-1 text-center border-r border-slate-200 font-extrabold text-rose-700 bg-rose-50/40">
                          {row.unexcused > 0 ? toKhmerNum(row.unexcused) : '-'}
                        </td>

                        {/* Grand Total */}
                        <td className="py-1.5 px-1 text-center font-extrabold text-slate-800 bg-slate-100">
                          {row.totalAbsence > 0 ? toKhmerNum(row.totalAbsence) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Share Modal */}
      <TelegramShareModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
        currentClass={currentClass || null}
        students={students}
        attendanceRecords={attendanceRecords}
        settings={settings}
      />
    </div>
  );
};
