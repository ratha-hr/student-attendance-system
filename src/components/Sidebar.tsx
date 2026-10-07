import React from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CalendarCheck2,
  FileText,
  MailWarning,
  CalendarDays,
  Award,
  Clock,
  Settings,
  ChevronRight,
  BookOpenCheck,
} from 'lucide-react';
import type { ClassRoom } from '../types';

export type NavTab =
  | 'dashboard'
  | 'classes'
  | 'students'
  | 'attendance'
  | 'extracts'
  | 'letters'
  | 'annual-plan'
  | 'grades'
  | 'timetable'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeClass: ClassRoom | null;
  classesCount: number;
  studentsCount: number;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeClass,
  classesCount,
  studentsCount,
  isOpen,
  onClose,
}) => {
  const menuItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'ផ្ទាំងគ្រប់គ្រង (Dashboard)',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'classes' as NavTab,
      label: 'គ្រប់គ្រងថ្នាក់ (n ថ្នាក់)',
      icon: GraduationCap,
      badge: `${classesCount} ថ្នាក់`,
    },
    {
      id: 'students' as NavTab,
      label: 'ពត៌មានសិស្ស',
      icon: Users,
      badge: `${studentsCount} នាក់`,
    },
    {
      id: 'attendance' as NavTab,
      label: 'វត្តមានសិស្ស',
      icon: CalendarCheck2,
      badge: 'ប្រចាំថ្ងៃ/ខែ',
    },
    {
      id: 'extracts' as NavTab,
      label: 'សម្រង់អត្ថបទ & មេរៀន',
      icon: FileText,
      badge: null,
    },
    {
      id: 'letters' as NavTab,
      label: 'លិខិតផ្លូវការ (អវត្តមាន)',
      icon: MailWarning,
      badge: 'ព្រមាន/អញ្ជើញ',
      highlight: true,
    },
    {
      id: 'annual-plan' as NavTab,
      label: 'ផែនការគ្រូ ១ ឆ្នាំ',
      icon: CalendarDays,
      badge: 'ឆមាស ១-២',
    },
    {
      id: 'grades' as NavTab,
      label: 'ស្រង់ពិន្ទុ & ចំណាត់ថ្នាក់',
      icon: Award,
      badge: 'បន្ថែម',
    },
    {
      id: 'timetable' as NavTab,
      label: 'កាលវិភាគបង្រៀន',
      icon: Clock,
      badge: null,
    },
    {
      id: 'settings' as NavTab,
      label: 'ការកំណត់ & Backup',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        {/* App Logo & Header */}
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3 space-x-reverse">
          <div className="w-11 h-11 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <BookOpenCheck className="w-6 h-6 text-white" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-base text-white truncate tracking-wide">
              ប្រព័ន្ធគ្រប់គ្រងសិស្ស
            </h1>
            <p className="text-xs text-blue-400 font-medium truncate">
              សម្រាប់លោកគ្រូ-អ្នកគ្រូ
            </p>
          </div>
        </div>

        {/* Active Class Indicator Pill */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80">
          <div className="text-[11px] text-slate-400 flex items-center justify-between mb-1">
            <span>ថ្នាក់រៀនសកម្មបច្ចុប្បន្ន:</span>
            <span className="text-emerald-400 font-medium">កំពុងជ្រើស</span>
          </div>
          <div className="flex items-center justify-between bg-slate-800/70 rounded-lg px-3 py-1.5 border border-slate-700/50">
            <span className="font-bold text-sm text-amber-300 truncate">
              {activeClass ? activeClass.name : 'ថ្នាក់ទាំងអស់ (All Classes)'}
            </span>
            {activeClass?.room && (
              <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
                {activeClass.room}
              </span>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3 space-x-reverse min-w-0">
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      isActive ? 'text-white' : item.highlight ? 'text-amber-400' : 'text-slate-400 group-hover:text-blue-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ml-1.5 ${
                      isActive
                        ? 'bg-blue-700 text-blue-100'
                        : item.highlight
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">កំណែប្រែ v2.0 (Offline)</span>
            <span className="flex items-center text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
              ទិន្នន័យសុវត្ថិភាព
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
