import React, { useState, useEffect, useRef } from 'react';
import { Type, Minus, Plus, RotateCcw, Check, Sparkles } from 'lucide-react';
import { toKhmerNum } from '../../utils/dateUtils';

interface ModernFontZoomProps {
  className?: string;
}

interface FontOption {
  id: string;
  name: string;
  sub: string;
  fontClass: string;
}

const FONT_OPTIONS: FontOption[] = [
  { id: 'font-kantumruy', name: 'កន្ទុមរុយ ប្រូ', sub: 'Kantumruy Pro (ស្តង់ដារ)', fontClass: 'font-kantumruy' },
  { id: 'font-battambang', name: 'បាត់ដំបង', sub: 'Battambang (រដ្ឋបាល)', fontClass: 'font-battambang' },
  { id: 'font-siemreap', name: 'សៀមរាប', sub: 'Siemreap (សៀវភៅពុម្ព)', fontClass: 'font-siemreap' },
  { id: 'font-moul', name: 'អក្សរមូល', sub: 'Moul (ក្បាលលិខិត)', fontClass: 'font-moul' },
];

export const ModernFontZoom: React.FC<ModernFontZoomProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Scale percentage: 60% to 200% (default 100%)
  const [scale, setScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_font_scale_pct');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 60 && val <= 200) return val;
      }
    }
    return 100;
  });

  // Number format: 'arabic' (100%) or 'khmer' (១០០%)
  const [numFormat, setNumFormat] = useState<'arabic' | 'khmer'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_font_scale_num_format');
      if (saved === 'arabic' || saved === 'khmer') return saved;
    }
    return 'arabic';
  });

  // Current Font Family (Default: Kantumruy Pro)
  const [currentFont, setCurrentFont] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_font_family');
      if (saved) return saved;
    }
    return 'font-kantumruy';
  });

  // Editable sample preview text
  const [sampleText, setSampleText] = useState<string>('សួស្តីលោកគ្រូ-អ្នកគ្រូ វត្តមានសិស្ស');

  // Apply scale to root document
  const applyScale = (newScale: number) => {
    const clamped = Math.max(60, Math.min(200, newScale));
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

  // Toggle number format
  const toggleNumFormat = (fmt: 'arabic' | 'khmer') => {
    setNumFormat(fmt);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_font_scale_num_format', fmt);
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

  // Friendly scale label in Khmer
  const getScaleLabel = (val: number) => {
    if (val <= 75) return 'តូចខ្លាំង';
    if (val <= 85) return 'តូចសមរម្យ';
    if (val <= 95) return 'តូចល្មម';
    if (val === 100) return 'ស្តង់ដារ (100%)';
    if (val <= 115) return 'ធំល្មម';
    if (val <= 130) return 'ធំច្បាស់';
    return 'ធំពិសេស';
  };

  const formatNumber = (val: number) => {
    return numFormat === 'khmer' ? `${toKhmerNum(val)}%` : `${val}%`;
  };

  const activeFontObj = FONT_OPTIONS.find((f) => f.id === currentFont) || FONT_OPTIONS[0];

  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      {/* Sleek Trigger Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs group ${
          isOpen
            ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm ring-2 ring-blue-400/20'
            : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700 hover:text-slate-900'
        }`}
        title="ពង្រីក/បង្រួមទំហំអក្សរ និងប្តូរពុម្ពអក្សរតាមចិត្ត"
      >
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-white border border-slate-200 shadow-2xs group-hover:border-blue-300">
          <Type className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <span className="text-xs font-black font-mono">
          {formatNumber(scale)}
        </span>
        <span className="text-[10px] text-blue-700 font-bold bg-blue-100/70 px-1.5 py-0.2 rounded hidden md:inline">
          {activeFontObj.name}
        </span>
        <span className="text-[10px] text-slate-400 group-hover:text-slate-600 hidden sm:inline">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Floating Modern Typography Modal / Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3.5 text-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60">
                <Type className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800 leading-tight">
                  ពង្រីក / បង្រួម & ប្តូរពុម្ពអក្សរ
                </h4>
                <p className="text-[10px] font-bold text-slate-400">
                  កែប្រែទំហំ និងពុម្ពអក្សរតាមចិត្ត
                </p>
              </div>
            </div>

            {scale !== 100 && (
              <button
                type="button"
                onClick={() => applyScale(100)}
                className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200/60"
                title="ត្រឡប់ទៅទំហំស្តង់ដារ 100%"
              >
                <RotateCcw className="w-2.5 h-2.5 mr-1" />
                ស្តង់ដារ 100%
              </button>
            )}
          </div>

          {/* Stepper + Direct Custom Input Row */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>ទំហំអក្សរ (Font Scale) ៖</span>
              <span className="text-[10px] text-blue-700 font-bold bg-blue-100/70 px-2 py-0.5 rounded-full">
                {getScaleLabel(scale)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2.5 pt-1">
              {/* Minus Stepper Button */}
              <button
                type="button"
                onClick={() => applyScale(scale - 5)}
                disabled={scale <= 60}
                className="flex-1 inline-flex items-center justify-center px-2.5 py-2 bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer border border-slate-200 shadow-2xs"
                title="បង្រួមអក្សរ (-5%)"
              >
                <Minus className="w-3.5 h-3.5 mr-1 text-slate-500" />
                <span>បង្រួម</span>
              </button>

              {/* Direct Editable Input (វាយបញ្ចូលភាគរយតាមចិត្ត) */}
              <div className="flex flex-col items-center">
                <div className="inline-flex items-center bg-white border border-blue-300 rounded-xl px-2 py-1 shadow-2xs focus-within:ring-2 focus-within:ring-blue-500">
                  <input
                    type="number"
                    min={60}
                    max={200}
                    value={scale}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) applyScale(val);
                    }}
                    className="w-12 text-center text-base font-black text-blue-700 bg-transparent border-none outline-none font-mono"
                    title="លោកគ្រូអាចចុចវាយបញ្ចូលលេខភាគរយតាមចិត្ត (ឧ. 80, 95, 100, 115...)"
                  />
                  <span className="text-xs font-black text-blue-800 pr-1">%</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  ({toKhmerNum(scale)}%)
                </div>
              </div>

              {/* Plus Stepper Button */}
              <button
                type="button"
                onClick={() => applyScale(scale + 5)}
                disabled={scale >= 200}
                className="flex-1 inline-flex items-center justify-center px-2.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                title="ពង្រីកអក្សរ (+5%)"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-white" />
                <span>ពង្រីក</span>
              </button>
            </div>

            {/* Smooth Slider Bar */}
            <div className="pt-2 px-1">
              <input
                type="range"
                min={60}
                max={180}
                step={5}
                value={scale}
                onChange={(e) => applyScale(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-bold font-mono mt-1">
                <span>60%</span>
                <span className="text-blue-600 font-bold">100% (ស្តង់ដារ)</span>
                <span>180%</span>
              </div>
            </div>

            {/* Quick Presets Grid */}
            <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-slate-200/60">
              {[
                { val: 75, label: '75%' },
                { val: 85, label: '85%' },
                { val: 100, label: '100%' },
                { val: 115, label: '115%' },
                { val: 125, label: '125%' },
                { val: 140, label: '140%' },
                { val: 160, label: '160%' },
              ].map((p) => {
                const isSelected = scale === p.val;
                return (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => applyScale(p.val)}
                    className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer text-center border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-black'
                        : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Font Family Switcher (ជ្រើសរើសពុម្ពអក្សរតាមចិត្ត) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>ពុម្ពអក្សរ (Font Family) ៖</span>
              </span>
              <span className="text-[10px] text-slate-500">ប្តូរតាមចិត្ត</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {FONT_OPTIONS.map((f) => {
                const isSelected = currentFont === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => applyFont(f.id)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400/20 shadow-2xs'
                        : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div>
                      <div className={`text-xs font-black ${isSelected ? 'text-blue-800' : 'text-slate-800'} ${f.fontClass}`}>
                        {f.name}
                      </div>
                      <div className="text-[9.5px] text-slate-500 font-sans">
                        {f.sub}
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

          {/* Section 3: Number Format Preference (ទម្រង់លេខ៖ អារ៉ាប់ vs ខ្មែរ) */}
          <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
            <span className="font-bold text-slate-700">ទម្រង់បង្ហាញលេខ៖</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs text-[11px] font-bold">
              <button
                type="button"
                onClick={() => toggleNumFormat('arabic')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer font-mono ${
                  numFormat === 'arabic'
                    ? 'bg-blue-600 text-white font-black shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="បង្ហាញជាលេខអារ៉ាប់ 100% (ច្បាស់ មិនច្រឡំ)"
              >
                100% (អារ៉ាប់)
              </button>
              <button
                type="button"
                onClick={() => toggleNumFormat('khmer')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  numFormat === 'khmer'
                    ? 'bg-blue-600 text-white font-black shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="បង្ហាញជាលេខខ្មែរ ១០០%"
              >
                ១០០% (ខ្មែរ)
              </button>
            </div>
          </div>

          {/* Section 4: Live Interactive Preview */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
              <span>គំរូអក្សរផ្ទាល់ (ចុចដើម្បីវាយសាកល្បង) ៖</span>
              <span className="font-mono">{formatNumber(scale)}</span>
            </div>
            <input
              type="text"
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              className={`w-full p-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold ${activeFontObj.fontClass}`}
              title="លោកគ្រូអាចវាយបញ្ចូលអក្សរណាមួយដើម្បីសាកល្បងទំហំ និងពុម្ពអក្សរបាន"
            />
          </div>
        </div>
      )}
    </div>
  );
};
