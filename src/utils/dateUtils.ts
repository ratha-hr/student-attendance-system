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
