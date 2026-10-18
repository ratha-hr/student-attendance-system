import React, { useMemo, useState } from 'react';
import {
  CalendarCheck2,
  Save,
  Printer,
  FileSpreadsheet,
  Download,
  Users,
  Award,
  Sparkles,
  Calculator,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpenCheck,
  TrendingUp,
  Undo2,
  Redo2,
} from 'lucide-react';
import type { Student, ClassRoom, TeacherSettings, AttendanceRecord, StudentGrade } from '../types';
import { db } from '../db/db';
import { toKhmerNum, KHMER_MONTHS } from '../utils/dateUtils';
import { PrintButton } from '../components/common/PrintButton';
import { useUndoRedo } from '../context/UndoRedoContext';
import { calculateLetterMention, type SubjectScoreRule } from '../utils/gradeCoefficients';
import * as XLSX from 'xlsx';

export interface ContinuousScoreData {
  absentCount: number;
  attendanceScore: number;
  quiz15mScore: number;
  appScore: number;
}

interface ContinuousAssessmentTableProps {
  students: Student[];
  classes?: ClassRoom[];
  currentClass: ClassRoom | undefined;
  activeClassId: string;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  attendanceRecords: AttendanceRecord[];
  settings: TeacherSettings | null;
  subjects: SubjectScoreRule[];
  scoresState: Record<string, Record<string, number>>;
  continuousState: Record<string, ContinuousScoreData>;
  onContinuousChange: (studentId: string, field: keyof ContinuousScoreData, value: number) => void;
  onSyncAttendance: () => void;
  onFillSampleContinuous: () => void;
  onSaveScores: () => Promise<void>;
  savedSuccess: boolean;
}

export const ContinuousAssessmentTable: React.FC<ContinuousAssessmentTableProps> = ({
  students,
  classes,
  currentClass,
  activeClassId,
  selectedMonth,
  onSelectMonth,
  attendanceRecords,
  settings,
  subjects,
  scoresState,
  continuousState,
  onContinuousChange,
  onSyncAttendance,
  onFillSampleContinuous,
  onSaveScores,
  savedSuccess,
}) => {
  const [showFormulaGuide, setShowFormulaGuide] = useState(true);
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  const isAllClasses = activeClassId === 'ALL' || !activeClassId;

  // Filter class students (Support All Classes properly)
  const classStudents = useMemo(() => {
    if (isAllClasses) {
      return [...students].sort((a, b) => {
        const classA = classes?.find((c) => c.id === a.classId)?.name || '';
        const classB = classes?.find((c) => c.id === b.classId)?.name || '';
        if (classA !== classB) return classA.localeCompare(classB);
        return (a.rollNo || 0) - (b.rollNo || 0);
      });
    }
    return students
      .filter((s) => s.classId === activeClassId)
      .sort((a, b) => (a.rollNo || 0) - (b.rollNo || 0));
  }, [students, isAllClasses, activeClassId, classes]);

  // Compute calculated continuous & combined 30% + 70% results
  const calculatedRows = useMemo(() => {
    const list = classStudents.map((stu) => {
      const data = continuousState[stu.id] || {
        absentCount: 0,
        attendanceScore: 10,
        quiz15mScore: 0,
        appScore: 0,
      };

      const attScore = Math.min(10, Math.max(0, data.attendanceScore ?? 10));
      const qScore = Math.min(10, Math.max(0, data.quiz15mScore ?? 0));
      const aScore = Math.min(10, Math.max(0, data.appScore ?? 0));

      // Continuous Total = Attendance + 15min + App (Max: 30)
      const assessmentTotal = Number((attScore + qScore + aScore).toFixed(2));
      // 30% contribution is exactly the assessmentTotal (out of 30)
      const score30 = assessmentTotal;

      // Subject exam scores
      const stuScores = scoresState[stu.id] || {};
      let totalWeighted = 0;
      let totalCoeffs = 0;
      let totalMaxWeighted = 0;

      subjects.forEach((subj) => {
        const sc = stuScores[subj.id] ?? 0;
        totalWeighted += sc * subj.coefficient;
        totalCoeffs += subj.coefficient;
        totalMaxWeighted += subj.maxScore * subj.coefficient;
      });

      const subjectPercentage = totalMaxWeighted > 0 ? (totalWeighted / totalMaxWeighted) * 100 : 0;
      // 70% contribution from subject exams
      const examScore70 = Number(((subjectPercentage * 70) / 100).toFixed(2));

      // Combined Final Monthly Score (30% Continuous + 70% Exam = Out of 100)
      const finalTotal = Number((score30 + examScore70).toFixed(2));
      const mention = calculateLetterMention(finalTotal);

      return {
        student: stu,
        absentCount: data.absentCount,
        attendanceScore: attScore,
        quiz15mScore: qScore,
        appScore: aScore,
        assessmentTotal,
        score30,
        examScore70,
        finalTotal,
        mention,
      };
    });

    // Compute ranks based on finalTotal descending
    const sorted = [...list].sort((a, b) => b.finalTotal - a.finalTotal);
    const rankMap = new Map<string, number>();
    sorted.forEach((item, index) => {
      rankMap.set(item.student.id, index + 1);
    });

    return list.map((item) => ({
      ...item,
      rank: rankMap.get(item.student.id) || 1,
    }));
  }, [classStudents, continuousState, scoresState, subjects]);

  // Overall Statistics KPI
  const stats = useMemo(() => {
    const total = calculatedRows.length;
    if (total === 0) {
      return {
        total: 0,
        avgAttendance: 0,
        avgContinuous30: 0,
        avgExam70: 0,
        avgFinal: 0,
        passedCount: 0,
        failedCount: 0,
      };
    }
    const sumAtt = calculatedRows.reduce((sum, r) => sum + r.attendanceScore, 0);
    const sum30 = calculatedRows.reduce((sum, r) => sum + r.assessmentTotal, 0);
    const sum70 = calculatedRows.reduce((sum, r) => sum + r.examScore70, 0);
    const sumFinal = calculatedRows.reduce((sum, r) => sum + r.finalTotal, 0);
    const passed = calculatedRows.filter((r) => r.finalTotal >= 50).length;

    return {
      total,
      avgAttendance: Number((sumAtt / total).toFixed(1)),
      avgContinuous30: Number((sum30 / total).toFixed(1)),
      avgExam70: Number((sum70 / total).toFixed(1)),
      avgFinal: Number((sumFinal / total).toFixed(1)),
      passedCount: passed,
      failedCount: total - passed,
    };
  }, [calculatedRows]);

  // Export Continuous Assessment to Excel
  const handleExportExcel = () => {
    const data = calculatedRows.map((item) => {
      return {
        'លេខរៀង': item.student.rollNo,
        'អត្តលេខ': item.student.studentCode,
        'គោត្តនាម-នាម': item.student.nameKh,
        'ភេទ': item.student.gender,
        'អវត្តមាន (លើក)': item.absentCount,
        'ពិន្ទុវត្តមាន (១០-អវត្តមាន×២)': item.attendanceScore,
        'តេស្ត ១៥នាទី (ពិន្ទុអតិ. ១០)': item.quiz15mScore,
        'ពិន្ទុ App (ពិន្ទុអតិ. ១០)': item.appScore,
        'សរុបវាយតម្លៃបន្ត (៣០%)': item.assessmentTotal,
        'ពិន្ទុ ៧០% នៃមុខវិជ្ជា': item.examScore70,
        'ពិន្ទុសរុបប្រចាំខែ (១០០%)': item.finalTotal,
        'និទ្ទេស': item.mention.khmerLabel,
        'ចំណាត់ថ្នាក់': item.rank,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `វាយតម្លៃបន្ត_${selectedMonth}`);
    const fileName = `បញ្ជីពិន្ទុវត្តមាន_និងវាយតម្លៃបន្ត_${currentClass?.name || 'ថ្នាក់'}_ខែ${selectedMonth}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner and Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3 no-print">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center">
              <BookOpenCheck className="w-6 h-6 text-indigo-600 mr-2" />
              បញ្ជីពិន្ទុវត្តមាន & ការវាយតម្លៃបន្ត (៣០%)
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200">
              {currentClass?.name || 'ថ្នាក់រៀន'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            វត្តមាន (អវត្តមានម្តងដក ២ពិន្ទុ) + តេស្ត ១៥នាទី + ពិន្ទុ App | ពិន្ទុសរុបយក ៣០% នៃពិន្ទុគ្រប់មុខវិជ្ជា
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Switcher */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200 px-2 py-1">
            <label className="text-xs font-bold text-slate-600">ខែ៖</label>
            <select
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
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

          {/* Sync Attendance Button */}
          <button
            type="button"
            onClick={onSyncAttendance}
            className="inline-flex items-center px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors cursor-pointer shadow-2xs"
            title="អានទិន្នន័យអវត្តមានស្វ័យប្រវត្តិតាមកំណត់ត្រាវត្តមានប្រចាំខែនេះ (អវត្តមានម្តងដក ២ពិន្ទុ)"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1 text-blue-600" />
            ស្រង់វត្តមានស្វ័យប្រវត្តិ
          </button>

          {/* Fill Sample Scores Button */}
          <button
            type="button"
            onClick={onFillSampleContinuous}
            className="inline-flex items-center px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl border border-purple-200 transition-colors cursor-pointer shadow-2xs"
            title="បំពេញពិន្ទុតេស្ត ១៥នាទី និងពិន្ទុ App សាកល្បង"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" />
            បំពេញពិន្ទុសាកល្បង
          </button>

          {/* Export to Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
            title="ទាញចេញជាឯកសារ Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Excel
          </button>

          {/* Print */}
          <PrintButton defaultOrientation="landscape" label="បោះពុម្ព (A4)" />

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

          {/* Save Button */}
          <button
            type="button"
            onClick={onSaveScores}
            className="inline-flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {savedSuccess ? 'បានរក្សាទុក!' : 'រក្សាទុក'}
          </button>
        </div>
      </div>

      {/* Formula Explanation Alert Banner */}
      {showFormulaGuide && (
        <div className="bg-indigo-50/80 border border-indigo-200 p-3.5 rounded-2xl flex items-start justify-between gap-3 text-xs text-indigo-950 no-print shadow-2xs">
          <div className="flex items-start space-x-2.5">
            <Calculator className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-indigo-900">
                💡 រូបមន្តគណនាពិន្ទុវត្តមាន និងការវាយតម្លៃបន្ត (៣០%)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px] text-indigo-900/90 font-medium">
                <div className="bg-white/80 p-2 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="font-bold text-indigo-700">១. ពិន្ទុវត្តមាន (១០ ពិន្ទុ)៖</span>
                  <p className="mt-0.5">អវត្តមានម្តងដក ២ពិន្ទុ (០ ដង = ១០ពិន្ទុ, ១ ដង = ៨, ២ ដង = ៦...)</p>
                </div>
                <div className="bg-white/80 p-2 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="font-bold text-purple-700">២. តេស្ត ១៥នាទី + ពិន្ទុ App៖</span>
                  <p className="mt-0.5">តេស្តខ្លី ១៥នាទី (១០ ពិន្ទុ) + ការរៀនតាម App/កិច្ចការ (១០ ពិន្ទុ)</p>
                </div>
                <div className="bg-white/80 p-2 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="font-bold text-emerald-700">៣. ពិន្ទុសរុបប្រចាំខែ (១០០%)៖</span>
                  <p className="mt-0.5">វាយតម្លៃបន្ត (៣០%) + មធ្យមភាគប្រឡងគ្រប់មុខវិជ្ជា (៧០%) = ១០០%</p>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFormulaGuide(false)}
            className="text-indigo-400 hover:text-indigo-700 text-xs font-bold p-1 cursor-pointer"
            title="បិទការណែនាំ"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 no-print">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-bold block">សិស្សសរុប</span>
          <span className="text-lg font-black text-slate-800">{stats.total} នាក់</span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-blue-600 font-bold block">មធ្យមភាគវត្តមាន</span>
          <span className="text-lg font-black text-blue-700">{stats.avgAttendance} / 10</span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-indigo-600 font-bold block">មធ្យមវាយតម្លៃ (៣០%)</span>
          <span className="text-lg font-black text-indigo-700">{stats.avgContinuous30} / 30</span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-purple-600 font-bold block">មធ្យមប្រឡង (៧០%)</span>
          <span className="text-lg font-black text-purple-700">{stats.avgExam70} / 70</span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-emerald-600 font-bold block">មធ្យមសរុប (១០០%)</span>
          <span className="text-lg font-black text-emerald-700">{stats.avgFinal} / 100</span>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-bold block">ជាប់ / ធ្លាក់</span>
          <span className="text-sm font-black text-slate-800">
            <span className="text-emerald-600">{stats.passedCount} ជាប់</span> / <span className="text-rose-600">{stats.failedCount} ធ្លាក់</span>
          </span>
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
            <p>ខែ៖ {selectedMonth}</p>
          </div>
        </div>
        <h2 className="font-moul text-base mt-4">
          បញ្ជីពិន្ទុវត្តមាន និងការវាយតម្លៃបន្ត (៣០%) - {isAllClasses ? `ថ្នាក់ទាំងអស់ (${classes?.length || 0} ថ្នាក់)` : (currentClass?.name || 'ថ្នាក់')}
        </h2>
        <p className="text-xs mt-1">
          វត្តមាន (អវត្តមានម្តងដក ២ពិន្ទុ) + តេស្ត ១៥នាទី + ពិន្ទុ App | ពិន្ទុសរុបយក ៣០% នៃពិន្ទុគ្រប់មុខវិជ្ជា
        </p>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-auto max-h-[72vh] table-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-20 shadow-xs print:static print:table-header-group">
              <tr className="bg-[#002060] text-white font-bold text-center">
                <th className="py-2.5 px-2 border border-blue-900/40 w-12">ល.រ</th>
                <th className="py-2.5 px-2 border border-blue-900/40 w-24">អត្តលេខ</th>
                <th className="py-2.5 px-3 border border-blue-900/40 text-left min-w-[140px]">គោត្តនាម-នាម</th>
                <th className="py-2.5 px-2 border border-blue-900/40 w-14">ភេទ</th>

                {/* Absence Count */}
                <th className="py-2.5 px-2 border border-blue-900/40 bg-blue-950/80 min-w-[95px]">
                  <div>អវត្តមាន</div>
                  <div className="text-[10px] text-blue-200 font-normal">ចំនួនថ្ងៃ</div>
                </th>

                {/* Attendance Score (-2 pts per absence) */}
                <th className="py-2.5 px-2 border border-blue-900/40 bg-indigo-900/90 min-w-[110px]">
                  <div>ពិន្ទុវត្តមាន</div>
                  <div className="text-[10px] text-amber-300 font-mono">-២ពិន្ទុ/អវត្តមាន (១០)</div>
                </th>

                {/* 15m Quiz */}
                <th className="py-2.5 px-2 border border-blue-900/40 bg-indigo-900/90 min-w-[100px]">
                  <div>តេស្ត ១៥នាទី</div>
                  <div className="text-[10px] text-amber-300 font-mono">(ពិន្ទុអតិ. ១០)</div>
                </th>

                {/* App Score */}
                <th className="py-2.5 px-2 border border-blue-900/40 bg-indigo-900/90 min-w-[100px]">
                  <div>ពិន្ទុ App</div>
                  <div className="text-[10px] text-amber-300 font-mono">(ពិន្ទុអតិ. ១០)</div>
                </th>

                {/* Continuous Total */}
                <th className="py-2.5 px-2 border border-blue-900/40 bg-blue-900 min-w-[105px]">
                  <div>សរុប (៣០%)</div>
                  <div className="text-[10px] text-emerald-300 font-mono">(អតិ. ៣០)</div>
                </th>

                {/* 70% Subject Exam */}
                <th className="py-2.5 px-2 border border-blue-900/40 bg-purple-900 min-w-[105px]">
                  <div>ប្រឡង (៧០%)</div>
                  <div className="text-[10px] text-purple-200 font-mono">គ្រប់មុខវិជ្ជា</div>
                </th>

                {/* Combined Final Total */}
                <th className="py-2.5 px-2 border border-blue-900/40 bg-emerald-900 min-w-[105px]">
                  <div>សរុបប្រចាំខែ</div>
                  <div className="text-[10px] text-emerald-200 font-mono">៣០% + ៧០% = ១០០</div>
                </th>

                {/* Mention & Rank */}
                <th className="py-2.5 px-2 border border-blue-900/40 bg-slate-900 min-w-[70px]">និទ្ទេស</th>
                <th className="py-2.5 px-2 border border-blue-900/40 bg-amber-900 min-w-[70px]">ចំណាត់ថ្នាក់</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-800">
              {calculatedRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    មិនមានសិស្សក្នុងថ្នាក់នេះទេ
                  </td>
                </tr>
              ) : (
                calculatedRows.map((item, idx) => {
                  const stu = item.student;
                  const isTopRank = item.rank <= 3;

                  return (
                    <tr
                      key={stu.id}
                      className={`hover:bg-blue-50/50 transition-colors ${
                        isTopRank ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Roll No */}
                      <td className="py-2 px-2 text-center font-bold text-slate-700 border border-slate-200 bg-slate-50">
                        {toKhmerNum(idx + 1)}
                      </td>

                      {/* Code */}
                      <td className="py-2 px-2 font-mono text-[11px] font-bold text-slate-700 border border-slate-200 text-center">
                        {stu.studentCode}
                      </td>

                      {/* Name */}
                      <td className="py-2 px-3 border border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                        {stu.nameKh}
                        {isAllClasses && (
                          <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-800 rounded font-bold">
                            {classes?.find((c) => c.id === stu.classId)?.name}
                          </span>
                        )}
                      </td>

                      {/* Gender */}
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

                      {/* Absence Count */}
                      <td className="py-1 px-2 border border-slate-200 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${
                            item.absentCount === 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.absentCount <= 2
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 font-black'
                          }`}
                        >
                          {item.absentCount} លើក
                        </span>
                      </td>

                      {/* Attendance Score (Editable, default: 10 - absent*2) */}
                      <td className="p-1 border border-slate-200 text-center">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.5"
                          value={item.attendanceScore}
                          onChange={(e) =>
                            onContinuousChange(stu.id, 'attendanceScore', Number(e.target.value))
                          }
                          className="w-full text-center font-bold font-mono py-1 px-1 rounded-lg border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white bg-slate-50 text-xs text-indigo-900"
                        />
                      </td>

                      {/* 15m Quiz Score */}
                      <td className="p-1 border border-slate-200 text-center">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.5"
                          value={item.quiz15mScore || ''}
                          placeholder="-"
                          onChange={(e) =>
                            onContinuousChange(stu.id, 'quiz15mScore', Number(e.target.value))
                          }
                          className="w-full text-center font-bold font-mono py-1 px-1 rounded-lg border border-slate-200 hover:border-slate-300 focus:border-purple-500 focus:bg-white bg-slate-50 text-xs text-purple-900"
                        />
                      </td>

                      {/* App Score */}
                      <td className="p-1 border border-slate-200 text-center">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.5"
                          value={item.appScore || ''}
                          placeholder="-"
                          onChange={(e) =>
                            onContinuousChange(stu.id, 'appScore', Number(e.target.value))
                          }
                          className="w-full text-center font-bold font-mono py-1 px-1 rounded-lg border border-slate-200 hover:border-slate-300 focus:border-purple-500 focus:bg-white bg-slate-50 text-xs text-purple-900"
                        />
                      </td>

                      {/* Continuous Assessment Total (30%) */}
                      <td className="py-2 px-2 text-center font-mono font-black text-indigo-700 border border-slate-200 bg-indigo-50/60">
                        {item.assessmentTotal}
                      </td>

                      {/* Exam Score 70% */}
                      <td className="py-2 px-2 text-center font-mono font-bold text-purple-700 border border-slate-200 bg-purple-50/50">
                        {item.examScore70}
                      </td>

                      {/* Combined Final Total (100%) */}
                      <td className="py-2 px-2 text-center font-mono font-black text-emerald-800 border border-slate-200 bg-emerald-50/70 text-xs sm:text-[13px]">
                        {item.finalTotal}
                      </td>

                      {/* Mention */}
                      <td className="py-2 px-2 text-center border border-slate-200 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${item.mention.badgeClass}`}
                        >
                          {item.mention.khmerLabel}
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
