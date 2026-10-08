import React, { useState } from 'react';
import { Menu, School, User, Calendar, PlusCircle, Share2, Check } from 'lucide-react';
import type { ClassRoom, TeacherSettings } from '../types';
import { formatKhmerDate, getTodayDateString } from '../utils/dateUtils';
import type { NavTab } from './Sidebar';

interface NavbarProps {
  onToggleSidebar: () => void;
  classes: ClassRoom[];
  selectedClassId: string;
  onSelectClass: (classId: string) => void;
  settings: TeacherSettings | null;
  onNavigate: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  classes,
  selectedClassId,
  onSelectClass,
  settings,
  onNavigate,
}) => {
  const todayKhmer = formatKhmerDate(getTodayDateString(), true);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyShareLink = () => {
    const shareUrl = 'https://ratha-hr.github.io/student-attendance-system/';
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 no-print">
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
              <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[220px]">
                {settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន'}
              </p>
              <p className="text-[11px] text-slate-400">
                ឆ្នាំសិក្សា {settings?.academicYear || '២០២៤-២០២៥'}
              </p>
            </div>
          </div>
        </div>

        {/* Center / Class Switcher Dropdown */}
        <div className="flex items-center space-x-2">
          <label htmlFor="class-select" className="hidden md:inline-block text-xs font-semibold text-slate-500 whitespace-nowrap">
            ជ្រើសរើសថ្នាក់៖
          </label>
          <div className="relative">
            <select
              id="class-select"
              value={selectedClassId}
              onChange={(e) => onSelectClass(e.target.value)}
              className="bg-slate-50 border border-slate-300 hover:border-blue-500 text-slate-800 text-xs sm:text-sm font-semibold rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block px-3 py-1.5 sm:py-2 transition-all cursor-pointer shadow-xs"
            >
              <option value="ALL">🌟 ថ្នាក់ទាំងអស់ (All Classes)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  📚 {c.name} {c.room ? `(${c.room})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right side: Share Link, Attendance button & Teacher Badge */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Today Date Pill */}
          <div className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs text-slate-600 font-medium">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{todayKhmer}</span>
          </div>

          {/* Quick Action: Share Link to Students / Class Monitor */}
          <button
            onClick={handleCopyShareLink}
            className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="ចុចដើម្បីចម្លង Link ផ្ញើឱ្យប្រធានថ្នាក់ ឬសិស្ស"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-emerald-600" />}
            <span className="hidden xs:inline">{copiedLink ? 'បានចម្លង Link!' : 'Link ផ្ញើឱ្យសិស្ស'}</span>
          </button>

          {/* Quick Action: Take Attendance */}
          <button
            onClick={() => onNavigate('attendance')}
            className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium shadow-xs shadow-blue-500/30 transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>កត់វត្តមាន</span>
          </button>

          {/* Teacher Profile Avatar */}
          <div
            onClick={() => onNavigate('settings')}
            className="flex items-center space-x-2 pl-2 border-l border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
            title="ការកំណត់គ្រូបង្រៀន"
          >
            <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {settings?.teacherName ? settings.teacherName.charAt(0) : <User className="w-4 h-4" />}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {settings?.teacherName || 'លោកគ្រូ'}
              </p>
              <p className="text-[10px] text-slate-400">គ្រូបង្រៀន</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
