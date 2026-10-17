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

export type GradesViewMode = 'subjects' | 'continuous' | 'combined';

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
  initialViewMode = 'subjects',
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

  // Auto-fill sample realistic scores for subjects
  const handleFillSampleScores = async () => {
    await pushSnapshot(`បំពេញពិន្ទុសាកល្បងមុខវិជ្ជា ថ្នាក់ ${currentClass?.name || ''}`);
    const newScores: Record<string, Record<string, number>> = {};
    classStudents.forEach((stu, idx) => {
      newScores[stu.id] = {};
      subjects.forEach((subj) => {
        const baseRatio = 0.55 + ((idx * 17 + subj.name.length * 11) % 40) / 100;
        newScores[stu.id][subj.id] = Math.round(subj.maxScore * Math.min(0.98, Math.max(0.45, baseRatio)));
      });
    });
    setScoresState(newScores);
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

  // Calculate totals, weighted averages, percentage, 30% continuous, 70% exam, and rank
  const calculatedResults = useMemo(() => {
    const list = classStudents.map((stu) => {
      const stuScores = scoresState[stu.id] || {};
      let totalWeighted = 0;
      let totalMaxWeighted = 0;
      let enteredCount = 0;

      subjects.forEach((subj) => {
        const sc = stuScores[subj.id] ?? 0;
        if (stuScores[subj.id] !== undefined) enteredCount++;
        totalWeighted += sc * subj.coefficient;
        totalMaxWeighted += subj.maxScore * subj.coefficient;
      });

      const average = totalCoefficients > 0 ? Number((totalWeighted / totalCoefficients).toFixed(2)) : 0;
      const percentage = totalMaxWeighted > 0 ? Number(((totalWeighted / totalMaxWeighted) * 100).toFixed(2)) : 0;

      // Continuous 30% components
      const cData = continuousState[stu.id] || {
        absentCount: 0,
        attendanceScore: 10,
        quiz15mScore: 0,
        appScore: 0,
      };
      const continuousTotal30 = Number(
        (cData.attendanceScore + cData.quiz15mScore + cData.appScore).toFixed(2)
      );

      // Exam 70% component
      const examScore70 = Number(((percentage * 70) / 100).toFixed(2));

      // Final Combined Monthly Total (30% Continuous + 70% Exam = /100)
      const finalCombinedTotal = Number((continuousTotal30 + examScore70).toFixed(2));
      const combinedMention = calculateLetterMention(finalCombinedTotal);
      const subjectMention = calculateLetterMention(percentage);

      return {
        student: stu,
        scores: stuScores,
        totalWeighted: Number(totalWeighted.toFixed(2)),
        average,
        percentage,
        subjectMention,
        continuousTotal30,
        examScore70,
        finalCombinedTotal,
        combinedMention,
        enteredCount,
      };
    });

    // Sort by final combined total descending to compute combined rank
    const sorted = [...list].sort((a, b) => b.finalCombinedTotal - a.finalCombinedTotal);
    const rankMap = new Map<string, number>();
    sorted.forEach((item, index) => {
      rankMap.set(item.student.id, index + 1);
    });

    // Subject rank based on raw average
    const sortedSubject = [...list].sort((a, b) => b.average - a.average);
    const subjectRankMap = new Map<string, number>();
    sortedSubject.forEach((item, index) => {
      subjectRankMap.set(item.student.id, index + 1);
    });

    return list.map((item) => ({
      ...item,
      rank: rankMap.get(item.student.id) || 1,
      subjectRank: subjectRankMap.get(item.student.id) || 1,
    }));
  }, [classStudents, scoresState, continuousState, subjects, totalCoefficients]);

  // Export Combined or Subject table to Excel
  const handleExportCombinedExcel = () => {
    const data = calculatedResults.map((item) => {
      const row: Record<string, any> = {
        'លេខរៀង': item.student.rollNo,
        'អត្តលេខ': item.student.studentCode,
        'គោត្តនាម-នាម': item.student.nameKh,
        'ភេទ': item.student.gender,
      };

      subjects.forEach((subj) => {
        row[`${subj.name} (×${subj.coefficient})`] = item.scores[subj.id] ?? '-';
      });

      row['ពិន្ទុប្រឡងសរុប'] = item.totalWeighted;
      row['មធ្យមភាគប្រឡង'] = item.average;
      row['ប្រឡងមុខវិជ្ជា (៧០%)'] = item.examScore70;
      row['វាយតម្លៃបន្ត (៣០%)'] = item.continuousTotal30;
      row['ពិន្ទុសរុបប្រចាំខែ (១០០%)'] = item.finalCombinedTotal;
      row['និទ្ទេសរួម'] = item.combinedMention.khmerLabel;
      row['ចំណាត់ថ្នាក់'] = item.rank;

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `ពិន្ទុរួម_${selectedMonth}`);
    const fileName = `តារាងពិន្ទុរួម_៣០_៧០_${currentClass?.name || 'ថ្នាក់'}_ខែ${selectedMonth}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleExportSubjectExcel = () => {
    const data = calculatedResults.map((item) => {
      const row: Record<string, any> = {
        'លេខរៀង': item.student.rollNo,
        'អត្តលេខ': item.student.studentCode,
        'គោត្តនាម-នាម': item.student.nameKh,
        'ភេទ': item.student.gender,
      };

      subjects.forEach((subj) => {
        row[`${subj.name} (មេគុណ ${subj.coefficient}, ពិន្ទុអតិ. ${subj.maxScore})`] = item.scores[subj.id] ?? '-';
      });

      row['ពិន្ទុសរុប'] = item.totalWeighted;
      row['មធ្យមភាគ'] = item.average;
      row['ភាគរយ (%)'] = item.percentage + '%';
      row['និទ្ទេស'] = item.subjectMention.khmerLabel;
      row['ចំណាត់ថ្នាក់'] = item.subjectRank;

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `ពិន្ទុ_${selectedMonth}`);
    const fileName = `តារាងពិន្ទុ_${currentClass?.name || 'ថ្នាក់'}_ខែ${selectedMonth}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-4">
      {/* 3-View Mode Switcher Banner */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        {/* Mode Selector Buttons */}
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('subjects')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              viewMode === 'subjects'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200 ring-1 ring-blue-300 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>តារាងពិន្ទុគ្រប់មុខវិជ្ជា (MoEYS)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('continuous')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              viewMode === 'continuous'
                ? 'bg-indigo-600 text-white shadow-xs font-black ring-1 ring-indigo-700'
                : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50'
            }`}
          >
            <BookOpenCheck className="w-4 h-4" />
            <span>បញ្ជីពិន្ទុវត្តមាន & វាយតម្លៃបន្ត (៣០%)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('combined')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              viewMode === 'combined'
                ? 'bg-emerald-600 text-white shadow-xs font-black ring-1 ring-emerald-700'
                : 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>តារាងពិន្ទុរួម (៣០% វាយតម្លៃ + ៧០% មុខវិជ្ជា)</span>
          </button>
        </div>

        {/* Level badge */}
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-200">
            📚 {currentTrackDef?.label || currentClass?.name}
          </span>
        </div>
      </div>

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

      {/* VIEW MODE 1: Standard MoEYS Subject Matrix */}
      {viewMode === 'subjects' && (
        <div className="space-y-4">
          {/* Top Banner and Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3 no-print">
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-black text-slate-800 flex items-center">
                  <GraduationCap className="w-6 h-6 text-blue-600 mr-2" />
                  ពិន្ទុសិស្សប្រចាំខែ ({currentClass?.name || 'ថ្នាក់រៀន'})
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                គិតមេគុណ និងពិន្ទុអតិបរមាតាមស្តង់ដារក្រសួងអប់រំ (រូបទី៣) គណនាមធ្យមភាគ និទ្ទេស (A-F) និងចំណាត់ថ្នាក់ស្វ័យប្រវត្តិ
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Month Switcher */}
              <div className="flex items-center space-x-1.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200 px-2 py-1">
                <label className="text-xs font-bold text-slate-600">ខែ៖</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white border border-slate-300 font-bold text-xs rounded-lg px-2 py-1 text-slate-800 cursor-pointer shadow-2xs outline-none"
                >
                  {KHMER_MONTHS.map((m) => (
                    <option key={m} value={m}>
                      ខែ {m}
                    </option>
                  ))}
                  <option value="ឆមាសទី១">ប្រឡងឆមាសទី ១</option>
                  <option value="ឆមាសទី២">ប្រឡងឆមាសទី ២</option>
                </select>
              </div>

              {/* Fill Sample Scores Button */}
              <button
                type="button"
                onClick={handleFillSampleScores}
                className="inline-flex items-center px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors cursor-pointer shadow-2xs"
                title="បំពេញពិន្ទុសាកល្បងដោយស្វ័យប្រវត្តិ"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                បំពេញពិន្ទុសាកល្បង
              </button>

              {/* Export Excel */}
              <button
                type="button"
                onClick={handleExportSubjectExcel}
                className="inline-flex items-center px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors cursor-pointer shadow-2xs"
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

              {/* Save Scores */}
              <button
                type="button"
                onClick={handleSaveScores}
                className="inline-flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                {savedSuccess ? 'បានរក្សាទុក!' : 'រក្សាទុក'}
              </button>
            </div>
          </div>

          {/* Grade Subject Multipliers Info Bar */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 no-print flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs sm:text-sm">
                <Calculator className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  មុខវិជ្ជា & មេគុណសម្រាប់ {currentTrackDef?.label || currentClass?.name} (សរុប {subjects.length} មុខវិជ្ជា | ផលបូកមេគុណ: {totalCoefficients})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {subjects.map((sub) => (
                  <span
                    key={sub.id}
                    className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-lg bg-white border border-amber-300 font-bold text-slate-800 shadow-2xs"
                  >
                    {sub.name}:
                    <span className="text-red-600 font-black ml-1">×{sub.coefficient}</span>
                    <span className="text-slate-400 font-normal ml-1">({sub.maxScore}ពិន្ទុ)</span>
                  </span>
                ))}
              </div>
            </div>

            {onOpenGradeConfig && (
              <button
                type="button"
                onClick={onOpenGradeConfig}
                className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 shadow-2xs whitespace-nowrap cursor-pointer transition-colors"
              >
                <Sliders className="w-3.5 h-3.5 mr-1 text-amber-700" />
                កែប្រែមេគុណ
              </button>
            )}
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
              </div>
              <div className="text-right">
                <p className="font-bold">គ្រូបន្ទុកថ្នាក់៖ {settings?.teacherName || 'ហ៊ុន រដ្ឋា'}</p>
                <p>ខែ៖ {selectedMonth}</p>
              </div>
            </div>
            <h2 className="font-moul text-base mt-4">
              តារាងស្រង់ពិន្ទុប្រចាំខែ{selectedMonth} {currentClass?.name}
            </h2>
          </div>

          {/* Main Score Spreadsheet Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-auto max-h-[72vh] table-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-20 shadow-xs print:static print:table-header-group">
                  <tr className="bg-slate-800 text-white font-bold text-center">
                    <th className="py-2.5 px-2 border border-slate-700 w-10">ល.រ</th>
                    <th className="py-2.5 px-2 border border-slate-700 w-24">អត្តលេខ</th>
                    <th className="py-2.5 px-3 border border-slate-700 text-left min-w-[130px]">គោត្តនាម-នាម</th>
                    <th className="py-2.5 px-2 border border-slate-700 w-14">ភេទ</th>

                    {/* Subject Headers with Multipliers */}
                    {subjects.map((sub) => (
                      <th
                        key={sub.id}
                        className="py-2 px-1 border border-slate-700 min-w-[85px]"
                      >
                        <div className="font-bold truncate">{sub.name}</div>
                        <div className="text-[10px] text-amber-300 font-mono mt-0.5">
                          ពិន្ទុ:{sub.maxScore} (×{sub.coefficient})
                        </div>
                      </th>
                    ))}

                    {/* Calculated Result Columns */}
                    <th className="py-2.5 px-2 border border-slate-700 bg-blue-900/80 min-w-[70px]">សរុប</th>
                    <th className="py-2.5 px-2 border border-slate-700 bg-blue-900/80 min-w-[70px]">មធ្យមភាគ</th>
                    <th className="py-2.5 px-2 border border-slate-700 bg-indigo-900/80 min-w-[105px]">និទ្ទេស</th>
                    <th className="py-2.5 px-2 border border-slate-700 bg-amber-900/80 min-w-[65px]">ចំណាត់ថ្នាក់</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {calculatedResults.length === 0 ? (
                    <tr>
                      <td colSpan={subjects.length + 8} className="py-12 text-center text-slate-400">
                        <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        មិនមានសិស្សក្នុងថ្នាក់នេះទេ
                      </td>
                    </tr>
                  ) : (
                    calculatedResults.map((item, idx) => {
                      const stu = item.student;
                      const isTopRank = item.subjectRank <= 3;

                      return (
                        <tr
                          key={stu.id}
                          className={`hover:bg-blue-50/40 transition-colors ${
                            isTopRank ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          {/* ល.រ */}
                          <td className="py-2 px-2 text-center font-bold text-slate-700 border border-slate-200 bg-slate-50">
                            {toKhmerNum(idx + 1)}
                          </td>

                          {/* អត្តលេខ */}
                          <td className="py-2 px-2 font-mono text-[11px] font-bold text-slate-700 border border-slate-200 text-center">
                            {stu.studentCode}
                          </td>

                          {/* ឈ្មោះខ្មែរ */}
                          <td className="py-2 px-3 border border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                            {stu.nameKh}
                          </td>

                          {/* ភេទ */}
                          <td className="py-2 px-1 text-center border border-slate-200">
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

                          {/* Subject Score Inputs */}
                          {subjects.map((sub) => {
                            const scoreVal = item.scores[sub.id];

                            return (
                              <td
                                key={sub.id}
                                className="p-1 border border-slate-200 text-center"
                              >
                                <input
                                  type="number"
                                  min="0"
                                  max={sub.maxScore}
                                  step="0.5"
                                  value={scoreVal !== undefined ? scoreVal : ''}
                                  placeholder="-"
                                  onChange={(e) => handleScoreChange(stu.id, sub.id, e.target.value)}
                                  className="w-full text-center font-bold font-mono py-1 px-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white bg-transparent text-xs"
                                />
                              </td>
                            );
                          })}

                          {/* ពិន្ទុសរុប (Weighted Total) */}
                          <td className="py-2 px-2 text-center font-mono font-black text-slate-900 border border-slate-200 bg-blue-50/50">
                            {item.totalWeighted}
                          </td>

                          {/* មធ្យមភាគ */}
                          <td className="py-2 px-2 text-center font-mono font-black text-blue-700 border border-slate-200 bg-blue-50/70">
                            {item.average}
                          </td>

                          {/* និទ្ទេស (A, B, C, D, E, F) */}
                          <td className="py-2 px-2 text-center border border-slate-200 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${item.subjectMention.badgeClass}`}
                            >
                              {item.subjectMention.khmerLabel}
                            </span>
                          </td>

                          {/* ចំណាត់ថ្នាក់ */}
                          <td className="py-2 px-2 text-center font-black border border-slate-200 bg-slate-50">
                            {isTopRank ? (
                              <span className="inline-flex items-center text-amber-700 font-black">
                                🏆 {toKhmerNum(item.subjectRank)}
                              </span>
                            ) : (
                              <span className="text-slate-700">{toKhmerNum(item.subjectRank)}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: Combined 30% Continuous + 70% Subject Exam Report */}
      {viewMode === 'combined' && (
        <div className="space-y-4">
          {/* Header Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3 no-print">
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-black text-slate-800 flex items-center">
                  <Award className="w-6 h-6 text-emerald-600 mr-2" />
                  តារាងពិន្ទុរួម (៣០% វាយតម្លៃបន្ត + ៧០% ប្រឡងមុខវិជ្ជា)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                រួមបញ្ចូលពិន្ទុវាយតម្លៃបន្ត (វត្តមាន [-២ពិន្ទុ/អវត្តមាន] + ១៥នាទី + App = ៣០%) ជាមួយមធ្យមភាគប្រឡងគ្រប់មុខវិជ្ជា (៧០%)
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200 px-2 py-1">
                <label className="text-xs font-bold text-slate-600">ខែ៖</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white border border-slate-300 font-bold text-xs rounded-lg px-2 py-1 text-slate-800 cursor-pointer shadow-2xs outline-none"
                >
                  {KHMER_MONTHS.map((m) => (
                    <option key={m} value={m}>
                      ខែ {m}
                    </option>
                  ))}
                  <option value="ឆមាសទី១">ប្រឡងឆមាសទី ១</option>
                  <option value="ឆមាសទី២">ប្រឡងឆមាសទី ២</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleSyncAttendance}
                className="inline-flex items-center px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors cursor-pointer shadow-2xs"
                title="ស្រង់អវត្តមានស្វ័យប្រវត្តិ"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                ស្រង់វត្តមាន
              </button>

              <button
                type="button"
                onClick={handleExportCombinedExcel}
                className="inline-flex items-center px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
                Excel
              </button>

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

              <button
                type="button"
                onClick={handleSaveScores}
                className="inline-flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                {savedSuccess ? 'បានរក្សាទុក!' : 'រក្សាទុក'}
              </button>
            </div>
          </div>

          {/* Combined Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-auto max-h-[72vh] table-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-20 shadow-xs print:static print:table-header-group">
                  <tr className="bg-slate-900 text-white font-bold text-center">
                    <th className="py-2.5 px-2 border border-slate-700 w-10">ល.រ</th>
                    <th className="py-2.5 px-2 border border-slate-700 w-24">អត្តលេខ</th>
                    <th className="py-2.5 px-3 border border-slate-700 text-left min-w-[130px]">គោត្តនាម-នាម</th>
                    <th className="py-2.5 px-2 border border-slate-700 w-14">ភេទ</th>

                    {/* Subject Columns */}
                    {subjects.map((sub) => (
                      <th
                        key={sub.id}
                        className="py-2 px-1 border border-slate-700 min-w-[75px]"
                      >
                        <div className="truncate">{sub.name}</div>
                        <div className="text-[10px] text-amber-300 font-mono">×{sub.coefficient}</div>
                      </th>
                    ))}

                    {/* Subtotal Exam */}
                    <th className="py-2.5 px-2 border border-slate-700 bg-blue-950 min-w-[75px]">
                      <div>សរុបប្រឡង</div>
                    </th>
                    {/* Exam 70% */}
                    <th className="py-2.5 px-2 border border-slate-700 bg-purple-900 min-w-[85px]">
                      <div>ប្រឡង (៧០%)</div>
                    </th>
                    {/* Continuous 30% */}
                    <th className="py-2.5 px-2 border border-slate-700 bg-indigo-900 min-w-[90px]">
                      <div>វាយតម្លៃ (៣០%)</div>
                      <div className="text-[9px] text-amber-300">វត្តមាន+១៥ន.+App</div>
                    </th>
                    {/* Combined Final 100% */}
                    <th className="py-2.5 px-2 border border-slate-700 bg-emerald-900 min-w-[90px]">
                      <div>សរុប (១០០%)</div>
                      <div className="text-[9px] text-emerald-200">៣០% + ៧០%</div>
                    </th>
                    <th className="py-2.5 px-2 border border-slate-700 bg-slate-800 min-w-[70px]">និទ្ទេស</th>
                    <th className="py-2.5 px-2 border border-slate-700 bg-amber-900 min-w-[70px]">ចំណាត់ថ្នាក់</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {calculatedResults.length === 0 ? (
                    <tr>
                      <td colSpan={subjects.length + 10} className="py-12 text-center text-slate-400">
                        <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        មិនមានសិស្សក្នុងថ្នាក់នេះទេ
                      </td>
                    </tr>
                  ) : (
                    calculatedResults.map((item, idx) => {
                      const stu = item.student;
                      const isTopRank = item.rank <= 3;

                      return (
                        <tr
                          key={stu.id}
                          className={`hover:bg-blue-50/40 transition-colors ${
                            isTopRank ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          <td className="py-2 px-2 text-center font-bold text-slate-700 border border-slate-200 bg-slate-50">
                            {toKhmerNum(idx + 1)}
                          </td>
                          <td className="py-2 px-2 font-mono text-[11px] font-bold text-slate-700 border border-slate-200 text-center">
                            {stu.studentCode}
                          </td>
                          <td className="py-2 px-3 border border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                            {stu.nameKh}
                          </td>
                          <td className="py-2 px-1 text-center border border-slate-200">
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

                          {/* Subject Inputs */}
                          {subjects.map((sub) => {
                            const sc = item.scores[sub.id];
                            return (
                              <td key={sub.id} className="p-1 border border-slate-200 text-center font-mono">
                                <input
                                  type="number"
                                  min="0"
                                  max={sub.maxScore}
                                  step="0.5"
                                  value={sc !== undefined ? sc : ''}
                                  placeholder="-"
                                  onChange={(e) => handleScoreChange(stu.id, sub.id, e.target.value)}
                                  className="w-full text-center font-mono py-1 px-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent text-xs"
                                />
                              </td>
                            );
                          })}

                          {/* Exam Weighted Total */}
                          <td className="py-2 px-2 text-center font-mono font-bold text-slate-800 border border-slate-200 bg-slate-50">
                            {item.totalWeighted}
                          </td>

                          {/* Exam 70% */}
                          <td className="py-2 px-2 text-center font-mono font-bold text-purple-700 border border-slate-200 bg-purple-50/50">
                            {item.examScore70}
                          </td>

                          {/* Continuous 30% */}
                          <td className="py-2 px-2 text-center font-mono font-bold text-indigo-700 border border-slate-200 bg-indigo-50/60">
                            {item.continuousTotal30}
                          </td>

                          {/* Final Combined Total 100% */}
                          <td className="py-2 px-2 text-center font-mono font-black text-emerald-800 border border-slate-200 bg-emerald-50/70 text-xs sm:text-[13px]">
                            {item.finalCombinedTotal}
                          </td>

                          {/* Mention */}
                          <td className="py-2 px-2 text-center border border-slate-200 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${item.combinedMention.badgeClass}`}
                            >
                              {item.combinedMention.khmerLabel}
                            </span>
                          </td>

                          {/* Rank */}
                          <td className="py-2 px-2 text-center font-black border border-slate-200 bg-slate-50">
                            {isTopRank ? (
                              <span className="inline-flex items-center text-amber-700 font-black">
                                🏆 {toKhmerNum(item.rank)}
                              </span>
                            ) : (
                              <span className="text-slate-700">{toKhmerNum(item.rank)}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
