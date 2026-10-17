import React, { useState } from 'react';
import {
  CalendarCheck2,
  CalendarDays,
  GraduationCap,
  BookOpenCheck,
  FileSpreadsheet,
  Calendar,
  Clock,
  Sliders,
  LayoutDashboard,
  MailWarning,
  Settings,
  Target,
  User,
  School,
} from 'lucide-react';
import type { ClassRoom, TeacherSettings } from '../types';
import { StickerPickerModal } from './common/StickerPickerModal';
import { db } from '../db/db';

export type NavTab =
  | 'dashboard'
  | 'attendance'
  | 'monthly-attendance'
  | 'students'
  | 'grades'
  | 'continuous-assessment'
  | 'teaching-plan'
  | 'grade-config'
  | 'timetable-class'
  | 'timetable-teacher'
  | 'letters';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeClass: ClassRoom | null;
  classesCount: number;
  studentsCount: number;
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
  onRefreshSettings?: () => void;
  settings?: TeacherSettings | null;
}

interface MenuItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeClass,
  isOpen,
  onClose,
  onOpenSettings,
  onRefreshSettings,
  settings,
}) => {
  const [stickerPickerType, setStickerPickerType] = useState<'school' | 'teacher' | null>(null);

  const handleSelectSticker = async (val: string) => {
    if (stickerPickerType === 'school') {
      await db.updateSettings({ schoolLogo: val });
    } else if (stickerPickerType === 'teacher') {
      await db.updateSettings({ teacherAvatar: val });
    }
    onRefreshSettings?.();
  };

  const schoolLogo = settings?.schoolLogo || '🏫';
  const isSchoolImage = schoolLogo.startsWith('data:image') || schoolLogo.startsWith('http');

  const teacherAvatar = settings?.teacherAvatar || '👨‍🏫';
  const isTeacherImage = teacherAvatar.startsWith('data:image') || teacherAvatar.startsWith('http');

  const menuSections: MenuSection[] = [
    {
      title: 'ទូទៅ & ស្ថិតិសង្ខេប',
      items: [
        {
          id: 'dashboard',
          label: 'ផ្ទាំងសង្ខេប & ស្ថិតិ',
          icon: LayoutDashboard,
        },
        {
          id: 'students',
          label: 'ព័ត៌មានសិស្ស (xlsm)',
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      title: 'ការគ្រប់គ្រងវត្តមាន',
      items: [
        {
          id: 'attendance',
          label: 'វត្តមានប្រចាំថ្ងៃ',
          icon: CalendarCheck2,
        },
        {
          id: 'monthly-attendance',
          label: 'វត្តមានប្រចាំខែ',
          icon: CalendarDays,
        },
      ],
    },
    {
      title: 'ការសិក្សា & ពិន្ទុ',
      items: [
        {
          id: 'grades',
          label: 'ពិន្ទុសិស្សប្រចាំខែ',
          icon: GraduationCap,
        },
        {
          id: 'continuous-assessment',
          label: 'ពិន្ទុវត្តមាន & វាយតម្លៃ (៣០%)',
          icon: BookOpenCheck,
        },
        {
          id: 'teaching-plan',
          label: 'តារាងផែនការគ្រូ',
          icon: Target,
        },
        {
          id: 'grade-config',
          label: 'កំណត់មេគុណ & ពិន្ទុ',
          icon: Sliders,
        },
      ],
    },
    {
      title: 'កាលវិភាគ & លិខិត',
      items: [
        {
          id: 'timetable-class',
          label: 'កាលវិភាគតាមថ្នាក់',
          icon: Calendar,
        },
        {
          id: 'timetable-teacher',
          label: 'កាលវិភាគគ្រូ (ហ៊ុន រដ្ឋា)',
          icon: Clock,
        },
        {
          id: 'letters',
          label: 'លិខិតព្រមាន (A4)',
          icon: MailWarning,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800/80 text-slate-100 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        {/* App Logo & Header: School Name & Academic Year (Clickable Sticker/Logo) */}
        <div className="p-4 border-b border-slate-800/80 flex items-center space-x-3 bg-slate-950/40">
          <button
            type="button"
            onClick={() => setStickerPickerType('school')}
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-900/40 hover:scale-105 active:scale-95 transition-transform cursor-pointer overflow-hidden border border-blue-400/30 hover:border-amber-400"
            title="ចុចដើម្បីប្តូររូបភាព ឬ Sticker សាលារៀន"
          >
            {isSchoolImage ? (
              <img src={schoolLogo} alt="School Logo" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span className="text-2xl leading-none select-none">{schoolLogo}</span>
            )}
          </button>
          <div className="overflow-hidden min-w-0 flex-1">
            <h1
              className="font-bold text-xs sm:text-sm text-white truncate tracking-wide"
              title={settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}
            >
              {settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}
            </h1>
            <p className="text-[11px] text-blue-300 truncate font-semibold">
              ឆ្នាំសិក្សា {settings?.academicYear || '២០២៦-២០២៧'}
            </p>
          </div>
        </div>

        {/* Clean, Sectioned Menu Navigation without Numbers */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto scrollbar-thin">
          {menuSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {section.title && (
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 pt-2 pb-1">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer text-left ${
                      isActive
                        ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-900/30'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white font-medium'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Teacher Profile & Settings Card (Removed 'ការកំណត់' text as requested, Clickable Sticker) */}
        {onOpenSettings && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
            <div className="w-full flex items-center space-x-3 p-2 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 text-slate-200 transition-all shadow-xs text-left group">
              {/* Teacher Avatar / Sticker (Clickable to change sticker/photo) */}
              <button
                type="button"
                onClick={() => setStickerPickerType('teacher')}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs hover:scale-110 active:scale-95 transition-transform cursor-pointer overflow-hidden border border-blue-400/30 hover:border-amber-400"
                title="ចុចដើម្បីប្តូររូបភាព ឬ Sticker គ្រូបង្រៀន"
              >
                {isTeacherImage ? (
                  <img src={teacherAvatar} alt="Teacher Avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-2xl leading-none select-none">{teacherAvatar}</span>
                )}
              </button>

              {/* Teacher Name (Clickable to open Settings) */}
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  onClose();
                }}
                className="overflow-hidden min-w-0 flex-1 text-left cursor-pointer py-1"
                title="ចុចដើម្បីបើកការកំណត់"
              >
                <p className="text-xs sm:text-sm font-bold text-white truncate leading-tight group-hover:text-blue-300 transition-colors">
                  {settings?.teacherName || 'ហ៊ុន រដ្ឋា'}
                </p>
              </button>

              {/* Settings Gear Icon */}
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  onClose();
                }}
                className="p-1.5 text-slate-400 group-hover:text-blue-400 group-hover:rotate-45 transition-all shrink-0 cursor-pointer hover:bg-slate-700/50 rounded-lg"
                title="ការកំណត់"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Interactive Sticker & Photo Picker Modal for School / Teacher */}
      <StickerPickerModal
        isOpen={stickerPickerType !== null}
        onClose={() => setStickerPickerType(null)}
        type={stickerPickerType || 'teacher'}
        title={stickerPickerType === 'school' ? 'ជ្រើសរើសរូបតំណាង ឬ Sticker សាលារៀន' : 'ជ្រើសរើសរូបតំណាង ឬ Sticker គ្រូបង្រៀន'}
        subtitle={stickerPickerType === 'school' ? 'ជ្រើសរើសរូប Sticker សាលា ឬបញ្ចូលរូបសញ្ញាសាលាផ្ទាល់ខ្លួន' : 'ជ្រើសរើសរូប Sticker គ្រូ ឬបញ្ចូលរូបថតផ្ទាល់ខ្លួន'}
        currentValue={stickerPickerType === 'school' ? schoolLogo : teacherAvatar}
        onSelect={handleSelectSticker}
      />
    </>
  );
};
