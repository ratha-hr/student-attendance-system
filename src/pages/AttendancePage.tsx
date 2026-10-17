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
  Share2,
  BookOpen,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Student, ClassRoom, AttendanceRecord, AttendanceStatus, TeacherSettings, TimetableSlot } from '../types';
import { db } from '../db/db';
import {
  toKhmerNum,
  fromKhmerNum,
  formatKhmerDate,
  getTodayDateString,
  checkIfHolidayDate,
  isDateDeclaredHoliday,
  setCustomHoliday,
} from '../utils/dateUtils';
import {
  getClassTimetableForDate,
  buildTimetablePeriodOptions,
  getTimetableHoursOptions,
  getDayOfWeekFromDate,
  KHMER_DAY_NAMES,
  type TimetablePeriodOption,
} from '../utils/timetableAttendance';
import { TelegramShareModal } from '../components/TelegramShareModal';
import { StudentAttendanceShareModal } from '../components/StudentAttendanceShareModal';
import { soundEffects } from '../utils/soundEffects';
import { PrintButton } from '../components/common/PrintButton';
import { useUndoRedo } from '../context/UndoRedoContext';

interface AttendancePageProps {
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords: AttendanceRecord[];
  timetableSlots?: TimetableSlot[];
  settings: TeacherSettings | null;
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  onRefresh: () => void;
  onGenerateLetterForStudent?: (studentId: string) => void;
  onOpenManageClasses?: () => void;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({
  students,
  classes,
  attendanceRecords,
  timetableSlots,
  settings,
  selectedClassId,
  onRefresh,
  onGenerateLetterForStudent,
  onOpenManageClasses,
}) => {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedSession, setSelectedSession] = useState<'morning' | 'afternoon'>('morning');
  const [checkInTime, setCheckInTime] = useState<string>('7:00');
  const [checkOutTime, setCheckOutTime] = useState<string>('11:00');
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);
  const [isStudentShareOpen, setIsStudentShareOpen] = useState(false);
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'permission' | 'absent' | 'late' | 'notRecorded'>('all');
  const [soundOn, setSoundOn] = useState(true);

  // Holiday detection & override (supports national holidays, Sundays & user-declared holidays)
  const holidayInfo = useMemo(() => isDateDeclaredHoliday(selectedDate), [selectedDate]);
  const [isHolidayMode, setIsHolidayMode] = useState<boolean>(false);
  const [holidayNote, setHolidayNote] = useState<string>('');

  // Auto-detect and prefill holiday with persistence
  useEffect(() => {
    const info = isDateDeclaredHoliday(selectedDate);
    if (info.isHoliday) {
      setIsHolidayMode(true);
      setHolidayNote(info.holidayName || (info.isSun ? 'ថ្ងៃអាទិត្យ (ថ្ងៃឈប់សម្រាកប្រចាំសប្ដាហ៍)' : 'សាលារៀនឈប់សម្រាកផ្លូវការ'));
    } else {
      setIsHolidayMode(false);
      setHolidayNote('');
    }
  }, [selectedDate]);

  const handleToggleHoliday = (checked: boolean) => {
    setIsHolidayMode(checked);
    const note = (holidayNote || '').trim() || holidayInfo.holidayName || 'សាលារៀនឈប់សម្រាកផ្លូវការ';
    if (checked) {
      setHolidayNote(note);
    }
    setCustomHoliday(selectedDate, checked, note);
    onRefresh();
  };

  const handleHolidayNoteChange = (text: string) => {
    setHolidayNote(text);
    if (isHolidayMode) {
      setCustomHoliday(selectedDate, true, text);
      onRefresh();
    }
  };

  const { pushSnapshot } = useUndoRedo();

  // Active class from top navbar (Support 'ALL' for viewing all students across all classes)
  const isAllClasses = selectedClassId === 'ALL';
  const activeClassId = isAllClasses ? (classes[0]?.id || '') : selectedClassId;
  const currentClass = isAllClasses ? null : classes.find((c) => c.id === selectedClassId);

  // Live timetable slots from IndexedDB as reliable fallback
  const liveTimetableSlots = useLiveQuery(() => db.timetable.toArray(), []) || [];
  const allTimetableSlots = timetableSlots && timetableSlots.length > 0 ? timetableSlots : liveTimetableSlots;

  const dayOfWeek = useMemo(() => getDayOfWeekFromDate(selectedDate), [selectedDate]);
  const khmerDayName = KHMER_DAY_NAMES[dayOfWeek] || '';

  // Get class timetable for today and session
  const todayClassTimetable = useMemo(() => {
    return getClassTimetableForDate(allTimetableSlots, activeClassId, selectedDate, selectedSession, classes);
  }, [allTimetableSlots, activeClassId, selectedDate, selectedSession, classes]);

  const periodOptions = useMemo(() => {
    return buildTimetablePeriodOptions(todayClassTimetable, selectedSession);
  }, [todayClassTimetable, selectedSession]);

  const currentHoursOptions = useMemo(() => {
    return getTimetableHoursOptions(todayClassTimetable, selectedSession);
  }, [todayClassTimetable, selectedSession]);

  // Selected period preset (if matching checkIn and checkOut)
  const activePeriodOption = useMemo(() => {
    return periodOptions.find(
      (opt) => opt.checkIn === checkInTime && opt.checkOut === checkOutTime
    );
  }, [periodOptions, checkInTime, checkOutTime]);

  // When class, date, or session switches, auto-sync check-in/out times from class timetable
  useEffect(() => {
    if (periodOptions.length > 0) {
      const defaultOption = periodOptions[0]; // Full session or first slot
      setCheckInTime(defaultOption.checkIn);
      setCheckOutTime(defaultOption.checkOut);
    }
  }, [activeClassId, selectedDate, selectedSession]);

  // When session switches, update default check-in/out times from timetable
  const handleSessionChange = (session: 'morning' | 'afternoon') => {
    setSelectedSession(session);
    const slots = getClassTimetableForDate(allTimetableSlots, activeClassId, selectedDate, session, classes);
    const opts = buildTimetablePeriodOptions(slots, session);
    if (opts.length > 0) {
      setCheckInTime(opts[0].checkIn);
      setCheckOutTime(opts[0].checkOut);
    } else {
      if (session === 'morning') {
        setCheckInTime('7:00');
        setCheckOutTime('11:00');
      } else {
        setCheckInTime('13:00');
        setCheckOutTime('17:00');
      }
    }
  };

  const handleSelectPeriod = (opt: TimetablePeriodOption) => {
    setCheckInTime(opt.checkIn);
    setCheckOutTime(opt.checkOut);
  };

  // Students for the active class or ALL classes
  const classStudents = useMemo(() => {
    return students
      .filter((s) => isAllClasses || s.classId === selectedClassId)
      .sort((a, b) => {
        if (isAllClasses && a.classId !== b.classId) {
          return a.classId.localeCompare(b.classId);
        }
        return a.rollNo - b.rollNo;
      });
  }, [students, selectedClassId, isAllClasses]);

  // Today's attendance records map: studentId -> AttendanceRecord (វត្តមានកត់តែម្តងគត់សម្រាប់ម៉ោងចេញចូល)
  const dailyRecordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((r) => {
      if (
        (isAllClasses || r.classId === selectedClassId) &&
        r.date === selectedDate &&
        r.session === selectedSession
      ) {
        map.set(r.studentId, r);
      }
    });
    return map;
  }, [attendanceRecords, selectedClassId, isAllClasses, selectedDate, selectedSession]);

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
    await pushSnapshot('កត់វត្តមានសិស្ស');
    if (soundOn) soundEffects.playClick();
    const existing = dailyRecordMap.get(studentId);
    const timeSlotStr = `${checkInTime} - ${checkOutTime}`;
    const targetStudent = students.find((s) => s.id === studentId);
    const targetClassId = existing?.classId || targetStudent?.classId || activeClassId;
    const currentSubject = activePeriodOption?.subject || existing?.subject || '';
    if (existing) {
      await db.attendance.update(existing.id, {
        status,
        reason: reason || existing.reason || '',
        timeSlot: timeSlotStr,
        subject: currentSubject,
      });
    } else {
      const newRec: AttendanceRecord = {
        id: `att-${Date.now()}-${studentId}`,
        classId: targetClassId,
        studentId,
        date: selectedDate,
        session: selectedSession,
        timeSlot: timeSlotStr,
        subject: currentSubject,
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
      await pushSnapshot('កត់មូលហេតុអវត្តមាន');
      await db.attendance.update(existing.id, { reason });
      onRefresh();
    }
  };

  // Mark all students present with 1 click
  const handleMarkAllPresent = async () => {
    await pushSnapshot(
      isAllClasses
        ? 'កត់វត្តមានសិស្សគ្រប់ថ្នាក់ទាំងអស់'
        : `កត់វត្តមានទាំងអស់ ថ្នាក់ ${currentClass?.name || ''}`
    );
    if (soundOn) soundEffects.playSuccess();
    const timeSlotStr = `${checkInTime} - ${checkOutTime}`;
    const currentSubject = activePeriodOption?.subject || '';
    const recordsToPut: AttendanceRecord[] = classStudents.map((s) => {
      const existing = dailyRecordMap.get(s.id);
      return {
        id: existing?.id || `att-${Date.now()}-${s.id}`,
        classId: existing?.classId || s.classId || activeClassId,
        studentId: s.id,
        date: selectedDate,
        session: selectedSession,
        timeSlot: timeSlotStr,
        subject: currentSubject || existing?.subject || '',
        status: 'present' as AttendanceStatus,
        reason: '',
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
    });

    await db.attendance.bulkPut(recordsToPut);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setLastSavedTime(timeStr);
    setSaveSuccessMessage(`✨ បានកត់វត្តមានគ្រប់គ្នា (${toKhmerNum(classStudents.length)} នាក់)!`);
    setIsSavedFeedback(true);
    setTimeout(() => setIsSavedFeedback(false), 3000);
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

  // Explicit Save Attendance Handler (រក្សាទុកវត្តមាន)
  const handleSaveAttendance = async () => {
    setIsSaving(true);
    await pushSnapshot(
      isAllClasses
        ? 'រក្សាទុកវត្តមានសិស្សគ្រប់ថ្នាក់'
        : `រក្សាទុកវត្តមាន ថ្នាក់ ${currentClass?.name || ''}`
    );

    const timeSlotStr = `${checkInTime} - ${checkOutTime}`;
    const currentSubject = activePeriodOption?.subject || '';
    const recordsToPut: AttendanceRecord[] = [];

    classStudents.forEach((s) => {
      const existing = dailyRecordMap.get(s.id);
      if (existing) {
        recordsToPut.push({
          ...existing,
          timeSlot: timeSlotStr,
          subject: currentSubject || existing.subject || '',
        });
      }
    });

    if (recordsToPut.length > 0) {
      await db.attendance.bulkPut(recordsToPut);
    }

    if (soundOn) soundEffects.playSuccess();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setLastSavedTime(timeStr);

    const recordedCount = dailyStats.total - dailyStats.notRecorded;
    if (recordedCount > 0) {
      setSaveSuccessMessage(`💾 បានរក្សាទុកវត្តមាន (${toKhmerNum(recordedCount)}/${toKhmerNum(dailyStats.total)} នាក់) ដោយជោគជ័យ!`);
    } else {
      setSaveSuccessMessage('💾 បានរក្សាទុកទិន្នន័យវត្តមានរួចរាល់!');
    }

    setIsSavedFeedback(true);
    setTimeout(() => setIsSavedFeedback(false), 3000);
    setIsSaving(false);
    onRefresh();
  };

  // Global Ctrl+S keyboard shortcut to save attendance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveAttendance();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [classStudents, dailyRecordMap, checkInTime, checkOutTime, selectedDate, selectedSession, soundOn, isAllClasses, currentClass, dailyStats]);

  return (
    <div className="space-y-6">
      {/* If No Classes Created Yet */}
      {classes.length === 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in no-print">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-lg shrink-0">
              🏫
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base text-amber-900">មិនទាន់មានថ្នាក់រៀននៅឡើយទេ</p>
              <p className="text-xs text-amber-700 mt-0.5">
                សូមបង្កើតថ្នាក់រៀនដំបូងរបស់លោកគ្រូ (ឧ. ថ្នាក់ទី 7A ឬ 10B...) ដើម្បីចាប់ផ្តើមបញ្ចូលសិស្ស និងកត់វត្តមាន។
              </p>
            </div>
          </div>
          {onOpenManageClasses && (
            <button
              type="button"
              onClick={onOpenManageClasses}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              + បង្កើតថ្នាក់រៀនថ្មី
            </button>
          )}
        </div>
      )}

      {/* 2-Row Unified Controller Bar (Organized into exactly TWO rows as requested) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5 no-print">
        {/* ROW 1: Page Title, Class Badge & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Left: Title + Class Badge + Live Feedback */}
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg sm:text-2xl font-black text-slate-800 flex items-center shrink-0">
              <CalendarCheck2 className="w-6 h-6 text-blue-600 mr-2 shrink-0" />
              <span className="whitespace-nowrap">វត្តមានសិស្សប្រចាំថ្ងៃ</span>
            </h2>
            <span className="inline-flex items-center px-2.5 sm:px-3 py-1 bg-blue-50 text-blue-700 text-xs sm:text-sm font-bold rounded-xl border border-blue-200 shrink-0">
              📚 {isAllClasses ? `🌟 ថ្នាក់ទាំងអស់ (${toKhmerNum(classes.length)} ថ្នាក់)` : (currentClass?.name || 'ថ្នាក់រៀន')}
            </span>
            {!isAllClasses && currentClass?.homeroomTeacher && (
              <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-800 text-xs sm:text-sm font-bold rounded-xl border border-indigo-200">
                👨‍🏫 គ្រូទទួលបន្ទុក៖ {currentClass.homeroomTeacher}
              </span>
            )}
            {isSavedFeedback && (
              <span className="inline-flex items-center text-xs sm:text-sm text-emerald-800 font-bold bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-300 shadow-xs animate-bounce">
                <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-600" />
                {saveSuccessMessage || 'បានរក្សាទុកវត្តមានដោយជោគជ័យ!'} {lastSavedTime && `(ម៉ោង ${lastSavedTime})`}
              </span>
            )}
          </div>

          {/* Right: Primary Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 1. Mark All Present Button */}
            <button
              onClick={handleMarkAllPresent}
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              title="កត់វត្តមាន (មក) ដល់សិស្សទាំងអស់ក្នុងពេលតែមួយ"
            >
              <Sparkles className="w-4 h-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">កត់វត្តមានទាំងអស់ (មក)</span>
              <span className="sm:hidden">វត្តមានទាំងអស់</span>
            </button>
            <button
              type="button"
              onClick={() => setIsStudentShareOpen(true)}
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-linear-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer shrink-0"
              title="ចែករំលែកតារាងស្រង់វត្តមានប្រចាំថ្ងៃទៅសិស្ស ឬប្រធានថ្នាក់"
            >
              <Share2 className="w-4 h-4 mr-1 sm:mr-1.5 text-yellow-300" />
              <span className="hidden sm:inline">ចែករំលែកទៅសិស្ស (ស្រង់វត្តមាន)</span>
              <span className="sm:hidden">ចែករំលែកសិស្ស</span>
            </button>
            <button
              onClick={() => setIsTelegramOpen(true)}
              className="inline-flex items-center px-2.5 sm:px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">ផ្ញើ Telegram</span>
              <span className="sm:hidden">Telegram</span>
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
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 sm:space-x-1.5 ${
                  selectedSession === 'morning'
                    ? 'bg-white text-blue-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🌅</span>
                <span className="hidden sm:inline">វេនព្រឹក</span>
                <span className="sm:hidden">ព្រឹក</span>
              </button>
              <button
                type="button"
                onClick={() => handleSessionChange('afternoon')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 sm:space-x-1.5 ${
                  selectedSession === 'afternoon'
                    ? 'bg-white text-amber-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🌇</span>
                <span className="hidden sm:inline">វេនរសៀល</span>
                <span className="sm:hidden">រសៀល</span>
              </button>
            </div>

            <span className="text-xs sm:text-sm text-slate-500 font-medium hidden md:inline">
              ({formatKhmerDate(selectedDate, true)})
            </span>
          </div>

          {/* Right: In/Out Selector with Quick Options + Holiday Checkbox */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* ម៉ោងចេញចូលសម្រាប់មុខវិជ្ជា (កត់វត្តមានតែម្តងគត់) */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl text-xs sm:text-sm font-bold border border-slate-200/80 shadow-2xs">
              {/* ម៉ោងចូល */}
              <div className="flex items-center space-x-1.5 pl-2 pr-2 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <span className="text-emerald-700 font-bold whitespace-nowrap flex items-center">
                  🚪 ម៉ោងចូល៖
                </span>
                <select
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1 text-xs sm:text-sm font-black text-slate-800 cursor-pointer shadow-2xs hover:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                >
                  {currentHoursOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-slate-400 font-bold px-0.5">➔</span>

              {/* ម៉ោងចេញ */}
              <div className="flex items-center space-x-1.5 pl-2 pr-2 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <span className="text-blue-700 font-bold whitespace-nowrap flex items-center">
                  🏁 ម៉ោងចេញ៖
                </span>
                <select
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1 text-xs sm:text-sm font-black text-slate-800 cursor-pointer shadow-2xs hover:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                  {currentHoursOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Subject & Period Badge if slot matches timetable */}
              {activePeriodOption?.subject && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-black shadow-2xs">
                  <span>📖</span>
                  <span>{activePeriodOption.subject}</span>
                  {activePeriodOption.teacherName && (
                    <span className="text-indigo-600 font-medium hidden lg:inline">({activePeriodOption.teacherName})</span>
                  )}
                </span>
              )}
            </div>

            {/* Holiday Toggle */}
            <div className="flex items-center">
              <label className="inline-flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100/80 px-2.5 py-1.5 rounded-xl border border-rose-200 cursor-pointer transition-colors shadow-2xs">
                <input
                  type="checkbox"
                  checked={isHolidayMode}
                  onChange={(e) => handleToggleHoliday(e.target.checked)}
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
                  onChange={(e) => handleHolidayNoteChange(e.target.value)}
                  placeholder="វាយកំណត់ត្រាថ្ងៃឈប់..."
                  className="ml-2 px-2.5 py-1 text-xs sm:text-sm font-bold bg-white text-rose-900 border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500 w-48 shadow-2xs"
                />
              )}
            </div>
          </div>

          {/* Timetable Period Quick Presets */}
          {todayClassTimetable.length > 0 && (
            <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar border-t border-slate-200/60 pt-2">
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap flex items-center gap-1 shrink-0">
                <span>🗓️ កាលវិភាគថ្នាក់ ({khmerDayName})៖</span>
              </span>
              {periodOptions.map((opt, idx) => {
                const isSelected = checkInTime === opt.checkIn && checkOutTime === opt.checkOut;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPeriod(opt)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all text-xs cursor-pointer border shrink-0 flex items-center gap-1 ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-700 shadow-2xs scale-102 font-black'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                    title={`${opt.label} (ចូល៖ ${opt.checkIn} - ចេញ៖ ${opt.checkOut})`}
                  >
                    {opt.isFullSession ? <span>🕒</span> : <span>📚</span>}
                    <span>{opt.shortLabel}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                      ({opt.checkIn}-{opt.checkOut})
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Filter Status Chips & Sound Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 no-print">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold">
          <span className="text-slate-600 text-xs sm:text-sm font-bold px-1 hidden sm:inline">តម្រងរហ័ស៖</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-slate-800 shadow-2xs font-black'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <span>ទាំងអស់</span> ({dailyStats.total})
          </button>
          <button
            onClick={() => setStatusFilter('present')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              statusFilter === 'present'
                ? 'bg-emerald-600 text-white shadow-2xs font-black'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            🟢 <span>មក</span> ({dailyStats.present})
          </button>
          <button
            onClick={() => setStatusFilter('permission')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              statusFilter === 'permission'
                ? 'bg-amber-500 text-white shadow-2xs font-black'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            🟡 <span>ច្បាប់</span> ({dailyStats.permission})
          </button>
          <button
            onClick={() => setStatusFilter('absent')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              statusFilter === 'absent'
                ? 'bg-rose-600 text-white shadow-2xs font-black'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            🔴 <span className="hidden sm:inline">ឥតច្បាប់</span><span className="sm:hidden">ឥត</span> ({dailyStats.absent})
          </button>
          <button
            onClick={() => setStatusFilter('late')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              statusFilter === 'late'
                ? 'bg-blue-600 text-white shadow-2xs font-black'
                : 'text-blue-700 hover:bg-blue-50'
            }`}
          >
            🔵 <span>យឺត</span> ({dailyStats.late})
          </button>
          {dailyStats.notRecorded > 0 && (
            <button
              onClick={() => setStatusFilter('notRecorded')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === 'notRecorded'
                  ? 'bg-slate-700 text-white shadow-2xs font-black'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              ⚪ <span className="hidden sm:inline">មិនទាន់កត់</span><span className="sm:hidden">ខ្វះ</span> ({dailyStats.notRecorded})
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
          បញ្ជីវត្តមានប្រចាំថ្ងៃ {isAllClasses ? `ថ្នាក់ទាំងអស់ (${toKhmerNum(classes.length)} ថ្នាក់)` : (currentClass?.name || '')} - {formatKhmerDate(selectedDate, true)}
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
                      <td className="py-3 px-3 text-center font-bold text-slate-600 text-xs sm:text-sm font-mono">
                        {index + 1}
                      </td>

                      {/* អត្តលេខ */}
                      <td className="py-3 px-3 font-mono text-xs sm:text-sm font-bold text-slate-700">
                        {fromKhmerNum(stu.studentCode)}
                      </td>

                      {/* ឈ្មោះខ្មែរ */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-blue-700">
                            {stu.nameKh}
                          </span>
                          {isAllClasses && (
                            <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                              {classes.find((c) => c.id === stu.classId)?.name || 'ថ្នាក់'}
                            </span>
                          )}
                        </div>
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
                        <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl space-x-1 sm:space-x-1.5">
                          {/* មក (Present) */}
                          <button
                            onClick={() => handleSetStatus(stu.id, 'present')}
                            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                            title="វត្តមាន (មក)"
                          >
                            <span>✅</span> <span className="hidden sm:inline">មក</span>
                          </button>

                          {/* ច្បាប់ (Permission) */}
                          <button
                            onClick={() => handleSetStatus(stu.id, 'permission')}
                            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                              currentStatus === 'permission'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                            title="មានច្បាប់"
                          >
                            <span>🟡</span> <span className="hidden sm:inline">ច្បាប់</span>
                          </button>

                          {/* ឥតច្បាប់ (Absent) */}
                          <button
                            onClick={() => handleSetStatus(stu.id, 'absent')}
                            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                              currentStatus === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                            title="អវត្តមានឥតច្បាប់"
                          >
                            <span>❌</span> <span className="hidden sm:inline">ឥតច្បាប់</span>
                          </button>

                          {/* យឺត (Late) */}
                          <button
                            onClick={() => handleSetStatus(stu.id, 'late')}
                            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                              currentStatus === 'late'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                            title="មកយឺត"
                          >
                            <span>🔵</span> <span className="hidden sm:inline">យឺត</span>
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

      {/* Telegram Share Modal (Teacher/Management general report) */}
      <TelegramShareModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
        currentClass={
          currentClass ||
          (isAllClasses
            ? ({
                id: 'ALL',
                name: `ថ្នាក់ទាំងអស់ (${toKhmerNum(classes.length)} ថ្នាក់)`,
                grade: '',
                academicYear: '',
                homeroomTeacher: '',
                totalStudents: classStudents.length,
              } as any)
            : null)
        }
        students={classStudents}
        attendanceRecords={attendanceRecords}
        settings={settings}
      />

      {/* Student Attendance Share Modal (Strictly Daily Attendance for Students/Monitor) */}
      <StudentAttendanceShareModal
        isOpen={isStudentShareOpen}
        onClose={() => setIsStudentShareOpen(false)}
        currentClass={
          currentClass ||
          (isAllClasses
            ? ({
                id: 'ALL',
                name: `ថ្នាក់ទាំងអស់ (${toKhmerNum(classes.length)} ថ្នាក់)`,
                grade: '',
                academicYear: '',
                homeroomTeacher: '',
                totalStudents: classStudents.length,
              } as any)
            : null)
        }
        students={classStudents}
        attendanceRecords={attendanceRecords}
        selectedDate={selectedDate}
        selectedSession={selectedSession}
        checkInTime={checkInTime}
        checkOutTime={checkOutTime}
        settings={settings}
      />

      {/* Floating Quick Save Button on Bottom-Right */}
      <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-30 no-print animate-fade-in">
        <button
          type="button"
          onClick={handleSaveAttendance}
          disabled={isSaving}
          className="inline-flex items-center px-4 py-2.5 bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm rounded-full shadow-2xl hover:scale-105 active:scale-95 border-2 border-white/50 transition-all cursor-pointer group"
          title="ចុចដើម្បីរក្សាទុកវត្តមាន (Ctrl+S)"
        >
          <Save className="w-4 h-4 mr-1.5 text-amber-300 group-hover:rotate-12 transition-transform" />
          <span>{isSaving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកវត្តមាន'}</span>
          {lastSavedTime && (
            <span className="ml-1.5 pl-1.5 border-l border-white/30 text-[11px] text-blue-100 font-mono">
              {lastSavedTime}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
