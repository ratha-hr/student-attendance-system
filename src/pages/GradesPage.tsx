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
} from 'lucide-react';
import type { Student, ClassRoom, TeacherSettings, StudentGrade } from '../types';
import { db } from '../db/db';
import { toKhmerNum, KHMER_MONTHS } from '../utils/dateUtils';
import { PrintButton } from '../components/common/PrintButton';
import {
  resolveGradeTrack,
  getTrackSubjects,
  calculateLetterMention,
  GRADE_TRACKS,
} from '../utils/gradeCoefficients';
import * as XLSX from 'xlsx';

interface GradesPageProps {
  students: Student[];
  classes: ClassRoom[];
  settings: TeacherSettings | null;
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  onRefresh: () => void;
  onOpenGradeConfig?: () => void;
}

export const GradesPage: React.FC<GradesPageProps> = ({
  students,
  classes,
  settings,
  selectedClassId,
  onSelectClass,
  onRefresh,
  onOpenGradeConfig,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('តុលា');
  const [savedSuccess, setSavedSuccess] = useState(false);

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

  // Load existing scores from IndexedDB
  useEffect(() => {
    db.grades
      .where({ classId: activeClassId, month: selectedMonth })
      .toArray()
      .then((records) => {
        const map: Record<string, Record<string, number>> = {};
        records.forEach((r) => {
          map[r.studentId] = r.scores || {};
        });
        setScoresState(map);
      })
      .catch(console.error);
  }, [activeClassId, selectedMonth]);

  // Update a single score
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

  // Auto-fill sample realistic scores
  const handleFillSampleScores = () => {
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

  // Save scores to IndexedDB
  const handleSaveScores = async () => {
    const recordsToPut: StudentGrade[] = classStudents.map((stu) => {
      const stuScores = scoresState[stu.id] || {};
      return {
        id: `grade-${activeClassId}-${selectedMonth}-${stu.id}`,
        classId: activeClassId,
        studentId: stu.id,
        month: selectedMonth,
        academicYear: settings?.academicYear || '២០២៤-២០២៥',
        scores: stuScores,
        conduct: 'ល្អ',
      };
    });

    await db.grades.bulkPut(recordsToPut);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    onRefresh();
  };

  // Calculate totals, weighted averages, percentage, and rank according to Image 3
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
      const mention = calculateLetterMention(percentage);

      return {
        student: stu,
        scores: stuScores,
        totalWeighted: Number(totalWeighted.toFixed(2)),
        average,
        percentage,
        mention,
        enteredCount,
      };
    });

    // Sort by average descending to compute rank
    const sorted = [...list].sort((a, b) => b.average - a.average);
    const rankMap = new Map<string, number>();
    sorted.forEach((item, index) => {
      rankMap.set(item.student.id, index + 1);
    });

    return list.map((item) => ({
      ...item,
      rank: rankMap.get(item.student.id) || 1,
    }));
  }, [classStudents, scoresState, subjects, totalCoefficients]);

  // Export to Excel
  const handleExportExcel = () => {
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
      row['និទ្ទេស'] = item.mention.khmerLabel;
      row['ចំណាត់ថ្នាក់'] = item.rank;

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `ពិន្ទុ_${selectedMonth}`);
    const fileName = `តារាងពិន្ទុ_${currentClass?.name || 'ថ្នាក់'}_ខែ${selectedMonth}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner and Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-black text-slate-800 flex items-center">
              <GraduationCap className="w-6 h-6 text-blue-600 mr-2" />
              ពិន្ទុសិស្សប្រចាំខែ ({currentClass?.name || 'ថ្នាក់រៀន'})
            </h2>
            <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-200">
              📚 កម្រិត៖ {currentTrackDef?.label || currentClass?.name}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            គិតមេគុណ និងពិន្ទុអតិបរមាតាមស្តង់ដារក្រសួងអប់រំ (រូបទី៣) គណនាមធ្យមភាគ និទ្ទេស (A-F) និងចំណាត់ថ្នាក់ស្វ័យប្រវត្តិ
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Switcher */}
          <div className="flex items-center space-x-1.5">
            <label className="text-xs font-bold text-slate-600">ខែ៖</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-300 font-bold text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-800 cursor-pointer shadow-2xs"
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
            onClick={handleFillSampleScores}
            className="inline-flex items-center px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors cursor-pointer"
            title="បំពេញពិន្ទុសាកល្បងដោយស្វ័យប្រវត្តិ"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            បំពេញពិន្ទុសាកល្បង
          </button>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
            ទាញចេញ Excel
          </button>

          {/* Print with Orientation Selector */}
          <PrintButton defaultOrientation="landscape" label="បោះពុម្ព" />

          {/* Save Scores */}
          <button
            onClick={handleSaveScores}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {savedSuccess ? 'បានរក្សាទុក!' : 'រក្សាទុកពិន្ទុ'}
          </button>
        </div>
      </div>

      {/* Grade Subject Multipliers Info Bar matching Image 3 */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 no-print flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs sm:text-sm">
            <Calculator className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              មុខវិជ្ជា & មេគុណសម្រាប់ {currentTrackDef?.label || currentClass?.name} (សរុប {subjects.length} មុខវិជ្ជា | ផលបូកមេគុណ: {totalCoefficients})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
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
            onClick={onOpenGradeConfig}
            className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 shadow-2xs whitespace-nowrap cursor-pointer transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 mr-1 text-amber-700" />
            កែប្រែមេគុណ & ពិន្ទុអតិបរមា
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
            <thead className="sticky top-0 z-20 shadow-xs">
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
                  const isTopRank = item.rank <= 3;

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
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${item.mention.badgeClass}`}
                        >
                          {item.mention.khmerLabel}
                        </span>
                      </td>

                      {/* ចំណាត់ថ្នាក់ */}
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
