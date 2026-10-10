import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../db/db';
import type { Student, AttendanceRecord, TimetableSlot, ClassRoom, StudentGrade } from '../types';

interface DBSnapshot {
  description: string;
  students: Student[];
  attendance: AttendanceRecord[];
  timetable: TimetableSlot[];
  classes: ClassRoom[];
  grades: StudentGrade[];
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

  // Capture current state snapshot before performing modifications
  const pushSnapshot = useCallback(async (description = 'ការផ្លាស់ប្តូរទិន្នន័យ') => {
    try {
      const [students, attendance, timetable, classes, grades] = await Promise.all([
        db.students.toArray(),
        db.attendance.toArray(),
        db.timetable.toArray(),
        db.classes.toArray(),
        db.grades.toArray(),
      ]);

      const snapshot: DBSnapshot = {
        description,
        students: JSON.parse(JSON.stringify(students)),
        attendance: JSON.parse(JSON.stringify(attendance)),
        timetable: JSON.parse(JSON.stringify(timetable)),
        classes: JSON.parse(JSON.stringify(classes)),
        grades: JSON.parse(JSON.stringify(grades)),
        timestamp: Date.now(),
      };

      setUndoStack((prev) => [...prev.slice(-25), snapshot]);
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
      const [currentStudents, currentAttendance, currentTimetable, currentClasses, currentGrades] = await Promise.all([
        db.students.toArray(),
        db.attendance.toArray(),
        db.timetable.toArray(),
        db.classes.toArray(),
        db.grades.toArray(),
      ]);

      const currentSnapshot: DBSnapshot = {
        description: 'មុនពេល Undo',
        students: JSON.parse(JSON.stringify(currentStudents)),
        attendance: JSON.parse(JSON.stringify(currentAttendance)),
        timetable: JSON.parse(JSON.stringify(currentTimetable)),
        classes: JSON.parse(JSON.stringify(currentClasses)),
        grades: JSON.parse(JSON.stringify(currentGrades)),
        timestamp: Date.now(),
      };

      const previous = undoStack[undoStack.length - 1];
      const newUndo = undoStack.slice(0, undoStack.length - 1);

      setRedoStack((prev) => [...prev.slice(-25), currentSnapshot]);
      setUndoStack(newUndo);

      // Restore snapshot tables
      await Promise.all([
        db.students.clear().then(() => db.students.bulkAdd(previous.students)),
        db.attendance.clear().then(() => db.attendance.bulkAdd(previous.attendance)),
        db.timetable.clear().then(() => db.timetable.bulkAdd(previous.timetable)),
        db.classes.clear().then(() => db.classes.bulkAdd(previous.classes)),
        db.grades.clear().then(() => db.grades.bulkAdd(previous.grades)),
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
      const [currentStudents, currentAttendance, currentTimetable, currentClasses, currentGrades] = await Promise.all([
        db.students.toArray(),
        db.attendance.toArray(),
        db.timetable.toArray(),
        db.classes.toArray(),
        db.grades.toArray(),
      ]);

      const currentSnapshot: DBSnapshot = {
        description: 'មុនពេល Redo',
        students: JSON.parse(JSON.stringify(currentStudents)),
        attendance: JSON.parse(JSON.stringify(currentAttendance)),
        timetable: JSON.parse(JSON.stringify(currentTimetable)),
        classes: JSON.parse(JSON.stringify(currentClasses)),
        grades: JSON.parse(JSON.stringify(currentGrades)),
        timestamp: Date.now(),
      };

      const next = redoStack[redoStack.length - 1];
      const newRedo = redoStack.slice(0, redoStack.length - 1);

      setUndoStack((prev) => [...prev.slice(-25), currentSnapshot]);
      setRedoStack(newRedo);

      // Restore snapshot tables
      await Promise.all([
        db.students.clear().then(() => db.students.bulkAdd(next.students)),
        db.attendance.clear().then(() => db.attendance.bulkAdd(next.attendance)),
        db.timetable.clear().then(() => db.timetable.bulkAdd(next.timetable)),
        db.classes.clear().then(() => db.classes.bulkAdd(next.classes)),
        db.grades.clear().then(() => db.grades.bulkAdd(next.grades)),
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
      // Skip if focused inside input or textarea unless Ctrl+Z is intended
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else if (!isInput) {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !isInput) {
        e.preventDefault();
        redo();
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

      {/* Floating Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center space-x-2 text-xs sm:text-sm font-bold backdrop-blur-md animate-fade-in no-print">
          <span>{toastMessage}</span>
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
