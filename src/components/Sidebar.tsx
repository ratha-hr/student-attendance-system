import React from 'react';
import {
  CalendarCheck2,
  Users,
  MailWarning,
  CalendarDays,
  GraduationCap,
  BookOpenCheck,
  FileSpreadsheet,
  Calendar,
  Clock,
  Sliders,
} from 'lucide-react';
import type { ClassRoom } from '../types';

export type NavTab =
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

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeClass,
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const menuItems = [
    {
      id: 'attendance' as NavTab,
      label: '១. វត្តមានប្រចាំថ្ងៃ',
      icon: CalendarCheck2,
    },
    {
      id: 'monthly-attendance' as NavTab,
      label: '២. វត្តមានប្រចាំខែ',
      icon: CalendarDays,
    },
    {
      id: 'students' as NavTab,
      label: '៣. ព័ត៌មានសិស្ស (xlsm)',
      icon: FileSpreadsheet,
    },
    {
      id: 'grades' as NavTab,
      label: '៤. ពិន្ទុសិស្សប្រចាំខែ',
      icon: GraduationCap,
    },
    {
      id: 'grade-config' as NavTab,
      label: '៥. កំណត់មេគុណ & ពិន្ទុ',
      icon: Sliders,
    },
    {
      id: 'timetable-class' as NavTab,
      label: '៦. កាលវិភាគតាមថ្នាក់',
      icon: Calendar,
    },
    {
      id: 'timetable-teacher' as NavTab,
      label: '៧. កាលវិភាគគ្រូ (ហ៊ុន រដ្ឋា)',
      icon: Clock,
    },
    {
      id: 'letters' as NavTab,
      label: '៨. លិខិតព្រមាន (A4)',
      icon: MailWarning,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-56 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        {/* App Logo */}
        <div className="p-4 border-b border-slate-800 flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <BookOpenCheck className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm text-white truncate">
              គ្រប់គ្រងសិស្ស
            </h1>
            <p className="text-[11px] text-blue-400 truncate">
              {activeClass ? activeClass.name : 'ថ្នាក់រៀន'}
            </p>
          </div>
        </div>

        {/* 5 Simple Menu Items */}
        <nav className="flex-1 px-2.5 py-4 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Settings & Backup Footer */}
        {onOpenSettings && (
          <div className="p-2.5 border-t border-slate-800">
            <button
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span>⚙️</span>
              <span className="font-medium">ការកំណត់ & បម្រុងទុក</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
