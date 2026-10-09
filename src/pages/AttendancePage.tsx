import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarCheck2,
  Calendar,
  CalendarDays,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Save,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  Search,
  Filter,
  Send,
  BookOpen,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, AttendanceStatus, TeacherSettings } from '../types';
import { db } from '../db/db';
import { toKhmerNum, formatKhmerDate, getTodayDateString, checkIfHolidayDate } from '../utils/dateUtils';
import { TelegramShareModal } from '../components/TelegramShareModal';
import { soundEffects } from '../utils/soundEffects';
import { PrintButton } from '../components/common/PrintButton';

// Preset time options for morning and afternoon shifts
const MORNING_IN_OPTIONS = [
  { value: '07:00', label: 'ម៉ោង 7:00 (ទូទៅ)' },
  { value: '07:15', label: 'ម៉ោង 7:15' },
  { value: '07:30', label: 'ម៉ោង 7:30' },
  { value: '08:00', label: 'ម៉ោង 8:00' },
];

const MORNING_OUT_OPTIONS = [
  { value: '11:00', label: 'ម៉ោង 11:00 (ទូទៅ)' },
  { value: '10:30', label: 'ម៉ោង 10:30' },
  { value: '11:15', label: 'ម៉ោង 11:15' },
  { value: '11:30', label: 'ម៉ោង 11:30' },
];

const AFTERNOON_IN_OPTIONS = [
  { value: '14:00', label: 'ម៉ោង 2:00 (14:00)' },
  { value: '13:00', label: 'ម៉ោង 1:00 (13:00)' },
  { value: '13:30', label: 'ម៉ោង 1:30 (13:30)' },
  { value: '14:30', label: 'ម៉ោង 2:30 (14:30)' },
];

const AFTERNOON_OUT_OPTIONS = [
  { value: '17:00', label: 'ម៉ោង 5:00 (17:00)' },
  { value: '16:30', label: 'ម៉ោង 4:30 (16:30)' },
  { value: '17:15', label: 'ម៉ោង 5:15 (17:15)' },
  { value: '17:30', label: 'ម៉ោង 5:30 (17:30)' },
];

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
  onRefresh,
  onGenerateLetterForStudent,
}) => {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedSession, setSelectedSession] = useState<'morning' | 'afternoon'>('morning');
  const [selectedSlot, setSelectedSlot] = useState<'check_in' | 'check_out'>('check_in');
  const [checkInTime, setCheckInTime] = useState<string>('07:00');
  const [checkOutTime, setCheckOutTime] = useState<string>('11:00');
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'permission' | 'absent' | 'late' | 'notRecorded'>('all');
  const [soundOn, setSoundOn] = useState(true);

  // Holiday detection & override
  const holidayInfo = useMemo(() => checkIfHolidayDate(selectedDate), [selectedDate]);
  const [isHolidayMode, setIsHolidayMode] = useState<boolean>(false);
  const [holidayNote, setHolidayNote] = useState<string>('');

  // Auto-detect and prefill holiday
  useEffect(() => {
    const info = checkIfHolidayDate(selectedDate);
    if (info.isHoliday) {
      setIsHolidayMode(true);
      setHolidayNote(info.holidayName ? `ឈប់សម្រាក៖ ${info.holidayName}` : 'ថ្ងៃឈប់សម្រាកប្រចាំសប្ដាហ៍ (ថ្ងៃអាទិត្យ)');
    } else {
      setIsHolidayMode(false);
      setHolidayNote('');
    }
  }, [selectedDate]);

  // Active class from top navbar
  const activeClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
  const currentClass = classes.find((c) => c.id === activeClassId);

  // When session switches, update default check-in/out times
  const handleSessionChange = (session: 'morning' | 'afternoon') => {
    setSelectedSession(session);
    if (session === 'morning') {
      setCheckInTime('07:00');
      setCheckOutTime('11:00');
    } else {
      setCheckInTime('14:00');
      setCheckOutTime('17:00');
    }
  };

  // Available selectable preset time options based on active shift & slot
  const currentPresetOptions = useMemo(() => {
    if (selectedSession === 'morning') {
      return selectedSlot === 'check_in' ? MORNING_IN_OPTIONS : MORNING_OUT_OPTIONS;
    } else {
      return selectedSlot === 'check_in' ? AFTERNOON_IN_OPTIONS : AFTERNOON_OUT_OPTIONS;
    }
  }, [selectedSession, selectedSlot]);

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
      if (
        r.classId === activeClassId &&
        r.date === selectedDate &&
        r.session === selectedSession &&
        (!r.timeSlot || r.timeSlot.includes(selectedSlot))
      ) {
        map.set(r.studentId, r);
      }
    });
    return map;
  }, [attendanceRecords, activeClassId, selectedDate, selectedSession, selectedSlot]);

  // Filtered students for display based on quick status chip
  const displayedStudents = useMemo(() => {
    return classStudents.filter((s) => {
      if (statusFilter === 'all') return true;
      const rec = dailyRecordMap.get(s.id);
      if (statusFilter === 'notRecorded') return !rec;
      return rec?.status === statusFilter;
    });
  }, [classStudents, statusFilter, dailyRecordMap]);

  // Set status for student
  const handleSetStatus = async (studentId: string, status: AttendanceStatus, reason = '') => {
    if (soundOn) soundEffects.playClick();
    const existing = dailyRecordMap.get(studentId);
    const currentTimeStr = selectedSlot === 'check_in' ? checkInTime : checkOutTime;
    const timeSlotStr = `${selectedSlot}-${currentTimeStr}`;
    if (existing) {
      await db.attendance.update(existing.id, {
        status,
        reason: reason || existing.reason || '',
        timeSlot: timeSlotStr,
      });
    } else {
      const newRec: AttendanceRecord = {
        id: `att-${Date.now()}-${studentId}`,
        classId: activeClassId,
        studentId,
        date: selectedDate,
        session: selectedSession,
        timeSlot: timeSlotStr,
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
    if (soundOn) soundEffects.playSuccess();
    const currentTimeStr = selectedSlot === 'check_in' ? checkInTime : checkOutTime;
    const timeSlotStr = `${selectedSlot}-${currentTimeStr}`;
    const recordsToPut: AttendanceRecord[] = classStudents.map((s) => {
      const existing = dailyRecordMap.get(s.id);
      return {
        id: existing?.id || `att-${Date.now()}-${s.id}`,
        classId: activeClassId,
        studentId: s.id,
        date: selectedDate,
        session: selectedSession,
        timeSlot: timeSlotStr,
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
    <div className="space-y-6">
      {/* 2-Row Unified Controller Bar (Organized into exactly TWO rows as requested) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5 no-print">
        {/* ROW 1: Page Title, Class Badge & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Left: Title + Class Badge + Live Feedback */}
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center">
              <CalendarCheck2 className="w-6 h-6 text-blue-600 mr-2 shrink-0" />
              វត្តមានសិស្សប្រចាំថ្ងៃ ({currentClass?.name || 'ថ្នាក់រៀន'})
            </h2>
            <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs sm:text-sm font-bold rounded-xl border border-blue-200">
              📚 {currentClass?.name || 'ថ្នាក់រៀន'}
            </span>
            {isSavedFeedback && (
              <span className="inline-flex items-center text-xs sm:text-sm text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-300 animate-pulse">
                ✨ បានកត់វត្តមានគ្រប់គ្នា!
              </span>
            )}
          </div>

          {/* Right: Primary Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleMarkAllPresent}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
              title="កត់វត្តមាន (មក) ដល់សិស្សទាំងអស់ក្នុងពេលតែមួយ"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              កត់វត្តមានទាំងអស់ (មក)
            </button>
            <button
              onClick={() => setIsTelegramOpen(true)}
              className="inline-flex items-center px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4 mr-1.5" />
              ផ្ញើ Telegram
            </button>
            <PrintButton defaultOrientation="portrait" label="បោះពុម្ព" />
          </div>
        </div>

        {/* ROW 2: Date, Shift, In/Out Selectable Options, Holiday Mode */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Left: Date + Shift Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 whitespace-nowrap">កាលបរិច្ឆេទ៖</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 font-bold text-xs sm:text-sm rounded-xl text-slate-800 cursor-pointer shadow-2xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Shift: 🌅 វេនព្រឹក | 🌇 វេនរសៀល */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs sm:text-sm font-bold">
              <button
                type="button"
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
                type="button"
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

            <span className="text-xs sm:text-sm text-slate-500 font-medium hidden md:inline">
              ({formatKhmerDate(selectedDate, true)})
            </span>
          </div>

          {/* Right: In/Out Selector with Quick Options + Holiday Checkbox */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Slot Switcher: ម៉ោងចូល / ម៉ោងចេញ */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs sm:text-sm font-bold">
              <button
                type="button"
                onClick={() => setSelectedSlot('check_in')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                  selectedSlot === 'check_in'
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🚪 ម៉ោងចូល</span>
                <span className="text-xs opacity-90 font-mono">({checkInTime})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSlot('check_out')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                  selectedSlot === 'check_out'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🏁 ម៉ោងចេញ</span>
                <span className="text-xs opacity-90 font-mono">({checkOutTime})</span>
              </button>
            </div>

            {/* Quick Selectable Time Presets (e.g. ម៉ោង 7:00, 7:15...) */}
            <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <Clock className="w-4 h-4 text-slate-500 ml-1.5 mr-0.5" />
              <span className="text-xs sm:text-sm font-bold text-slate-600 whitespace-nowrap mr-1">
                {selectedSlot === 'check_in' ? 'ម៉ោងចូល៖' : 'ម៉ោងចេញ៖'}
              </span>
              <select
                value={selectedSlot === 'check_in' ? checkInTime : checkOutTime}
                onChange={(e) => {
                  if (selectedSlot === 'check_in') setCheckInTime(e.target.value);
                  else setCheckOutTime(e.target.value);
                }}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs sm:text-sm font-bold text-slate-800 cursor-pointer shadow-2xs focus:ring-2 focus:ring-blue-500"
              >
                {currentPresetOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Quick Pills for instant 1-click select */}
              <div className="hidden sm:flex items-center space-x-1 ml-1">
                {currentPresetOptions.slice(0, 2).map((opt) => {
                  const active = (selectedSlot === 'check_in' ? checkInTime : checkOutTime) === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        if (selectedSlot === 'check_in') setCheckInTime(opt.value);
                        else setCheckOutTime(opt.value);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-blue-600 text-white shadow-2xs font-black'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {opt.label.replace(' (14:00)', '').replace(' (17:00)', '')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Holiday Toggle */}
            <div className="flex items-center">
              <label className="inline-flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100/80 px-2.5 py-1.5 rounded-xl border border-rose-200 cursor-pointer transition-colors shadow-2xs">
                <input
                  type="checkbox"
                  checked={isHolidayMode}
                  onChange={(e) => setIsHolidayMode(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-rose-300 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-black text-rose-700 whitespace-nowrap">
                  🏖️ ថ្ងៃឈប់សម្រាក
                </span>
              </label>
              {isHolidayMode && (
                <input
                  type="text"
                  value={holidayNote}
                  onChange={(e) => setHolidayNote(e.target.value)}
                  placeholder="វាយកំណត់ត្រាថ្ងៃឈប់..."
                  className="ml-2 px-2.5 py-1 text-xs sm:text-sm font-bold bg-white text-rose-900 border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500 w-48 shadow-2xs"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Summary Statistics Bar - Clear, bold, readable */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 no-print">
        {/* Card 1: សិស្សសរុប */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-2xs">
          <p className="text-xs sm:text-sm font-bold text-slate-500 truncate whitespace-nowrap">សិស្សសរុប</p>
          <p className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{toKhmerNum(dailyStats.total)}</p>
        </div>

        {/* Card 2: មក (Present) */}
        <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 text-center shadow-2xs">
          <p className="text-xs sm:text-sm font-bold text-emerald-700 truncate whitespace-nowrap">មក (Present)</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{toKhmerNum(dailyStats.present)}</p>
        </div>

        {/* Card 3: ច្បាប់ (Excused) */}
        <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 text-center shadow-2xs">
          <p className="text-xs sm:text-sm font-bold text-amber-700 truncate whitespace-nowrap">ច្បាប់ (Excused)</p>
          <p className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">{toKhmerNum(dailyStats.permission)}</p>
        </div>

        {/* Card 4: ឥតច្បាប់ (Absent) */}
        <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 text-center shadow-2xs">
          <p className="text-xs sm:text-sm font-bold text-rose-700 truncate whitespace-nowrap">ឥតច្បាប់ (Absent)</p>
          <p className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">{toKhmerNum(dailyStats.absent)}</p>
        </div>

        {/* Card 5: យឺត (Late) */}
        <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 text-center shadow-2xs col-span-2 sm:col-span-1">
          <p className="text-xs sm:text-sm font-bold text-blue-700 truncate whitespace-nowrap">យឺត (Late)</p>
          <p className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">{toKhmerNum(dailyStats.late)}</p>
        </div>
      </div>

      {/* Quick Filter Status Chips & Sound Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 no-print">
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-bold">
          <span className="text-slate-600 text-xs sm:text-sm font-bold px-1">តម្រងរហ័ស៖</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-slate-800 shadow-2xs font-black'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            ទាំងអស់ ({toKhmerNum(dailyStats.total)})
          </button>
          <button
            onClick={() => setStatusFilter('present')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              statusFilter === 'present'
                ? 'bg-emerald-600 text-white shadow-2xs font-black'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            🟢 មក ({toKhmerNum(dailyStats.present)})
          </button>
          <button
            onClick={() => setStatusFilter('permission')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              statusFilter === 'permission'
                ? 'bg-amber-500 text-white shadow-2xs font-black'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            🟡 ច្បាប់ ({toKhmerNum(dailyStats.permission)})
          </button>
          <button
            onClick={() => setStatusFilter('absent')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              statusFilter === 'absent'
                ? 'bg-rose-600 text-white shadow-2xs font-black'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            🔴 ឥតច្បាប់ ({toKhmerNum(dailyStats.absent)})
          </button>
          <button
            onClick={() => setStatusFilter('late')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              statusFilter === 'late'
                ? 'bg-blue-600 text-white shadow-2xs font-black'
                : 'text-blue-700 hover:bg-blue-50'
            }`}
          >
            🔵 យឺត ({toKhmerNum(dailyStats.late)})
          </button>
          {dailyStats.notRecorded > 0 && (
            <button
              onClick={() => setStatusFilter('notRecorded')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === 'notRecorded'
                  ? 'bg-slate-700 text-white shadow-2xs font-black'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              ⚪ មិនទាន់កត់ ({toKhmerNum(dailyStats.notRecorded)})
            </button>
          )}
        </div>

        {/* Audio Chime Toggle */}
        <button
          onClick={() => setSoundOn(!soundOn)}
          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          title={soundOn ? 'បិទសំឡេង' : 'បើកសំឡេង'}
        >
          {soundOn ? (
            <>
              <Volume2 className="w-4 h-4 text-emerald-600" />
              <span>សំឡេង៖ បើក</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">សំឡេង៖ បិទ</span>
            </>
          )}
        </button>
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
          {selectedSession === 'morning' ? `វេនព្រឹក (${checkInTime} - ${checkOutTime})` : `វេនរសៀល (${checkInTime} - ${checkOutTime})`}
        </p>
        {isHolidayMode && (
          <div className="mt-2 p-2 border border-rose-300 bg-rose-50 rounded-xl text-rose-800 text-xs font-bold inline-block">
            🎉 ថ្ងៃឈប់សម្រាកផ្លូវការ៖ {holidayNote || holidayInfo.holidayName || 'ឈប់សម្រាក'}
          </div>
        )}
      </div>

      {/* Attendance Student Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs sm:text-sm font-black uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-12">ល.រ</th>
                <th className="py-3 px-3 w-28">អត្តលេខ</th>
                <th className="py-3 px-3">គោត្តនាម-នាម</th>
                <th className="py-3 px-3 text-center w-16">ភេទ</th>
                <th className="py-3 px-3 text-center min-w-[280px]">ស្ថានភាពវត្តមាន</th>
                <th className="py-3 px-3 min-w-[180px]">មូលហេតុ / កំណត់សម្គាល់</th>
                <th className="py-3 px-3 text-center w-28 no-print">លិខិតព្រមាន</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs sm:text-sm">
              {isHolidayMode ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-14 px-6 text-center bg-rose-50/50 border-2 border-dashed border-rose-300 rounded-2xl"
                  >
                    <div className="max-w-xl mx-auto space-y-3">
                      <div className="inline-flex p-3.5 bg-rose-100 text-rose-700 rounded-2xl shadow-xs">
                        <CalendarDays className="w-9 h-9" />
                      </div>
                      <h3 className="text-xl font-black text-rose-800">
                        🎉 {holidayInfo.holidayName || 'ថ្ងៃឈប់សម្រាកផ្លូវការ'}
                      </h3>
                      <div className="p-3.5 bg-white border border-rose-200 rounded-xl shadow-2xs text-left">
                        <p className="text-xs text-rose-500 font-bold uppercase tracking-wider mb-1">
                          📝 កំណត់ត្រាផ្លូវការ៖
                        </p>
                        <p className="text-base font-black text-rose-700">
                          {holidayNote || 'សាលារៀនឈប់សម្រាកផ្លូវការ មិនមានការបង្រៀន និងមិនមានកត់វត្តមានឡើយ'}
                        </p>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        កាលបរិច្ឆេទ៖ {formatKhmerDate(selectedDate, true)} | {selectedSession === 'morning' ? 'វេនព្រឹក' : 'វេនរសៀល'}
                      </p>
                      <p className="text-xs text-slate-400 no-print">
                        💡 ចំណាំ៖ ប្រសិនបើលោកគ្រូចង់កត់វត្តមានសិស្សសម្រាប់ម៉ោងបង្រៀនសង សូមដោះធីក «🏖️ ថ្ងៃឈប់សម្រាក» ខាងលើ។
                      </p>
                    </div>
                  </td>
                </tr>
              ) : displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    មិនមានទិន្នន័យសិស្សត្រូវតាមលក្ខខណ្ឌនេះទេ
                  </td>
                </tr>
              ) : (
                displayedStudents.map((stu, index) => {
                  const record = dailyRecordMap.get(stu.id);
                  const currentStatus = record?.status || null;
                  const reason = record?.reason || '';

                  return (
                    <tr
                      key={stu.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* ល.រ */}
                      <td className="py-3 px-3 text-center font-bold text-slate-600 text-xs sm:text-sm">
                        {toKhmerNum(index + 1)}
                      </td>

                      {/* អត្តលេខ */}
                      <td className="py-3 px-3 font-mono text-xs sm:text-sm font-bold text-slate-700">
                        {stu.studentCode}
                      </td>

                      {/* ឈ្មោះខ្មែរ */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-blue-700">
                          {stu.nameKh}
                        </span>
                      </td>

                      {/* ភេទ */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-xs sm:text-sm font-bold ${
                            stu.gender === 'ស្រី'
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {stu.gender}
                        </span>
                      </td>

                      {/* វត្តមាន Status Selector */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl space-x-1.5">
                          {/* មក (Present) */}
                          <button
                            onClick={() => handleSetStatus(stu.id, 'present')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
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
                            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
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
                            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
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
                            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
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
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={reason}
                          placeholder={currentStatus === 'absent' || currentStatus === 'permission' ? 'មូលហេតុ...' : ''}
                          onChange={(e) => handleSetReason(stu.id, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* លិខិតព្រមាន Quick Action */}
                      <td className="py-3 px-3 text-center no-print">
                        {onGenerateLetterForStudent && (
                          <button
                            onClick={() => onGenerateLetterForStudent(stu.id)}
                            className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
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
