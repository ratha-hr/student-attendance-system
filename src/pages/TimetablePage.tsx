import React, { useState } from 'react';
import {
  Clock,
  Printer,
  Plus,
  Calendar,
  School,
  Edit2,
  Trash2,
} from 'lucide-react';
import type { ClassRoom, TimetableSlot, TeacherSettings } from '../types';
import { Modal } from '../components/common/Modal';

interface TimetablePageProps {
  classes: ClassRoom[];
  settings: TeacherSettings | null;
}

export const TimetablePage: React.FC<TimetablePageProps> = ({ classes, settings }) => {
  const days = [
    { id: 1, name: 'ច័ន្ទ (Mon)' },
    { id: 2, name: 'អង្គារ (Tue)' },
    { id: 3, name: 'ពុធ (Wed)' },
    { id: 4, name: 'ព្រហស្បតិ៍ (Thu)' },
    { id: 5, name: 'សុក្រ (Fri)' },
    { id: 6, name: 'សៅរ៍ (Sat)' },
  ];

  const timeSlots = [
    { id: 't1', label: 'ម៉ោងទី ១', time: '07:00 - 07:50' },
    { id: 't2', label: 'ម៉ោងទី ២', time: '07:50 - 08:40' },
    { id: 't3', label: 'ម៉ោងទី ៣', time: '09:00 - 09:50' },
    { id: 't4', label: 'ម៉ោងទី ៤', time: '09:50 - 10:40' },
    { id: 't5', label: 'ម៉ោងទី ៥', time: '13:30 - 14:20' },
    { id: 't6', label: 'ម៉ោងទី ៦', time: '14:20 - 15:10' },
  ];

  // Default demo schedule
  const [schedule, setSchedule] = useState<Record<string, { className: string; subject: string; room: string }>>({
    '1-t1': { className: 'ថ្នាក់ទី ៧ ក', subject: 'ភាសាខ្មែរ', room: 'បន្ទប់ ១០១' },
    '1-t2': { className: 'ថ្នាក់ទី ៧ ក', subject: 'ភាសាខ្មែរ', room: 'បន្ទប់ ១០១' },
    '2-t1': { className: 'ថ្នាក់ទី ៨ ខ', subject: 'ភាសាខ្មែរ', room: 'បន្ទប់ ២០៣' },
    '2-t2': { className: 'ថ្នាក់ទី ៨ ខ', subject: 'ភាសាខ្មែរ', room: 'បន្ទប់ ២០៣' },
    '3-t3': { className: 'ថ្នាក់ទី ១០ វិទ្យាសាស្ត្រ', subject: 'ភាសាខ្មែរ', room: 'បន្ទប់ ៣០២' },
    '3-t4': { className: 'ថ្នាក់ទី ១០ វិទ្យាសាស្ត្រ', subject: 'ភាសាខ្មែរ', room: 'បន្ទប់ ៣០២' },
    '4-t1': { className: 'ថ្នាក់ទី ៧ ក', subject: 'តែងសេចក្តី', room: 'បន្ទប់ ១០១' },
    '4-t2': { className: 'ថ្នាក់ទី ៧ ក', subject: 'តែងសេចក្តី', room: 'បន្ទប់ ១០១' },
    '5-t1': { className: 'ថ្នាក់ទី ៨ ខ', subject: 'អក្សរសិល្ប៍', room: 'បន្ទប់ ២០៣' },
    '5-t2': { className: 'ថ្នាក់ទី ៨ ខ', subject: 'អក្សរសិល្ប៍', room: 'បន្ទប់ ២០៣' },
    '6-t1': { className: 'ថ្នាក់ទី ៧ ក', subject: 'តេស្តប្រចាំសប្តាហ៍', room: 'បន្ទប់ ១០១' },
  });

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(classes[0]?.name || '');
  const [selectedSubject, setSelectedSubject] = useState(settings?.specialtySubject || 'ភាសាខ្មែរ');
  const [selectedRoom, setSelectedRoom] = useState('បន្ទប់ ១០១');

  const openSlotModal = (dayId: number, slotId: string) => {
    const key = `${dayId}-${slotId}`;
    setEditingKey(key);
    const existing = schedule[key];
    if (existing) {
      setSelectedClass(existing.className);
      setSelectedSubject(existing.subject);
      setSelectedRoom(existing.room);
    } else {
      setSelectedClass(classes[0]?.name || 'ថ្នាក់ទី ៧ ក');
      setSelectedSubject(settings?.specialtySubject || 'ភាសាខ្មែរ');
      setSelectedRoom('បន្ទប់ ១០១');
    }
    setIsModalOpen(true);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKey) return;

    setSchedule((prev) => ({
      ...prev,
      [editingKey]: {
        className: selectedClass,
        subject: selectedSubject,
        room: selectedRoom,
      },
    }));
    setIsModalOpen(false);
  };

  const handleDeleteSlot = () => {
    if (!editingKey) return;
    setSchedule((prev) => {
      const copy = { ...prev };
      delete copy[editingKey];
      return copy;
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center">
            <Clock className="w-6 h-6 text-blue-600 mr-2" />
            កាលវិភាគបង្រៀនប្រចាំសប្តាហ៍
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            កាលវិភាគម៉ោងបង្រៀន ច័ន្ទ ដល់ សៅរ៍ សម្រាប់គ្រូបង្រៀន {settings?.teacherName}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4 mr-1.5" />
          បោះពុម្ពកាលវិភាគ
        </button>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block text-center my-4">
        <h3 className="font-moul text-base">ព្រះរាជាណាចក្រកម្ពុជា</h3>
        <h4 className="font-moul text-sm">ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
        <div className="w-24 h-0.5 bg-black mx-auto my-2" />
        <h2 className="font-moul text-base mt-3">
          កាលវិភាគបង្រៀនប្រចាំសប្តាហ៍ - ឆ្នាំសិក្សា {settings?.academicYear}
        </h2>
        <p className="text-xs mt-1">
          គ្រូបង្រៀន៖ {settings?.teacherName} • {settings?.schoolName}
        </p>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase">
                <th className="py-3 px-3 w-28 text-center border-r border-slate-200">ម៉ោង / ពេល</th>
                {days.map((d) => (
                  <th key={d.id} className="py-3 px-3 text-center border-r border-slate-200 min-w-[130px]">
                    {d.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timeSlots.map((slot) => (
                <tr key={slot.id} className="hover:bg-slate-50/50">
                  {/* Time column */}
                  <td className="py-3 px-3 text-center bg-slate-50 border-r border-slate-200">
                    <span className="font-bold text-slate-800 block">{slot.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{slot.time}</span>
                  </td>

                  {/* Day cells */}
                  {days.map((day) => {
                    const key = `${day.id}-${slot.id}`;
                    const entry = schedule[key];

                    return (
                      <td
                        key={day.id}
                        onClick={() => openSlotModal(day.id, slot.id)}
                        className="py-2 px-2 text-center border-r border-slate-200 hover:bg-blue-50/60 cursor-pointer transition-colors align-top"
                      >
                        {entry ? (
                          <div className="p-2 rounded-xl bg-linear-to-b from-blue-50 to-indigo-50/50 border border-blue-200 text-left shadow-2xs">
                            <p className="font-bold text-blue-900 text-xs truncate">{entry.className}</p>
                            <p className="text-[11px] text-indigo-700 font-medium truncate">{entry.subject}</p>
                            <p className="text-[10px] text-slate-400 mt-1 truncate">{entry.room}</p>
                          </div>
                        ) : (
                          <div className="h-14 flex items-center justify-center text-slate-300 hover:text-blue-500 text-[11px] font-medium border border-dashed border-transparent hover:border-blue-300 rounded-xl">
                            + ទំនេរ
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
      </div>

      {/* Modal: Edit Timetable Slot */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="កំណត់ម៉ោងបង្រៀន"
        subtitle="ជ្រើសរើសថ្នាក់រៀន និងមុខវិជ្ជា"
        maxWidth="md"
      >
        <form onSubmit={handleSaveSlot} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ថ្នាក់រៀន
            </label>
            <input
              type="text"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              placeholder="ឧ. ថ្នាក់ទី ៧ ក"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              មុខវិជ្ជា
            </label>
            <input
              type="text"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              placeholder="ឧ. ភាសាខ្មែរ"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              បន្ទប់រៀន
            </label>
            <input
              type="text"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              placeholder="ឧ. បន្ទប់ ១០១"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {editingKey && schedule[editingKey] ? (
              <button
                type="button"
                onClick={handleDeleteSlot}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                លុបចេញ (ដាក់ទំនេរ)
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                បោះបង់
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                រក្សាទុក
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
