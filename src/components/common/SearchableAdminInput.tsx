import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search, PlusCircle } from 'lucide-react';
import { cleanAdminPrefix } from '../../utils/cambodiaGeography';

interface SearchableAdminInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  badge?: string;
  themeColor?: 'emerald' | 'purple' | 'blue';
  icon?: string;
}

export const SearchableAdminInput: React.FC<SearchableAdminInputProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'ជ្រើសរើស ឬវាយបញ្ចូល...',
  disabled = false,
  required = false,
  badge,
  themeColor = 'emerald',
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Filtered options based on user input
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    // If query matches current value exactly or is empty, show all options
    if (!q || q === (value || '').trim().toLowerCase()) {
      return options;
    }
    const cleanQ = cleanAdminPrefix(q).toLowerCase();
    return options.filter((opt) => {
      const oLower = opt.toLowerCase();
      const cleanO = cleanAdminPrefix(opt).toLowerCase();
      return oLower.includes(q) || cleanO.includes(cleanQ) || oLower.includes(cleanQ);
    });
  }, [options, query, value]);

  const handleSelectOption = (opt: string) => {
    setQuery(opt);
    onChange(opt);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery('');
    onChange('');
    inputRef.current?.focus();
    setIsOpen(true);
  };

  // Color theme classes
  const themeClasses = {
    emerald: {
      ring: 'focus:ring-emerald-500 focus:border-emerald-500',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-100',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      itemActive: 'bg-emerald-50 text-emerald-900 font-bold',
      check: 'text-emerald-600',
      accentBtn: 'hover:bg-emerald-100 text-emerald-700',
    },
    purple: {
      ring: 'focus:ring-purple-500 focus:border-purple-500',
      activeBorder: 'border-purple-500 ring-2 ring-purple-100',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      itemActive: 'bg-purple-50 text-purple-900 font-bold',
      check: 'text-purple-600',
      accentBtn: 'hover:bg-purple-100 text-purple-700',
    },
    blue: {
      ring: 'focus:ring-blue-500 focus:border-blue-500',
      activeBorder: 'border-blue-500 ring-2 ring-blue-100',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      itemActive: 'bg-blue-50 text-blue-900 font-bold',
      check: 'text-blue-600',
      accentBtn: 'hover:bg-blue-100 text-blue-700',
    },
  }[themeColor];

  const hasExactMatch = options.some(
    (opt) =>
      opt.trim().toLowerCase() === query.trim().toLowerCase() ||
      cleanAdminPrefix(opt).toLowerCase() === cleanAdminPrefix(query.trim()).toLowerCase()
  );

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Label and Badge */}
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-bold text-slate-700">
          {label} {required && <span className="text-rose-500 font-black">*</span>}
        </label>
        {badge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${themeClasses.badge}`}>
            {badge}
          </span>
        )}
      </div>

      {/* Input Field with Toggle and Clear Buttons */}
      <div className="relative">
        {icon && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none">
            {icon}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full py-2.5 ${icon ? 'pl-8' : 'pl-3'} pr-16 bg-slate-50 border rounded-xl text-slate-800 text-xs sm:text-sm font-medium transition-all ${
            isOpen ? `${themeClasses.activeBorder} bg-white` : 'border-slate-200 hover:border-slate-300'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : 'focus:bg-white'} ${
            themeClasses.ring
          }`}
        />

        {/* Action icons right */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              title="លុបអក្សរ"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
                inputRef.current?.focus();
              }
            }}
            className={`p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-transform ${
              isOpen ? 'rotate-180 text-slate-700' : ''
            }`}
            title="បង្ហាញបញ្ជី"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dropdown Suggestions Panel */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-slate-200 max-h-60 overflow-y-auto overflow-x-hidden divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          {/* Header count info */}
          <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-500 sticky top-0 z-10 border-b border-slate-100">
            <span className="flex items-center gap-1">
              <Search className="w-3 h-3 text-slate-400" />
              <span>បញ្ជី ({filteredOptions.length})</span>
            </span>
            {query && (
              <span className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]">
                ស្វែងរក: "{query}"
              </span>
            )}
          </div>

          {/* List Items */}
          <div className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected =
                  opt.trim().toLowerCase() === (value || '').trim().toLowerCase() ||
                  cleanAdminPrefix(opt).toLowerCase() === cleanAdminPrefix(value || '').toLowerCase();
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full px-3 py-2 text-left text-xs sm:text-sm flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                      isSelected ? themeClasses.itemActive : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check className={`w-4 h-4 shrink-0 ${themeClasses.check}`} />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-center text-xs text-slate-400">
                មិនមានក្នុងបញ្ជីផ្លូវការ
              </div>
            )}

            {/* Custom option prompt if user entered something not in list */}
            {query.trim() && !hasExactMatch && (
              <button
                type="button"
                onClick={() => handleSelectOption(query.trim())}
                className="w-full px-3 py-2.5 text-left text-xs text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100 border-t border-emerald-100 flex items-center gap-1.5 transition-colors font-medium"
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span className="truncate">
                  ប្រើពាក្យផ្ទាល់ខ្លួន: <strong>"{query.trim()}"</strong>
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
