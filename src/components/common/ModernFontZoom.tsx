import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Check } from 'lucide-react';

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
      {/* Sleek Trigger Pill Button with representative letters A± & % */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs group ${
          isOpen
            ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm ring-2 ring-blue-400/20'
            : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700 hover:text-slate-900'
        }`}
        title="ពង្រីក / បង្រួមទំហំអក្សរ និងប្តូរពុម្ពអក្សរ"
      >
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-white border border-slate-200 shadow-2xs group-hover:border-blue-300 font-serif font-black text-xs text-blue-600">
          A
        </div>
        <span className="text-xs font-black font-mono">
          {scale}%
        </span>
        <span className="text-[10px] text-blue-700 font-bold bg-blue-100/70 px-1.5 py-0.2 rounded hidden lg:inline">
          {activeFontObj.shortName}
        </span>
        <span className="text-[9px] text-slate-400 group-hover:text-slate-600">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Clean, Non-Messy Font Scale & Font Modal */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3 text-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center font-serif font-black text-xs">
                A±
              </div>
              <h4 className="text-xs font-black text-slate-800">
                ទំហំ និងពុម្ពអក្សរ
              </h4>
            </div>

            {scale !== 100 && (
              <button
                type="button"
                onClick={() => applyScale(100)}
                className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200/60"
                title="កំណត់ទំហំ 100% ដើមវិញ"
              >
                <RotateCcw className="w-2.5 h-2.5 mr-1" />
                100%
              </button>
            )}
          </div>

          {/* Section 1: Font Scale Percentages with representative letters A⁻ / A⁺ */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600">ភាគរយទំហំអក្សរ៖</span>
              <span className="text-xs font-black text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full font-mono">
                {scale}%
              </span>
            </div>

            {/* A⁻ and A⁺ Stepper Buttons with percentage center */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => applyScale(scale - 5)}
                disabled={scale <= 60}
                className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-40 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer border border-slate-200 shadow-2xs flex items-center justify-center gap-1.5"
                title="បង្រួមអក្សរ (-5%)"
              >
                <span className="font-serif font-black text-sm text-slate-600">A⁻</span>
                <span className="text-[11px]">បង្រួម</span>
              </button>

              <div className="px-3 py-1 bg-white border border-blue-300 rounded-xl text-center shadow-2xs font-mono font-black text-sm text-blue-700 min-w-[65px]">
                {scale}%
              </div>

              <button
                type="button"
                onClick={() => applyScale(scale + 5)}
                disabled={scale >= 180}
                className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                title="ពង្រីកអក្សរ (+5%)"
              >
                <span className="font-serif font-black text-sm text-white">A⁺</span>
                <span className="text-[11px]">ពង្រីក</span>
              </button>
            </div>

            {/* Quick 1-Tap Percentage Preset Pills */}
            <div className="grid grid-cols-6 gap-1 pt-0.5">
              {PERCENTAGE_PRESETS.map((pct) => {
                const isSelected = scale === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyScale(pct)}
                    className={`py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border text-center ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-black'
                        : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Font Family using representative letter "ក" (អក្សរតំណាង) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-600">
              ពុម្ពអក្សរ (Font Family) ៖
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {FONT_OPTIONS.map((f) => {
                const isSelected = currentFont === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => applyFont(f.id)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400/20 shadow-2xs'
                        : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {/* Representative Letter (អក្សរតំណាង) in that actual font */}
                    <div
                      className={`w-7 h-7 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-sm font-black shrink-0 ${
                        isSelected ? 'text-blue-600 border-blue-300' : 'text-slate-700'
                      } ${f.fontClass}`}
                    >
                      ក
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-blue-800' : 'text-slate-800'
                        } ${f.fontClass}`}
                      >
                        {f.shortName}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    )}
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
