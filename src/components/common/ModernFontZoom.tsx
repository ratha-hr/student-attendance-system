import React, { useState, useEffect, useRef } from 'react';
import { Type, Minus, Plus, RotateCcw, Check, Sparkles } from 'lucide-react';
import { toKhmerNum } from '../../utils/dateUtils';

interface ModernFontZoomProps {
  className?: string;
}

export const ModernFontZoom: React.FC<ModernFontZoomProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Scale percentage: 80% to 140% (default 100%)
  const [scale, setScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_font_scale_pct');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 75 && val <= 150) return val;
      }
    }
    return 100;
  });

  // Apply scale to root document
  const applyScale = (newScale: number) => {
    const clamped = Math.max(80, Math.min(140, newScale));
    setScale(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_font_scale_pct', clamped.toString());
      document.documentElement.style.fontSize = `${(16 * clamped) / 100}px`;
    }
  };

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
    if (val <= 85) return 'តូចសមរម្យ';
    if (val <= 95) return 'តូចល្មម';
    if (val === 100) return 'ស្តង់ដារ';
    if (val <= 115) return 'ធំល្មម';
    if (val <= 125) return 'ធំច្បាស់';
    return 'ធំពិសេស';
  };

  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      {/* Sleek, Minimalist Trigger Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs group ${
          isOpen
            ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm ring-2 ring-blue-400/20'
            : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700 hover:text-slate-900'
        }`}
        title="ពង្រីក ឬបង្រួមទំហំអក្សរ (Font Size)"
      >
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-white border border-slate-200 shadow-2xs group-hover:border-blue-300">
          <Type className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <span className="text-xs font-black font-kantumruy">
          {toKhmerNum(scale)}%
        </span>
        <span className="text-[10px] text-slate-400 group-hover:text-slate-600 hidden sm:inline">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Floating Modern Typography Modal / Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60">
                <Type className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800 leading-tight">
                  ពង្រីក / បង្រួមអក្សរ
                </h4>
                <p className="text-[10px] font-bold text-slate-400">
                  កែសម្រួលទំហំអក្សរលើគ្រប់ឧបករណ៍
                </p>
              </div>
            </div>

            {scale !== 100 && (
              <button
                type="button"
                onClick={() => applyScale(100)}
                className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200/60"
                title="ត្រឡប់ទៅទំហំស្តង់ដារ ១០០%"
              >
                <RotateCcw className="w-2.5 h-2.5 mr-1" />
                ១០០%
              </button>
            )}
          </div>

          {/* Stepper Control Row */}
          <div className="py-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => applyScale(scale - 5)}
              disabled={scale <= 80}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer border border-slate-200 shadow-2xs"
              title="បង្រួមអក្សរ (-5%)"
            >
              <Minus className="w-3.5 h-3.5 mr-1 text-slate-500" />
              <span>បង្រួម</span>
            </button>

            <div className="text-center px-2 min-w-[90px]">
              <div className="text-lg font-black text-blue-700 font-kantumruy leading-none">
                {toKhmerNum(scale)}%
              </div>
              <div className="text-[10px] font-bold text-slate-500 mt-1">
                {getScaleLabel(scale)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => applyScale(scale + 5)}
              disabled={scale >= 140}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              title="ពង្រីកអក្សរ (+5%)"
            >
              <Plus className="w-3.5 h-3.5 mr-1 text-white" />
              <span>ពង្រីក</span>
            </button>
          </div>

          {/* Smooth Slider Bar */}
          <div className="pt-1 pb-3 px-1">
            <input
              type="range"
              min={80}
              max={140}
              step={5}
              value={scale}
              onChange={(e) => applyScale(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-bold font-kantumruy mt-1">
              <span>៨០% (តូច)</span>
              <span className="text-blue-600 font-black">១០០% (ស្តង់ដារ)</span>
              <span>១៤០% (ធំច្បាស់)</span>
            </div>
          </div>

          {/* Quick Presets Grid */}
          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100">
            {[
              { val: 85, label: '៨៥%' },
              { val: 100, label: '១០០%' },
              { val: 115, label: '១១៥%' },
              { val: 130, label: '១៣០%' },
            ].map((p) => {
              const isSelected = scale === p.val;
              return (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => applyScale(p.val)}
                  className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs ring-2 ring-blue-400/20'
                      : 'bg-slate-50 hover:bg-white text-slate-700 hover:text-blue-700 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Live Preview Text */}
          <div className="mt-3 p-2 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
            <p className="text-[11px] font-bold text-slate-700 leading-relaxed font-kantumruy">
              គំរូអក្សរ៖ សួស្តីលោកគ្រូ-អ្នកគ្រូ វត្តមានសិស្ស
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
