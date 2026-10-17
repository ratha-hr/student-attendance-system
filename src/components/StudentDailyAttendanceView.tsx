import React, { useState, useMemo, useEffect } from 'react';
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
  ShieldAlert,
  AlertTriangle,
  Eye,
  EyeOff,
  Timer,
  Calendar,
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, AttendanceStatus, TeacherSettings } from '../types';
import { db } from '../db/db';
import { fromKhmerNum, formatKhmerDate, getTodayDateString } from '../utils/dateUtils';
import { soundEffects } from '../utils/soundEffects';
import { decodeAttendanceFromUrl, encodeAttendanceForUrl, decodeRosterFromUrl } from '../utils/attendanceShare';
import { verifyPin } from '../utils/pinUtils';
import { Modal } from './common/Modal';

const MORNING_TIME_SLOTS = [
  { value: '7:00 - 11:00', label: 'ពេញមួយព្រឹក (07:00 - 11:00)' },
  { value: '7:00 - 7:50', label: 'ម៉ោងទី ១ (07:00 - 07:50)' },
  { value: '7:55 - 8:45', label: 'ម៉ោងទី ២ (07:55 - 08:45)' },
  { value: '8:55 - 9:45', label: 'ម៉ោងទី ៣ (08:55 - 09:45)' },
  { value: '9:50 - 10:40', label: 'ម៉ោងទី ៤ (09:50 - 10:40)' },
  { value: '10:45 - 11:35', label: 'ម៉ោងទី ៥ (10:45 - 11:35)' },
];

const AFTERNOON_TIME_SLOTS = [
  { value: '13:00 - 17:00', label: 'ពេញមួយរសៀល (13:00 - 17:00)' },
  { value: '13:00 - 13:50', label: 'ម៉ោងទី ១ (13:00 - 13:50)' },
  { value: '13:55 - 14:45', label: 'ម៉ោងទី ២ (13:55 - 14:45)' },
  { value: '14:55 - 15:45', label: 'ម៉ោងទី ៣ (14:55 - 15:45)' },
  { value: '15:50 - 16:40', label: 'ម៉ោងទី ៤ (15:50 - 16:40)' },
  { value: '16:45 - 17:35', label: 'ម៉ោងទី ៥ (16:45 - 17:35)' },
];

interface StudentDailyAttendanceViewProps {
  classes: ClassRoom[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  settings: TeacherSettings | null;
  initialClassId?: string;
  initialDate?: string;
  initialSession?: 'morning' | 'afternoon';
  initialTimeSlot?: string;
  initialReadOnly?: boolean;
  initialAttendancePayload?: string;
  initialPinToken?: string;
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
  initialTimeSlot,
  initialAttendancePayload,
  initialPinToken,
  onExitStudentMode,
  onRefresh,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (initialClassId && initialClassId !== 'ALL') return initialClassId;
    if (classes.length > 0) return classes[0].id;
    return 'class-7';
  });
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getTodayDateString());
  const [selectedSession, setSelectedSession] = useState<'morning' | 'afternoon'>(
    initialSession || 'morning'
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(() => {
    if (initialTimeSlot) return initialTimeSlot;
    return initialSession === 'afternoon' ? '13:00 - 17:00' : '7:00 - 11:00';
  });

  const currentTimeSlotOptions = selectedSession === 'morning' ? MORNING_TIME_SLOTS : AFTERNOON_TIME_SLOTS;

  const handleSessionChange = (session: 'morning' | 'afternoon') => {
    setSelectedSession(session);
    if (session === 'morning') {
      setSelectedTimeSlot('7:00 - 11:00');
    } else {
      setSelectedTimeSlot('13:00 - 17:00');
    }
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href);
      url.searchParams.set('session', session);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Auto-sync selectedClassId when classes resolves from IndexedDB
  useEffect(() => {
    if ((!selectedClassId || selectedClassId === 'ALL') && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'permission' | 'absent' | 'late' | 'unmarked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundOn, setSoundOn] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Security & Lock State: Always default to Read-Only so students cannot cheat!
  const [isEditUnlocked, setIsEditUnlocked] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinText, setShowPinText] = useState(false);

  // Brute-force protection & cooldown rate limiter
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('attendance_pin_failures');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [lockoutUntil, setLockoutUntil] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('attendance_pin_lockout_until');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Rate-limiting countdown timer
  useEffect(() => {
    const updateCooldown = () => {
      const now = Date.now();
      if (lockoutUntil > now) {
        setCooldownRemaining(Math.ceil((lockoutUntil - now) / 1000));
      } else {
        setCooldownRemaining(0);
      }
    };
    updateCooldown();
    const timer = setInterval(updateCooldown, 1000);
    return () => clearInterval(timer);
  }, [lockoutUntil]);

  // Auto-lock after 15 minutes of inactivity when unlocked
  useEffect(() => {
    if (!isEditUnlocked) return;
    const timeout = setTimeout(() => {
      setIsEditUnlocked(false);
      showToast('🔒 បានចាក់សោសុវត្ថិភាពឡើងវិញដោយស្វ័យប្រវត្តិ (ផុតកំណត់ពេល)!');
    }, 15 * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [isEditUnlocked]);

  // 1. Decoded student roster from URL parameter (enables 100% data availability on ANY mobile device)
  const urlRoster = useMemo(() => {
    if (typeof window === 'undefined') return [];
    const p = new URLSearchParams(window.location.search);
    const encodedRoster = p.get('roster') || p.get('students') || p.get('rosterData');
    const classIdFromUrl = p.get('class') || selectedClassId || 'class-7';
    return decodeRosterFromUrl(encodedRoster, classIdFromUrl);
  }, [selectedClassId]);

  // 2. URL class name fallback
  const urlClassName = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const p = new URLSearchParams(window.location.search);
    return p.get('className') || p.get('classname') || '';
  }, []);

  // 3. Active class resolution (falls back to URL className if device DB is empty)
  const currentClass = useMemo(() => {
    const found = classes.find((c) => c.id === selectedClassId);
    if (found) {
      if (urlClassName && (!found.name || found.name === 'ថ្នាក់រៀន')) {
        return { ...found, name: urlClassName };
      }
      return found;
    }
    if (urlClassName) {
      return {
        id: selectedClassId || 'class-7',
        name: urlClassName,
        grade: urlClassName.replace(/\D/g, '') || '7',
        academicYear: settings?.academicYear || '២០២៤-២០២៥',
        homeroomTeacher: settings?.teacherName || '',
      } as ClassRoom;
    }
    return classes[0] || null;
  }, [classes, selectedClassId, urlClassName, settings]);

  // 4. Students in this class sorted by rollNo:
  // If local DB has students, use them. If local DB is empty (e.g. on phone), use the decoded URL roster!
  const classStudents = useMemo(() => {
    const fromDb = currentClass
      ? students.filter((s) => s.classId === currentClass.id)
      : [];
    if (fromDb.length > 0) {
      return [...fromDb].sort((a, b) => a.rollNo - b.rollNo);
    }
    if (urlRoster.length > 0) {
      return [...urlRoster].sort((a, b) => a.rollNo - b.rollNo);
    }
    return [];
  }, [students, currentClass, urlRoster]);

  // 5. Automatically persist URL roster & class into device's IndexedDB so it's permanently stored locally
  useEffect(() => {
    if (urlRoster.length > 0) {
      db.students.bulkPut(urlRoster).catch(console.error);
      const targetClassId = selectedClassId || urlRoster[0]?.classId;
      if (targetClassId) {
        db.classes.get(targetClassId).then((existing) => {
          if (!existing) {
            db.classes.put({
              id: targetClassId,
              name: urlClassName || 'ថ្នាក់ទី 7A',
              grade: (urlClassName || '').replace(/\D/g, '') || '7',
              academicYear: settings?.academicYear || '២០២៤-២០២៥',
              homeroomTeacher: settings?.teacherName || '',
              createdAt: new Date().toISOString(),
            }).catch(console.error);
          }
        });
      }
    }
  }, [urlRoster, urlClassName, selectedClassId, settings]);

  // Sequential roll number starting from 1 (ដើម្បីឱ្យដូចផ្ទាំងគ្រូ ចាប់ផ្តើមពីលេខរៀងទី ១)
  const classRollNoMap = useMemo(() => {
    const map = new Map<string, number>();
    classStudents.forEach((stu, idx) => {
      map.set(stu.id, idx + 1);
    });
    return map;
  }, [classStudents]);

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
      classStudents.forEach((stu, idx) => {
        const classRoll = idx + 1;
        const payloadItem = urlPayloadMap.get(classRoll) || urlPayloadMap.get(stu.rollNo);
        if (payloadItem && !map.has(stu.id)) {
          map.set(stu.id, {
            id: `payload-${stu.id}`,
            classId: selectedClassId,
            studentId: stu.id,
            date: selectedDate,
            session: selectedSession,
            status: payloadItem.status,
            reason: payloadItem.reason || '',
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
      else if (statusFilter === 'late') matchesStatus = status === 'late';
      else if (statusFilter === 'unmarked') matchesStatus = !status;

      const q = searchQuery.trim().toLowerCase();
      const classRoll = classRollNoMap.get(stu.id) || 0;
      const matchesSearch =
        !q ||
        stu.nameKh.toLowerCase().includes(q) ||
        stu.studentCode.toLowerCase().includes(q) ||
        String(classRoll).includes(q) ||
        String(stu.rollNo).includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [classStudents, classRollNoMap, dailyRecordMap, statusFilter, searchQuery]);

  // Handle PIN verification to unlock Edit mode with brute-force defense
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownRemaining > 0) return;

    const isPinValid = verifyPin(enteredPin, selectedDate, settings, initialPinToken);
    if (isPinValid) {
      setIsEditUnlocked(true);
      setIsPinModalOpen(false);
      setEnteredPin('');
      setPinError('');
      setFailedAttempts(0);
      setLockoutUntil(0);
      try {
        sessionStorage.removeItem('attendance_pin_failures');
        sessionStorage.removeItem('attendance_pin_lockout_until');
      } catch {}
      if (soundOn) soundEffects.playSuccess();
      showToast('🔓 ដោះសោជោគជ័យ! លោកគ្រូ ឬប្រធានថ្នាក់អាចកត់វត្តមានបានហើយ។');
    } else {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);
      try {
        sessionStorage.setItem('attendance_pin_failures', String(nextFailures));
      } catch {}

      if (nextFailures >= 5) {
        const lockTime = Date.now() + 300 * 1000; // 5 minutes lockout
        setLockoutUntil(lockTime);
        try {
          sessionStorage.setItem('attendance_pin_lockout_until', String(lockTime));
        } catch {}
        setPinError('🚫 បានបញ្ចូលខុស ៥ ដង! ប្រព័ន្ធត្រូវបានចាក់សោសុវត្ថិភាពរយពេល ៥ នាទី។');
      } else if (nextFailures >= 3) {
        const lockTime = Date.now() + 60 * 1000; // 1 minute lockout
        setLockoutUntil(lockTime);
        try {
          sessionStorage.setItem('attendance_pin_lockout_until', String(lockTime));
        } catch {}
        setPinError('⚠️ បានបញ្ចូលខុស ៣ ដង! សូមរង់ចាំ ១ នាទី មុននឹងសាកល្បងម្ដងទៀត។');
      } else {
        const remaining = 3 - nextFailures;
        setPinError(`❌ លេខកូដសម្ងាត់មិនត្រឹមត្រូវទេ! សូមពិនិត្យមើលលេខកូដ OTP ៤ ខ្ទង់ដែលលោកគ្រូបានផ្ញើមកជាមួយតំណភ្ជាប់លើកនេះ (នៅសល់ ${remaining} ដងទៀត)។`);
      }
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
      else soundEffects.playClick();
    }

    const existing = dailyRecordMap.get(studentId);
    if (existing && !existing.id.startsWith('payload-')) {
      if (existing.status === status) {
        await db.attendance.delete(existing.id);
      } else {
        await db.attendance.update(existing.id, {
          status,
          timeSlot: selectedTimeSlot || existing.timeSlot,
        });
      }
    } else {
      const newRec: AttendanceRecord = {
        id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        classId: currentClass.id,
        studentId,
        date: selectedDate,
        session: selectedSession,
        timeSlot: selectedTimeSlot,
        status,
        reason: existing?.reason || '',
        createdAt: new Date().toISOString(),
      };
      await db.attendance.add(newRec);
    }

    onRefresh();
  };

  // Set reason for student (Available only when unlocked!)
  const handleSetReason = async (studentId: string, reason: string) => {
    if (!currentClass || !isEditUnlocked) return;

    const existing = dailyRecordMap.get(studentId);
    if (existing && !existing.id.startsWith('payload-')) {
      await db.attendance.update(existing.id, {
        reason,
        timeSlot: selectedTimeSlot || existing.timeSlot,
      });
    } else {
      const newRec: AttendanceRecord = {
        id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        classId: currentClass.id,
        studentId,
        date: selectedDate,
        session: selectedSession,
        timeSlot: selectedTimeSlot,
        status: existing?.status || 'absent',
        reason,
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
          timeSlot: selectedTimeSlot || existing.timeSlot,
        });
      } else {
        const newRec: AttendanceRecord = {
          id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          classId: currentClass.id,
          studentId: stu.id,
          date: selectedDate,
          session: selectedSession,
          timeSlot: selectedTimeSlot,
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
    const timeParam = selectedTimeSlot ? `&time=${encodeURIComponent(selectedTimeSlot)}` : '';
    return `${origin}${path}?mode=student&class=${encodeURIComponent(selectedClassId)}&date=${selectedDate}&session=${selectedSession}${timeParam}&view=readonly${payloadParam}`;
  }, [selectedClassId, selectedDate, selectedSession, selectedTimeSlot, currentPayload]);

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
📊 ស្ថិតិ៖ សរុប ${stats.total} នាក់ | មក ${stats.present} | ច្បាប់ ${stats.permission} | អវត្តមាន ${stats.absent}${stats.late > 0 ? ` | យឺត ${stats.late}` : ''}
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
          {/* Row 1: Interactive Selectors - Class (ថ្នាក់), Session (វេន), Time/Period (ម៉ោង), Date (កាលបរិច្ឆេទ) */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* 1. Class Selector (ប្តូរថ្នាក់) */}
              <div className="flex items-center gap-1.5 bg-indigo-50/90 border border-indigo-200 hover:border-indigo-300 rounded-xl px-2.5 py-1 shadow-2xs transition-colors">
                <span className="text-sm">📚</span>
                <select
                  value={currentClass?.id || selectedClassId}
                  onChange={(e) => {
                    const newClassId = e.target.value;
                    setSelectedClassId(newClassId);
                    if (typeof window !== 'undefined' && window.history) {
                      const url = new URL(window.location.href);
                      url.searchParams.set('class', newClassId);
                      window.history.replaceState({}, '', url.toString());
                    }
                  }}
                  className="bg-transparent font-black text-indigo-950 text-xs cursor-pointer focus:outline-none"
                  title="ចុចដើម្បីប្តូរថ្នាក់រៀន"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.homeroomTeacher ? `• គ្រូ: ${c.homeroomTeacher}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Session Selector (ប្តូរវេន) */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleSessionChange('morning')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 ${
                    selectedSession === 'morning'
                      ? 'bg-blue-600 text-white font-black shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 font-bold'
                  }`}
                  title="ប្តូរទៅវេនព្រឹក"
                >
                  <span>🌅</span>
                  <span>ព្រឹក</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSessionChange('afternoon')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 ${
                    selectedSession === 'afternoon'
                      ? 'bg-amber-600 text-white font-black shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 font-bold'
                  }`}
                  title="ប្តូរទៅវេនរសៀល"
                >
                  <span>🌇</span>
                  <span>រសៀល</span>
                </button>
              </div>

              {/* 3. Time / Period Selector (ប្តូរម៉ោង) */}
              <div className="flex items-center gap-1.5 bg-purple-50/90 border border-purple-200 hover:border-purple-300 rounded-xl px-2.5 py-1 shadow-2xs transition-colors">
                <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <select
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  className="bg-transparent font-bold text-purple-950 text-xs cursor-pointer focus:outline-none"
                  title="ចុចដើម្បីប្តូរម៉ោងបង្រៀន / ម៉ោងស្រង់វត្តមាន"
                >
                  {currentTimeSlotOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Date Picker (ប្តូរកាលបរិច្ឆេទ) */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-2.5 py-1 shadow-2xs transition-colors">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-slate-800 font-bold text-xs cursor-pointer focus:outline-none"
                  title="ចុចដើម្បីប្តូរកាលបរិច្ឆេទ"
                />
              </div>

              {/* 5. Teacher Badge */}
              {currentClass?.homeroomTeacher && (
                <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold text-[11px] hidden md:inline-flex items-center gap-1">
                  <span>👨‍🏫</span>
                  <span>គ្រូ៖ {currentClass.homeroomTeacher}</span>
                </span>
              )}
            </div>

            {/* Copy Link Button */}
            <button
              type="button"
              onClick={handleCopyStudentLink}
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs border cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
              }`}
              title="ចម្លងតំណភ្ជាប់វត្តមាន"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  <span>ចម្លងរួច!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                  <span>ចម្លងតំណភ្ជាប់</span>
                </>
              )}
            </button>
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

            {/* យឺត */}
            <button
              type="button"
              onClick={() => setStatusFilter('late')}
              className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center space-x-1 ${
                statusFilter === 'late'
                  ? 'bg-blue-600 text-white font-black shadow-xs'
                  : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
              }`}
            >
              <span>⏰ យឺត</span>
              <span className="font-mono font-black ml-1 px-1.5 py-0.2 bg-black/10 rounded-full">{stats.late}</span>
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

        {/* Live Feedback Toast (ចំកណ្តាលអេក្រង់) */}
        {toastMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none no-print">
            <div className="bg-slate-900/95 text-white text-xs sm:text-sm font-bold px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-2.5 border-2 border-slate-700 pointer-events-auto max-w-md text-center animate-scale-up">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
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
                  className={`bg-white rounded-xl p-2.5 sm:p-3 border transition-all shadow-2xs flex flex-col gap-1.5 ${
                    currentStatus === 'present'
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : currentStatus === 'permission'
                      ? 'border-amber-200 bg-amber-50/20'
                      : currentStatus === 'absent'
                      ? 'border-rose-200 bg-rose-50/20'
                      : currentStatus === 'late'
                      ? 'border-blue-200 bg-blue-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Left: Roll No (1, 2, 3...) + Student Code (STU-020) + Student Name + Gender */}
                    <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
                      {/* លេខរៀង ចាប់ផ្តើមពីលេខរៀងទី ១ (ដូចផ្ទាំងគ្រូ) */}
                      <span
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 text-slate-800 font-mono font-black text-xs sm:text-sm flex items-center justify-center shrink-0 border border-slate-200"
                        title="លេខរៀងសិស្ស"
                      >
                        {classRollNoMap.get(stu.id) || index + 1}
                      </span>

                      {/* អត្តលេខសិស្ស (ដូចផ្ទាំងគ្រូ) */}
                      {stu.studentCode && (
                        <span
                          className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs border border-slate-200 shrink-0"
                          title="អត្តលេខសិស្ស"
                        >
                          {fromKhmerNum(stu.studentCode)}
                        </span>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {stu.nameKh}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                              stu.gender === 'ស្រី'
                                ? 'bg-pink-100 text-pink-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {stu.gender}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Read-Only Badge OR Edit Mode Buttons */}
                    <div className="flex items-center space-x-1 shrink-0 self-end sm:self-auto">
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
                        /* EDIT MODE: 4 clean touch buttons for monitor/teacher */
                        <div className="flex flex-wrap items-center gap-1">
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

                          <button
                            type="button"
                            onClick={() => handleSetStatus(stu.id, 'late')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center space-x-1 ${
                              currentStatus === 'late'
                                ? 'bg-blue-600 text-white font-black ring-2 ring-blue-500 shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>យឺត</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reason display in Read-Only Mode */}
                  {!isEditUnlocked && rec?.reason && (
                    <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-xs text-amber-900 bg-amber-50/70 px-2.5 py-1 rounded-lg border border-amber-200/60 font-medium">
                      <span className="font-bold text-amber-800 whitespace-nowrap">មូលហេតុ៖</span>
                      <span className="truncate">{rec.reason}</span>
                    </div>
                  )}

                  {/* Reason input in Edit Mode */}
                  {isEditUnlocked && (
                    <div className="pt-1.5 border-t border-slate-100 flex items-center gap-2">
                      <label className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                        មូលហេតុ៖
                      </label>
                      <input
                        type="text"
                        value={rec?.reason || ''}
                        onChange={(e) => handleSetReason(stu.id, e.target.value)}
                        placeholder="មូលហេតុឈប់ ឬយឺត..."
                        className="flex-1 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  )}
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
        subtitle={`សម្រាប់តែលោកគ្រូ-អ្នកគ្រូ ឬប្រធានថ្នាក់ស្រង់វត្តមាន (${formatKhmerDate(selectedDate, false)})`}
        maxWidth="md"
      >
        <form onSubmit={handleVerifyPin} className="space-y-4">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-3.5 text-xs text-indigo-900 flex items-start space-x-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="leading-relaxed flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-indigo-950">ប្រព័ន្ធការពារសុវត្ថិភាពវត្តមាន</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono font-semibold">
                  {initialPinToken ? '⚡ Dynamic OTP' : '🔒 PIN Protected'}
                </span>
              </div>
              <p className="text-indigo-800 text-[11px] leading-relaxed">
                {initialPinToken ? (
                  <>
                    ដើម្បីការពារកុំឱ្យសិស្សលួចកែវត្តមានខ្លួនឯង សូមបញ្ចូល <strong className="text-indigo-950 font-bold">លេខកូដសម្ងាត់ ៤ ខ្ទង់ (OTP)</strong> ដែលបានផ្ញើជូនតាមតំណភ្ជាប់នេះ ឬលេខកូដ Master Key របស់លោកគ្រូ-អ្នកគ្រូ។
                  </>
                ) : (
                  <>
                    ដើម្បីការពារកុំឱ្យសិស្សលួចកែវត្តមានខ្លួនឯង សូមបញ្ចូលលេខកូដសម្ងាត់ ៤ ខ្ទង់ដែលលោកគ្រូ-អ្នកគ្រូបានកំណត់ ឬបានផ្តល់ជូនសម្រាប់ថ្ងៃនេះ។
                  </>
                )}
              </p>
            </div>
          </div>

          {cooldownRemaining > 0 && (
            <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3 text-xs text-rose-800 flex items-center space-x-2.5 animate-pulse">
              <Timer className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">ប្រព័ន្ធត្រូវបានចាក់សោសុវត្ថិភាពបណ្តោះអាសន្ន!</p>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  ដោយសារបញ្ចូលខុសច្រើនដង សូមរង់ចាំ <strong className="font-mono font-bold text-rose-900">{cooldownRemaining}</strong> វិនាទី មុននឹងសាកល្បងម្ដងទៀត។
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              លេខកូដសម្ងាត់ (Security PIN) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPinText ? 'text' : 'password'}
                maxLength={8}
                required
                autoFocus
                disabled={cooldownRemaining > 0}
                placeholder="បញ្ចូលលេខសម្ងាត់..."
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError('');
                }}
                className={`w-full pl-9 pr-10 py-2.5 text-base border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono font-black text-center tracking-widest text-slate-900 ${
                  cooldownRemaining > 0 ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPinText(!showPinText)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title={showPinText ? 'លាក់លេខសម្ងាត់' : 'បង្ហាញលេខសម្ងាត់'}
              >
                {showPinText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pinError && (
              <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" />
                {pinError}
              </p>
            )}
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center">
              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
              <span>មានតែលោកគ្រូ-អ្នកគ្រូ ឬប្រធានថ្នាក់ដែលមានលេខសម្ងាត់ត្រឹមត្រូវប៉ុណ្ណោះ ទើបអាចដោះសោបាន។</span>
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
              disabled={cooldownRemaining > 0 || !enteredPin.trim()}
              className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center space-x-1.5 transition-all ${
                cooldownRemaining > 0 || !enteredPin.trim()
                  ? 'bg-indigo-300 opacity-60 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer active:scale-95'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{cooldownRemaining > 0 ? `រង់ចាំ (${cooldownRemaining}s)` : 'ផ្ទៀងផ្ទាត់ & ដោះសោ'}</span>
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
