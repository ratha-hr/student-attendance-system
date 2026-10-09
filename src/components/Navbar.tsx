import React, { useState, useEffect } from 'react';
import { Menu, School, User, Calendar, Share2, Check, Plus, Settings, Clock, Smartphone, RefreshCw } from 'lucide-react';
import type { ClassRoom, TeacherSettings } from '../types';
import { formatKhmerDate, getTodayDateString, toKhmerNum } from '../utils/dateUtils';

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
  const [copiedLink, setCopiedLink] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Live Khmer Clock
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

  // Listen for PWA Install Prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleCopyShareLink = () => {
    const shareUrl = 'https://ratha-hr.github.io/student-attendance-system/';
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

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

        {/* Center / Class Switcher Dropdown */}
        <div className="flex items-center space-x-2">
          <label htmlFor="class-select" className="hidden md:inline-block text-xs font-semibold text-slate-500 whitespace-nowrap">
            ជ្រើសរើសថ្នាក់៖
          </label>
          <div className="relative flex items-center space-x-1.5">
            <select
              id="class-select"
              value={selectedClassId}
              onChange={(e) => onSelectClass(e.target.value)}
              className="bg-slate-50 border border-slate-300 hover:border-blue-500 text-slate-800 text-xs sm:text-sm font-semibold rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block px-3 py-1.5 sm:py-2 transition-all cursor-pointer shadow-xs"
            >
              <option value="ALL">🌟 ថ្នាក់ទាំងអស់ ({classes.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  📚 {c.name} {c.room ? `(${c.room})` : ''}
                </option>
              ))}
            </select>
            {onOpenManageClasses && (
              <button
                type="button"
                onClick={onOpenManageClasses}
                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors cursor-pointer"
                title="បន្ថែមថ្នាក់ថ្មី (+ថ្នាក់)"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right side: Share Link & Settings Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Live Khmer Clock */}
          {currentTime && (
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-blue-50/80 border border-blue-200/60 rounded-xl text-xs sm:text-sm font-black text-blue-900 shadow-2xs">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-mono">{currentTime}</span>
            </div>
          )}

          {/* Today Date Pill */}
          <div className="hidden 2xl:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs text-slate-600 font-medium">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{todayKhmer}</span>
          </div>

          {/* PWA Install Button */}
          {installPrompt && (
            <button
              onClick={handleInstallPWA}
              className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer animate-pulse"
              title="ដំឡើងកម្មវិធីលើទូរស័ព្ទ ឬកុំព្យូទ័រ (Install App)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>ដំឡើង App</span>
            </button>
          )}


          {/* Quick Action: Refresh App to bypass cache */}
          <button
            onClick={() => {
              if ('caches' in window) {
                caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
              }
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
              }
              window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
            }}
            className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="ចុចដើម្បី Refresh កម្មវិធី និងទាញយកកំណែថ្មីចុងក្រោយបំផុត (Clear Cache & Update)"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden md:inline">Refresh កម្មវិធី</span>
          </button>

          {/* Quick Action: Share Link to Students / Class Monitor */}
          <button
            onClick={handleCopyShareLink}
            className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="ចុចដើម្បីចម្លង Link ផ្ញើឱ្យប្រធានថ្នាក់ ឬសិស្ស"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-emerald-600" />}
            <span className="hidden xs:inline">{copiedLink ? 'បានចម្លង Link!' : 'Link ផ្ញើឱ្យសិស្ស'}</span>
          </button>

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
