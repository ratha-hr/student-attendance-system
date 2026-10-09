export const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];

export const KHMER_MONTHS = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];

export const KHMER_DAYS = [
  'អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'
];

export function toKhmerNum(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '';
  return String(num).replace(/[0-9]/g, (digit) => KHMER_DIGITS[parseInt(digit, 10)] || digit);
}

export function fromKhmerNum(khmerStr: string): string {
  return khmerStr.replace(/[០-៩]/g, (kDigit) => {
    const idx = KHMER_DIGITS.indexOf(kDigit);
    return idx >= 0 ? String(idx) : kDigit;
  });
}

export function formatKhmerDate(dateStr: string, includeDayName = false): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const day = date.getDate();
  const month = KHMER_MONTHS[date.getMonth()];
  const year = date.getFullYear();

  const khmerDay = toKhmerNum(day);
  const khmerYear = toKhmerNum(year);

  if (includeDayName) {
    const dayName = KHMER_DAYS[date.getDay()];
    return `ថ្ងៃ${dayName} ទី${khmerDay} ខែ${month} ឆ្នាំ${khmerYear}`;
  }

  return `ថ្ងៃទី${khmerDay} ខែ${month} ឆ្នាំ${khmerYear}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// ប្រតិទិនថ្ងៃបុណ្យជាតិ និងថ្ងៃឈប់សម្រាកផ្លូវការនៅកម្ពុជា (MM-DD)
export const KHMER_HOLIDAYS_MAP: Record<string, string> = {
  '01-01': 'ទិវាចូលឆ្នាំសកល',
  '01-07': 'ទិវាជ័យជម្នះលើរបបប្រល័យពូជសាសន៍',
  '03-08': 'ទិវាអន្តរជាតិនារី',
  '04-13': 'បុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ (ថ្ងៃទី១)',
  '04-14': 'បុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ (ថ្ងៃទី២)',
  '04-15': 'បុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ (ថ្ងៃទី៣)',
  '04-16': 'បុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ (ថ្ងៃឡើងស័ក)',
  '05-01': 'ទិវាពលកម្មអន្តរជាតិ',
  '05-14': 'ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម ព្រះមហាក្សត្រ',
  '05-22': 'ពិធីបុណ្យវិសាខបូជា',
  '05-26': 'ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល',
  '06-18': 'ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម សម្តេចព្រះមហាក្សត្រី ព្រះវររាជមាតាជាតិ',
  '09-24': 'ទិវាប្រកាសរដ្ឋធម្មនុញ្ញ',
  '10-01': 'ពិធីបុណ្យភ្ជុំបិណ្ឌ (ថ្ងៃទី១)',
  '10-02': 'ពិធីបុណ្យភ្ជុំបិណ្ឌ (ថ្ងៃទី២)',
  '10-03': 'ពិធីបុណ្យភ្ជុំបិណ្ឌ (ថ្ងៃភ្ជុំធំ)',
  '10-15': 'ទិវាគោរពព្រះវិញ្ញាណក្ខន្ធ ព្រះបរមរតនកោដ្ឋ',
  '10-29': 'ព្រះរាជពិធីគ្រងរាជសម្បត្តិ ព្រះមហាក្សត្រ',
  '11-09': 'ពិធីបុណ្យឯករាជ្យជាតិ',
  '11-14': 'ព្រះរាជពិធីបុណ្យអុំទូក បណ្តែតប្រទីប (ថ្ងៃទី១)',
  '11-15': 'ព្រះរាជពិធីបុណ្យអុំទូក បណ្តែតប្រទីប (ថ្ងៃទី២)',
  '11-16': 'ព្រះរាជពិធីបុណ្យអុំទូក បណ្តែតប្រទីប (ថ្ងៃទី៣)',
};

export function getKhmerHoliday(month: number, day: number): string | null {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return KHMER_HOLIDAYS_MAP[`${m}-${d}`] || null;
}

export function isSunday(year: number, monthIndex: number, day: number): boolean {
  return new Date(year, monthIndex, day).getDay() === 0;
}

export function checkIfHolidayDate(dateStr: string): { isHoliday: boolean; holidayName: string | null; isSun: boolean } {
  if (!dateStr) return { isHoliday: false, holidayName: null, isSun: false };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { isHoliday: false, holidayName: null, isSun: false };
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const holidayName = getKhmerHoliday(month, day);
  const isSun = d.getDay() === 0;
  return {
    isHoliday: !!holidayName || isSun,
    holidayName: holidayName || (isSun ? 'ថ្ងៃអាទិត្យ (ថ្ងៃឈប់សម្រាកប្រចាំសប្ដាហ៍)' : null),
    isSun,
  };
}

// សត្វទាំង ១២ (Khmer 12 Zodiac Animal Years)
export const KHMER_ANIMALS = [
  'ជូត', 'ឆ្លូវ', 'ខាល', 'ថោះ', 'រោង', 'ម្សាញ់', 'មមី', 'មមែ', 'វក', 'រកា', 'ច', 'កុរ'
];

// ស័កទាំង ១០ (Khmer 10 Sak / Decennial Cycle)
export const KHMER_SAK = [
  'សំរឹទ្ធិស័ក', 'ឯកស័ក', 'ទោស័ក', 'ត្រីស័ក', 'ចត្វាស័ក', 'បញ្ចស័ក', 'ឆស័ក', 'សប្តស័ក', 'អដ្ឋស័ក', 'នព្វស័ក'
];

// ខែចន្ទគតិទាំង ១២ (Khmer 12 Lunar Months)
export const KHMER_LUNAR_MONTHS = [
  'មិគសិរ', 'បុស្ស', 'មាឃ', 'ផល្គុន', 'ចេត្រ', 'ពិសាខ',
  'ជេស្ឋ', 'អាសាឍ', 'ស្រាពណ៍', 'ភទ្របទ', 'អស្សុជ', 'កត្តិក'
];

export interface KhmerLunarInfo {
  dayOfWeek: string;
  moonPhase: string;
  lunarMonth: string;
  animalYear: string;
  sak: string;
  beYear: string;
  fullLunarStr: string;
  shortLunarStr: string;
}

export interface KhmerSolarInfo {
  fullSolarStr: string;
  shortSolarStr: string;
  dayOfWeek: string;
  dayNum: string;
  monthName: string;
  yearNum: string;
}

/**
 * គណនាថ្ងៃខែឆ្នាំបែបចន្ទគតិខ្មែរ (Khmer Lunar Calendar)
 * ឧទាហរណ៍៖ ថ្ងៃសុក្រ ១៣រោច ខែអស្សុជ ឆ្នាំមមី អដ្ឋស័ក ព.ស. ២៥៧០
 */
export function getKhmerLunarDate(d: Date | string = new Date()): KhmerLunarInfo {
  const date = typeof d === 'string' ? new Date(d) : d;
  const validDate = isNaN(date.getTime()) ? new Date() : date;

  const dayOfWeek = KHMER_DAYS[validDate.getDay()];

  // Synodic month calculation (29.53058867 days per lunar cycle)
  const refTime = new Date('2000-01-06T18:14:00Z').getTime();
  const synodic = 29.53058867;
  const diffDays = (validDate.getTime() - refTime) / (1000 * 60 * 60 * 24);
  const cycle = (diffDays % synodic + synodic) % synodic;

  const dayInPhase = Math.floor(cycle) + 1;
  const moonPhase = dayInPhase <= 15
    ? `${toKhmerNum(dayInPhase)}កើត`
    : `${toKhmerNum(dayInPhase - 15)}រោច`;

  // Animal year & Sak calculation (Khmer New Year occurs around April 14)
  const year = validDate.getFullYear();
  const month = validDate.getMonth();
  const day = validDate.getDate();
  const isAfterKNY = month > 3 || (month === 3 && day >= 14);
  const effectiveYear = isAfterKNY ? year : year - 1;

  // Animal Zodiac (2020: ជូត (0), 2024: រោង (4), 2026: មមី (6))
  const animalIdx = ((effectiveYear - 4) % 12 + 12) % 12;
  const animalYear = `ឆ្នាំ${KHMER_ANIMALS[animalIdx]}`;

  // Sak (2024: ឆស័ក (6), 2026: អដ្ឋស័ក (8))
  const sakIdx = ((effectiveYear + 2) % 10 + 10) % 10;
  const sak = KHMER_SAK[sakIdx];

  // Buddhist Era (ពុទ្ធសករាជ ព.ស.)
  const beYear = toKhmerNum(effectiveYear + 544);

  // Lunar Month (Aligned with Chet new moon reference in April 2024)
  const refChet = new Date('2024-04-08T18:21:00Z').getTime();
  const cycles = Math.floor((validDate.getTime() - refChet) / (synodic * 24 * 3600 * 1000));
  const monthIdx = ((4 + cycles) % 12 + 12) % 12;
  const lunarMonth = `ខែ${KHMER_LUNAR_MONTHS[monthIdx]}`;

  const fullLunarStr = `ថ្ងៃ${dayOfWeek} ${moonPhase} ${lunarMonth} ${animalYear} ${sak} ព.ស. ${beYear}`;
  const shortLunarStr = `${moonPhase} ${lunarMonth} ${animalYear}`;

  return {
    dayOfWeek,
    moonPhase,
    lunarMonth,
    animalYear,
    sak,
    beYear,
    fullLunarStr,
    shortLunarStr,
  };
}

/**
 * គណនាថ្ងៃខែឆ្នាំបែបសុរិយគតិ (Solar Calendar)
 * ឧទាហរណ៍៖ ថ្ងៃសុក្រ ទី០៩ ខែតុលា ឆ្នាំ២០២៦
 */
export function getKhmerSolarDate(d: Date | string = new Date()): KhmerSolarInfo {
  const date = typeof d === 'string' ? new Date(d) : d;
  const validDate = isNaN(date.getTime()) ? new Date() : date;

  const dayOfWeek = KHMER_DAYS[validDate.getDay()];
  const day = validDate.getDate();
  const dayNum = toKhmerNum(String(day).padStart(2, '0'));
  const monthName = KHMER_MONTHS[validDate.getMonth()];
  const yearNum = toKhmerNum(validDate.getFullYear());

  const fullSolarStr = `ថ្ងៃ${dayOfWeek} ទី${dayNum} ខែ${monthName} ឆ្នាំ${yearNum}`;
  const shortSolarStr = `ថ្ងៃទី${dayNum} ខែ${monthName} ឆ្នាំ${yearNum}`;

  return {
    fullSolarStr,
    shortSolarStr,
    dayOfWeek,
    dayNum,
    monthName,
    yearNum,
  };
}

/**
 * ទម្រង់ម៉ោងសកល (Universal / International Standard Time)
 * ប្រើប្រាស់លេខសកល (0-9) សម្រាប់ម៉ោង នាទី វិនាទី
 */
export function formatUniversalTime(date: Date = new Date()): {
  time24: string;
  time12: string;
  period: 'AM' | 'PM';
  khmerPeriod: 'ព្រឹក' | 'រសៀល';
} {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  const time24 = `${String(h).padStart(2, '0')}:${m}:${s}`;
  const h12 = h % 12 || 12;
  const time12 = `${String(h12).padStart(2, '0')}:${m}:${s}`;
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const khmerPeriod: 'ព្រឹក' | 'រសៀល' = h >= 12 ? 'រសៀល' : 'ព្រឹក';

  return { time24, time12, period, khmerPeriod };
}

/**
 * បម្លែងកាលបរិច្ឆេទទៅជាទម្រង់ dd/mm/yyyy
 * ឧទាហរណ៍៖ 2011-01-09 -> 09/01/2011
 */
export function formatToDMY(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  // If already in DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    return clean;
  }
  // If YYYY-MM-DD
  const parts = clean.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  const d = new Date(clean);
  if (isNaN(d.getTime())) return clean;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * បម្លែងពី dd/mm/yyyy មកជា yyyy-mm-dd
 */
export function parseDMYToISO(dmyStr: string | undefined | null): string {
  if (!dmyStr) return '';
  const clean = dmyStr.trim();
  // If already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  const parts = clean.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (d.length === 4 && y.length <= 2) {
      return `${d}-${m.padStart(2, '0')}-${y.padStart(2, '0')}`;
    }
    return `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return clean;
}



