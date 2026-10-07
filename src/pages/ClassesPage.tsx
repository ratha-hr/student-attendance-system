import React, { useState } from 'react';
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  School,
  DoorOpen,
  Calendar,
  Layers,
} from 'lucide-react';
import type { ClassRoom, Student } from '../types';
import { db } from '../db/db';
import { Modal } from '../components/common/Modal';
import { toKhmerNum } from '../utils/dateUtils';
import type { NavTab } from '../components/Sidebar';

interface ClassesPageProps {
  classes: ClassRoom[];
  students: Student[];
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  onNavigate: (tab: NavTab) => void;
  onRefresh: () => void;
}

export const ClassesPage: React.FC<ClassesPageProps> = ({
  classes,
  students,
  selectedClassId,
  onSelectClass,
  onNavigate,
  onRefresh,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('៧');
  const [academicYear, setAcademicYear] = useState('២០២៤-២០២៥');
  const [room, setRoom] = useState('');
  const [description, setDescription] = useState('');

  const openAddModal = () => {
    setEditingClass(null);
    setName('');
    setGrade('៧');
    setAcademicYear('២០២៤-២០២៥');
    setRoom('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: ClassRoom) => {
    setEditingClass(c);
    setName(c.name);
    setGrade(c.grade);
    setAcademicYear(c.academicYear);
    setRoom(c.room || '');
    setDescription(c.description || '');
    setIsModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingClass) {
      await db.classes.update(editingClass.id, {
        name: name.trim(),
        grade: grade.trim(),
        academicYear: academicYear.trim(),
        room: room.trim(),
        description: description.trim(),
      });
    } else {
      const newClass: ClassRoom = {
        id: 'class-' + Date.now(),
        name: name.trim(),
        grade: grade.trim(),
        academicYear: academicYear.trim(),
        room: room.trim(),
        description: description.trim(),
        createdAt: new Date().toISOString(),
      };
      await db.classes.add(newClass);
    }

    setIsModalOpen(false);
    onRefresh();
  };

  const handleDeleteClass = async (c: ClassRoom) => {
    const studentCount = students.filter((s) => s.classId === c.id).length;
    const confirmMessage = studentCount > 0
      ? `តើអ្នកពិតជាចង់លុប "${c.name}" ដែលមានសិស្សចំនួន ${toKhmerNum(studentCount)} នាក់មែនទេ?`
      : `តើអ្នកពិតជាចង់លុប "${c.name}" មែនទេ?`;

    if (window.confirm(confirmMessage)) {
      await db.classes.delete(c.id);
      if (selectedClassId === c.id) {
        onSelectClass('ALL');
      }
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center">
            <GraduationCap className="w-6 h-6 text-blue-600 mr-2" />
            ការគ្រប់គ្រងថ្នាក់រៀន (n ថ្នាក់)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            លោកគ្រូ-អ្នកគ្រូអាចបង្កើតថ្នាក់រៀនជាច្រើន (n ថ្នាក់) គ្រប់គ្រងតាមកម្រិតថ្នាក់ និងបន្ទប់រៀន
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          បង្កើតថ្នាក់ថ្មី
        </button>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {classes.map((cls) => {
          const classStudents = students.filter((s) => s.classId === cls.id);
          const maleCount = classStudents.filter((s) => s.gender === 'ប្រុស').length;
          const femaleCount = classStudents.filter((s) => s.gender === 'ស្រី').length;
          const isSelected = selectedClassId === cls.id;

          return (
            <div
              key={cls.id}
              className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20'
                  : 'border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100 bg-linear-to-b from-slate-50/50 to-white">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                      កម្រិតថ្នាក់ទី {cls.grade}
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 mt-1.5">{cls.name}</h3>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(cls)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="កែប្រែថ្នាក់"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClass(cls)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="លុបថ្នាក់"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {cls.description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{cls.description}</p>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-3 flex-1">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center space-x-2 text-slate-600">
                    <DoorOpen className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{cls.room || 'បន្ទប់ទូទៅ'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{cls.academicYear}</span>
                  </div>
                </div>

                {/* Student Count Box */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center">
                      <Users className="w-3.5 h-3.5 mr-1 text-slate-500" /> សិស្សសរុប៖
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {toKhmerNum(classStudents.length)} នាក់
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60">
                    <span className="text-pink-600 font-medium">ស្រី: {toKhmerNum(femaleCount)}</span>
                    <span className="text-blue-600 font-medium">ប្រុស: {toKhmerNum(maleCount)}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectClass(cls.id)}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  {isSelected ? 'កំពុងជ្រើស' : 'ជ្រើសរើសថ្នាក់នេះ'}
                </button>

                <button
                  onClick={() => {
                    onSelectClass(cls.id);
                    onNavigate('students');
                  }}
                  className="py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  បញ្ជីសិស្ស
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add / Edit Class */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClass ? 'កែប្រែព័ត៌មានថ្នាក់រៀន' : 'បង្កើតថ្នាក់រៀនថ្មី'}
        subtitle="សូមបំពេញព័ត៌មានលម្អិតនៃថ្នាក់រៀន"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveClass} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ឈ្មោះថ្នាក់រៀន <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ឧទាហរណ៍៖ ថ្នាក់ទី ៧ ក, ថ្នាក់ទី ៩ ខ..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                កម្រិតថ្នាក់ (Grade) <span className="text-rose-500">*</span>
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {['៧', '៨', '៩', '១០', '១១', '១២'].map((g) => (
                  <option key={g} value={g}>
                    ថ្នាក់ទី {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ឆ្នាំសិក្សា <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="២០២៤-២០២៥"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              បន្ទប់រៀន / អគារ
            </label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="ឧទាហរណ៍៖ បន្ទប់ ១០១, អគារ A ជាន់ទី១..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ការពិពណ៌នា / កំណត់ចំណាំ
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="កំណត់ចំណាំផ្សេងៗពីថ្នាក់រៀន..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
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
              {editingClass ? 'រក្សាទុកការកែប្រែ' : 'បង្កើតថ្នាក់'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
