import React, { useState, useMemo, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  Send,
  QrCode,
  Link,
  Printer,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Sparkles,
  FileText,
  Lock,
  Key,
  ShieldCheck,
  RotateCw,
} from 'lucide-react';
import { Modal } from './common/Modal';
import type { Student, ClassRoom, AttendanceRecord, TeacherSettings } from '../types';
import { formatKhmerDate, fromKhmerNum, toKhmerNum } from '../utils/dateUtils';
import { generateStudentQRCodeSVG } from '../utils/qrCode';
import { encodeAttendanceForUrl, encodeRosterForUrl } from '../utils/attendanceShare';
import {
  getPinForDate,
  hashPin,
  generateOneTimeSharePin,
  getDateBasedPin,
  getDailySecurityPin,
  getActiveShareOtp,
  rotateActiveShareOtp,
  OTP_BROADCAST_CHANNEL,
  ACTIVE_OTP_STORAGE_KEY,
} from '../utils/pinUtils';

interface StudentAttendanceShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClass: ClassRoom | null;
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  selectedDate: string;
  selectedSession: 'morning' | 'afternoon';
  checkInTime: string;
  checkOutTime: string;
  settings: TeacherSettings | null;
}

export const StudentAttendanceShareModal: React.FC<StudentAttendanceShareModalProps> = ({
  isOpen,
  onClose,
  currentClass,
  students,
  attendanceRecords,
  selectedDate,
  selectedSession,
  checkInTime,
  checkOutTime,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<'message' | 'roster' | 'qrcode'>('message');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [includeStudentList, setIncludeStudentList] = useState(false);

  // Dynamic One-Time Passcode (OTP) generated freshly on every share action / modal open
  const [shareOtpPin, setShareOtpPin] = useState<string>(() => getActiveShareOtp());
  const [isRotatingPin, setIsRotatingPin] = useState(false);

  // Sync OTP with storage and broadcast events in real-time when student unlocks or code rotates
  useEffect(() => {
    if (!isOpen) return;
    setShareOtpPin(getActiveShareOtp());

    const handleStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_OTP_STORAGE_KEY && e.newValue) {
        setShareOtpPin(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);

    let bc: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel(OTP_BROADCAST_CHANNEL);
      bc.onmessage = (event) => {
        if (event.data?.type === 'OTP_ROTATED' && event.data.newPin) {
          setShareOtpPin(event.data.newPin);
        } else if (event.data?.type === 'PIN_CONSUMED') {
          setShareOtpPin(getActiveShareOtp());
        }
      };
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, [isOpen]);

  const handleRegeneratePin = () => {
    setIsRotatingPin(true);
    const fresh = rotateActiveShareOtp();
    setShareOtpPin(fresh);
    setTimeout(() => setIsRotatingPin(false), 450);
  };

  const isPerShare = !settings?.pinMode || settings?.pinMode === 'per_share';

  const activePinForSelectedDate = useMemo(() => {
    if (settings?.pinMode === 'fixed') {
      return (settings?.studentAttendancePin || '1234').trim() || '1234';
    }
    if (settings?.pinMode === 'date_format') {
      return getDateBasedPin(selectedDate, 'DDMM');
    }
    if (settings?.pinMode === 'daily') {
      return getDailySecurityPin(selectedDate, settings?.studentAttendancePin);
    }
    // Default & 'per_share': Dynamic OTP per share link
    return shareOtpPin;
  }, [settings?.pinMode, settings?.studentAttendancePin, selectedDate, shareOtpPin]);

  // Filter students for the current class
  const classStudents = useMemo(() => {
    if (!currentClass) return students;
    return students
      .filter((s) => s.classId === currentClass.id)
      .sort((a, b) => a.rollNo - b.rollNo);
  }, [students, currentClass]);

  // Today's attendance records for this class & date
  const todayRecords = useMemo(() => {
    return attendanceRecords.filter(
      (r) =>
        r.date === selectedDate &&
        (currentClass ? r.classId === currentClass.id : true)
    );
  }, [attendanceRecords, selectedDate, currentClass]);

  // Daily attendance statistics
  const presentStudents = classStudents.filter(
    (s) => todayRecords.find((r) => r.studentId === s.id)?.status === 'present'
  );
  const permissionStudents = classStudents.filter(
    (s) => todayRecords.find((r) => r.studentId === s.id)?.status === 'permission'
  );
  const absentStudents = classStudents.filter(
    (s) => todayRecords.find((r) => r.studentId === s.id)?.status === 'absent'
  );
  const lateStudents = classStudents.filter(
    (s) => todayRecords.find((r) => r.studentId === s.id)?.status === 'late'
  );
  const unmarkedStudents = classStudents.filter(
    (s) => !todayRecords.find((r) => r.studentId === s.id)
  );

  const total = classStudents.length;
  const presentCount = presentStudents.length;
  const permissionCount = permissionStudents.length;
  const absentCount = absentStudents.length;
  const lateCount = lateStudents.length;
  const unmarkedCount = unmarkedStudents.length;

  const sessionLabel = selectedSession === 'morning' ? 'វេនព្រឹក' : 'វេនរសៀល';

  // Generate compact attendance payload for sharing
  const attPayload = useMemo(() => {
    return encodeAttendanceForUrl(classStudents, todayRecords, selectedDate, selectedSession);
  }, [classStudents, todayRecords, selectedDate, selectedSession]);

  // Read-only link for students & parents (Encodes class name, roster & attendance so it opens on ANY device without missing data):
  const studentReadOnlyUrl = useMemo(() => {
    const origin = window.location.origin;
    const path = window.location.pathname;
    const classParam = currentClass ? encodeURIComponent(currentClass.id) : 'ALL';
    const classNameParam = currentClass ? `&className=${encodeURIComponent(currentClass.name)}` : '';
    const payloadParam = attPayload ? `&att=${encodeURIComponent(attPayload)}` : '';
    const pinTokenParam = `&pinToken=${encodeURIComponent(hashPin(activePinForSelectedDate))}`;
    const rosterEncoded = encodeRosterForUrl(classStudents);
    const rosterParam = rosterEncoded ? `&roster=${encodeURIComponent(rosterEncoded)}` : '';
    return `${origin}${path}?mode=student&class=${classParam}${classNameParam}&date=${selectedDate}&session=${selectedSession}&view=readonly${pinTokenParam}${payloadParam}${rosterParam}`;
  }, [currentClass, selectedDate, selectedSession, attPayload, activePinForSelectedDate, classStudents]);

  // Generate clean daily attendance text specifically formatted for students/monitor (without cluttering student names)
  const studentAttendanceText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`📋 តារាងស្រង់វត្តមានប្រចាំថ្ងៃ`);
    lines.push(`🏫 ${settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}`);
    lines.push(`📚 ថ្នាក់៖ ${currentClass?.name || 'ថ្នាក់រៀន'}`);
    lines.push(`📅 កាលបរិច្ឆេទ៖ ${formatKhmerDate(selectedDate, true)}`);
    lines.push(`⏰ វេន៖ ${sessionLabel} (ម៉ោង ${checkInTime} - ${checkOutTime})`);
    lines.push(`👨‍🏫 គ្រូបង្រៀន៖ ${settings?.teacherName || 'គ្រូបន្ទុកថ្នាក់'}${settings?.specialtySubject ? ` (${settings?.specialtySubject})` : ''}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);

    if (includeStudentList) {
      lines.push(`✍️ បញ្ជីស្រង់វត្តមានសិស្សប្រចាំថ្ងៃ៖`);
      classStudents.forEach((stu, idx) => {
        const rec = todayRecords.find((r) => r.studentId === stu.id);
        let statusMark = '⏳ មិនទាន់ស្រង់';
        if (rec?.status === 'present') statusMark = 'មក ✅';
        else if (rec?.status === 'permission') statusMark = `ច្បាប់ 🟡${rec.reason ? ` (${rec.reason})` : ''}`;
        else if (rec?.status === 'absent') statusMark = `អវត្តមាន ❌${rec.reason ? ` (${rec.reason})` : ''}`;
        else if (rec?.status === 'late') statusMark = 'មកយឺត 🔵';

        const roll = idx + 1;
        const code = fromKhmerNum(stu.studentCode);
        lines.push(`${roll}. [${code}] ${stu.nameKh} (${stu.gender}): [ ${statusMark} ]`);
      });
      lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    }

    lines.push(`📊 សរុបវត្តមានថ្ងៃនេះ៖`);
    lines.push(`• សរុបសិស្ស៖ ${total} នាក់`);
    lines.push(`• វត្តមាន (មក)៖ ${presentCount} នាក់`);
    lines.push(`• មានច្បាប់៖ ${permissionCount} នាក់`);
    lines.push(`• អវត្តមានឥតច្បាប់៖ ${absentCount} នាក់`);
    if (lateCount > 0) lines.push(`• មកយឺត៖ ${lateCount} នាក់`);
    if (unmarkedCount > 0) lines.push(`• មិនទាន់ស្រង់៖ ${unmarkedCount} នាក់`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🔒 បញ្ជីវត្តមានត្រូវបានចាក់សោសុវត្ថិភាព`);
    lines.push(`🔑 លេខកូដដោះសោលើកនេះ៖ ${activePinForSelectedDate} ${isPerShare ? '(កូដសុវត្ថិភាព OTP ផ្ញើម្តងប្តូរម្តង)' : '(លេខកូដសម្ងាត់)'}`);
    if (isPerShare) {
      lines.push(`⚡ លេខកូដនេះមានសុពលភាពសម្រាប់តែតំណភ្ជាប់ខាងក្រោមប៉ុណ្ណោះ!`);
    }
    lines.push(`👉 តំណភ្ជាប់ស្រង់វត្តមាន៖`);
    lines.push(`${studentReadOnlyUrl}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📢 សូមប្រធានថ្នាក់ ឬសិស្សក្នុងថ្នាក់ចុចតំណភ្ជាប់ខាងលើដើម្បីស្រង់ និងផ្ទៀងផ្ទាត់វត្តមាន!`);

    return lines.join('\n');
  }, [
    settings,
    currentClass,
    selectedDate,
    sessionLabel,
    checkInTime,
    checkOutTime,
    includeStudentList,
    classStudents,
    todayRecords,
    total,
    presentCount,
    permissionCount,
    absentCount,
    lateCount,
    unmarkedCount,
    activePinForSelectedDate,
    isPerShare,
    studentReadOnlyUrl,
  ]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(studentAttendanceText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = studentAttendanceText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(studentReadOnlyUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleOpenTelegram = () => {
    // Keep message short and clean to strictly avoid Nginx 400 Bad Request URL limit
    const homeroom = currentClass?.homeroomTeacher || settings?.teacherName || 'លោកគ្រូ-អ្នកគ្រូ';
    const pinNotice = isPerShare
      ? `🔒 បញ្ជីវត្តមានត្រូវបានចាក់សោសុវត្ថិភាព\n🔑 លេខកូដដោះសោលើកនេះ៖ ${activePinForSelectedDate} (កូដសុវត្ថិភាព OTP ផ្ញើម្តងប្តូរម្តង)\n⚡ លេខកូដមានសុពលភាពសម្រាប់តែតំណភ្ជាប់ខាងក្រោមប៉ុណ្ណោះ!`
      : `🔒 បញ្ជីវត្តមានត្រូវបានចាក់សោសុវត្ថិភាព\n🔑 លេខកូដដោះសោថ្ងៃនេះ៖ ${activePinForSelectedDate}`;
    const shortSummary = `📋 តារាងវត្តមានប្រចាំថ្ងៃ ${currentClass?.name || 'ថ្នាក់រៀន'} (${sessionLabel})\n📅 ${formatKhmerDate(selectedDate, true)}\n👨‍🏫 គ្រូទទួលបន្ទុក៖ ${homeroom}\n📊 ស្ថិតិ៖ សរុប ${total} នាក់ | មក ${presentCount} | ច្បាប់ ${permissionCount} | អវត្តមាន ${absentCount}${lateCount > 0 ? ` | យឺត ${lateCount}` : ''}\n${pinNotice}\n\n👉 សូមចុចតំណភ្ជាប់ខាងក្រោមដើម្បីពិនិត្យមើល និងស្រង់វត្តមាន៖`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(studentReadOnlyUrl)}&text=${encodeURIComponent(shortSummary)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenStudentView = () => {
    window.open(studentReadOnlyUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePrintDailySheet = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ចែករំលែកទៅសិស្សដើម្បីស្រង់វត្តមាន"
      subtitle={`សម្រាប់ផ្ញើទៅតេឡេក្រាមសិស្ស ឬប្រធានថ្នាក់ស្រង់វត្តមាន (${currentClass?.name || 'ថ្នាក់រៀន'})`}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Daily Context Banner (Strictly Daily Attendance) */}
        <div className="bg-linear-to-r from-violet-900 via-indigo-900 to-blue-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-indigo-700/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-400/20 border border-violet-300/30 text-violet-200 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>មានតែវត្តមានប្រចាំថ្ងៃ (Daily Attendance Only)</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold font-moul tracking-wide text-white">
                {currentClass?.name || 'ថ្នាក់រៀន'} • {sessionLabel}
              </h3>
              <p className="text-xs text-indigo-200 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>📅 {formatKhmerDate(selectedDate, true)}</span>
                <span>⏰ {checkInTime} - {checkOutTime}</span>
                <span>👨‍🏫 គ្រូទទួលបន្ទុក៖ <strong className="text-white">{currentClass?.homeroomTeacher || settings?.teacherName || 'លោកគ្រូ/អ្នកគ្រូ'}</strong></span>
              </p>
            </div>

            {/* Quick Actions CTA */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleOpenStudentView}
                className="inline-flex items-center px-3.5 py-2.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/20 transition-all cursor-pointer"
                title="បើកមើលទំព័រសិស្សស្រង់វត្តមានដោយផ្ទាល់"
              >
                <span>🌐 បើកទំព័រសិស្ស</span>
              </button>

              <button
                onClick={handleOpenTelegram}
                className="inline-flex items-center px-4 py-2.5 bg-sky-500 hover:bg-sky-400 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all cursor-pointer"
              >
                <Send className="w-4 h-4 mr-2" />
                <span>ផ្ញើទៅ Telegram សិស្ស</span>
              </button>
            </div>
          </div>

          {/* Daily Quick Counts (Latin/Normal Numbers) */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mt-4 pt-3 border-t border-white/15 text-center text-xs">
            <div className="bg-white/10 rounded-xl p-2 backdrop-blur-xs">
              <span className="text-indigo-200 block text-[11px]">👥 សិស្សសរុប</span>
              <span className="text-base font-black text-white">{total}</span>
            </div>
            <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl p-2 backdrop-blur-xs">
              <span className="text-emerald-200 block text-[11px]">✅ វត្តមាន (មក)</span>
              <span className="text-base font-black text-emerald-300">{presentCount}</span>
            </div>
            <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-2 backdrop-blur-xs">
              <span className="text-amber-200 block text-[11px]">🟡 មានច្បាប់</span>
              <span className="text-base font-black text-amber-300">{permissionCount}</span>
            </div>
            <div className="bg-rose-500/20 border border-rose-400/30 rounded-xl p-2 backdrop-blur-xs">
              <span className="text-rose-200 block text-[11px]">❌ ឥតច្បាប់</span>
              <span className="text-base font-black text-rose-300">{absentCount}</span>
            </div>
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-2 backdrop-blur-xs">
              <span className="text-blue-200 block text-[11px]">⏰ មកយឺត</span>
              <span className="text-base font-black text-blue-300">{lateCount}</span>
            </div>
            <div className="bg-slate-500/20 border border-slate-400/30 rounded-xl p-2 backdrop-blur-xs">
              <span className="text-slate-300 block text-[11px]">⏳ មិនទាន់ស្រង់</span>
              <span className="text-base font-black text-slate-200">{unmarkedCount}</span>
            </div>
          </div>
        </div>

        {/* High-Security Dynamic PIN & Per-Share OTP Card (ផ្ញើម្តង ប្តូរកូដម្តង) */}
        <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-blue-50/90 border-2 border-indigo-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Key className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-slate-800 font-bold text-xs sm:text-sm">
                  {isPerShare
                    ? 'លេខកូដសម្ងាត់លើកនេះ (ផ្ញើម្តង ប្តូរកូដម្តង) ៖'
                    : `លេខកូដសម្ងាត់ដោះសោ (${formatKhmerDate(selectedDate, false)}) ៖`}
                </span>
                <span className="font-mono text-indigo-950 text-lg sm:text-xl tracking-widest font-black bg-white px-3 py-0.5 rounded-xl border border-indigo-300 shadow-inner flex items-center gap-1.5">
                  <span className="text-amber-500 text-sm">🔑</span>
                  <span>{activePinForSelectedDate}</span>
                </span>
                <span className="text-[10px] text-indigo-700 font-bold bg-indigo-100/90 px-2 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>{isPerShare ? '⚡ OTP ផ្ញើម្តងប្តូរម្តង' : settings?.pinMode === 'fixed' ? 'Fixed PIN' : 'Daily PIN'}</span>
                </span>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-600" />
                  <span>ចាក់សោវិញ ៥ នាទី</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                {isPerShare
                  ? '🔒 កូដសុវត្ថិភាព OTP ប្រើបានតែម្តង (Single-Use)៖ ប្រព័ន្ធនឹងប្តូរកូដថ្មីដោយស្វ័យប្រវត្តិភ្លាមៗពេលសិស្សដោះសោរកត់វត្តមាន ហើយនឹងចាក់សោរវិញដោយស្វ័យប្រវត្តិក្រោយ ៥ នាទី។'
                  : 'ផ្តល់ជូនតែប្រធានថ្នាក់ ឬសិស្សសម្រាប់ដោះសោស្រង់វត្តមាន។'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {isPerShare && (
              <button
                type="button"
                onClick={handleRegeneratePin}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold transition-all cursor-pointer text-xs shadow-xs"
                title="បង្កើតលេខកូដសម្ងាត់ ៤ ខ្ទង់ថ្មីមួយទៀតភ្លាមៗ"
              >
                <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${isRotatingPin ? 'animate-spin' : ''}`} />
                <span>ប្តូរកូដថ្មី</span>
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(activePinForSelectedDate);
                  setCopiedPin(true);
                  setTimeout(() => setCopiedPin(false), 2000);
                } catch {}
              }}
              className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-white hover:bg-slate-100 active:scale-95 text-slate-700 font-bold border border-slate-300 transition-all cursor-pointer text-xs shadow-2xs"
              title="ចម្លងលេខកូដសម្ងាត់ ៤ ខ្ទង់"
            >
              {copiedPin ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                  <span className="text-emerald-700">ចម្លងកូដរួច!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1 text-slate-600" />
                  <span>ចម្លងកូដ</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('message')}
            className={`inline-flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'message'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            <span>សារសម្រាប់តេឡេក្រាមសិស្ស</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`inline-flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'roster'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 mr-1.5" />
            <span>តារាងសិស្សប្រចាំថ្ងៃ ({classStudents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qrcode')}
            className={`inline-flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'qrcode'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4 mr-1.5" />
            <span>QR Code ស្កេនស្រង់វត្តមាន</span>
          </button>
        </div>

        {/* TAB 1: Telegram Message Preview */}
        {activeTab === 'message' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-normal text-slate-600">
                អត្ថបទរៀបចំរួចជាស្រេច អាចចម្លង ឬចុចផ្ញើទៅគ្រុបតេឡេក្រាមសិស្សភ្លាមៗ៖
              </span>
              <div className="flex items-center space-x-3">
                <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs text-slate-500 font-normal hover:text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={includeStudentList}
                    onChange={(e) => setIncludeStudentList(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>បង្ហាញបញ្ជីឈ្មោះសិស្សក្នុងសារ</span>
                </label>

                <button
                  type="button"
                  onClick={handleCopyText}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-normal transition-colors cursor-pointer"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                      <span className="text-emerald-700">ចម្លងរួចរាល់!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1 text-slate-600" />
                      <span>ចម្លងអត្ថបទ</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <textarea
              readOnly
              value={studentAttendanceText}
              rows={12}
              className="w-full font-mono text-xs p-3.5 bg-slate-900 text-slate-100 rounded-2xl border border-slate-700 focus:outline-none shadow-inner leading-relaxed resize-none selection:bg-indigo-600"
            />
          </div>
        )}

        {/* TAB 2: Daily Attendance Roster Table */}
        {activeTab === 'roster' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold">
                បញ្ជីឈ្មោះសិស្សសម្រាប់ស្រង់វត្តមានប្រចាំថ្ងៃ (មានតែថ្ងៃនេះ)៖
              </span>
              <span className="font-mono text-slate-600 font-bold">
                សរុប {classStudents.length} នាក់
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-2xl border border-slate-200 shadow-inner">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200 z-10">
                  <tr>
                    <th className="py-2 px-2.5 text-center w-12">ល.រ</th>
                    <th className="py-2 px-2.5 w-28">អត្តលេខ</th>
                    <th className="py-2 px-3">ឈ្មោះសិស្ស</th>
                    <th className="py-2 px-2 text-center w-14">ភេទ</th>
                    <th className="py-2 px-3 text-center w-36">ស្ថានភាពវត្តមាន</th>
                    <th className="py-2 px-3">មូលហេតុ/កំណត់ត្រា</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {classStudents.map((stu, idx) => {
                    const rec = todayRecords.find((r) => r.studentId === stu.id);
                    const status = rec?.status;

                    return (
                      <tr key={stu.id} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="py-2 px-2.5 text-center font-bold text-slate-600 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2.5 font-mono font-bold text-blue-900">
                          {fromKhmerNum(stu.studentCode)}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {stu.nameKh}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              stu.gender === 'ស្រី'
                                ? 'bg-pink-100 text-pink-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {stu.gender}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {status === 'present' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                              <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" />
                              មក
                            </span>
                          )}
                          {status === 'permission' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                              <AlertCircle className="w-3 h-3 mr-1 text-amber-600" />
                              ច្បាប់
                            </span>
                          )}
                          {status === 'absent' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                              <XCircle className="w-3 h-3 mr-1 text-rose-600" />
                              អវត្តមាន
                            </span>
                          )}
                          {status === 'late' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                              <Clock className="w-3 h-3 mr-1 text-blue-600" />
                              មកយឺត
                            </span>
                          )}
                          {!status && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px]">
                              មិនទាន់ស្រង់
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-500 truncate max-w-xs">
                          {rec?.reason || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: QR Code for Student Attendance Check-in */}
        {activeTab === 'qrcode' && (
          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-4">
            <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-200 inline-block">
              <div
                dangerouslySetInnerHTML={{
                  __html: generateStudentQRCodeSVG(studentReadOnlyUrl, 200),
                }}
                className="w-48 h-48 mx-auto"
              />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>QR Code សម្រាប់សិស្សស្កេនមើលវត្តមាន (Read-Only)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                សិស្ស ឬមាតាបិតាអាចស្កេន QR Code នេះដោយទូរស័ព្ទដៃ ដើម្បីពិនិត្យមើលវត្តមានប្រចាំថ្ងៃនៃថ្នាក់ {currentClass?.name || 'នេះ'} ដោយមានការចាក់សោសុវត្ថិភាព (មិនអាចកែប្រែបានឡើយ)។
              </p>
            </div>
          </div>
        )}

        {/* Direct Link sharing */}
        <div className="bg-slate-100 p-3 rounded-xl flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 truncate min-w-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-slate-700 shrink-0 font-normal">តំណភ្ជាប់សិស្សមើល (Read-Only)៖</span>
            <span className="font-mono text-indigo-700 truncate select-all">{studentReadOnlyUrl}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-normal border border-slate-300 transition-colors shrink-0 cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                <span className="text-emerald-700 font-normal">ចម្លងរួច!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                <span className="font-normal">ចម្លង Link សិស្ស</span>
              </>
            )}
          </button>
        </div>

        {/* Modal Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500 font-medium">
            💡 ចែករំលែកបានទាំង Telegram, WhatsApp, Messenger ឬចម្លងតារាង
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
            >
              <Copy className="w-4 h-4 mr-1.5" />
              <span>ចម្លងអត្ថបទស្រង់វត្តមាន</span>
            </button>

            <button
              type="button"
              onClick={handleOpenTelegram}
              className="inline-flex items-center px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 mr-1.5" />
              <span>ផ្ញើទៅ Telegram សិស្ស</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
