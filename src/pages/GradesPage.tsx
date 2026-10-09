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
} from 'lucide-react';
import type { Student, ClassRoom, TeacherSettings, StudentGrade } from '../types';
import { db } from '../db/db';
import { toKhmerNum, KHMER_MONTHS } from '../utils/dateUtils';
import * as XLSX from 'xlsx';

interface GradesPageProps {
  students: Student[];
  classes: ClassRoom[];
  settings: TeacherSettings | null;
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  onRefresh: () => void;
}

interface SubjectConfig {
  id: string;
  name: string;
  coefficient: number; // មេគុណ
  maxScore: number;
}

// MoEYS Standard Subject Coefficients by Grade Level
function getSubjectsByGrade(gradeStr: string): SubjectConfig[] {
  const g = parseInt(gradeStr, 10);

  if (g >= 10) {
    // Upper Secondary (វិទ្យាល័យ ១០, ១១, ១២)
    return [
      { id: 'math', name: 'គណិតវិទ្យា', coefficient: 2, maxScore: 100 },
      { id: 'physics', name: 'រូបវិទ្យា', coefficient: 2, maxScore: 100 },
      { id: 'chem', name: 'គីមីវិទ្យា', coefficient: 2, maxScore: 100 },
      { id: 'bio', name: 'ជីវវិទ្យា', coefficient: 2, maxScore: 100 },
      { id: 'khmer', name: 'ភាសាខ្មែរ', coefficient: 1, maxScore: 100 },
      { id: 'english', name: 'ភាសាអង់គ្លេស', coefficient: 1, maxScore: 100 },
      { id: 'history', name: 'ប្រវត្តិវិទ្យា', coefficient: 1, maxScore: 100 },
    ];
  }

  // Lower Secondary (អនុវិទ្យាល័យ ៧, ៨, ៩)
  return [
    { id: 'math', name: 'គណិតវិទ្យា', coefficient: 2, maxScore: 100 },
    { id: 'khmer', name: 'ភាសាខ្មែរ', coefficient: 2, maxScore: 100 },
    { id: 'physics', name: 'រូបវិទ្យា', coefficient: 1, maxScore: 100 },
    { id: 'chem', name: 'គីមីវិទ្យា', coefficient: 1, maxScore: 100 },
    { id: 'bio', name: 'ជីវវិទ្យា', coefficient: 1, maxScore: 100 },
    { id: 'english', name: 'ភាសាអង់គ្លេស', coefficient: 1, maxScore: 100 },
    { id: 'history', name: 'ប្រវត្តិវិទ្យា', coefficient: 1, maxScore: 100 },
    { id: 'geo', name: 'ភូមិវិទ្យា', coefficient: 1, maxScore: 100 },
  ];
}

// Calculate Khmer Grade Letter (និទ្ទេស)
function getMention(avg: number): { grade: string; color: string; label: string } {
  if (avg >= 85) return { grade: 'A', color: 'text-emerald-700 bg-emerald-100', label: 'ល្អប្រសើរ' };
  if (avg >= 75) return { grade: 'B', color: 'text-blue-700 bg-blue-100', label: 'ល្អណាស់' };
  if (avg >= 65) return { grade: 'C', color: 'text-cyan-700 bg-cyan-100', label: 'ល្អ' };
  if (avg >= 55) return { grade: 'D', color: 'text-amber-700 bg-amber-100', label: 'ល្អបង្គួរ' };
  if (avg >= 50) return { grade: 'E', color: 'text-orange-700 bg-orange-100', label: 'មធ្យម' };
  return { grade: 'F', color: 'text-rose-700 bg-rose-100', label: 'ខ្សោយ' };
}

export const GradesPage: React.FC<GradesPageProps> = ({
  students,
  classes,
  settings,
  selectedClassId,
  onSelectClass,
  onRefresh,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('តុលា');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Active class
  const activeClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
  const currentClass = classes.find((c) => c.id === activeClassId);

  // Filter students strictly by active class
  const classStudents = useMemo(() => {
    return students
      .filter((s) => s.classId === activeClassId)
      .sort((a, b) => a.rollNo - b.rollNo);
  }, [students, activeClassId]);

  // Subject configs with multipliers based on grade level
  const subjects = useMemo(() => {
    return getSubjectsByGrade(currentClass?.grade || '៧');
  }, [currentClass?.grade]);

  const totalCoefficients = useMemo(() => {
    return subjects.reduce((sum, s) => sum + s.coefficient, 0);
  }, [subjects]);

  // Scores map: studentId -> { [subjectId]: number }
  const [scoresState, setScoresState] = useState<Record<string, Record<string, number>>>({});

  // Load existing scores from db
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
    const val = value === '' ? 0 : Math.min(100, Math.max(0, Number(value)));
    setScoresState((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectId]: val,
      },
    }));
  };

  // Auto-fill sample realistic scores for rapid testing
  const handleFillSampleScores = () => {
    const newScores: Record<string, Record<string, number>> = {};
    classStudents.forEach((stu, idx) => {
      newScores[stu.id] = {};
      subjects.forEach((subj) => {
        // Base score varied by student index and subject
        const base = 60 + ((idx * 13 + subj.name.length * 7) % 38);
        newScores[stu.id][subj.id] = Math.min(100, Math.max(45, base));
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

  // Calculate totals, weighted averages, and rank
  const calculatedResults = useMemo(() => {
    const list = classStudents.map((stu) => {
      const stuScores = scoresState[stu.id] || {};
      let totalWeighted = 0;
      let enteredCount = 0;

      subjects.forEach((subj) => {
        const sc = stuScores[subj.id] ?? 0;
        if (stuScores[subj.id] !== undefined) enteredCount++;
        totalWeighted += sc * subj.coefficient;
      });

      const average = totalCoefficients > 0 ? Number((totalWeighted / totalCoefficients).toFixed(2)) : 0;
      const mention = getMention(average);

      return {
        student: stu,
        scores: stuScores,
        totalWeighted,
        average,
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
        const score = item.scores[subj.id] ?? 0;
        row[`${subj.name} (x${subj.coefficient})`] = score;
      });

      row['ពិន្ទុសរុប (គុណមេគុណ)'] = item.totalWeighted;
      row['មធ្យមភាគ'] = item.average;
      row['ចំណាត់ថ្នាក់'] = item.rank;
      row['និទ្ទេស'] = item.mention.grade;
      row['ការវាយតម្លៃ'] = item.mention.label;

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `ពិន្ទុខែ${selectedMonth}`);
    XLSX.writeFile(wb, `តារាងពិន្ទុ_${currentClass?.name}_ខែ${selectedMonth}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner and Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center">
            <GraduationCap className="w-6 h-6 text-blue-600 mr-2" />
            ពិន្ទុសិស្សប្រចាំខែ ({currentClass?.name || 'ថ្នាក់រៀន'})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            គិតមេគុណពិន្ទុតាមថ្នាក់ (កម្រិតថ្នាក់ទី {toKhmerNum(currentClass?.grade || '៧')}) រួចគណនាពិន្ទុសរុប មធ្យមភាគ និងចំណាត់ថ្នាក់ដោយស្វ័យប្រវត្តិ
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Class Switcher */}
          {/* Active Class Badge (Controlled by top Navbar) */}
          <span className="inline-flex items-center px-2.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-200">
            📚 {currentClass?.name || 'ថ្នាក់រៀន'}
          </span>

          {/* Month Switcher */}
          <div className="flex items-center space-x-1.5">
            <label className="text-xs font-bold text-slate-600">ខែ៖</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-300 font-bold text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-800 cursor-pointer shadow-2xs"
            >
              {['តុលា', 'វិច្ឆិកា', 'ធ្នូ', 'មករា', 'ឆមាសទី១', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'ឆមាសទី២'].map((m) => (
                <option key={m} value={m}>
                  ខែ {m}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Sample Scores Fill */}
          <button
            onClick={handleFillSampleScores}
            className="inline-flex items-center px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors cursor-pointer"
            title="បំពេញពិន្ទុគំរូសាកល្បងដោយស្វ័យប្រវត្តិ"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            បំពេញពិន្ទុគំរូ
          </button>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
            Excel
          </button>

          {/* Save Button */}
          <button
            onClick={handleSaveScores}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            រក្សាទុកពិន្ទុ
          </button>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            បោះពុម្ព
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center shadow-xs animate-fade-in no-print">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
          បានរក្សាទុកពិន្ទុសិស្សប្រចាំខែ {selectedMonth} ដោយជោគជ័យ!
        </div>
      )}

      {/* Info Pill: Subject Coefficients in this Class */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 shadow-2xs no-print">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-700">មេគុណមុខវិជ្ជា (ថ្នាក់ទី {toKhmerNum(currentClass?.grade || '៧')})៖</span>
          {subjects.map((s) => (
            <span
              key={s.id}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                s.name === 'គណិតវិទ្យា'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300 font-bold'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {s.name} <span className="font-mono text-blue-600 font-black">×{toKhmerNum(s.coefficient)}</span>
            </span>
          ))}
          <span className="text-slate-500 font-bold">
            (មេគុណសរុប៖ {toKhmerNum(totalCoefficients)})
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-medium">
          គ្រូបង្រៀន៖ <span className="font-bold text-slate-800">{settings?.teacherName || 'ហ៊ុន រដ្ឋា'}</span> (មុខវិជ្ជា៖ {settings?.specialtySubject || 'គណិតវិទ្យា'})
        </div>
      </div>

      {/* Official Print Header */}
      <div className="hidden print:block text-center my-4">
        <h3 className="font-moul text-base">ព្រះរាជាណាចក្រកម្ពុជា</h3>
        <h4 className="font-moul text-sm">ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
        <div className="w-24 h-0.5 bg-black mx-auto my-1.5" />
        <div className="flex justify-between items-center text-xs mt-3 px-2">
          <div className="text-left">
            <p className="font-bold">{settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}</p>
            <p>គ្រូបង្រៀន៖ {settings?.teacherName || 'ហ៊ុន រដ្ឋា'}</p>
            <p>មុខវិជ្ជា៖ {settings?.specialtySubject || 'គណិតវិទ្យា'}</p>
          </div>
          <div className="text-center font-moul text-base">
            តារាងស្រង់ពិន្ទុ និងចំណាត់ថ្នាក់សិស្សប្រចាំខែ {selectedMonth}
            <p className="font-sans text-xs font-bold text-slate-700">{currentClass?.name}</p>
          </div>
          <div className="text-right">
            <p>សិស្សសរុប៖ {toKhmerNum(classStudents.length)} នាក់</p>
            <p>ឆ្នាំសិក្សា៖ {settings?.academicYear || '២០២៤-២០២៥'}</p>
          </div>
        </div>
      </div>

      {/* Main Grades Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[72vh]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-slate-100 shadow-xs">
              <tr className="border-b border-slate-300 text-slate-700 font-bold">
                <th className="py-2.5 px-2 text-center w-10 border-r border-slate-200 sticky left-0 bg-slate-100 z-30">ល.រ</th>
                <th className="py-2.5 px-2.5 w-24 border-r border-slate-200 sticky left-10 bg-slate-100 z-30">អត្តលេខ</th>
                <th className="py-2.5 px-3 min-w-[150px] border-r border-slate-200 sticky left-34 bg-slate-100 z-30">គោត្តនាម-នាម</th>
                <th className="py-2.5 px-2 text-center w-12 border-r border-slate-300">ភេទ</th>

                {/* Subject Columns */}
                {subjects.map((subj) => (
                  <th
                    key={subj.id}
                    className={`py-2 px-2 text-center min-w-[70px] border-r border-slate-200 ${
                      subj.name === 'គណិតវិទ្យា' ? 'bg-blue-50/80 text-blue-900 font-extrabold' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span>{subj.name}</span>
                      <span className="text-[10px] text-blue-600 font-black">×{toKhmerNum(subj.coefficient)}</span>
                    </div>
                  </th>
                ))}

                {/* Calculated Result Columns */}
                <th className="py-2.5 px-2.5 text-center min-w-[90px] bg-slate-200 text-slate-800 font-black border-r border-slate-300">
                  ពិន្ទុសរុប
                </th>
                <th className="py-2.5 px-2.5 text-center min-w-[80px] bg-blue-100 text-blue-900 font-black border-r border-slate-300">
                  មធ្យមភាគ
                </th>
                <th className="py-2.5 px-2 text-center w-14 bg-amber-100 text-amber-900 font-black border-r border-slate-300">
                  ចំណាត់ថ្នាក់
                </th>
                <th className="py-2.5 px-2 text-center w-14 bg-slate-100 text-slate-800 font-black">
                  និទ្ទេស
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {calculatedResults.map((item, idx) => {
                const s = item.student;
                const isTop3 = item.rank <= 3 && item.average > 0;

                return (
                  <tr
                    key={s.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isTop3 ? 'bg-amber-50/30' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    <td className="py-2 px-2 text-center font-bold text-slate-600 border-r border-slate-200 sticky left-0 bg-inherit z-10">
                      {toKhmerNum(s.rollNo)}
                    </td>
                    <td className="py-2 px-2.5 font-mono text-[11px] text-slate-500 border-r border-slate-200 sticky left-10 bg-inherit z-10">
                      {s.studentCode}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200 sticky left-34 bg-inherit z-10 whitespace-nowrap">
                      {s.nameKh}
                      {isTop3 && (
                        <span className="ml-1.5 text-amber-500 text-xs" title={`ចំណាត់ថ្នាក់លេខ ${toKhmerNum(item.rank)}`}>
                          🏆
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center font-medium border-r border-slate-300">
                      <span className={s.gender === 'ស្រី' ? 'text-pink-600 font-bold' : 'text-blue-600'}>
                        {s.gender}
                      </span>
                    </td>

                    {/* Subject Inputs */}
                    {subjects.map((subj) => {
                      const val = item.scores[subj.id] ?? '';
                      const isMath = subj.name === 'គណិតវិទ្យា';

                      return (
                        <td
                          key={subj.id}
                          className={`py-1 px-1 text-center border-r border-slate-200 ${
                            isMath ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={val === 0 ? '0' : val || ''}
                            onChange={(e) => handleScoreChange(s.id, subj.id, e.target.value)}
                            className="w-14 text-center py-1 text-xs font-semibold rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            placeholder="0"
                          />
                        </td>
                      );
                    })}

                    {/* Total Weighted Score */}
                    <td className="py-2 px-2.5 text-center font-black text-slate-800 bg-slate-50 border-r border-slate-300">
                      {toKhmerNum(item.totalWeighted)}
                    </td>

                    {/* Weighted Average */}
                    <td className="py-2 px-2.5 text-center font-black text-blue-700 bg-blue-50/50 border-r border-slate-300">
                      {toKhmerNum(item.average)}
                    </td>

                    {/* Rank */}
                    <td className="py-2 px-2 text-center font-black text-amber-800 bg-amber-50/50 border-r border-slate-300">
                      {item.average > 0 ? toKhmerNum(item.rank) : '-'}
                    </td>

                    {/* Mention */}
                    <td className="py-2 px-2 text-center">
                      {item.average > 0 ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${item.mention.color}`}>
                          {item.mention.grade}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Signatures for Printing */}
      <div className="hidden print:grid grid-cols-2 gap-8 text-center text-xs mt-12">
        <div>
          <p className="font-bold">បានឃើញ និងឯកភាព</p>
          <p className="font-bold text-sm mt-1">នាយកវិទ្យាល័យ</p>
          <div className="h-20" />
          <p className="font-bold">{settings?.principalName || 'នាយកសាលា'}</p>
        </div>
        <div>
          <p>ថ្ងៃ................ ទី........ ខែ........ ឆ្នាំ ២០២...</p>
          <p className="font-bold text-sm mt-1">គ្រូបង្រៀនទទួលបន្ទុក</p>
          <div className="h-20" />
          <p className="font-bold">{settings?.teacherName || 'ហ៊ុន រដ្ឋា'}</p>
        </div>
      </div>
    </div>
  );
};
