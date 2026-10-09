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

