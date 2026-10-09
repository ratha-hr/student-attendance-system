import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  BookOpen,
  Search,
  Sparkles,
  RotateCcw,
  Users,
  AlertTriangle,
} from 'lucide-react';
import type { ClassRoom, Student } from '../types';
import { db } from '../db/db';
import { toKhmerNum } from '../utils/dateUtils';
import {
  sortClasses,
  parseGradeNumber,
  generateStandardClasses,
  STANDARD_CLASS_CONFIGS,
} from '../utils/classUtils';
import { Modal } from './common/Modal';

interface ManageClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  students: Student[];
  onRefresh: () => void;
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  academicYear?: string;
}

export const ManageClassesModal: React.FC<ManageClassesModalProps> = ({
  isOpen,
  onClose,
  classes,
  students,
  onRefresh,
  selectedClassId,
  onSelectClass,
  academicYear = '២០២៤-២០២៥',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');

  // Add custom class state
  const [customClassName, setCustomClassName] = useState('');

  // Quick generator state
  const [quickGrade, setQuickGrade] = useState('7');
  const [quickLetter, setQuickLetter] = useState('F');

  // Inline edit state
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState('');

  // Status feedback message
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Sorted classes
  const sortedClassList = useMemo(() => sortClasses(classes), [classes]);

  // Filtered classes based on tab and search query
  const filteredClasses = useMemo(() => {
    return sortedClassList.filter((c) => {
      const gNum = parseGradeNumber(c.grade || c.name);
      const matchesGrade =
        selectedGradeFilter === 'ALL' ||
        (selectedGradeFilter === 'OTHER' && (gNum < 7 || gNum > 12)) ||
        `${gNum}` === selectedGradeFilter;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || (c.grade && c.grade.includes(q));

      return matchesGrade && matchesSearch;
    });
  }, [sortedClassList, selectedGradeFilter, searchQuery]);

  // Handle adding custom class
  const handleAddCustomClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = customClassName.trim();
    if (!name) return;

    // Check duplicate
    if (classes.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      showFeedback('error', `ថ្នាក់ "${name}" មានរួចហើយ!`);
      return;
    }

    const gNum = parseGradeNumber(name);
    const newClass: ClassRoom = {
      id: 'class-' + Date.now(),
      name,
      grade: gNum !== 999 ? `${gNum}` : 'ទូទៅ',
      academicYear,
      createdAt: new Date().toISOString(),
    };

    await db.classes.add(newClass);
    setCustomClassName('');
    onSelectClass(newClass.id);
    onRefresh();
    showFeedback('success', `បានបន្ថែម "${name}" ដោយជោគជ័យ!`);
  };

  // Handle quick adding standard class (Grade + Letter)
  const handleQuickAddClass = async () => {
    const fullName = `ថ្នាក់ទី ${quickGrade}${quickLetter.toUpperCase()}`;
    if (classes.some((c) => c.name.toLowerCase() === fullName.toLowerCase())) {
      showFeedback('error', `ថ្នាក់ "${fullName}" មានរួចហើយ!`);
      return;
    }

    const newClass: ClassRoom = {
      id: `class-${quickGrade}-${quickLetter.toLowerCase()}-${Date.now()}`,
      name: fullName,
      grade: quickGrade,
      academicYear,
      createdAt: new Date().toISOString(),
    };

    await db.classes.add(newClass);
    onSelectClass(newClass.id);
    onRefresh();
    showFeedback('success', `បានបង្កើត "${fullName}" ដោយជោគជ័យ!`);
  };

  // Start inline edit
  const handleStartEdit = (c: ClassRoom) => {
    setEditingClassId(c.id);
    setEditingClassName(c.name);
  };

  // Save inline edit
  const handleSaveEdit = async (c: ClassRoom) => {
    const newName = editingClassName.trim();
    if (!newName) return;

    if (newName !== c.name && classes.some((item) => item.id !== c.id && item.name.toLowerCase() === newName.toLowerCase())) {
      showFeedback('error', `ឈ្មោះ "${newName}" មានក្នុងថ្នាក់ផ្សេងរួចហើយ!`);
      return;
    }

    const gNum = parseGradeNumber(newName);
    await db.classes.update(c.id, {
      name: newName,
      grade: gNum !== 999 ? `${gNum}` : c.grade,
      room: '', // Ensure room remains empty
    });

    setEditingClassId(null);
    onRefresh();
    showFeedback('success', `បានកែប្រែឈ្មោះថ្នាក់ទៅជា "${newName}" រួចរាល់!`);
  };

  // Handle delete class directly WITHOUT confirmation
  const handleDeleteClass = async (c: ClassRoom) => {
    const enrolledStudents = students.filter((s) => s.classId === c.id);
    const count = enrolledStudents.length;

    // Delete class from DB
    await db.classes.delete(c.id);

    // If there were enrolled students, unassign their classId
    if (count > 0) {
      for (const stu of enrolledStudents) {
        await db.students.update(stu.id, { classId: '' });
      }
    }

    // If the deleted class was selected, reset to ALL
    if (selectedClassId === c.id) {
      onSelectClass('ALL');
    }

    onRefresh();
    showFeedback('success', `បានលុប "${c.name}" រួចរាល់!`);
  };

  // Handle delete ALL classes
  const handleDeleteAllClasses = async () => {
    if (classes.length === 0) return;
    await db.classes.clear();
    for (const stu of students) {
      if (stu.classId) {
        await db.students.update(stu.id, { classId: '' });
      }
    }
    onSelectClass('ALL');
    onRefresh();
    showFeedback('success', 'បានលុបថ្នាក់ទាំងអស់រួចរាល់!');
  };

  // Quick add standard classes for a specific grade (ថ្នាក់ទី ៧, ថ្នាក់ទី ៨, ថ្នាក់ទី ៩...)
  const handleAddGradeClasses = async (grade: string) => {
    const cfg = STANDARD_CLASS_CONFIGS.find((c) => c.grade === grade);
    if (!cfg) return;

    const existingNames = new Set(classes.map((c) => c.name.toLowerCase()));
    const toAdd: ClassRoom[] = [];

    cfg.letters.forEach((letter, idx) => {
      const fullName = `ថ្នាក់ទី ${cfg.grade}${letter}`;
      if (!existingNames.has(fullName.toLowerCase())) {
        const id = idx === 0 ? cfg.mainId : `class-${cfg.grade}-${letter.toLowerCase()}-${Date.now()}`;
        toAdd.push({
          id,
          name: fullName,
          grade: cfg.grade,
          academicYear,
          description: `ថ្នាក់ ${cfg.grade}${letter} (${cfg.levelLabel})`,
          createdAt: new Date().toISOString(),
        });
      }
    });

    if (toAdd.length === 0) {
      showFeedback('error', `ថ្នាក់ទី ${toKhmerNum(grade)} មានរួចរាល់ទាំងអស់ហើយ!`);
      return;
    }

    await db.classes.bulkAdd(toAdd);
    onRefresh();
    showFeedback('success', `បានបន្ថែមថ្នាក់ទី ${toKhmerNum(grade)} (${toKhmerNum(toAdd.length)} ថ្នាក់) ដោយជោគជ័យ!`);
  };

  // Reset or regenerate all 49 standard classes
  const handleRestoreStandardClasses = async () => {
    await db.ensureStandardClasses();
    onRefresh();
    showFeedback('success', 'បានបង្កើតថ្នាក់ស្តង់ដារទាំង ៤៩ ថ្នាក់រួចរាល់!');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🏫 គ្រប់គ្រងថ្នាក់រៀន (បន្ថែម • បន្ថយ • កែប្រែ)"
      subtitle={`សរុប ${toKhmerNum(classes.length)} ថ្នាក់ | គ្មានបន្ទប់ និងអគារ`}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`p-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between animate-fade-in ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-rose-50 text-rose-800 border border-rose-300'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} className="cursor-pointer text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TOP SECTION: Add New Class Box (Custom Input + Quick Creator) */}
        <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center">
              <Plus className="w-4 h-4 text-blue-600 mr-1.5" />
              បន្ថែមថ្នាក់ថ្មីតាមចិត្ត៖
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              (អាចវាយឈ្មោះផ្ទាល់ ឬជ្រើសរើសអក្សរដើម្បីបង្កើតរហ័ស)
            </span>
          </div>

          {/* Form 1: Direct text input */}
          <form onSubmit={handleAddCustomClass} className="flex gap-2">
            <input
              type="text"
              value={customClassName}
              onChange={(e) => setCustomClassName(e.target.value)}
              placeholder="វាយឈ្មោះថ្នាក់ថ្មី (ឧ. ថ្នាក់ទី 7F ឬ ថ្នាក់ទី 10M...)"
              className="flex-1 px-3.5 py-2 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
            />
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" />
              បន្ថែមថ្នាក់
            </button>
          </form>

          {/* Form 2: Quick Creator Preset (Grade 7-12 + Letters A-Z) */}
          <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600">បង្កើតរហ័ស៖</span>
            <div className="flex items-center space-x-1">
              <span className="text-xs font-bold text-slate-700">ថ្នាក់ទី</span>
              <select
                value={quickGrade}
                onChange={(e) => setQuickGrade(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-slate-800 cursor-pointer shadow-2xs"
              >
                {['7', '8', '9', '10', '11', '12'].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-xs font-bold text-slate-700">អក្សរ</span>
              <select
                value={quickLetter}
                onChange={(e) => setQuickLetter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-slate-800 cursor-pointer shadow-2xs"
              >
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleQuickAddClass}
              className="inline-flex items-center px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              + បង្កើត (ថ្នាក់ទី {quickGrade}{quickLetter})
            </button>
          </div>

          {/* Form 3: Quick Grade Batch Generators (ថ្នាក់ទី ៧, ៨, ៩, ១០, ១១, ១២) & Action Buttons */}
          <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 mr-1">បន្ថែមតាមកម្រិត៖</span>
              {[
                { grade: '7', label: 'ថ្នាក់ទី ៧ (7A-7E)' },
                { grade: '8', label: 'ថ្នាក់ទី ៨ (8A-8E)' },
                { grade: '9', label: 'ថ្នាក់ទី ៩ (9A-9D)' },
                { grade: '10', label: 'ថ្នាក់ទី ១០ (10A-10L)' },
                { grade: '11', label: 'ថ្នាក់ទី ១១ (11A-11J)' },
                { grade: '12', label: 'ថ្នាក់ទី ១២ (12A-12M)' },
              ].map((item) => (
                <button
                  key={item.grade}
                  type="button"
                  onClick={() => handleAddGradeClasses(item.grade)}
                  className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-slate-200 hover:border-blue-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  title={`បន្ថែម ${item.label}`}
                >
                  + {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={handleRestoreStandardClasses}
                className="inline-flex items-center px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                title="បង្កើតថ្នាក់ស្តង់ដារទាំង ៤៩ ថ្នាក់ឡើងវិញ"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                បង្កើតថ្នាក់ស្តង់ដារ (7A-12M)
              </button>

              <button
                type="button"
                onClick={handleDeleteAllClasses}
                className="inline-flex items-center px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                title="លុបថ្នាក់ទាំងអស់"
              >
                <Trash2 className="w-3 h-3 mr-1 text-rose-600" />
                លុបថ្នាក់ទាំងអស់ ({toKhmerNum(classes.length)})
              </button>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: Search & Grade Tabs */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ស្វែងរកឈ្មោះថ្នាក់ (ឧ. 10A, 7, 12...)"
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            <span className="text-xs font-bold text-slate-500 whitespace-nowrap self-end sm:self-auto">
              បង្ហាញ៖ <strong className="text-blue-700">{toKhmerNum(filteredClasses.length)}</strong> / {toKhmerNum(classes.length)} ថ្នាក់
            </span>
          </div>

          {/* Grade Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedGradeFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedGradeFilter === 'ALL'
                  ? 'bg-blue-600 text-white font-black shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ទាំងអស់ ({toKhmerNum(classes.length)})
            </button>
            {['7', '8', '9', '10', '11', '12'].map((g) => {
              const count = classes.filter((c) => parseGradeNumber(c.grade || c.name) === parseInt(g, 10)).length;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGradeFilter(g)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedGradeFilter === g
                      ? 'bg-blue-600 text-white font-black shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ទី {g} ({toKhmerNum(count)})
                </button>
              );
            })}
          </div>
        </div>

        {/* BOTTOM SECTION: Class List with Edit and Delete options */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
          <div className="max-h-72 sm:max-h-80 overflow-y-auto divide-y divide-slate-100">
            {filteredClasses.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-1">
                <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">រកមិនឃើញថ្នាក់រៀនទេ</p>
                <p className="text-[11px]">សូមចុចបន្ថែមថ្នាក់ថ្មីខាងលើ</p>
              </div>
            ) : (
              filteredClasses.map((c) => {
                const count = students.filter((s) => s.classId === c.id).length;
                const isEditing = editingClassId === c.id;

                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-slate-50/80 transition-colors"
                  >
                    {isEditing ? (
                      /* Inline Editing View */
                      <div className="flex items-center space-x-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingClassName}
                          onChange={(e) => setEditingClassName(e.target.value)}
                          className="flex-1 px-3 py-1 text-xs sm:text-sm font-bold bg-white border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(c)}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition-colors"
                          title="រក្សាទុក"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingClassId(null)}
                          className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer transition-colors"
                          title="បោះបង់"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      /* Normal Display Row */
                      <>
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs shrink-0">
                            {c.grade || parseGradeNumber(c.name)}
                          </span>
                          <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {c.name}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${
                              count > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <Users className="w-3 h-3 mr-1" />
                            {toKhmerNum(count)} នាក់
                          </span>
                        </div>

                        {/* Action buttons: Edit and Delete */}
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(c)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="កែសម្រួលឈ្មោះថ្នាក់"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClass(c)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={count > 0 ? `លុបថ្នាក់នេះ (មានសិស្ស ${count} នាក់)` : 'លុបថ្នាក់ទទេនេះ'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          <span>💡 លោកគ្រូ-អ្នកគ្រូអាចបន្ថែមថ្នាក់ ឬលុបថ្នាក់ដោយសេរីតាមតម្រូវការ។</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            រួចរាល់
          </button>
        </div>
      </div>
    </Modal>
  );
};
