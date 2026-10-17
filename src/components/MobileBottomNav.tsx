import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck2,
  FileSpreadsheet,
  GraduationCap,
  Calendar,
  BookOpenCheck,
  Menu,
} from 'lucide-react';
import type { NavTab } from './Sidebar';

interface MobileBottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMenu,
}) => {
  const tabs = [
    {
      id: 'dashboard' as NavTab,
      label: 'ផ្ទាំងដើម',
      icon: LayoutDashboard,
      color: 'text-indigo-600',
    },
    {
      id: 'attendance' as NavTab,
      label: 'វត្តមាន',
      icon: CalendarCheck2,
      color: 'text-emerald-600',
    },
    {
      id: 'students' as NavTab,
      label: 'សិស្ស',
      icon: FileSpreadsheet,
      color: 'text-blue-600',
    },
    {
      id: 'grades' as NavTab,
      label: 'ពិន្ទុ',
      icon: GraduationCap,
      color: 'text-purple-600',
    },
    {
      id: 'timetable-class' as NavTab,
      label: 'កាលវិភាគ',
      icon: Calendar,
      color: 'text-amber-600',
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around lg:hidden no-print shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
              isActive
                ? `${tab.color} font-black scale-105`
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isActive ? 'bg-slate-100 shadow-2xs' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        );
      })}

      {/* Menu Drawer button */}
      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-slate-900 transition-all cursor-pointer font-medium"
      >
        <div className="p-1 rounded-xl text-slate-500 hover:bg-slate-100">
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-xs font-bold mt-0.5">មីនុយ</span>
      </button>
    </div>
  );
};
