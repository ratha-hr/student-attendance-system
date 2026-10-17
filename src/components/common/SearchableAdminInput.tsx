import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search, PlusCircle, Sparkles, RotateCcw } from 'lucide-react';
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

/**
 * Normalizes Khmer characters for fuzzy keyword matching
 * (Handles vowel variations like ឬ / ប្ញ, ឫ / ប្ឫ, and zero-width spaces)
 */
function normalizeKhmer(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width spaces
    .replace(/ប្ញ/g, 'ឬ') // normalize ប្ញ to ឬ
    .replace(/ប្ឫ/g, 'ឫ'); // normalize ប្ឫ to ឫ
}

/**
 * Highlights matching letters in the search results
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const qClean = cleanAdminPrefix(query.trim());
  const searchTerms = [query.trim(), qClean].filter(Boolean);

  // Find first matching term
  let foundTerm = '';
  let foundIdx = -1;
  for (const t of searchTerms) {
    const idx = text.toLowerCase().indexOf(t.toLowerCase());
    if (idx !== -1) {
      foundTerm = text.slice(idx, idx + t.length);
      foundIdx = idx;
      break;
    }
  }

  if (foundIdx === -1 || !foundTerm) {
    return text;
  }

  const before = text.slice(0, foundIdx);
  const match = text.slice(foundIdx, foundIdx + foundTerm.length);
  const after = text.slice(foundIdx + foundTerm.length);

  return (
    <>
      {before}
      <mark className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded shadow-2xs">
        {match}
      </mark>
      {after}
    </>
  );
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
  const [showAllExplicitly, setShowAllExplicitly] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Close popup on outside click or focus loss
  useEffect(() => {
    const handleOutside = (event: MouseEvent | TouchEvent | FocusEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAllExplicitly(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('focusin', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('focusin', handleOutside);
    };
  }, []);

  // Filter options strictly according to user query
  const filteredOptions = useMemo(() => {
    const qRaw = query.trim();
    if (!qRaw || showAllExplicitly) {
      return options;
    }

    const qNorm = normalizeKhmer(qRaw);
    const qClean = normalizeKhmer(cleanAdminPrefix(qRaw));
    const keywords = qNorm.split(/\s+/).filter(Boolean);

    return options.filter((opt) => {
      const optNorm = normalizeKhmer(opt);
      const optClean = normalizeKhmer(cleanAdminPrefix(opt));

      // Direct substring match
      if (optNorm.includes(qNorm) || optClean.includes(qClean) || optNorm.includes(qClean)) {
        return true;
      }

      // Multi-word keyword match
      if (keywords.length > 1 && keywords.every((kw) => optNorm.includes(kw) || optClean.includes(kw))) {
        return true;
      }

      return false;
    });
  }, [options, query, showAllExplicitly]);

  // Handle select option
  const handleSelectOption = (opt: string) => {
    setQuery(opt);
    onChange(opt);
    setIsOpen(false);
    setShowAllExplicitly(false);
    setActiveIndex(-1);
  };

  // User typing in input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setShowAllExplicitly(false);
    setActiveIndex(0);
    if (!isOpen) setIsOpen(true);
  };

  // Clear query button
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery('');
    onChange('');
    setShowAllExplicitly(true);
    setActiveIndex(-1);
    inputRef.current?.focus();
    setIsOpen(true);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Single-tab navigation: commit choice and let browser Tab advance directly to next field!
    if (e.key === 'Tab') {
      if (isOpen) {
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          handleSelectOption(filteredOptions[activeIndex]);
        } else if (filteredOptions.length === 1) {
          handleSelectOption(filteredOptions[0]);
        } else if (query.trim()) {
          const exact = filteredOptions.find(
            (o) => cleanAdminPrefix(o).toLowerCase() === cleanAdminPrefix(query.trim()).toLowerCase()
          );
          if (exact) {
            handleSelectOption(exact);
          } else {
            setQuery(query.trim());
            onChange(query.trim());
            setIsOpen(false);
            setShowAllExplicitly(false);
            setActiveIndex(-1);
          }
        } else {
          setIsOpen(false);
          setShowAllExplicitly(false);
          setActiveIndex(-1);
        }
      }
      // Note: Do NOT call e.preventDefault(); allow browser Tab to jump straight to next field!
      return;
    }

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        handleSelectOption(filteredOptions[activeIndex]);
      } else if (query.trim()) {
        handleSelectOption(query.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setShowAllExplicitly(false);
      setActiveIndex(-1);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-list-item]');
      const activeEl = items[activeIndex] as HTMLElement | undefined;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

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
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            if (!disabled) {
              setIsOpen(true);
              e.target.select();
            }
          }}
          placeholder={placeholder}
          className={`w-full py-2.5 ${icon ? 'pl-8' : 'pl-3'} pr-16 bg-slate-50 border rounded-xl text-slate-800 text-xs sm:text-sm font-medium transition-all ${
            isOpen ? `${themeClasses.activeBorder} bg-white shadow-xs` : 'border-slate-200 hover:border-slate-300'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : 'focus:bg-white'} ${
            themeClasses.ring
          }`}
        />

        {/* Action icons right */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {query && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              title="លុបអក្សរស្វែងរក"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                const nextState = !isOpen;
                setIsOpen(nextState);
                if (nextState) {
                  setShowAllExplicitly(true);
                  inputRef.current?.focus();
                }
              }
            }}
            className={`p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-transform cursor-pointer ${
              isOpen ? 'rotate-180 text-slate-700' : ''
            }`}
            title="បង្ហាញជម្រើសទាំងអស់"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modern Filtered Suggestions Panel */}
      {isOpen && !disabled && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 max-h-64 overflow-y-auto overflow-x-hidden divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header count info: Shows exact filtered count for easy reading */}
          <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-600 sticky top-0 z-10 border-b border-slate-100 backdrop-blur-xs">
            <span className="flex items-center gap-1.5">
              {query.trim() && !showAllExplicitly ? (
                <>
                  <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="text-emerald-800">
                    ស្រង់បាន ({filteredOptions.length})
                  </span>
                </>
              ) : (
                <>
                  <Search className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>បញ្ជីទាំងអស់ ({filteredOptions.length})</span>
                </>
              )}
            </span>

            {/* Quick Toggle Show All vs Filtered */}
            {query.trim() && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowAllExplicitly(!showAllExplicitly)}
                className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                {showAllExplicitly ? (
                  <span>ត្រឡប់ទៅស្រង់តាមអក្សរ</span>
                ) : (
                  <span>បង្ហាញទាំងអស់ ({options.length})</span>
                )}
              </button>
            )}
          </div>

          {/* List Items */}
          <div ref={listRef} className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected =
                  opt.trim().toLowerCase() === (value || '').trim().toLowerCase() ||
                  cleanAdminPrefix(opt).toLowerCase() === cleanAdminPrefix(value || '').toLowerCase();
                const isHighlighted = idx === activeIndex;

                return (
                  <button
                    key={opt}
                    data-list-item
                    type="button"
                    tabIndex={-1}
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full px-3 py-2 text-left text-xs sm:text-sm flex items-center justify-between transition-colors cursor-pointer ${
                      isHighlighted
                        ? 'bg-blue-50 text-blue-900 font-bold'
                        : isSelected
                        ? themeClasses.itemActive
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate pr-2">
                      {highlightMatch(opt, showAllExplicitly ? '' : query)}
                    </span>
                    {isSelected && <Check className={`w-4 h-4 shrink-0 ${themeClasses.check}`} />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-slate-500 space-y-1">
                <p>
                  មិនមានទិន្នន័យត្រូវគ្នានឹងពាក្យគន្លឹះ <strong>«{query}»</strong> ឡើយ
                </p>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowAllExplicitly(true)}
                  className="text-blue-600 hover:underline text-[11px] font-bold inline-flex items-center gap-1 mt-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>បង្ហាញបញ្ជីទាំងអស់ ({options.length})</span>
                </button>
              </div>
            )}

            {/* Custom option prompt if user entered something not in list */}
            {query.trim() && !hasExactMatch && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => handleSelectOption(query.trim())}
                className="w-full px-3 py-2.5 text-left text-xs text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 border-t border-emerald-100 flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span className="truncate">
                  ប្រើឈ្មោះផ្ទាល់ខ្លួន: <strong>«{query.trim()}»</strong>
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
