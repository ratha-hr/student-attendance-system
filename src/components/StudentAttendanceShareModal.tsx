import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Modal } from './common/Modal';
import type { Student, ClassRoom, AttendanceRecord, TeacherSettings } from '../types';
import { formatKhmerDate, fromKhmerNum, toKhmerNum } from '../utils/dateUtils';
import { generateStudentQRCodeSVG } from '../utils/qrCode';

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

  // Generate clean daily attendance text specifically formatted for students/monitor
  const studentAttendanceText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`📋 តារាងស្រង់វត្តមានប្រចាំថ្ងៃ`);
    lines.push(`🏫 ${settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}`);
    lines.push(`📚 ថ្នាក់៖ ${currentClass?.name || 'ថ្នាក់រៀន'}`);
    lines.push(`📅 កាលបរិច្ឆេទ៖ ${formatKhmerDate(selectedDate, true)}`);
    lines.push(`⏰ វេន៖ ${sessionLabel} (ម៉ោង ${checkInTime} - ${checkOutTime})`);
    lines.push(`👨‍🏫 គ្រូបង្រៀន៖ ${settings?.teacherName || 'គ្រូបន្ទុកថ្នាក់'}${settings?.specialtySubject ? ` (${settings?.specialtySubject})` : ''}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
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
    lines.push(`📊 សរុបវត្តមានថ្ងៃនេះ៖`);
    lines.push(`• សរុបសិស្ស៖ ${total} នាក់`);
    lines.push(`• វត្តមាន (មក)៖ ${presentCount} នាក់`);
    lines.push(`• មានច្បាប់៖ ${permissionCount} នាក់`);
    lines.push(`• អវត្តមានឥតច្បាប់៖ ${absentCount} នាក់`);
    if (lateCount > 0) lines.push(`• មកយឺត៖ ${lateCount} នាក់`);
    if (unmarkedCount > 0) lines.push(`• មិនទាន់ស្រង់៖ ${unmarkedCount} នាក់`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📢 សូមប្រធានថ្នាក់ ឬសិស្សក្នុងថ្នាក់ផ្ទៀងផ្ទាត់វត្តមានឱ្យបានច្បាស់លាស់!`);

    return lines.join('\n');
  }, [
    settings,
    currentClass,
    selectedDate,
    sessionLabel,
    checkInTime,
    checkOutTime,
    classStudents,
    todayRecords,
    total,
    presentCount,
    permissionCount,
    absentCount,
    lateCount,
    unmarkedCount,
  ]);

  // Shareable direct link
  // Shareable direct link for students/monitor to record daily attendance
  const studentShareUrl = useMemo(() => {
    const origin = window.location.origin;
    const path = window.location.pathname;
    const classParam = currentClass ? encodeURIComponent(currentClass.id) : 'ALL';
    return `${origin}${path}?mode=student&class=${classParam}&date=${selectedDate}&session=${selectedSession}`;
  }, [currentClass, selectedDate, selectedSession]);

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
      await navigator.clipboard.writeText(studentShareUrl);
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
    const shortSummary = `📋 តារាងស្រង់វត្តមានប្រចាំថ្ងៃ ${currentClass?.name || 'ថ្នាក់រៀន'} (${sessionLabel})\n📅 ${formatKhmerDate(selectedDate, true)}\n👨‍🏫 គ្រូទទួលបន្ទុក៖ ${homeroom}\n📊 ស្ថិតិ៖ សរុប ${total} នាក់ | មក ${presentCount} | ច្បាប់ ${permissionCount} | អវត្តមាន ${absentCount}\n\n👉 សូមចុចតំណភ្ជាប់ខាងក្រោមដើម្បីស្រង់វត្តមានប្រចាំថ្ងៃ៖`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(studentShareUrl)}&text=${encodeURIComponent(shortSummary)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenStudentView = () => {
    window.open(studentShareUrl, '_blank', 'noopener,noreferrer');
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-3 border-t border-white/15 text-center text-xs">
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
            <div className="bg-slate-500/20 border border-slate-400/30 rounded-xl p-2 backdrop-blur-xs col-span-2 sm:col-span-1">
              <span className="text-slate-300 block text-[11px]">⏳ មិនទាន់ស្រង់</span>
              <span className="text-base font-black text-slate-200">{unmarkedCount}</span>
            </div>
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
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold">
                អត្ថបទរៀបចំរួចជាស្រេច អាចចម្លង ឬចុចផ្ញើទៅគ្រុបតេឡេក្រាមសិស្សភ្លាមៗ៖
              </span>
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                    <span className="text-emerald-700">ចម្លងរួចរាល់!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    <span>ចម្លងអត្ថបទ</span>
                  </>
                )}
              </button>
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
                  __html: generateStudentQRCodeSVG(studentShareUrl, 200),
                }}
                className="w-48 h-48 mx-auto"
              />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                QR Code សម្រាប់សិស្សស្កេនចូលស្រង់វត្តមានប្រចាំថ្ងៃ
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                សិស្ស ឬប្រធានថ្នាក់អាចស្កេន QR Code នេះដោយទូរស័ព្ទដៃ ដើម្បីបើកមើល និងផ្ទៀងផ្ទាត់វត្តមានប្រចាំថ្ងៃនៃថ្នាក់ {currentClass?.name || 'នេះ'}
              </p>
            </div>
          </div>
        )}

        {/* Direct Link sharing row */}
        <div className="bg-slate-100 p-3 rounded-xl flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 truncate min-w-0">
            <Link className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-slate-500 shrink-0 font-medium">តំណភ្ជាប់ស្រង់វត្តមាន៖</span>
            <span className="font-mono text-indigo-700 truncate select-all">{studentShareUrl}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300 transition-colors shrink-0 cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                <span className="text-emerald-700">ចម្លងរួច!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                <span>ចម្លង Link</span>
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
