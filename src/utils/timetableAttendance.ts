import type { TimetableSlot, ClassRoom } from '../types';
import { toKhmerNum } from './dateUtils';

export interface TimetablePeriodOption {
  value: string; // e.g. "07:00 - 08:00"
  label: string; // e.g. "ម៉ោងទី ១ (07:00 - 08:00) • គណិតវិទ្យា (គ្រូ៖ ចាបុក)"
  shortLabel: string; // e.g. "ម៉ោង ១៖ គណិត"
  checkIn: string; // e.g. "7:00"
  checkOut: string; // e.g. "8:00"
  subject: string; // e.g. "គណិតវិទ្យា"
  teacherName?: string;
  periodNumber?: number;
  isFullSession?: boolean;
}

export const KHMER_DAY_NAMES: Record<number, string> = {
  0: 'អាទិត្យ',
  1: 'ចន្ទ',
  2: 'អង្គារ',
  3: 'ពុធ',
  4: 'ព្រហស្បតិ៍',
  5: 'សុក្រ',
  6: 'សៅរ៍',
};

/**
 * ទទួលបានថ្ងៃក្នុងសប្ដាហ៍ (1 = ចន្ទ, ..., 6 = សៅរ៍, 0 = អាទិត្យ)
 */
export function getDayOfWeekFromDate(dateStr: string): number {
  if (!dateStr) return 1;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d).getDay();
  }
  return new Date(dateStr).getDay();
}

/**
 * បំលែង timeSlot ទៅជា checkIn (ម៉ោងចូល) និង checkOut (ម៉ោងចេញ)
 */
export function parseSlotTimes(
  timeSlot: string,
  session: 'morning' | 'afternoon' = 'morning'
): { start: string; end: string } {
  const s = (timeSlot || '').trim();

  // 1. Format: 7h-8h, 8h-9h, 1h-2h, 2h-3h
  const hMatch = s.match(/^(\d{1,2})h\s*-\s*(\d{1,2})h$/i);
  if (hMatch) {
    let startH = parseInt(hMatch[1], 10);
    let endH = parseInt(hMatch[2], 10);
    if (session === 'afternoon' || startH <= 5) {
      if (startH <= 6) startH += 12;
      if (endH <= 6) endH += 12;
    }
    return {
      start: `${startH}:00`,
      end: `${endH}:00`,
    };
  }

  // 2. Format: 07:00 - 08:00, 7:00 - 7:50, 13:00 - 14:00
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    let startH = parseInt(colonMatch[1], 10);
    const startM = colonMatch[2];
    let endH = parseInt(colonMatch[3], 10);
    const endM = colonMatch[4];

    if (session === 'afternoon' && startH <= 6) {
      startH += 12;
      endH += 12;
    }

    const cleanStart = startM === '00' ? `${startH}:00` : `${startH}:${startM}`;
    const cleanEnd = endM === '00' ? `${endH}:00` : `${endH}:${endM}`;
    return { start: cleanStart, end: cleanEnd };
  }

  // Fallback defaults
  if (session === 'afternoon') {
    return { start: '13:00', end: '17:00' };
  }
  return { start: '7:00', end: '11:00' };
}

/**
 * ទាញយកកាលវិភាគថ្នាក់ជាក់លាក់តាមកាលបរិច្ឆេទ (ថ្ងៃក្នុងសប្ដាហ៍) និងវេនសិក្សា
 */
export function getClassTimetableForDate(
  allSlots: TimetableSlot[],
  classId: string,
  dateStr: string,
  session: 'morning' | 'afternoon',
  allClasses: ClassRoom[] = []
): TimetableSlot[] {
  if (!allSlots || allSlots.length === 0) return [];
  const dayOfWeek = getDayOfWeekFromDate(dateStr);

  // 1. រកមើលតាម classId ផ្ទាល់
  let matched = allSlots.filter(
    (s) =>
      s.classId === classId &&
      s.dayOfWeek === dayOfWeek &&
      (!s.session || s.session === session)
  );

  // 2. ប្រសិនរកមិនឃើញ និង classId ជា class-7b ខ្ចីកាលវិភាគពី class-7
  if (matched.length === 0 && classId === 'class-7b') {
    matched = allSlots.filter(
      (s) =>
        s.classId === 'class-7' &&
        s.dayOfWeek === dayOfWeek &&
        (!s.session || s.session === session)
    );
  }

  // 3. ប្រសិននៅតែរកមិនឃើញ ស្វែងរកតាមកម្រិតថ្នាក់ (Grade) ដូចជា 7, 9, 10
  if (matched.length === 0 && allClasses.length > 0) {
    const currClass = allClasses.find((c) => c.id === classId);
    if (currClass) {
      const gNum = (currClass.grade || currClass.name || '').replace(/\D/g, '');
      if (gNum) {
        matched = allSlots.filter((s) => {
          const slotClass = allClasses.find((c) => c.id === s.classId);
          const slotGNum = slotClass
            ? (slotClass.grade || slotClass.name || '').replace(/\D/g, '')
            : s.classId.replace(/\D/g, '');
          return (
            slotGNum === gNum &&
            s.dayOfWeek === dayOfWeek &&
            (!s.session || s.session === session)
          );
        });
      }
    }
  }

  // តម្រៀបតាម periodNumber (ម៉ោងទី ១, ២, ៣, ៤, ៥...)
  return matched.sort((a, b) => (a.periodNumber || 1) - (b.periodNumber || 1));
}

/**
 * បង្កើតជម្រើសម៉ោងចេញចូល (checkIn/checkOut options) - យកតែម៉ោងគត់សុទ្ធសាធ (7:00, 8:00, ...)
 */
export function getTimetableHoursOptions(
  _slots: TimetableSlot[],
  session: 'morning' | 'afternoon'
): { value: string; label: string }[] {
  // ម៉ោងគត់សុទ្ធសាធតាមការស្នើសុំ 7:00, 8:00, ...
  const baseMorning = [
    '7:00',
    '8:00',
    '9:00',
    '10:00',
    '11:00',
    '12:00',
  ];

  const baseAfternoon = [
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
  ];

  const hours = session === 'morning' ? baseMorning : baseAfternoon;
  return hours.map((v) => ({ value: v, label: v }));
}

/**
 * បង្កើតជម្រើសម៉ោងបង្រៀន / ម៉ោងស្រង់វត្តមាន យកតាមកាលវិភាគថ្នាក់
 */
export function buildTimetablePeriodOptions(
  slots: TimetableSlot[],
  session: 'morning' | 'afternoon'
): TimetablePeriodOption[] {
  const isMorning = session === 'morning';
  const defaultFullSession = isMorning ? '7:00 - 11:00' : '13:00 - 17:00';
  const defaultFullLabel = isMorning
    ? 'ពេញមួយព្រឹក (07:00 - 11:00)'
    : 'ពេញមួយរសៀល (13:00 - 17:00)';

  const result: TimetablePeriodOption[] = [];

  if (slots.length > 0) {
    const firstParsed = parseSlotTimes(slots[0].timeSlot, session);
    const lastParsed = parseSlotTimes(slots[slots.length - 1].timeSlot, session);

    // Option 0: ពេញមួយវេន
    result.push({
      value: `${firstParsed.start} - ${lastParsed.end}`,
      label: `ពេញមួយ${isMorning ? 'ព្រឹក' : 'រសៀល'} (${firstParsed.start} - ${lastParsed.end})`,
      shortLabel: `ពេញមួយ${isMorning ? 'ព្រឹក' : 'រសៀល'}`,
      checkIn: firstParsed.start,
      checkOut: lastParsed.end,
      subject: '',
      isFullSession: true,
    });

    // Options 1..N: តាមកាលវិភាគថ្នាក់
    slots.forEach((slot, idx) => {
      const pNum = slot.periodNumber || idx + 1;
      const parsed = parseSlotTimes(slot.timeSlot, session);
      const subjectText = slot.subject ? ` • ${slot.subject}` : '';
      const teacherText = slot.teacherName ? ` (គ្រូ៖ ${slot.teacherName})` : '';

      result.push({
        value: slot.timeSlot || `${parsed.start} - ${parsed.end}`,
        label: `ម៉ោងទី ${toKhmerNum(pNum)} (${slot.timeSlot || `${parsed.start} - ${parsed.end}`})${subjectText}${teacherText}`,
        shortLabel: `ម៉ោង ${toKhmerNum(pNum)}${slot.subject ? `៖ ${slot.subject}` : ''}`,
        checkIn: parsed.start,
        checkOut: parsed.end,
        subject: slot.subject || '',
        teacherName: slot.teacherName,
        periodNumber: pNum,
        isFullSession: false,
      });
    });
  } else {
    // Fallback ប្រសិនគ្មានទិន្នន័យកាលវិភាគសម្រាប់ថ្ងៃនេះ
    result.push({
      value: defaultFullSession,
      label: defaultFullLabel,
      shortLabel: `ពេញមួយ${isMorning ? 'ព្រឹក' : 'រសៀល'}`,
      checkIn: isMorning ? '7:00' : '13:00',
      checkOut: isMorning ? '11:00' : '17:00',
      subject: '',
      isFullSession: true,
    });

    const fallbackPeriods = isMorning
      ? [
          { p: 1, time: '7:00 - 7:50' },
          { p: 2, time: '7:55 - 8:45' },
          { p: 3, time: '8:55 - 9:45' },
          { p: 4, time: '9:50 - 10:40' },
          { p: 5, time: '10:45 - 11:35' },
        ]
      : [
          { p: 1, time: '13:00 - 13:50' },
          { p: 2, time: '13:55 - 14:45' },
          { p: 3, time: '14:55 - 15:45' },
          { p: 4, time: '15:50 - 16:40' },
          { p: 5, time: '16:45 - 17:35' },
        ];

    fallbackPeriods.forEach((item) => {
      const parsed = parseSlotTimes(item.time, session);
      result.push({
        value: item.time,
        label: `ម៉ោងទី ${toKhmerNum(item.p)} (${item.time})`,
        shortLabel: `ម៉ោង ${toKhmerNum(item.p)}`,
        checkIn: parsed.start,
        checkOut: parsed.end,
        subject: '',
        periodNumber: item.p,
        isFullSession: false,
      });
    });
  }

  return result;
}
