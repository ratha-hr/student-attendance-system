import React from 'react';
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
} from 'lucide-react';
import type { ClassRoom } from '../types';

export type NavTab =
  | 'dashboard'
  | 'attendance'
  | 'monthly-attendance'
  | 'students'
  | 'grades'
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
}) => {
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
        {/* App Logo & Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center space-x-3 bg-slate-950/40">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-900/40">
            <BookOpenCheck className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden min-w-0">
            <h1 className="font-bold text-sm text-white truncate tracking-wide">
              គ្រប់គ្រងសិស្ស
            </h1>
            <p className="text-[11px] text-blue-400 truncate font-medium">
              {activeClass ? `ថ្នាក់ ${activeClass.name}` : 'គ្រប់ថ្នាក់ទាំងអស់'}
            </p>
          </div>
        </div>

        {/* Clean, Sectioned Menu Navigation without Numbers */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto scrollbar-thin">
          {menuSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {section.title && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-2 pb-1">
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

        {/* Settings & Backup Footer */}
        {onOpenSettings && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/30">
            <button
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer font-medium"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>ការកំណត់ & បម្រុងទុក</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
