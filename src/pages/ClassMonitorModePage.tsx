import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Send,
  Download,
  Calendar,
  Sparkles,
  Users,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, TeacherSettings, AttendanceStatus } from '../types';
import { db } from '../db/db';
import { toKhmerNum, formatKhmerDate, getTodayDateString } from '../utils/dateUtils';

interface ClassMonitorModePageProps {
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords: AttendanceRecord[];
  settings: TeacherSettings | null;
  selectedClassId: string;
  onRefresh: () => void;
}

export const ClassMonitorModePage: React.FC<ClassMonitorModePageProps> = ({
  students,
  classes,
  attendanceRecords,
  settings,
  selectedClassId,
  onRefresh,
}) => {
  const activeClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
  const currentClass = classes.find((c) => c.id === activeClassId);

  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [session, setSession] = useState<'morning' | 'afternoon'>('morning');

  const classStudents = students
    .filter((s) => s.classId === activeClassId)
    .sort((a, b) => a.rollNo - b.rollNo);

  // Fast record lookup
  const recordMap = new Map<string, AttendanceRecord>();
  attendanceRecords.forEach((r) => {
    if (r.classId === activeClassId && r.date === selectedDate && r.session === session) {
      recordMap.set(r.studentId, r);
    }
  });

  const handleSetStatus = async (studentId: string, status: AttendanceStatus) => {
    const existing = recordMap.get(studentId);
    if (existing) {
      await db.attendance.update(existing.id, { status });
    } else {
      await db.attendance.add({
        id: `att-${Date.now()}-${studentId}`,
        classId: activeClassId,
        studentId,
        date: selectedDate,
        session,
        status,
        createdAt: new Date().toISOString(),
      });
    }
    onRefresh();
  };

  const handleMarkAllPresent = async () => {
    const list: AttendanceRecord[] = classStudents.map((s) => {
      const existing = recordMap.get(s.id);
      return {
        id: existing?.id || `att-${Date.now()}-${s.id}`,
        classId: activeClassId,
        studentId: s.id,
        date: selectedDate,
        session,
        status: 'present' as AttendanceStatus,
        reason: existing?.reason || '',
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
    });
    await db.attendance.bulkPut(list);
    onRefresh();
  };

  // Generate Telegram text and share
  const handleShareTelegram = () => {
    const presentCount = classStudents.filter((s) => recordMap.get(s.id)?.status === 'present').length;
    const permissionStudents = classStudents.filter((s) => recordMap.get(s.id)?.status === 'permission');
    const absentStudents = classStudents.filter((s) => recordMap.get(s.id)?.status === 'absent');
    const lateStudents = classStudents.filter((s) => recordMap.get(s.id)?.status === 'late');

    let text = `📢 របាយការណ៍វត្តមានពីប្រធានថ្នាក់ (${currentClass?.name || 'ថ្នាក់រៀន'})\n`;
    text += `📅 កាលបរិច្ឆេទ៖ ${formatKhmerDate(selectedDate, true)} (${session === 'morning' ? 'វេនព្រឹក' : 'វេនរសៀល'})\n`;
    text += `👥 សិស្សសរុប៖ ${toKhmerNum(classStudents.length)} នាក់\n`;
    text += `✅ មក៖ ${toKhmerNum(presentCount)} នាក់\n`;
    text += `🟡 ច្បាប់៖ ${toKhmerNum(permissionStudents.length)} នាក់\n`;
    text += `❌ ឥតច្បាប់៖ ${toKhmerNum(absentStudents.length)} នាក់\n`;
    if (lateStudents.length > 0) text += `🔵 យឺត៖ ${toKhmerNum(lateStudents.length)} នាក់\n`;

    if (absentStudents.length > 0) {
      text += `\n⚠️ សិស្សអវត្តមានឥតច្បាប់៖\n`;
      absentStudents.forEach((s, idx) => {
        text += `  ${toKhmerNum(idx + 1)}. ${s.nameKh}\n`;
      });
    }

    if (permissionStudents.length > 0) {
      text += `\n🟡 សិស្សសុំច្បាប់៖\n`;
      permissionStudents.forEach((s, idx) => {
        text += `  ${toKhmerNum(idx + 1)}. ${s.nameKh}\n`;
      });
    }

    text += `\n(រាយការណ៍ជូនលោកគ្រូ/អ្នកគ្រូ៖ ${settings?.teacherName || ''})`;

    const encoded = encodeURIComponent(text);
    window.open(`https://t.me/share/url?url=&text=${encoded}`, '_blank');
  };

  const handleDownloadBackup = async () => {
    const jsonStr = await db.exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ទិន្នន័យវត្តមាន_${currentClass?.name?.replace(/\s+/g, '_')}_${selectedDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Top Banner for Mobile/Class Monitor */}
      <div className="bg-linear-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-6 h-6" />
            <div>
              <h2 className="text-base sm:text-lg font-bold">ផ្ទាំងប្រធានថ្នាក់ (Class Monitor Mode)</h2>
              <p className="text-xs text-emerald-100">ស្រង់វត្តមានងាយស្រួលលើទូរស័ព្ទដៃ រួចផ្ញើជូនលោកគ្រូ</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-bold">
            {currentClass?.name}
          </span>
        </div>
      </div>

      {/* Date & Quick Action Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
          />
          <select
            value={session}
            onChange={(e) => setSession(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
          >
            <option value="morning">🌅 ព្រឹក</option>
            <option value="afternoon">🌇 រសៀល</option>
          </select>
        </div>

        <button
          onClick={handleMarkAllPresent}
          className="inline-flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1" />
          មកទាំងអស់
        </button>
      </div>

      {/* Student List with Big Touch-Friendly Buttons */}
      <div className="space-y-2">
        {classStudents.map((stu, index) => {
          const rec = recordMap.get(stu.id);
          const status = rec?.status || 'present';

          return (
            <div
              key={stu.id}
              className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2"
            >
              <div className="min-w-0 flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {toKhmerNum(index + 1)}
                </span>
                <div className="truncate">
                  <p className="font-bold text-xs sm:text-sm text-slate-800 truncate">{stu.nameKh}</p>
                  <p className="text-[10px] text-slate-400">{stu.gender}</p>
                </div>
              </div>

              {/* Big Touch Buttons */}
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSetStatus(stu.id, 'present')}
                  className={`w-9 h-8 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    status === 'present'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                  title="មក"
                >
                  មក
                </button>

                <button
                  type="button"
                  onClick={() => handleSetStatus(stu.id, 'permission')}
                  className={`w-11 h-8 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    status === 'permission'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                  title="ច្បាប់"
                >
                  ច្បាប់
                </button>

                <button
                  type="button"
                  onClick={() => handleSetStatus(stu.id, 'absent')}
                  className={`w-11 h-8 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    status === 'absent'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                  title="ឥតច្បាប់"
                >
                  អត់
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Send to Teacher Bar */}
      <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3">
        <div>
          <p className="font-bold text-xs">ស្រង់វត្តមានរួចរាល់ហើយ?</p>
          <p className="text-[11px] text-slate-400">ផ្ញើរបាយការណ៍ជូនលោកគ្រូ</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadBackup}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            title="ទាញយក Backup (.json)"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleShareTelegram}
            className="inline-flex items-center px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/30 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4 mr-1.5" />
            ផ្ញើទៅ Telegram
          </button>
        </div>
      </div>
    </div>
  );
};
