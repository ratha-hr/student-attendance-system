import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../db/db';
import type {
  Student,
  AttendanceRecord,
  TimetableSlot,
  ClassRoom,
  StudentGrade,
  LessonExtract,
  OfficialLetter,
  YearlyPlanItem,
  TeacherSettings,
} from '../types';

interface DBSnapshot {
  description: string;
  students: Student[];
  attendance: AttendanceRecord[];
  timetable: TimetableSlot[];
  classes: ClassRoom[];
  grades: StudentGrade[];
  extracts: LessonExtract[];
  letters: OfficialLetter[];
  yearlyPlans: YearlyPlanItem[];
  settings: (TeacherSettings & { id: string })[];
  timestamp: number;
}

interface UndoRedoContextType {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  pushSnapshot: (description?: string) => Promise<void>;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const UndoRedoContext = createContext<UndoRedoContextType | undefined>(undefined);

const restoreTable = async (table: { clear: () => Promise<void>; bulkAdd: (items: any[]) => Promise<any> }, data?: any[]) => {
  await table.clear();
  if (data && data.length > 0) {
    await table.bulkAdd(data);
  }
};

export const UndoRedoProvider: React.FC<{
  children: React.ReactNode;
  onRefresh: () => void;
}> = ({ children, onRefresh }) => {
  const [undoStack, setUndoStack] = useState<DBSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<DBSnapshot[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Capture current state snapshot across all database tables before performing modifications
  const pushSnapshot = useCallback(async (description = 'ការផ្លាស់ប្តូរទិន្នន័យ') => {
    try {
      const [
        students,
        attendance,
        timetable,
        classes,
        grades,
        extracts,
        letters,
        yearlyPlans,
        settings,
      ] = await Promise.all([
        db.students.toArray(),
        db.attendance.toArray(),
        db.timetable.toArray(),
        db.classes.toArray(),
        db.grades.toArray(),
        db.extracts.toArray(),
        db.letters.toArray(),
        db.yearlyPlans.toArray(),
        db.settings.toArray(),
      ]);

      const snapshot: DBSnapshot = {
        description,
        students: JSON.parse(JSON.stringify(students)),
        attendance: JSON.parse(JSON.stringify(attendance)),
        timetable: JSON.parse(JSON.stringify(timetable)),
        classes: JSON.parse(JSON.stringify(classes)),
        grades: JSON.parse(JSON.stringify(grades)),
        extracts: JSON.parse(JSON.stringify(extracts)),
        letters: JSON.parse(JSON.stringify(letters)),
        yearlyPlans: JSON.parse(JSON.stringify(yearlyPlans)),
        settings: JSON.parse(JSON.stringify(settings)),
        timestamp: Date.now(),
      };

      setUndoStack((prev) => [...prev.slice(-50), snapshot]);
      setRedoStack([]); // Clear redo stack on new action
    } catch (err) {
      console.error('Failed to capture snapshot for undo:', err);
    }
  }, []);

  // Undo Handler
  const undo = useCallback(async () => {
    if (undoStack.length === 0) return;

    try {
      // Capture current state to push to redo
      const [
        currentStudents,
        currentAttendance,
        currentTimetable,
        currentClasses,
        currentGrades,
        currentExtracts,
        currentLetters,
        currentYearlyPlans,
        currentSettings,
      ] = await Promise.all([
        db.students.toArray(),
        db.attendance.toArray(),
        db.timetable.toArray(),
        db.classes.toArray(),
        db.grades.toArray(),
        db.extracts.toArray(),
        db.letters.toArray(),
        db.yearlyPlans.toArray(),
        db.settings.toArray(),
      ]);

      const currentSnapshot: DBSnapshot = {
        description: 'មុនពេល Undo',
        students: JSON.parse(JSON.stringify(currentStudents)),
        attendance: JSON.parse(JSON.stringify(currentAttendance)),
        timetable: JSON.parse(JSON.stringify(currentTimetable)),
        classes: JSON.parse(JSON.stringify(currentClasses)),
        grades: JSON.parse(JSON.stringify(currentGrades)),
        extracts: JSON.parse(JSON.stringify(currentExtracts)),
        letters: JSON.parse(JSON.stringify(currentLetters)),
        yearlyPlans: JSON.parse(JSON.stringify(currentYearlyPlans)),
        settings: JSON.parse(JSON.stringify(currentSettings)),
        timestamp: Date.now(),
      };

      const previous = undoStack[undoStack.length - 1];
      const newUndo = undoStack.slice(0, undoStack.length - 1);

      setRedoStack((prev) => [...prev.slice(-50), currentSnapshot]);
      setUndoStack(newUndo);

      // Restore snapshot tables
      await Promise.all([
        restoreTable(db.students, previous.students),
        restoreTable(db.attendance, previous.attendance),
        restoreTable(db.timetable, previous.timetable),
        restoreTable(db.classes, previous.classes),
        restoreTable(db.grades, previous.grades),
        restoreTable(db.extracts, previous.extracts),
        restoreTable(db.letters, previous.letters),
        restoreTable(db.yearlyPlans, previous.yearlyPlans),
        restoreTable(db.settings, previous.settings),
      ]);

      onRefresh();
      showToast(`↶ ត្រឡប់ក្រោយ (Undo)៖ ${previous.description}`);
    } catch (err) {
      console.error('Failed to perform undo:', err);
      showToast('❌ មានបញ្ហាក្នុងការត្រឡប់ក្រោយ (Undo)');
    }
  }, [undoStack, onRefresh, showToast]);

  // Redo Handler
  const redo = useCallback(async () => {
    if (redoStack.length === 0) return;

    try {
      // Capture current state to push to undo
      const [
        currentStudents,
        currentAttendance,
        currentTimetable,
        currentClasses,
        currentGrades,
        currentExtracts,
        currentLetters,
        currentYearlyPlans,
        currentSettings,
      ] = await Promise.all([
        db.students.toArray(),
        db.attendance.toArray(),
        db.timetable.toArray(),
        db.classes.toArray(),
        db.grades.toArray(),
        db.extracts.toArray(),
        db.letters.toArray(),
        db.yearlyPlans.toArray(),
        db.settings.toArray(),
      ]);

      const currentSnapshot: DBSnapshot = {
        description: 'មុនពេល Redo',
        students: JSON.parse(JSON.stringify(currentStudents)),
        attendance: JSON.parse(JSON.stringify(currentAttendance)),
        timetable: JSON.parse(JSON.stringify(currentTimetable)),
        classes: JSON.parse(JSON.stringify(currentClasses)),
        grades: JSON.parse(JSON.stringify(currentGrades)),
        extracts: JSON.parse(JSON.stringify(currentExtracts)),
        letters: JSON.parse(JSON.stringify(currentLetters)),
        yearlyPlans: JSON.parse(JSON.stringify(currentYearlyPlans)),
        settings: JSON.parse(JSON.stringify(currentSettings)),
        timestamp: Date.now(),
      };

      const next = redoStack[redoStack.length - 1];
      const newRedo = redoStack.slice(0, redoStack.length - 1);

      setUndoStack((prev) => [...prev.slice(-50), currentSnapshot]);
      setRedoStack(newRedo);

      // Restore snapshot tables
      await Promise.all([
        restoreTable(db.students, next.students),
        restoreTable(db.attendance, next.attendance),
        restoreTable(db.timetable, next.timetable),
        restoreTable(db.classes, next.classes),
        restoreTable(db.grades, next.grades),
        restoreTable(db.extracts, next.extracts),
        restoreTable(db.letters, next.letters),
        restoreTable(db.yearlyPlans, next.yearlyPlans),
        restoreTable(db.settings, next.settings),
      ]);

      onRefresh();
      showToast(`↷ ធ្វើឡើងវិញ (Redo)៖ ${next.description}`);
    } catch (err) {
      console.error('Failed to perform redo:', err);
      showToast('❌ មានបញ្ហាក្នុងការធ្វើឡើងវិញ (Redo)');
    }
  }, [redoStack, onRefresh, showToast]);

  // Keyboard shortcut Ctrl+Z / Ctrl+Y across the entire app
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isTextarea = tag === 'textarea';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          (e.target as HTMLElement)?.blur?.();
          redo();
        } else {
          // If in textarea, allow default textarea undo. Anywhere else (including table inputs/cells), trigger app Undo!
          if (!isTextarea) {
            e.preventDefault();
            (e.target as HTMLElement)?.blur?.();
            undo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (!isTextarea) {
          e.preventDefault();
          (e.target as HTMLElement)?.blur?.();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <UndoRedoContext.Provider
      value={{
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        undo,
        redo,
        pushSnapshot,
        toastMessage,
        showToast,
      }}
    >
      {children}

      {/* Centered Global Toast Notification (លោតចំកណ្តាលអេក្រង់) */}
      {toastMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none no-print">
          <div className="bg-slate-900/95 text-white px-6 py-4 rounded-2xl shadow-2xl border-2 border-slate-600/80 flex items-center space-x-3 text-sm sm:text-base font-bold backdrop-blur-md animate-scale-up pointer-events-auto max-w-md text-center">
            <span className="text-xl shrink-0">✨</span>
            <span className="leading-snug">{toastMessage}</span>
          </div>
        </div>
      )}
    </UndoRedoContext.Provider>
  );
};

export const useUndoRedo = () => {
  const context = useContext(UndoRedoContext);
  if (!context) {
    throw new Error('useUndoRedo must be used within an UndoRedoProvider');
  }
  return context;
};
