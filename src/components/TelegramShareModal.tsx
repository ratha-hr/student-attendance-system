import React, { useState } from 'react';
import { Send, Copy, Check, Share2, MessageSquare, AlertCircle } from 'lucide-react';
import { Modal } from './common/Modal';
import type { Student, ClassRoom, AttendanceRecord, TeacherSettings } from '../types';
import { toKhmerNum, formatKhmerDate, getTodayDateString } from '../utils/dateUtils';

interface TelegramShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClass: ClassRoom | null;
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  settings: TeacherSettings | null;
}

export const TelegramShareModal: React.FC<TelegramShareModalProps> = ({
  isOpen,
  onClose,
  currentClass,
  students,
  attendanceRecords,
  settings,
}) => {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [copied, setCopied] = useState(false);

  // Today's records for this class
  const classStudents = currentClass
    ? students.filter((s) => s.classId === currentClass.id)
    : students;

  const todayRecords = attendanceRecords.filter(
    (r) => r.date === selectedDate && (currentClass ? r.classId === currentClass.id : true)
  );

  const presentList = classStudents.filter(
    (s) => todayRecords.find((r) => r.studentId === s.id)?.status === 'present'
  );
  const permissionList = classStudents.filter(
    (s) => todayRecords.find((r) => r.studentId === s.id)?.status === 'permission'
  );
  const absentList = classStudents.filter(
    (s) => todayRecords.find((r) => r.studentId === s.id)?.status === 'absent'
  );
  const lateList = classStudents.filter(
    (s) => todayRecords.find((r) => r.studentId === s.id)?.status === 'late'
  );

  const total = classStudents.length;
  const presentCount = presentList.length;
  const permissionCount = permissionList.length;
  const absentCount = absentList.length;
  const lateCount = lateList.length;

  const rate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 0;

  // Generate Khmer telegram message
  let message = `📢 របាយការណ៍វត្តមានប្រចាំថ្ងៃ\n`;
  message += `🏫 សាលារៀន៖ ${settings?.schoolName || 'វិទ្យាល័យ'}\n`;
  message += `📚 ថ្នាក់៖ ${currentClass?.name || 'ថ្នាក់រៀន'}\n`;
  message += `📅 កាលបរិច្ឆេទ៖ ${formatKhmerDate(selectedDate, true)}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `👥 សិស្សសរុប៖ ${toKhmerNum(total)} នាក់\n`;
  message += `✅ មក (Present)៖ ${toKhmerNum(presentCount)} នាក់ (${toKhmerNum(rate)}%)\n`;
  message += `🟡 មានច្បាប់ (Permission)៖ ${toKhmerNum(permissionCount)} នាក់\n`;
  message += `❌ ឥតច្បាប់ (Absent)៖ ${toKhmerNum(absentCount)} នាក់\n`;
  if (lateCount > 0) {
    message += `🔵 មកយឺត (Late)៖ ${toKhmerNum(lateCount)} នាក់\n`;
  }
  message += `━━━━━━━━━━━━━━━━━━━━\n`;

  if (permissionList.length > 0) {
    message += `📋 បញ្ជីសិស្សសុំច្បាប់៖\n`;
    permissionList.forEach((s, idx) => {
      const rec = todayRecords.find((r) => r.studentId === s.id);
      message += `  ${toKhmerNum(idx + 1)}. ${s.nameKh}${rec?.reason ? ` (មូលហេតុ៖ ${rec.reason})` : ''}\n`;
    });
    message += `\n`;
  }

  if (absentList.length > 0) {
    message += `⚠️ បញ្ជីសិស្សអវត្តមានឥតច្បាប់៖\n`;
    absentList.forEach((s, idx) => {
      const rec = todayRecords.find((r) => r.studentId === s.id);
      message += `  ${toKhmerNum(idx + 1)}. ${s.nameKh}${rec?.reason ? ` (${rec.reason})` : ''}\n`;
    });
    message += `\n`;
  }

  message += `👨‍🏫 គ្រូបន្ទុកថ្នាក់៖ ${settings?.teacherName || 'លោកគ្រូ/អ្នកគ្រូ'}\n`;
  message += `📞 ទូរស័ព្ទ៖ ${settings?.phone || ''}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenTelegram = () => {
    const encoded = encodeURIComponent(message);
    window.open(`https://t.me/share/url?url=&text=${encoded}`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ផ្ញើរបាយការណ៍វត្តមានទៅ Telegram"
      subtitle="ផ្ញើទៅកាន់ Group ថ្នាក់រៀន ឬអាណាព្យាបាលដោយចុចតែម្តង"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Date Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-bold text-slate-700">កាលបរិច្ឆេទរបាយការណ៍៖</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
          />
        </div>

        {/* Message Preview Box */}
        <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto border border-slate-800 shadow-inner">
          {message}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                បានចម្លងរួចរាល់!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1.5" />
                ចម្លងសារ (Copy)
              </>
            )}
          </button>

          <button
            onClick={handleOpenTelegram}
            className="inline-flex items-center px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4 mr-2" />
            បើកផ្ញើតាម Telegram
          </button>
        </div>
      </div>
    </Modal>
  );
};
