import React, { useState, useEffect } from 'react';
import {
  CalendarCheck2,
  CalendarDays,
  GraduationCap,
  BookOpenCheck,
  FileSpreadsheet,
  Clock,
  Sliders,
  LayoutDashboard,
  MailWarning,
  Settings,
  Target,
  Award,
  ChevronRight,
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
  | 'teaching-plan-q1'
  | 'teaching-plan-q2'
  | 'teaching-plan-q3'
  | 'teaching-plan-1y'
  | 'teaching-plan-3y'
  | 'teaching-plan-6y'
  | 'grade-config'
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

export interface SubMenuItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface MenuSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: SubMenuItem[];
}

export const getSectionIdForTab = (tab: NavTab): string => {
  if (tab === 'dashboard' || tab === 'students') return 'general';
  if (tab === 'attendance' || tab === 'monthly-attendance') return 'attendance';
  if (tab === 'grades' || tab === 'continuous-assessment' || tab === 'grade-config') return 'grades';
  if (tab === 'teaching-plan' || tab.startsWith('teaching-plan-')) return 'teaching-plan';
  if (tab === 'timetable-teacher' || tab === 'letters') return 'schedule-letters';
  return 'general';
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  onOpenSettings,
  onRefreshSettings,
  settings,
}) => {
  const [stickerPickerType, setStickerPickerType] = useState<'school' | 'teacher' | null>(null);

  // Collapsible sub-menus state (Active section auto-expanded)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const activeSection = getSectionIdForTab(currentTab);
    return {
      [activeSection]: true,
    };
  });

  useEffect(() => {
    const activeSection = getSectionIdForTab(currentTab);
    setExpandedSections((prev) => ({
      ...prev,
      [activeSection]: true,
    }));
  }, [currentTab]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

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

  // Short, targeted titles for each main menu
  const menuSections: MenuSection[] = [
    {
      id: 'general',
      title: 'ព័ត៌មានទូទៅ',
      icon: LayoutDashboard,
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
      id: 'attendance',
      title: 'វត្តមាន',
      icon: CalendarCheck2,
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
      id: 'grades',
      title: 'ពិន្ទុ & វាយតម្លៃ',
      icon: GraduationCap,
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
          id: 'grade-config',
          label: 'កំណត់មេគុណ & ពិន្ទុ',
          icon: Sliders,
        },
      ],
    },
    {
      id: 'teaching-plan',
      title: 'ផែនការបង្រៀន',
      icon: Target,
      items: [
        {
          id: 'teaching-plan',
          label: 'តារាងផែនការបង្រៀន (ទូទៅ)',
          icon: Target,
        },
        {
          id: 'teaching-plan-q1',
          label: 'ផែនការត្រីមាសទី១',
          icon: CalendarCheck2,
        },
        {
          id: 'teaching-plan-q2',
          label: 'ផែនការត្រីមាសទី២',
          icon: CalendarCheck2,
        },
        {
          id: 'teaching-plan-q3',
          label: 'ផែនការត្រីមាសទី៣',
          icon: CalendarCheck2,
        },
        {
          id: 'teaching-plan-1y',
          label: 'ផែនការ ១ឆ្នាំ (ឆ្នាំទី១)',
          icon: Award,
        },
        {
          id: 'teaching-plan-3y',
          label: 'ផែនការ ៣ឆ្នាំ (ឆ្នាំទី៣)',
          icon: Award,
        },
        {
          id: 'teaching-plan-6y',
          label: 'ផែនការ ៦ឆ្នាំ (ឆ្នាំទី៦)',
          icon: Award,
        },
      ],
    },
    {
      id: 'schedule-letters',
      title: 'កាលវិភាគ & លិខិត',
      icon: Clock,
      items: [
        {
          id: 'timetable-teacher',
          label: settings?.teacherName ? `កាលវិភាគគ្រូ (${settings.teacherName})` : 'កាលវិភាគគ្រូបង្រៀន',
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
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-900/40 hover:scale-105 active:scale-95 transition-transform cursor-pointer overflow-hidden border-2 border-blue-400/40 hover:border-amber-400 ring-2 ring-blue-500/20"
            title="ចុចដើម្បីប្តូររូបភាព ឬ Sticker សាលារៀន"
          >
            {isSchoolImage ? (
              <img src={schoolLogo} alt="School Logo" className="w-full h-full object-cover rounded-full" />
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

        {/* Clean, Collapsible Navigation without Numbers, Sub-menus indented 1 Tab */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto scrollbar-thin">
          {menuSections.map((section) => {
            const SectionIcon = section.icon;
            const isSectionActive = section.items.some((item) => item.id === currentTab);
            const isExpanded = Boolean(expandedSections[section.id]);

            return (
              <div key={section.id} className="space-y-1">
                {/* Main Menu Header (Short, targeted title, No numbers, Rotating chevron) */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer text-left select-none ${
                    isSectionActive
                      ? 'bg-slate-800 text-white font-bold shadow-xs border border-slate-700/70'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white font-medium'
                  }`}
                  title={isExpanded ? `បិទមីនុយ ${section.title}` : `បើកមើលមីនុយ ${section.title}`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 transition-all ${
                        isSectionActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <SectionIcon className="w-4 h-4" />
                    </div>
                    <span className="truncate text-xs sm:text-sm tracking-wide">
                      {section.title}
                    </span>
                  </div>

                  {/* Clean rotating chevron indicator (NO number badge) */}
                  <div
                    className={`p-1 transition-transform duration-200 shrink-0 ${
                      isExpanded ? 'rotate-90 text-blue-400' : 'text-slate-500'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>

                {/* Sub-menus indented by 1 Tab (ចូលមួយTab: ml-5 pl-3 border-l-2) */}
                {isExpanded && (
                  <div className="ml-5 pl-3 border-l-2 border-slate-700/80 space-y-1 py-1 animate-fadeIn">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isItemActive = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelectTab(item.id);
                            onClose();
                          }}
                          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                            isItemActive
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-900/30'
                              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white font-medium'
                          }`}
                        >
                          <ItemIcon
                            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                              isItemActive ? 'text-white' : 'text-slate-400'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Teacher Profile & Settings Card (Clickable Sticker / Avatar) */}
        {onOpenSettings && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
            <div className="w-full flex items-center space-x-3 p-2 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 text-slate-200 transition-all shadow-xs text-left group">
              {/* Teacher Avatar / Sticker */}
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

              {/* Teacher Name */}
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
