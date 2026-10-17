import React, { useState, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Printer,
  Edit2,
  Save,
  BookOpen,
  User,
  School,
  CheckCircle2,
  Sparkles,
  Info,
  Phone,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Check,
} from 'lucide-react';
import type { ClassRoom, TimetableSlot, TeacherSettings } from '../types';
import { db } from '../db/db';
import { useUndoRedo } from '../context/UndoRedoContext';
import { toKhmerNum, getKhmerLunarDate, getKhmerSolarDate } from '../utils/dateUtils';
import {
  resolveGradeTrack,
  getTrackSubjects,
  GRADE_TRACKS,
  type GradeTrackKey,
} from '../utils/gradeCoefficients';
import { parseGradeNumber } from '../utils/classUtils';
import { Modal } from '../components/common/Modal';
import { PrintButton } from '../components/common/PrintButton';

interface TimetablePageProps {
  classes: ClassRoom[];
  timetableSlots: TimetableSlot[];
  settings: TeacherSettings | null;
  selectedClassId: string;
  onRefresh: () => void;
  defaultMode?: 'class' | 'teacher';
}

const DAYS = [
  { day: 1, nameKh: 'ចន្ទ', nameEn: 'Monday' },
  { day: 2, nameKh: 'អង្គារ', nameEn: 'Tuesday' },
  { day: 3, nameKh: 'ពុធ', nameEn: 'Wednesday' },
  { day: 4, nameKh: 'ព្រហស្បតិ៍', nameEn: 'Thursday' },
  { day: 5, nameKh: 'សុក្រ', nameEn: 'Friday' },
  { day: 6, nameKh: 'សៅរ៍', nameEn: 'Saturday' },
];

// ទម្រង់ម៉ោងតាមរូបភាពទី៤ (ក្រសួងអប់រំ)
const MORNING_PERIODS = [
  { period: 1, time: '7h-8h', label: '7h-8h', session: 'morning' as const },
  { period: 2, time: '8h-9h', label: '8h-9h', session: 'morning' as const },
  { period: 3, time: '9h-10h', label: '9h-10h', session: 'morning' as const },
  { period: 4, time: '10h-11h', label: '10h-11h', session: 'morning' as const },
  { period: 5, time: '11h-12h', label: '11h-12h', session: 'morning' as const },
];

const AFTERNOON_PERIODS = [
  { period: 1, time: '1h-2h', label: '1h-2h', session: 'afternoon' as const },
  { period: 2, time: '2h-3h', label: '2h-3h', session: 'afternoon' as const },
  { period: 3, time: '3h-4h', label: '3h-4h', session: 'afternoon' as const },
  { period: 4, time: '4h-5h', label: '4h-5h', session: 'afternoon' as const },
];

export interface SubjectTheme {
  bg: string;
  badgeBg: string;
  badgeText: string;
  textColor: string;
  borderColor: string;
}

export function getSubjectTheme(subjectName: string): SubjectTheme {
  const s = (subjectName || '').trim().toLowerCase();

  if (s.includes('គណិត') || s.includes('math')) {
    // គណិតវិទ្យា: Soft Blue
    return {
      bg: 'bg-blue-50/80 hover:bg-blue-100/70',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-800',
      textColor: 'text-blue-900',
      borderColor: 'border-blue-200',
    };
  }
  if (s.includes('ខ្មែរ') || s.includes('khmer') || s.includes('តែងសេចក្តី')) {
    // ភាសាខ្មែរ: Soft Emerald
    return {
      bg: 'bg-emerald-50/80 hover:bg-emerald-100/70',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800',
      textColor: 'text-emerald-900',
      borderColor: 'border-emerald-200',
    };
  }
  if (s.includes('រូប') || s.includes('physic')) {
    // រូបវិទ្យា: Soft Cyan / Sky
    return {
      bg: 'bg-cyan-50/80 hover:bg-cyan-100/70',
      badgeBg: 'bg-cyan-100',
      badgeText: 'text-cyan-800',
      textColor: 'text-cyan-900',
      borderColor: 'border-cyan-200',
    };
  }
  if (s.includes('គីមី') || s.includes('chem')) {
    // គីមីវិទ្យា: Soft Amber / Orange
    return {
      bg: 'bg-amber-50/80 hover:bg-amber-100/70',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
      textColor: 'text-amber-900',
      borderColor: 'border-amber-200',
    };
  }
  if (s.includes('ជីវ') || s.includes('bio')) {
    // ជីវវិទ្យា: Soft Teal
    return {
      bg: 'bg-teal-50/80 hover:bg-teal-100/70',
      badgeBg: 'bg-teal-100',
      badgeText: 'text-teal-800',
      textColor: 'text-teal-900',
      borderColor: 'border-teal-200',
    };
  }
  if (s.includes('ប្រវត្តិ') || s.includes('hist')) {
    // ប្រវត្តិវិទ្យា: Soft Rose
    return {
      bg: 'bg-rose-50/80 hover:bg-rose-100/70',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-800',
      textColor: 'text-rose-900',
      borderColor: 'border-rose-200',
    };
  }
  if (s.includes('ភូមិ') || s.includes('geo')) {
    // ភូមិវិទ្យា: Soft Purple
    return {
      bg: 'bg-purple-50/80 hover:bg-purple-100/70',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-800',
      textColor: 'text-purple-900',
      borderColor: 'border-purple-200',
    };
  }
  if (s.includes('ផែនដី') || s.includes('earth')) {
    // ផែនដីវិទ្យា: Soft Lime
    return {
      bg: 'bg-lime-50/80 hover:bg-lime-100/70',
      badgeBg: 'bg-lime-100',
      badgeText: 'text-lime-800',
      textColor: 'text-lime-900',
      borderColor: 'border-lime-200',
    };
  }
  if (s.includes('ពលរដ្ឋ') || s.includes('civic') || s.includes('សីលធម៌')) {
    // ពលរដ្ឋវិទ្យា: Soft Indigo
    return {
      bg: 'bg-indigo-50/80 hover:bg-indigo-100/70',
      badgeBg: 'bg-indigo-100',
      badgeText: 'text-indigo-800',
      textColor: 'text-indigo-900',
      borderColor: 'border-indigo-200',
    };
  }
  if (s.includes('អង់គ្លេស') || s.includes('បារាំង') || s.includes('បរទេស') || s.includes('eng') || s.includes('fr')) {
    // ភាសាបរទេស: Soft Pink / Fuchsia
    return {
      bg: 'bg-pink-50/80 hover:bg-pink-100/70',
      badgeBg: 'bg-pink-100',
      badgeText: 'text-pink-800',
      textColor: 'text-pink-900',
      borderColor: 'border-pink-200',
    };
  }
  if (s.includes('កីឡា') || s.includes('អប់រំកាយ') || s.includes('sport')) {
    // កីឡា: Soft Sky
    return {
      bg: 'bg-sky-50/80 hover:bg-sky-100/70',
      badgeBg: 'bg-sky-100',
      badgeText: 'text-sky-800',
      textColor: 'text-sky-900',
      borderColor: 'border-sky-200',
    };
  }
  if (s.includes('គេហវិទ្យា') || s.includes('សិល្បៈ')) {
    // គេហវិទ្យា / សិល្បៈ: Soft Orange
    return {
      bg: 'bg-orange-50/80 hover:bg-orange-100/70',
      badgeBg: 'bg-orange-100',
      badgeText: 'text-orange-800',
      textColor: 'text-orange-900',
      borderColor: 'border-orange-200',
    };
  }
  if (s.includes('ព័ត៌មានវិទ្យា') || s.includes('កុំព្យូទ័រ') || s.includes('ict') || s.includes('tech')) {
    // ព័ត៌មានវិទ្យា: Soft Violet
    return {
      bg: 'bg-violet-50/80 hover:bg-violet-100/70',
      badgeBg: 'bg-violet-100',
      badgeText: 'text-violet-800',
      textColor: 'text-violet-900',
      borderColor: 'border-violet-200',
    };
  }

  // Default neutral theme
  return {
    bg: 'bg-slate-50/80 hover:bg-slate-100/70',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-200',
  };
}

export const TimetablePage: React.FC<TimetablePageProps> = ({
  classes,
  timetableSlots,
  settings,
  selectedClassId,
  onRefresh,
  defaultMode = 'class',
}) => {
  const { pushSnapshot, showToast } = useUndoRedo();
  const [activeTab, setActiveTab] = useState<'class' | 'teacher'>(defaultMode);
  // Default to 'all' to render full official weekly sheet as shown in Image 4
  const [selectedSession, setSelectedSession] = useState<'morning' | 'afternoon' | 'all'>('all');
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editTeacher, setEditTeacher] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Timetable Official Date Setting (អ្នកប្រើប្រាស់ជាអ្នកកំណត់កាលបរិច្ឆេទ ហើយកាលបរិច្ឆេទថ្នាក់ និងគ្រូដូចគ្នា)
  const [timetableDate, setTimetableDate] = useState<string>(() => {
    return localStorage.getItem('app_timetable_official_date') || new Date().toISOString().split('T')[0];
  });
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customLunarDate, setCustomLunarDate] = useState<string>(() => {
    return localStorage.getItem('app_timetable_custom_lunar') || '';
  });
  const [customSolarDate, setCustomSolarDate] = useState<string>(() => {
    return localStorage.getItem('app_timetable_custom_solar') || '';
  });

  // Active class for class view
  const isAllClasses = selectedClassId === 'ALL';
  const activeClassId = isAllClasses ? (classes[0]?.id || '') : selectedClassId;
  const currentClass = classes.find((c) => c.id === activeClassId);
  const currentClassName = currentClass?.name || '10A';

  // Helper to remove duplicate "ថ្នាក់ទី" or "ថ្នាក់" prefix
  const cleanGradeNumber = (name: string) => (name || '').replace(/^(ថ្នាក់ទី|ថ្នាក់)\s*/i, '').trim();
  const formatClassLabel = (name: string) => {
    const clean = cleanGradeNumber(name);
    return clean ? `ថ្នាក់ទី ${clean}` : (name || 'ថ្នាក់រៀន');
  };

  // Editing class context (used to retrieve subjects and coefficients according to MoEYS standards)
  const editingClass = useMemo(() => {
    if (!editingSlot) return currentClass;
    return classes.find((c) => c.id === editingSlot.classId) || currentClass;
  }, [editingSlot, classes, currentClass]);

  const activeTrackKey = useMemo<GradeTrackKey>(() => {
    if (!editingClass) return '7-8';
    const gNum = parseGradeNumber(editingClass.grade || editingClass.name);
    if (gNum === 11) {
      return editingClass.stream === 'social' ? '11-soc' : '11-sci';
    }
    if (gNum === 12) {
      return editingClass.stream === 'social' ? '12-soc' : '12-sci';
    }
    return resolveGradeTrack(editingClass.name, editingClass.grade || `${gNum}`);
  }, [editingClass]);

  const availableSubjects = useMemo(() => {
    return getTrackSubjects(activeTrackKey, settings?.customGradeCoefficients);
  }, [activeTrackKey, settings?.customGradeCoefficients]);

  const activeTrackDef = useMemo(() => {
    return GRADE_TRACKS.find((t) => t.key === activeTrackKey);
  }, [activeTrackKey]);

  const teacherName = settings?.teacherName || 'ហ៊ុន រដ្ឋា';
  const teacherPhone = settings?.phone || '093 486 987';

  // Dynamic Khmer Lunar & Solar dates computed from user-selected timetableDate (ថ្នាក់ & គ្រូ ប្រើដូចគ្នា)
  const lunarInfo = useMemo(() => getKhmerLunarDate(timetableDate), [timetableDate]);
  const solarInfo = useMemo(() => getKhmerSolarDate(timetableDate), [timetableDate]);

  // Update timetable date
  const handleDateChange = (newDate: string) => {
    setTimetableDate(newDate);
    localStorage.setItem('app_timetable_official_date', newDate);
    showToast(`📅 បានកំណត់កាលបរិច្ឆេទកាលវិភាគ៖ ${newDate}`);
  };

  const handleSaveCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('app_timetable_official_date', timetableDate);
    localStorage.setItem('app_timetable_custom_lunar', customLunarDate);
    localStorage.setItem('app_timetable_custom_solar', customSolarDate);
    setIsDateModalOpen(false);
    showToast('💾 បានរក្សាទុកការកំណត់កាលបរិច្ឆេទកាលវិភាគដោយជោគជ័យ!');
  };

  const handleResetToAutoDate = () => {
    setCustomLunarDate('');
    setCustomSolarDate('');
    localStorage.removeItem('app_timetable_custom_lunar');
    localStorage.removeItem('app_timetable_custom_solar');
    showToast('✨ បានកំណត់កាលបរិច្ឆេទចន្ទគតិ-សុរិយគតិ ស្វ័យប្រវត្តិតាមប្រតិទិន');
  };

  // Filter slots for any specific class
  const getSlotsForClass = useCallback(
    (classId: string) => {
      const map = new Map<string, TimetableSlot>();
      timetableSlots
        .filter((s) => s.classId === classId)
        .forEach((s) => {
          const sess = s.session || 'morning';
          map.set(`${sess}-${s.dayOfWeek}-${s.periodNumber || 1}`, s);
        });
      return map;
    },
    [timetableSlots]
  );

  // Slots taught by this teacher
  const teacherSlots = useMemo(() => {
    return timetableSlots.filter(
      (s) => s.teacherName && s.teacherName.toLowerCase().includes(teacherName.toLowerCase())
    );
  }, [timetableSlots, teacherName]);

  const teacherSlotsMap = useMemo(() => {
    const map = new Map<string, TimetableSlot>();
    teacherSlots.forEach((s) => {
      const sess = s.session || 'morning';
      map.set(`${sess}-${s.dayOfWeek}-${s.periodNumber || 1}`, s);
    });
    return map;
  }, [teacherSlots]);

  // Check if a slot is taught by this teacher or is teacher's specialty subject (សម្រាប់កំណត់អក្សរដិត)
  const isTeacherSlot = (slot: TimetableSlot) => {
    const currentTeacher = (teacherName || '').trim().toLowerCase();
    const currentSpecialty = (settings?.specialtySubject || '').trim().toLowerCase();
    const slotTeacher = (slot.teacherName || '').trim().toLowerCase();
    const slotSubject = (slot.subject || '').trim().toLowerCase();

    const teacherMatches = slotTeacher && (slotTeacher.includes(currentTeacher) || currentTeacher.includes(slotTeacher));
    const subjectMatches = currentSpecialty && (slotSubject.includes(currentSpecialty) || currentSpecialty.includes(slotSubject));

    return Boolean(teacherMatches || subjectMatches);
  };

  // Open slot editor for existing slot
  const handleOpenEdit = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setEditSubject(slot.subject);
    setEditTeacher(slot.teacherName || teacherName);
    setEditPhone(slot.teacherPhone || teacherPhone);
    setEditRoom(slot.room || '');
  };

  // Open editor for empty cell to create a slot
  const handleOpenEmptyCell = (
    sess: 'morning' | 'afternoon',
    day: number,
    period: number,
    timeStr: string,
    targetClassId?: string
  ) => {
    const cId = targetClassId || activeClassId;
    const newSlot: TimetableSlot = {
      id: `tt-${cId}-${sess}-d${day}-p${period}-${Date.now()}`,
      dayOfWeek: day,
      timeSlot: timeStr,
      periodNumber: period,
      session: sess,
      classId: cId,
      subject: '',
      teacherName: teacherName,
      teacherPhone: teacherPhone,
      room: '',
    };
    setEditingSlot(newSlot);
    setEditSubject('');
    setEditTeacher(teacherName);
    setEditPhone(teacherPhone);
    setEditRoom('');
  };

  // Save edited slot
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    await pushSnapshot(`កែសម្រួលកាលវិភាគ "${editSubject.trim()}"`);
    const slotData: TimetableSlot = {
      ...editingSlot,
      subject: editSubject.trim(),
      teacherName: editTeacher.trim(),
      teacherPhone: editPhone.trim(),
      room: editRoom.trim(),
    };

    await db.timetable.put(slotData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    setEditingSlot(null);
    onRefresh();
    showToast(`✨ បានរក្សាទុកម៉ោង "${slotData.subject}"`);
  };

  // Delete single slot from modal
  const handleDeleteSlot = async () => {
    if (!editingSlot) return;
    await pushSnapshot(`លុបម៉ោង ${editingSlot.subject || 'កាលវិភាគ'}`);
    await db.timetable.delete(editingSlot.id);
    setEditingSlot(null);
    onRefresh();
    showToast(`🗑️ បានសម្អាតម៉ោង "${editingSlot.subject || 'កាលវិភាគ'}" (អាចចុច ↶ Undo បាន)`);
  };

  // Direct single slot delete on cell hover with Undo support
  const handleDirectDeleteSlot = async (slot: TimetableSlot) => {
    await pushSnapshot(`លុបម៉ោង ${slot.subject || 'កាលវិភាគ'}`);
    await db.timetable.delete(slot.id);
    onRefresh();
    showToast(`🗑️ បានលុបម៉ោង "${slot.subject || 'កាលវិភាគ'}" (អាចចុច ↶ Undo បាន)`);
  };

  // Bulk delete timetable for active class
  const handleDeleteClassTimetable = async () => {
    const slotsToDelete = timetableSlots.filter((s) => s.classId === activeClassId);
    if (slotsToDelete.length === 0) {
      showToast(`ℹ️ មិនមានកាលវិភាគក្នុង${formatClassLabel(currentClassName)} ត្រូវលុបទេ`);
      setIsDeleteModalOpen(false);
      return;
    }
    await pushSnapshot(`លុបកាលវិភាគ${formatClassLabel(currentClassName)}`);
    await db.timetable.bulkDelete(slotsToDelete.map((s) => s.id));
    setIsDeleteModalOpen(false);
    onRefresh();
    showToast(`🗑️ បានលុបកាលវិភាគ${formatClassLabel(currentClassName)} ទាំងអស់រួចរាល់! (អាចចុច ↶ Undo បាន)`);
  };

  // Bulk delete timetable for this teacher
  const handleDeleteTeacherTimetable = async () => {
    const slotsToDelete = teacherSlots;
    if (slotsToDelete.length === 0) {
      showToast(`ℹ️ មិនមានម៉ោងបង្រៀនរបស់គ្រូ ${teacherName} ត្រូវលុបទេ`);
      setIsDeleteModalOpen(false);
      return;
    }
    await pushSnapshot(`លុបកាលវិភាគគ្រូ ${teacherName}`);
    await db.timetable.bulkDelete(slotsToDelete.map((s) => s.id));
    setIsDeleteModalOpen(false);
    onRefresh();
    showToast(`🗑️ បានលុបម៉ោងបង្រៀនរបស់លោកគ្រូ ${teacherName} ទាំងអស់រួចរាល់! (អាចចុច ↶ Undo បាន)`);
  };

  // Bulk clear all timetables across all classes
  const handleDeleteAllTimetables = async () => {
    if (timetableSlots.length === 0) {
      showToast('ℹ️ មិនមានកាលវិភាគត្រូវលុបទេ');
      setIsDeleteModalOpen(false);
      return;
    }
    await pushSnapshot('លុបកាលវិភាគទាំងអស់');
    await db.timetable.clear();
    setIsDeleteModalOpen(false);
    onRefresh();
    showToast('🗑️ បានលុបកាលវិភាគទាំងអស់គ្រប់ថ្នាក់រួចរាល់! (អាចចុច ↶ Undo បាន)');
  };

  // Render an official timetable sheet (for single class, all classes, or teacher view)
  const renderTimetableSheet = (targetClass: ClassRoom | null, isTeacherMode: boolean) => {
    const sheetClassName = targetClass ? formatClassLabel(targetClass.name) : formatClassLabel(currentClassName);
    const slotsMap = isTeacherMode ? teacherSlotsMap : getSlotsForClass(targetClass?.id || activeClassId);
    const targetClassId = targetClass?.id || activeClassId;

    return (
      <div
        key={isTeacherMode ? 'teacher-timetable' : targetClass?.id || 'class-timetable'}
        id={!isTeacherMode && targetClass ? `timetable-class-${targetClass.id}` : undefined}
        className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0 print:break-after-page mb-6 last:mb-0"
      >
        {/* 🌟 ផ្នែកក្បាលលើកាលវិភាគ (Official MoEYS Document Header from Image 4) */}
        <div className="mb-4 text-slate-900">
          {/* Row 1: Left School & Right Kingdom Header */}
          <div className="flex justify-between items-start text-xs sm:text-sm">
            {/* Left: Ministry & School */}
            <div className="text-left space-y-0.5">
              <p className="font-bold text-slate-800">ការិ.អយក. ស្រុកកំពង់ត្រឡាច</p>
              <p className="font-black text-slate-900 text-sm sm:text-base font-moul">
                {settings?.schoolName || 'វិទ្យាល័យ ហ៊ុនសែន កំពង់ត្រឡាច'}
              </p>
            </div>

            {/* Right: Kingdom Header & Flourish */}
            <div className="text-center space-y-0.5">
              <p className="font-moul text-xs sm:text-sm">ព្រះរាជាណាចក្រកម្ពុជា</p>
              <p className="font-moul text-xs sm:text-sm">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
              <div className="text-xs tracking-widest text-slate-700 font-serif select-none">
                ៚ ៚ ៚
              </div>
            </div>
          </div>

          {/* Row 2: Central Title & Sub-heading */}
          <div className="text-center mt-3 sm:mt-4 space-y-1">
            <h2 className="font-moul text-base sm:text-xl text-slate-950 tracking-wider">
              {isTeacherMode ? 'កាលវិភាគបង្រៀនប្រចាំសប្តាហ៍' : 'កាលវិភាគប្រចាំសប្តាហ៍'}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm font-bold text-slate-800">
              <span className="bg-slate-100 px-3 py-0.5 rounded-lg border border-slate-200 print:bg-transparent print:border-none">
                {isTeacherMode ? `លោកគ្រូ/អ្នកគ្រូ៖ ${teacherName}` : sheetClassName}
              </span>
              <span>
                ឆ្នាំសិក្សា {settings?.academicYear || '២០២៥ - ២០២៦'}
              </span>
              <span className="bg-blue-50 px-3 py-0.5 rounded-lg border border-blue-200 text-blue-900 print:bg-transparent print:border-none print:text-black">
                {isTeacherMode
                  ? `ឯកទេស៖ ${settings?.specialtySubject || 'គណិតវិទ្យា'}`
                  : `បន្ទុកថ្នាក់៖ ${teacherName}`}
              </span>
            </div>
          </div>
        </div>

        {/* 🌟 តារាងកាលវិភាគផ្លូវការ (Official Ministry Timetable Table Grid) */}
        <div className="overflow-x-auto border-2 border-slate-900 rounded-xl overflow-hidden print:border-black">
          <table className="w-full border-collapse text-center text-xs sm:text-sm">
            {/* Columns Header: ម៉ោង | ចន្ទ | អង្គារ | ពុធ | ព្រហស្បតិ៍ | សុក្រ | សៅរ៍ */}
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-black border-b-2 border-slate-900 print:bg-white print:border-black">
                <th className="py-2.5 px-2 w-28 sm:w-32 border-r-2 border-slate-900 font-moul text-xs print:border-black">
                  ម៉ោង
                </th>
                {DAYS.map((d) => (
                  <th
                    key={d.day}
                    className="py-2.5 px-2 border-r-2 border-slate-900 last:border-r-0 font-moul text-xs print:border-black min-w-[110px]"
                  >
                    {d.nameKh}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-900 font-bold print:divide-black">
              {/* 🌅 វេនព្រឹក (Morning Periods: 7h-8h, 8h-9h, 9h-10h, 10h-11h, 11h-12h) */}
              {(selectedSession === 'all' || selectedSession === 'morning') &&
                MORNING_PERIODS.map((period) => (
                  <tr key={`morning-${period.period}`} className="hover:bg-slate-50/70 transition-colors">
                    {/* Time Column (e.g. 7h-8h) */}
                    <td className="py-2.5 px-2 border-r-2 border-slate-900 bg-slate-50/80 font-mono font-black text-xs sm:text-sm text-slate-900 print:bg-white print:border-black whitespace-nowrap">
                      {period.label}
                    </td>

                    {/* Day Columns */}
                    {DAYS.map((d) => {
                      const key = `morning-${d.day}-${period.period}`;
                      const slot = slotsMap.get(key);
                      const isMySubject = slot ? isTeacherSlot(slot) : false;
                      const theme = slot && slot.subject ? getSubjectTheme(slot.subject) : null;
                      const slotClass = slot && isTeacherMode ? classes.find((c) => c.id === slot.classId) : null;

                      return (
                        <td
                          key={d.day}
                          onClick={() => !slot && handleOpenEmptyCell('morning', d.day, period.period, period.time, targetClassId)}
                          className={`py-2 px-2 border-r-2 border-slate-900 last:border-r-0 relative group transition-colors print:border-black ${
                            slot && theme
                              ? `${theme.bg} ${
                                  isMySubject
                                    ? 'ring-2 ring-inset ring-blue-600 shadow-xs print:ring-0'
                                    : ''
                                } cursor-pointer`
                              : 'bg-white/50 hover:bg-slate-100/60 cursor-pointer'
                          }`}
                        >
                          {slot && slot.subject && theme ? (
                            <div className="space-y-0.5">
                              {/* មុខវិជ្ជា */}
                              <div
                                className={`leading-tight transition-all ${
                                  isMySubject
                                    ? 'font-black text-xs sm:text-[13px] text-slate-950 flex items-center justify-center gap-1 drop-shadow-2xs'
                                    : `font-medium text-xs sm:text-[12.5px] ${theme.textColor}`
                                }`}
                                title={isMySubject ? 'មុខវិជ្ជាដែលខ្ញុំបង្រៀន (ដិត)' : slot.subject}
                              >
                                {isMySubject && <span className="text-amber-500 text-xs no-print">⭐</span>}
                                <span>{slot.subject}</span>
                              </div>

                              {/* ឈ្មោះគ្រូបង្រៀន ឬ ថ្នាក់រៀន (បើក្នុងផ្ទាំងគ្រូ) */}
                              {isTeacherMode ? (
                                <div className="text-[11px] font-black text-blue-800 leading-tight">
                                  {slotClass ? formatClassLabel(slotClass.name) : 'ថ្នាក់រៀន'}
                                </div>
                              ) : (
                                <div className="text-[11px] font-bold text-slate-700 leading-tight">
                                  {slot.teacherName || teacherName}
                                </div>
                              )}

                              {/* My Subject Tag Indicator */}
                              {isMySubject && !isTeacherMode && (
                                <div className="text-[9px] font-black text-blue-700 bg-blue-100/90 px-1.5 py-0.2 rounded-md inline-block border border-blue-300 no-print">
                                  ★ ម៉ោងបង្រៀន
                                </div>
                              )}

                              {/* Action Buttons on Hover (Edit & Delete) */}
                              <div className="absolute top-1 right-1 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity no-print bg-white/95 rounded-md shadow-2xs p-0.5 border border-slate-200">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEdit(slot);
                                  }}
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="កែប្រែម៉ោងនេះ"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDirectDeleteSlot(slot);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="លុបម៉ោងនេះចេញ (↶ Undo បាន)"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="py-2 text-slate-300 hover:text-blue-500 transition-colors text-xs select-none">
                              <span className="group-hover:hidden">-</span>
                              <span className="hidden group-hover:inline text-[10px] font-bold text-blue-600 no-print">
                                + បន្ថែម
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

              {/* 🌇 របារខណ្ឌវេន «រសៀល» (Full-Width Afternoon Divider Bar matching Image 4) */}
              {selectedSession === 'all' && (
                <tr className="bg-slate-200 border-y-2 border-slate-900 print:bg-slate-100 print:border-black">
                  <td
                    colSpan={7}
                    className="py-1 text-center font-moul text-xs sm:text-sm text-slate-900 tracking-widest select-none"
                  >
                    រសៀល
                  </td>
                </tr>
              )}

              {/* 🌇 វេនរសៀល (Afternoon Periods: 1h-2h, 2h-3h, 3h-4h, 4h-5h) */}
              {(selectedSession === 'all' || selectedSession === 'afternoon') &&
                AFTERNOON_PERIODS.map((period) => (
                  <tr key={`afternoon-${period.period}`} className="hover:bg-slate-50/70 transition-colors">
                    {/* Time Column (e.g. 1h-2h) */}
                    <td className="py-2.5 px-2 border-r-2 border-slate-900 bg-slate-50/80 font-mono font-black text-xs sm:text-sm text-slate-900 print:bg-white print:border-black whitespace-nowrap">
                      {period.label}
                    </td>

                    {/* Day Columns */}
                    {DAYS.map((d) => {
                      const key = `afternoon-${d.day}-${period.period}`;
                      const slot = slotsMap.get(key);
                      const isMySubject = slot ? isTeacherSlot(slot) : false;
                      const theme = slot && slot.subject ? getSubjectTheme(slot.subject) : null;
                      const slotClass = slot && isTeacherMode ? classes.find((c) => c.id === slot.classId) : null;

                      return (
                        <td
                          key={d.day}
                          onClick={() => !slot && handleOpenEmptyCell('afternoon', d.day, period.period, period.time, targetClassId)}
                          className={`py-2 px-2 border-r-2 border-slate-900 last:border-r-0 relative group transition-colors print:border-black ${
                            slot && theme
                              ? `${theme.bg} ${
                                  isMySubject
                                    ? 'ring-2 ring-inset ring-blue-600 shadow-xs print:ring-0'
                                    : ''
                                } cursor-pointer`
                              : 'bg-white/50 hover:bg-slate-100/60 cursor-pointer'
                          }`}
                        >
                          {slot && slot.subject && theme ? (
                            <div className="space-y-0.5">
                              {/* មុខវិជ្ជា */}
                              <div
                                className={`leading-tight transition-all ${
                                  isMySubject
                                    ? 'font-black text-xs sm:text-[13px] text-slate-950 flex items-center justify-center gap-1 drop-shadow-2xs'
                                    : `font-medium text-xs sm:text-[12.5px] ${theme.textColor}`
                                }`}
                                title={isMySubject ? 'មុខវិជ្ជាដែលខ្ញុំបង្រៀន (ដិត)' : slot.subject}
                              >
                                {isMySubject && <span className="text-amber-500 text-xs no-print">⭐</span>}
                                <span>{slot.subject}</span>
                              </div>

                              {/* ឈ្មោះគ្រូបង្រៀន ឬ ថ្នាក់រៀន (បើក្នុងផ្ទាំងគ្រូ) */}
                              {isTeacherMode ? (
                                <div className="text-[11px] font-black text-blue-800 leading-tight">
                                  {slotClass ? formatClassLabel(slotClass.name) : 'ថ្នាក់រៀន'}
                                </div>
                              ) : (
                                <div className="text-[11px] font-bold text-slate-700 leading-tight">
                                  {slot.teacherName || teacherName}
                                </div>
                              )}

                              {/* My Subject Tag Indicator */}
                              {isMySubject && !isTeacherMode && (
                                <div className="text-[9px] font-black text-blue-700 bg-blue-100/90 px-1.5 py-0.2 rounded-md inline-block border border-blue-300 no-print">
                                  ★ ម៉ោងបង្រៀន
                                </div>
                              )}

                              {/* Action Buttons on Hover (Edit & Delete) */}
                              <div className="absolute top-1 right-1 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity no-print bg-white/95 rounded-md shadow-2xs p-0.5 border border-slate-200">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEdit(slot);
                                  }}
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="កែប្រែម៉ោងនេះ"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDirectDeleteSlot(slot);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="លុបម៉ោងនេះចេញ (↶ Undo បាន)"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="py-2 text-slate-300 hover:text-blue-500 transition-colors text-xs select-none">
                              <span className="group-hover:hidden">-</span>
                              <span className="hidden group-hover:inline text-[10px] font-bold text-blue-600 no-print">
                                + បន្ថែម
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* 🌟 ហត្ថលេខា និងកាលបរិច្ឆេទផ្លូវការខាងក្រោម (Official Document Footer matching Image 4) */}
        <div className="mt-8 pt-4 flex flex-col sm:flex-row justify-between items-start text-xs sm:text-sm text-slate-900 gap-6">
          {/* Left Signature: គ្រូបន្ទុកថ្នាក់ */}
          <div className="text-center w-60 sm:w-64 space-y-1">
            <p className="font-bold">បានឃើញ និងឯកភាព</p>
            <p className="font-bold text-slate-700">
              {isTeacherMode ? 'គ្រូបង្រៀន' : 'គ្រូបន្ទុកថ្នាក់'}
            </p>
            <div className="h-16 sm:h-20 flex items-center justify-center">
              <span className="text-[11px] text-slate-300 italic no-print">(ហត្ថលេខា)</span>
            </div>
            <p className="font-black text-slate-900 font-moul text-xs">{teacherName}</p>
            <p className="text-[11px] text-slate-600 font-mono font-bold">ទូរស័ព្ទ៖ {teacherPhone}</p>
          </div>

          {/* Right Signature: កាលបរិច្ឆេទចន្ទគតិ-សុរិយគតិ និង នាយកសាលា */}
          <div className="text-center w-72 sm:w-80 space-y-1 self-end sm:self-auto">
            <div
              onClick={() => setIsDateModalOpen(true)}
              className="cursor-pointer hover:bg-blue-50/70 p-1.5 rounded-xl border border-transparent hover:border-blue-200 transition-all group relative"
              title="ចុចដើម្បីកំណត់/កែប្រែកាលបរិច្ឆេទកាលវិភាគ (ថ្នាក់ & គ្រូ ប្រើដូចគ្នា)"
            >
              <p className="text-xs sm:text-[12.5px] font-bold text-slate-800">
                ធ្វើនៅ{customLunarDate.trim() || lunarInfo.fullLunarStr}
              </p>
              <p className="text-xs sm:text-[12.5px] font-bold text-slate-800">
                {customSolarDate.trim() || `${settings?.provinceCity || 'កំពង់ត្រឡាច'}, ${solarInfo.shortSolarStr}`}
              </p>
              <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity block no-print font-bold">
                ✏️ កែប្រែកាលបរិច្ឆេទ
              </span>
            </div>
            <p className="font-black text-slate-900 font-moul text-xs sm:text-sm pt-1">
              នាយកសាលា
            </p>
            <div className="h-14 sm:h-16 flex items-center justify-center">
              <span className="text-[11px] text-slate-300 italic no-print">(ហត្ថលេខា និងត្រា)</span>
            </div>
            <p className="font-black text-slate-900 font-moul text-xs">
              {settings?.principalName || 'នាយកសាលា'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Banner and Controls (no-print) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4 no-print">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-black text-slate-800 flex items-center">
              <Calendar className="w-6 h-6 text-blue-600 mr-2" />
              {activeTab === 'class'
                ? (isAllClasses
                    ? `កាលវិភាគប្រចាំសប្តាហ៍ (គ្រប់ថ្នាក់ទាំងអស់ - ${classes.length} ថ្នាក់)`
                    : `កាលវិភាគប្រចាំសប្តាហ៍ (${formatClassLabel(currentClassName)})`)
                : `កាលវិភាគបង្រៀនរបស់លោកគ្រូ (${teacherName})`}
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200 whitespace-nowrap">
              {activeTab === 'class'
                ? (isAllClasses ? `🌟 គ្រប់ថ្នាក់ទាំងអស់ (${classes.length} ថ្នាក់)` : formatClassLabel(currentClassName))
                : `ឯកទេស៖ ${settings?.specialtySubject || 'គណិតវិទ្យា'}`}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            ទម្រង់កាលវិភាគផ្លូវការក្រសួងអប់រំ (រូបទី៤)៖ រក្សាពេញលេញនូវ <strong>មុខវិជ្ជា និងឈ្មោះគ្រូបង្រៀន</strong>
          </p>
        </div>

        {/* Tab & Session Switcher + Print Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Class vs Teacher Tab */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab('class')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'class'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>កាលវិភាគតាមថ្នាក់</span>
            </button>
            <button
              onClick={() => setActiveTab('teacher')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'teacher'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>កាលវិភាគគ្រូ ({teacherName})</span>
            </button>
          </div>

          {/* Session Switcher (ព្រឹក / រសៀល / ពេញមួយថ្ងៃ) */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setSelectedSession('all')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedSession === 'all' ? 'bg-white text-blue-700 shadow-2xs font-black' : 'text-slate-600'
              }`}
              title="បង្ហាញពេញមួយថ្ងៃ (ព្រឹក + រសៀល ដូចរូបទី៤)"
            >
              📋 ពេញមួយថ្ងៃ
            </button>
            <button
              onClick={() => setSelectedSession('morning')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedSession === 'morning' ? 'bg-white text-blue-700 shadow-2xs font-black' : 'text-slate-600'
              }`}
            >
              🌅 ព្រឹក (7h-12h)
            </button>
            <button
              onClick={() => setSelectedSession('afternoon')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedSession === 'afternoon' ? 'bg-white text-amber-700 shadow-2xs font-black' : 'text-slate-600'
              }`}
            >
              🌇 រសៀល (1h-5h)
            </button>
          </div>

          {/* Date Picker Control (កាលបរិច្ឆេទកាលវិភាគ - ថ្នាក់ & គ្រូ ប្រើដូចគ្នា) */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
            <span className="text-slate-600 px-2 py-1 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-blue-600" />
              កាលបរិច្ឆេទ៖
            </span>
            <input
              type="date"
              value={timetableDate}
              onChange={(e) => {
                if (e.target.value) handleDateChange(e.target.value);
              }}
              className="bg-white px-2 py-1 rounded-lg border border-slate-300 font-mono text-xs font-bold text-slate-800 cursor-pointer hover:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              title="ជ្រើសរើសកាលបរិច្ឆេទកាលវិភាគ (ថ្នាក់ & គ្រូ ប្រើដូចគ្នា)"
            />
            <button
              type="button"
              onClick={() => setIsDateModalOpen(true)}
              className="px-2 py-1 ml-0.5 rounded-lg text-blue-700 hover:bg-white transition-colors cursor-pointer"
              title="កែសម្រួលកាលបរិច្ឆេទចន្ទគតិ-សុរិយគតិលម្អិត"
            >
              កែសម្រួល
            </button>
          </div>

          {/* Delete Timetable Button (លុបកាលវិភាគ) */}
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="inline-flex items-center px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors cursor-pointer shrink-0"
            title="លុបកាលវិភាគ (មានជម្រើសលុបតាមថ្នាក់ តាមគ្រូ ឬទាំងអស់)"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-600" />
            លុបកាលវិភាគ
          </button>

          {/* Print with Orientation Selector */}
          <PrintButton defaultOrientation="landscape" label="បោះពុម្ព" />
        </div>
      </div>

      {/* Quick Jump Bar when All Classes is selected (no-print) */}
      {isAllClasses && activeTab === 'class' && classes.length > 1 && (
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-blue-200/80 shadow-xs flex flex-wrap items-center gap-2 no-print">
          <span className="text-xs font-black text-blue-900 flex items-center mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2 inline-block animate-pulse"></span>
            រំលងទៅកាលវិភាគថ្នាក់៖
          </span>
          {classes.map((cls) => (
            <a
              key={cls.id}
              href={`#timetable-class-${cls.id}`}
              className="px-3 py-1.5 text-xs font-bold bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl border border-slate-200 transition-colors shadow-2xs"
            >
              {formatClassLabel(cls.name)}
            </a>
          ))}
        </div>
      )}

      {/* Render Timetable Sheet(s) */}
      {activeTab === 'teacher' ? (
        renderTimetableSheet(null, true)
      ) : isAllClasses ? (
        classes.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-500">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-sm">មិនទាន់មានថ្នាក់រៀននៅឡើយទេ</p>
            <p className="text-xs text-slate-400 mt-1">សូមបង្កើតថ្នាក់រៀនជាមុនសិនដើម្បីរៀបចំកាលវិភាគ</p>
          </div>
        ) : (
          <div className="space-y-6">
            {classes.map((cls) => renderTimetableSheet(cls, false))}
          </div>
        )
      ) : (
        renderTimetableSheet(currentClass || classes[0] || null, false)
      )}

      {/* Edit Slot Modal */}
      <Modal
        isOpen={!!editingSlot}
        onClose={() => setEditingSlot(null)}
        title="កែសម្រួលកាលវិភាគបង្រៀន"
        subtitle={
          editingSlot
            ? `ថ្ងៃ${DAYS.find((d) => d.day === editingSlot.dayOfWeek)?.nameKh} • ម៉ោង ${editingSlot.timeSlot} (${editingSlot.session === 'morning' ? 'វេនព្រឹក' : 'វេនរសៀល'})`
            : ''
        }
        maxWidth="md"
      >
        {editingSlot && (
          <form onSubmit={handleSaveSlot} className="space-y-4 text-xs sm:text-sm">
            {/* Subject Selector according to Coefficient Matrix */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  មុខវិជ្ជា <span className="text-rose-500">*</span>
                </label>
                {activeTrackDef && (
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    កម្រិត៖ {activeTrackDef.label}
                  </span>
                )}
              </div>

              {/* Quick Dropdown Selection with Coefficients */}
              <div className="space-y-2">
                <select
                  value={availableSubjects.some((s) => s.name === editSubject) ? editSubject : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setEditSubject(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-bold bg-white border border-blue-400 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer text-slate-800"
                >
                  <option value="">-- ចុចទីនេះដើម្បីរើសមុខវិជ្ជា (តាមមេគុណ) --</option>
                  {availableSubjects.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      📚 {sub.name} (មេគុណ {sub.coefficient} • ពិន្ទុអតិ. {sub.maxScore})
                    </option>
                  ))}
                </select>

                {/* Direct text input for fine-tuning or custom subjects */}
                <input
                  type="text"
                  required
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="ឧ. គណិតវិទ្យា, ភាសាខ្មែរ, រូបវិទ្យា..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
                />

                {/* Quick Chips with Subject & Coefficient */}
                <div className="space-y-1 pt-0.5">
                  <span className="text-[10px] text-slate-500 font-bold block">
                    ចុចលើមុខវិជ្ជាដើម្បីជ្រើសរើសភ្លាមៗ (១-Click Select)៖
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                    {availableSubjects.map((sub) => {
                      const isSelected = editSubject === sub.name;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setEditSubject(sub.name)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-700 shadow-xs scale-102'
                              : 'bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 border-slate-200'
                          }`}
                          title={`${sub.name} - មេគុណ: ${sub.coefficient} (ពិន្ទុអតិបរមា: ${sub.maxScore})`}
                        >
                          <span>{sub.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-black font-mono ${
                              isSelected
                                ? 'bg-blue-700 text-white'
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}
                          >
                            ×{sub.coefficient}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ឈ្មោះគ្រូបង្រៀន
                </label>
                <input
                  type="text"
                  value={editTeacher}
                  onChange={(e) => setEditTeacher(e.target.value)}
                  placeholder="ឈ្មោះគ្រូ..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  លេខទូរស័ព្ទគ្រូ
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="093 486 987"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                បន្ទប់សិក្សា (ស្រេចចិត្ត)
              </label>
              <input
                type="text"
                value={editRoom}
                onChange={(e) => setEditRoom(e.target.value)}
                placeholder="ឧ. បន្ទប់ ១០A, បន្ទប់កុំព្យូទ័រ..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleDeleteSlot}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                សម្អាតម៉ោងនេះ
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  រក្សាទុក
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Date Setting Modal (កំណត់កាលបរិច្ឆេទកាលវិភាគ) */}
      <Modal
        isOpen={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        title="📅 កំណត់កាលបរិច្ឆេទកាលវិភាគ (Timetable Date Setting)"
        subtitle="កាលបរិច្ឆេទនេះនឹងត្រូវបង្ហាញលើកាលវិភាគផ្លូវការ (ទាំងកាលវិភាគតាមថ្នាក់ និងកាលវិភាគគ្រូ)"
        maxWidth="md"
      >
        <form onSubmit={handleSaveCustomDates} className="space-y-4 text-xs sm:text-sm">
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ជ្រើសរើសកាលបរិច្ឆេទ <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={timetableDate}
              onChange={(e) => setTimetableDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono font-bold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Quick Date Selectors */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold text-slate-500">កាលបរិច្ឆេទរហ័ស៖</span>
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setTimetableDate(today);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              ថ្ងៃនេះ
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
                const monday = new Date(d.setDate(diff)).toISOString().split('T')[0];
                setTimetableDate(monday);
              }}
              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              ថ្ងៃច័ន្ទសប្តាហ៍នេះ
            </button>
          </div>

          {/* Dynamic Preview Banner */}
          <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl space-y-1.5 text-xs text-amber-950">
            <p className="font-bold flex items-center text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600 mr-1.5" />
              ទម្រង់កាលបរិច្ឆេទស្វ័យប្រវត្តិតាមប្រតិទិនខ្មែរ៖
            </p>
            <div className="space-y-1 pl-5 text-[12px]">
              <p>
                🌙 <strong>ចន្ទគតិ៖</strong> ធ្វើនៅ{lunarInfo.fullLunarStr}
              </p>
              <p>
                ☀️ <strong>សុរិយគតិ៖</strong> {settings?.provinceCity || 'កំពង់ត្រឡាច'}, {solarInfo.shortSolarStr}
              </p>
            </div>
          </div>

          {/* Manual Customization (Optional) */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 text-xs">
                កែសម្រួលអត្ថបទដោយផ្ទាល់ (ស្រេចចិត្ត)៖
              </span>
              {(customLunarDate || customSolarDate) && (
                <button
                  type="button"
                  onClick={handleResetToAutoDate}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  កំណត់ស្វ័យប្រវត្តិតាមប្រតិទិន
                </button>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                អត្ថបទចន្ទគតិ (ឧ. ធ្វើនៅថ្ងៃចន្ទ ២កើត ខែកត្តិក ឆ្នាំរោង ឆស័ក ព.ស. ២៥៧០)
              </label>
              <input
                type="text"
                value={customLunarDate}
                onChange={(e) => setCustomLunarDate(e.target.value)}
                placeholder={`ធ្វើនៅ${lunarInfo.fullLunarStr}`}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                អត្ថបទសុរិយគតិ (ឧ. ខេត្តកំពង់ចាម, ថ្ងៃទី១២ ខែតុលា ឆ្នាំ២០២៦)
              </label>
              <input
                type="text"
                value={customSolarDate}
                onChange={(e) => setCustomSolarDate(e.target.value)}
                placeholder={`${settings?.provinceCity || 'កំពង់ត្រឡាច'}, ${solarInfo.shortSolarStr}`}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsDateModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              រក្សាទុកកាលបរិច្ឆេទ
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Timetable Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="🗑️ លុបកាលវិភាគបង្រៀន (Delete Timetable)"
        subtitle="សូមជ្រើសរើសជម្រើសខាងក្រោមដើម្បីលុបទិន្នន័យកាលវិភាគ (អាចចុច Undo ដើម្បីយកមកវិញបាន)"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">ការលុបកាលវិភាគមិនបាត់បង់ទិន្នន័យរហូតឡើយ៖</p>
              <p className="text-rose-700 mt-0.5">
                លោកគ្រូអ្នកគ្រូអាចចុចប៊ូតុង <strong>↶ Undo</strong> (Ctrl+Z) នៅផ្នែកខាងលើនៃប្រព័ន្ធដើម្បីទាញយកកាលវិភាគដែលបានលុបមកវិញបានគ្រប់ពេលវេលា។
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {/* Option 1: Delete active class timetable */}
            <button
              type="button"
              onClick={handleDeleteClassTimetable}
              className="w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div>
                <p className="font-bold text-slate-800 group-hover:text-rose-700">
                  ១. លុបកាលវិភាគ{formatClassLabel(currentClassName)}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  លុបម៉ោងបង្រៀនទាំងអស់សម្រាប់តែ{formatClassLabel(currentClassName)} (ថ្នាក់ដទៃនៅដដែល)
                </p>
              </div>
              <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-rose-600 shrink-0 ml-2" />
            </button>

            {/* Option 2: Delete this teacher's timetable */}
            <button
              type="button"
              onClick={handleDeleteTeacherTimetable}
              className="w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div>
                <p className="font-bold text-slate-800 group-hover:text-rose-700">
                  ២. លុបម៉ោងបង្រៀនរបស់គ្រូ ({teacherName})
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  លុបតែម៉ោងដែលបង្រៀនដោយលោកគ្រូ {teacherName} គ្រប់ថ្នាក់
                </p>
              </div>
              <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-rose-600 shrink-0 ml-2" />
            </button>

            {/* Option 3: Delete all timetables across all classes */}
            <button
              type="button"
              onClick={handleDeleteAllTimetables}
              className="w-full text-left p-3.5 rounded-2xl border border-rose-200 bg-rose-50/40 hover:bg-rose-100/60 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div>
                <p className="font-black text-rose-800">
                  ៣. សម្អាតកាលវិភាគទាំងអស់គ្រប់ថ្នាក់ (Reset All)
                </p>
                <p className="text-[11px] text-rose-600 mt-0.5">
                  សម្អាតទិន្នន័យកាលវិភាគទាំងអស់ក្នុងប្រព័ន្ធឱ្យនៅទទេស្អាត
                </p>
              </div>
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0 ml-2" />
            </button>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              បិទផ្ទាំង
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
