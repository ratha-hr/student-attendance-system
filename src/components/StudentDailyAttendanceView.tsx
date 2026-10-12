import React, { useState, useMemo } from 'react';
import {
  CalendarCheck2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Sparkles,
  Users,
  Copy,
  Check,
  Send,
  Volume2,
  VolumeX,
  Search,
  Lock,
  Unlock,
  Key,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, AttendanceStatus, TeacherSettings } from '../types';
import { db } from '../db/db';
import { fromKhmerNum, formatKhmerDate, getTodayDateString } from '../utils/dateUtils';
import { soundEffects } from '../utils/soundEffects';
import { decodeAttendanceFromUrl, encodeAttendanceForUrl } from '../utils/attendanceShare';
import { Modal } from './common/Modal';

interface StudentDailyAttendanceViewProps {
  classes: ClassRoom[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  settings: TeacherSettings | null;
  initialClassId?: string;
  initialDate?: string;
  initialSession?: 'morning' | 'afternoon';
  initialReadOnly?: boolean;
  initialAttendancePayload?: string;
  onExitStudentMode?: () => void;
  onRefresh: () => void;
}

export const StudentDailyAttendanceView: React.FC<StudentDailyAttendanceViewProps> = ({
  classes,
  students,
  attendanceRecords,
  settings,
  initialClassId,
  initialDate,
  initialSession,
  initialAttendancePayload,
  onRefresh,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId && initialClassId !== 'ALL' ? initialClassId : (classes[0]?.id || '')
  );
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getTodayDateString());
  const [selectedSession, setSelectedSession] = useState<'morning' | 'afternoon'>(
    initialSession || 'morning'
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'permission' | 'absent' | 'unmarked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundOn, setSoundOn] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Security & Lock State: Always default to Read-Only so students cannot cheat!
  const [isEditUnlocked, setIsEditUnlocked] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Active class
  const currentClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || classes[0] || null;
  }, [classes, selectedClassId]);

  // Students in this class sorted by rollNo
  const classStudents = useMemo(() => {
    if (!currentClass) return [];
    return students
      .filter((s) => s.classId === currentClass.id)
      .sort((a, b) => a.rollNo - b.rollNo);
  }, [students, currentClass]);

  // Decoded attendance map from URL payload (if shared via link with &att=1P.2L.3A...)
  const urlPayloadMap = useMemo(() => {
    let payload = initialAttendancePayload;
    if (!payload && typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      payload = p.get('att') || p.get('data') || undefined;
    }
    return decodeAttendanceFromUrl(payload);
  }, [initialAttendancePayload]);

  // Daily attendance map: Dexie records merged with URL payload
  const dailyRecordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();

    // 1. Records from IndexedDB
    attendanceRecords
      .filter(
        (r) =>
          r.classId === selectedClassId &&
          r.date === selectedDate &&
          r.session === selectedSession
      )
      .forEach((r) => map.set(r.studentId, r));

    // 2. If URL payload exists, overlay records for students without Dexie records
    if (urlPayloadMap.size > 0 && classStudents.length > 0) {
      classStudents.forEach((stu) => {
        const payloadStatus = urlPayloadMap.get(stu.rollNo);
        if (payloadStatus && !map.has(stu.id)) {
          map.set(stu.id, {
            id: `payload-${stu.id}`,
            classId: selectedClassId,
            studentId: stu.id,
            date: selectedDate,
            session: selectedSession,
            status: payloadStatus,
            createdAt: new Date().toISOString(),
          });
        }
      });
    }

    return map;
  }, [attendanceRecords, selectedClassId, selectedDate, selectedSession, urlPayloadMap, classStudents]);

  // Daily statistics
  const stats = useMemo(() => {
    let present = 0;
    let permission = 0;
    let absent = 0;
    let late = 0;
    let unmarked = 0;

    classStudents.forEach((stu) => {
      const rec = dailyRecordMap.get(stu.id);
      if (!rec) unmarked++;
      else if (rec.status === 'present') present++;
      else if (rec.status === 'permission') permission++;
      else if (rec.status === 'absent') absent++;
      else if (rec.status === 'late') late++;
    });

    return { total: classStudents.length, present, permission, absent, late, unmarked };
  }, [classStudents, dailyRecordMap]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return classStudents.filter((stu) => {
      const rec = dailyRecordMap.get(stu.id);
      const status = rec?.status;

      let matchesStatus = true;
      if (statusFilter === 'present') matchesStatus = status === 'present';
      else if (statusFilter === 'permission') matchesStatus = status === 'permission';
      else if (statusFilter === 'absent') matchesStatus = status === 'absent';
      else if (statusFilter === 'unmarked') matchesStatus = !status;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        stu.nameKh.toLowerCase().includes(q) ||
        stu.studentCode.toLowerCase().includes(q) ||
        String(stu.rollNo).includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [classStudents, dailyRecordMap, statusFilter, searchQuery]);

  // Handle PIN verification to unlock Edit mode
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = settings?.studentAttendancePin || '1234';
    if (enteredPin.trim() === correctPin.trim()) {
      setIsEditUnlocked(true);
      setIsPinModalOpen(false);
      setEnteredPin('');
      setPinError('');
      if (soundOn) soundEffects.playSuccess();
      showToast('🔓 ដោះសោជោគជ័យ! លោកគ្រូ ឬប្រធានថ្នាក់អាចកត់វត្តមានបានហើយ។');
    } else {
      setPinError('❌ លេខកូដសម្ងាត់មិនត្រឹមត្រូវទេ! សិស្សមិនអាចកែប្រែវត្តមានបានឡើយ។');
      if (soundOn) soundEffects.playAbsentChime();
    }
  };

  // Lock back into Read-Only mode
  const handleLockEdit = () => {
    setIsEditUnlocked(false);
    if (soundOn) soundEffects.playClick();
    showToast('🔒 បានចាក់សោសុវត្ថិភាពឡើងវិញជោគជ័យ! សិស្សមិនអាចលួចកែវត្តមានបានឡើយ។');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Mark single student status (Available only when unlocked!)
  const handleSetStatus = async (studentId: string, status: AttendanceStatus) => {
    if (!currentClass || !isEditUnlocked) return;

    if (soundOn) {
      if (status === 'present') soundEffects.playPresentChime();
      else if (status === 'permission') soundEffects.playPermissionChime();
      else if (status === 'absent') soundEffects.playAbsentChime();
      else soundEffects.playClickChime();
    }

    const existing = dailyRecordMap.get(studentId);
    if (existing && !existing.id.startsWith('payload-')) {
      if (existing.status === status) {
        await db.attendance.delete(existing.id);
      } else {
        await db.attendance.update(existing.id, {
          status,
        });
      }
    } else {
      const newRec: AttendanceRecord = {
        id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        classId: currentClass.id,
        studentId,
        date: selectedDate,
        session: selectedSession,
        status,
        createdAt: new Date().toISOString(),
      };
      await db.attendance.add(newRec);
    }

    onRefresh();
  };

  // Mark all present (Available only when unlocked!)
  const handleMarkAllPresent = async () => {
    if (!currentClass || classStudents.length === 0 || !isEditUnlocked) return;
    if (soundOn) soundEffects.playAllPresentChime();

    for (const stu of classStudents) {
      const existing = dailyRecordMap.get(stu.id);
      if (existing && !existing.id.startsWith('payload-')) {
        await db.attendance.update(existing.id, {
          status: 'present',
        });
      } else {
        const newRec: AttendanceRecord = {
          id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          classId: currentClass.id,
          studentId: stu.id,
          date: selectedDate,
          session: selectedSession,
          status: 'present',
          createdAt: new Date().toISOString(),
        };
        await db.attendance.add(newRec);
      }
    }

    showToast('បានកត់វត្តមាន (មក) ដល់សិស្សទាំងអស់ដោយជោគជ័យ!');
    onRefresh();
  };

  // Generate safe Read-Only share URL with embedded attendance payload
  const currentPayload = useMemo(() => {
    const records = Array.from(dailyRecordMap.values());
    return encodeAttendanceForUrl(classStudents, records, selectedDate, selectedSession);
  }, [classStudents, dailyRecordMap, selectedDate, selectedSession]);

  const studentReadOnlyUrl = useMemo(() => {
    const origin = window.location.origin;
    const path = window.location.pathname;
    const payloadParam = currentPayload ? `&att=${encodeURIComponent(currentPayload)}` : '';
    return `${origin}${path}?mode=student&class=${encodeURIComponent(selectedClassId)}&date=${selectedDate}&session=${selectedSession}&view=readonly${payloadParam}`;
  }, [selectedClassId, selectedDate, selectedSession, currentPayload]);

  const handleCopyStudentLink = async () => {
    try {
      await navigator.clipboard.writeText(studentReadOnlyUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Share Read-Only link to Telegram
  const handleShareToTelegram = () => {
    const homeroom = currentClass?.homeroomTeacher || settings?.teacherName || 'លោកគ្រូ-អ្នកគ្រូ';
    const text = `📋 តារាងវត្តមានប្រចាំថ្ងៃ ${currentClass?.name || ''} (${selectedSession === 'morning' ? 'វេនព្រឹក' : 'វេនរសៀល'})
📅 ${formatKhmerDate(selectedDate, true)}
👨‍🏫 គ្រូទទួលបន្ទុក៖ ${homeroom}
📊 ស្ថិតិ៖ សរុប ${stats.total} នាក់ | មក ${stats.present} | ច្បាប់ ${stats.permission} | អវត្តមាន ${stats.absent}
🔒 បញ្ជីវត្តមានត្រូវបានចាក់សោសុវត្ថិភាព (សិស្សមិនអាចកែប្រែបានឡើយ)

👉 ចុចតំណភ្ជាប់ខាងក្រោមដើម្បីពិនិត្យមើលវត្តមាន៖`;

    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(studentReadOnlyUrl)}&text=${encodeURIComponent(text)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased">
      {/* Top Banner (Header: Clean, Compact, Mobile-Friendly, NO "Return to Teacher Account" button) */}
      <header className="bg-linear-to-r from-violet-900 via-indigo-900 to-blue-950 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          {/* Brand & Mode info */}
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-yellow-300 shrink-0">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-moul text-xs sm:text-sm text-white truncate">
                  តារាងវត្តមានប្រចាំថ្ងៃ
                </h1>
                {isEditUnlocked ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400/50 text-[10px] font-bold text-emerald-200">
                    <Unlock className="w-2.5 h-2.5 text-emerald-300" />
                    <span>កែប្រែ</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/30 border border-violet-400/40 text-[10px] font-bold text-violet-200">
                    <Lock className="w-2.5 h-2.5 text-yellow-300" />
                    <span>Read-Only</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-indigo-200 truncate">
                {currentClass?.name || 'ថ្នាក់រៀន'} • {settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}
              </p>
            </div>
          </div>

          {/* Right Header Actions: Sound + Lock/Unlock (ONLY ONE BUTTON! NO "គណនីគ្រូ" button!) */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSoundOn(!soundOn)}
              className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title={soundOn ? 'បិទសំឡេង' : 'បើកសំឡេង'}
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {isEditUnlocked ? (
              <button
                type="button"
                onClick={handleLockEdit}
                className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="ចាក់សោបញ្ចប់ការស្រង់វត្តមាន"
              >
                <Lock className="w-3.5 h-3.5 mr-1" />
                <span>ចាក់សោបញ្ចប់</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEnteredPin('');
                  setPinError('');
                  setIsPinModalOpen(true);
                }}
                className="inline-flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white border border-indigo-400/30 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="ដោះសោដើម្បីស្រង់វត្តមាន (សម្រាប់គ្រូ ឬប្រធានថ្នាក់)"
              >
                <Key className="w-3.5 h-3.5 mr-1 text-yellow-300" />
                <span>ដោះសោ (PIN)</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area: Ultra-Streamlined for Mobile */}
      <main className="max-w-3xl mx-auto w-full px-2.5 sm:px-4 py-2.5 flex-1 space-y-2">
        {/* Status Indicator Banner (Slim, Single-line, No duplicate buttons!) */}
        {isEditUnlocked ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
            <span className="flex items-center font-bold">
              <Unlock className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
              <span>កំពុងបើកសិទ្ធិស្រង់វត្តមាន (សម្រាប់គ្រូ/ប្រធានថ្នាក់)</span>
            </span>
            <span className="text-[11px] text-emerald-700 font-medium hidden sm:inline">
              ចុច "ចាក់សោបញ្ចប់" ខាងលើពេលស្រង់រួច
            </span>
          </div>
        ) : (
          <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl px-3 py-1.5 flex items-center justify-between text-[11px] text-blue-900 shadow-2xs">
            <span className="flex items-center font-bold">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-blue-600 shrink-0" />
              <span>បានចាក់សោសុវត្ថិភាព Read-Only (សិស្សមិនអាចលួចកែវត្តមានបានឡើយ)</span>
            </span>
          </div>
        )}

        {/* Compact Mobile-Optimized Dashboard Card (Replaces both the bulky info card & 5 huge stat boxes!) */}
        <div className="bg-white rounded-2xl p-2.5 sm:p-3 shadow-2xs border border-slate-200/90 space-y-2">
          {/* Row 1: Class, Homeroom Teacher, Session, Date & Share Links */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg font-black text-xs">
                📚 {currentClass?.name || 'ថ្នាក់រៀន'}
              </span>
              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold text-[11px]">
                👨‍🏫 គ្រូ៖ {currentClass?.homeroomTeacher || settings?.teacherName || 'គ្រូទទួលបន្ទុក'}
              </span>
              <span className={`px-2 py-1 rounded-lg font-bold text-[11px] ${
                selectedSession === 'morning' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {selectedSession === 'morning' ? '🌅 វេនព្រឹក' : '🌇 វេនរសៀល'}
              </span>
              <span className="text-slate-500 font-medium text-[11px]">
                📅 {formatKhmerDate(selectedDate)}
              </span>
            </div>

            {/* Quick Share Links */}
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={handleCopyStudentLink}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center"
                title="ចម្លងតំណភ្ជាប់ Read-Only"
              >
                {copiedLink ? <Check className="w-3 h-3 mr-0.5 text-emerald-600" /> : <Copy className="w-3 h-3 mr-0.5" />}
                <span>{copiedLink ? 'ចម្លងរួច' : 'Link'}</span>
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleShareToTelegram}
                className="text-[11px] font-bold text-sky-600 hover:text-sky-800 hover:underline cursor-pointer flex items-center"
                title="ផ្ញើទៅ Telegram"
              >
                <Send className="w-3 h-3 mr-0.5" />
                <span>Telegram</span>
              </button>
            </div>
          </div>

          {/* Row 2: Unified Interactive Stats Chips (Replaces 5 bulky boxes AND filter buttons!) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs font-bold scrollbar-none">
            {/* ទាំងអស់ */}
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center space-x-1 ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white font-black shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>👥 សរុប</span>
              <span className="font-mono font-black ml-1 px-1.5 py-0.2 bg-black/10 rounded-full">{stats.total}</span>
            </button>

            {/* មក */}
            <button
              type="button"
              onClick={() => setStatusFilter('present')}
              className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center space-x-1 ${
                statusFilter === 'present'
                  ? 'bg-emerald-600 text-white font-black shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span>✅ មក</span>
              <span className="font-mono font-black ml-1 px-1.5 py-0.2 bg-black/10 rounded-full">{stats.present}</span>
            </button>

            {/* ច្បាប់ */}
            <button
              type="button"
              onClick={() => setStatusFilter('permission')}
              className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center space-x-1 ${
                statusFilter === 'permission'
                  ? 'bg-amber-500 text-white font-black shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span>🟡 ច្បាប់</span>
              <span className="font-mono font-black ml-1 px-1.5 py-0.2 bg-black/10 rounded-full">{stats.permission}</span>
            </button>

            {/* អវត្តមាន */}
            <button
              type="button"
              onClick={() => setStatusFilter('absent')}
              className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center space-x-1 ${
                statusFilter === 'absent'
                  ? 'bg-rose-600 text-white font-black shadow-xs'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <span>❌ អវត្តមាន</span>
              <span className="font-mono font-black ml-1 px-1.5 py-0.2 bg-black/10 rounded-full">{stats.absent}</span>
            </button>

            {/* មិនទាន់ស្រង់ */}
            {stats.unmarked > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('unmarked')}
                className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center space-x-1 ${
                  statusFilter === 'unmarked'
                    ? 'bg-slate-700 text-white font-black shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>⏳ មិនទាន់</span>
                <span className="font-mono font-black ml-1 px-1.5 py-0.2 bg-black/10 rounded-full">{stats.unmarked}</span>
              </button>
            )}
          </div>

          {/* Row 3: Quick Search + (Mark All Present if unlocked) */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ស្វែងរកឈ្មោះ ឬអត្តលេខ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {isEditUnlocked && (
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                <span>មកទាំងអស់</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Feedback Toast */}
        {toastMessage && (
          <div className="bg-slate-900 text-white text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl shadow-lg flex items-center justify-between animate-fade-in border border-slate-700">
            <span className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-emerald-400 shrink-0" />
              {toastMessage}
            </span>
          </div>
        )}

        {/* Student Attendance List: Compact, Mobile-First Cards */}
        <div className="space-y-1.5">
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-slate-400 space-y-1.5 border border-slate-200">
              <Users className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-bold text-slate-600 text-xs sm:text-sm">មិនមានទិន្នន័យសិស្សត្រូវតាមលក្ខខណ្ឌនេះទេ</p>
            </div>
          ) : (
            filteredStudents.map((stu, index) => {
              const rec = dailyRecordMap.get(stu.id);
              const currentStatus = rec?.status || null;

              return (
                <div
                  key={stu.id}
                  className={`bg-white rounded-xl p-2.5 sm:p-3 border transition-all shadow-2xs flex items-center justify-between gap-2 ${
                    currentStatus === 'present'
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : currentStatus === 'permission'
                      ? 'border-amber-200 bg-amber-50/20'
                      : currentStatus === 'absent'
                      ? 'border-rose-200 bg-rose-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Left: Roll No + Student Name + Gender + Code */}
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-mono font-black text-xs flex items-center justify-center shrink-0">
                      {stu.rollNo || index + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {stu.nameKh}
                        </span>
                        <span
                          className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                            stu.gender === 'ស្រី'
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {stu.gender}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {fromKhmerNum(stu.studentCode)}
                      </p>
                    </div>
                  </div>

                  {/* Right: Read-Only Badge OR Edit Mode Buttons */}
                  <div className="flex items-center space-x-1 shrink-0">
                    {!isEditUnlocked ? (
                      /* READ-ONLY BADGES: Clear, Beautiful, Unclickable */
                      <div>
                        {currentStatus === 'present' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs">
                            <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            <span>មក</span>
                          </span>
                        )}
                        {currentStatus === 'permission' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs">
                            <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                            <span>ច្បាប់</span>
                          </span>
                        )}
                        {currentStatus === 'absent' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-50 text-rose-900 border border-rose-300 font-bold text-xs">
                            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                            <span>អវត្តមាន</span>
                          </span>
                        )}
                        {currentStatus === 'late' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-300 font-bold text-xs">
                            <Clock className="w-3.5 h-3.5 mr-1 text-blue-600" />
                            <span>យឺត</span>
                          </span>
                        )}
                        {!currentStatus && (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-xs">
                            <Clock className="w-3 h-3 mr-1 text-slate-400" />
                            <span>មិនទាន់ស្រង់</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      /* EDIT MODE: 3 clean touch buttons for monitor/teacher */
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleSetStatus(stu.id, 'present')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center space-x-1 ${
                            currentStatus === 'present'
                              ? 'bg-emerald-600 text-white font-black ring-2 ring-emerald-500 shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>មក</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetStatus(stu.id, 'permission')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center space-x-1 ${
                            currentStatus === 'permission'
                              ? 'bg-amber-500 text-white font-black ring-2 ring-amber-400 shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>ច្បាប់</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetStatus(stu.id, 'absent')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center space-x-1 ${
                            currentStatus === 'absent'
                              ? 'bg-rose-600 text-white font-black ring-2 ring-rose-500 shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>អវត្តមាន</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Security PIN Unlock Modal */}
      <Modal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPinError('');
          setEnteredPin('');
        }}
        title="ដោះសោដើម្បីស្រង់វត្តមាន"
        subtitle="សម្រាប់តែលោកគ្រូ-អ្នកគ្រូ ឬប្រធានថ្នាក់ដែលមានការអនុញ្ញាត"
        maxWidth="md"
      >
        <form onSubmit={handleVerifyPin} className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 text-xs text-indigo-900 flex items-start space-x-2.5">
            <Lock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-bold">ការពារសុវត្ថិភាពវត្តមាន</p>
              <p className="text-indigo-800 text-[11px] mt-0.5">
                ដើម្បីការពារកុំឱ្យសិស្សលួចកែវត្តមានខ្លួនឯង សូមបញ្ចូលលេខកូដសម្ងាត់ ៤ ខ្ទង់ដែលលោកគ្រូ-អ្នកគ្រូបានកំណត់។
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              លេខកូដសម្ងាត់ (Security PIN) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                maxLength={6}
                required
                autoFocus
                placeholder="បញ្ចូលលេខសម្ងាត់..."
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError('');
                }}
                className="w-full pl-9 pr-3 py-2.5 text-base border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono font-black text-center tracking-widest text-slate-900"
              />
            </div>
            {pinError && (
              <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" />
                {pinError}
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              (លេខកូដសម្ងាត់លំនាំដើម៖ <strong className="font-mono text-slate-600">1234</strong> • គ្រូអាចប្តូរក្នុង Settings)
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsPinModalOpen(false);
                setPinError('');
                setEnteredPin('');
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer flex items-center space-x-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>ផ្ទៀងផ្ទាត់ & ដោះសោ</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-2.5 text-center text-[11px] text-slate-400">
        <p>ប្រព័ន្ធគ្រប់គ្រងវត្តមានសិស្ស • ការពារសុវត្ថិភាពចាក់សោរឹងមាំ (Read-Only)</p>
      </footer>
    </div>
  );
};
