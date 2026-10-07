import React, { useState, useMemo } from 'react';
import {
  Award,
  Printer,
  Plus,
  Save,
  Users,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import type { Student, ClassRoom, StudentGrade, TeacherSettings } from '../types';
import { db } from '../db/db';
import { toKhmerNum, KHMER_MONTHS } from '../utils/dateUtils';

interface GradesPageProps {
  students: Student[];
  classes: ClassRoom[];
  settings: TeacherSettings | null;
  selectedClassId: string;
  onRefresh: () => void;
}

export const GradesPage: React.FC<GradesPageProps> = ({
  students,
  classes,
  settings,
  selectedClassId,
  onRefresh,
}) => {
  const activeClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
  const currentClass = classes.find((c) => c.id === activeClassId);

  const [selectedMonth, setSelectedMonth] = useState('តុលា');
  const [subjects, setSubjects] = useState(['ភាសាខ្មែរ', 'គណិតវិទ្យា', 'រូបវិទ្យា', 'ភាសាអង់គ្លេស']);

  // Class students
  const classStudents = useMemo(() => {
    return students
      .filter((s) => s.classId === activeClassId)
      .sort((a, b) => a.rollNo - b.rollNo);
  }, [students, activeClassId]);

  // Local state for score entry: studentId -> { subject -> score }
  const [scoresState, setScoresState] = useState<Record<string, Record<string, number>>>(() => {
    // Generate realistic initial scores for demonstration
    const initial: Record<string, Record<string, number>> = {};
    classStudents.forEach((stu, index) => {
      const base = 75 - (index * 2);
      initial[stu.id] = {
        'ភាសាខ្មែរ': Math.min(98, Math.max(50, base + (index % 3) * 5)),
        'គណិតវិទ្យា': Math.min(95, Math.max(45, base + (index % 4) * 4)),
        'រូបវិទ្យា': Math.min(92, Math.max(50, base + (index % 2) * 6)),
        'ភាសាអង់គ្លេស': Math.min(96, Math.max(55, base + (index % 5) * 3)),
      };
    });
    return initial;
  });

  const handleScoreChange = (studentId: string, subjectName: string, val: string) => {
    const num = Math.min(100, Math.max(0, Number(val) || 0));
    setScoresState((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectName]: num,
      },
    }));
  };

  // Compute calculated table with Total, Average, and Rank
  const calculatedRows = useMemo(() => {
    const rows = classStudents.map((stu) => {
      const stuScores = scoresState[stu.id] || {};
      let total = 0;
      let count = 0;
      subjects.forEach((subj) => {
        if (stuScores[subj] !== undefined) {
          total += stuScores[subj];
          count++;
        }
      });
      const avg = count > 0 ? Number((total / count).toFixed(2)) : 0;

      let gradeLetter = 'F';
      if (avg >= 85) gradeLetter = 'A';
      else if (avg >= 75) gradeLetter = 'B';
      else if (avg >= 65) gradeLetter = 'C';
      else if (avg >= 55) gradeLetter = 'D';
      else if (avg >= 50) gradeLetter = 'E';

      return {
        student: stu,
        scores: stuScores,
        total,
        average: avg,
        gradeLetter,
        rank: 0,
      };
    });

    // Sort descending by average to compute ranks
    const sorted = [...rows].sort((a, b) => b.average - a.average);
    sorted.forEach((item, index) => {
      item.rank = index + 1;
    });

    // Return back sorted by rollNo for easy viewing
    return rows.sort((a, b) => a.student.rollNo - b.student.rollNo);
  }, [classStudents, scoresState, subjects]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center">
            <Award className="w-6 h-6 text-amber-600 mr-2" />
            ស្រង់ពិន្ទុ & ចំណាត់ថ្នាក់ ({currentClass?.name || 'ថ្នាក់រៀន'})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            គណនាផលបូក មធ្យមភាគ ចំណាត់ថ្នាក់ស្វ័យប្រវត្តិតាមខែនីមួយៗ
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Month selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs">
            <span className="font-bold text-slate-700 pl-2">ខែ៖</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              {KHMER_MONTHS.map((m) => (
                <option key={m} value={m}>
                  ខែ {m}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            បោះពុម្ព
          </button>
        </div>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block text-center my-4">
        <h3 className="font-moul text-base">ព្រះរាជាណាចក្រកម្ពុជា</h3>
        <h4 className="font-moul text-sm">ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
        <div className="w-24 h-0.5 bg-black mx-auto my-2" />
        <h2 className="font-moul text-base mt-3">
          តារាងស្រង់ពិន្ទុ និងចំណាត់ថ្នាក់ប្រចាំខែ {selectedMonth}
        </h2>
        <p className="text-xs mt-1">
          ថ្នាក់៖ {currentClass?.name} • ឆ្នាំសិក្សា៖ {settings?.academicYear} • {settings?.schoolName}
        </p>
      </div>

      {/* Grades Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] sm:text-xs">
                <th className="py-3 px-2 text-center w-12 border-r border-slate-200">ល.រ</th>
                <th className="py-3 px-3 w-40 border-r border-slate-200">គោត្តនាម-នាម</th>
                <th className="py-3 px-2 text-center w-14 border-r border-slate-200">ភេទ</th>
                {/* Subjects */}
                {subjects.map((subj) => (
                  <th
                    key={subj}
                    className="py-3 px-2 text-center w-24 border-r border-slate-200"
                  >
                    {subj}
                  </th>
                ))}
                <th className="py-3 px-2 text-center w-20 bg-blue-50 text-blue-900 border-r border-slate-200 font-bold">
                  សរុប
                </th>
                <th className="py-3 px-2 text-center w-20 bg-emerald-50 text-emerald-900 border-r border-slate-200 font-bold">
                  មធ្យមភាគ
                </th>
                <th className="py-3 px-2 text-center w-16 bg-purple-50 text-purple-900 border-r border-slate-200 font-bold">
                  និទ្ទេស
                </th>
                <th className="py-3 px-2 text-center w-20 bg-amber-50 text-amber-900 font-bold">
                  ចំណាត់ថ្នាក់
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {calculatedRows.length === 0 ? (
                <tr>
                  <td colSpan={5 + subjects.length} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    មិនមានសិស្សក្នុងថ្នាក់នេះទេ
                  </td>
                </tr>
              ) : (
                calculatedRows.map((row, index) => {
                  return (
                    <tr
                      key={row.student.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-2.5 px-2 text-center font-bold text-slate-500 border-r border-slate-200">
                        {toKhmerNum(index + 1)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                        {row.student.nameKh}
                      </td>
                      <td className="py-2.5 px-2 text-center border-r border-slate-200">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            row.student.gender === 'ស្រី'
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {row.student.gender}
                        </span>
                      </td>

                      {/* Subject score inputs */}
                      {subjects.map((subj) => (
                        <td
                          key={subj}
                          className="py-1 px-1 text-center border-r border-slate-200"
                        >
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.scores[subj] ?? ''}
                            onChange={(e) => handleScoreChange(row.student.id, subj, e.target.value)}
                            className="w-16 text-center py-1 bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-500 rounded-lg text-xs font-bold text-slate-800"
                          />
                        </td>
                      ))}

                      {/* Total */}
                      <td className="py-2.5 px-2 text-center font-extrabold text-blue-700 bg-blue-50/30 border-r border-slate-200">
                        {toKhmerNum(row.total)}
                      </td>

                      {/* Average */}
                      <td className="py-2.5 px-2 text-center font-extrabold text-emerald-700 bg-emerald-50/30 border-r border-slate-200">
                        {toKhmerNum(row.average)}
                      </td>

                      {/* Grade Letter */}
                      <td className="py-2.5 px-2 text-center font-black border-r border-slate-200 bg-purple-50/20">
                        <span
                          className={`inline-block w-6 h-6 leading-6 rounded-full text-xs text-white ${
                            row.gradeLetter === 'A'
                              ? 'bg-emerald-600'
                              : row.gradeLetter === 'B'
                              ? 'bg-blue-600'
                              : row.gradeLetter === 'C'
                              ? 'bg-amber-500'
                              : row.gradeLetter === 'D'
                              ? 'bg-orange-500'
                              : 'bg-rose-500'
                          }`}
                        >
                          {row.gradeLetter}
                        </span>
                      </td>

                      {/* Rank */}
                      <td className="py-2.5 px-2 text-center font-extrabold bg-amber-50/30">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-xs ${
                            row.rank === 1
                              ? 'bg-amber-400 text-amber-950 shadow-xs'
                              : row.rank === 2
                              ? 'bg-slate-300 text-slate-900'
                              : row.rank === 3
                              ? 'bg-amber-200 text-amber-900'
                              : 'text-slate-700'
                          }`}
                        >
                          លេខ {toKhmerNum(row.rank)}
                        </span>
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
  );
};
