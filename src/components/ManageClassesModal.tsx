import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  BookOpen,
  Search,
  Users,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ClassRoom, Student, ClassStream } from '../types';
import { db } from '../db/db';
import { toKhmerNum } from '../utils/dateUtils';
import {
  sortClasses,
  parseGradeNumber,
  getStreamForClass,
  getStreamBadge,
} from '../utils/classUtils';
import { Modal } from './common/Modal';
import { useUndoRedo } from '../context/UndoRedoContext';

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
  const { pushSnapshot } = useUndoRedo();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');

  // Form toggle state (collapsed by default unless 0 classes)
  const [isAddFormOpen, setIsAddFormOpen] = useState<boolean>(classes.length === 0);

  // Add Class Form State
  const [formClassName, setFormClassName] = useState('');
  const [formGrade, setFormGrade] = useState('7');
  const [formStream, setFormStream] = useState<ClassStream>('science');
  const [formHomeroomTeacher, setFormHomeroomTeacher] = useState('ហ៊ុន រដ្ឋា');

  // Inline edit state
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState('');
  const [editingHomeroomTeacher, setEditingHomeroomTeacher] = useState('');
  const [editingStream, setEditingStream] = useState<ClassStream>('science');

  // Feedback message
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
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.homeroomTeacher && c.homeroomTeacher.toLowerCase().includes(q)) ||
        (c.grade && c.grade.includes(q));

      return matchesGrade && matchesSearch;
    });
  }, [sortedClassList, selectedGradeFilter, searchQuery]);

  // Auto-detect grade when typing class name (e.g. typing "7" or "7A" auto-selects Grade 7)
  const handleClassNameChange = (val: string) => {
    setFormClassName(val);
    const gNum = parseGradeNumber(val);
    if (gNum >= 7 && gNum <= 12) {
      setFormGrade(String(gNum));
      if (gNum === 11 || gNum === 12) {
        const detectedStream = getStreamForClass(String(gNum), val);
        if (detectedStream === 'science' || detectedStream === 'social') {
          setFormStream(detectedStream);
        }
      }
    }
  };

  // Handle adding class
  const handleAddClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let rawName = formClassName.trim();
    if (!rawName) return;

    let fullName = rawName;
    if (!fullName.startsWith('ថ្នាក់ទី')) {
      fullName = `ថ្នាក់ទី ${fullName}`;
    }

    if (classes.some((c) => c.name.toLowerCase() === fullName.toLowerCase())) {
      showFeedback('error', `ថ្នាក់ "${fullName}" មានរួចហើយ!`);
      return;
    }

    const gNum = parseGradeNumber(formGrade || fullName);
    const stream: ClassStream = (gNum === 11 || gNum === 12) ? formStream : 'general';
    const streamInfo = getStreamBadge(stream);

    const newClass: ClassRoom = {
      id: `class-${formGrade}-${Date.now()}`,
      name: fullName,
      grade: gNum !== 999 ? `${gNum}` : formGrade,
      academicYear,
      stream,
      homeroomTeacher: formHomeroomTeacher.trim() || 'គ្រូទទួលបន្ទុក',
      description: (gNum === 11 || gNum === 12) ? `ថ្នាក់ ${fullName} (${streamInfo.label})` : `ថ្នាក់ទី ${formGrade}`,
      createdAt: new Date().toISOString(),
    };

    await pushSnapshot(`បន្ថែមថ្នាក់ថ្មី "${fullName}"`);
    await db.classes.add(newClass);
    setFormClassName('');
    setIsAddFormOpen(false);
    onSelectClass(newClass.id);
    onRefresh();
    showFeedback('success', `បានបន្ថែម "${fullName}" ${stream !== 'general' ? `(${streamInfo.badgeKh})` : ''} ដោយជោគជ័យ!`);
  };

  // 1-Click Toggle Stream for Grade 11 & 12
  const handleToggleClassStream = async (c: ClassRoom) => {
    const currentStream = getStreamForClass(c.grade, c.name, c.stream);
    const nextStream: ClassStream = currentStream === 'science' ? 'social' : 'science';
    const nextInfo = getStreamBadge(nextStream);

    await pushSnapshot(`ប្តូរមុខជំនាញថ្នាក់ ${c.name} ទៅ ${nextInfo.label}`);
    await db.classes.update(c.id, {
      stream: nextStream,
      description: `ថ្នាក់ ${c.name} (${nextInfo.label})`,
    });
    onRefresh();
    showFeedback('success', `បានកំណត់ "${c.name}" ជា ${nextInfo.label} (${nextInfo.badgeKh})`);
  };

  // Start inline edit
  const handleStartEdit = (c: ClassRoom) => {
    setEditingClassId(c.id);
    setEditingClassName(c.name);
    setEditingHomeroomTeacher(c.homeroomTeacher || 'ហ៊ុន រដ្ឋា');
    setEditingStream(getStreamForClass(c.grade, c.name, c.stream));
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
    const stream = (gNum === 11 || gNum === 12) ? editingStream : 'general';

    await pushSnapshot(`កែសម្រួលព័ត៌មានថ្នាក់ "${newName}"`);
    await db.classes.update(c.id, {
      name: newName,
      homeroomTeacher: editingHomeroomTeacher.trim() || 'គ្រូទទួលបន្ទុក',
      grade: gNum !== 999 ? `${gNum}` : c.grade,
      stream,
      room: '',
    });

    setEditingClassId(null);
    onRefresh();
    showFeedback('success', `បានកែប្រែថ្នាក់ "${newName}" រួចរាល់!`);
  };

  // Delete class
  const handleDeleteClass = async (c: ClassRoom) => {
    const enrolledStudents = students.filter((s) => s.classId === c.id);
    const count = enrolledStudents.length;

    await pushSnapshot(`លុបថ្នាក់ "${c.name}"`);
    await db.classes.delete(c.id);

    if (count > 0) {
      for (const stu of enrolledStudents) {
        await db.students.update(stu.id, { classId: '' });
      }
    }

    if (selectedClassId === c.id) {
      const remaining = classes.find((cl) => cl.id !== c.id);
      onSelectClass(remaining?.id || '');
    }

    onRefresh();
    showFeedback('success', `បានលុប "${c.name}" រួចរាល់!`);
  };

  // Delete ALL classes
  const handleDeleteAllClasses = async () => {
    if (classes.length === 0) return;
    if (!window.confirm('តើលោកគ្រូ-អ្នកគ្រូពិតជាចង់លុបថ្នាក់ទាំងអស់នេះមែនទេ? (ទិន្នន័យសិស្សនៅដដែល តែនឹងមិនទាន់មានថ្នាក់)')) return;

    await pushSnapshot('លុបថ្នាក់ទាំងអស់');
    await db.classes.clear();
    for (const stu of students) {
      if (stu.classId) {
        await db.students.update(stu.id, { classId: '' });
      }
    }
    onSelectClass('');
    onRefresh();
    showFeedback('success', 'បានលុបថ្នាក់ទាំងអស់រួចរាល់!');
  };

  const formGNum = parseInt(formGrade, 10);
  const isHighSchoolStream = formGNum === 11 || formGNum === 12;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🏫 គ្រប់គ្រងថ្នាក់រៀន"
      subtitle={`សរុប ${classes.length} ថ្នាក់ | ថ្នាក់ទី ៧-១០ (ទូទៅ) • ថ្នាក់ទី ១១-១២ (វិទ្យាសាស្ត្រ/សង្គម)`}
      maxWidth="4xl"
    >
      <div className="space-y-3.5">
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

        {/* TOP BAR: Search & [+ បន្ថែមថ្នាក់ថ្មី] */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកតាមឈ្មោះថ្នាក់ ឬឈ្មោះគ្រូទទួលបន្ទុក..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAddFormOpen(!isAddFormOpen)}
            className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs ${
              isAddFormOpen
                ? 'bg-slate-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>បន្ថែមថ្នាក់ថ្មី</span>
            {isAddFormOpen ? <ChevronUp className="w-4 h-4 ml-1.5" /> : <ChevronDown className="w-4 h-4 ml-1.5" />}
          </button>
        </div>

        {/* ADD CLASS FORM (Collapsible: Only opens when clicking [បន្ថែមថ្នាក់ថ្មី]) */}
        {isAddFormOpen && (
          <div className="bg-blue-50/60 p-3.5 sm:p-4 rounded-2xl border-2 border-blue-200 shadow-xs space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-blue-200/80 pb-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    បញ្ចូលថ្នាក់រៀនថ្មី (Add Class)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    សូមបំពេញឈ្មោះថ្នាក់ កម្រិតថ្នាក់ និងឈ្មោះគ្រូទទួលបន្ទុក
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="បិទទម្រង់"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddClassSubmit} className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. ឈ្មោះថ្នាក់ */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ឈ្មោះថ្នាក់ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formClassName}
                    onChange={(e) => handleClassNameChange(e.target.value)}
                    placeholder="ឧ. 7A, 10B, 11A..."
                    className="w-full px-3 py-1.5 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                {/* 2. កម្រិតថ្នាក់ */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    កម្រិតថ្នាក់ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="7">ថ្នាក់ទី ៧ (អនុវិទ្យាល័យ)</option>
                    <option value="8">ថ្នាក់ទី ៨ (អនុវិទ្យាល័យ)</option>
                    <option value="9">ថ្នាក់ទី ៩ (អនុវិទ្យាល័យ)</option>
                    <option value="10">ថ្នាក់ទី ១០ (វិទ្យាល័យ)</option>
                    <option value="11">ថ្នាក់ទី ១១ (វិទ្យាល័យ)</option>
                    <option value="12">ថ្នាក់ទី ១២ (វិទ្យាល័យ)</option>
                  </select>
                </div>

                {/* 3. គ្រូទទួលបន្ទុកថ្នាក់ */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    គ្រូទទួលបន្ទុកថ្នាក់ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formHomeroomTeacher}
                    onChange={(e) => setFormHomeroomTeacher(e.target.value)}
                    placeholder="ឈ្មោះគ្រូទទួលបន្ទុក (ឧ. ហ៊ុន រដ្ឋា)"
                    className="w-full px-3 py-1.5 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                {/* Category Selection: Grade 7-10 = General, Grade 11-12 = Science vs Social */}
                {!isHighSchoolStream ? (
                  <div className="col-span-1 sm:col-span-3 bg-white p-2.5 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-bold flex items-center gap-1.5">
                      <span>🎓</span>
                      <span>ប្រភេទថ្នាក់៖ <strong className="text-blue-700">ថ្នាក់ទូទៅ (General)</strong> (ថ្នាក់ទី ៧ ដល់ ១០ ជាចំណេះទូទៅ គ្មានបែងចែកវិទ្យាសាស្ត្រ/សង្គមទេ)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-black">
                      ទូទៅ
                    </span>
                  </div>
                ) : (
                  <div className="col-span-1 sm:col-span-3 bg-white p-3 rounded-xl border-2 border-teal-300 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 flex items-center">
                        <span className="mr-1 text-base">🎓</span>
                        <span>ជ្រើសរើសប្រភេទថ្នាក់សម្រាប់ថ្នាក់ទី {formGrade}៖</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className={`flex items-center space-x-2 cursor-pointer px-4 py-2 rounded-xl border-2 transition-all shadow-2xs ${
                        formStream === 'science'
                          ? 'bg-emerald-600 text-white border-emerald-700 font-black'
                          : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50 font-bold'
                      }`}>
                        <input
                          type="radio"
                          name="formStream"
                          value="science"
                          checked={formStream === 'science'}
                          onChange={() => setFormStream('science')}
                          className="hidden"
                        />
                        <span className="text-base">🔬</span>
                        <span className="text-xs">ថ្នាក់វិទ្យាសាស្ត្រ (Science)</span>
                      </label>

                      <label className={`flex items-center space-x-2 cursor-pointer px-4 py-2 rounded-xl border-2 transition-all shadow-2xs ${
                        formStream === 'social'
                          ? 'bg-amber-600 text-white border-amber-700 font-black'
                          : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50 font-bold'
                      }`}>
                        <input
                          type="radio"
                          name="formStream"
                          value="social"
                          checked={formStream === 'social'}
                          onChange={() => setFormStream('social')}
                          className="hidden"
                        />
                        <span className="text-base">📚</span>
                        <span className="text-xs">ថ្នាក់វិទ្យាសាស្ត្រសង្គម (Social Science)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-blue-200/80">
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(false)}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>រក្សាទុកថ្នាក់ថ្មី</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* GRADE FILTER TABS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedGradeFilter('ALL')}
              className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                selectedGradeFilter === 'ALL'
                  ? 'bg-blue-600 text-white font-black shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ទាំងអស់ ({classes.length})
            </button>
            {['7', '8', '9', '10', '11', '12'].map((g) => {
              const count = classes.filter((c) => parseGradeNumber(c.grade || c.name) === parseInt(g, 10)).length;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGradeFilter(g)}
                  className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    selectedGradeFilter === g
                      ? 'bg-blue-600 text-white font-black shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ទី {g} ({count})
                </button>
              );
            })}
          </div>

          <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap self-end sm:self-auto">
            បង្ហាញ៖ <strong className="text-blue-700">{filteredClasses.length}</strong> / {classes.length} ថ្នាក់
          </span>
        </div>

        {/* MAIN CLASS LIST (SPACIOUS & CLEAN) */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
          <div className="max-h-[55vh] overflow-y-auto divide-y divide-slate-100">
            {filteredClasses.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-700">មិនមានថ្នាក់រៀនទេ</p>
                <p className="text-xs text-slate-500">
                  {searchQuery ? 'រកមិនឃើញថ្នាក់ដែលត្រូវនឹងពាក្យស្វែងរកទេ' : 'មិនទាន់មានថ្នាក់រៀនក្នុងបញ្ជីនៅឡើយទេ'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddFormOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    <span>បន្ថែមថ្នាក់រៀនដំបូង</span>
                  </button>
                </div>
              </div>
            ) : (
              filteredClasses.map((c) => {
                const count = students.filter((s) => s.classId === c.id).length;
                const isEditing = editingClassId === c.id;
                const gNum = parseGradeNumber(c.grade || c.name);
                const stream = getStreamForClass(c.grade, c.name, c.stream);
                const streamInfo = getStreamBadge(stream);

                return (
                  <div
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-slate-50/80 transition-colors gap-2"
                  >
                    {isEditing ? (
                      /* Inline Editing View */
                      <div className="flex flex-wrap items-center gap-2 flex-1 mr-2">
                        <div className="flex-1 min-w-[140px]">
                          <label className="text-[10px] text-slate-400 block font-bold">ឈ្មោះថ្នាក់</label>
                          <input
                            type="text"
                            value={editingClassName}
                            onChange={(e) => setEditingClassName(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs sm:text-sm font-bold bg-white border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        </div>

                        <div className="flex-1 min-w-[140px]">
                          <label className="text-[10px] text-slate-400 block font-bold">គ្រូទទួលបន្ទុកថ្នាក់</label>
                          <input
                            type="text"
                            value={editingHomeroomTeacher}
                            onChange={(e) => setEditingHomeroomTeacher(e.target.value)}
                            placeholder="គ្រូទទួលបន្ទុក..."
                            className="w-full px-2.5 py-1 text-xs sm:text-sm font-bold bg-white border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {(gNum === 11 || gNum === 12) && (
                          <div className="w-full flex items-center gap-2 pt-1 border-t border-slate-100">
                            <span className="text-[10px] text-slate-500 font-bold">ផ្នែក/ជំនាញ៖</span>
                            <button
                              type="button"
                              onClick={() => setEditingStream('science')}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                                editingStream === 'science'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              🔬 វិទ្យាសាស្ត្រ
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingStream('social')}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                                editingStream === 'social'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-amber-50 text-amber-900 border border-amber-200'
                              }`}
                            >
                              📚 វិទ្យាសាស្ត្រសង្គម
                            </button>
                          </div>
                        )}

                        <div className="flex items-center space-x-1 self-end mb-0.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(c)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition-colors"
                            title="រក្សាទុក"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingClassId(null)}
                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer transition-colors"
                            title="បោះបង់"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal Display Row */
                      <>
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                            {c.grade || gNum}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-900 truncate">
                                {c.name}
                              </span>
                              {gNum <= 10 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 text-slate-700 border-slate-300">
                                  <span className="mr-0.5">🎓</span>
                                  <span>ទូទៅ</span>
                                </span>
                              )}
                              {(gNum === 11 || gNum === 12) && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleClassStream(c)}
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs cursor-pointer hover:scale-105 active:scale-95 transition-all ${streamInfo.colorClass}`}
                                  title={`ចុចដើម្បីប្តូររវាង វិទ្យាសាស្ត្រ និង វិទ្យាសាស្ត្រសង្គម (បច្ចុប្បន្ន៖ ${streamInfo.label})`}
                                >
                                  <span className="mr-1">{streamInfo.icon}</span>
                                  <span>{streamInfo.badgeKh}</span>
                                  <span className="ml-1 text-[9px] opacity-75 underline">⇄ ប្តូរ</span>
                                </button>
                              )}
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${
                                  count > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                <Users className="w-3 h-3 mr-1" />
                                {count} នាក់
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                              <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>គ្រូទទួលបន្ទុក៖</span>
                              <strong className="text-slate-800">{c.homeroomTeacher || 'មិនទាន់កំណត់'}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Action buttons: Edit and Delete */}
                        <div className="flex items-center space-x-1 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(c)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="កែសម្រួលឈ្មោះថ្នាក់ និងគ្រូទទួលបន្ទុក"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClass(c)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={count > 0 ? `លុបថ្នាក់នេះ (មានសិស្ស ${count} នាក់)` : 'លុបថ្នាក់នេះ'}
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Modal Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            {classes.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAllClasses}
                className="text-rose-600 hover:text-rose-800 hover:underline cursor-pointer text-[11px] font-bold"
              >
                🗑️ លុបថ្នាក់ទាំងអស់
              </button>
            )}
          </div>
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
