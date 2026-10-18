import React, { useState, useMemo, useEffect } from 'react';
import {
  GraduationCap,
  Save,
  Printer,
  FileSpreadsheet,
  Download,
  Users,
  Award,
  Sparkles,
  Calculator,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  BookOpenCheck,
  Layers,
  RotateCcw,
  Undo2,
  Redo2,
  CalendarDays,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Student, ClassRoom, TeacherSettings, StudentGrade, AttendanceRecord } from '../types';
import { db } from '../db/db';
import { toKhmerNum, KHMER_MONTHS } from '../utils/dateUtils';
import { PrintButton } from '../components/common/PrintButton';
import { useUndoRedo } from '../context/UndoRedoContext';
import {
  resolveGradeTrack,
  getTrackSubjects,
  calculateLetterMention,
  GRADE_TRACKS,
} from '../utils/gradeCoefficients';
import { ContinuousAssessmentTable, type ContinuousScoreData } from '../components/ContinuousAssessmentTable';
import * as XLSX from 'xlsx';

export type GradesViewMode = 'monthly-subject' | 'continuous';

export const MONTH_OPTIONS = [
  'មករា',
  'កុម្ភៈ',
  'មីនា',
  'មេសា',
  'ឧសភា',
  'មិថុនា',
  'កក្កដា',
  'សីហា',
  'កញ្ញា',
  'តុលា',
  'វិច្ឆិកា',
  'ធ្នូ',
  'ឆមាសទី១',
  'ឆមាសទី២',
  'ប្រឡងប្រចាំឆ្នាំ',
];

interface GradesPageProps {
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords?: AttendanceRecord[];
  settings: TeacherSettings | null;
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  onRefresh: () => void;
  onOpenGradeConfig?: () => void;
  initialViewMode?: GradesViewMode;
}

export const GradesPage: React.FC<GradesPageProps> = ({
  students,
  classes,
  attendanceRecords = [],
  settings,
  selectedClassId,
  onSelectClass,
  onRefresh,
  onOpenGradeConfig,
  initialViewMode = 'monthly-subject',
}) => {
  const [viewMode, setViewMode] = useState<GradesViewMode>(initialViewMode);
  const [selectedMonth, setSelectedMonth] = useState<string>('តុលា');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const { pushSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo();

  // Sync initialViewMode if prop changes
  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  // Active class
  const activeClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
  const currentClass = classes.find((c) => c.id === activeClassId);

  // Resolve Track Key (៧-៨, ៩, ១០, ១១ វិ.ពិត, ១១ វិ.សង្គម, ១២ វិ.ពិត, ១២ វិ.សង្គម)
  const trackKey = useMemo(() => {
    return resolveGradeTrack(currentClass?.name || '', currentClass?.grade || '៧');
  }, [currentClass?.name, currentClass?.grade]);

  const currentTrackDef = GRADE_TRACKS.find((t) => t.key === trackKey);

  // Subjects with max score and coefficient from Image 3 (or user-customized overrides)
  const subjects = useMemo(() => {
    return getTrackSubjects(trackKey, settings?.customGradeCoefficients as any);
  }, [trackKey, settings?.customGradeCoefficients]);

  const totalCoefficients = useMemo(() => {
    return subjects.reduce((sum, s) => sum + s.coefficient, 0);
  }, [subjects]);

  const totalPossibleMax = useMemo(() => {
    return subjects.reduce((sum, s) => sum + s.maxScore * s.coefficient, 0);
  }, [subjects]);

  // Filter students strictly by active class
  const classStudents = useMemo(() => {
    return students
      .filter((s) => s.classId === activeClassId)
      .sort((a, b) => a.rollNo - b.rollNo);
  }, [students, activeClassId]);

  // Scores map: studentId -> { [subjectId]: number }
  const [scoresState, setScoresState] = useState<Record<string, Record<string, number>>>({});

  // Continuous assessment state: studentId -> ContinuousScoreData
  const [continuousState, setContinuousState] = useState<Record<string, ContinuousScoreData>>({});

  // Compute number of absences for a student in selected month
  const computeStudentAbsences = (studentId: string, month: string): number => {
    const monthIdx = KHMER_MONTHS.indexOf(month);
    if (monthIdx === -1) return 0;
    return (attendanceRecords || []).filter((r) => {
      if (r.studentId !== studentId || r.status !== 'absent' || !r.date) return false;
      const d = new Date(r.date);
      return !isNaN(d.getTime()) && d.getMonth() === monthIdx;
    }).length;
  };

  // Load existing scores and continuous assessment from IndexedDB
  useEffect(() => {
    db.grades
      .where({ classId: activeClassId, month: selectedMonth })
      .toArray()
      .then((records) => {
        const sMap: Record<string, Record<string, number>> = {};
        const cMap: Record<string, ContinuousScoreData> = {};
        const recordStudentIds = new Set(records.map((r) => r.studentId));

        records.forEach((r) => {
          sMap[r.studentId] = r.scores || {};
          const autoAbs = r.absentCount ?? computeStudentAbsences(r.studentId, selectedMonth);
          const autoAtt = r.attendanceScore ?? Math.max(0, 10 - autoAbs * 2);
          cMap[r.studentId] = {
            absentCount: autoAbs,
            attendanceScore: autoAtt,
            quiz15mScore: r.quiz15mScore ?? 0,
            appScore: r.appScore ?? 0,
          };
        });

        // Initialize for class students not yet in grades table
        classStudents.forEach((stu) => {
          if (!recordStudentIds.has(stu.id)) {
            const autoAbs = computeStudentAbsences(stu.id, selectedMonth);
            cMap[stu.id] = {
              absentCount: autoAbs,
              attendanceScore: Math.max(0, 10 - autoAbs * 2),
              quiz15mScore: 0,
              appScore: 0,
            };
          }
        });

        setScoresState(sMap);
        setContinuousState(cMap);
      })
      .catch(console.error);
  }, [activeClassId, selectedMonth, classStudents.length, attendanceRecords.length]);

  // Update a single subject score
  const handleScoreChange = (studentId: string, subjectId: string, value: string) => {
    const sub = subjects.find((s) => s.id === subjectId);
    const max = sub?.maxScore || 100;
    const val = value === '' ? 0 : Math.min(max, Math.max(0, Number(value)));
    setScoresState((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectId]: val,
      },
    }));
  };

  // Update continuous assessment field
  const handleContinuousChange = (studentId: string, field: keyof ContinuousScoreData, value: number) => {
    setContinuousState((prev) => {
      const current = prev[studentId] || {
        absentCount: 0,
        attendanceScore: 10,
        quiz15mScore: 0,
        appScore: 0,
      };
      return {
        ...prev,
        [studentId]: {
          ...current,
          [field]: isNaN(value) ? 0 : Math.max(0, value),
        },
      };
    });
  };

  // Re-sync attendance from live attendance records
  const handleSyncAttendance = () => {
    const updated = { ...continuousState };
    classStudents.forEach((stu) => {
      const abs = computeStudentAbsences(stu.id, selectedMonth);
      const curr = updated[stu.id] || { quiz15mScore: 0, appScore: 0 };
      updated[stu.id] = {
        ...curr,
        absentCount: abs,
        attendanceScore: Math.max(0, 10 - abs * 2),
      };
    });
    setContinuousState(updated);
  };


  // Auto-fill sample realistic continuous scores
  const handleFillSampleContinuous = async () => {
    await pushSnapshot(`បំពេញពិន្ទុសាកល្បងការវាយតម្លៃជាប់ប្រចាំ ថ្នាក់ ${currentClass?.name || ''}`);
    const updated = { ...continuousState };
    classStudents.forEach((stu, idx) => {
      const abs = computeStudentAbsences(stu.id, selectedMonth);
      const quiz = Math.min(10, Math.max(6, 7.5 + ((idx * 3 + 2) % 4) * 0.5));
      const app = Math.min(10, Math.max(6.5, 8 + ((idx * 2 + 1) % 3) * 0.5));
      updated[stu.id] = {
        absentCount: abs,
        attendanceScore: Math.max(0, 10 - abs * 2),
        quiz15mScore: quiz,
        appScore: app,
      };
    });
    setContinuousState(updated);
  };

  // Save scores & continuous assessments to IndexedDB
  const handleSaveScores = async () => {
    await pushSnapshot(`រក្សាទុកពិន្ទុថ្នាក់ ${currentClass?.name || ''} ខែ ${selectedMonth}`);
    const recordsToPut: StudentGrade[] = classStudents.map((stu) => {
      const stuScores = scoresState[stu.id] || {};
      const cData = continuousState[stu.id] || {
        absentCount: 0,
        attendanceScore: 10,
        quiz15mScore: 0,
        appScore: 0,
      };
      const assessmentTotal = Number(
        (cData.attendanceScore + cData.quiz15mScore + cData.appScore).toFixed(2)
      );

      // Compute 70% exam and final 100%
      let totalWeighted = 0;
      let totalMaxWeighted = 0;
      subjects.forEach((subj) => {
        const sc = stuScores[subj.id] ?? 0;
        totalWeighted += sc * subj.coefficient;
        totalMaxWeighted += subj.maxScore * subj.coefficient;
      });
      const subjectPct = totalMaxWeighted > 0 ? (totalWeighted / totalMaxWeighted) * 100 : 0;
      const examScore70 = Number(((subjectPct * 70) / 100).toFixed(2));
      const finalTotal100 = Number((assessmentTotal + examScore70).toFixed(2));

      return {
        id: `grade-${activeClassId}-${selectedMonth}-${stu.id}`,
        classId: activeClassId,
        studentId: stu.id,
        month: selectedMonth,
        academicYear: settings?.academicYear || '២០២៤-២០២៥',
        scores: stuScores,
        conduct: 'ល្អ',
        absentCount: cData.absentCount,
        attendanceScore: cData.attendanceScore,
        quiz15mScore: cData.quiz15mScore,
        appScore: cData.appScore,
        assessmentTotal,
        examScore70,
        finalTotal100,
      };
    });

    await db.grades.bulkPut(recordsToPut);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    onRefresh();
  };



  // --- Monthly Subject Progress View State & Handlers ---
  const [selectedSubject, setSelectedSubject] = useState<string>(
    settings?.specialtySubject || 'គណិតវិទ្យា'
  );

  // Month columns for monthly tracking view (Column 0 is fixed as 'តេស្តដើមឆ្នាំ')
  const [monthColumns, setMonthColumns] = useState<string[]>(() => {
    const defaultJanToDec = [
      'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
      'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ',
    ];
    const saved = localStorage.getItem(`monthly_subj_cols_${activeClassId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed[0] === 'តុលា') {
            localStorage.setItem(`monthly_subj_cols_${activeClassId}`, JSON.stringify(defaultJanToDec));
            return defaultJanToDec;
          }
          return parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    return defaultJanToDec;
  });

  const handleUpdateMonthColumn = (idx: number, newMonth: string) => {
    setMonthColumns((prev) => {
      const copy = [...prev];
      copy[idx] = newMonth;
      localStorage.setItem(`monthly_subj_cols_${activeClassId}`, JSON.stringify(copy));
      return copy;
    });
  };

  const handleAddMonthColumn = () => {
    setMonthColumns((prev) => {
      const nextMonth = MONTH_OPTIONS[prev.length % MONTH_OPTIONS.length] || 'ខែថ្មី';
      const updated = [...prev, nextMonth];
      localStorage.setItem(`monthly_subj_cols_${activeClassId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveMonthColumn = (idx: number) => {
    if (monthColumns.length <= 1) return;
    setMonthColumns((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      localStorage.setItem(`monthly_subj_cols_${activeClassId}`, JSON.stringify(updated));
      return updated;
    });
  };

  // State for monthly scores: studentId -> monthName -> score
  const [subjectMonthlyScores, setSubjectMonthlyScores] = useState<Record<string, Record<string, number>>>({});

  // Active Subject definition and max score
  const currentSubjectObj = useMemo(() => {
    return (
      subjects.find((s) => s.name === selectedSubject || s.id === selectedSubject) || {
        id: 'math',
        name: selectedSubject,
        maxScore: 100,
        coefficient: 1,
      }
    );
  }, [subjects, selectedSubject]);

  const selectedSubjectId = currentSubjectObj.id;
  const currentMaxScore = currentSubjectObj.maxScore || 100;

  // Load scores for monthly-subject view from IndexedDB
  useEffect(() => {
    if (!activeClassId) return;
    db.grades
      .where({ classId: activeClassId })
      .toArray()
      .then((records) => {
        const map: Record<string, Record<string, number>> = {};
        records.forEach((r) => {
          if (!map[r.studentId]) map[r.studentId] = {};
          const sc =
            r.scores?.[selectedSubject] ??
            r.scores?.[selectedSubjectId] ??
            r.scores?.[selectedSubject.toLowerCase()];
          if (sc !== undefined) {
            map[r.studentId][r.month] = sc;
          }
        });
        setSubjectMonthlyScores(map);
      })
      .catch(console.error);
  }, [activeClassId, selectedSubject, selectedSubjectId]);

  const handleSubjectScoreChange = (studentId: string, month: string, value: string) => {
    const val = value === '' ? undefined : Math.min(currentMaxScore, Math.max(0, Number(value)));
    setSubjectMonthlyScores((prev) => {
      const studentMap = { ...(prev[studentId] || {}) };
      if (val === undefined) {
        delete studentMap[month];
      } else {
        studentMap[month] = val;
      }
      return {
        ...prev,
        [studentId]: studentMap,
      };
    });
  };

  const handleSaveSubjectScores = async () => {
    await pushSnapshot(`រក្សាទុកពិន្ទុមុខវិជ្ជា ${selectedSubject} ថ្នាក់ ${currentClass?.name || ''}`);
    const allMonths = ['តេស្តដើមឆ្នាំ', ...monthColumns];
    const existingRecords = await db.grades.where({ classId: activeClassId }).toArray();
    const existingMap = new Map<string, StudentGrade>();
    existingRecords.forEach((r) => {
      existingMap.set(`${r.studentId}_${r.month}`, r);
    });

    const recordsToPut: StudentGrade[] = [];

    classStudents.forEach((stu) => {
      const stuScores = subjectMonthlyScores[stu.id] || {};
      allMonths.forEach((m) => {
        const val = stuScores[m];
        if (val !== undefined) {
          const key = `${stu.id}_${m}`;
          const existing = existingMap.get(key);
          const updatedScores = {
            ...(existing?.scores || {}),
            [selectedSubject]: val,
            [selectedSubjectId]: val,
          };
          recordsToPut.push({
            id: existing?.id || `grade-${activeClassId}-${m}-${stu.id}`,
            classId: activeClassId,
            studentId: stu.id,
            month: m,
            academicYear: settings?.academicYear || '២០២៤-២០២៥',
            scores: updatedScores,
            conduct: existing?.conduct || 'ល្អ',
            absentCount: existing?.absentCount,
            attendanceScore: existing?.attendanceScore,
            quiz15mScore: existing?.quiz15mScore,
            appScore: existing?.appScore,
            assessmentTotal: existing?.assessmentTotal,
            examScore70: existing?.examScore70,
            finalTotal100: val,
          });
        }
      });
    });

    if (recordsToPut.length > 0) {
      await db.grades.bulkPut(recordsToPut);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    onRefresh();
  };

  const handleFillSampleSubjectScores = async () => {
    await pushSnapshot(`បំពេញពិន្ទុសាកល្បងមុខវិជ្ជា ${selectedSubject} ថ្នាក់ ${currentClass?.name || ''}`);
    const newMap: Record<string, Record<string, number>> = {};
    const allMonths = ['តេស្តដើមឆ្នាំ', ...monthColumns];

    classStudents.forEach((stu, sIdx) => {
      newMap[stu.id] = {};
      const baseRatio = 0.48 + ((sIdx * 19 + stu.nameKh.length * 7) % 48) / 100;

      allMonths.forEach((m, mIdx) => {
        const monthBonus = mIdx === 0 ? 0 : Math.min(0.12, mIdx * 0.015);
        const variance = (((sIdx * 13 + mIdx * 17) % 15) - 7) / 100;
        const finalRatio = Math.min(0.98, Math.max(0.35, baseRatio + monthBonus + variance));
        newMap[stu.id][m] = Math.round(currentMaxScore * finalRatio);
      });
    });

    setSubjectMonthlyScores(newMap);
  };

  const handleClearSubjectScores = async () => {
    if (window.confirm(`តើលោកគ្រូ-អ្នកគ្រូពិតជាចង់សម្អាតពិន្ទុមុខវិជ្ជា «${selectedSubject}» ទាំងអស់ឬទេ?`)) {
      await pushSnapshot(`សម្អាតពិន្ទុមុខវិជ្ជា ${selectedSubject}`);
      setSubjectMonthlyScores({});
    }
  };

  const allMonthKeys = useMemo(() => ['តេស្តដើមឆ្នាំ', ...monthColumns], [monthColumns]);

  // Compute Rank and Letter Mention for each individual month
  const monthlyStudentRankAndMention = useMemo(() => {
    const result: Record<
      string,
      Record<string, { score?: number; mention: string; rank?: number }>
    > = {};

    allMonthKeys.forEach((m) => {
      result[m] = {};

      const studentScores: { stuId: string; score: number }[] = [];
      classStudents.forEach((stu) => {
        const sc = subjectMonthlyScores[stu.id]?.[m];
        if (sc !== undefined && sc !== null && !isNaN(sc)) {
          studentScores.push({ stuId: stu.id, score: sc });
        }
      });

      // Sort descending to assign monthly ranks
      studentScores.sort((a, b) => b.score - a.score);

      let currentRank = 1;
      const rankMap = new Map<string, number>();
      studentScores.forEach((item, idx) => {
        if (idx > 0 && item.score < studentScores[idx - 1].score) {
          currentRank = idx + 1;
        }
        rankMap.set(item.stuId, currentRank);
      });

      classStudents.forEach((stu) => {
        const sc = subjectMonthlyScores[stu.id]?.[m];
        if (sc !== undefined && sc !== null && !isNaN(sc)) {
          const pct = currentMaxScore > 0 ? (sc / currentMaxScore) * 100 : sc;
          const mentionObj = calculateLetterMention(pct);
          result[m][stu.id] = {
            score: sc,
            mention: mentionObj.grade, // 'A', 'B', 'C', 'D', 'E', 'F'
            rank: rankMap.get(stu.id),
          };
        } else {
          result[m][stu.id] = {
            mention: '-',
          };
        }
      });
    });

    return result;
  }, [allMonthKeys, classStudents, subjectMonthlyScores, currentMaxScore]);

  // Excel-like keyboard navigation (Enter, Tab, Arrow keys, Auto-select)
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    stuIdx: number,
    mIdx: number
  ) => {
    const totalStudents = classStudents.length;
    const totalMonths = allMonthKeys.length;

    const focusCell = (targetStu: number, targetMonth: number) => {
      const el = document.getElementById(`score-cell-${targetStu}-${targetMonth}`) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select();
      }
    };

    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        // Move up (previous student row)
        if (stuIdx > 0) focusCell(stuIdx - 1, mIdx);
      } else {
        // Move down (next student row)
        if (stuIdx + 1 < totalStudents) focusCell(stuIdx + 1, mIdx);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Move left (previous month column)
        if (mIdx > 0) {
          focusCell(stuIdx, mIdx - 1);
        } else if (stuIdx > 0) {
          focusCell(stuIdx - 1, totalMonths - 1);
        }
      } else {
        // Move right (next month column)
        if (mIdx + 1 < totalMonths) {
          focusCell(stuIdx, mIdx + 1);
        } else if (stuIdx + 1 < totalStudents) {
          focusCell(stuIdx + 1, 0);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (stuIdx + 1 < totalStudents) focusCell(stuIdx + 1, mIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (stuIdx > 0) focusCell(stuIdx - 1, mIdx);
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (
        input.selectionStart === input.value.length ||
        (input.selectionStart === 0 && input.selectionEnd === input.value.length)
      ) {
        if (mIdx + 1 < totalMonths) {
          e.preventDefault();
          focusCell(stuIdx, mIdx + 1);
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (
        input.selectionStart === 0 ||
        (input.selectionStart === 0 && input.selectionEnd === input.value.length)
      ) {
        if (mIdx > 0) {
          e.preventDefault();
          focusCell(stuIdx, mIdx - 1);
        }
      }
    } else if (e.key === 'Escape') {
      e.currentTarget.blur();
    }
  };

  const columnStats = useMemo(() => {
    const allMonths = ['តេស្តដើមឆ្នាំ', ...monthColumns];
    const stats: Record<
      string,
      {
        total: number;
        count: number;
        average: number;
        passedCount: number;
        passedPct: number;
        failedCount: number;
        failedPct: number;
        counts: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', number>;
      }
    > = {};

    allMonths.forEach((m) => {
      let total = 0;
      let count = 0;
      let passedCount = 0;
      let failedCount = 0;
      const counts: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', number> = {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        E: 0,
        F: 0,
      };

      classStudents.forEach((stu) => {
        const sc = subjectMonthlyScores[stu.id]?.[m];
        if (sc !== undefined && sc !== null) {
          total += sc;
          count++;
          const pct = currentMaxScore > 0 ? (sc / currentMaxScore) * 100 : sc;
          if (pct >= 50) passedCount++;
          else failedCount++;

          if (pct >= 90) counts.A++;
          else if (pct >= 80) counts.B++;
          else if (pct >= 70) counts.C++;
          else if (pct >= 60) counts.D++;
          else if (pct >= 50) counts.E++;
          else counts.F++;
        }
      });

      const average = count > 0 ? Number((total / count).toFixed(2)) : 0;
      const passedPct = count > 0 ? Number(((passedCount / count) * 100).toFixed(1)) : 0;
      const failedPct = count > 0 ? Number(((failedCount / count) * 100).toFixed(1)) : 0;

      stats[m] = {
        total,
        count,
        average,
        passedCount,
        passedPct,
        failedCount,
        failedPct,
        counts,
      };
    });

    return stats;
  }, [classStudents, subjectMonthlyScores, monthColumns, currentMaxScore]);

  const handleExportMonthlySubjectExcel = () => {
    const data = classStudents.map((stu, idx) => {
      const row: Record<string, any> = {
        'លេខរៀង': idx + 1,
        'អត្តលេខ': stu.studentCode,
        'គោត្តនាម-នាម': stu.nameKh,
        'ភេទ': stu.gender,
      };

      allMonthKeys.forEach((m) => {
        const info = monthlyStudentRankAndMention[m]?.[stu.id];
        const mLabel = m === 'តេស្តដើមឆ្នាំ' ? 'តេស្តដើមឆ្នាំ' : `ខែ ${m}`;
        row[`${mLabel} (ពិន្ទុ)`] = info?.score !== undefined ? info.score : '-';
        row[`${mLabel} (និ.)`] = info?.mention || '-';
        row[`${mLabel} (ថ.)`] = info?.rank !== undefined ? info.rank : '-';
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `ពិន្ទុ_${selectedSubject}`);
    const fileName = `តារាងពិន្ទុ_${selectedSubject}_${currentClass?.name || 'ថ្នាក់'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-4">
      {/* 2-View Mode Switcher Banner */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        {/* Mode Selector Buttons */}
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('monthly-subject')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              viewMode === 'monthly-subject'
                ? 'bg-blue-600 text-white shadow-xs font-black ring-1 ring-blue-700'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>តារាងពិន្ទុតាមខែ (ចាប់ផ្តើមពីតេស្តដើមឆ្នាំ)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('continuous')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              viewMode === 'continuous'
                ? 'bg-indigo-600 text-white shadow-xs font-black ring-1 ring-indigo-700'
                : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50'
            }`}
          >
            <BookOpenCheck className="w-4 h-4" />
            <span>បញ្ជីពិន្ទុវត្តមាន & វាយតម្លៃបន្ត (៣០%)</span>
          </button>
        </div>

        {/* Level badge */}
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-200">
            📚 {currentTrackDef?.label || currentClass?.name}
          </span>
        </div>
      </div>

      {/* VIEW MODE 0: Monthly Subject Assessment (ចាប់ផ្តើមពីតេស្តដើមឆ្នាំ + ជម្រើសតាមខែ) */}
      {viewMode === 'monthly-subject' && (
        <div className="space-y-4">
          {/* Top Banner and Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3 no-print">
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center shrink-0">
                  <CalendarDays className="w-6 h-6 text-blue-600 mr-2 shrink-0" />
                  <span className="whitespace-nowrap">ពិន្ទុសិស្សប្រចាំខែ (តាមដានការរីកចម្រើន)</span>
                </h2>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 shrink-0">
                  📚 {currentClass?.name || 'ថ្នាក់រៀន'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                ចាប់ផ្តើមពីតេស្តដើមឆ្នាំ និងតាមដានពិន្ទុតាមខែនីមួយៗ គណនាមធ្យមភាគ និទ្ទេស (A-F) និងចំណាត់ថ្នាក់ស្វ័យប្រវត្តិ
              </p>
            </div>

            {/* Action Buttons & Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Subject Selector */}
              <div className="flex items-center space-x-1.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200 px-2.5 py-1">
                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">មុខវិជ្ជា៖</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-white border border-slate-300 font-bold text-xs rounded-lg px-2.5 py-1 text-blue-800 cursor-pointer shadow-2xs outline-none"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.name} (×{sub.coefficient})
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Month Column Button */}
              <button
                type="button"
                onClick={handleAddMonthColumn}
                className="inline-flex items-center px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors cursor-pointer shadow-2xs"
                title="បន្ថែមជួរឈរខែថ្មី"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                បន្ថែមខែ
              </button>

              {/* Fill Sample Scores Button */}
              <button
                type="button"
                onClick={handleFillSampleSubjectScores}
                className="inline-flex items-center px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors cursor-pointer shadow-2xs"
                title="បំពេញពិន្ទុសាកល្បងដោយស្វ័យប្រវត្តិ"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                បំពេញពិន្ទុសាកល្បង
              </button>

              {/* Export Excel */}
              <button
                type="button"
                onClick={handleExportMonthlySubjectExcel}
                className="inline-flex items-center px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
                Excel
              </button>

              {/* Print with Orientation Selector */}
              <PrintButton defaultOrientation="landscape" label="បោះពុម្ព" />

              {/* Undo / Redo */}
              <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold shadow-2xs">
                <button
                  type="button"
                  onClick={undo}
                  disabled={!canUndo}
                  className="inline-flex items-center px-2 py-1 rounded-lg text-slate-700 hover:bg-white hover:text-indigo-600 disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors cursor-pointer"
                  title="ត្រឡប់ក្រោយ (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5 mr-1 text-slate-600" />
                  Undo
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={!canRedo}
                  className="inline-flex items-center px-2 py-1 rounded-lg text-slate-700 hover:bg-white hover:text-indigo-600 disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors cursor-pointer"
                  title="ធ្វើឡើងវិញ (Ctrl+Y)"
                >
                  <Redo2 className="w-3.5 h-3.5 mr-1 text-slate-600" />
                  Redo
                </button>
              </div>

              {/* Clear button */}
              <button
                type="button"
                onClick={handleClearSubjectScores}
                className="inline-flex items-center px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                title="សម្អាតពិន្ទុទាំងអស់"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                សម្អាត
              </button>

              {/* Save Scores */}
              <button
                type="button"
                onClick={handleSaveSubjectScores}
                className="inline-flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                {savedSuccess ? 'បានរក្សាទុក!' : 'រក្សាទុក'}
              </button>
            </div>
          </div>

          {/* Subject & Track Info Badge */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 no-print flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-blue-900">
              <Calculator className="w-4 h-4 text-blue-600" />
              <span>
                មុខវិជ្ជា៖ <strong className="text-blue-800 text-sm font-black">{selectedSubject}</strong> | ថ្នាក់៖ <strong>{currentClass?.name || 'ថ្នាក់'}</strong> ({currentTrackDef?.label})
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                ពិន្ទុអតិបរមា៖ <span className="font-mono text-blue-700">{currentMaxScore}</span>
              </span>
              <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                មេគុណ៖ <span className="font-mono text-red-600">×{currentSubjectObj.coefficient}</span>
              </span>
            </div>
          </div>

          {/* Official Header on Print */}
          <div className="hidden print:block text-center mb-6">
            <h3 className="font-moul text-base">ព្រះរាជាណាចក្រកម្ពុជា</h3>
            <h4 className="font-moul text-sm">ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
            <div className="w-24 h-0.5 bg-black mx-auto my-2" />
            <div className="flex justify-between items-start text-left mt-2 text-xs">
              <div>
                <p className="font-bold">{settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}</p>
                <p>ឆ្នាំសិក្សា៖ {settings?.academicYear || '២០២៤-២០២៥'}</p>
                <p>មុខវិជ្ជា៖ <strong>{selectedSubject}</strong></p>
              </div>
              <div className="text-right">
                <p className="font-bold">គ្រូបង្រៀន៖ {settings?.teacherName || 'ហ៊ុន រដ្ឋា'}</p>
                <p>ថ្នាក់៖ {currentClass?.name}</p>
              </div>
            </div>
            <h2 className="font-moul text-base mt-4">
              តារាងស្រង់ និងតាមដានពិន្ទុសិស្សប្រចាំខែ មុខវិជ្ជា «{selectedSubject}» {currentClass?.name}
            </h2>
          </div>

          {/* Excel-like Navigation Tip Banner */}
          <div className="bg-blue-50/80 border border-blue-200/90 rounded-2xl px-3.5 py-2 no-print flex items-center justify-between text-xs text-blue-950 flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold">💡 របៀបបញ្ចូលពិន្ទុដូច Excel ៖</span>
              <span className="text-slate-600">
                ចុច <strong>Enter</strong> (ចុះក្រោម), <strong>Tab</strong> (ទៅស្តាំ), ឬ <strong>ព្រួញ ↑ ↓ ← →</strong> ដើម្បីរំកិលក្រឡាស្វ័យប្រវត្ត
              </span>
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-bold text-blue-800">
              <span><strong>និ.</strong> = និទ្ទេស (A-F)</span>
              <span><strong>ថ.</strong> = ចំណាត់ថ្នាក់ប្រចាំខែ</span>
            </div>
          </div>

          {/* Main Monthly Score Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-auto max-h-[72vh] table-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-20 shadow-xs print:static print:table-header-group">
                  {/* Row 1: Month Group Headers */}
                  <tr className="bg-slate-900 text-white font-bold text-center">
                    <th rowSpan={2} className="py-2 px-1 border border-slate-700 w-10 print:w-7 text-center">
                      ល.រ
                    </th>
                    <th rowSpan={2} className="py-2 px-1 border border-slate-700 w-24 print:w-14 text-center">
                      អត្តលេខ
                    </th>
                    <th rowSpan={2} className="py-2 px-2 border border-slate-700 text-left min-w-[120px] print:min-w-[90px]">
                      គោត្តនាម-នាម
                    </th>
                    <th rowSpan={2} className="py-2 px-1 border border-slate-700 w-12 print:w-8 text-center">
                      ភេទ
                    </th>

                    {/* Column 0: Fixed Starting Column 'តេស្តដើមឆ្នាំ' (ColSpan 3: ពិន្ទុ, និ., ថ.) */}
                    <th colSpan={3} className="py-1 px-1 border border-slate-700 bg-blue-950 min-w-[96px] print:min-w-[70px] text-center">
                      <div className="font-black text-amber-200 text-xs">តេស្តដើមឆ្នាំ</div>
                      <div className="text-[10px] text-blue-200 font-mono mt-0.5">
                        ({currentMaxScore}ពិន្ទុ)
                      </div>
                    </th>

                    {/* Subsequent Month Columns with Header Selector (ColSpan 3: ពិន្ទុ, និ., ថ.) */}
                    {monthColumns.map((m, idx) => (
                      <th
                        key={`mcol-${idx}`}
                        colSpan={3}
                        className="py-1 px-1 border border-slate-700 min-w-[96px] print:min-w-[70px] bg-slate-800 text-center"
                      >
                        <div className="flex items-center justify-center space-x-1 no-print">
                          <select
                            value={m}
                            onChange={(e) => handleUpdateMonthColumn(idx, e.target.value)}
                            className="bg-slate-700 text-white text-[11px] font-bold rounded px-1 py-0.5 border border-slate-600 outline-none cursor-pointer hover:bg-slate-600 transition-colors"
                          >
                            {MONTH_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} className="bg-slate-800 text-white">
                                {opt.startsWith('ឆមាស') || opt.startsWith('ប្រឡង') ? opt : `ខែ ${opt}`}
                              </option>
                            ))}
                          </select>
                          {monthColumns.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMonthColumn(idx)}
                              className="text-slate-400 hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title="លុបខែនេះ"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {/* Print Only Header Display */}
                        <div className="hidden print:block font-bold text-xs">
                          {m.startsWith('ឆមាស') || m.startsWith('ប្រឡង') ? m : `ខែ ${m}`}
                        </div>
                        <div className="text-[10px] text-amber-300 font-mono mt-0.5">
                          ({currentMaxScore}ពិន្ទុ)
                        </div>
                      </th>
                    ))}

                    {/* Add Column Header Button */}
                    <th rowSpan={2} className="py-1 px-1 border border-slate-700 bg-slate-900 w-9 no-print">
                      <button
                        type="button"
                        onClick={handleAddMonthColumn}
                        className="p-1 hover:bg-slate-700 rounded text-emerald-400 hover:text-emerald-300 cursor-pointer transition-colors"
                        title="បន្ថែមជួរឈរខែ"
                      >
                        <Plus className="w-4 h-4 mx-auto" />
                      </button>
                    </th>
                  </tr>

                  {/* Row 2: Sub-headers (ពិន្ទុ, និ., ថ.) for each month */}
                  <tr className="bg-slate-800 text-white font-bold text-center text-[10px] print:text-[8pt]">
                    {/* For តេស្តដើមឆ្នាំ */}
                    <th className="py-1 px-0.5 border border-slate-700 bg-blue-900/80 w-12 print:w-9 text-slate-200" title="ពិន្ទុតេស្តដើមឆ្នាំ">
                      ពិន្ទុ
                    </th>
                    <th className="py-1 px-0.5 border border-slate-700 bg-blue-900/80 w-7 print:w-6 text-indigo-200" title="និទ្ទេស (A-F)">
                      និ.
                    </th>
                    <th className="py-1 px-0.5 border border-slate-700 bg-blue-900/80 w-7 print:w-6 text-amber-200" title="ចំណាត់ថ្នាក់">
                      ថ.
                    </th>

                    {/* For each month in monthColumns */}
                    {monthColumns.map((m, idx) => (
                      <React.Fragment key={`subhead-${idx}`}>
                        <th className="py-1 px-0.5 border border-slate-700 bg-slate-900/90 w-12 print:w-9 text-slate-200" title={`ពិន្ទុ ខែ ${m}`}>
                          ពិន្ទុ
                        </th>
                        <th className="py-1 px-0.5 border border-slate-700 bg-slate-900/90 w-7 print:w-6 text-indigo-300" title={`និទ្ទេស (A-F) ខែ ${m}`}>
                          និ.
                        </th>
                        <th className="py-1 px-0.5 border border-slate-700 bg-slate-900/90 w-7 print:w-6 text-amber-300" title={`ចំណាត់ថ្នាក់ ខែ ${m}`}>
                          ថ.
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={allMonthKeys.length * 3 + 5} className="py-12 text-center text-slate-400">
                        <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        មិនមានសិស្សក្នុងថ្នាក់នេះទេ
                      </td>
                    </tr>
                  ) : (
                    classStudents.map((stu, stuIdx) => {
                      return (
                        <tr
                          key={stu.id}
                          className="hover:bg-blue-50/40 transition-colors"
                        >
                          {/* ល.រ */}
                          <td className="py-1.5 px-1 text-center font-bold text-slate-700 border border-slate-200 bg-slate-50 text-xs">
                            {toKhmerNum(stuIdx + 1)}
                          </td>

                          {/* អត្តលេខ */}
                          <td className="py-1.5 px-1 font-mono text-[11px] font-bold text-slate-700 border border-slate-200 text-center">
                            {stu.studentCode}
                          </td>

                          {/* ឈ្មោះសិស្ស */}
                          <td className="py-1.5 px-2 border border-slate-200 font-bold text-slate-900 whitespace-nowrap text-xs">
                            {stu.nameKh}
                          </td>

                          {/* ភេទ */}
                          <td className="py-1.5 px-0.5 text-center border border-slate-200">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                stu.gender === 'ស្រី'
                                  ? 'bg-pink-100 text-pink-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {stu.gender}
                            </span>
                          </td>

                          {/* Month columns: each month has 3 cells (Score, Mention, Rank) */}
                          {allMonthKeys.map((m, mIdx) => {
                            const info = monthlyStudentRankAndMention[m]?.[stu.id];
                            const sc = info?.score;
                            const mention = info?.mention || '-';
                            const stuRank = info?.rank;
                            const isTopRank = stuRank !== undefined && stuRank <= 3;

                            return (
                              <React.Fragment key={`cell-${stu.id}-${m}`}>
                                {/* 1. Score input with Excel-like navigation (Enter, Tab, Arrows) */}
                                <td className="p-0.5 border border-slate-200 text-center font-mono">
                                  <input
                                    id={`score-cell-${stuIdx}-${mIdx}`}
                                    data-stu-idx={stuIdx}
                                    data-col-idx={mIdx}
                                    type="number"
                                    min="0"
                                    max={currentMaxScore}
                                    step="0.5"
                                    value={sc !== undefined ? sc : ''}
                                    placeholder="-"
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={(e) => handleCellKeyDown(e, stuIdx, mIdx)}
                                    onChange={(e) => handleSubjectScoreChange(stu.id, m, e.target.value)}
                                    className={`w-full text-center font-mono py-1 px-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white bg-transparent text-xs font-bold outline-none transition-colors ${
                                      sc !== undefined && sc < currentMaxScore * 0.5
                                        ? 'text-rose-600'
                                        : sc !== undefined && sc >= currentMaxScore * 0.8
                                        ? 'text-emerald-700'
                                        : 'text-slate-800'
                                    }`}
                                  />
                                </td>

                                {/* 2. និ. (Mention A-F) */}
                                <td className="py-1 px-0.5 border border-slate-200 text-center font-bold text-[11px] whitespace-nowrap bg-slate-50/40">
                                  {mention !== '-' ? (
                                    <span
                                      className={`inline-block px-1 py-0.2 rounded text-[10px] font-black ${
                                        mention === 'A'
                                          ? 'text-emerald-700 bg-emerald-100/80'
                                          : mention === 'B'
                                          ? 'text-blue-700 bg-blue-100/80'
                                          : mention === 'C'
                                          ? 'text-teal-700 bg-teal-100/80'
                                          : mention === 'D'
                                          ? 'text-amber-700 bg-amber-100/80'
                                          : mention === 'E'
                                          ? 'text-orange-700 bg-orange-100/80'
                                          : 'text-rose-700 bg-rose-100/80'
                                      }`}
                                    >
                                      {mention}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>

                                {/* 3. ថ. (Rank 1..N) */}
                                <td className="py-1 px-0.5 border border-slate-200 text-center font-mono text-[11px] whitespace-nowrap bg-slate-50/20">
                                  {stuRank !== undefined ? (
                                    isTopRank ? (
                                      <span className="font-black text-amber-700 bg-amber-100/70 px-1 py-0.2 rounded text-[10px]">
                                        {stuRank}
                                      </span>
                                    ) : (
                                      <span className="font-semibold text-slate-700">{stuRank}</span>
                                    )
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              </React.Fragment>
                            );
                          })}

                          {/* Empty spacer for + column */}
                          <td className="p-1 border border-slate-200 bg-slate-50 no-print" />
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Table Footer: MoEYS & Teaching Plan Statistical Analysis */}
                {classStudents.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold text-slate-700 border-t-2 border-slate-300">
                    {/* Class Average Row */}
                    <tr className="bg-blue-50/60 font-black text-blue-900 border-b border-slate-200">
                      <td colSpan={4} className="py-2 px-3 text-right border border-slate-200">
                        មធ្យមភាគថ្នាក់៖
                      </td>
                      {allMonthKeys.map((m) => (
                        <td
                          key={`avg-${m}`}
                          colSpan={3}
                          className="py-2 px-1 text-center border border-slate-200 font-mono text-blue-800"
                        >
                          {columnStats[m]?.count > 0 ? columnStats[m].average : '-'}
                        </td>
                      ))}
                      <td className="no-print border border-slate-200" />
                    </tr>

                    {/* Passed Row */}
                    <tr className="text-emerald-800 border-b border-slate-200">
                      <td colSpan={4} className="py-1.5 px-3 text-right border border-slate-200">
                        សិស្សជាប់ (≥៥០%)៖
                      </td>
                      {allMonthKeys.map((m) => (
                        <td
                          key={`pass-${m}`}
                          colSpan={3}
                          className="py-1.5 px-1 text-center border border-slate-200 font-mono text-[11px]"
                        >
                          {columnStats[m]?.count > 0
                            ? `${columnStats[m].passedCount} (${columnStats[m].passedPct}%)`
                            : '-'}
                        </td>
                      ))}
                      <td className="no-print border border-slate-200" />
                    </tr>

                    {/* Failed Row */}
                    <tr className="text-rose-800 border-b border-slate-200">
                      <td colSpan={4} className="py-1.5 px-3 text-right border border-slate-200">
                        សិស្សធ្លាក់ (&lt;៥០%)៖
                      </td>
                      {allMonthKeys.map((m) => (
                        <td
                          key={`fail-${m}`}
                          colSpan={3}
                          className="py-1.5 px-1 text-center border border-slate-200 font-mono text-[11px]"
                        >
                          {columnStats[m]?.count > 0
                            ? `${columnStats[m].failedCount} (${columnStats[m].failedPct}%)`
                            : '-'}
                        </td>
                      ))}
                      <td className="no-print border border-slate-200" />
                    </tr>

                    {/* Mention A Row */}
                    <tr className="text-emerald-700 text-[11px] border-b border-slate-200">
                      <td colSpan={4} className="py-1 px-3 text-right border border-slate-200">
                        និទ្ទេស A (≥៩០%)៖
                      </td>
                      {allMonthKeys.map((m) => (
                        <td key={`a-${m}`} colSpan={3} className="py-1 px-1 text-center border border-slate-200 font-mono">
                          {columnStats[m]?.count > 0 ? columnStats[m].counts.A : '-'}
                        </td>
                      ))}
                      <td className="no-print border border-slate-200" />
                    </tr>

                    {/* Mention B Row */}
                    <tr className="text-blue-700 text-[11px] border-b border-slate-200">
                      <td colSpan={4} className="py-1 px-3 text-right border border-slate-200">
                        និទ្ទេស B (៨០-៨៩%)៖
                      </td>
                      {allMonthKeys.map((m) => (
                        <td key={`b-${m}`} colSpan={3} className="py-1 px-1 text-center border border-slate-200 font-mono">
                          {columnStats[m]?.count > 0 ? columnStats[m].counts.B : '-'}
                        </td>
                      ))}
                      <td className="no-print border border-slate-200" />
                    </tr>

                    {/* Mention C Row */}
                    <tr className="text-indigo-700 text-[11px] border-b border-slate-200">
                      <td colSpan={4} className="py-1 px-3 text-right border border-slate-200">
                        និទ្ទេស C (៧០-៧៩%)៖
                      </td>
                      {allMonthKeys.map((m) => (
                        <td key={`c-${m}`} colSpan={3} className="py-1 px-1 text-center border border-slate-200 font-mono">
                          {columnStats[m]?.count > 0 ? columnStats[m].counts.C : '-'}
                        </td>
                      ))}
                      <td className="no-print border border-slate-200" />
                    </tr>

                    {/* Mention D Row */}
                    <tr className="text-amber-700 text-[11px] border-b border-slate-200">
                      <td colSpan={4} className="py-1 px-3 text-right border border-slate-200">
                        និទ្ទេស D (៦០-៦៩%)៖
                      </td>
                      {allMonthKeys.map((m) => (
                        <td key={`d-${m}`} colSpan={3} className="py-1 px-1 text-center border border-slate-200 font-mono">
                          {columnStats[m]?.count > 0 ? columnStats[m].counts.D : '-'}
                        </td>
                      ))}
                      <td className="no-print border border-slate-200" />
                    </tr>

                    {/* Mention E Row */}
                    <tr className="text-orange-700 text-[11px] border-b border-slate-200">
                      <td colSpan={4} className="py-1 px-3 text-right border border-slate-200">
                        និទ្ទេស E (៥០-៥៩%)៖
                      </td>
                      {allMonthKeys.map((m) => (
                        <td key={`e-${m}`} colSpan={3} className="py-1 px-1 text-center border border-slate-200 font-mono">
                          {columnStats[m]?.count > 0 ? columnStats[m].counts.E : '-'}
                        </td>
                      ))}
                      <td className="no-print border border-slate-200" />
                    </tr>

                    {/* Mention F Row */}
                    <tr className="text-rose-700 text-[11px]">
                      <td colSpan={4} className="py-1 px-3 text-right border border-slate-200">
                        និទ្ទេស F (&lt;៥០%)៖
                      </td>
                      {allMonthKeys.map((m) => (
                        <td key={`f-${m}`} colSpan={3} className="py-1 px-1 text-center border border-slate-200 font-mono">
                          {columnStats[m]?.count > 0 ? columnStats[m].counts.F : '-'}
                        </td>
                      ))}
                      <td className="no-print border border-slate-200" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Continuous Assessment (ពិន្ទុវត្តមាន [-2] + ១៥នាទី + App + សរុប ៣០%) */}
      {viewMode === 'continuous' && (
        <ContinuousAssessmentTable
          students={students}
          currentClass={currentClass}
          activeClassId={activeClassId}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          attendanceRecords={attendanceRecords}
          settings={settings}
          subjects={subjects}
          scoresState={scoresState}
          continuousState={continuousState}
          onContinuousChange={handleContinuousChange}
          onSyncAttendance={handleSyncAttendance}
          onFillSampleContinuous={handleFillSampleContinuous}
          onSaveScores={handleSaveScores}
          savedSuccess={savedSuccess}
        />
      )}

      {/* Official Signatures on Print */}
      <div className="hidden print:block mt-8 text-xs">
        <div className="flex justify-between items-start">
          <div className="text-center w-52">
            <p className="font-bold">បានឃើញ និងឯកភាព</p>
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
    </div>
  );
};
