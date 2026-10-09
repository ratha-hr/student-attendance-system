import React, { useState, useEffect, useMemo } from 'react';
import { Menu, School, User, Plus, Settings, Clock, Sparkles } from 'lucide-react';
import type { ClassRoom, TeacherSettings } from '../types';
import {
  toKhmerNum,
  getKhmerLunarDate,
  getKhmerSolarDate,
  formatUniversalTime,
  type KhmerLunarInfo,
  type KhmerSolarInfo,
} from '../utils/dateUtils';
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
  // Live Universal International Time (ម៉ោងសកល - 00:00:00)
  const [universalTime, setUniversalTime] = useState<{
    time24: string;
    time12: string;
    period: 'AM' | 'PM';
    khmerPeriod: 'ព្រឹក' | 'រសៀល';
  }>(() => formatUniversalTime(new Date()));

  const [use24hFormat, setUse24hFormat] = useState<boolean>(true);

  // Both Khmer Lunar (ចន្ទគតិ) and Solar (សុរិយគតិ) calendars
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setUniversalTime(formatUniversalTime(now));
      // Update date object at midnight if day changed
      if (now.getDate() !== currentDate.getDate()) {
        setCurrentDate(now);
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [currentDate]);

  const lunarInfo: KhmerLunarInfo = useMemo(() => getKhmerLunarDate(currentDate), [currentDate]);
  const solarInfo: KhmerSolarInfo = useMemo(() => getKhmerSolarDate(currentDate), [currentDate]);


  const gradeGroups = useMemo(() => groupClassesByGrade(classes), [classes]);

  return (
    <header className="sticky top-0 z-30 no-print">
      {/* Official Top Ribbon: Dual Khmer Lunar & Solar Calendar + Universal Standard Time */}
      <div className="bg-gradient-to-r from-[#001a44] via-[#092e62] to-[#001a44] text-white px-3 sm:px-6 py-1.5 text-[11px] sm:text-xs flex flex-wrap items-center justify-between gap-2 border-b border-blue-900/60 shadow-xs">
        {/* Dual Calendar: Khmer Lunar (ចន្ទគតិ) & Solar (សុរិយគតិ) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-kantumruy">
          {/* Khmer Lunar Calendar (ចន្ទគតិ) */}
          <div
            className="flex items-center space-x-1.5 text-amber-200 font-bold bg-amber-950/40 px-2.5 py-0.5 rounded-lg border border-amber-500/30 shadow-2xs"
            title="ប្រតិទិនចន្ទគតិខ្មែរផ្លូវការ"
          >
            <span className="text-amber-400">🌙</span>
            <span className="text-amber-300 font-bold hidden sm:inline">ចន្ទគតិ៖</span>
            <span className="tracking-wide">{lunarInfo.fullLunarStr}</span>
          </div>

          {/* Solar Calendar (សុរិយគតិ) */}
          <div
            className="flex items-center space-x-1.5 text-blue-100 font-bold bg-blue-950/40 px-2.5 py-0.5 rounded-lg border border-blue-400/30 shadow-2xs"
            title="ប្រតិទិនសុរិយគតិ"
          >
            <span className="text-sky-300">☀️</span>
            <span className="text-blue-200 font-bold hidden sm:inline">សុរិយគតិ៖</span>
            <span>{solarInfo.fullSolarStr}</span>
          </div>
        </div>

        {/* Universal Standard Time Clock (ម៉ោងសកល) */}
        <button
          type="button"
          onClick={() => setUse24hFormat(!use24hFormat)}
          className="flex items-center space-x-2 font-mono font-black text-emerald-300 bg-black/40 hover:bg-black/60 px-2.5 py-0.5 rounded-lg border border-emerald-400/30 cursor-pointer transition-colors shadow-2xs select-none"
          title="ចុចដើម្បីប្តូររវាងម៉ោង ២៤ម៉ោង ឬ AM/PM (ម៉ោងសកល)"
        >
          <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[10px] text-slate-300 font-kantumruy font-bold mr-0.5 hidden md:inline">
            ម៉ោងសកល៖
          </span>
          <span className="tracking-widest text-xs sm:text-sm text-white font-mono">
            {use24hFormat ? universalTime.time24 : universalTime.time12}
          </span>
          <span className="text-[9px] text-emerald-300 bg-emerald-950/70 px-1 py-0.2 rounded border border-emerald-500/40 font-bold">
            {use24hFormat ? '24H' : universalTime.period}
          </span>
        </button>
      </div>

      {/* Main Navigation Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 2xl:px-8 py-2.5 flex items-center justify-between gap-4 shadow-xs">
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

        {/* Right side: Settings Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
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
