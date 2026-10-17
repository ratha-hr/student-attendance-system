import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Clipboard,
  Sparkles,
  BookOpenCheck,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, Gender, TeacherSettings } from '../types';
import type { NavTab } from '../components/Sidebar';
import { db } from '../db/db';
import { Modal } from '../components/common/Modal';
import { StudentIDCardsModal } from '../components/StudentIDCardsModal';
import { AddStudentModal } from '../components/AddStudentModal';
import { StudentPasteModal } from '../components/StudentPasteModal';
import { useUndoRedo } from '../context/UndoRedoContext';
import { PrintButton } from '../components/common/PrintButton';
import { toKhmerNum, fromKhmerNum, formatKhmerDate, formatToDMY, parseDMYToISO } from '../utils/dateUtils';
import {
  exportStudentsToExcel,
  downloadStudentTemplate,
  parseExcelStudents,
  parsePastedExcelText,
  parseClipboardGrid,
  calculateAge,
} from '../utils/excelUtils';
import { enrichStudentWithMoEYSFields } from '../utils/studentEnricher';

interface StudentsPageProps {
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords?: AttendanceRecord[];
  settings: TeacherSettings | null;
  selectedClassId: string;
  onSelectClass?: (classId: string) => void;
  onRefresh: () => void;
  onNavigateTab?: (tab: NavTab) => void;
  onOpenManageClasses?: () => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({
  students,
  classes,
  attendanceRecords,
  settings,
  selectedClassId,
  onSelectClass,
  onRefresh,
  onNavigateTab,
  onOpenManageClasses,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'ប្រុស' | 'ស្រី'>('all');
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [isIDCardsOpen, setIsIDCardsOpen] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isSelectClassPromptOpen, setIsSelectClassPromptOpen] = useState(false);
  const [pendingActionName, setPendingActionName] = useState<string>('ចម្លង ឬបញ្ចូលទិន្នន័យសិស្ស');

  // Guard: Strictly disallow adding, pasting, or importing data when "All Classes" is active
  const requireSpecificClass = (actionName: string = 'ចម្លង ឬបញ្ចូលទិន្នន័យសិស្ស'): boolean => {
    if (classes.length === 0) {
      if (onOpenManageClasses) {
        onOpenManageClasses();
      } else {
        showToast('⚠️ មិនទាន់មានថ្នាក់រៀនទេ! សូមបង្កើតថ្នាក់រៀនជាមុនសិន។');
      }
      return false;
    }

    if (selectedClassId === 'ALL') {
      setPendingActionName(actionName);
      setIsSelectClassPromptOpen(true);
      return false;
    }

    return true;
  };
  const [selectedCell, setSelectedCell] = useState<{ rowIdx: number; colKey: string; colName: string } | null>(null);
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null);
  const [emptyRowCount, setEmptyRowCount] = useState<number>(15);
  const { canUndo, canRedo, undo, redo, pushSnapshot, showToast } = useUndoRedo();
  const [scrollPercent, setScrollPercent] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

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

  // Total counts for active class (used for unified interactive filter badges)
  const currentClassStudents = students.filter(
    (s) => selectedClassId === 'ALL' || s.classId === activeClassId
  );
  const classStudentsTotal = currentClassStudents.length;
  const classStudentsFemale = currentClassStudents.filter((s) => s.gender === 'ស្រី').length;
  const classStudentsMale = currentClassStudents.filter((s) => s.gender === 'ប្រុស').length;

  // Duplicate detection in current class
  const duplicateInfo = useMemo(() => {
    const nameCountMap = new Map<string, number>();
    const codeCountMap = new Map<string, number>();

    currentClassStudents.forEach((s) => {
      const n = (s.nameKh || '').trim().toLowerCase();
      if (n) nameCountMap.set(n, (nameCountMap.get(n) || 0) + 1);
      const c = (s.studentCode || '').trim().toLowerCase();
      if (c) codeCountMap.set(c, (codeCountMap.get(c) || 0) + 1);
    });

    const duplicateNames = new Set<string>();
    const duplicateCodes = new Set<string>();
    const sampleNamesList: string[] = [];
    let duplicateStudentCount = 0;

    nameCountMap.forEach((count, name) => {
      if (count > 1) {
        duplicateNames.add(name);
        duplicateStudentCount += (count - 1);
        const originalStudent = currentClassStudents.find((s) => (s.nameKh || '').trim().toLowerCase() === name);
        if (originalStudent && sampleNamesList.length < 5) {
          sampleNamesList.push(originalStudent.nameKh);
        }
      }
    });

    codeCountMap.forEach((count, code) => {
      if (count > 1) {
        duplicateCodes.add(code);
      }
    });

    return {
      duplicateNames,
      duplicateCodes,
      duplicateStudentCount,
      hasDuplicates: duplicateStudentCount > 0,
      sampleNames: sampleNamesList.join(', '),
    };
  }, [currentClassStudents]);

  // Detect students whose nameKh looks like a village or commune name while pobVillage is empty
  const corruptedAddressNamesList = useMemo(() => {
    const VILLAGE_PATTERNS = [
      'សុបិន', 'សាលាលេខប្រាំ', 'ថ្នល់ទទឹង', 'ព្រៃពាក់', 'កំពង់ត្រឡាច', 'ឃ្លាំងមឿង',
      'ត្រពាំងព្រីង', 'ស្វាយរូង', 'សេដ្ឋី', 'លង្វែក', 'អំពិលទឹក', 'ឆក់កណ្តោល'
    ];
    return currentClassStudents.filter((s) => {
      const name = (s.nameKh || '').trim();
      const isKnownVillage = VILLAGE_PATTERNS.some((vp) => name.includes(vp)) || /^(ភូមិ|ឃុំ|ស្រុក)/.test(name);
      return isKnownVillage && (!s.pobVillage || s.pobVillage.trim() === '');
    });
  }, [currentClassStudents]);

  const handleFixCorruptedAddressNames = async () => {
    if (corruptedAddressNamesList.length === 0) return;
    await pushSnapshot(`ផ្លាស់ទីឈ្មោះភូមិ ${corruptedAddressNamesList.length} ទៅជួរភូមិកំណើត`);
    for (const stu of corruptedAddressNamesList) {
      await db.students.update(stu.id, {
        pobVillage: stu.nameKh,
        nameKh: '', // Clear so user can enter or paste genuine student name
      });
    }
    onRefresh();
    showToast(`✨ បានផ្លាស់ទីឈ្មោះភូមិ ${toKhmerNum(corruptedAddressNamesList.length)} ទៅជួរ «ភូមិកំណើត» រួចរាល់!`);
  };

  // One-time automatic cleanup of legacy auto-generated STU-xxx student codes
  useEffect(() => {
    const hasCleaned = localStorage.getItem('app_cleaned_auto_stu_codes_v1');
    if (!hasCleaned) {
      db.students.toArray().then(async (allStudents) => {
        const autoCoded = allStudents.filter(
          (s) => s.studentCode && /^STU-/i.test(s.studentCode)
        );
        if (autoCoded.length > 0) {
          const updates = autoCoded.map((s) => ({ ...s, studentCode: '' }));
          await db.students.bulkPut(updates);
          onRefresh();
        }
        localStorage.setItem('app_cleaned_auto_stu_codes_v1', 'true');
      });
    }
  }, [onRefresh]);

  // Check if current class has any auto STU- codes
  const hasAutoStuCode = useMemo(() => {
    return currentClassStudents.some((s) => s.studentCode && /^STU-/i.test(s.studentCode));
  }, [currentClassStudents]);

  const handleClearAutoStudentCodes = async () => {
    const autoCoded = currentClassStudents.filter(
      (s) => s.studentCode && /^STU-/i.test(s.studentCode)
    );
    if (autoCoded.length === 0) {
      showToast('ℹ️ មិនមានអត្តលេខស្វ័យប្រវត្ត STU- ត្រូវសម្អាតទេ');
      return;
    }
    await pushSnapshot(`សម្អាតអត្តលេខស្វ័យប្រវត្តិ (${autoCoded.length} នាក់)`);
    const updates = autoCoded.map((s) => ({ ...s, studentCode: '' }));
    await db.students.bulkPut(updates);
    onRefresh();
    showToast(`✨ បានសម្អាតអត្តលេខស្វ័យប្រវត្តិ STU- ចំនួន ${toKhmerNum(autoCoded.length)} នាក់រួចរាល់!`);
  };

  const activeEditingCellRef = useRef<string | null>(null);

  // Direct Inline Cell Edit Handler (Auto-Save on blur or change)
  const handleInlineChange = async (studentId: string, field: keyof Student, value: any) => {
    try {
      const cellKey = `${studentId}-${field}`;
      if (activeEditingCellRef.current !== cellKey) {
        await pushSnapshot('កែប្រែទិន្នន័យសិស្ស');
        activeEditingCellRef.current = cellKey;
      }
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

  // Handle typing into an empty spreadsheet row cell (creates student automatically)
  const handleEmptyRowCellChange = async (rowIdx: number, field: keyof Student, value: any) => {
    if (!value || (typeof value === 'string' && !value.trim())) return;
    if (!requireSpecificClass('បញ្ចូលសិស្សថ្មីក្នុងតារាង')) return;
    try {
      const targetClassId = selectedClassId;
      const targetRollNo = rowIdx + 1;
      await pushSnapshot('បញ្ចូលសិស្សពីក្រឡាទទេ');
      const newStudent: Student = {
        id: 'stu-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        classId: targetClassId,
        rollNo: targetRollNo,
        studentCode: field === 'studentCode' ? (value || '').trim() : '',
        nameKh: field === 'nameKh' ? value : `សិស្ស ${targetRollNo}`,
        nameEn: field === 'nameEn' ? value : '',
        gender: field === 'gender' ? value : 'ប្រុស',
        dob: field === 'dob' ? value : '',
        age: field === 'dob' ? calculateAge(value) : 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        [field]: value,
      };
      await db.students.add(newStudent);
      setLastSavedId(newStudent.id);
      setTimeout(() => setLastSavedId(null), 2000);
      onRefresh();
      showToast(`✨ បានបង្កើតសិស្សថ្មី "${newStudent.nameKh}"`);
    } catch (err) {
      console.error('Error saving empty row cell:', err);
    }
  };

  // Core Excel/Clipboard Paste Engine
  const executeTablePaste = async (text: string) => {
    if (text === undefined || text === null) {
      return false;
    }
    if (!selectedCell && !text.includes('\t') && !text.includes('\n')) {
      return false;
    }
    if (!requireSpecificClass('បិទភ្ជាប់ទិន្នន័យពី Excel')) {
      return false;
    }
    const targetClassId = selectedClassId;

    const startRowIdx = selectedCell ? selectedCell.rowIdx : 0;
    const startColKey = selectedCell ? (selectedCell.colKey as keyof Student) : undefined;

    const parsedGrid = parseClipboardGrid(text, startColKey);
    if (parsedGrid.rows.length === 0) {
      showToast('⚠️ មិនអាចស្គាល់ទិន្នន័យសិស្សពីការ Copy ទេ (សូមចម្លងពី Excel ឡើងវិញ)');
      return false;
    }

    await pushSnapshot(`បិទភ្ជាប់ទិន្នន័យ ${parsedGrid.rows.length} ជួរពី Excel`);

    let updatedCount = 0;
    let addedCount = 0;
    const newStudentsToAdd: Student[] = [];

    const batchSeenNames = new Set(
      filteredStudents.map((s) => (s.nameKh || '').trim().toLowerCase())
    );

    for (let rIdx = 0; rIdx < parsedGrid.rows.length; rIdx++) {
      const rowData = parsedGrid.rows[rIdx];
      const targetIdx = startRowIdx + rIdx;

      if (targetIdx < filteredStudents.length) {
        // Target row already has an existing student -> UPDATE only the pasted fields!
        const existingStudent = filteredStudents[targetIdx];
        const updates: Partial<Student> = { ...rowData };

        // Safeguard 1: Never overwrite a student's name with pure numbers (e.g. roll numbers)
        if (updates.nameKh && /^\d+$/.test(updates.nameKh)) {
          delete updates.nameKh;
        }

        // Safeguard 2: If user started pasting from a non-name column (e.g. pobVillage, addrVillage, studentPhone, dob, etc.),
        // NEVER allow nameKh to be overwritten by the paste!
        if (startColKey && startColKey !== 'nameKh' && startColKey !== 'rollNo' && startColKey !== 'studentCode') {
          delete updates.nameKh;
        }

        // Safeguard 3: If existing student already has a name, and address fields are being updated
        // without an explicit nameKh column in the pasted grid, protect existing student's name!
        if (
          existingStudent.nameKh &&
          (updates.pobVillage || updates.pobCommune || updates.pobDistrict || updates.pobProvince || updates.addrVillage) &&
          !parsedGrid.columnKeys.includes('nameKh')
        ) {
          delete updates.nameKh;
        }

        // Safeguard 4: If existing student already has a name, and updates.nameKh is empty, DO NOT wipe student name!
        if (existingStudent.nameKh && updates.nameKh !== undefined && updates.nameKh.trim() === '') {
          delete updates.nameKh;
        }

        // Safeguard 5: For gender, if empty in updates, preserve existing valid gender
        if (updates.gender !== undefined && !updates.gender) {
          delete updates.gender;
        }

        if (updates.dob) {
          updates.age = calculateAge(updates.dob);
        } else if (updates.dob === '') {
          updates.age = 0;
        }

        await db.students.update(existingStudent.id, updates);
        updatedCount++;
      } else {
        // Row extends beyond existing students -> only CREATE a new student if a real name exists!
        const studentName = String(rowData.nameKh || '').trim();
        if (!studentName || /^\d+$/.test(studentName) || /^(ល\.?រ|អត្តលេខ|គោត្តនាម|ឈ្មោះ|name)$/i.test(studentName)) {
          // Skip rows without genuine student names (never create fake dummy students)
          continue;
        }

        // Check if student with this name already exists in target class or batch to prevent duplicates!
        const nameKey = studentName.toLowerCase();
        if (batchSeenNames.has(nameKey)) {
          const existing =
            filteredStudents.find((s) => (s.nameKh || '').trim().toLowerCase() === nameKey) ||
            newStudentsToAdd.find((s) => (s.nameKh || '').trim().toLowerCase() === nameKey);
          if (existing) {
            const updates: Partial<Student> = { ...rowData };
            if (updates.nameKh && /^\d+$/.test(updates.nameKh)) delete updates.nameKh;
            if (updates.dob) updates.age = calculateAge(updates.dob);
            if ('id' in existing && existing.id.startsWith('stu-')) {
              await db.students.update(existing.id, updates);
              updatedCount++;
            }
          }
          continue;
        }
        batchSeenNames.add(nameKey);

        const targetRollNo = rowData.rollNo ? Number(rowData.rollNo) : (filteredStudents.length + addedCount + 1);
        const newStu: Student = {
          id: `stu-${Date.now()}-${rIdx}-${Math.random().toString(36).substring(2, 6)}`,
          classId: targetClassId,
          rollNo: targetRollNo,
          studentCode: (rowData.studentCode || '').trim(),
          nameEn: rowData.nameEn || '',
          gender: rowData.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស',
          dob: rowData.dob || '',
          age: rowData.dob ? calculateAge(rowData.dob) : (rowData.age || 0),
          originSchool: rowData.originSchool || '',
          pobVillage: rowData.pobVillage || '',
          pobCommune: rowData.pobCommune || '',
          pobDistrict: rowData.pobDistrict || '',
          pobProvince: rowData.pobProvince || '',
          addrVillage: rowData.addrVillage || '',
          addrCommune: rowData.addrCommune || '',
          addrDistrict: rowData.addrDistrict || '',
          addrProvince: rowData.addrProvince || '',
          studentPhone: rowData.studentPhone || '',
          fatherName: rowData.fatherName || '',
          fatherOccupation: rowData.fatherOccupation || '',
          fatherPhone: rowData.fatherPhone || '',
          motherName: rowData.motherName || '',
          motherOccupation: rowData.motherOccupation || '',
          motherPhone: rowData.motherPhone || '',
          otherNotes: rowData.otherNotes || '',
          status: 'active',
          createdAt: new Date().toISOString(),
          ...rowData,
          nameKh: studentName,
        };
        newStudentsToAdd.push(newStu);
        addedCount++;
      }
    }

    if (newStudentsToAdd.length > 0) {
      await db.students.bulkAdd(newStudentsToAdd);
    }

    onRefresh();

    const colInfo = selectedCell ? `ចាប់ពីក្រឡា [${selectedCell.colName}]` : '';
    const summary = [];
    if (updatedCount > 0) summary.push(`កែប្រែសិស្ស ${updatedCount} នាក់`);
    if (addedCount > 0) summary.push(`បន្ថែមសិស្សថ្មី ${addedCount} នាក់`);
    if (summary.length > 0) {
      showToast(`📋 បានបិទភ្ជាប់ទិន្នន័យពី Excel ${colInfo} ដោយជោគជ័យ (${summary.join(', ')})!`);
      return true;
    } else {
      showToast('⚠️ មិនមានទិន្នន័យសិស្សត្រូវបានបញ្ចូលទេ');
      return false;
    }
  };

  // Direct Ctrl+V on the spreadsheet table (Intelligent Excel-like grid paste)
  const handleTablePaste = async (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (text === undefined || text === null) return;
    if (selectedCell) {
      e.preventDefault();
      (e.nativeEvent as any).__tablePasteHandled = true;
      e.stopPropagation();
      await executeTablePaste(text);
      return;
    }
    if (!text.includes('\t') && !text.includes('\n')) {
      return; // Regular single cell inline text paste, let browser handle it natively
    }
    e.preventDefault();
    (e.nativeEvent as any).__tablePasteHandled = true;
    e.stopPropagation();
    await executeTablePaste(text);
  };

  // Direct 1-Click Clipboard paste or fallback to modal
  const handleDirectClipboardPasteClick = async () => {
    if (!requireSpecificClass('បិទភ្ជាប់ទិន្នន័យពី Excel')) return;
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text !== undefined && (text.includes('\t') || text.includes('\n') || selectedCell)) {
          const success = await executeTablePaste(text);
          if (success) return;
        }
      }
    } catch (err) {
      console.warn('Direct clipboard read restricted by browser:', err);
    }
    setIsPasteModalOpen(true);
  };

  // Global window paste listener: allow Ctrl+V anywhere on StudentsPage to paste directly into table
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      // Don't execute if handleTablePaste already handled this event
      if ((e as any).__tablePasteHandled) {
        return;
      }

      // Don't intercept if any modal is open
      if (isAddModalOpen || isPasteModalOpen || isIDCardsOpen || viewingStudent || editingStudent) {
        return;
      }

      // Don't intercept if typing in a search bar
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'INPUT') {
        const inputType = (target as HTMLInputElement).type;
        const placeholder = target.getAttribute('placeholder') || '';
        if (placeholder.includes('ស្វែងរក') || inputType === 'search') {
          return;
        }
      }

      const clipboardText = e.clipboardData?.getData('text/plain');
      if (clipboardText !== undefined && (clipboardText.includes('\t') || clipboardText.includes('\n') || selectedCell)) {
        e.preventDefault();
        await executeTablePaste(clipboardText);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [selectedClassId, classes, selectedCell, filteredStudents, isAddModalOpen, isPasteModalOpen, isIDCardsOpen, viewingStudent, editingStudent]);

  // Keyboard navigation inside table (Enter moves down, Tab moves right)
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    rowIdx: number,
    colKey: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.querySelector<HTMLElement>(`[data-cell="${rowIdx + 1}-${colKey}"]`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  // Handle Ctrl+C on selected cell
  const handleTableKeyDown = async (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedCell) {
      const stu = filteredStudents[selectedCell.rowIdx];
      if (stu) {
        const val = String((stu as any)[selectedCell.colKey] || '');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(val);
          showToast(`📋 បានចម្លង៖ "${val}"`);
        }
      }
    }
  };

  // Direct Duplicate Row Handler (ចម្លងសិស្សដោយផ្ទាល់)
  const handleDirectDuplicate = async (s: Student) => {
    await pushSnapshot(`ចម្លងសិស្ស "${s.nameKh}"`);
    const classStudents = students.filter((stu) => stu.classId === s.classId);
    const nextRoll = classStudents.length + 1;
    const duplicated: Student = {
      ...s,
      id: 'stu-' + Date.now(),
      rollNo: nextRoll,
      studentCode: s.studentCode ? `${s.studentCode}-កូពី` : '',
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
    await pushSnapshot(`លុបសិស្ស "${s.nameKh}"`);
    await db.students.delete(s.id);
    onRefresh();
    showToast(`🗑️ បានលុបសិស្ស "${s.nameKh}" (អាចចុច ↶ Undo ដើម្បីយកមកវិញ)`);
  };

  // Delete all students in active class or all (មិនបាច់ផ្ទៀងផ្ទាត់ អាចចុច Undo បាន)
  const handleDeleteAllStudents = async () => {
    await pushSnapshot(selectedClassId === 'ALL' ? 'លុបសិស្សទាំងអស់' : `លុបសិស្សក្នុងថ្នាក់ ${currentClassName}`);
    if (selectedClassId === 'ALL') {
      await db.students.clear();
      showToast('🗑️ បានលុបសិស្សទាំងអស់រួចរាល់! (អាចចុច ↶ Undo ដើម្បីយកមកវិញ)');
    } else {
      const idsToDelete = Array.from(new Set([
        ...students.filter((s) => s.classId === activeClassId).map((s) => s.id),
        ...filteredStudents.map((s) => s.id),
      ]));
      await db.students.bulkDelete(idsToDelete);
      showToast(`🗑️ បានលុបសិស្សក្នុងថ្នាក់ ${currentClassName} ទាំងអស់រួចរាល់! (អាចចុច ↶ Undo បាន)`);
    }
    onRefresh();
  };

  // Save New Student from Dedicated Form Modal (បញ្ចូលតាមក្បាលតារាង & ភូមិសាស្ត្ររដ្ឋបាលកម្ពុជា)
  const handleSaveNewStudent = async (newStudent: Student) => {
    await pushSnapshot(`បន្ថែមសិស្សថ្មី "${newStudent.nameKh}"`);
    const targetClassId = newStudent.classId;
    const classStudents = students.filter((s) => s.classId === targetClassId);

    // Shift existing students in this class by +1 so new student is at row 1
    const updatedClassStudents = classStudents.map((s) => ({
      ...s,
      rollNo: (s.rollNo || 0) + 1,
    }));
    await db.students.bulkPut(updatedClassStudents);

    await db.students.add(newStudent);
    setLastSavedId(newStudent.id);
    onRefresh();

    // Smooth scroll to top
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
    showToast(`✨ បានបន្ថែមសិស្សថ្មី "${newStudent.nameKh}" នៅជួរដេកទី ១ ដោយជោគជ័យ!`);
  };

  // Export to Excel
  const handleExportExcel = () => {
    exportStudentsToExcel(filteredStudents, currentClassName);
  };

  // Intelligent Deduplication: merge & remove duplicate students
  const handleDeduplicateStudents = async () => {
    if (!duplicateInfo.hasDuplicates) {
      showToast('ℹ️ មិនមានឈ្មោះសិស្សជាន់គ្នាទេ ក្នុងថ្នាក់នេះ!');
      return;
    }

    if (
      !confirm(
        `តើអ្នកពិតជាចង់សម្អាតឈ្មោះជាន់គ្នា (${toKhmerNum(duplicateInfo.duplicateStudentCount)} នាក់) ដែរឬទេ?\n\n` +
        `ប្រព័ន្ធនឹងរក្សាទុកសិស្សដែលមានទិន្នន័យគ្រប់ជ្រុងជ្រោយជាងគេ និងលុបឈ្មោះស្ទួនចេញដោយសុវត្ថិភាព (អាចចុច Undo យកមកវិញបានគ្រប់ពេល)។`
      )
    ) {
      return;
    }

    try {
      await pushSnapshot(`សម្អាតសិស្សជាន់គ្នា ${duplicateInfo.duplicateStudentCount} នាក់`);

      // Group students by nameKh (trimmed lowercase)
      const groups = new Map<string, Student[]>();
      currentClassStudents.forEach((s) => {
        const key = (s.nameKh || '').trim().toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(s);
      });

      const idsToDelete: string[] = [];
      const studentsToUpdate: Student[] = [];

      groups.forEach((group) => {
        if (group.length > 1) {
          // Sort group by data richness (count non-empty fields)
          group.sort((a, b) => {
            const scoreA = Object.values(a).filter((v) => v !== '' && v !== null && v !== undefined).length;
            const scoreB = Object.values(b).filter((v) => v !== '' && v !== null && v !== undefined).length;
            return scoreB - scoreA;
          });

          const keeper = { ...group[0] };
          for (let i = 1; i < group.length; i++) {
            const dup = group[i];
            idsToDelete.push(dup.id);
            // Merge any missing fields into keeper
            (Object.keys(dup) as (keyof Student)[]).forEach((key) => {
              if ((!keeper[key] || keeper[key] === '') && dup[key]) {
                (keeper as any)[key] = dup[key];
              }
            });
          }
          studentsToUpdate.push(keeper);
        }
      });

      if (idsToDelete.length > 0) {
        await db.students.bulkDelete(idsToDelete);
      }
      if (studentsToUpdate.length > 0) {
        await db.students.bulkPut(studentsToUpdate);
      }

      // Resequence rollNo from 1 to N
      const remaining = await db.students
        .filter((s) => selectedClassId === 'ALL' || s.classId === activeClassId)
        .toArray();
      remaining.sort((a, b) => a.rollNo - b.rollNo);

      const reordered = remaining.map((s, idx) => ({
        ...s,
        rollNo: idx + 1,
        studentCode: s.studentCode || '',
      }));
      await db.students.bulkPut(reordered);

      onRefresh();
      showToast(
        `✨ បានសម្អាតឈ្មោះជាន់គ្នាជោគជ័យ! (លុបសិស្សស្ទួន ${toKhmerNum(idsToDelete.length)} នាក់ នៅសល់ ${toKhmerNum(reordered.length)} នាក់ពិតប្រាកដ)`
      );
    } catch (err) {
      console.error('Error deduplicating students:', err);
      showToast('⚠️ មានបញ្ហាក្នុងការសម្អាតឈ្មោះជាន់គ្នា!');
    }
  };

  // Import from Excel file
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!requireSpecificClass('នាំចូលទិន្នន័យពី Excel')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const targetClassId = selectedClassId;

    try {
      const parsed = await parseExcelStudents(file, targetClassId);
      if (parsed.length === 0) {
        showToast('⚠️ មិនមានទិន្នន័យសិស្សនៅក្នុងឯកសារទេ!');
        return;
      }

      await pushSnapshot(`នាំចូលទិន្នន័យសិស្ស ${parsed.length} នាក់ពី Excel`);

      // Intelligent Upsert: Merge with existing students to prevent duplicates
      const existingInClass = await db.students.where('classId').equals(targetClassId).toArray();
      const existingMapByName = new Map<string, Student>();
      const existingMapByCode = new Map<string, Student>();
      existingInClass.forEach((s) => {
        existingMapByName.set((s.nameKh || '').trim().toLowerCase(), s);
        if (s.studentCode) existingMapByCode.set(s.studentCode.trim().toLowerCase(), s);
      });

      const toUpdate: Student[] = [];
      const toAdd: Student[] = [];

      parsed.forEach((p, idx) => {
        const keyName = (p.nameKh || '').trim().toLowerCase();
        const keyCode = (p.studentCode || '').trim().toLowerCase();
        const existing = existingMapByName.get(keyName) || (keyCode ? existingMapByCode.get(keyCode) : undefined);

        if (existing) {
          toUpdate.push({
            ...existing,
            ...p,
            id: existing.id,
            classId: targetClassId,
            nameKh: p.nameKh || existing.nameKh,
            gender: p.gender || existing.gender,
          } as Student);
        } else {
          const targetRollNo = p.rollNo || (existingInClass.length + toAdd.length + 1);
          toAdd.push({
            id: `stu_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
            classId: targetClassId,
            rollNo: targetRollNo,
            studentCode: (p.studentCode || '').trim(),
            nameKh: p.nameKh || `សិស្ស ${targetRollNo}`,
            nameEn: p.nameEn || '',
            gender: p.gender || 'ប្រុស',
            dob: p.dob || '',
            age: p.dob ? calculateAge(p.dob) : (p.age || 0),
            status: 'active',
            createdAt: new Date().toISOString(),
            ...p,
          } as Student);
        }
      });

      if (toUpdate.length > 0) {
        await db.students.bulkPut(toUpdate);
      }
      if (toAdd.length > 0) {
        await db.students.bulkAdd(toAdd);
      }

      onRefresh();
      showToast(
        `✨ បាននាំចូលជោគជ័យ! (កែប្រែសិស្សចាស់ ${toKhmerNum(toUpdate.length)} នាក់, បន្ថែមសិស្សថ្មី ${toKhmerNum(toAdd.length)} នាក់)`
      );
    } catch (err) {
      console.error(err);
      showToast('❌ មានបញ្ហាក្នុងការអានឯកសារ Excel! សូមពិនិត្យទម្រង់ឯកសារឡើងវិញ។');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Render an Excel-style interactive empty grid row (allows direct typing, selection, or paste)
  const renderEmptyRow = (rowIdx: number, isTrailing = false) => {
    const isRowSelected = selectedRowIdx === rowIdx;
    const isCellSelected = (key: string) => selectedCell?.rowIdx === rowIdx && selectedCell?.colKey === key;
    const cellClass = (key: string) =>
      `w-full text-xs sm:text-[12.5px] bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${
        isCellSelected(key) ? 'ring-2 ring-blue-600 bg-blue-50/80 font-bold' : ''
      }`;

    return (
      <tr
        key={`empty-row-${rowIdx}`}
        onFocusCapture={(e) => {
          if (selectedClassId === 'ALL') {
            e.preventDefault();
            e.stopPropagation();
            (e.target as HTMLElement)?.blur?.();
            requireSpecificClass('បញ្ចូលសិស្សថ្មីក្នុងតារាង');
          }
        }}
        onClickCapture={(e) => {
          if (selectedClassId === 'ALL') {
            e.preventDefault();
            e.stopPropagation();
            requireSpecificClass('បញ្ចូលសិស្សថ្មីក្នុងតារាង');
          }
        }}
        className={`border-b border-slate-200 transition-colors ${
          isTrailing ? 'no-print print:hidden' : ''
        } ${isRowSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/60'} ${
          selectedClassId === 'ALL' ? 'cursor-not-allowed opacity-80' : ''
        }`}
      >
        {/* 1. ល.រ (Sticky left on screen, static on print) */}
        <td
          onClick={() => {
            setSelectedRowIdx(rowIdx);
            setSelectedCell(null);
          }}
          className="py-1 px-1 text-center font-bold text-slate-400 bg-slate-50/95 border-r border-slate-300 select-none sticky left-0 z-10 shadow-xs cursor-pointer hover:bg-slate-200/80 transition-colors print:static print:bg-transparent"
          title={`ជួរដេកទី ${rowIdx + 1} (ចុចដើម្បីជ្រើសជួរដេកទាំងមូល)`}
        >
          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-xs sm:text-[13px] font-mono">
            {rowIdx + 1}
          </span>
        </td>

        {/* 2. អត្តលេខ */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder=""
            data-cell={`${rowIdx}-studentCode`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'studentCode', colName: 'អត្តលេខ' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'studentCode')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'studentCode', e.target.value)}
            className={`${cellClass('studentCode')} font-mono`}
          />
        </td>

        {/* 3. គោត្តនាម នាម */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="បញ្ចូលឈ្មោះសិស្ស..."
            data-cell={`${rowIdx}-nameKh`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'nameKh', colName: 'គោត្តនាម នាម' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'nameKh')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'nameKh', e.target.value)}
            className={`${cellClass('nameKh')} font-bold text-slate-800 placeholder:text-slate-300`}
          />
        </td>

        {/* 4. ភេទ */}
        <td className="py-1 px-1 text-center border-r border-slate-200">
          <select
            defaultValue=""
            data-cell={`${rowIdx}-gender`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'gender', colName: 'ភេទ' });
              setSelectedRowIdx(rowIdx);
            }}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'gender', e.target.value as Gender)}
            className="w-full text-xs sm:text-[12px] font-bold rounded px-1.5 py-1 cursor-pointer border border-transparent hover:border-slate-300 bg-slate-50 text-slate-600 text-center outline-none"
          >
            <option value="" disabled>-</option>
            <option value="ប្រុស">ប្រុស</option>
            <option value="ស្រី">ស្រី</option>
          </select>
        </td>

        {/* 5. ថ្ងៃខែឆ្នាំកំណើត */}
        <td className="py-1 px-1 border-r border-slate-200">
          <div className="relative flex items-center justify-between">
            <input
              type="text"
              placeholder="dd/mm/yyyy"
              data-cell={`${rowIdx}-dob`}
              onFocus={() => {
                setSelectedCell({ rowIdx, colKey: 'dob', colName: 'ថ្ងៃខែឆ្នាំកំណើត' });
                setSelectedRowIdx(rowIdx);
              }}
              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'dob')}
              onChange={(e) => {
                const val = e.target.value;
                const iso = parseDMYToISO(val);
                if (iso) handleEmptyRowCellChange(rowIdx, 'dob', iso);
              }}
              className={`${cellClass('dob')} font-mono text-center`}
            />
            <input
              type="date"
              onChange={(e) => {
                if (e.target.value) handleEmptyRowCellChange(rowIdx, 'dob', e.target.value);
              }}
              className="w-4 h-4 opacity-35 hover:opacity-100 cursor-pointer print:hidden shrink-0 ml-0.5"
              title="ជ្រើសរើសពីប្រតិទិន"
            />
          </div>
        </td>

        {/* 6. អាយុ */}
        <td className="py-1 px-1 text-center font-bold text-xs sm:text-[13px] text-slate-400 bg-slate-50/50 border-r border-slate-200">
          -
        </td>

        {/* 7. មកពីសាលា */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="សាលាចាស់..."
            data-cell={`${rowIdx}-originSchool`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'originSchool', colName: 'មកពីសាលា' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'originSchool')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'originSchool', e.target.value)}
            className={cellClass('originSchool')}
          />
        </td>

        {/* 8. ទីកន្លែងកំណើត - ភូមិ */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="ភូមិ..."
            data-cell={`${rowIdx}-pobVillage`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'pobVillage', colName: 'ទីកន្លែងកំណើត (ភូមិ)' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'pobVillage')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'pobVillage', e.target.value)}
            className={cellClass('pobVillage')}
          />
        </td>

        {/* 9. ទីកន្លែងកំណើត - ឃុំ/សង្កាត់ */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="ឃុំ/សង្កាត់..."
            data-cell={`${rowIdx}-pobCommune`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'pobCommune', colName: 'ទីកន្លែងកំណើត (ឃុំ/សង្កាត់)' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'pobCommune')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'pobCommune', e.target.value)}
            className={cellClass('pobCommune')}
          />
        </td>

        {/* 10. ទីកន្លែងកំណើត - ស្រុក/ខណ្ឌ */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="ស្រុក/ខណ្ឌ..."
            data-cell={`${rowIdx}-pobDistrict`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'pobDistrict', colName: 'ទីកន្លែងកំណើត (ស្រុក/ខណ្ឌ)' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'pobDistrict')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'pobDistrict', e.target.value)}
            className={cellClass('pobDistrict')}
          />
        </td>

        {/* 11. ទីកន្លែងកំណើត - ខេត្ត/រាជធានី */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="ខេត្ត/រាជធានី..."
            data-cell={`${rowIdx}-pobProvince`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'pobProvince', colName: 'ទីកន្លែងកំណើត (ខេត្ត/រាជធានី)' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'pobProvince')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'pobProvince', e.target.value)}
            className={cellClass('pobProvince')}
          />
        </td>

        {/* 12. អាសយដ្ឋានបច្ចុប្បន្ន - ភូមិ */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="ភូមិ..."
            data-cell={`${rowIdx}-addrVillage`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'addrVillage', colName: 'អាសយដ្ឋានបច្ចុប្បន្ន (ភូមិ)' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'addrVillage')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'addrVillage', e.target.value)}
            className={cellClass('addrVillage')}
          />
        </td>

        {/* 13. អាសយដ្ឋានបច្ចុប្បន្ន - ឃុំ */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="ឃុំ..."
            data-cell={`${rowIdx}-addrCommune`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'addrCommune', colName: 'អាសយដ្ឋានបច្ចុប្បន្ន (ឃុំ)' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'addrCommune')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'addrCommune', e.target.value)}
            className={cellClass('addrCommune')}
          />
        </td>

        {/* 14. អាសយដ្ឋានបច្ចុប្បន្ន - ស្រុក */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="ស្រុក..."
            data-cell={`${rowIdx}-addrDistrict`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'addrDistrict', colName: 'អាសយដ្ឋានបច្ចុប្បន្ន (ស្រុក)' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'addrDistrict')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'addrDistrict', e.target.value)}
            className={cellClass('addrDistrict')}
          />
        </td>

        {/* 15. អាសយដ្ឋានបច្ចុប្បន្ន - ខេត្ត */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="ខេត្ត..."
            data-cell={`${rowIdx}-addrProvince`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'addrProvince', colName: 'អាសយដ្ឋានបច្ចុប្បន្ន (ខេត្ត)' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'addrProvince')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'addrProvince', e.target.value)}
            className={cellClass('addrProvince')}
          />
        </td>

        {/* 16. លេខទូរស័ព្ទផ្ទាល់ខ្លួន */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="ទូរស័ព្ទសិស្ស..."
            data-cell={`${rowIdx}-studentPhone`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'studentPhone', colName: 'លេខទូរស័ព្ទផ្ទាល់ខ្លួន' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'studentPhone')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'studentPhone', e.target.value)}
            className={`${cellClass('studentPhone')} font-mono`}
          />
        </td>

        {/* 17. ឪពុក - ឈ្មោះ */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="ឈ្មោះឪពុក..."
            data-cell={`${rowIdx}-fatherName`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'fatherName', colName: 'ឪពុក (ឈ្មោះ)' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'fatherName')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'fatherName', e.target.value)}
            className={cellClass('fatherName')}
          />
        </td>

        {/* 18. ឪពុក - មុខរបរ */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="មុខរបរ..."
            data-cell={`${rowIdx}-fatherOccupation`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'fatherOccupation', colName: 'ឪពុក (មុខរបរ)' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'fatherOccupation')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'fatherOccupation', e.target.value)}
            className={cellClass('fatherOccupation')}
          />
        </td>

        {/* 19. ឪពុក - លេខទូរស័ព្ទ */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="ទូរស័ព្ទ..."
            data-cell={`${rowIdx}-fatherPhone`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'fatherPhone', colName: 'ឪពុក (ទូរស័ព្ទ)' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'fatherPhone')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'fatherPhone', e.target.value)}
            className={`${cellClass('fatherPhone')} font-mono`}
          />
        </td>

        {/* 20. ម្តាយ - ឈ្មោះ */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="ឈ្មោះម្តាយ..."
            data-cell={`${rowIdx}-motherName`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'motherName', colName: 'ម្តាយ (ឈ្មោះ)' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'motherName')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'motherName', e.target.value)}
            className={cellClass('motherName')}
          />
        </td>

        {/* 21. ម្តាយ - មុខរបរ */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="មុខរបរ..."
            data-cell={`${rowIdx}-motherOccupation`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'motherOccupation', colName: 'ម្តាយ (មុខរបរ)' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'motherOccupation')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'motherOccupation', e.target.value)}
            className={cellClass('motherOccupation')}
          />
        </td>

        {/* 22. ម្តាយ - លេខទូរស័ព្ទ */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="ទូរស័ព្ទ..."
            data-cell={`${rowIdx}-motherPhone`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'motherPhone', colName: 'ម្តាយ (ទូរស័ព្ទ)' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'motherPhone')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'motherPhone', e.target.value)}
            className={`${cellClass('motherPhone')} font-mono`}
          />
        </td>

        {/* 23. ផ្សេងៗ */}
        <td className="py-1 px-1 border-r border-slate-200">
          <input
            type="text"
            placeholder="ចំណាំ..."
            data-cell={`${rowIdx}-otherNotes`}
            onFocus={() => {
              setSelectedCell({ rowIdx, colKey: 'otherNotes', colName: 'ផ្សេងៗ' });
              setSelectedRowIdx(rowIdx);
            }}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 'otherNotes')}
            onChange={(e) => handleEmptyRowCellChange(rowIdx, 'otherNotes', e.target.value)}
            className={cellClass('otherNotes')}
          />
        </td>

        {/* 24. សកម្មភាព */}
        <td className="py-1 px-1 text-center no-print bg-slate-50/95 sticky right-0 z-10 border-l border-slate-200 shadow-xs print:hidden">
          <span className="text-[11px] text-slate-400 font-medium italic">ក្រឡាទទេ</span>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-3">
      {/* If No Classes Created Yet */}
      {classes.length === 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in no-print">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-lg shrink-0">
              🏫
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base text-amber-900">មិនទាន់មានថ្នាក់រៀននៅឡើយទេ</p>
              <p className="text-xs text-amber-700 mt-0.5">
                សូមបង្កើតថ្នាក់រៀនដំបូងរបស់លោកគ្រូ (ឧ. ថ្នាក់ទី 7A ឬ 10B...) ជាមុនសិន ដើម្បីអាចចម្លង ឬបញ្ចូលបញ្ជីឈ្មោះសិស្ស។
              </p>
            </div>
          </div>
          {onOpenManageClasses && (
            <button
              type="button"
              onClick={onOpenManageClasses}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              + បង្កើតថ្នាក់រៀនថ្មី
            </button>
          )}
        </div>
      )}

      {/* Clean, Modern, Responsive Header & Toolbar (No squishing, beautiful on desktop, laptop & mobile) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 no-print">
        {/* Tier 1: Page Title & Classroom Meta Info Bar (Never competes horizontally with buttons) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 mr-2 shrink-0" />
              <span className="whitespace-nowrap">បញ្ជីស្ថិតិ និងប្រវត្តិរូបសង្ខេបសិស្ស</span>
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 shrink-0">
              📚 {currentClassName}
            </span>
            {currentClass?.homeroomTeacher && (
              <span className="inline-flex items-center px-2.5 py-0.5 bg-indigo-50 text-indigo-800 text-xs font-bold rounded-lg border border-indigo-200 shrink-0">
                👨‍🏫 គ្រូទទួលបន្ទុក៖ {currentClass.homeroomTeacher}
              </span>
            )}
            {lastSavedId && (
              <span className="px-2 py-0.5 text-emerald-600 font-bold text-xs bg-emerald-50 rounded-full border border-emerald-300 animate-pulse shrink-0">
                ✓ រក្សាទុក
              </span>
            )}
          </div>
        </div>

        {/* Tier 2: Action Toolbar (Grouped, organized, responsive wrapping across all screen sizes) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left Group: Data Insertion & Excel Tools */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Primary Action: Add Student with Dedicated Form Modal */}
            <button
              type="button"
              onClick={() => {
                if (requireSpecificClass('បន្ថែមសិស្សថ្មី')) {
                  setIsAddModalOpen(true);
                }
              }}
              className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
              title="បើកផ្ទាំង Form ដើម្បីបញ្ចូលសិស្សថ្មី"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>បន្ថែមសិស្សថ្មី</span>
            </button>

            {/* Paste from Excel Button */}
            <button
              type="button"
              onClick={handleDirectClipboardPasteClick}
              className="inline-flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
              title="បិទភ្ជាប់ទិន្នន័យដែលបាន Copy ពី Excel / XLSM (Ctrl+V)"
            >
              <Clipboard className="w-3.5 h-3.5 mr-1" />
              <span>បិទភ្ជាប់ពី Excel</span>
            </button>

            {/* Excel Group */}
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
              <label
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-slate-700 hover:bg-white hover:text-emerald-700 transition-colors cursor-pointer"
                title="នាំចូលទិន្នន័យពី Excel"
              >
                <Upload className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                <span>នាំចូល</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .xlsm"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </label>

              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-slate-700 hover:bg-white hover:text-blue-700 transition-colors cursor-pointer"
                title="ទាញយកជា Excel .xlsm"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-blue-600" />
                <span>នាំចេញ</span>
              </button>

              <button
                type="button"
                onClick={downloadStudentTemplate}
                className="inline-flex items-center px-2 py-1 rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 transition-colors cursor-pointer"
                title="ទាញយកគំរូ Excel"
              >
                <span>គំរូ</span>
              </button>
            </div>

            {/* Undo / Redo Controls */}
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-slate-700 hover:bg-white hover:text-indigo-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-700 transition-colors cursor-pointer"
                title="ត្រឡប់ក្រោយ (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5 mr-0.5" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-slate-700 hover:bg-white hover:text-indigo-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-700 transition-colors cursor-pointer"
                title="ធ្វើឡើងវិញ (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5 mr-0.5" />
                <span>Redo</span>
              </button>
            </div>
          </div>

          {/* Right Group: Management & Utility Actions */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Deduplicate Students Button */}
            <button
              type="button"
              onClick={handleDeduplicateStudents}
              className={`inline-flex items-center px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shrink-0 ${
                duplicateInfo.hasDuplicates
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm animate-pulse'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
              }`}
              title="ស្វែងរក និងសម្អាតឈ្មោះសិស្សដែលស្ទួន/ជាន់គ្នាក្នុងថ្នាក់"
            >
              <Sparkles className={`w-3.5 h-3.5 mr-1 ${duplicateInfo.hasDuplicates ? 'text-white' : 'text-amber-600'}`} />
              <span>សម្អាតឈ្មោះជាន់គ្នា</span>
              {duplicateInfo.hasDuplicates && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-white text-amber-800 rounded-full text-[10px] font-black">
                  {toKhmerNum(duplicateInfo.duplicateStudentCount)}
                </span>
              )}
            </button>

            {/* Clear Auto STU- Codes Button */}
            {hasAutoStuCode && (
              <button
                type="button"
                onClick={handleClearAutoStudentCodes}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-bold rounded-xl border bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200 transition-all cursor-pointer shrink-0"
                title="សម្អាតអត្តលេខស្វ័យប្រវត្តិ (STU-...) ទាំងអស់ក្នុងថ្នាក់នេះឱ្យនៅទំនេរ"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-600" />
                <span>សម្អាតកូដ STU-</span>
              </button>
            )}

            {/* Direct Link to Continuous Assessment (30%) Grade Sheet */}
            <button
              type="button"
              onClick={() => onNavigateTab ? onNavigateTab('continuous-assessment') : null}
              className="inline-flex items-center px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors cursor-pointer shrink-0"
              title="បើកបញ្ជីពិន្ទុវត្តមាន (អវត្តមានម្តងដក ២ពិន្ទុ) + ១៥នាទី + ពិន្ទុ App (៣០%)"
            >
              <BookOpenCheck className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              <span>ពិន្ទុវត្តមាន (៣០%)</span>
            </button>

            {/* ID Cards */}
            <button
              type="button"
              onClick={() => setIsIDCardsOpen(true)}
              className="inline-flex items-center px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl border border-purple-200 transition-colors cursor-pointer shrink-0"
              title="បោះពុម្ពកាតសិស្សភ្ជាប់ QR"
            >
              <QrCode className="w-3.5 h-3.5 mr-1 text-purple-600" />
              <span>កាតសិស្ស</span>
            </button>

            {/* Print with Orientation Selector */}
            <PrintButton defaultOrientation="landscape" label="បោះពុម្ព" className="shrink-0" />

            {/* Delete All Students Button */}
            <button
              type="button"
              onClick={handleDeleteAllStudents}
              className="inline-flex items-center px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors cursor-pointer shrink-0"
              title="លុបសិស្សទាំងអស់ (អាចចុច Undo ដើម្បីយកមកវិញបាន)"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-600" />
              <span>លុបទាំងអស់</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search + Merged Interactive KPI & Gender Filter Group (បញ្ចូលគ្នាទាំងពីរ មិនជាន់គ្នា) */}
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

          {/* Unified Interactive KPI & Gender Filter Group (បញ្ចូលគ្នាទាំងពីរ មិនជាន់គ្នា) */}
          <div className="flex items-center space-x-1.5 w-full sm:w-auto justify-end">
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setGenderFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  genderFilter === 'all'
                    ? 'bg-white font-black text-slate-900 shadow-xs border border-slate-200/80 ring-1 ring-slate-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
                title="បង្ហាញសិស្សទាំងអស់"
              >
                <span>👥</span>
                <span>ទាំងអស់៖</span>
                <strong className="text-slate-900 font-black">
                  {classStudentsTotal}
                </strong>
              </button>

              <button
                type="button"
                onClick={() => setGenderFilter('ស្រី')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  genderFilter === 'ស្រី'
                    ? 'bg-pink-600 text-white font-black shadow-xs ring-1 ring-pink-700'
                    : 'text-pink-700 hover:text-pink-900 hover:bg-pink-50'
                }`}
                title="ត្រងយកតែសិស្សស្រី"
              >
                <span>👩</span>
                <span>ស្រី៖</span>
                <strong className={genderFilter === 'ស្រី' ? 'text-white' : 'text-pink-700 font-black'}>
                  {classStudentsFemale}
                </strong>
              </button>

              <button
                type="button"
                onClick={() => setGenderFilter('ប្រុស')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  genderFilter === 'ប្រុស'
                    ? 'bg-blue-600 text-white font-black shadow-xs ring-1 ring-blue-700'
                    : 'text-blue-700 hover:text-blue-900 hover:bg-blue-50'
                }`}
                title="ត្រងយកតែសិស្សប្រុស"
              >
                <span>👨</span>
                <span>ប្រុស៖</span>
                <strong className={genderFilter === 'ប្រុស' ? 'text-white' : 'text-blue-700 font-black'}>
                  {classStudentsMale}
                </strong>
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
          សិស្សសរុប៖ {totalFiltered} នាក់ | ស្រី៖ {femaleFiltered} នាក់ | ប្រុស៖ {maleFiltered} នាក់
        </p>
      </div>

      {/* Duplicate Warning Banner */}
      {duplicateInfo.hasDuplicates && (
        <div className="bg-amber-50 border-2 border-amber-400 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-950 no-print shadow-xs animate-fade-in">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-xs sm:text-sm text-amber-900">
                រកឃើញឈ្មោះសិស្សជាន់គ្នា/ស្ទួនចំនួន {toKhmerNum(duplicateInfo.duplicateStudentCount)} នាក់ ក្នុងថ្នាក់នេះ!
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                ឈ្មោះស្ទួនរួមមាន៖ <strong>{duplicateInfo.sampleNames}</strong>...។ ចុចប៊ូតុងខាងស្តាំដើម្បីសម្អាតស្វ័យប្រវត្តិតែ ១ ឃ្លីក (Merge ទិន្នន័យ និងលុបឈ្មោះស្ទួនចេញដោយសុវត្ថិភាព)។
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDeduplicateStudents}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all whitespace-nowrap flex items-center space-x-1.5 shrink-0"
          >
            <span>🧹 សម្អាតឈ្មោះស្ទួនភ្លាមៗ</span>
          </button>
        </div>
      )}

      {/* Misplaced Village Names Warning Banner & Recovery */}
      {corruptedAddressNamesList.length > 0 && (
        <div className="bg-sky-50 border-2 border-sky-400 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-sky-950 no-print shadow-xs animate-fade-in">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-bold text-xs sm:text-sm text-sky-900">
                បានរកឃើញឈ្មោះភូមិ/ឃុំ/ស្រុកដែលច្រឡំលោតចូលជួរ «គោត្តនាម នាម» ចំនួន {toKhmerNum(corruptedAddressNamesList.length)} នាក់ ({corruptedAddressNamesList.slice(0, 4).map((s) => s.nameKh).join(', ')}...)!
              </p>
              <p className="text-[11px] text-sky-800 mt-0.5">
                លោកគ្រូអ្នកគ្រូអាចចុច <strong>«ផ្លាស់ទីទៅជួរភូមិកំណើត»</strong> ឬចុច <strong>Undo</strong> ខាងលើដើម្បីយកឈ្មោះដើមមកវិញ។
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            {canUndo && (
              <button
                type="button"
                onClick={undo}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center space-x-1"
                title="ត្រឡប់ក្រោយមុនពេល Paste"
              >
                <span>↶ Undo</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleFixCorruptedAddressNames}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center space-x-1.5"
            >
              <span>🔄 ផ្លាស់ទីទៅជួរ «ភូមិកំណើត»</span>
            </button>
          </div>
        </div>
      )}

      {/* Excel/XLSM Interactive Editable Spreadsheet Grid - EXACT REPLICA OF IMAGE 2 */}
      <div className="bg-white rounded-2xl border-2 border-blue-900/40 shadow-lg overflow-hidden print:border-none print:shadow-none print:rounded-none print:overflow-visible">
        {/* Spreadsheet Header Bar */}
        <div className="bg-[#002060] text-white px-4 py-2 flex flex-wrap items-center justify-between text-xs font-bold no-print gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono">សន្លឹកទិន្នន័យ៖ បញ្ជីស្រង់ស្ថិតិ និងប្រវត្តិរូបសិស្ស.xlsm</span>
            {selectedCell ? (
              <span className="px-2 py-0.5 bg-blue-900/90 text-amber-300 rounded font-mono text-[11px] border border-blue-400/40 shadow-xs flex items-center space-x-1">
                <span>📍</span>
                <span>ក្រឡា៖ <strong>[{selectedCell.colName}]</strong> ជួរដេកទី {selectedCell.rowIdx + 1}</span>
              </span>
            ) : (
              <span className="text-[11px] text-blue-200 font-normal">
                (ចុចលើក្រឡាដើម្បី Select ដូច Excel)
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={handleDirectClipboardPasteClick}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer transition-colors font-bold flex items-center space-x-1.5 shadow-xs"
              title="បិទភ្ជាប់ទិន្នន័យដែលបាន Copy ពី Excel (Ctrl+V)"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>បិទភ្ជាប់ពី Excel (Ctrl+V)</span>
            </button>
            <span className="text-blue-300">|</span>
            <span className="text-blue-100 font-normal">⚡ រក្សាទុកស្វ័យប្រវត្តិ (Auto-Saved)</span>
          </div>
        </div>

        {/* Empty State Banner if no students */}
        {filteredStudents.length === 0 && (
          <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 no-print">
            <div className="flex items-center space-x-2">
              <span className="text-base">📋</span>
              <span>
                <strong>ក្រឡាទទេរៀបចំរួចរាល់ (Empty Grid Ready)៖</strong> លោកគ្រូអ្នកគ្រូអាចចុចវាយបញ្ចូលផ្ទាល់ក្នុងក្រឡាខាងក្រោម ឬចុច <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-2xs font-mono font-bold">Ctrl + V</kbd> ដើម្បីបិទភ្ជាប់ទិន្នន័យចម្លងពី Excel ចូលភ្លាមៗ!
              </span>
            </div>
            <button
              type="button"
              onClick={handleDirectClipboardPasteClick}
              className="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer shadow-2xs"
            >
              📋 បិទភ្ជាប់ពី Excel (Ctrl+V)
            </button>
          </div>
        )}

        <div
          ref={tableScrollRef}
          tabIndex={0}
          onPaste={handleTablePaste}
          onKeyDown={handleTableKeyDown}
          className="max-h-[70vh] print:max-h-none print:h-auto overflow-auto print:overflow-visible table-scrollbar relative print:border-none print:shadow-none focus:outline-none"
        >
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
              {/* 16. លេខទូរស័ព្ទផ្ទាល់ខ្លួន */}
              <col style={{ width: '4.5%' }} />
              {/* 17-19. ឪពុក (ឈ្មោះ, មុខរបរ, ទូរស័ព្ទ) */}
              <col style={{ width: '4.0%' }} />
              <col style={{ width: '3.0%' }} />
              <col style={{ width: '4.0%' }} />
              {/* 20-22. ម្តាយ (ឈ្មោះ, មុខរបរ, ទូរស័ព្ទ) */}
              <col style={{ width: '4.0%' }} />
              <col style={{ width: '3.0%' }} />
              <col style={{ width: '4.0%' }} />
              {/* 23. ផ្សេងៗ */}
              <col style={{ width: '3.5%' }} />
              {/* 24. សកម្មភាព (Screen only) */}
              <col className="no-print" />
            </colgroup>

            {/* Table Header: 2 Rows */}
            <thead className="sticky top-0 z-20 shadow-xs font-kantumruy print:static print:table-header-group">
              {/* Row 1 Header */}
              <tr className="bg-[#002060] text-white font-bold text-center border-b border-white/20 print:bg-slate-100 print:text-black text-xs sm:text-sm">
                <th rowSpan={2} className="py-3 px-2 border border-white/30 w-12 min-w-[48px] sticky left-0 z-30 bg-[#002060] print:static print:bg-slate-100 print:text-black">ល.រ</th>
                <th rowSpan={2} className="py-3 px-2.5 border border-white/30 min-w-[110px]">អត្តលេខ</th>
                <th rowSpan={2} className="py-3 px-3 border border-white/30 min-w-[160px]">គោត្តនាម នាម</th>
                <th rowSpan={2} className="py-3 px-2 border border-white/30 w-20 min-w-[70px]">ភេទ</th>
                <th rowSpan={2} className="py-3 px-2.5 border border-white/30 min-w-[135px]">ថ្ងៃខែឆ្នាំកំណើត</th>
                <th rowSpan={2} className="py-3 px-1.5 border border-white/30 w-14 min-w-[50px]">អាយុ</th>
                <th rowSpan={2} className="py-3 px-2.5 border border-white/30 min-w-[160px]">មកពីសាលា</th>
                <th colSpan={4} className="py-1.5 px-2 border border-white/30 bg-[#0f3b73] print:bg-slate-200">ទីកន្លែងកំណើត</th>
                <th colSpan={4} className="py-1.5 px-2 border border-white/30 bg-[#0f3b73] print:bg-slate-200">អាសយដ្ឋានបច្ចុប្បន្ន</th>
                <th rowSpan={2} className="py-3 px-2 border border-white/30 min-w-[120px]">លេខទូរស័ព្ទផ្ទាល់ខ្លួន</th>
                <th colSpan={3} className="py-1.5 px-2 border border-white/30 bg-[#0f3b73] print:bg-slate-200">គោត្តនាម នាម (ឪពុក)</th>
                <th colSpan={3} className="py-1.5 px-2 border border-white/30 bg-[#0f3b73] print:bg-slate-200">គោត្តនាម នាម (ម្តាយ)</th>
                <th rowSpan={2} className="py-3 px-2 border border-white/30 min-w-[120px]">ផ្សេងៗ</th>
                <th rowSpan={2} className="py-3 px-2 border border-white/30 w-32 min-w-[130px] no-print bg-[#001730]">សកម្មភាព</th>
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
                selectedClassId === 'ALL' ? (
                  <tr className="bg-amber-50/90 border-b border-amber-300 no-print">
                    <td colSpan={24} className="py-8 px-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-lg mx-auto text-amber-950 font-bold">
                        <AlertTriangle className="w-8 h-8 text-amber-600" />
                        <h4 className="text-base font-black">លោកគ្រូ-អ្នកគ្រូកំពុងស្ថិតក្នុងផ្ទាំង «ថ្នាក់ទាំងអស់»</h4>
                        <p className="text-xs text-amber-850 font-medium">
                          ផ្ទាំងនេះសម្រាប់តែពិនិត្យទិន្នន័យសរុប។ ដើម្បីចម្លង (Paste) នាំចូលពី Excel ឬបន្ថែមសិស្សថ្មី សូមចុចជ្រើសរើសថ្នាក់រៀនជាក់លាក់៖
                        </p>
                        <div className="flex flex-wrap items-center gap-2 justify-center pt-2">
                          {classes.map((cls) => (
                            <button
                              key={cls.id}
                              type="button"
                              onClick={() => onSelectClass && onSelectClass(cls.id)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-xs transition-all cursor-pointer text-xs flex items-center space-x-1"
                            >
                              <span>👉 ចូលថ្នាក់ {cls.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  Array.from({ length: emptyRowCount }).map((_, idx) => renderEmptyRow(idx))
                )
              ) : (
                <>
                  {filteredStudents.map((stu, index) => {
                    const age = stu.age || calculateAge(stu.dob);
                    const isRowSelected = selectedRowIdx === index;
                    const isCellSelected = (key: string) =>
                      selectedCell?.rowIdx === index && selectedCell?.colKey === key;
                    const cellRing = (key: string) =>
                      isCellSelected(key) ? 'ring-2 ring-blue-600 bg-blue-50/80 font-bold z-10' : '';

                    return (
                      <tr
                        key={stu.id}
                        className={`transition-colors group border-b border-slate-200 print:break-inside-avoid ${
                          isRowSelected ? 'bg-blue-50/50' : 'hover:bg-blue-50/40'
                        }`}
                      >
                        {/* ល.រ (រត់តាមលំដាប់លំដោយ 1, 2, 3... Sticky on horizontal scroll) */}
                        <td
                          onClick={() => {
                            setSelectedRowIdx(index);
                            setSelectedCell(null);
                          }}
                          className="py-1 px-1 text-center font-bold text-slate-700 bg-slate-50/95 border-r border-slate-300 select-none sticky left-0 z-10 shadow-xs cursor-pointer hover:bg-slate-200/80 transition-colors print:static print:bg-transparent"
                          title={`ជួរដេកទី ${index + 1} (ចុចដើម្បីជ្រើសជួរដេកទាំងមូល)`}
                        >
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-200/90 text-slate-800 text-xs sm:text-[13px] font-black font-mono print:hidden">
                            {index + 1}
                          </span>
                          <span className="hidden print:inline-block font-mono font-bold text-[5.8pt]">
                            {index + 1}
                          </span>
                        </td>

                        {/* អត្តលេខ */}
                        <td className="py-1 px-1 border-r border-slate-200">
                          <input
                            type="text"
                            value={fromKhmerNum(stu.studentCode)}
                            title={fromKhmerNum(stu.studentCode)}
                            placeholder=""
                            data-cell={`${index}-studentCode`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'studentCode', colName: 'អត្តលេខ' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'studentCode')}
                            onChange={(e) => handleInlineChange(stu.id, 'studentCode', fromKhmerNum(e.target.value))}
                            className={`w-full font-mono text-xs sm:text-[12.5px] font-bold text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('studentCode')}`}
                          />
                          <span className="hidden print:block font-mono font-bold truncate text-[5.5pt]">
                            {fromKhmerNum(stu.studentCode)}
                          </span>
                        </td>

                        {/* គោត្តនាម នាម */}
                        <td className="py-1 px-1 border-r border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={stu.nameKh}
                              title={stu.nameKh}
                              placeholder="ឈ្មោះសិស្ស..."
                              data-cell={`${index}-nameKh`}
                              onFocus={() => {
                                setSelectedCell({ rowIdx: index, colKey: 'nameKh', colName: 'គោត្តនាម នាម' });
                                setSelectedRowIdx(index);
                              }}
                              onKeyDown={(e) => handleCellKeyDown(e, index, 'nameKh')}
                              onChange={(e) => handleInlineChange(stu.id, 'nameKh', e.target.value)}
                              className={`flex-1 font-bold text-xs sm:text-[13px] text-slate-900 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('nameKh')}`}
                            />
                            {duplicateInfo.duplicateNames.has((stu.nameKh || '').trim().toLowerCase()) && (
                              <span
                                className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 print:hidden select-none animate-pulse"
                                title="ឈ្មោះនេះមានជាន់គ្នាក្នុងថ្នាក់ (ចុចប៊ូតុងសម្អាតឈ្មោះជាន់គ្នាខាងលើ)"
                              >
                                ⚠️ ឈ្មោះស្ទួន
                              </span>
                            )}
                            {selectedClassId === 'ALL' && (
                              <span
                                className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 print:hidden select-none"
                                title={`ថ្នាក់៖ ${classes.find((c) => c.id === stu.classId)?.name || 'មិនទាន់កំណត់'}`}
                              >
                                {classes.find((c) => c.id === stu.classId)?.name?.replace('ថ្នាក់ទី ', '') || '-'}
                              </span>
                            )}
                          </div>
                          <span className="hidden print:block font-bold truncate text-slate-900 text-[6pt]">
                            {stu.nameKh}
                          </span>
                        </td>

                        {/* ភេទ */}
                        <td className="py-1 px-1 text-center border-r border-slate-200">
                          <select
                            value={stu.gender}
                            data-cell={`${index}-gender`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'gender', colName: 'ភេទ' });
                              setSelectedRowIdx(index);
                            }}
                            onChange={(e) => handleInlineChange(stu.id, 'gender', e.target.value as Gender)}
                            className={`w-full text-xs sm:text-[12px] font-bold rounded px-1.5 py-1 cursor-pointer border-0 print:hidden text-center transition-all ${
                              stu.gender === 'ស្រី'
                                ? 'bg-pink-100 text-pink-700 hover:bg-pink-200/80'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200/80'
                            } ${cellRing('gender')}`}
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
                              data-cell={`${index}-dob`}
                              onFocus={() => {
                                setSelectedCell({ rowIdx: index, colKey: 'dob', colName: 'ថ្ងៃខែឆ្នាំកំណើត' });
                                setSelectedRowIdx(index);
                              }}
                              onKeyDown={(e) => handleCellKeyDown(e, index, 'dob')}
                              onChange={(e) => {
                                const val = e.target.value;
                                const iso = parseDMYToISO(val);
                                handleInlineChange(stu.id, 'dob', iso || val);
                              }}
                              className={`w-full text-xs sm:text-[12.5px] font-mono text-center text-slate-800 bg-transparent px-1 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('dob')}`}
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
                          <span className="print:hidden font-mono font-bold">{age}</span>
                          <span className="hidden print:block text-center font-mono font-bold text-[5.5pt]">
                            {age}
                          </span>
                        </td>

                        {/* មកពីសាលា */}
                        <td className="py-1 px-1 border-r border-slate-200">
                          <input
                            type="text"
                            value={stu.originSchool || ''}
                            title={stu.originSchool || ''}
                            placeholder="សាលាចាស់..."
                            data-cell={`${index}-originSchool`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'originSchool', colName: 'មកពីសាលា' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'originSchool')}
                            onChange={(e) => handleInlineChange(stu.id, 'originSchool', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('originSchool')}`}
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
                            data-cell={`${index}-pobVillage`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'pobVillage', colName: 'ទីកន្លែងកំណើត (ភូមិ)' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'pobVillage')}
                            onChange={(e) => handleInlineChange(stu.id, 'pobVillage', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('pobVillage')}`}
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
                            data-cell={`${index}-pobCommune`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'pobCommune', colName: 'ទីកន្លែងកំណើត (ឃុំ/សង្កាត់)' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'pobCommune')}
                            onChange={(e) => handleInlineChange(stu.id, 'pobCommune', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('pobCommune')}`}
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
                            data-cell={`${index}-pobDistrict`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'pobDistrict', colName: 'ទីកន្លែងកំណើត (ស្រុក/ខណ្ឌ)' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'pobDistrict')}
                            onChange={(e) => handleInlineChange(stu.id, 'pobDistrict', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('pobDistrict')}`}
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
                            data-cell={`${index}-pobProvince`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'pobProvince', colName: 'ទីកន្លែងកំណើត (ខេត្ត/រាជធានី)' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'pobProvince')}
                            onChange={(e) => handleInlineChange(stu.id, 'pobProvince', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('pobProvince')}`}
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
                            data-cell={`${index}-addrVillage`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'addrVillage', colName: 'អាសយដ្ឋានបច្ចុប្បន្ន (ភូមិ)' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'addrVillage')}
                            onChange={(e) => handleInlineChange(stu.id, 'addrVillage', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('addrVillage')}`}
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
                            data-cell={`${index}-addrCommune`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'addrCommune', colName: 'អាសយដ្ឋានបច្ចុប្បន្ន (ឃុំ)' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'addrCommune')}
                            onChange={(e) => handleInlineChange(stu.id, 'addrCommune', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('addrCommune')}`}
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
                            data-cell={`${index}-addrDistrict`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'addrDistrict', colName: 'អាសយដ្ឋានបច្ចុប្បន្ន (ស្រុក)' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'addrDistrict')}
                            onChange={(e) => handleInlineChange(stu.id, 'addrDistrict', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('addrDistrict')}`}
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
                            data-cell={`${index}-addrProvince`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'addrProvince', colName: 'អាសយដ្ឋានបច្ចុប្បន្ន (ខេត្ត)' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'addrProvince')}
                            onChange={(e) => handleInlineChange(stu.id, 'addrProvince', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('addrProvince')}`}
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
                            data-cell={`${index}-studentPhone`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'studentPhone', colName: 'លេខទូរស័ព្ទផ្ទាល់ខ្លួន' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'studentPhone')}
                            onChange={(e) => handleInlineChange(stu.id, 'studentPhone', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] font-mono font-bold text-blue-700 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('studentPhone')}`}
                          />
                          <span className="hidden print:block font-mono text-center text-[5.2pt] truncate">
                            {stu.studentPhone || ''}
                          </span>
                        </td>

                        {/* ឪពុក - ឈ្មោះ */}
                        <td className="py-1 px-1 border-r border-slate-200">
                          <input
                            type="text"
                            value={stu.fatherName || stu.guardianName || ''}
                            title={stu.fatherName || stu.guardianName || ''}
                            placeholder="ឈ្មោះឪពុក..."
                            data-cell={`${index}-fatherName`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'fatherName', colName: 'ឪពុក (ឈ្មោះ)' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'fatherName')}
                            onChange={(e) => handleInlineChange(stu.id, 'fatherName', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] font-semibold text-slate-850 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('fatherName')}`}
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
                            data-cell={`${index}-fatherOccupation`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'fatherOccupation', colName: 'ឪពុក (មុខរបរ)' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'fatherOccupation')}
                            onChange={(e) => handleInlineChange(stu.id, 'fatherOccupation', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('fatherOccupation')}`}
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
                            data-cell={`${index}-fatherPhone`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'fatherPhone', colName: 'ឪពុក (ទូរស័ព្ទ)' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'fatherPhone')}
                            onChange={(e) => handleInlineChange(stu.id, 'fatherPhone', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] font-mono text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('fatherPhone')}`}
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
                            data-cell={`${index}-motherName`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'motherName', colName: 'ម្តាយ (ឈ្មោះ)' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'motherName')}
                            onChange={(e) => handleInlineChange(stu.id, 'motherName', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] font-semibold text-slate-850 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('motherName')}`}
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
                            data-cell={`${index}-motherOccupation`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'motherOccupation', colName: 'ម្តាយ (មុខរបរ)' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'motherOccupation')}
                            onChange={(e) => handleInlineChange(stu.id, 'motherOccupation', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('motherOccupation')}`}
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
                            data-cell={`${index}-motherPhone`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'motherPhone', colName: 'ម្តាយ (ទូរស័ព្ទ)' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'motherPhone')}
                            onChange={(e) => handleInlineChange(stu.id, 'motherPhone', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] font-mono text-slate-800 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('motherPhone')}`}
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
                            data-cell={`${index}-otherNotes`}
                            onFocus={() => {
                              setSelectedCell({ rowIdx: index, colKey: 'otherNotes', colName: 'ផ្សេងៗ' });
                              setSelectedRowIdx(index);
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'otherNotes')}
                            onChange={(e) => handleInlineChange(stu.id, 'otherNotes', e.target.value)}
                            className={`w-full text-xs sm:text-[12.5px] text-slate-700 bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all print:hidden outline-none ${cellRing('otherNotes')}`}
                          />
                          <span className="hidden print:block truncate text-[5.2pt]">
                            {stu.otherNotes || stu.notes || ''}
                          </span>
                        </td>

                        {/* សកម្មភាព (Sticky right on horizontal scroll) */}
                        <td className="py-1 px-1 text-center no-print bg-slate-50/95 sticky right-0 z-10 border-l border-slate-200 shadow-xs print:hidden">
                          <div className="flex items-center justify-center space-x-1">
                            {/* កែទិន្នន័យសិស្ស */}
                            <button
                              onClick={() => setEditingStudent(stu)}
                              className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                              title="កែទិន្នន័យសិស្ស (Edit)"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

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
                  })}
                  {/* Append 3 interactive empty rows at the bottom for quick addition (Screen only, hidden on print) */}
                  {selectedClassId !== 'ALL' ? (
                    Array.from({ length: 3 }).map((_, idx) =>
                      renderEmptyRow(filteredStudents.length + idx, true)
                    )
                  ) : (
                    <tr className="bg-amber-50/90 border-t-2 border-amber-300 no-print">
                      <td colSpan={24} className="py-3 px-4 text-center">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs sm:text-sm text-amber-900 font-bold">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                            <span>លោកគ្រូ-អ្នកគ្រូកំពុងស្ថិតក្នុងផ្ទាំង «ថ្នាក់ទាំងអស់» (សម្រាប់មើលទិន្នន័យសរុប)។ ដើម្បីចម្លង (Paste) ឬបន្ថែមសិស្ស សូមជ្រើសរើសថ្នាក់ជាក់លាក់៖</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 justify-center">
                            {classes.map((cls) => (
                              <button
                                key={cls.id}
                                type="button"
                                onClick={() => onSelectClass && onSelectClass(cls.id)}
                                className="px-3 py-1 bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 font-black rounded-lg border border-emerald-300 shadow-xs transition-all cursor-pointer text-xs flex items-center space-x-1"
                              >
                                <span>👉</span>
                                <span>ថ្នាក់ {cls.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
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

            {/* Quick Add 5 Empty Rows */}
            <button
              type="button"
              onClick={() => {
                setEmptyRowCount((prev) => prev + 5);
                showToast('➕ បានបន្ថែម ៥ ជួរដេកទទេសម្រាប់វាយបញ្ចូល');
              }}
              className="inline-flex items-center px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg font-bold text-emerald-800 shadow-2xs transition-colors cursor-pointer text-xs"
              title="បន្ថែម ៥ ជួរដេកទទេបន្ថែមទៀត"
            >
              <Plus className="w-3.5 h-3.5 mr-0.5" />
              + ៥ ជួរទទេ
            </button>

            {/* Quick Open Paste Modal */}
            <button
              type="button"
              onClick={handleDirectClipboardPasteClick}
              className="inline-flex items-center px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-lg font-bold text-indigo-800 shadow-2xs transition-colors cursor-pointer text-xs"
              title="បិទភ្ជាប់ទិន្នន័យពី Excel (Ctrl+V)"
            >
              <Clipboard className="w-3.5 h-3.5 mr-0.5" />
              បិទភ្ជាប់ Excel
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
            <span>ចំនួនសិស្សក្នុងតារាង៖ <strong className="text-slate-800">{filteredStudents.length}</strong> នាក់</span>
            <span>|</span>
            <span>សិស្សស្រី៖ <strong className="text-pink-600">{femaleFiltered}</strong> នាក់</span>
            <span>|</span>
            <span>សិស្សប្រុស៖ <strong className="text-blue-600">{maleFiltered}</strong> នាក់</span>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            បន្ថែមសិស្សថ្មី
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
                    {fromKhmerNum(viewingStudent.studentCode)}
                  </span>
                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-md px-2 py-0.5">
                    <span className="text-[11px] font-bold text-blue-900">ថ្នាក់៖</span>
                    <select
                      value={viewingStudent.classId}
                      onChange={async (e) => {
                        const newClassId = e.target.value;
                        await db.students.update(viewingStudent.id, { classId: newClassId });
                        setViewingStudent({ ...viewingStudent, classId: newClassId });
                        onRefresh();
                        const targetClass = classes.find((c) => c.id === newClassId);
                        showToast(`បានកំណត់ ${viewingStudent.nameKh} ទៅកាន់ ${targetClass?.name || 'ថ្នាក់ថ្មី'} ដោយជោគជ័យ!`);
                      }}
                      className="bg-transparent text-xs font-black text-blue-900 cursor-pointer outline-none font-sans"
                      title="ជ្រើសរើសដើម្បីប្តូរថ្នាក់សិស្ស (ឧ. 7A, 7B, 7C...)"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.stream && c.stream !== 'general' ? `(${c.stream === 'science' ? 'វិទ្យាសាស្ត្រ' : 'សង្គម'})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded-md font-bold">
                    លេខរៀង៖ {viewingStudent.rollNo}
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
                <span className="font-bold text-slate-800">{viewingStudent.age || calculateAge(viewingStudent.dob)} ឆ្នាំ</span>
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingStudent;
                    setViewingStudent(null);
                    setEditingStudent(target);
                  }}
                  className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-xl border border-amber-200 transition-colors cursor-pointer flex items-center space-x-1"
                  title="កែប្រែព័ត៌មានសិស្សនេះ"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1 inline-block" />
                  <span>កែប្រែទិន្នន័យ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDirectDuplicate(viewingStudent)}
                  className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5 mr-1 inline-block" />
                  <span>ចម្លងសិស្សនេះ</span>
                </button>
              </div>

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

      {/* Dedicated Add / Edit Student Form Modal (តាមក្បាលតារាង & ភូមិសាស្ត្ររដ្ឋបាលកម្ពុជា) */}
      <AddStudentModal
        isOpen={isAddModalOpen || !!editingStudent}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingStudent(null);
        }}
        classes={classes}
        defaultClassId={editingStudent ? editingStudent.classId : activeClassId}
        studentToEdit={editingStudent}
        onSave={async (savedStudent) => {
          if (editingStudent) {
            await pushSnapshot(`កែប្រែព័ត៌មានសិស្ស "${savedStudent.nameKh}"`);
            await db.students.update(savedStudent.id, savedStudent);
            setLastSavedId(savedStudent.id);
            setEditingStudent(null);
            onRefresh();
            showToast(`✨ បានកែប្រែព័ត៌មានសិស្ស "${savedStudent.nameKh}" ដោយជោគជ័យ!`);
          } else {
            await handleSaveNewStudent(savedStudent);
          }
        }}
        nextRollNo={1}
      />

      {/* Excel Direct Paste Modal */}
      <StudentPasteModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        classId={activeClassId}
        className={currentClassName}
        startRollNo={filteredStudents.length + 1}
        onSuccess={(count) => {
          onRefresh();
          showToast(`📋 បានបញ្ចូលសិស្សចំនួន ${count} នាក់ពី Excel ដោយជោគជ័យ!`);
        }}
      />

      {/* Centered Select Class Required Modal Dialog (លោតចំកណ្តាលអេក្រង់) */}
      <Modal
        isOpen={isSelectClassPromptOpen}
        onClose={() => setIsSelectClassPromptOpen(false)}
        title="⚠️ សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន"
        subtitle={`ដើម្បី${pendingActionName} លោកគ្រូ-អ្នកគ្រូត្រូវជ្រើសរើសថ្នាក់រៀនជាក់លាក់ (មិនអាចចម្លង ឬបន្ថែមចូល «ថ្នាក់ទាំងអស់» បានឡើយ)`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">មិនអាចបញ្ចូលទិន្នន័យចូល «ថ្នាក់ទាំងអស់» បានទេ!</p>
              <p className="text-amber-800 text-[11.5px] leading-relaxed">
                ផ្ទាំង «ថ្នាក់ទាំងអស់» គឺសម្រាប់តែមើលទិន្នន័យរួម និងបោះពុម្ពប៉ុណ្ណោះ។ ដើម្បីធានាភាពត្រឹមត្រូវនៃបញ្ជីឈ្មោះសិស្ស សូមជ្រើសរើសថ្នាក់ដែលត្រូវបញ្ចូល៖
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              ចុចជ្រើសរើសថ្នាក់រៀនដែលត្រូវ{pendingActionName}៖
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => {
                    setIsSelectClassPromptOpen(false);
                    if (onSelectClass) {
                      onSelectClass(cls.id);
                    }
                    showToast(`✨ បានជ្រើសរើស «ថ្នាក់ ${cls.name}» រួចរាល់! លោកគ្រូអាច ${pendingActionName} បានហើយ។`);
                  }}
                  className="p-3 rounded-xl border-2 border-emerald-200 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-600 hover:text-white text-emerald-900 font-black text-sm flex flex-col items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 group"
                >
                  <span className="text-base group-hover:scale-110 transition-transform">📚</span>
                  <span className="mt-1">ថ្នាក់ {cls.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSelectClassPromptOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              បិទផ្ទាំង
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
