import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  Calendar,
  BookOpen,
  User,
  Phone,
  Layers,
  ChevronDown,
} from 'lucide-react';
import type { ClassRoom, Student, TeacherSettings, TeachingPlan, TeachingPlanGradeRow } from '../types';
import { db } from '../db/db';
import {
  TABLE_1_MONTHS,
  TABLE_2_MONTHS,
  TABLE_3_MONTHS,
  POPULAR_SUBJECTS,
  createDefaultTeachingPlan,
  calculateTotals,
  exportTeachingPlanToExcel,
  type MonthColDef,
} from '../utils/teachingPlanUtils';

interface TeachingPlanPageProps {
  classes: ClassRoom[];
  students: Student[];
  settings: TeacherSettings | null;
  selectedClassId: string;
  onSelectClass: (classId: string) => void;
  onRefresh?: () => void;
}

export const TeachingPlanPage: React.FC<TeachingPlanPageProps> = ({
  classes,
  students,
  settings,
  selectedClassId,
  onSelectClass,
}) => {
  // Current active class
  const activeClass = useMemo(() => {
    if (selectedClassId && selectedClassId !== 'ALL') {
      return classes.find((c) => c.id === selectedClassId) || null;
    }
    return classes[0] || null;
  }, [classes, selectedClassId]);

  // Enrolled students for active class
  const classStudents = useMemo(() => {
    if (!activeClass) return [];
    return students.filter((s) => s.classId === activeClass.id);
  }, [students, activeClass]);

  const classTotal = classStudents.length > 0 ? classStudents.length : 61;
  const classFemales = classStudents.length > 0 ? classStudents.filter((s) => s.gender === 'ស្រី').length : 36;

  // Selected subject
  const [selectedSubject, setSelectedSubject] = useState<string>(
    settings?.specialtySubject || 'គណិតវិទ្យា'
  );

  // Plan state
  const [plan, setPlan] = useState<TeachingPlan>(() => {
    const saved = localStorage.getItem(`teaching_plan_${activeClass?.id || 'default'}_${settings?.specialtySubject || 'គណិតវិទ្យា'}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return createDefaultTeachingPlan(activeClass, classTotal, classFemales, settings);
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load from DB or localStorage whenever active class or subject changes
  useEffect(() => {
    const planKey = `teaching_plan_${activeClass?.id || 'default'}_${selectedSubject}`;
    const loadPlan = async () => {
      try {
        const fromDb = await db.teachingPlans
          .where('classId')
          .equals(activeClass?.id || '')
          .filter((p) => p.subject === selectedSubject)
          .first();

        if (fromDb) {
          setPlan(fromDb);
          return;
        }

        const savedLocal = localStorage.getItem(planKey);
        if (savedLocal) {
          setPlan(JSON.parse(savedLocal));
          return;
        }

        // Initialize default
        const newPlan = createDefaultTeachingPlan(activeClass, classTotal, classFemales, settings);
        newPlan.subject = selectedSubject;
        setPlan(newPlan);
      } catch (err) {
        console.error('Error loading teaching plan:', err);
      }
    };

    loadPlan();
  }, [activeClass?.id, selectedSubject]);

  // Keep total students synced if activeClass changes
  useEffect(() => {
    if (classStudents.length > 0) {
      setPlan((prev) => ({
        ...prev,
        className: activeClass?.name || prev.className,
        totalStudents: classStudents.length,
        femaleStudents: classStudents.filter((s) => s.gender === 'ស្រី').length,
      }));
    }
  }, [classStudents.length, activeClass?.name]);

  // Save plan to Dexie & localStorage
  const handleSave = async (updatedPlan: TeachingPlan = plan) => {
    try {
      const planToSave = {
        ...updatedPlan,
        updatedAt: new Date().toISOString(),
      };
      await db.teachingPlans.put(planToSave);
      const planKey = `teaching_plan_${planToSave.classId}_${planToSave.subject}`;
      localStorage.setItem(planKey, JSON.stringify(planToSave));
      showToast('រក្សាទុកទិន្នន័យផែនការបង្រៀនបានជោគជ័យ!');
    } catch (err) {
      console.error('Save failed:', err);
      showToast('បរាជ័យក្នុងការរក្សាទុក');
    }
  };

  // Cell change handler for Baseline Count
  const handleBaselineCountChange = (grade: string, count: number) => {
    setPlan((prev) => {
      const total = prev.totalStudents || 1;
      const pct = Math.round((count / total) * 100);
      const newRows = prev.rows.map((r) => {
        if (r.grade === grade) {
          return {
            ...r,
            baselineCount: count,
            baselinePct: pct,
          };
        }
        return r;
      });
      const updated = { ...prev, rows: newRows };
      handleSave(updated);
      return updated;
    });
  };

  // Cell change handler for Baseline Percentage override
  const handleBaselinePctChange = (grade: string, pct: number) => {
    setPlan((prev) => {
      const newRows = prev.rows.map((r) => (r.grade === grade ? { ...r, baselinePct: pct } : r));
      const updated = { ...prev, rows: newRows };
      handleSave(updated);
      return updated;
    });
  };

  // Cell change handler for Month columns (plan / actual)
  const handleMonthCellChange = (
    grade: string,
    monthKey: string,
    field: 'planCount' | 'planPct' | 'actualCount' | 'actualPct',
    val: number
  ) => {
    setPlan((prev) => {
      const total = prev.totalStudents || 1;
      const newRows = prev.rows.map((r) => {
        if (r.grade === grade) {
          const currentMonthly = r.monthly[monthKey] || {
            planCount: 0,
            planPct: 0,
            actualCount: 0,
            actualPct: 0,
          };
          const updatedMonthly = { ...currentMonthly, [field]: val };

          // Auto-calculate percentage if count changed
          if (field === 'planCount') {
            updatedMonthly.planPct = Math.round((val / total) * 100);
          } else if (field === 'actualCount') {
            updatedMonthly.actualPct = Math.round((val / total) * 100);
          }

          return {
            ...r,
            monthly: {
              ...r.monthly,
              [monthKey]: updatedMonthly,
            },
          };
        }
        return r;
      });

      const updated = { ...prev, rows: newRows };
      handleSave(updated);
      return updated;
    });
  };

  // Cell change handler for Year-End Target Percentage
  const handleYearEndTargetChange = (grade: string, pct: number) => {
    setPlan((prev) => {
      const newRows = prev.rows.map((r) => (r.grade === grade ? { ...r, yearEndTargetPct: pct } : r));
      const updated = { ...prev, rows: newRows };
      handleSave(updated);
      return updated;
    });
  };

  // Reset to default template from screenshot
  const handleResetToDefault = () => {
    if (window.confirm('តើលោកគ្រូ-អ្នកគ្រូចង់ផ្ទុកគំរូដើមផ្លូវការ (ដូចក្នុងរូបភាព Excel) ឡើងវិញឬទេ?')) {
      const def = createDefaultTeachingPlan(activeClass, classTotal, classFemales, settings);
      def.subject = selectedSubject;
      setPlan(def);
      handleSave(def);
      showToast('បានផ្ទុកទម្រង់គំរូដើមរួចរាល់!');
    }
  };

  // Auto-fill from actual student grades in db.grades
  const handleAutoFillFromGrades = async () => {
    if (!activeClass) return;
    try {
      const allGrades = await db.grades.where('classId').equals(activeClass.id).toArray();
      if (!allGrades || allGrades.length === 0) {
        alert(`មិនទាន់មានទិន្នន័យពិន្ទុសម្រាប់ថ្នាក់ «${activeClass.name}» ក្នុងប្រព័ន្ធនៅឡើយទេ។`);
        return;
      }

      // Map month names in grades to our keys
      const monthMap: Record<string, string> = {
        'ធ្នូ': 'dec',
        'មករា': 'jan',
        'កុម្ភៈ': 'feb',
        'មីនា': 'mar',
        'មេសា': 'apr',
        'ឧសភា': 'may',
        'មិថុនា': 'jun',
        'កក្កដា': 'jul',
      };

      let filledCount = 0;
      setPlan((prev) => {
        const total = prev.totalStudents || 1;
        const newRows = [...prev.rows];

        Object.entries(monthMap).forEach(([khMonth, mKey]) => {
          const monthRecords = allGrades.filter(
            (g) => g.month?.includes(khMonth) || g.month === khMonth
          );
          if (monthRecords.length > 0) {
            filledCount++;
            const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

            monthRecords.forEach((rec) => {
              // Get score for selected subject or finalTotal100
              const score =
                rec.scores?.[selectedSubject] ??
                rec.scores?.[selectedSubject.toLowerCase()] ??
                rec.finalTotal100 ??
                0;

              if (score >= 90) counts.A++;
              else if (score >= 80) counts.B++;
              else if (score >= 71) counts.C++;
              else if (score >= 61) counts.D++;
              else if (score >= 51) counts.E++;
              else counts.F++;
            });

            newRows.forEach((r) => {
              const c = counts[r.grade] || 0;
              const p = Math.round((c / total) * 100);
              r.monthly[mKey] = {
                ...(r.monthly[mKey] || { planCount: 0, planPct: 0 }),
                actualCount: c,
                actualPct: p,
              };
            });
          }
        });

        const updated = { ...prev, rows: newRows };
        handleSave(updated);
        return updated;
      });

      if (filledCount > 0) {
        showToast(`បានទាញយកទិន្នន័យជាក់ស្តែងចំនួន ${filledCount} ខែរួចរាល់!`);
      } else {
        alert('មិនមានខែណាត្រូវគ្នានឹងតារាងផែនការឡើយ។');
      }
    } catch (err) {
      console.error(err);
      showToast('បរាជ័យក្នុងការទាញយកពិន្ទុ');
    }
  };

  // Print trigger
  const handlePrint = () => {
    window.print();
  };

  // Export to Excel
  const handleExportExcel = () => {
    exportTeachingPlanToExcel(plan);
    showToast('បានទាញយកឯកសារ Excel (.xlsx) រួចរាល់!');
  };

  // Helper to render a specific block of tables
  const renderTableBlock = (title: string, months: MonthColDef[]) => {
    const baselineTotals = calculateTotals(
      plan.rows,
      (r) => r.baselineCount,
      (r) => r.baselinePct
    );

    const yearTargetTotal = plan.rows.reduce((sum, r) => sum + (r.yearEndTargetPct || 0), 0);

    return (
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden mb-6">
        {/* Table Banner Header */}
        <div className="bg-[#FFF2CC] border-b border-amber-200 px-4 py-2 text-center font-black text-slate-800 text-sm tracking-wide">
          ចំនួន និងភាគរយ {plan.subject}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              {/* Row 1 Headers */}
              <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-300">
                <th rowSpan={2} className="border-r border-slate-300 px-2.5 py-2 w-16">
                  និទ្ទេស
                </th>
                <th colSpan={2} className="border-r border-slate-300 px-2 py-1.5 bg-slate-50">
                  ទិន្នន័យ មូលដ្ឋាន
                </th>
                {months.map((m) => (
                  <th
                    key={m.key}
                    colSpan={4}
                    className="border-r border-slate-300 px-2 py-1.5 bg-blue-50/50"
                  >
                    {m.monthName}
                  </th>
                ))}
                <th rowSpan={2} className="border-l border-slate-300 px-2.5 py-2 w-20 bg-[#FFE599] text-amber-950">
                  ចំនួន %<br />ចុងឆ្នាំសិក្សា
                </th>
              </tr>

              {/* Row 2 Subheaders */}
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-300">
                <th className="border-r border-slate-300 px-2 py-1 w-14">ចំនួន</th>
                <th className="border-r border-slate-300 px-2 py-1 w-12">%</th>

                {months.map((m) => (
                  <React.Fragment key={m.key}>
                    <th className="border-r border-slate-200 px-2 py-1 w-14 bg-blue-50/30">ផែនការ</th>
                    <th className="border-r border-slate-200 px-2 py-1 w-12 bg-blue-50/30">%</th>
                    <th className="border-r border-slate-200 px-2 py-1 w-14 bg-emerald-50/40">
                      {m.actualName}
                    </th>
                    <th className="border-r border-slate-300 px-2 py-1 w-12 bg-emerald-50/40">%</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-700">
              {plan.rows.map((row) => (
                <tr key={row.grade} className="hover:bg-slate-50/60 transition-colors">
                  {/* Grade letter */}
                  <td className="border-r border-slate-300 px-2 py-2 font-black text-sm text-slate-800 bg-slate-50/40">
                    {row.grade}
                  </td>

                  {/* Baseline Count */}
                  <td className="border-r border-slate-300 p-1">
                    <input
                      type="number"
                      min={0}
                      value={row.baselineCount}
                      onChange={(e) =>
                        handleBaselineCountChange(row.grade, parseInt(e.target.value) || 0)
                      }
                      className="w-full text-center font-mono py-1 bg-transparent hover:bg-white focus:bg-white rounded border border-transparent hover:border-slate-300 focus:border-blue-500 text-xs focus:ring-1 focus:ring-blue-400 font-bold"
                    />
                  </td>

                  {/* Baseline % */}
                  <td className="border-r border-slate-300 p-1 text-slate-600 font-bold">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={row.baselinePct}
                      onChange={(e) =>
                        handleBaselinePctChange(row.grade, parseInt(e.target.value) || 0)
                      }
                      className="w-full text-center font-mono py-1 bg-transparent hover:bg-white focus:bg-white rounded border border-transparent hover:border-slate-300 focus:border-blue-500 text-xs text-slate-500"
                    />
                  </td>

                  {/* Months data */}
                  {months.map((m) => {
                    const d = row.monthly[m.key] || {
                      planCount: 0,
                      planPct: 0,
                      actualCount: 0,
                      actualPct: 0,
                    };
                    return (
                      <React.Fragment key={m.key}>
                        {/* Plan Count */}
                        <td className="border-r border-slate-200 p-1 bg-blue-50/10">
                          <input
                            type="number"
                            min={0}
                            value={d.planCount}
                            onChange={(e) =>
                              handleMonthCellChange(
                                row.grade,
                                m.key,
                                'planCount',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-full text-center font-mono py-1 bg-transparent hover:bg-white focus:bg-white rounded border border-transparent hover:border-blue-300 focus:border-blue-500 text-xs font-semibold"
                          />
                        </td>
                        {/* Plan % */}
                        <td className="border-r border-slate-200 p-1 text-slate-500 bg-blue-50/10 text-[11px]">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={d.planPct}
                            onChange={(e) =>
                              handleMonthCellChange(
                                row.grade,
                                m.key,
                                'planPct',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-full text-center font-mono py-1 bg-transparent text-slate-500 text-[11px]"
                          />
                        </td>

                        {/* Actual Count */}
                        <td className="border-r border-slate-200 p-1 bg-emerald-50/15">
                          <input
                            type="number"
                            min={0}
                            value={d.actualCount}
                            onChange={(e) =>
                              handleMonthCellChange(
                                row.grade,
                                m.key,
                                'actualCount',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-full text-center font-mono py-1 bg-transparent hover:bg-white focus:bg-white rounded border border-transparent hover:border-emerald-300 focus:border-emerald-500 text-xs font-bold text-slate-800"
                          />
                        </td>
                        {/* Actual % */}
                        <td className="border-r border-slate-300 p-1 bg-emerald-50/15 text-[11px] font-bold text-slate-600">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={d.actualPct}
                            onChange={(e) =>
                              handleMonthCellChange(
                                row.grade,
                                m.key,
                                'actualPct',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-full text-center font-mono py-1 bg-transparent text-[11px] text-slate-600"
                          />
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* Year-End Target % */}
                  <td className="border-l border-slate-300 p-1 bg-[#FFE599]/60 font-bold text-amber-950">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={row.yearEndTargetPct}
                      onChange={(e) =>
                        handleYearEndTargetChange(row.grade, parseInt(e.target.value) || 0)
                      }
                      className="w-full text-center font-mono py-1 bg-transparent hover:bg-white focus:bg-white rounded border border-transparent hover:border-amber-400 focus:border-amber-500 text-xs font-black text-amber-950"
                    />
                  </td>
                </tr>
              ))}

              {/* Total Row (សរុប) */}
              <tr className="bg-slate-100 font-black text-slate-800 border-t-2 border-slate-300">
                <td className="border-r border-slate-300 px-2.5 py-2 text-xs">សរុប</td>

                {/* Baseline Total */}
                <td
                  className={`border-r border-slate-300 px-2 py-2 font-mono ${
                    baselineTotals.countSum === plan.totalStudents ? 'text-slate-900' : 'text-rose-600'
                  }`}
                >
                  {baselineTotals.countSum}
                </td>
                <td className="border-r border-slate-300 px-2 py-2 font-mono text-slate-600">
                  {baselineTotals.pctSum}%
                </td>

                {/* Month Totals */}
                {months.map((m) => {
                  const pcSum = plan.rows.reduce(
                    (sum, r) => sum + (r.monthly[m.key]?.planCount || 0),
                    0
                  );
                  const ppSum = plan.rows.reduce(
                    (sum, r) => sum + (r.monthly[m.key]?.planPct || 0),
                    0
                  );
                  const acSum = plan.rows.reduce(
                    (sum, r) => sum + (r.monthly[m.key]?.actualCount || 0),
                    0
                  );
                  const apSum = plan.rows.reduce(
                    (sum, r) => sum + (r.monthly[m.key]?.actualPct || 0),
                    0
                  );

                  return (
                    <React.Fragment key={m.key}>
                      <td
                        className={`border-r border-slate-200 px-2 py-2 font-mono ${
                          pcSum === plan.totalStudents ? 'text-blue-900' : 'text-rose-600'
                        }`}
                      >
                        {pcSum}
                      </td>
                      <td className="border-r border-slate-200 px-2 py-2 font-mono text-slate-600">
                        {ppSum}%
                      </td>
                      <td
                        className={`border-r border-slate-200 px-2 py-2 font-mono ${
                          acSum === plan.totalStudents || acSum === 0 ? 'text-emerald-900' : 'text-rose-600'
                        }`}
                      >
                        {acSum}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2 font-mono text-slate-600">
                        {apSum}%
                      </td>
                    </React.Fragment>
                  );
                })}

                {/* Year-End Target Sum */}
                <td className="border-l border-slate-300 px-2 py-2 font-mono bg-[#FFE599] text-amber-950 font-black">
                  {yearTargetTotal}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 text-xs sm:text-sm font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Action Bar (Hide in Print) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2.5">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              <span>តារាងផែនការបង្រៀនប្រចាំឆ្នាំរបស់គ្រូ</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
                {plan.subject}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              កំណត់ទិន្នន័យមូលដ្ឋាន ផែនការបែងចែកនិទ្ទេស និងតាមដានលទ្ធផលប្រចាំខែរបស់សិស្ស
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAutoFillFromGrades}
              className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="ទាញយកការបែងចែកនិទ្ទេសស្វ័យប្រវត្តិតាមពិន្ទុដែលបានបញ្ចូលក្នុងប្រព័ន្ធ"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>ទាញយកពីពិន្ទុជាក់ស្តែង</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>បោះពុម្ព</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
              title="ផ្ទុកគំរូដើមឡើងវិញ"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>រក្សាទុក</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          {/* Class Select */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">ជ្រើសរើសថ្នាក់រៀន</label>
            <select
              value={activeClass?.id || ''}
              onChange={(e) => onSelectClass(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  📚 {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Select */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">មុខវិជ្ជាបង្រៀន</label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setPlan((p) => ({ ...p, subject: e.target.value }));
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              {POPULAR_SUBJECTS.map((sub) => (
                <option key={sub} value={sub}>
                  📖 {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">ឆ្នាំសិក្សា</label>
            <input
              type="text"
              value={plan.academicYear}
              onChange={(e) => {
                setPlan((p) => ({ ...p, academicYear: e.target.value }));
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick Stats Banner */}
          <div className="flex items-center gap-2 bg-[#FFF2CC]/80 border border-amber-200 rounded-xl px-3 py-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <div className="text-xs text-amber-900 leading-tight">
              <span>សិស្សសរុប: </span>
              <strong className="text-amber-950 font-black">{plan.totalStudents}</strong>
              <span className="mx-1">|</span>
              <span>ស្រី: </span>
              <strong className="text-pink-700 font-black">{plan.femaleStudents}</strong> នាក់
            </div>
          </div>
        </div>
      </div>

      {/* Official Plan Sheet Container (Matches the Screenshot for Display & Print) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none space-y-5">
        {/* Kingdom & Ministry Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-2">
          {/* Left School Info */}
          <div className="text-xs space-y-1 text-slate-800 font-bold">
            <div className="flex items-center gap-1.5">
              <span>ការិ.អយក:</span>
              <input
                type="text"
                value={plan.districtOffice}
                onChange={(e) => setPlan((p) => ({ ...p, districtOffice: e.target.value }))}
                className="bg-transparent border-b border-dotted border-slate-300 font-bold focus:border-blue-500 outline-none w-52"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span>សាលា:</span>
              <input
                type="text"
                value={plan.schoolName}
                onChange={(e) => setPlan((p) => ({ ...p, schoolName: e.target.value }))}
                className="bg-transparent border-b border-dotted border-slate-300 font-bold focus:border-blue-500 outline-none w-52"
              />
            </div>
          </div>

          {/* Kingdom Right Header */}
          <div className="text-center font-moul text-xs text-slate-900 self-center sm:self-end">
            <div>ព្រះរាជាណាចក្រកម្ពុជា</div>
            <div className="text-[11px] font-kantumruy font-bold text-slate-700 mt-0.5">
              ជាតិ សាសនា ព្រះមហាក្សត្រ
            </div>
            <div className="w-16 h-0.5 bg-slate-300 mx-auto mt-1" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center py-2">
          <h1 className="text-base sm:text-lg font-black text-rose-700 tracking-wide font-moul leading-relaxed">
            ផែនការបង្រៀនប្រចាំឆ្នាំរបស់គ្រូ មុខវិជ្ជា {plan.subject} ({plan.academicYear})
          </h1>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs">
          <div>
            <span className="text-slate-500">ឈ្មោះសាលា: </span>
            <strong className="text-slate-900">{plan.schoolName}</strong>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">ថ្នាក់ទី: </span>
            <input
              type="text"
              value={plan.className}
              onChange={(e) => setPlan((p) => ({ ...p, className: e.target.value }))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 font-black text-slate-900 text-xs w-24"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-3">
            <span className="text-slate-500">ចំនួនសិស្ស សរុប:</span>
            <span className="bg-[#FFC000] text-slate-950 font-black px-3 py-0.5 rounded-md shadow-2xs">
              {plan.totalStudents}
            </span>
            <span className="text-slate-500">នាក់, ស្រី:</span>
            <span className="bg-[#FFC000] text-slate-950 font-black px-3 py-0.5 rounded-md shadow-2xs">
              {plan.femaleStudents}
            </span>
            <span className="text-slate-500">នាក់</span>
          </div>

          <div>
            <span className="text-slate-500">ឈ្មោះគ្រូ: </span>
            <input
              type="text"
              value={plan.teacherName}
              onChange={(e) => setPlan((p) => ({ ...p, teacherName: e.target.value }))}
              className="bg-transparent border-b border-slate-300 font-bold text-slate-900 outline-none w-28"
            />
          </div>

          <div>
            <span className="text-slate-500">លេខទូរស័ព្ទ: </span>
            <input
              type="text"
              value={plan.teacherPhone}
              onChange={(e) => setPlan((p) => ({ ...p, teacherPhone: e.target.value }))}
              className="bg-transparent border-b border-slate-300 font-mono font-bold text-slate-900 outline-none w-28"
            />
          </div>

          <div>
            <span className="text-slate-500">នាយករងបច្ចេកទេស: </span>
            <input
              type="text"
              value={plan.deputyDirectorName}
              onChange={(e) => setPlan((p) => ({ ...p, deputyDirectorName: e.target.value }))}
              className="bg-transparent border-b border-slate-300 font-bold text-slate-900 outline-none w-28"
            />
          </div>

          <div>
            <span className="text-slate-500">លេខទូរស័ព្ទ: </span>
            <input
              type="text"
              value={plan.deputyDirectorPhone}
              onChange={(e) => setPlan((p) => ({ ...p, deputyDirectorPhone: e.target.value }))}
              className="bg-transparent border-b border-slate-300 font-mono font-bold text-slate-900 outline-none w-28"
            />
          </div>
        </div>

        {/* Score Rubric Box */}
        <div className="p-3 bg-amber-50/40 border border-amber-200/80 rounded-2xl text-[11px] space-y-1.5 text-slate-700">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-medium">
            <strong className="text-slate-900">កម្រិតពិន្ទុ (១០០%):</strong>
            <span>F ក្រោម៥០ពិន្ទុ</span>
            <span>E ពី៥១-៦០ពិន្ទុ</span>
            <span>D ពី៦១-៧០ពិន្ទុ</span>
            <span>C ពី៧១-៧៩ពិន្ទុ</span>
            <span>B ពី៨០-៨៩ពិន្ទុ</span>
            <span className="font-bold text-emerald-800">A ពី៩០-១០០ពិន្ទុ</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-medium text-slate-600">
            <strong className="text-slate-900">កម្រិតពិន្ទុ (៥០%):</strong>
            <span>F ក្រោម 25ពិន្ទុ</span>
            <span>E ពី 25-29ពិន្ទុ</span>
            <span>D ពី 30-34ពិន្ទុ</span>
            <span>C ពី 35-39ពិន្ទុ</span>
            <span>B ពី 40-44ពិន្ទុ</span>
            <span className="font-bold text-emerald-800">A ពី 45-50ពិន្ទុ</span>
          </div>
        </div>

        {/* Table 1: ត្រីមាសទី ១ (ខែធ្នូ, ខែមករា, ខែកុម្ភៈ) */}
        {renderTableBlock('តារាងទី ១', TABLE_1_MONTHS)}

        {/* Table 2: ត្រីមាសទី ២ (ខែមីនា, ខែមេសា, ខែឧសភា) */}
        {renderTableBlock('តារាងទី ២', TABLE_2_MONTHS)}

        {/* Table 3: បញ្ចប់ឆ្នាំសិក្សា (ខែមិថុនា, ខែកក្កដា) */}
        {renderTableBlock('តារាងទី ៣', TABLE_3_MONTHS)}

        {/* Signature Blocks for Print & Official Handover */}
        <div className="pt-6 grid grid-cols-2 text-center text-xs text-slate-800 break-inside-avoid">
          <div>
            <div className="font-bold">បានឃើញ និងឯកភាព</div>
            <div className="font-bold text-slate-600 mt-1">នាយករងបច្ចេកទេស</div>
            <div className="h-16" />
            <div className="font-bold text-slate-900">{plan.deputyDirectorName}</div>
          </div>

          <div>
            <div className="text-slate-600">ថ្ងៃ................ខែ...........ឆ្នាំ២០២...</div>
            <div className="font-bold text-slate-800 mt-1">គ្រូបង្រៀនមុខវិជ្ជា</div>
            <div className="h-16" />
            <div className="font-bold text-slate-900">{plan.teacherName}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
