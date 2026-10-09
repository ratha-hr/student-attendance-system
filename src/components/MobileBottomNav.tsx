import React from 'react';
import {
  CalendarCheck2,
  FileSpreadsheet,
  GraduationCap,
  Calendar,
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
      id: 'attendance' as NavTab,
      label: 'វត្តមាន',
      icon: CalendarCheck2,
    },
    {
      id: 'students' as NavTab,
      label: 'សិស្ស',
      icon: FileSpreadsheet,
    },
    {
      id: 'grades' as NavTab,
      label: 'ពិន្ទុ',
      icon: GraduationCap,
    },
    {
      id: 'timetable-class' as NavTab,
      label: 'កាលវិភាគ',
      icon: Calendar,
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
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-blue-600 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-colors ${
                isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">{tab.label}</span>
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
        <span className="text-[10px] mt-0.5">មីនុយ</span>
      </button>
    </div>
  );
};
