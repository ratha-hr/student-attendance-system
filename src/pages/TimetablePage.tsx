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
} from 'lucide-react';
import type { ClassRoom, TimetableSlot, TeacherSettings } from '../types';
import { db } from '../db/db';
import { toKhmerNum } from '../utils/dateUtils';
import { Modal } from '../components/common/Modal';

interface TimetablePageProps {
  classes: ClassRoom[];
  timetableSlots: TimetableSlot[];
  settings: TeacherSettings | null;
  selectedClassId: string;
  onRefresh: () => void;
  defaultMode?: 'class' | 'teacher';
}

const DAYS = [
  { day: 1, nameKh: 'ច័ន្ទ', nameEn: 'Monday' },
  { day: 2, nameKh: 'អង្គារ', nameEn: 'Tuesday' },
  { day: 3, nameKh: 'ពុធ', nameEn: 'Wednesday' },
  { day: 4, nameKh: 'ព្រហស្បតិ៍', nameEn: 'Thursday' },
  { day: 5, nameKh: 'សុក្រ', nameEn: 'Friday' },
  { day: 6, nameKh: 'សៅរ៍', nameEn: 'Saturday' },
];

const PERIODS = [
  { period: 1, time: '០៧:០០ - ០៧:៥០', label: 'ម៉ោងទី ១' },
  { period: 2, time: '០៧:៥៥ - ០៨:៤៥', label: 'ម៉ោងទី ២' },
  { period: 3, time: '០៩:០៥ - ០៩:៥៥', label: 'ម៉ោងទី ៣' },
  { period: 4, time: '១០:០០ - ១០:៥០', label: 'ម៉ោងទី ៤' },
  { period: 5, time: '១០:៥៥ - ១១:៤៥', label: 'ម៉ោងទី ៥' },
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
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editTeacher, setEditTeacher] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active class for class view
  const activeClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
  const currentClass = classes.find((c) => c.id === activeClassId);

  // Filter slots for the active class
  const classSlotsMap = useMemo(() => {
    const map = new Map<string, TimetableSlot>(); // key: `day-period`
    timetableSlots
      .filter((s) => s.classId === activeClassId)
      .forEach((s) => {
        map.set(`${s.dayOfWeek}-${s.periodNumber || 1}`, s);
      });
    return map;
  }, [timetableSlots, activeClassId]);

  // Slots taught by teacher ហ៊ុន រដ្ឋា (or current teacher)
  const teacherName = settings?.teacherName || 'ហ៊ុន រដ្ឋា';
  const teacherSlots = useMemo(() => {
    return timetableSlots.filter(
      (s) => s.teacherName && s.teacherName.toLowerCase().includes(teacherName.toLowerCase())
    );
  }, [timetableSlots, teacherName]);

  const teacherSlotsMap = useMemo(() => {
    const map = new Map<string, TimetableSlot>(); // key: `day-period`
    teacherSlots.forEach((s) => {
      map.set(`${s.dayOfWeek}-${s.periodNumber || 1}`, s);
    });
    return map;
  }, [teacherSlots]);

  // Open slot editor
  const handleOpenEdit = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setEditSubject(slot.subject);
    setEditTeacher(slot.teacherName || '');
    setEditRoom(slot.room || '');
  };

  // Save edited slot
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    await db.timetable.update(editingSlot.id, {
      subject: editSubject.trim(),
      teacherName: editTeacher.trim(),
      room: editRoom.trim(),
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    setEditingSlot(null);
    onRefresh();
  };

  return (
    <div className="space-y-5">
      {/* Top Banner and Mode Switcher */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-black text-slate-800 flex items-center">
              <Calendar className="w-6 h-6 text-blue-600 mr-2" />
              {activeTab === 'class'
                ? `កាលវិភាគបង្រៀនប្រចាំថ្នាក់ (${currentClass?.name || 'ថ្នាក់រៀន'})`
                : `កាលវិភាគបង្រៀនរបស់លោកគ្រូ (${teacherName})`}
            </h2>
            <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
              {activeTab === 'class' ? (currentClass?.name || 'ថ្នាក់រៀន') : `ឯកទេស៖ ${settings?.specialtySubject || 'គណិតវិទ្យា'}`}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            {activeTab === 'class'
              ? 'កាលវិភាគប្រចាំសប្តាហ៍ពីថ្ងៃច័ន្ទ ដល់ថ្ងៃសៅរ៍ បែងចែកតាមម៉ោងសិក្សា និងគ្រូបង្រៀន'
              : `តារាងម៉ោងបង្រៀនប្រចាំសប្តាហ៍របស់លោកគ្រូ ${teacherName} មុខវិជ្ជា ${settings?.specialtySubject || 'គណិតវិទ្យា'}`}
          </p>
        </div>

        {/* Tab Switcher & Print */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
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

          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            បោះពុម្ព (Print A4)
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      {activeTab === 'teacher' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">គ្រូបង្រៀន</p>
            <p className="text-lg font-black text-slate-800 mt-1">{teacherName}</p>
            <p className="text-[11px] text-blue-600 font-semibold">{settings?.specialtySubject || 'គណិតវិទ្យា'}</p>
          </div>
          <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 shadow-2xs">
            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">សរុបម៉ោងបង្រៀន</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{toKhmerNum(teacherSlots.length)} ម៉ោង/សប្តាហ៍</p>
            <p className="text-[11px] text-blue-600 font-medium">ស្របតាមស្តង់ដារក្រសួង</p>
          </div>
          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">ចំនួនថ្នាក់បង្រៀន</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{toKhmerNum(classes.length)} ថ្នាក់</p>
            <p className="text-[11px] text-emerald-600 font-medium">ថ្នាក់ទី ៧ ដល់ ទី ១២</p>
          </div>
          <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-200 shadow-2xs">
            <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">លេខទូរស័ព្ទទំនាក់ទំនង</p>
            <p className="text-xs font-bold text-indigo-900 mt-1.5 leading-relaxed">{settings?.phone || '093 486 987'}</p>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-3.5 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2 text-xs text-blue-900">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              ម៉ោងបង្រៀនរបស់ <strong>លោកគ្រូ {teacherName}</strong> (មុខវិជ្ជា <strong>{settings?.specialtySubject || 'គណិតវិទ្យា'}</strong>) ត្រូវបានសម្គាល់ដោយ <strong className="text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">ពណ៌ខៀវដិត</strong> ងាយស្រួលផ្ទៀងផ្ទាត់!
            </span>
          </div>
          <span className="text-xs font-bold text-blue-700 hidden sm:inline">
            បន្ទប់៖ {currentClass?.room || 'អគារសិក្សា'}
          </span>
        </div>
      )}

      {/* Official Printable Header (Visible Only on Print) */}
      <div className="hidden print:block text-center mb-6">
        <h3 className="font-moul text-base">ព្រះរាជាណាចក្រកម្ពុជា</h3>
        <h4 className="font-moul text-sm">ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
        <div className="w-24 h-0.5 bg-black mx-auto my-2" />
        <div className="flex justify-between items-start text-left mt-3 text-xs">
          <div>
            <p className="font-bold">{settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}</p>
            <p>ឆ្នាំសិក្សា៖ {settings?.academicYear || '២០២៤-២០២៥'}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">
              {activeTab === 'class' ? `ថ្នាក់៖ ${currentClass?.name}` : `គ្រូបង្រៀន៖ ${teacherName}`}
            </p>
            <p>មុខវិជ្ជា៖ {settings?.specialtySubject || 'គណិតវិទ្យា'}</p>
          </div>
        </div>
        <h2 className="font-moul text-base mt-4">
          {activeTab === 'class'
            ? `កាលវិភាគបង្រៀនប្រចាំសប្តាហ៍ (${currentClass?.name})`
            : `កាលវិភាគបង្រៀនប្រចាំសប្តាហ៍របស់លោកគ្រូ ${teacherName}`}
        </h2>
      </div>

      {/* Timetable Table (Responsive Grid) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-800 text-white font-bold text-center">
                <th className="py-3 px-3 w-32 border border-slate-700">
                  <div className="flex items-center justify-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>ម៉ោង / ថ្ងៃ</span>
                  </div>
                </th>
                {DAYS.map((d) => (
                  <th key={d.day} className="py-3 px-3 border border-slate-700 min-w-[130px]">
                    <div className="font-bold">{d.nameKh}</div>
                    <div className="text-[10px] text-slate-300 font-normal">{d.nameEn}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {PERIODS.map((period, pIdx) => {
                return (
                  <React.Fragment key={period.period}>
                    {/* Recess separator after period 2 */}
                    {pIdx === 2 && (
                      <tr className="bg-amber-50/80 border-y border-amber-200 text-amber-800 text-center font-bold text-xs">
                        <td colSpan={7} className="py-1.5 px-3 tracking-wider">
                          ☕ ម៉ោងចេញលេង / សម្រាក (០៨:៤៥ - ០៩:០៥)
                        </td>
                      </tr>
                    )}
                    <tr>
                      {/* Period Header */}
                      <td className="py-3 px-2 bg-slate-50 border border-slate-200 text-center font-bold">
                        <div className="text-slate-900 font-black">{period.label}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{period.time}</div>
                      </td>

                      {/* Day Columns */}
                      {DAYS.map((d) => {
                        const key = `${d.day}-${period.period}`;
                        const slot = activeTab === 'class' ? classSlotsMap.get(key) : teacherSlotsMap.get(key);

                        if (activeTab === 'teacher') {
                          // Teacher View
                          if (slot) {
                            const slotClass = classes.find((c) => c.id === slot.classId);
                            return (
                              <td
                                key={d.day}
                                className="py-2.5 px-2.5 border border-slate-200 bg-blue-50/70 hover:bg-blue-100/70 transition-colors text-center relative group"
                              >
                                <div className="font-black text-blue-900 text-xs sm:text-sm">
                                  {slotClass?.name || 'ថ្នាក់រៀន'}
                                </div>
                                <div className="text-[11px] font-bold text-blue-700 mt-0.5">
                                  {slot.subject}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {slot.room || slotClass?.room || ''}
                                </div>
                                <button
                                  onClick={() => handleOpenEdit(slot)}
                                  className="absolute top-1 right-1 p-1 text-slate-400 hover:text-blue-600 rounded bg-white/80 shadow-2xs opacity-0 group-hover:opacity-100 transition-opacity no-print"
                                  title="កែប្រែម៉ោងនេះ"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </td>
                            );
                          } else {
                            // Free Period
                            return (
                              <td
                                key={d.day}
                                className="py-3 px-2 border border-slate-200 bg-slate-50/50 text-center text-slate-300 text-xs"
                              >
                                <span className="text-[11px] text-slate-400 font-medium">ម៉ោងទំនេរ</span>
                              </td>
                            );
                          }
                        } else {
                          // Class View
                          const isRatha =
                            slot?.teacherName &&
                            slot.teacherName.toLowerCase().includes(teacherName.toLowerCase());

                          return (
                            <td
                              key={d.day}
                              className={`py-2.5 px-2.5 border border-slate-200 text-center relative group transition-colors ${
                                isRatha
                                  ? 'bg-blue-50/90 hover:bg-blue-100/90 ring-1 ring-blue-300 inset-0'
                                  : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              {slot ? (
                                <>
                                  <div
                                    className={`font-black text-xs sm:text-sm ${
                                      isRatha ? 'text-blue-900 font-black' : 'text-slate-800 font-bold'
                                    }`}
                                  >
                                    {slot.subject}
                                  </div>
                                  <div
                                    className={`text-[11px] font-semibold mt-0.5 ${
                                      isRatha ? 'text-blue-700 font-bold' : 'text-slate-600'
                                    }`}
                                  >
                                    {isRatha ? `⭐ ${slot.teacherName}` : slot.teacherName || '-'}
                                  </div>
                                  {slot.room && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">{slot.room}</div>
                                  )}
                                  <button
                                    onClick={() => handleOpenEdit(slot)}
                                    className="absolute top-1 right-1 p-1 text-slate-400 hover:text-blue-600 rounded bg-white/80 shadow-2xs opacity-0 group-hover:opacity-100 transition-opacity no-print"
                                    title="កែប្រែម៉ោងនេះ"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        }
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Signatures Block on Print */}
      <div className="hidden print:block mt-8 text-xs">
        <div className="flex justify-between items-start">
          <div className="text-center w-52">
            <p className="font-bold">បានឃើញ និងអនុម័ត</p>
            <p className="text-[11px] text-slate-500">នាយកសាលា</p>
            <div className="h-20" />
            <p className="font-bold">{settings?.principalName || 'នាយកសាលា'}</p>
          </div>

          <div className="text-center w-52">
            <p className="italic text-[11px]">
              {settings?.provinceCity || 'ខេត្តកំពង់ឆ្នាំង'}, ថ្ងៃទី....... ខែ....... ឆ្នាំ២០២...
            </p>
            <p className="font-bold">
              {activeTab === 'class' ? 'គ្រូបន្ទុកថ្នាក់' : 'គ្រូបង្រៀន'}
            </p>
            <div className="h-20" />
            <p className="font-bold">{teacherName}</p>
            <p className="text-[10px] text-slate-500">{settings?.phone}</p>
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
            ? `ថ្ងៃ${DAYS.find((d) => d.day === editingSlot.dayOfWeek)?.nameKh} - ${
                PERIODS.find((p) => p.period === editingSlot.periodNumber)?.label
              }`
            : ''
        }
        maxWidth="md"
      >
        {editingSlot && (
          <form onSubmit={handleSaveSlot} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                មុខវិជ្ជា <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                placeholder="ឧ. គណិតវិទ្យា, រូបវិទ្យា..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ឈ្មោះគ្រូបង្រៀន
              </label>
              <input
                type="text"
                value={editTeacher}
                onChange={(e) => setEditTeacher(e.target.value)}
                placeholder="ឧ. ហ៊ុន រដ្ឋា"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                បន្ទប់រៀន
              </label>
              <input
                type="text"
                value={editRoom}
                onChange={(e) => setEditRoom(e.target.value)}
                placeholder="ឧ. បន្ទប់ ៣០២ (អគារ C)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                បោះបង់
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                រក្សាទុក
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
