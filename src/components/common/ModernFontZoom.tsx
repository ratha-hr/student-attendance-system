import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Check, Type, Minus, Plus } from 'lucide-react';

interface ModernFontZoomProps {
  className?: string;
}

interface FontOption {
  id: string;
  name: string;
  shortName: string;
  fontClass: string;
}

const FONT_OPTIONS: FontOption[] = [
  { id: 'font-kantumruy', name: 'កន្ទុមរុយ ប្រូ', shortName: 'កន្ទុមរុយ', fontClass: 'font-kantumruy' },
  { id: 'font-battambang', name: 'បាត់ដំបង', shortName: 'បាត់ដំបង', fontClass: 'font-battambang' },
  { id: 'font-siemreap', name: 'សៀមរាប', shortName: 'សៀមរាប', fontClass: 'font-siemreap' },
  { id: 'font-moul', name: 'អក្សរមូល', shortName: 'អក្សរមូល', fontClass: 'font-moul' },
];

const PERCENTAGE_PRESETS = [75, 85, 100, 115, 130, 150];

export const ModernFontZoom: React.FC<ModernFontZoomProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Scale percentage: 60% to 180% (default 100%)
  const [scale, setScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_font_scale_pct');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 60 && val <= 180) return val;
      }
    }
    return 100;
  });

  // Current Font Family (Default: Kantumruy Pro)
  const [currentFont, setCurrentFont] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_font_family');
      if (saved) return saved;
    }
    return 'font-kantumruy';
  });

  // Apply scale to root document
  const applyScale = (newScale: number) => {
    const clamped = Math.max(60, Math.min(180, newScale));
    setScale(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_font_scale_pct', clamped.toString());
      document.documentElement.style.fontSize = `${(16 * clamped) / 100}px`;
    }
  };

  // Apply font family across the whole application
  const applyFont = (fontId: string) => {
    setCurrentFont(fontId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_font_family', fontId);
      document.body.classList.remove('font-kantumruy', 'font-battambang', 'font-siemreap', 'font-moul');
      document.body.classList.add(fontId);
    }
  };

  // Sync font to document.body on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.classList.remove('font-kantumruy', 'font-battambang', 'font-siemreap', 'font-moul');
      document.body.classList.add(currentFont);
    }
  }, [currentFont]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const activeFontObj = FONT_OPTIONS.find((f) => f.id === currentFont) || FONT_OPTIONS[0];

  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      {/* Sleek Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs group ${
          isOpen
            ? 'bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-400/20 shadow-sm'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
        }`}
        title="កំណត់ទំហំ និងពុម្ពអក្សរ"
      >
        <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
          A
        </span>
        <span className="text-xs font-black font-mono text-slate-800">
          {scale}%
        </span>
        <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
          {activeFontObj.shortName}
        </span>
        <span className="text-[9px] text-slate-400 group-hover:text-slate-600">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Spacious, Airy, Minimalist Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-[340px] bg-white rounded-3xl shadow-2xl border border-slate-150 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-4 text-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                <Type className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 leading-tight">
                  ទំហំ និងពុម្ពអក្សរ
                </h4>
                <p className="text-[10px] text-slate-400">
                  កែសម្រួលការបង្ហាញទូទាំងប្រព័ន្ធ
                </p>
              </div>
            </div>

            {(scale !== 100 || currentFont !== 'font-kantumruy') && (
              <button
                type="button"
                onClick={() => {
                  applyScale(100);
                  applyFont('font-kantumruy');
                }}
                className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                title="កំណត់ឡើងវិញទម្រង់ដើម"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                ទម្រង់ដើម
              </button>
            )}
          </div>

          {/* Section 1: Font Scale (Minimalist Stepper & Preset Pills) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-700">ទំហំអក្សរ</span>
              <span className="text-xs font-mono font-black text-blue-600">
                {scale}%
              </span>
            </div>

            {/* Stepper with Large Percentage Display */}
            <div className="flex items-center justify-between bg-slate-50/80 rounded-2xl p-1.5 border border-slate-100">
              <button
                type="button"
                onClick={() => applyScale(scale - 5)}
                disabled={scale <= 60}
                className="w-10 h-10 rounded-xl bg-white hover:bg-blue-50 active:scale-95 disabled:opacity-30 text-slate-700 hover:text-blue-600 font-bold transition-all cursor-pointer shadow-2xs border border-slate-200/80 flex items-center justify-center"
                title="បង្រួមអក្សរ (-5%)"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="text-center px-4">
                <div className="text-lg font-black font-mono text-slate-800 tracking-tight">
                  {scale}%
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {scale === 100 ? 'ទំហំស្តង់ដារ' : scale > 100 ? 'ពង្រីកធំ' : 'បង្រួមតូច'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => applyScale(scale + 5)}
                disabled={scale >= 180}
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-30 text-white font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center"
                title="ពង្រីកអក្សរ (+5%)"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Clean Quick Preset Pills */}
            <div className="flex items-center justify-between gap-1 pt-0.5">
              {PERCENTAGE_PRESETS.map((pct) => {
                const isSelected = scale === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyScale(pct)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'bg-slate-100/80 hover:bg-slate-200/70 text-slate-700'
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Font Family Cards */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 px-1">
              ពុម្ពអក្សរខ្មែរ
            </span>

            <div className="grid grid-cols-2 gap-2">
              {FONT_OPTIONS.map((f) => {
                const isSelected = currentFont === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => applyFont(f.id)}
                    className={`p-2.5 rounded-2xl text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/80 border-2 border-blue-500 shadow-2xs'
                        : 'bg-slate-50/70 hover:bg-white border border-slate-200/70 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span
                        className={`text-base font-bold ${
                          isSelected ? 'text-blue-600' : 'text-slate-600'
                        } ${f.fontClass}`}
                      >
                        ក ខ គ
                      </span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-xs font-bold truncate ${
                        isSelected ? 'text-blue-900' : 'text-slate-800'
                      } ${f.fontClass}`}
                    >
                      {f.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
