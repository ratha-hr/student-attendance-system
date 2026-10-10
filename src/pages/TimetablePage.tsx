import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import type { ClassRoom, TimetableSlot, TeacherSettings } from '../types';
import { db } from '../db/db';
import { toKhmerNum, getKhmerLunarDate, getKhmerSolarDate } from '../utils/dateUtils';
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

export const TimetablePage: React.FC<TimetablePageProps> = ({
  classes,
  timetableSlots,
  settings,
  selectedClassId,
  onRefresh,
  defaultMode = 'class',
}) => {
  const [activeTab, setActiveTab] = useState<'class' | 'teacher'>(defaultMode);
  // Default to 'all' to render full official weekly sheet as shown in Image 4
  const [selectedSession, setSelectedSession] = useState<'morning' | 'afternoon' | 'all'>('all');
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editTeacher, setEditTeacher] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active class for class view
  const activeClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
  const currentClass = classes.find((c) => c.id === activeClassId);
  const currentClassName = currentClass?.name || '10A';

  const teacherName = settings?.teacherName || 'ហ៊ុន រដ្ឋា';
  const teacherPhone = settings?.phone || '093 486 987';

  // Dynamic Khmer Lunar & Solar dates for official footer
  const lunarInfo = useMemo(() => getKhmerLunarDate(), []);
  const solarInfo = useMemo(() => getKhmerSolarDate(), []);

  // Filter slots for active class
  const classSlotsMap = useMemo(() => {
    const map = new Map<string, TimetableSlot>();
    timetableSlots
      .filter((s) => s.classId === activeClassId)
      .forEach((s) => {
        const sess = s.session || 'morning';
        map.set(`${sess}-${s.dayOfWeek}-${s.periodNumber || 1}`, s);
      });
    return map;
  }, [timetableSlots, activeClassId]);

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

  // Open slot editor for existing slot
  const handleOpenEdit = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setEditSubject(slot.subject);
    setEditTeacher(slot.teacherName || teacherName);
    setEditPhone(slot.teacherPhone || teacherPhone);
    setEditRoom(slot.room || '');
  };

  // Open editor for empty cell to create a slot
  const handleOpenEmptyCell = (sess: 'morning' | 'afternoon', day: number, period: number, timeStr: string) => {
    const newSlot: TimetableSlot = {
      id: `tt-${activeClassId}-${sess}-d${day}-p${period}-${Date.now()}`,
      dayOfWeek: day,
      timeSlot: timeStr,
      periodNumber: period,
      session: sess,
      classId: activeClassId,
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
  };

  // Delete slot
  const handleDeleteSlot = async () => {
    if (!editingSlot) return;
    await db.timetable.delete(editingSlot.id);
    setEditingSlot(null);
    onRefresh();
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
                ? `កាលវិភាគប្រចាំសប្តាហ៍ (${currentClassName})`
                : `កាលវិភាគបង្រៀនរបស់លោកគ្រូ (${teacherName})`}
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
              {activeTab === 'class' ? `ថ្នាក់ ${currentClassName}` : `ឯកទេស៖ ${settings?.specialtySubject || 'គណិតវិទ្យា'}`}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            ទម្រង់កាលវិភាគផ្លូវការក្រសួងអប់រំ (រូបទី៤)៖ រក្សាពេញលេញនូវ <strong>មុខវិជ្ជា, ឈ្មោះគ្រូ, និងលេខទូរស័ព្ទ</strong>
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

          {/* Print with Orientation Selector */}
          <PrintButton defaultOrientation="landscape" label="បោះពុម្ព" />
        </div>
      </div>

      {/* Official Timetable Sheet Container (Matching Image 4) */}
      <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0">
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
              កាលវិភាគប្រចាំសប្តាហ៍
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm font-bold text-slate-800">
              <span className="bg-slate-100 px-3 py-0.5 rounded-lg border border-slate-200 print:bg-transparent print:border-none">
                ថ្នាក់ទី "{currentClassName}"
              </span>
              <span>
                ឆ្នាំសិក្សា {settings?.academicYear || '២០២៥ - ២០២៦'}
              </span>
              <span className="bg-blue-50 px-3 py-0.5 rounded-lg border border-blue-200 text-blue-900 print:bg-transparent print:border-none print:text-black">
                បន្ទុកថ្នាក់ {teacherName}
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
                      const slot = activeTab === 'class' ? classSlotsMap.get(key) : teacherSlotsMap.get(key);

                      return (
                        <td
                          key={d.day}
                          onClick={() => !slot && handleOpenEmptyCell('morning', d.day, period.period, period.time)}
                          className={`py-2 px-2 border-r-2 border-slate-900 last:border-r-0 relative group transition-colors print:border-black ${
                            slot
                              ? 'bg-white hover:bg-blue-50/50 cursor-pointer'
                              : 'bg-white/50 hover:bg-slate-100/60 cursor-pointer'
                          }`}
                        >
                          {slot && slot.subject ? (
                            <div className="space-y-0.5">
                              {/* មុខវិជ្ជា */}
                              <div className="font-moul text-xs sm:text-[13px] text-slate-950 leading-tight">
                                {slot.subject}
                              </div>
                              {/* ឈ្មោះគ្រូបង្រៀន */}
                              <div className="text-[11px] font-bold text-slate-700 leading-tight">
                                {slot.teacherName || teacherName}
                              </div>
                              {/* លេខទូរស័ព្ទគ្រូ */}
                              <div className="text-[10px] font-mono font-bold text-blue-700 print:text-black">
                                ☎️ {slot.teacherPhone || teacherPhone}
                              </div>
                              {/* Edit Action Button on Hover */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(slot);
                                }}
                                className="absolute top-1 right-1 p-1 text-slate-400 hover:text-blue-600 rounded bg-white shadow-2xs opacity-0 group-hover:opacity-100 transition-opacity no-print"
                                title="កែប្រែម៉ោងនេះ"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
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
                      const slot = activeTab === 'class' ? classSlotsMap.get(key) : teacherSlotsMap.get(key);

                      return (
                        <td
                          key={d.day}
                          onClick={() => !slot && handleOpenEmptyCell('afternoon', d.day, period.period, period.time)}
                          className={`py-2 px-2 border-r-2 border-slate-900 last:border-r-0 relative group transition-colors print:border-black ${
                            slot
                              ? 'bg-white hover:bg-blue-50/50 cursor-pointer'
                              : 'bg-white/50 hover:bg-slate-100/60 cursor-pointer'
                          }`}
                        >
                          {slot && slot.subject ? (
                            <div className="space-y-0.5">
                              {/* មុខវិជ្ជា */}
                              <div className="font-moul text-xs sm:text-[13px] text-slate-950 leading-tight">
                                {slot.subject}
                              </div>
                              {/* ឈ្មោះគ្រូបង្រៀន */}
                              <div className="text-[11px] font-bold text-slate-700 leading-tight">
                                {slot.teacherName || teacherName}
                              </div>
                              {/* លេខទូរស័ព្ទគ្រូ */}
                              <div className="text-[10px] font-mono font-bold text-blue-700 print:text-black">
                                ☎️ {slot.teacherPhone || teacherPhone}
                              </div>
                              {/* Edit Action Button on Hover */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(slot);
                                }}
                                className="absolute top-1 right-1 p-1 text-slate-400 hover:text-blue-600 rounded bg-white shadow-2xs opacity-0 group-hover:opacity-100 transition-opacity no-print"
                                title="កែប្រែម៉ោងនេះ"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
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
              {activeTab === 'class' ? 'គ្រូបន្ទុកថ្នាក់' : 'គ្រូបង្រៀន'}
            </p>
            <div className="h-16 sm:h-20 flex items-center justify-center">
              <span className="text-[11px] text-slate-300 italic no-print">(ហត្ថលេខា)</span>
            </div>
            <p className="font-black text-slate-900 font-moul text-xs">{teacherName}</p>
            <p className="text-[11px] text-slate-600 font-mono font-bold">ទូរស័ព្ទ៖ {teacherPhone}</p>
          </div>

          {/* Right Signature: កាលបរិច្ឆេទចន្ទគតិ-សុរិយគតិ និង នាយកសាលា */}
          <div className="text-center w-72 sm:w-80 space-y-1 self-end sm:self-auto">
            <p className="text-xs sm:text-[12.5px] font-bold text-slate-800">
              ធ្វើនៅ{lunarInfo.fullLunarStr}
            </p>
            <p className="text-xs sm:text-[12.5px] font-bold text-slate-800">
              {settings?.provinceCity || 'កំពង់ត្រឡាច'}, {solarInfo.shortSolarStr}
            </p>
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
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                មុខវិជ្ជា <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                placeholder="ឧ. គណិតវិទ្យា, ភាសាខ្មែរ, រូបវិទ្យា..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
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
    </div>
  );
};
