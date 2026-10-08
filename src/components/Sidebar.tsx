import React from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CalendarCheck2,
  FileText,
  MailWarning,
  CalendarDays,
  Settings,
  BookOpenCheck,
} from 'lucide-react';
import type { ClassRoom } from '../types';

export type NavTab =
  | 'dashboard'
  | 'classes'
  | 'students'
  | 'attendance'
  | 'letters'
  | 'extracts'
  | 'annual-plan'
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
      label: 'ថ្នាក់រៀន (n ថ្នាក់)',
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
      id: 'extracts' as NavTab,
      label: 'សម្រង់អត្ថបទ',
      icon: FileText,
      badge: null,
    },
    {
      id: 'annual-plan' as NavTab,
      label: 'ផែនការគ្រូ ១ ឆ្នាំ',
      icon: CalendarDays,
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
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        {/* App Logo & Header */}
        <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-md">
            <BookOpenCheck className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm text-white truncate">
              ប្រព័ន្ធគ្រប់គ្រងសិស្ស
            </h1>
            <p className="text-[11px] text-blue-400 truncate">
              សម្រាប់លោកគ្រូ-អ្នកគ្រូ
            </p>
          </div>
        </div>

        {/* Active Class Switcher Pill */}
        <div className="px-3.5 py-2.5 bg-slate-950/50 border-b border-slate-800">
          <div className="text-[11px] text-slate-400 mb-1">ថ្នាក់កំពុងជ្រើស៖</div>
          <div className="bg-slate-800/80 rounded-lg px-2.5 py-1.5 text-xs font-bold text-amber-300 truncate">
            {activeClass ? activeClass.name : 'ថ្នាក់ទាំងអស់'}
          </div>
        </div>

        {/* Navigation List - Clean & Spaced */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : item.highlight ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ml-1.5 ${
                      isActive
                        ? 'bg-blue-700 text-blue-100'
                        : item.highlight
                        ? 'bg-amber-500/20 text-amber-300'
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

        {/* Simple Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 text-center">
          សាមញ្ញ ងាយស្រួល និងរហ័ស
        </div>
      </aside>
    </>
  );
};
