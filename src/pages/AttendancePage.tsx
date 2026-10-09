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
  BookOpen,
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

const MORNING_HOURS = [
  { id: 'm-all', label: 'ពេញវេនព្រឹក (០៧:០០ - ១១:០០)', short: 'ពេញវេនព្រឹក' },
  { id: 'm-1', label: 'ម៉ោង ៧:០០ - ៨:០០', short: '៧:០០ - ៨:០០' },
  { id: 'm-2', label: 'ម៉ោង ៨:០០ - ៩:០០', short: '៨:០០ - ៩:០០' },
  { id: 'm-3', label: 'ម៉ោង ៩:០០ - ១០:០០', short: '៩:០០ - ១០:០០' },
  { id: 'm-4', label: 'ម៉ោង ១០:០០ - ១១:០០', short: '១០:០០ - ១១:០០' },
  { id: 'm-math2', label: 'គណិតវិទ្យា (២ ម៉ោង)', short: 'គណិត (២ម៉ោង)' },
  { id: 'm-khmer2', label: 'ភាសាខ្មែរ (២ ម៉ោង)', short: 'ខ្មែរ (២ម៉ោង)' },
];

const AFTERNOON_HOURS = [
  { id: 'a-all', label: 'ពេញវេនរសៀល (០២:០០ - ០៥:០០)', short: 'ពេញវេនរសៀល' },
  { id: 'a-1', label: 'ម៉ោង ២:០០ - ៣:០០', short: '២:០០ - ៣:០០' },
  { id: 'a-2', label: 'ម៉ោង ៣:០០ - ៤:០០', short: '៣:០០ - ៤:០០' },
  { id: 'a-3', label: 'ម៉ោង ៤:០០ - ៥:០០', short: '៤:០០ - ៥:០០' },
  { id: 'a-math2', label: 'គណិតវិទ្យា (២ ម៉ោង)', short: 'គណិត (២ម៉ោង)' },
  { id: 'a-khmer2', label: 'ភាសាខ្មែរ (២ ម៉ោង)', short: 'ខ្មែរ (២ម៉ោង)' },
];

export const AttendancePage: React.FC<AttendancePageProps> = ({
  students,
  classes,
  attendanceRecords,
  settings,
  selectedClassId,
  onRefresh,
  onGenerateLetterForStudent,
}) => {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedSession, setSelectedSession] = useState<'morning' | 'afternoon'>('morning');
  const [selectedHourSlot, setSelectedHourSlot] = useState<string>('m-all');
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  // Active class from top navbar
  const activeClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
  const currentClass = classes.find((c) => c.id === activeClassId);

  // When session switches, reset hour slot default
  const handleSessionChange = (session: 'morning' | 'afternoon') => {
    setSelectedSession(session);
    setSelectedHourSlot(session === 'morning' ? 'm-all' : 'a-all');
  };

  const hourSlotOptions = selectedSession === 'morning' ? MORNING_HOURS : AFTERNOON_HOURS;

  // Students for the active class
  const classStudents = useMemo(() => {
    return students
      .filter((s) => s.classId === activeClassId)
      .sort((a, b) => a.rollNo - b.rollNo);
  }, [students, activeClassId]);

  // Today's attendance records map: studentId -> AttendanceRecord
  const dailyRecordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((r) => {
      if (r.classId === activeClassId && r.date === selectedDate && r.session === selectedSession) {
        map.set(r.studentId, r);
      }
    });
    return map;
  }, [attendanceRecords, activeClassId, selectedDate, selectedSession]);

  // Set status for student
  const handleSetStatus = async (studentId: string, status: AttendanceStatus, reason = '') => {
    const existing = dailyRecordMap.get(studentId);
    if (existing) {
      await db.attendance.update(existing.id, {
        status,
        reason: reason || existing.reason || '',
        timeSlot: selectedHourSlot,
      });
    } else {
      const newRec: AttendanceRecord = {
        id: `att-${Date.now()}-${studentId}`,
        classId: activeClassId,
        studentId,
        date: selectedDate,
        session: selectedSession,
        timeSlot: selectedHourSlot,
        status,
        reason,
        createdAt: new Date().toISOString(),
      };
      await db.attendance.add(newRec);
    }
    onRefresh();
  };

  // Set reason for student
  const handleSetReason = async (studentId: string, reason: string) => {
    const existing = dailyRecordMap.get(studentId);
    if (existing) {
      await db.attendance.update(existing.id, { reason });
      onRefresh();
    }
  };

  // Mark all students present with 1 click
  const handleMarkAllPresent = async () => {
    const recordsToPut: AttendanceRecord[] = classStudents.map((s) => {
      const existing = dailyRecordMap.get(s.id);
      return {
        id: existing?.id || `att-${Date.now()}-${s.id}`,
        classId: activeClassId,
        studentId: s.id,
        date: selectedDate,
        session: selectedSession,
        timeSlot: selectedHourSlot,
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

  return (
    <div className="space-y-4">
      {/* Top Banner (Page Title & Class Badge - Clean, No Duplicates) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-black text-slate-800 flex items-center">
              <CalendarCheck2 className="w-6 h-6 text-blue-600 mr-2" />
              វត្តមានសិស្សប្រចាំថ្ងៃ ({currentClass?.name || 'ថ្នាក់រៀន'})
            </h2>
            <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-200">
              📚 {currentClass?.name || 'ថ្នាក់រៀន'}
            </span>
            {isSavedFeedback && (
              <span className="inline-flex items-center text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 animate-pulse">
                ✨ បានកត់វត្តមានគ្រប់គ្នា!
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            កត់ត្រាវត្តមានសិស្សតាមវេនព្រឹក-រសៀល និងតាមម៉ោងសិក្សា (គណិតវិទ្យា & ភាសាខ្មែរ ២ ម៉ោង)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Telegram Share Button */}
          <button
            onClick={() => setIsTelegramOpen(true)}
            className="inline-flex items-center px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            ផ្ញើ Telegram
          </button>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            បោះពុម្ព
          </button>
        </div>
      </div>

      {/* Controller Bar - EXACT REPLICA OF IMAGE 5 */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center space-x-2">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">កាលបរិច្ឆេទ៖</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 font-bold text-xs sm:text-sm rounded-xl text-slate-800 cursor-pointer shadow-2xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Shift Toggle Buttons: 🌅 វេនព្រឹក | 🌇 វេនរសៀល */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => handleSessionChange('morning')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                selectedSession === 'morning'
                  ? 'bg-white text-blue-700 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🌅 វេនព្រឹក</span>
            </button>
            <button
              onClick={() => handleSessionChange('afternoon')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                selectedSession === 'afternoon'
                  ? 'bg-white text-amber-700 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🌇 វេនរសៀល</span>
            </button>
          </div>

          {/* Formatted Date Khmer in Parentheses */}
          <span className="text-xs text-slate-500 font-medium">
            ({formatKhmerDate(selectedDate, true)})
          </span>
        </div>

        {/* Quick Action: Mark All Present */}
        <button
          onClick={handleMarkAllPresent}
          className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          កត់វត្តមានទាំងអស់ (មក)
        </button>
      </div>

      {/* Hourly / Subject Selector according to user instructions */}
      <div className="bg-slate-100/80 p-2 sm:p-2.5 rounded-2xl border border-slate-200 flex items-center space-x-1.5 overflow-x-auto no-print">
        <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap pl-2">
          {selectedSession === 'morning' ? 'ម៉ោងពេលព្រឹក៖' : 'ម៉ោងពេលរសៀល៖'}
        </span>
        {hourSlotOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSelectedHourSlot(opt.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedHourSlot === opt.id
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Daily Summary Statistics Bar - EXACT REPLICA OF IMAGE 4 (Single Line, 5 Columns) */}
      <div className="grid grid-cols-5 gap-3 no-print">
        {/* Card 1: សិស្សសរុប */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center shadow-2xs">
          <p className="text-xs font-bold text-slate-500 truncate whitespace-nowrap">សិស្សសរុប</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{toKhmerNum(dailyStats.total)}</p>
        </div>

        {/* Card 2: មក (Present) */}
        <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 text-center shadow-2xs">
          <p className="text-xs font-bold text-emerald-700 truncate whitespace-nowrap">មក (Present)</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{toKhmerNum(dailyStats.present)}</p>
        </div>

        {/* Card 3: ច្បាប់ (Excused) */}
        <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200 text-center shadow-2xs">
          <p className="text-xs font-bold text-amber-700 truncate whitespace-nowrap">ច្បាប់ (Excused)</p>
          <p className="text-2xl font-black text-amber-700 mt-1">{toKhmerNum(dailyStats.permission)}</p>
        </div>

        {/* Card 4: ឥតច្បាប់ (Absent) */}
        <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-200 text-center shadow-2xs">
          <p className="text-xs font-bold text-rose-700 truncate whitespace-nowrap">ឥតច្បាប់ (Absent)</p>
          <p className="text-2xl font-black text-rose-700 mt-1">{toKhmerNum(dailyStats.absent)}</p>
        </div>

        {/* Card 5: យឺត (Late) */}
        <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-200 text-center shadow-2xs">
          <p className="text-xs font-bold text-blue-700 truncate whitespace-nowrap">យឺត (Late)</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{toKhmerNum(dailyStats.late)}</p>
        </div>
      </div>

      {/* Printable Official Header */}
      <div className="hidden print:block text-center my-4">
        <h3 className="font-moul text-base">ព្រះរាជាណាចក្រកម្ពុជា</h3>
        <h4 className="font-moul text-sm">ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
        <div className="w-24 h-0.5 bg-black mx-auto my-2" />
        <h2 className="font-moul text-base mt-3">
          បញ្ជីវត្តមានប្រចាំថ្ងៃ {currentClass?.name} - {formatKhmerDate(selectedDate, true)}
        </h2>
        <p className="text-xs mt-1">
          {selectedSession === 'morning' ? 'វេនព្រឹក (០៧:០០ - ១១:០០)' : 'វេនរសៀល (០២:០០ - ០៥:០០)'}
        </p>
      </div>

      {/* Attendance Student Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-12">ល.រ</th>
                <th className="py-3 px-3 w-28">អត្តលេខ</th>
                <th className="py-3 px-3">គោត្តនាម-នាម</th>
                <th className="py-3 px-3 text-center w-16">ភេទ</th>
                <th className="py-3 px-3 text-center min-w-[280px]">ស្ថានភាពវត្តមាន</th>
                <th className="py-3 px-3 min-w-[180px]">មូលហេតុ / កំណត់សម្គាល់</th>
                <th className="py-3 px-3 text-center w-28 no-print">លិខិតព្រមាន</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    មិនមានទិន្នន័យសិស្សក្នុងថ្នាក់នេះទេ
                  </td>
                </tr>
              ) : (
                classStudents.map((stu, index) => {
                  const record = dailyRecordMap.get(stu.id);
                  const currentStatus = record?.status || null;
                  const reason = record?.reason || '';

                  return (
                    <tr
                      key={stu.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* ល.រ */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                        {toKhmerNum(index + 1)}
                      </td>

                      {/* អត្តលេខ */}
                      <td className="py-2.5 px-3 font-mono text-xs font-bold text-slate-600">
                        {stu.studentCode}
                      </td>

                      {/* ឈ្មោះខ្មែរ */}
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 group-hover:text-blue-700">
                          {stu.nameKh}
                        </span>
                      </td>

                      {/* ភេទ */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            stu.gender === 'ស្រី'
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {stu.gender}
                        </span>
                      </td>

                      {/* វត្តមាន Status Selector */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl space-x-1">
                          {/* មក (Present) */}
                          <button
                            onClick={() => handleSetStatus(stu.id, 'present')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            មក
                          </button>

                          {/* ច្បាប់ (Permission) */}
                          <button
                            onClick={() => handleSetStatus(stu.id, 'permission')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === 'permission'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            ច្បាប់
                          </button>

                          {/* ឥតច្បាប់ (Absent) */}
                          <button
                            onClick={() => handleSetStatus(stu.id, 'absent')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            ឥតច្បាប់
                          </button>

                          {/* យឺត (Late) */}
                          <button
                            onClick={() => handleSetStatus(stu.id, 'late')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === 'late'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            យឺត
                          </button>
                        </div>
                      </td>

                      {/* មូលហេតុ */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={reason}
                          placeholder={currentStatus === 'absent' || currentStatus === 'permission' ? 'មូលហេតុ...' : ''}
                          onChange={(e) => handleSetReason(stu.id, e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* លិខិតព្រមាន Quick Action */}
                      <td className="py-2.5 px-3 text-center no-print">
                        {onGenerateLetterForStudent && (
                          <button
                            onClick={() => onGenerateLetterForStudent(stu.id)}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                          >
                            លិខិតព្រមាន
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Telegram Share Modal */}
      <TelegramShareModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
        currentClass={currentClass || null}
        students={classStudents}
        attendanceRecords={attendanceRecords}
        settings={settings}
      />
    </div>
  );
};
