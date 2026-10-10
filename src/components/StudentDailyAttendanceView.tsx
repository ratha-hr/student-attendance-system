import React, { useState, useMemo } from 'react';
import {
  CalendarCheck2,
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Sparkles,
  Users,
  Save,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  Send,
  Volume2,
  VolumeX,
  Search,
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, AttendanceStatus, TeacherSettings } from '../types';
import { db } from '../db/db';
import { toKhmerNum, fromKhmerNum, formatKhmerDate, getTodayDateString } from '../utils/dateUtils';
import { soundEffects } from '../utils/soundEffects';

interface StudentDailyAttendanceViewProps {
  classes: ClassRoom[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  settings: TeacherSettings | null;
  initialClassId?: string;
  initialDate?: string;
  initialSession?: 'morning' | 'afternoon';
  onExitStudentMode: () => void;
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
  onExitStudentMode,
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
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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

  // Today's attendance map
  const dailyRecordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords
      .filter(
        (r) =>
          r.classId === selectedClassId &&
          r.date === selectedDate &&
          r.session === selectedSession
      )
      .forEach((r) => map.set(r.studentId, r));
    return map;
  }, [attendanceRecords, selectedClassId, selectedDate, selectedSession]);

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

  // Mark single student status
  const handleSetStatus = async (studentId: string, status: AttendanceStatus) => {
    if (!currentClass) return;

    if (soundOn) {
      if (status === 'present') soundEffects.playPresentChime();
      else if (status === 'permission') soundEffects.playPermissionChime();
      else if (status === 'absent') soundEffects.playAbsentChime();
      else soundEffects.playClickChime();
    }

    const existing = dailyRecordMap.get(studentId);
    if (existing) {
      if (existing.status === status) {
        // Toggle off if already this status
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

  // Mark all present
  const handleMarkAllPresent = async () => {
    if (!currentClass || classStudents.length === 0) return;
    if (soundOn) soundEffects.playAllPresentChime();

    for (const stu of classStudents) {
      const existing = dailyRecordMap.get(stu.id);
      if (existing) {
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

    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);
    onRefresh();
  };

  // Copy student attendance link
  const handleCopyStudentLink = async () => {
    const origin = window.location.origin;
    const path = window.location.pathname;
    const url = `${origin}${path}?mode=student&class=${encodeURIComponent(selectedClassId)}&date=${selectedDate}&session=${selectedSession}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Share back to Telegram (Concise text with link to avoid 400 Bad Request)
  const handleShareToTelegram = () => {
    const origin = window.location.origin;
    const path = window.location.pathname;
    const link = `${origin}${path}?mode=student&class=${encodeURIComponent(selectedClassId)}&date=${selectedDate}&session=${selectedSession}`;
    const text = `📋 របាយការណ៍វត្តមានប្រចាំថ្ងៃ ${currentClass?.name || ''} (${selectedSession === 'morning' ? 'វេនព្រឹក' : 'វេនរសៀល'})
📅 ${formatKhmerDate(selectedDate, true)}
👨‍🏫 គ្រូទទួលបន្ទុក៖ ${currentClass?.homeroomTeacher || settings?.teacherName || 'លោកគ្រូ-អ្នកគ្រូ'}
📊 សរុប៖ ${stats.total} នាក់ | មក៖ ${stats.present} | ច្បាប់៖ ${stats.permission} | អវត្តមាន៖ ${stats.absent}

👉 ចូលមើលតារាងវត្តមានលម្អិត៖`;

    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased">
      {/* Top Banner (Student Mode Header) */}
      <header className="bg-linear-to-r from-violet-900 via-indigo-900 to-blue-950 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-yellow-300 shadow-inner">
              <CalendarCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-moul text-sm sm:text-base tracking-wide text-white">
                  តារាងស្រង់វត្តមានប្រចាំថ្ងៃ
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-violet-500/30 border border-violet-400/40 text-[10px] font-bold text-violet-200">
                  📱 សម្រាប់សិស្ស/ប្រធានថ្នាក់
                </span>
              </div>
              <p className="text-xs text-indigo-200 truncate">
                {settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'} • {currentClass?.name || 'ថ្នាក់រៀន'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setSoundOn(!soundOn)}
              className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title={soundOn ? 'បិទសំឡេង' : 'បើកសំឡេង'}
            >
              {soundOn ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
            </button>

            <button
              type="button"
              onClick={onExitStudentMode}
              className="inline-flex items-center px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="ត្រឡប់ទៅផ្ទាំងគ្រូបង្រៀន"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span>គណនីគ្រូ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto w-full px-3 sm:px-6 py-4 flex-1 space-y-4">
        {/* Class, Date, and Homeroom Teacher Info Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200/80 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Class Selector & Homeroom Teacher */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center space-x-1.5">
                <label className="text-xs font-bold text-slate-600">ថ្នាក់៖</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-black text-slate-800 cursor-pointer shadow-2xs focus:ring-2 focus:ring-indigo-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.homeroomTeacher ? `(${c.homeroomTeacher})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Homeroom Teacher Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900">
                <span>👨‍🏫 គ្រូទទួលបន្ទុក៖</span>
                <span className="font-black text-indigo-950">
                  {currentClass?.homeroomTeacher || settings?.teacherName || 'លោកគ្រូ-អ្នកគ្រូ'}
                </span>
              </div>
            </div>

            {/* Date and Session Picker */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs sm:text-sm font-bold text-slate-800 cursor-pointer shadow-2xs"
              />

              <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedSession('morning')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedSession === 'morning'
                      ? 'bg-white text-blue-700 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌅 ព្រឹក (7:00-11:00)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSession('afternoon')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedSession === 'afternoon'
                      ? 'bg-white text-amber-700 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌇 រសៀល (14:00-17:00)
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span className="font-medium">
              📅 {formatKhmerDate(selectedDate, true)}
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCopyStudentLink}
                className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                    <span className="text-emerald-700">ចម្លងតំណភ្ជាប់រួច!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    <span>ចម្លង Link ថ្នាក់នេះ</span>
                  </>
                )}
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleShareToTelegram}
                className="inline-flex items-center text-sky-600 hover:text-sky-800 font-bold hover:underline cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                <span>ផ្ញើ Telegram</span>
              </button>
            </div>
          </div>
        </div>

        {/* Daily Stats KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-bold block">👥 សិស្សសរុប</span>
            <span className="text-xl sm:text-2xl font-black text-slate-800 font-mono mt-0.5 block">{stats.total}</span>
          </div>

          <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200 shadow-2xs">
            <span className="text-xs text-emerald-700 font-bold block">✅ មក (Present)</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-0.5 block">{stats.present}</span>
          </div>

          <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 shadow-2xs">
            <span className="text-xs text-amber-700 font-bold block">🟡 មានច្បាប់</span>
            <span className="text-xl sm:text-2xl font-black text-amber-700 font-mono mt-0.5 block">{stats.permission}</span>
          </div>

          <div className="bg-rose-50/80 p-3 rounded-2xl border border-rose-200 shadow-2xs">
            <span className="text-xs text-rose-700 font-bold block">❌ ឥតច្បាប់</span>
            <span className="text-xl sm:text-2xl font-black text-rose-700 font-mono mt-0.5 block">{stats.absent}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-600 font-bold block">⏳ មិនទាន់ស្រង់</span>
            <span className="text-xl sm:text-2xl font-black text-slate-700 font-mono mt-0.5 block">{stats.unmarked}</span>
          </div>
        </div>

        {/* Search & Fast Action Toolbar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white font-black shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ទាំងអស់ ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('present')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === 'present'
                  ? 'bg-emerald-600 text-white font-black shadow-xs'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              🟢 មក ({stats.present})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('permission')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === 'permission'
                  ? 'bg-amber-500 text-white font-black shadow-xs'
                  : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
              }`}
            >
              🟡 ច្បាប់ ({stats.permission})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('absent')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === 'absent'
                  ? 'bg-rose-600 text-white font-black shadow-xs'
                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
              }`}
            >
              🔴 ឥតច្បាប់ ({stats.absent})
            </button>
            {stats.unmarked > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('unmarked')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  statusFilter === 'unmarked'
                    ? 'bg-slate-700 text-white font-black shadow-xs'
                    : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                ⚪ មិនទាន់ស្រង់ ({stats.unmarked})
              </button>
            )}
          </div>

          {/* Quick Mark All Present CTA */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              <span>កត់វត្តមាន (មក) ទាំងអស់</span>
            </button>
          </div>
        </div>

        {/* Live Saved Toast Feedback */}
        {isSavedToast && (
          <div className="bg-emerald-600 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between animate-fade-in">
            <span className="flex items-center">
              <Check className="w-4 h-4 mr-2" />
              បានកត់វត្តមាន (មក) ដល់សិស្សទាំងអស់ដោយជោគជ័យ!
            </span>
          </div>
        )}

        {/* Student Attendance List */}
        <div className="space-y-2">
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-slate-400 space-y-2 border border-slate-200">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-slate-600 text-sm">មិនមានទិន្នន័យសិស្សត្រូវតាមលក្ខខណ្ឌនេះទេ</p>
            </div>
          ) : (
            filteredStudents.map((stu, index) => {
              const rec = dailyRecordMap.get(stu.id);
              const currentStatus = rec?.status || null;

              return (
                <div
                  key={stu.id}
                  className={`bg-white rounded-2xl p-3 sm:p-4 border transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    currentStatus === 'present'
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : currentStatus === 'permission'
                      ? 'border-amber-200 bg-amber-50/20'
                      : currentStatus === 'absent'
                      ? 'border-rose-200 bg-rose-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Left: Student Identity */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-mono font-black text-xs sm:text-sm flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-slate-900 truncate">
                          {stu.nameKh}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            stu.gender === 'ស្រី'
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {stu.gender}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        {fromKhmerNum(stu.studentCode)}
                      </p>
                    </div>
                  </div>

                  {/* Right: Quick Action Attendance Buttons */}
                  <div className="flex items-center space-x-1.5 self-end sm:self-auto shrink-0">
                    {/* មក */}
                    <button
                      type="button"
                      onClick={() => handleSetStatus(stu.id, 'present')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center space-x-1 ${
                        currentStatus === 'present'
                          ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500 font-black'
                          : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>មក</span>
                    </button>

                    {/* ច្បាប់ */}
                    <button
                      type="button"
                      onClick={() => handleSetStatus(stu.id, 'permission')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center space-x-1 ${
                        currentStatus === 'permission'
                          ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-400 font-black'
                          : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>ច្បាប់</span>
                    </button>

                    {/* អវត្តមាន */}
                    <button
                      type="button"
                      onClick={() => handleSetStatus(stu.id, 'absent')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center space-x-1 ${
                        currentStatus === 'absent'
                          ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-500 font-black'
                          : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>អវត្តមាន</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        <p>ប្រព័ន្ធគ្រប់គ្រងវត្តមានសិស្ស • រៀបចំស្រង់វត្តមានប្រចាំថ្ងៃងាយស្រួល និងរហ័ស</p>
      </footer>
    </div>
  );
};
