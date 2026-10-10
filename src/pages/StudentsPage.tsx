import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Printer,
  Plus,
  Trash2,
  Copy,
  Save,
  Search,
  Eye,
  Check,
  Users,
  Phone,
  QrCode,
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, Gender, TeacherSettings } from '../types';
import { db } from '../db/db';
import { Modal } from '../components/common/Modal';
import { StudentIDCardsModal } from '../components/StudentIDCardsModal';
import { PrintButton } from '../components/common/PrintButton';
import { toKhmerNum, formatKhmerDate, formatToDMY, parseDMYToISO } from '../utils/dateUtils';
import {
  exportStudentsToExcel,
  downloadStudentTemplate,
  parseExcelStudents,
  calculateAge,
} from '../utils/excelUtils';
import { enrichStudentWithMoEYSFields } from '../utils/studentEnricher';

interface StudentsPageProps {
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords: AttendanceRecord[];
  settings: TeacherSettings | null;
  selectedClassId: string;
  onRefresh: () => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({
  students,
  classes,
  attendanceRecords,
  settings,
  selectedClassId,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'ប្រុស' | 'ស្រី'>('all');
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [isIDCardsOpen, setIsIDCardsOpen] = useState(false);

  // Undo / Redo history stacks
  const [undoStack, setUndoStack] = useState<Student[][]>([]);
  const [redoStack, setRedoStack] = useState<Student[][]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [scrollPercent, setScrollPercent] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Capture current state snapshot before performing modifications
  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-20), JSON.parse(JSON.stringify(students))]);
    setRedoStack([]); // Clear redo on new action
  }, [students]);

  // Handle Undo
  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, undoStack.length - 1);

    // Save current to redo
    setRedoStack((prev) => [...prev, JSON.parse(JSON.stringify(students))]);
    setUndoStack(newUndo);

    // Replace students in DB
    await db.students.clear();
    await db.students.bulkAdd(previous);
    onRefresh();
    showToast('↶ បានត្រឡប់ក្រោយ (Undo) រួចរាល់!');
  };

  // Handle Redo
  const handleRedo = async () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, redoStack.length - 1);

    // Save current to undo
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(students))]);
    setRedoStack(newRedo);

    // Replace students in DB
    await db.students.clear();
    await db.students.bulkAdd(next);
    onRefresh();
    showToast('↷ បានធ្វើឡើងវិញ (Redo) រួចរាល់!');
  };

  // Keyboard shortcut Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, students]);

  // Sync scroll percent on table scroll
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll > 0) {
        setScrollPercent(Math.round((el.scrollLeft / maxScroll) * 100));
      } else {
        setScrollPercent(0);
      }
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Active Class identifier (no inner dropdown - controlled cleanly from top Navbar)
  const activeClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
  const currentClass = classes.find((c) => c.id === activeClassId);
  const currentClassName = selectedClassId === 'ALL' ? 'ថ្នាក់ទាំងអស់' : currentClass?.name || 'ថ្នាក់រៀន';

  // Filter students based on active class, gender, and search query
  const filteredStudents = students
    .filter((s) => {
      const matchesClass = selectedClassId === 'ALL' || s.classId === activeClassId;
      const matchesGender = genderFilter === 'all' || s.gender === genderFilter;
      const matchesSearch =
        s.nameKh.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.pobProvince && s.pobProvince.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.pob && s.pob.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.addrProvince && s.addrProvince.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.currentAddress && s.currentAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.fatherPhone && s.fatherPhone.includes(searchTerm)) ||
        (s.guardianPhone && s.guardianPhone.includes(searchTerm)) ||
        (s.studentPhone && s.studentPhone.includes(searchTerm));
      return matchesClass && matchesGender && matchesSearch;
    })
    .sort((a, b) => {
      if (selectedClassId === 'ALL' && a.classId !== b.classId) {
        return a.classId.localeCompare(b.classId);
      }
      return a.rollNo - b.rollNo;
    });

  const totalFiltered = filteredStudents.length;
  const femaleFiltered = filteredStudents.filter((s) => s.gender === 'ស្រី').length;
  const maleFiltered = filteredStudents.filter((s) => s.gender === 'ប្រុស').length;

  // Direct Inline Cell Edit Handler (Auto-Save on blur or change)
  const handleInlineChange = async (studentId: string, field: keyof Student, value: any) => {
    try {
      const updateData: Partial<Student> = { [field]: value };
      // If dob is updated, also update age
      if (field === 'dob') {
        updateData.age = calculateAge(value);
      }
      await db.students.update(studentId, updateData);
      setLastSavedId(studentId);
      setTimeout(() => setLastSavedId(null), 2000);
      onRefresh();
    } catch (err) {
      console.error('Error auto-saving cell:', err);
    }
  };

  // Direct Duplicate Row Handler (ចម្លងសិស្សដោយផ្ទាល់)
  const handleDirectDuplicate = async (s: Student) => {
    pushUndo();
    const classStudents = students.filter((stu) => stu.classId === s.classId);
    const nextRoll = classStudents.length + 1;
    const duplicated: Student = {
      ...s,
      id: 'stu-' + Date.now(),
      rollNo: nextRoll,
      studentCode: `${s.studentCode}-កូពី`,
      nameKh: `${s.nameKh} (ចម្លង)`,
      createdAt: new Date().toISOString(),
    };
    await db.students.add(duplicated);
    setLastSavedId(duplicated.id);
    onRefresh();
    showToast(`📋 បានចម្លងសិស្ស "${duplicated.nameKh}"`);
  };

  // Direct Delete Row Handler (លុបសិស្សដោយផ្ទាល់ មិនបាច់សួរច្រើន អាចចុច Undo បាន)
  const handleDirectDelete = async (s: Student) => {
    pushUndo();
    await db.students.delete(s.id);
    onRefresh();
    showToast(`🗑️ បានលុបសិស្ស "${s.nameKh}" (អាចចុច ↶ Undo ដើម្បីយកមកវិញ)`);
  };

  // Delete all students in active class or all (មិនបាច់ផ្ទៀងផ្ទាត់ អាចចុច Undo បាន)
  const handleDeleteAllStudents = async () => {
    pushUndo();
    if (selectedClassId === 'ALL') {
      await db.students.clear();
      showToast('🗑️ បានលុបសិស្សទាំងអស់រួចរាល់! (អាចចុច ↶ Undo ដើម្បីយកមកវិញ)');
    } else {
      const idsToDelete = students.filter((s) => s.classId === activeClassId).map((s) => s.id);
      await db.students.bulkDelete(idsToDelete);
      showToast(`🗑️ បានលុបសិស្សក្នុងថ្នាក់ ${currentClassName} ទាំងអស់រួចរាល់! (អាចចុច ↶ Undo បាន)`);
    }
    onRefresh();
  };

  // Direct Add New Blank Row (បន្ថែមជួរដេក Excel ថ្មីនៅជួរទី១ តែម្តង ដើម្បីឃើញភ្លាមៗ)
  const handleAddNewBlankRow = async () => {
    pushUndo();
    const targetClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
    const classStudents = students.filter((s) => s.classId === targetClassId);

    // Shift existing students in this class by +1 so new student is at row 1
    const updatedClassStudents = classStudents.map((s) => ({
      ...s,
      rollNo: (s.rollNo || 0) + 1,
    }));
    await db.students.bulkPut(updatedClassStudents);

    const newStudent: Student = {
      id: 'stu-' + Date.now(),
      classId: targetClassId,
      rollNo: 1,
      studentCode: `STU-001`,
      nameKh: `សិស្សថ្មី`,
      nameEn: `New Student`,
      gender: 'ប្រុស',
      dob: '2011-01-01',
      age: 14,
      originSchool: 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច',
      pobVillage: 'ត្រពាំងព្រីង',
      pobCommune: 'កំពង់ត្រឡាច',
      pobDistrict: 'កំពង់ត្រឡាច',
      pobProvince: 'កំពង់ឆ្នាំង',
      addrVillage: 'ត្រពាំងព្រីង',
      addrCommune: 'កំពង់ត្រឡាច',
      addrDistrict: 'កំពង់ត្រឡាច',
      addrProvince: 'កំពង់ឆ្នាំង',
      studentPhone: '',
      orphanStatus: 'none',
      isDisabled: false,
      isPoor: false,
      hasScholarship: false,
      stayInPagoda: false,
      fatherName: '',
      fatherOccupation: '',
      fatherPhone: '',
      motherName: '',
      motherOccupation: '',
      motherPhone: '',
      guardianName: '',
      guardianRelationship: 'ឪពុក',
      guardianPhone: '',
      guardianOccupation: '',
      otherNotes: '',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await db.students.add(newStudent);
    setLastSavedId(newStudent.id);
    onRefresh();

    // Smooth scroll to top
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
    showToast('✨ បានបន្ថែមសិស្សថ្មីនៅជួរដេកទី ១ ដោយជោគជ័យ!');
  };

  // Export to Excel
  const handleExportExcel = () => {
    exportStudentsToExcel(filteredStudents, currentClassName);
  };

  // Import from Excel file
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
    if (!targetClassId) {
      alert('សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន មុនពេលនាំចូល Excel!');
      return;
    }

    try {
      const parsed = await parseExcelStudents(file, targetClassId);
      if (parsed.length === 0) {
        alert('មិនមានទិន្នន័យសិស្សនៅក្នុងឯកសារទេ!');
        return;
      }
      await db.students.bulkAdd(parsed as Student[]);
      alert(`បាននាំចូលទិន្នន័យសិស្សចំនួន ${toKhmerNum(parsed.length)} នាក់ដោយជោគជ័យ!`);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('មានបញ្ហាក្នុងការអានឯកសារ Excel! សូមពិនិត្យទម្រង់ឯកសារឡើងវិញ។');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Clean, Modern, Elegant Header & Action Bar (Replacing messy cluttered panel) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 no-print">
        {/* Row 1: Title + Quick KPI Badges + Primary Action Buttons */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Left: Title & Inline KPI Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-black text-slate-800 flex items-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 mr-2" />
              បញ្ជីស្ថិតិ និងប្រវត្តិរូបសង្ខេបសិស្ស ({currentClassName})
            </h2>

            {/* Compact Inline KPI Badges (No messy big cards) */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200" title="សិស្សសរុប">
                👥 សរុប៖ <strong>{toKhmerNum(totalFiltered)}</strong> នាក់
              </span>
              <span className="px-2.5 py-1 bg-pink-50 text-pink-700 font-bold rounded-lg border border-pink-200" title="សិស្សស្រី">
                👩 ស្រី៖ <strong>{toKhmerNum(femaleFiltered)}</strong>
              </span>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200" title="សិស្សប្រុស">
                👨 ប្រុស៖ <strong>{toKhmerNum(maleFiltered)}</strong>
              </span>
              {lastSavedId && (
                <span className="px-2 py-0.5 text-emerald-600 font-bold text-xs bg-emerald-50 rounded-full border border-emerald-300 animate-pulse">
                  ✓ រក្សាទុក
                </span>
              )}
            </div>
          </div>

          {/* Right: Clean, Grouped Action Buttons (Guaranteed strictly SINGLE row - no wrapping) */}
          <div className="flex items-center flex-nowrap overflow-x-auto no-scrollbar gap-1.5 shrink-0 py-0.5">
            {/* Primary Action: Add Student */}
            <button
              onClick={handleAddNewBlankRow}
              className="inline-flex items-center px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              title="បន្ថែមជួរដេកសិស្សថ្មីនៅជួរទី១"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              + បន្ថែមសិស្ស
            </button>

            {/* Excel Group */}
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
              <label
                className="inline-flex items-center px-2 py-1 rounded-lg text-slate-700 hover:bg-white hover:text-emerald-700 transition-colors cursor-pointer"
                title="នាំចូលទិន្នន័យពី Excel"
              >
                <Upload className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                នាំចូល
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .xlsm"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </label>

              <button
                onClick={handleExportExcel}
                className="inline-flex items-center px-2 py-1 rounded-lg text-slate-700 hover:bg-white hover:text-blue-700 transition-colors cursor-pointer"
                title="ទាញយកជា Excel .xlsm"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-blue-600" />
                នាំចេញ
              </button>

              <button
                onClick={downloadStudentTemplate}
                className="inline-flex items-center px-1.5 py-1 rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 transition-colors cursor-pointer"
                title="ទាញយកគំរូ Excel"
              >
                គំរូ
              </button>
            </div>

            {/* Undo / Redo Controls */}
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="inline-flex items-center px-2 py-1 rounded-lg text-slate-700 hover:bg-white hover:text-indigo-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-700 transition-colors cursor-pointer"
                title="ត្រឡប់ក្រោយ (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5 mr-0.5" />
                Undo
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="inline-flex items-center px-2 py-1 rounded-lg text-slate-700 hover:bg-white hover:text-indigo-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-700 transition-colors cursor-pointer"
                title="ធ្វើឡើងវិញ (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5 mr-0.5" />
                Redo
              </button>
            </div>

            {/* Delete All Students Button */}
            <button
              type="button"
              onClick={handleDeleteAllStudents}
              className="inline-flex items-center px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors cursor-pointer shrink-0"
              title="លុបសិស្សទាំងអស់ (អាចចុច Undo ដើម្បីយកមកវិញបាន)"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-600" />
              លុបសិស្សទាំងអស់
            </button>

            {/* ID Cards */}
            <button
              onClick={() => setIsIDCardsOpen(true)}
              className="inline-flex items-center px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl border border-purple-200 transition-colors cursor-pointer shrink-0"
              title="បោះពុម្ពកាតសិស្សភ្ជាប់ QR"
            >
              <QrCode className="w-3.5 h-3.5 mr-1 text-purple-600" />
              កាតសិស្ស
            </button>

            {/* Print with Orientation Selector */}
            <PrintButton defaultOrientation="landscape" label="បោះពុម្ព" className="shrink-0" />
          </div>
        </div>

        {/* Row 2: Search + Gender Filters (Unified cleanly) */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ស្វែងរកតាមឈ្មោះ, អត្តលេខ, ស្រុក, ខេត្ត, ទូរស័ព្ទ..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Gender Filter Chips */}
          <div className="flex items-center space-x-1.5 w-full sm:w-auto justify-end">
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
              <button
                onClick={() => setGenderFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  genderFilter === 'all' ? 'bg-white font-black text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ទាំងអស់ ({toKhmerNum(students.filter((s) => selectedClassId === 'ALL' || s.classId === activeClassId).length)})
              </button>
              <button
                onClick={() => setGenderFilter('ប្រុស')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  genderFilter === 'ប្រុស' ? 'bg-white font-black text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👨 ប្រុស
              </button>
              <button
                onClick={() => setGenderFilter('ស្រី')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  genderFilter === 'ស្រី' ? 'bg-white font-black text-pink-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👩 ស្រី
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Official Header (Print Mode Only) */}
      <div className="hidden print:block text-center mb-6">
        <h3 className="font-moul text-base">ព្រះរាជាណាចក្រកម្ពុជា</h3>
        <h4 className="font-moul text-sm">ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
        <div className="w-24 h-0.5 bg-black mx-auto my-2" />
        <div className="flex justify-between items-start text-left mt-2 text-xs">
          <div>
            <p className="font-bold">{settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}</p>
            <p>ឆ្នាំសិក្សា៖ {settings?.academicYear || '២០២៤-២០២៥'}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">គ្រូបន្ទុកថ្នាក់៖ {settings?.teacherName || 'ហ៊ុន រដ្ឋា'}</p>
            <p>ទូរស័ព្ទ៖ {settings?.phone || '093 486 987'}</p>
          </div>
        </div>
        <h2 className="font-moul text-base mt-4">
          បញ្ជីស្រង់ស្ថិតិ និងប្រវត្តិរូបសង្ខេបសិស្ស {currentClassName}
        </h2>
        <p className="text-xs mt-1">
          សិស្សសរុប៖ {toKhmerNum(totalFiltered)} នាក់ | ស្រី៖ {toKhmerNum(femaleFiltered)} នាក់ | ប្រុស៖ {toKhmerNum(maleFiltered)} នាក់
        </p>
      </div>

      {/* Excel/XLSM Interactive Editable Spreadsheet Grid - EXACT REPLICA OF IMAGE 2 */}
      <div className="bg-white rounded-2xl border-2 border-blue-900/40 shadow-lg overflow-hidden print:border-none print:shadow-none print:rounded-none print:overflow-visible">
        {/* Spreadsheet Header Bar */}
        <div className="bg-[#002060] text-white px-4 py-2 flex items-center justify-between text-xs font-bold no-print">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>សន្លឹកទិន្នន័យ៖ បញ្ជីស្រង់ស្ថិតិ និងប្រវត្តិរូបសិស្ស.xlsm</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-blue-100 font-normal">
            <span>💡 ចុចលើក្រឡាដើម្បីវាយបញ្ចូល/កែប្រែផ្ទាល់</span>
            <span>|</span>
            <span>⚡ រក្សាទុកស្វ័យប្រវត្តិ (Auto-Saved)</span>
          </div>
        </div>

        <div ref={tableScrollRef} className="max-h-[70vh] print:max-h-none print:h-auto overflow-auto print:overflow-visible table-scrollbar relative print:border-none print:shadow-none">
          <table className="w-full text-left border-collapse text-xs sm:text-[13px] print-fit-all">
            {/* Colgroup for 100% Page Fit in Print Mode */}
            <colgroup className="hidden print:table-column-group">
              {/* 1. ល.រ */}
              <col style={{ width: '2.2%' }} />
              {/* 2. អត្តលេខ */}
              <col style={{ width: '4.2%' }} />
              {/* 3. គោត្តនាម នាម */}
              <col style={{ width: '8.5%' }} />
              {/* 4. ភេទ */}
              <col style={{ width: '2.2%' }} />
              {/* 5. ថ្ងៃខែឆ្នាំកំណើត */}
              <col style={{ width: '5.2%' }} />
              {/* 6. អាយុ */}
              <col style={{ width: '2.2%' }} />
              {/* 7. មកពីសាលា */}
              <col style={{ width: '5.5%' }} />
              {/* 8-11. ទីកន្លែងកំណើត (ភូមិ, ឃុំ, ស្រុក, ខេត្ត) */}
              <col style={{ width: '3.2%' }} />
              <col style={{ width: '3.2%' }} />
              <col style={{ width: '3.8%' }} />
              <col style={{ width: '3.8%' }} />
              {/* 12-15. អាសយដ្ឋានបច្ចុប្បន្ន (ភូមិ, ឃុំ, ស្រុក, ខេត្ត) */}
              <col style={{ width: '3.2%' }} />
              <col style={{ width: '3.2%' }} />
              <col style={{ width: '3.8%' }} />
              <col style={{ width: '3.8%' }} />
              {/* 16. លេខទូរស័ព្ទផ្ទាល់ខ្លួន */}
              <col style={{ width: '4.5%' }} />
              {/* 17-23. ស្ថានភាពសិស្ស (ឪពុក, ម្តាយ, ឪពុកម្តាយ, ពិការ, ក្រីក្រ, អាហារូបករណ៍, ស្នាក់នៅវត្ត) */}
              <col style={{ width: '1.5%' }} />
              <col style={{ width: '1.5%' }} />
              <col style={{ width: '2.0%' }} />
              <col style={{ width: '1.5%' }} />
              <col style={{ width: '1.5%' }} />
              <col style={{ width: '2.0%' }} />
              <col style={{ width: '2.0%' }} />
              {/* 24-26. ឪពុក (ឈ្មោះ, មុខរបរ, ទូរស័ព្ទ) */}
              <col style={{ width: '4.0%' }} />
              <col style={{ width: '3.0%' }} />
              <col style={{ width: '4.0%' }} />
              {/* 27-29. ម្តាយ (ឈ្មោះ, មុខរបរ, ទូរស័ព្ទ) */}
              <col style={{ width: '4.0%' }} />
              <col style={{ width: '3.0%' }} />
              <col style={{ width: '4.0%' }} />
              {/* 30. ផ្សេងៗ */}
              <col style={{ width: '3.5%' }} />
              {/* 31. សកម្មភាព (Screen only) */}
              <col className="no-print" />
            </colgroup>

            {/* Table Header: 2 Rows Exactly Matching Image 2 */}
            <thead className="sticky top-0 z-20 shadow-xs font-kantumruy">
              {/* Row 1 Header */}
              <tr className="bg-[#002060] text-white font-bold text-center border-b border-white/20 print:bg-slate-100 print:text-black text-xs sm:text-sm">
                <th rowSpan={2} className="py-3 px-2 border border-white/30 w-12 min-w-[48px] sticky left-0 z-30 bg-[#002060]">ល.រ</th>
                <th rowSpan={2} className="py-3 px-2.5 border border-white/30 min-w-[110px]">អត្តលេខ</th>
                <th rowSpan={2} className="py-3 px-3 border border-white/30 min-w-[160px]">គោត្តនាម នាម</th>
                <th rowSpan={2} className="py-3 px-2 border border-white/30 w-20 min-w-[70px]">ភេទ</th>
                <th rowSpan={2} className="py-3 px-2.5 border border-white/30 min-w-[135px]">ថ្ងៃខែឆ្នាំកំណើត</th>
                <th rowSpan={2} className="py-3 px-1.5 border border-white/30 w-14 min-w-[50px]">អាយុ</th>
                <th rowSpan={2} className="py-3 px-2.5 border border-white/30 min-w-[160px]">មកពីសាលា</th>
                <th colSpan={4} className="py-1.5 px-2 border border-white/30 bg-[#0f3b73] print:bg-slate-200">ទីកន្លែងកំណើត</th>
                <th colSpan={4} className="py-1.5 px-2 border border-white/30 bg-[#0f3b73] print:bg-slate-200">អាសយដ្ឋានបច្ចុប្បន្ន</th>
                <th rowSpan={2} className="py-3 px-2 border border-white/30 min-w-[120px]">លេខទូរស័ព្ទផ្ទាល់ខ្លួន</th>
                <th colSpan={7} className="py-1.5 px-2 border border-white/30 bg-[#0f3b73] print:bg-slate-200">ស្ថានភាពសិស្ស</th>
                <th colSpan={3} className="py-1.5 px-2 border border-white/30 bg-[#0f3b73] print:bg-slate-200">គោត្តនាម នាម (ឪពុក)</th>
                <th colSpan={3} className="py-1.5 px-2 border border-white/30 bg-[#0f3b73] print:bg-slate-200">គោត្តនាម នាម (ម្តាយ)</th>
                <th rowSpan={2} className="py-3 px-2 border border-white/30 min-w-[120px]">ផ្សេងៗ</th>
                <th rowSpan={2} className="py-3 px-2 border border-white/30 w-24 min-w-[95px] no-print bg-[#001730]">សកម្មភាព</th>
              </tr>

              {/* Row 2 Sub-Headers */}
              <tr className="bg-[#0f3b73] text-white text-[11px] sm:text-xs font-bold text-center border-b border-white/30 print:bg-slate-200 print:text-black">
                {/* ទីកន្លែងកំណើត */}
                <th className="py-1.5 px-1 border border-white/30 min-w-[100px]">ភូមិ</th>
                <th className="py-1.5 px-1 border border-white/30 min-w-[110px]">ឃុំ/សង្កាត់</th>
                <th className="py-1.5 px-1 border border-white/30 min-w-[110px]">ស្រុក/ខណ្ឌ</th>
                <th className="py-1.5 px-1 border border-white/30 min-w-[120px]">ខេត្ត/រាជធានី</th>
                {/* អាសយដ្ឋានបច្ចុប្បន្ន */}
                <th className="py-1.5 px-1 border border-white/30 min-w-[100px]">ភូមិ</th>
                <th className="py-1.5 px-1 border border-white/30 min-w-[110px]">ឃុំ</th>
                <th className="py-1.5 px-1 border border-white/30 min-w-[110px]">ស្រុក</th>
                <th className="py-1.5 px-1 border border-white/30 min-w-[120px]">ខេត្ត</th>
                {/* ស្ថានភាពសិស្ស */}
                <th className="py-1.5 px-1 border border-white/30 min-w-[50px]" title="កំព្រាឪពុក">ឪពុក</th>
                <th className="py-1.5 px-1 border border-white/30 min-w-[50px]" title="កំព្រាម្តាយ">ម្តាយ</th>
                <th className="py-1.5 px-1 border border-white/30 min-w-[65px]" title="កំព្រាទាំងឪពុកម្តាយ">ឪពុកម្តាយ</th>
                <th className="py-1.5 px-1 border border-white/30 min-w-[50px]">ពិការ</th>
                <th className="py-1.5 px-1 border border-white/30 min-w-[50px]">ក្រីក្រ</th>
                <th className="py-1.5 px-1 border border-white/30 min-w-[75px]">អាហារូបករណ៍</th>
                <th className="py-1.5 px-1 border border-white/30 min-w-[70px]">ស្នាក់នៅវត្ត</th>
                {/* ឪពុក */}
                <th className="py-1.5 px-1 border border-white/30 min-w-[135px]">ឪពុក</th>
                <th className="py-1.5 px-1 border border-white/30 min-w-[105px]">មុខរបរ</th>
                <th className="py-1.5 px-1 border border-white/30 min-w-[120px]">លេខទូរស័ព្ទ</th>
                {/* ម្តាយ */}
                <th className="py-1.5 px-1 border border-white/30 min-w-[135px]">ម្តាយ</th>
                <th className="py-1.5 px-1 border border-white/30 min-w-[105px]">មុខរបរ</th>
                <th className="py-1.5 px-1 border border-white/30 min-w-[120px]">លេខទូរស័ព្ទ</th>
              </tr>
            </thead>

            {/* Table Body: Editable Rows with Enhanced Legible Font Sizes */}
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={31} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    មិនមានទិន្នន័យសិស្សត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu, index) => {
                  const age = stu.age || calculateAge(stu.dob);

                  return (
                    <tr
                      key={stu.id}
                      className="hover:bg-blue-50/40 transition-colors group border-b border-slate-200 print:break-inside-avoid"
                    >
                      {/* ល.រ (រត់តាមលំដាប់លំដោយ ១, ២, ៣... Sticky on horizontal scroll) */}
                      <td className="py-1 px-1 text-center font-bold text-slate-700 bg-slate-50/95 border-r border-slate-300 select-none sticky left-0 z-10 shadow-xs">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-200/90 text-slate-800 text-xs sm:text-[13px] font-black print:hidden">
                          {toKhmerNum(index + 1)}
                        </span>
                        <span className="hidden print:inline-block font-bold text-[5.8pt]">
                          {toKhmerNum(index + 1)}
                        </span>
                      </td>

                      {/* អត្តលេខ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.studentCode}
                          title={stu.studentCode}
                          placeholder="STU-001"
                          onChange={(e) => handleInlineChange(stu.id, 'studentCode', e.target.value)}
                          className="w-full font-mono text-xs sm:text-[12.5px] font-bold text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block font-mono font-bold truncate text-[5.5pt]">
                          {stu.studentCode}
                        </span>
                      </td>

                      {/* គោត្តនាម នាម */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.nameKh}
                          title={stu.nameKh}
                          placeholder="ឈ្មោះសិស្ស..."
                          onChange={(e) => handleInlineChange(stu.id, 'nameKh', e.target.value)}
                          className="w-full font-bold text-xs sm:text-[13px] text-slate-900 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block font-bold truncate text-slate-900 text-[6pt]">
                          {stu.nameKh}
                        </span>
                      </td>

                      {/* ភេទ */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <select
                          value={stu.gender}
                          onChange={(e) => handleInlineChange(stu.id, 'gender', e.target.value as Gender)}
                          className={`w-full text-xs sm:text-[12px] font-bold rounded px-1.5 py-1 cursor-pointer border-0 print:hidden text-center transition-all ${
                            stu.gender === 'ស្រី'
                              ? 'bg-pink-100 text-pink-700 hover:bg-pink-200/80'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200/80'
                          }`}
                        >
                          <option value="ប្រុស">ប្រុស</option>
                          <option value="ស្រី">ស្រី</option>
                        </select>
                        <span className={`hidden print:block font-bold text-center text-[5.5pt] ${stu.gender === 'ស្រី' ? 'text-pink-800' : 'text-blue-800'}`}>
                          {stu.gender}
                        </span>
                      </td>

                      {/* ថ្ងៃខែឆ្នាំកំណើត dd/mm/yyyy */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <div className="relative flex items-center justify-between">
                          <input
                            type="text"
                            value={formatToDMY(stu.dob)}
                            title={`ថ្ងៃខែឆ្នាំកំណើត (dd/mm/yyyy): ${formatToDMY(stu.dob)}`}
                            placeholder="dd/mm/yyyy"
                            onChange={(e) => {
                              const val = e.target.value;
                              const iso = parseDMYToISO(val);
                              handleInlineChange(stu.id, 'dob', iso || val);
                            }}
                            className="w-full text-xs sm:text-[12.5px] font-mono text-center text-slate-800 bg-transparent px-1 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                          />
                          <input
                            type="date"
                            value={stu.dob && stu.dob.includes('-') && stu.dob.length === 10 ? stu.dob : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleInlineChange(stu.id, 'dob', e.target.value);
                              }
                            }}
                            className="w-4 h-4 opacity-35 hover:opacity-100 cursor-pointer print:hidden shrink-0 ml-0.5"
                            title="ជ្រើសរើសពីប្រតិទិន"
                          />
                        </div>
                        <span className="hidden print:block font-mono text-center text-[5.5pt] truncate">
                          {formatToDMY(stu.dob) || ''}
                        </span>
                      </td>

                      {/* អាយុ */}
                      <td className="py-1 px-1 text-center font-bold text-xs sm:text-[13px] text-slate-700 bg-slate-50/50 border-r border-slate-200">
                        <span className="print:hidden font-mono font-bold">{toKhmerNum(age)}</span>
                        <span className="hidden print:block text-center font-bold text-[5.5pt]">
                          {toKhmerNum(age)}
                        </span>
                      </td>

                      {/* មកពីសាលា */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.originSchool || ''}
                          title={stu.originSchool || ''}
                          placeholder="សាលាចាស់..."
                          onChange={(e) => handleInlineChange(stu.id, 'originSchool', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block truncate text-[5.5pt]">
                          {stu.originSchool || ''}
                        </span>
                      </td>

                      {/* ទីកន្លែងកំណើត - ភូមិ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.pobVillage || ''}
                          title={stu.pobVillage || ''}
                          placeholder="ភូមិ..."
                          onChange={(e) => handleInlineChange(stu.id, 'pobVillage', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block truncate text-[5.2pt]">
                          {stu.pobVillage || ''}
                        </span>
                      </td>

                      {/* ទីកន្លែងកំណើត - ឃុំ/សង្កាត់ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.pobCommune || ''}
                          title={stu.pobCommune || ''}
                          placeholder="ឃុំ/សង្កាត់..."
                          onChange={(e) => handleInlineChange(stu.id, 'pobCommune', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block truncate text-[5.2pt]">
                          {stu.pobCommune || ''}
                        </span>
                      </td>

                      {/* ទីកន្លែងកំណើត - ស្រុក/ខណ្ឌ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.pobDistrict || ''}
                          title={stu.pobDistrict || ''}
                          placeholder="ស្រុក/ខណ្ឌ..."
                          onChange={(e) => handleInlineChange(stu.id, 'pobDistrict', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block truncate text-[5.2pt]">
                          {stu.pobDistrict || ''}
                        </span>
                      </td>

                      {/* ទីកន្លែងកំណើត - ខេត្ត/រាជធានី */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.pobProvince || stu.pob || ''}
                          title={stu.pobProvince || stu.pob || ''}
                          placeholder="ខេត្ត/រាជធានី..."
                          onChange={(e) => handleInlineChange(stu.id, 'pobProvince', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block truncate text-[5.2pt]">
                          {stu.pobProvince || stu.pob || ''}
                        </span>
                      </td>

                      {/* អាសយដ្ឋានបច្ចុប្បន្ន - ភូមិ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.addrVillage || ''}
                          title={stu.addrVillage || ''}
                          placeholder="ភូមិ..."
                          onChange={(e) => handleInlineChange(stu.id, 'addrVillage', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block truncate text-[5.2pt]">
                          {stu.addrVillage || ''}
                        </span>
                      </td>

                      {/* អាសយដ្ឋានបច្ចុប្បន្ន - ឃុំ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.addrCommune || ''}
                          title={stu.addrCommune || ''}
                          placeholder="ឃុំ..."
                          onChange={(e) => handleInlineChange(stu.id, 'addrCommune', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block truncate text-[5.2pt]">
                          {stu.addrCommune || ''}
                        </span>
                      </td>

                      {/* អាសយដ្ឋានបច្ចុប្បន្ន - ស្រុក */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.addrDistrict || ''}
                          title={stu.addrDistrict || ''}
                          placeholder="ស្រុក..."
                          onChange={(e) => handleInlineChange(stu.id, 'addrDistrict', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block truncate text-[5.2pt]">
                          {stu.addrDistrict || ''}
                        </span>
                      </td>

                      {/* អាសយដ្ឋានបច្ចុប្បន្ន - ខេត្ត */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.addrProvince || stu.currentAddress || ''}
                          title={stu.addrProvince || stu.currentAddress || ''}
                          placeholder="ខេត្ត..."
                          onChange={(e) => handleInlineChange(stu.id, 'addrProvince', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block truncate text-[5.2pt]">
                          {stu.addrProvince || stu.currentAddress || ''}
                        </span>
                      </td>

                      {/* លេខទូរស័ព្ទផ្ទាល់ខ្លួន */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.studentPhone || ''}
                          title={stu.studentPhone || ''}
                          placeholder="ទូរស័ព្ទសិស្ស..."
                          onChange={(e) => handleInlineChange(stu.id, 'studentPhone', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] font-mono font-bold text-blue-700 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block font-mono text-center text-[5.2pt] truncate">
                          {stu.studentPhone || ''}
                        </span>
                      </td>

                      {/* ស្ថានភាពសិស្ស - កំព្រាឪពុក */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={stu.orphanStatus === 'father' || stu.orphanStatus === 'both'}
                            onChange={(e) =>
                              handleInlineChange(
                                stu.id,
                                'orphanStatus',
                                e.target.checked
                                  ? stu.orphanStatus === 'mother'
                                    ? 'both'
                                    : 'father'
                                  : stu.orphanStatus === 'both'
                                  ? 'mother'
                                  : 'none'
                              )
                            }
                            className="w-4 h-4 rounded text-blue-600 cursor-pointer print:hidden"
                          />
                        </div>
                        <span className="hidden print:block text-center font-bold text-[7pt]">
                          {(stu.orphanStatus === 'father' || stu.orphanStatus === 'both') ? '✓' : ''}
                        </span>
                      </td>

                      {/* ស្ថានភាពសិស្ស - កំព្រាម្តាយ */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={stu.orphanStatus === 'mother' || stu.orphanStatus === 'both'}
                            onChange={(e) =>
                              handleInlineChange(
                                stu.id,
                                'orphanStatus',
                                e.target.checked
                                  ? stu.orphanStatus === 'father'
                                    ? 'both'
                                    : 'mother'
                                  : stu.orphanStatus === 'both'
                                  ? 'father'
                                  : 'none'
                              )
                            }
                            className="w-4 h-4 rounded text-blue-600 cursor-pointer print:hidden"
                          />
                        </div>
                        <span className="hidden print:block text-center font-bold text-[7pt]">
                          {(stu.orphanStatus === 'mother' || stu.orphanStatus === 'both') ? '✓' : ''}
                        </span>
                      </td>

                      {/* ស្ថានភាពសិស្ស - កំព្រាទាំងឪពុកម្តាយ */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={stu.orphanStatus === 'both'}
                            onChange={(e) =>
                              handleInlineChange(stu.id, 'orphanStatus', e.target.checked ? 'both' : 'none')
                            }
                            className="w-4 h-4 rounded text-rose-600 cursor-pointer print:hidden"
                          />
                        </div>
                        <span className="hidden print:block text-center font-bold text-[7pt]">
                          {stu.orphanStatus === 'both' ? '✓' : ''}
                        </span>
                      </td>

                      {/* ស្ថានភាពសិស្ស - ពិការ */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={!!stu.isDisabled}
                            onChange={(e) => handleInlineChange(stu.id, 'isDisabled', e.target.checked)}
                            className="w-4 h-4 rounded text-amber-600 cursor-pointer print:hidden"
                          />
                        </div>
                        <span className="hidden print:block text-center font-bold text-[7pt]">
                          {stu.isDisabled ? '✓' : ''}
                        </span>
                      </td>

                      {/* ស្ថានភាពសិស្ស - ក្រីក្រ */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={!!stu.isPoor}
                            onChange={(e) => handleInlineChange(stu.id, 'isPoor', e.target.checked)}
                            className="w-4 h-4 rounded text-amber-600 cursor-pointer print:hidden"
                          />
                        </div>
                        <span className="hidden print:block text-center font-bold text-[7pt]">
                          {stu.isPoor ? '✓' : ''}
                        </span>
                      </td>

                      {/* ស្ថានភាពសិស្ស - អាហារូបករណ៍ */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={!!stu.hasScholarship}
                            onChange={(e) => handleInlineChange(stu.id, 'hasScholarship', e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 cursor-pointer print:hidden"
                          />
                        </div>
                        <span className="hidden print:block text-center font-bold text-[7pt]">
                          {stu.hasScholarship ? '✓' : ''}
                        </span>
                      </td>

                      {/* ស្ថានភាពសិស្ស - ស្នាក់នៅវត្ត */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={!!stu.stayInPagoda}
                            onChange={(e) => handleInlineChange(stu.id, 'stayInPagoda', e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 cursor-pointer print:hidden"
                          />
                        </div>
                        <span className="hidden print:block text-center font-bold text-[7pt]">
                          {stu.stayInPagoda ? '✓' : ''}
                        </span>
                      </td>

                      {/* ឪពុក - ឈ្មោះ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.fatherName || stu.guardianName || ''}
                          title={stu.fatherName || stu.guardianName || ''}
                          placeholder="ឈ្មោះឪពុក..."
                          onChange={(e) => handleInlineChange(stu.id, 'fatherName', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] font-semibold text-slate-850 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block truncate text-[5.5pt]">
                          {stu.fatherName || stu.guardianName || ''}
                        </span>
                      </td>

                      {/* ឪពុក - មុខរបរ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.fatherOccupation || stu.guardianOccupation || ''}
                          title={stu.fatherOccupation || stu.guardianOccupation || ''}
                          placeholder="មុខរបរ..."
                          onChange={(e) => handleInlineChange(stu.id, 'fatherOccupation', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block truncate text-[5.2pt]">
                          {stu.fatherOccupation || stu.guardianOccupation || ''}
                        </span>
                      </td>

                      {/* ឪពុក - លេខទូរស័ព្ទ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.fatherPhone || stu.guardianPhone || ''}
                          title={stu.fatherPhone || stu.guardianPhone || ''}
                          placeholder="ទូរស័ព្ទ..."
                          onChange={(e) => handleInlineChange(stu.id, 'fatherPhone', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] font-mono text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block font-mono text-center text-[5.2pt] truncate">
                          {stu.fatherPhone || stu.guardianPhone || ''}
                        </span>
                      </td>

                      {/* ម្តាយ - ឈ្មោះ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.motherName || ''}
                          title={stu.motherName || ''}
                          placeholder="ឈ្មោះម្តាយ..."
                          onChange={(e) => handleInlineChange(stu.id, 'motherName', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] font-semibold text-slate-850 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block truncate text-[5.5pt]">
                          {stu.motherName || ''}
                        </span>
                      </td>

                      {/* ម្តាយ - មុខរបរ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.motherOccupation || ''}
                          title={stu.motherOccupation || ''}
                          placeholder="មុខរបរ..."
                          onChange={(e) => handleInlineChange(stu.id, 'motherOccupation', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block truncate text-[5.2pt]">
                          {stu.motherOccupation || ''}
                        </span>
                      </td>

                      {/* ម្តាយ - លេខទូរស័ព្ទ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.motherPhone || ''}
                          title={stu.motherPhone || ''}
                          placeholder="ទូរស័ព្ទ..."
                          onChange={(e) => handleInlineChange(stu.id, 'motherPhone', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] font-mono text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block font-mono text-center text-[5.2pt] truncate">
                          {stu.motherPhone || ''}
                        </span>
                      </td>

                      {/* ផ្សេងៗ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.otherNotes || stu.notes || ''}
                          title={stu.otherNotes || stu.notes || ''}
                          placeholder="ចំណាំ..."
                          onChange={(e) => handleInlineChange(stu.id, 'otherNotes', e.target.value)}
                          className="w-full text-xs sm:text-[12.5px] text-slate-700 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none"
                        />
                        <span className="hidden print:block truncate text-[5.2pt]">
                          {stu.otherNotes || stu.notes || ''}
                        </span>
                      </td>

                      {/* សកម្មភាព (Sticky right on horizontal scroll) */}
                      <td className="py-1 px-1 text-center no-print bg-slate-50/95 sticky right-0 z-10 border-l border-slate-200 shadow-xs print:hidden">
                        <div className="flex items-center justify-center space-x-1">
                          {/* ចម្លងសិស្ស */}
                          <button
                            onClick={() => handleDirectDuplicate(stu)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="ចម្លងសិស្ស (បង្កើតសិស្សស្ទួន)"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* មើលប្រវត្តិរូប */}
                          <button
                            onClick={() => setViewingStudent(stu)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="មើលប្រវត្តិរូបលម្អិត"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* លុប */}
                          <button
                            onClick={() => handleDirectDelete(stu)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="លុបសិស្សនេះចេញ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sticky XLSM Style Horizontal Scroll Navigator (នៅនឹងថ្កល់ខាងក្រោម ស្រួលទាញដូច Microsoft Excel .xlsm) */}
        <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md px-4 py-2 border-t-2 border-emerald-500 shadow-xl no-print flex flex-col md:flex-row items-center justify-between gap-2.5">
          {/* Left: Quick Scroll Arrow Buttons + Excel Jump Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-black text-slate-700 mr-1 flex items-center">
              📑 របារ XLSM៖
            </span>
            <button
              type="button"
              onClick={() => tableScrollRef.current?.scrollBy({ left: -350, behavior: 'smooth' })}
              className="inline-flex items-center px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer text-xs"
              title="រំកិលទៅឆ្វេង 350px"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
              ឆ្វេង
            </button>
            <button
              type="button"
              onClick={() => tableScrollRef.current?.scrollBy({ left: 350, behavior: 'smooth' })}
              className="inline-flex items-center px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer text-xs"
              title="រំកិលទៅស្តាំ 350px"
            >
              ស្តាំ
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {/* Direct Section Jump Tabs */}
            <div className="hidden lg:flex items-center space-x-1 pl-2 border-l border-slate-300">
              <button
                type="button"
                onClick={() => tableScrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' })}
                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md font-bold text-[11px] border border-blue-200 transition-colors"
                title="លោតទៅព័ត៌មានទូទៅ"
              >
                1. ព័ត៌មានទូទៅ
              </button>
              <button
                type="button"
                onClick={() => tableScrollRef.current?.scrollTo({ left: 550, behavior: 'smooth' })}
                className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-md font-bold text-[11px] border border-amber-200 transition-colors"
                title="លោតទៅទីកន្លែងកំណើត"
              >
                2. ទីកន្លែងកំណើត
              </button>
              <button
                type="button"
                onClick={() => tableScrollRef.current?.scrollTo({ left: 1050, behavior: 'smooth' })}
                className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-md font-bold text-[11px] border border-teal-200 transition-colors"
                title="លោតទៅអាសយដ្ឋានបច្ចុប្បន្ន"
              >
                3. អាសយដ្ឋាន
              </button>
              <button
                type="button"
                onClick={() => tableScrollRef.current?.scrollTo({ left: 1500, behavior: 'smooth' })}
                className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md font-bold text-[11px] border border-purple-200 transition-colors"
                title="លោតទៅស្ថានភាពសិស្ស"
              >
                4. ស្ថានភាព
              </button>
              <button
                type="button"
                onClick={() => tableScrollRef.current?.scrollTo({ left: 1950, behavior: 'smooth' })}
                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md font-bold text-[11px] border border-indigo-200 transition-colors"
                title="លោតទៅឪពុកម្តាយ & អាណាព្យាបាល"
              >
                5. ឪពុកម្តាយ
              </button>
            </div>
          </div>

          {/* Right: Synced XLSM Slider Bar */}
          <div className="flex items-center space-x-2 w-full md:w-72">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">ទាញរំកិល៖</span>
            <input
              type="range"
              min="0"
              max="100"
              value={scrollPercent}
              onChange={(e) => {
                const val = Number(e.target.value);
                setScrollPercent(val);
                if (tableScrollRef.current) {
                  const max = tableScrollRef.current.scrollWidth - tableScrollRef.current.clientWidth;
                  tableScrollRef.current.scrollLeft = (val / 100) * max;
                }
              }}
              className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              title="ទាញរំកិលតារាងឆ្វេង-ស្តាំដូច Excel"
            />
            <span className="text-[11px] font-mono font-bold text-slate-600 w-9 text-right">
              {scrollPercent}%
            </span>
          </div>
        </div>

        {/* Bottom Status Row */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500 no-print">
          <div className="flex items-center space-x-3">
            <span>ចំនួនសិស្សក្នុងតារាង៖ <strong className="text-slate-800">{toKhmerNum(filteredStudents.length)}</strong> នាក់</span>
            <span>|</span>
            <span>សិស្សស្រី៖ <strong className="text-pink-600">{toKhmerNum(femaleFiltered)}</strong> នាក់</span>
            <span>|</span>
            <span>សិស្សប្រុស៖ <strong className="text-blue-600">{toKhmerNum(maleFiltered)}</strong> នាក់</span>
          </div>
          <button
            onClick={handleAddNewBlankRow}
            className="inline-flex items-center text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            + បន្ថែមសិស្សថ្មីនៅជួរដេកទី ១
          </button>
        </div>
      </div>

      {/* Official Signatures on Print */}
      <div className="hidden print:block mt-8 text-xs print:break-inside-avoid">
        <div className="flex justify-between items-start">
          <div className="text-center w-52">
            <p className="font-bold">បានឃើញ និងពិនិត្យត្រឹមត្រូវ</p>
            <p className="text-[11px] text-slate-500">នាយកសាលា</p>
            <div className="h-20" />
            <p className="font-bold">{settings?.principalName || 'នាយកសាលា'}</p>
          </div>

          <div className="text-center w-52">
            <p className="italic text-[11px]">
              {settings?.provinceCity || 'ខេត្តកំពង់ឆ្នាំង'}, ថ្ងៃទី....... ខែ....... ឆ្នាំ២០២...
            </p>
            <p className="font-bold">គ្រូបន្ទុកថ្នាក់</p>
            <div className="h-20" />
            <p className="font-bold">{settings?.teacherName || 'ហ៊ុន រដ្ឋា'}</p>
            <p className="text-[10px] text-slate-500">{settings?.phone}</p>
          </div>
        </div>
      </div>

      {/* Modal: View Full Student Profile Card */}
      <Modal
        isOpen={!!viewingStudent}
        onClose={() => setViewingStudent(null)}
        title="ប្រវត្តិរូបសង្ខេបសិស្ស"
        subtitle={viewingStudent?.nameKh}
        maxWidth="2xl"
      >
        {viewingStudent && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-md">
                {viewingStudent.nameKh.charAt(0)}
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">{viewingStudent.nameKh}</h4>
                <p className="text-xs text-slate-500 font-medium">{viewingStudent.nameEn || '-'}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-md font-bold font-mono">
                    {viewingStudent.studentCode}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-xs rounded-md font-bold">
                    {classes.find((c) => c.id === viewingStudent.classId)?.name || 'ថ្នាក់រៀន'}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded-md font-bold">
                    លេខរៀង៖ {toKhmerNum(viewingStudent.rollNo)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-0.5">ភេទ</span>
                <span className="font-bold text-slate-800">{viewingStudent.gender}</span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-0.5">ថ្ងៃខែឆ្នាំកំណើត (dd/mm/yyyy)</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatToDMY(viewingStudent.dob) || '-'} {viewingStudent.dob && `(${formatKhmerDate(viewingStudent.dob)})`}
                </span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-0.5">អាយុ</span>
                <span className="font-bold text-slate-800">{toKhmerNum(viewingStudent.age || calculateAge(viewingStudent.dob))} ឆ្នាំ</span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-0.5">ទូរស័ព្ទសិស្ស</span>
                <span className="font-bold text-blue-700">{viewingStudent.studentPhone || '-'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-400 font-bold block">ទីកន្លែងកំណើត៖</span>
                <p><span className="text-slate-500">ភូមិ៖</span> <strong>{viewingStudent.pobVillage || '-'}</strong></p>
                <p><span className="text-slate-500">ឃុំ/សង្កាត់៖</span> <strong>{viewingStudent.pobCommune || '-'}</strong></p>
                <p><span className="text-slate-500">ស្រុក/ខណ្ឌ៖</span> <strong>{viewingStudent.pobDistrict || '-'}</strong></p>
                <p><span className="text-slate-500">ខេត្ត/រាជធានី៖</span> <strong>{viewingStudent.pobProvince || viewingStudent.pob || '-'}</strong></p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-400 font-bold block">អាសយដ្ឋានបច្ចុប្បន្ន៖</span>
                <p><span className="text-slate-500">ភូមិ៖</span> <strong>{viewingStudent.addrVillage || '-'}</strong></p>
                <p><span className="text-slate-500">ឃុំ៖</span> <strong>{viewingStudent.addrCommune || '-'}</strong></p>
                <p><span className="text-slate-500">ស្រុក៖</span> <strong>{viewingStudent.addrDistrict || '-'}</strong></p>
                <p><span className="text-slate-500">ខេត្ត៖</span> <strong>{viewingStudent.addrProvince || viewingStudent.currentAddress || '-'}</strong></p>
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs space-y-2">
              <h5 className="font-bold text-blue-900">ព័ត៌មានឪពុកម្តាយ & អាណាព្យាបាល៖</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2 bg-white rounded-xl border border-blue-100">
                  <p className="font-bold text-slate-800">ឪពុក៖ {viewingStudent.fatherName || viewingStudent.guardianName || '-'}</p>
                  <p className="text-slate-500 mt-0.5">មុខរបរ៖ {viewingStudent.fatherOccupation || viewingStudent.guardianOccupation || '-'}</p>
                  <p className="text-blue-700 font-bold mt-0.5">ទូរស័ព្ទ៖ {viewingStudent.fatherPhone || viewingStudent.guardianPhone || '-'}</p>
                </div>
                <div className="p-2 bg-white rounded-xl border border-blue-100">
                  <p className="font-bold text-slate-800">ម្តាយ៖ {viewingStudent.motherName || '-'}</p>
                  <p className="text-slate-500 mt-0.5">មុខរបរ៖ {viewingStudent.motherOccupation || '-'}</p>
                  <p className="text-blue-700 font-bold mt-0.5">ទូរស័ព្ទ៖ {viewingStudent.motherPhone || '-'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDirectDuplicate(viewingStudent)}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 mr-1 inline-block" />
                ចម្លងសិស្សនេះ
              </button>

              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
              >
                បិទផ្ទាំង
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Student ID Cards Print Modal with QR Code */}
      <StudentIDCardsModal
        isOpen={isIDCardsOpen}
        onClose={() => setIsIDCardsOpen(false)}
        students={filteredStudents}
        currentClass={currentClass || null}
        settings={settings}
      />

      {/* Instant Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-14 right-6 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold border border-slate-700 animate-in fade-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
