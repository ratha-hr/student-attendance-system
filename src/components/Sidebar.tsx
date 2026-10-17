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
  Target,
  User,
  School,
} from 'lucide-react';
import type { ClassRoom, TeacherSettings } from '../types';

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
  settings,
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
        {/* App Logo & Header: School Name & Academic Year (Moved from Navbar as requested) */}
        <div className="p-4 border-b border-slate-800/80 flex items-center space-x-3 bg-slate-950/40">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-900/40">
            <School className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden min-w-0">
            <h1
              className="font-bold text-xs sm:text-sm text-white truncate tracking-wide"
              title={settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}
            >
              {settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}
            </h1>
            <p className="text-[11px] text-blue-300 truncate font-semibold">
              ឆ្នាំសិក្សា {settings?.academicYear || '២០២៤-២០២៥'}
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

        {/* Teacher Profile & Settings Card (Moved from Navbar to bottom-left Sidebar as requested) */}
        {onOpenSettings && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
            <button
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
              className="w-full flex items-center space-x-3 p-2 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 text-slate-200 transition-all cursor-pointer group shadow-xs text-left"
              title="ការកំណត់ & បម្រុងទុកទិន្នន័យ"
            >
              <div className="w-9 h-9 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                {settings?.teacherName ? settings.teacherName.charAt(0) : <User className="w-4 h-4" />}
              </div>
              <div className="overflow-hidden min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate leading-tight group-hover:text-blue-300 transition-colors">
                  {settings?.teacherName || 'ហ៊ុន រដ្ឋា'}
                </p>
                <div className="flex items-center text-[10px] text-slate-400 space-x-1 mt-0.5">
                  <span className="truncate">ការកំណត់ & បម្រុងទុក</span>
                </div>
              </div>
              <Settings className="w-4 h-4 text-slate-400 group-hover:text-blue-400 group-hover:rotate-45 transition-all shrink-0" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
