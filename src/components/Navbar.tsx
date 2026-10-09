import React, { useState, useEffect, useMemo } from 'react';
import { Menu, School, User, Calendar, Plus, Settings, Clock } from 'lucide-react';
import type { ClassRoom, TeacherSettings } from '../types';
import { formatKhmerDate, getTodayDateString, toKhmerNum } from '../utils/dateUtils';
import { groupClassesByGrade } from '../utils/classUtils';

interface NavbarProps {
  onToggleSidebar: () => void;
  classes: ClassRoom[];
  selectedClassId: string;
  onSelectClass: (classId: string) => void;
  settings: TeacherSettings | null;
  onOpenSettings: () => void;
  onOpenManageClasses?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  classes,
  selectedClassId,
  onSelectClass,
  settings,
  onOpenSettings,
  onOpenManageClasses,
}) => {
  const todayKhmer = formatKhmerDate(getTodayDateString(), true);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Live Khmer Clock with digital seconds
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'រសៀល' : 'ព្រឹក';
      if (hours > 12) hours -= 12;
      if (hours === 0) hours = 12;
      setCurrentTime(`${toKhmerNum(hours)}:${toKhmerNum(mins)}:${toKhmerNum(secs)} ${ampm}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const gradeGroups = useMemo(() => groupClassesByGrade(classes), [classes]);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 2xl:px-8 py-3 no-print">
      <div className="flex items-center justify-between gap-4">
        {/* Left side: Hamburger button + School Name */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden cursor-pointer"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center space-x-2 text-slate-700">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <School className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-slate-800 leading-tight truncate max-w-[260px]">
                {settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                ឆ្នាំសិក្សា {settings?.academicYear || '២០២៤-២០២៥'}
              </p>
            </div>
          </div>
        </div>

        {/* Center / Class Switcher Dropdown (Organized by Grade, Rooms/Buildings Removed) */}
        <div className="flex items-center space-x-2">
          <label htmlFor="class-select" className="hidden md:inline-block text-xs font-semibold text-slate-500 whitespace-nowrap">
            ជ្រើសរើសថ្នាក់៖
          </label>
          <div className="relative flex items-center space-x-1.5">
            <select
              id="class-select"
              value={selectedClassId}
              onChange={(e) => onSelectClass(e.target.value)}
              className="bg-slate-50 border border-slate-300 hover:border-blue-500 text-slate-800 text-xs sm:text-sm font-bold rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block px-3 py-1.5 sm:py-2 transition-all cursor-pointer shadow-xs max-w-[210px] sm:max-w-xs truncate"
            >
              <option value="ALL">🌟 ថ្នាក់ទាំងអស់ ({toKhmerNum(classes.length)})</option>
              {gradeGroups.map((group) => (
                <optgroup key={group.grade} label={`── ${group.label} (${toKhmerNum(group.classes.length)}) ──`}>
                  {group.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      📚 {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {onOpenManageClasses && (
              <button
                type="button"
                onClick={onOpenManageClasses}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 sm:py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs sm:text-sm rounded-xl border border-blue-200 transition-colors cursor-pointer shadow-2xs shrink-0"
                title="គ្រប់គ្រងថ្នាក់ (បន្ថែម បន្ថយ ឬកែប្រែថ្នាក់)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">គ្រប់គ្រងថ្នាក់</span>
              </button>
            )}
          </div>
        </div>

        {/* Right side: Sleek Clock Widget & Settings Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Enhanced Live Clock & Date Widget (រូបទី១៖ កែសម្រួលឱ្យស្អាត លុបដំឡើងកម្មវិធី refresh share) */}
          {currentTime && (
            <div className="flex items-center space-x-2 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-linear-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200/90 rounded-2xl shadow-2xs">
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute opacity-75" />
                <span className="w-2 h-2 rounded-full bg-emerald-600 relative" />
              </div>
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-bold text-xs sm:text-sm text-blue-950 font-mono tracking-tight whitespace-nowrap">
                {currentTime}
              </span>
              <span className="hidden xl:inline text-blue-300 font-bold">|</span>
              <span className="hidden xl:inline text-xs font-bold text-slate-600 whitespace-nowrap">
                <Calendar className="w-3.5 h-3.5 text-blue-500 inline-block mr-1 -mt-0.5" />
                {todayKhmer}
              </span>
            </div>
          )}

          {/* Settings button & Teacher Profile */}
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-2 pl-2 border-l border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
            title="ការកំណត់ & បម្រុងទុកទិន្នន័យ"
          >
            <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {settings?.teacherName ? settings.teacherName.charAt(0) : <User className="w-4 h-4" />}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {settings?.teacherName || 'ហ៊ុន រដ្ឋា'}
              </p>
              <div className="flex items-center text-[10px] text-slate-400 space-x-1">
                <span>គ្រូបង្រៀន</span>
                <Settings className="w-2.5 h-2.5 text-slate-400" />
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
