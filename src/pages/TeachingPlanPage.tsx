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
  ChevronUp,
  Table,
  AlertTriangle,
  Scale,
  Award,
} from 'lucide-react';
import type { ClassRoom, Student, TeacherSettings, TeachingPlan, TeachingPlanGradeRow } from '../types';
import { db } from '../db/db';
import {
  TABLE_1_MONTHS,
  TABLE_2_MONTHS,
  TABLE_3_MONTHS,
  ALL_MONTH_KEYS,
  POPULAR_SUBJECTS,
  MODEL_SCHOOL_BENCHMARKS,
  MODEL_SCHOOL_YEAR_KEYS,
  type BenchmarkYearKey,
  balancePctList,
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

  // Model Standard School Benchmark Year Selection ('year1' to 'year6')
  const [benchmarkYear, setBenchmarkYear] = useState<BenchmarkYearKey>('year4');
  const [showBenchmarkMatrix, setShowBenchmarkMatrix] = useState<boolean>(true);

  // Apply Model Standard School (សាលារៀនគំរូ) Benchmark to Plan
  const handleApplyModelSchoolBenchmark = (yearKey: BenchmarkYearKey) => {
    const benchmark = MODEL_SCHOOL_BENCHMARKS[yearKey];
    if (!benchmark) return;

    const total = plan.totalStudents || 61;
    const targetMap = benchmark.targets;

    setPlan((prev) => {
      // 1. Update yearEndTargetPct to benchmark targets (exact 100%)
      const newRows = prev.rows.map((r) => {
        const gradeKey = r.grade as 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
        return {
          ...r,
          yearEndTargetPct: targetMap[gradeKey] ?? r.yearEndTargetPct,
        };
      });

      // 2. Distribute monthly plan targets progressively from baseline to yearEndTarget
      const months = ['dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul'];
      months.forEach((mKey, mIdx) => {
        const factor = (mIdx + 1) / months.length;
        const rawPcts: number[] = newRows.map((r) => {
          const b = r.baselinePct || 0;
          const t = r.yearEndTargetPct || 0;
          return Math.round(b + (t - b) * factor);
        });

        const balanced = balancePctList(rawPcts);

        newRows.forEach((r, idx) => {
          const p = balanced[idx];
          const c = Math.round((p / 100) * total);
          const currentMonthly = r.monthly[mKey] || {
            planCount: 0,
            planPct: 0,
            actualCount: 0,
            actualPct: 0,
          };
          r.monthly[mKey] = {
            ...currentMonthly,
            planPct: p,
            planCount: c,
          };
        });
      });

      const updated = { ...prev, rows: newRows };
      handleSave(updated);
      return updated;
    });

    showToast(`បានអនុវត្តគោលដៅភាគរយ «${benchmark.title}» បានជោគជ័យ!`);
  };

  // Auto-balance all percentage columns to sum to exactly 100%
  const handleAutoBalanceAll = () => {
    const total = plan.totalStudents || 61;
    setPlan((prev) => {
      const newRows = [...prev.rows];

      // 1. Balance Baseline
      const basePcts = newRows.map((r) => r.baselinePct || 0);
      const balancedBase = balancePctList(basePcts);
      newRows.forEach((r, idx) => {
        r.baselinePct = balancedBase[idx];
        r.baselineCount = Math.round((balancedBase[idx] / 100) * total);
      });

      // 2. Balance Months
      const months = ['dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul'];
      months.forEach((mKey) => {
        const planPcts = newRows.map((r) => r.monthly[mKey]?.planPct || 0);
        const balancedPlan = balancePctList(planPcts);
        newRows.forEach((r, idx) => {
          const p = balancedPlan[idx];
          const c = Math.round((p / 100) * total);
          const cur = r.monthly[mKey] || { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 };
          r.monthly[mKey] = { ...cur, planPct: p, planCount: c };
        });

        // Balance actual if filled
        const hasActual = newRows.some((r) => (r.monthly[mKey]?.actualCount || 0) > 0);
        if (hasActual) {
          const actualPcts = newRows.map((r) => r.monthly[mKey]?.actualPct || 0);
          const balancedActual = balancePctList(actualPcts);
          newRows.forEach((r, idx) => {
            const p = balancedActual[idx];
            const cur = r.monthly[mKey] || { planCount: 0, planPct: 0, actualCount: 0, actualPct: 0 };
            r.monthly[mKey] = { ...cur, actualPct: p };
          });
        }
      });

      // 3. Balance Year Target
      const targetPcts = newRows.map((r) => r.yearEndTargetPct || 0);
      const balancedTarget = balancePctList(targetPcts);
      newRows.forEach((r, idx) => {
        r.yearEndTargetPct = balancedTarget[idx];
      });

      const updated = { ...prev, rows: newRows };
      handleSave(updated);
      return updated;
    });

    showToast('បានថ្លឹងភាគរយគ្រប់ជួរឈរឱ្យស្មើ ១០០% គត់ដោយជោគជ័យ!');
  };

  // Detect all columns where percentage sum > 100%
  const warningColumns = useMemo(() => {
    const list: { name: string; sum: number }[] = [];
    const basePctSum = plan.rows.reduce((sum, r) => sum + (r.baselinePct || 0), 0);
    if (basePctSum > 100) {
      list.push({ name: 'ទិន្នន័យមូលដ្ឋាន', sum: basePctSum });
    }

    const monthList = [...TABLE_1_MONTHS, ...TABLE_2_MONTHS, ...TABLE_3_MONTHS];
    monthList.forEach((m) => {
      const ppSum = plan.rows.reduce((sum, r) => sum + (r.monthly[m.key]?.planPct || 0), 0);
      if (ppSum > 100) {
        list.push({ name: `ផែនការ ${m.monthName}`, sum: ppSum });
      }
      const apSum = plan.rows.reduce((sum, r) => sum + (r.monthly[m.key]?.actualPct || 0), 0);
      if (apSum > 100) {
        list.push({ name: `ជាក់ស្តែង ${m.actualName}`, sum: apSum });
      }
    });

    const ytSum = plan.rows.reduce((sum, r) => sum + (r.yearEndTargetPct || 0), 0);
    if (ytSum > 100) {
      list.push({ name: 'ភាគរយចុងឆ្នាំ', sum: ytSum });
    }

    return list;
  }, [plan.rows]);

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

  // Helper to render count cell (black font)
  const renderCountCell = (
    value: number,
    onChange: (val: number) => void
  ) => (
    <td className="border border-black p-0 text-center font-bold font-mono text-black text-xs">
      <div className="flex items-center justify-center w-full h-full min-h-[26px] print:hidden">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-full text-center font-mono font-bold text-black text-xs bg-transparent border-none outline-none p-0 focus:bg-amber-100 rounded"
        />
      </div>
      <span className="hidden print:inline-block font-bold font-mono text-black text-[11px]">
        {value}
      </span>
    </td>
  );

  // Helper to render percentage cell (red font) with >100% warning
  const renderPercentCell = (
    value: number,
    onChange: (val: number) => void
  ) => {
    const isOver100 = value > 100;
    return (
      <td
        className={`border border-black p-0 text-center font-bold font-mono text-xs ${
          isOver100 ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-500 ring-inset' : 'text-red-600'
        }`}
        title={isOver100 ? `⚠️ សញ្ញាព្រមាន៖ ភាគរយ ${value}% លើសពី ១០០%!` : undefined}
      >
        <div className="flex items-center justify-center w-full h-full min-h-[26px] print:hidden px-0.5">
          {isOver100 && (
            <span className="text-[10px] text-rose-600 mr-0.5 animate-bounce select-none" title="លើសពី ១០០%">
              ⚠️
            </span>
          )}
          <input
            type="number"
            min={0}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            className={`w-7 text-right font-mono font-bold text-xs bg-transparent border-none outline-none p-0 rounded ${
              isOver100 ? 'text-rose-700 font-black' : 'text-red-600'
            } focus:bg-amber-100`}
          />
          <span className={`font-bold text-[11px] ml-0.5 select-none ${isOver100 ? 'text-rose-700 font-black' : 'text-red-600'}`}>%</span>
        </div>
        <span className={`hidden print:inline-block font-bold font-mono text-[11px] ${isOver100 ? 'text-rose-700 font-black' : 'text-red-600'}`}>
          {value}%
        </span>
      </td>
    );
  };

  // Helper to render year-end target percentage cell (golden yellow for A, B, C; black text) with >100% warning
  const renderTargetCell = (
    value: number,
    grade: string,
    onChange: (val: number) => void
  ) => {
    const isHighGrade = ['A', 'B', 'C'].includes(grade);
    const isOver100 = value > 100;
    const bgClass = isOver100 ? 'bg-rose-100 ring-2 ring-rose-500 ring-inset' : isHighGrade ? 'bg-[#FFC000]' : 'bg-white';
    return (
      <td
        className={`border border-black p-0 text-center font-bold font-mono text-xs ${bgClass} ${
          isOver100 ? 'text-rose-700 font-black' : 'text-black'
        }`}
        title={isOver100 ? `⚠️ សញ្ញាព្រមាន៖ ភាគរយ ${value}% លើសពី ១០០%!` : undefined}
      >
        <div className="flex items-center justify-center w-full h-full min-h-[26px] print:hidden px-0.5">
          {isOver100 && (
            <span className="text-[10px] text-rose-600 mr-0.5 animate-bounce select-none" title="លើសពី ១០០%">
              ⚠️
            </span>
          )}
          <input
            type="number"
            min={0}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            className={`w-7 text-right font-mono font-bold text-xs bg-transparent border-none outline-none p-0 focus:bg-amber-100 rounded ${
              isOver100 ? 'text-rose-700 font-black' : 'text-black'
            }`}
          />
          <span className="text-black font-bold text-[11px] ml-0.5 select-none">%</span>
        </div>
        <span className="hidden print:inline-block font-bold font-mono text-black text-[11px]">
          {value}%
        </span>
      </td>
    );
  };

  // Helper to render an Excel-identical 3-tier table block
  const renderTableBlock = (title: string, months: MonthColDef[]) => {
    const baselineTotals = calculateTotals(
      plan.rows,
      (r) => r.baselineCount,
      (r) => r.baselinePct
    );

    const yearTargetTotal = plan.rows.reduce((sum, r) => sum + (r.yearEndTargetPct || 0), 0);
    const totalCols = 1 + 2 + months.length * 4 + 1;

    return (
      <div className="overflow-x-auto mb-4 print:mb-3">
        <table className="w-full text-center border-collapse border border-black text-xs font-sans">
          <thead>
            {/* Banner Row 0 */}
            <tr>
              <th
                colSpan={totalCols}
                className="bg-[#FCE4D6] border border-black py-1 px-2 text-center font-bold text-black text-xs sm:text-sm tracking-wide"
              >
                ចំនួន និងភាគរយ {plan.subject}
              </th>
            </tr>

            {/* Header Tier 1 */}
            <tr className="bg-white text-black font-bold text-xs">
              <th rowSpan={3} className="border border-black px-1.5 py-1 w-12 align-middle text-center">
                និទ្ទេស
              </th>
              <th colSpan={2} rowSpan={2} className="border border-black px-1.5 py-1 align-middle text-center leading-tight">
                <div>ទិន្នន័យ</div>
                <div>មូលដ្ឋាន</div>
              </th>
              {months.map((m) => (
                <th key={m.key} colSpan={4} className="border border-black px-1.5 py-1 align-middle text-center">
                  {m.monthName}
                </th>
              ))}
              <th rowSpan={3} className="border border-black px-1.5 py-1 w-20 sm:w-24 align-middle text-center leading-tight">
                <div>ចំនួន %</div>
                <div>ចុងឆ្នាំសិក្សា</div>
              </th>
            </tr>

            {/* Header Tier 2 */}
            <tr className="bg-white text-black font-bold text-xs">
              {months.map((m) => (
                <React.Fragment key={m.key}>
                  <th colSpan={2} className="border border-black px-1.5 py-1 text-center">
                    ផែនការ
                  </th>
                  <th colSpan={2} className="border border-black px-1.5 py-1 text-center">
                    {m.actualName}
                  </th>
                </React.Fragment>
              ))}
            </tr>

            {/* Header Tier 3 (Subheaders: ចំនួន vs %) */}
            <tr className="bg-white font-bold text-[11px]">
              <th className="border border-black px-1 py-0.5 w-12 text-center text-black">ចំនួន</th>
              <th className="border border-black px-1 py-0.5 w-10 text-center text-red-600">%</th>
              {months.map((m) => (
                <React.Fragment key={m.key}>
                  <th className="border border-black px-1 py-0.5 w-12 text-center text-black">ចំនួន</th>
                  <th className="border border-black px-1 py-0.5 w-10 text-center text-red-600">%</th>
                  <th className="border border-black px-1 py-0.5 w-12 text-center text-black">ចំនួន</th>
                  <th className="border border-black px-1 py-0.5 w-10 text-center text-red-600">%</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {plan.rows.map((row) => (
              <tr key={row.grade} className="bg-white hover:bg-slate-50/50 transition-colors">
                {/* Grade */}
                <td className="border border-black px-2 py-1 font-bold text-black text-xs text-center">
                  {row.grade}
                </td>

                {/* Baseline Count (Black) */}
                {renderCountCell(row.baselineCount, (val) =>
                  handleBaselineCountChange(row.grade, val)
                )}

                {/* Baseline % (Red) */}
                {renderPercentCell(row.baselinePct, (val) =>
                  handleBaselinePctChange(row.grade, val)
                )}

                {/* Months Data */}
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
                      {renderCountCell(d.planCount, (val) =>
                        handleMonthCellChange(row.grade, m.key, 'planCount', val)
                      )}
                      {/* Plan % */}
                      {renderPercentCell(d.planPct, (val) =>
                        handleMonthCellChange(row.grade, m.key, 'planPct', val)
                      )}
                      {/* Actual Count */}
                      {renderCountCell(d.actualCount, (val) =>
                        handleMonthCellChange(row.grade, m.key, 'actualCount', val)
                      )}
                      {/* Actual % */}
                      {renderPercentCell(d.actualPct, (val) =>
                        handleMonthCellChange(row.grade, m.key, 'actualPct', val)
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Year-End Target % */}
                {renderTargetCell(row.yearEndTargetPct, row.grade, (val) =>
                  handleYearEndTargetChange(row.grade, val)
                )}
              </tr>
            ))}

            {/* Total Row (សរុប) */}
            <tr className="bg-white font-bold text-black border-t-2 border-black">
              <td className="border border-black px-2 py-1 text-center text-xs">សរុប</td>

              {/* Baseline Total */}
              <td className="border border-black px-1 py-1 text-center font-mono text-black text-xs">
                {baselineTotals.countSum}
              </td>
              <td
                className={`border border-black px-1 py-1 text-center font-mono text-xs ${
                  baselineTotals.pctSum > 100
                    ? 'bg-rose-100 text-rose-700 font-black'
                    : 'text-red-600'
                }`}
                title={baselineTotals.pctSum > 100 ? `⚠️ សរុបលើសពី ១០០% (${baselineTotals.pctSum}%)!` : undefined}
              >
                {baselineTotals.pctSum > 100 && <span className="mr-0.5 select-none">⚠️</span>}
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

                const isPlanOver = ppSum > 100;
                const isActualOver = apSum > 100;

                return (
                  <React.Fragment key={m.key}>
                    <td className="border border-black px-1 py-1 text-center font-mono text-black text-xs">
                      {pcSum}
                    </td>
                    <td
                      className={`border border-black px-1 py-1 text-center font-mono text-xs ${
                        isPlanOver ? 'bg-rose-100 text-rose-700 font-black' : 'text-red-600'
                      }`}
                      title={isPlanOver ? `⚠️ ផែនការ ${m.monthName} សរុប ${ppSum}% លើសពី ១០០%!` : undefined}
                    >
                      {isPlanOver && <span className="mr-0.5 select-none">⚠️</span>}
                      {ppSum}%
                    </td>
                    <td className="border border-black px-1 py-1 text-center font-mono text-black text-xs">
                      {acSum}
                    </td>
                    <td
                      className={`border border-black px-1 py-1 text-center font-mono text-xs ${
                        isActualOver ? 'bg-rose-100 text-rose-700 font-black' : 'text-red-600'
                      }`}
                      title={isActualOver ? `⚠️ ជាក់ស្តែង ${m.actualName} សរុប ${apSum}% លើសពី ១០០%!` : undefined}
                    >
                      {isActualOver && <span className="mr-0.5 select-none">⚠️</span>}
                      {apSum}%
                    </td>
                  </React.Fragment>
                );
              })}

              {/* Year-End Target Sum */}
              <td
                className={`border border-black px-1 py-1 text-center font-mono text-xs ${
                  yearTargetTotal > 100 ? 'bg-rose-100 text-rose-700 font-black' : 'text-black'
                }`}
                title={yearTargetTotal > 100 ? `⚠️ គោលដៅចុងឆ្នាំសរុប ${yearTargetTotal}% លើសពី ១០០%!` : undefined}
              >
                {yearTargetTotal > 100 && <span className="mr-0.5 select-none">⚠️</span>}
                {yearTargetTotal}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Print CSS Configuration for Official A4 Landscape Report */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 8mm 6mm 8mm;
          }
          body {
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .official-sheet {
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
          }
          th, td {
            border: 1px solid #000000 !important;
          }
          .bg-\\[\\#FCE4D6\\] {
            background-color: #FCE4D6 !important;
          }
          .bg-\\[\\#FFC000\\] {
            background-color: #FFC000 !important;
          }
          .text-red-600 {
            color: #dc2626 !important;
          }
        }
      `}</style>

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
              <span>បោះពុម្ព (ទម្រង់ផ្លូវការ)</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
              title="ផ្ទុកគំរូដើមឡើងវិញ (ដូច Excel Screenshot)"
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

        {/* Model Standard School (សាលារៀនគំរូ) Benchmark Control Row */}
        <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/90 to-blue-50/90 border border-blue-200 rounded-2xl p-4 space-y-3.5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Award className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm sm:text-base text-blue-950">
                    គោលដៅសាលាស្តង់ដារគំរូ (Model School Target Benchmarks)
                  </span>
                  <span className="text-[10px] bg-blue-200/90 text-blue-900 px-2.5 py-0.5 rounded-full font-bold">
                    ក្រសួងអប់រំ យុវជន និងកីឡា
                  </span>
                </div>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  ផែនការបែងចែកភាគរយតាមកម្រិតនិទ្ទេស A, B, C, D, E, F សម្រាប់ឆ្នាំទី១ ដល់ ឆ្នាំទី៦ (២០២៣ - ២០២៨)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBenchmarkMatrix(!showBenchmarkMatrix)}
                className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 hover:scale-105 active:scale-95"
                title="បង្ហាញ ឬលាក់ តារាងស្តង់ដាក្រសួងអប់រំ ៦ ឆ្នាំ"
              >
                <Table className="w-3.5 h-3.5 text-blue-600" />
                <span>{showBenchmarkMatrix ? 'លាក់តារាងស្តង់ដា ៦ឆ្នាំ' : 'បង្ហាញតារាងស្តង់ដា ៦ឆ្នាំ'}</span>
                {showBenchmarkMatrix ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Quick Year Selector Buttons: ឆ្នាំទី១ (2023) ... ឆ្នាំទី៦ (2028) */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white/80 rounded-xl border border-blue-200/80">
            <span className="text-xs font-bold text-slate-600 px-2">ជ្រើសរើសឆ្នាំ៖</span>
            {MODEL_SCHOOL_YEAR_KEYS.map((yKey) => {
              const b = MODEL_SCHOOL_BENCHMARKS[yKey];
              const isSelected = benchmarkYear === yKey;
              return (
                <button
                  key={yKey}
                  type="button"
                  onClick={() => setBenchmarkYear(yKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs font-black'
                      : 'bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200'
                  }`}
                >
                  <span>{b.yearName} ({b.calendarYear})</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    ABC {b.targetABC}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Year Highlights & Apply Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 text-xs text-blue-900 bg-white/70 p-3 rounded-xl border border-blue-100">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-slate-800">
                ភាគរយគោលដៅ {MODEL_SCHOOL_BENCHMARKS[benchmarkYear].yearName} ({MODEL_SCHOOL_BENCHMARKS[benchmarkYear].calendarYear})៖
              </span>
              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-bold text-xs border border-amber-300">
                ក្រុមគោលដៅ ABC: {MODEL_SCHOOL_BENCHMARKS[benchmarkYear].targetABC}%
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 font-mono font-bold text-blue-800">
                A: {MODEL_SCHOOL_BENCHMARKS[benchmarkYear].targets.A}%
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 font-mono font-bold text-blue-800">
                B: {MODEL_SCHOOL_BENCHMARKS[benchmarkYear].targets.B}%
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 font-mono font-bold text-blue-800">
                C: {MODEL_SCHOOL_BENCHMARKS[benchmarkYear].targets.C}%
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 font-mono font-bold text-blue-800">
                D: {MODEL_SCHOOL_BENCHMARKS[benchmarkYear].targets.D}%
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 font-mono font-bold text-blue-800">
                E: {MODEL_SCHOOL_BENCHMARKS[benchmarkYear].targets.E}%
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 font-mono font-bold text-blue-800">
                F: {MODEL_SCHOOL_BENCHMARKS[benchmarkYear].targets.F}%
              </span>
              <span className="text-[11px] text-emerald-700 font-black">
                (សរុប = ១០០%)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleApplyModelSchoolBenchmark(benchmarkYear)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-2 hover:scale-[1.02] active:scale-95 shrink-0"
                title="អនុវត្តភាគរយគោលដៅតាមសាលារៀនគំរូ សម្រាប់ឆ្នាំនេះ"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>អនុវត្តភាគរយគោលដៅ ({MODEL_SCHOOL_BENCHMARKS[benchmarkYear].yearName})</span>
              </button>
            </div>
          </div>

          {/* Full Official MoEYS Standard Matrix Table (Matches user's uploaded screenshot) */}
          {showBenchmarkMatrix && (
            <div className="overflow-x-auto bg-white rounded-xl border border-slate-300 shadow-xs">
              <table className="w-full text-center border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-300 text-slate-800 font-bold">
                    <th rowSpan={2} className="border-r border-slate-300 px-3 py-2 w-20 text-[#8B2500]">
                      និទ្ទេស
                    </th>
                    {MODEL_SCHOOL_YEAR_KEYS.map((yKey) => {
                      const b = MODEL_SCHOOL_BENCHMARKS[yKey];
                      const isSelected = benchmarkYear === yKey;
                      return (
                        <th
                          key={yKey}
                          className={`border-r border-slate-300 px-2 py-1.5 font-bold text-[#8B2500] cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-50/90 font-black' : 'hover:bg-slate-100'
                          }`}
                          onClick={() => setBenchmarkYear(yKey)}
                        >
                          {b.yearName} ({b.calendarYear})
                        </th>
                      );
                    })}
                  </tr>
                  <tr className="bg-slate-50/80 border-b border-slate-300 text-slate-700 font-bold">
                    {MODEL_SCHOOL_YEAR_KEYS.map((yKey) => {
                      const b = MODEL_SCHOOL_BENCHMARKS[yKey];
                      const isSelected = benchmarkYear === yKey;
                      return (
                        <th
                          key={yKey}
                          className={`border-r border-slate-300 px-2 py-1 text-[11px] text-[#8B2500] font-normal cursor-pointer ${
                            isSelected ? 'bg-amber-50/90 font-bold' : ''
                          }`}
                          onClick={() => setBenchmarkYear(yKey)}
                        >
                          <div>ក្រុមគោលដៅ</div>
                          <div className="font-bold">ABC( {b.targetABC}% )</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((grade) => (
                    <tr key={grade} className="hover:bg-blue-50/40 transition-colors">
                      <td className="border-r border-slate-300 px-3 py-1.5 font-black text-slate-800 bg-slate-50/50">
                        {grade}
                      </td>
                      {MODEL_SCHOOL_YEAR_KEYS.map((yKey) => {
                        const val = MODEL_SCHOOL_BENCHMARKS[yKey].targets[grade];
                        const isSelected = benchmarkYear === yKey;
                        // In the MoEYS screenshot, D, E, F for Year 4, 5, 6 are colored red
                        const isRed =
                          (yKey === 'year4' && (grade === 'D' || grade === 'E' || grade === 'F')) ||
                          (yKey === 'year5' && (grade === 'D' || grade === 'E' || grade === 'F')) ||
                          (yKey === 'year6' && (grade === 'E' || grade === 'F'));
                        return (
                          <td
                            key={yKey}
                            className={`border-r border-slate-300 px-2 py-1.5 font-mono text-xs cursor-pointer ${
                              isSelected ? 'bg-amber-50/70 font-black' : ''
                            } ${isRed ? 'text-red-600 font-bold' : 'text-slate-800 font-medium'}`}
                            onClick={() => setBenchmarkYear(yKey)}
                          >
                            {val}%
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                    <td className="border-r border-slate-300 px-3 py-1.5 text-[#8B2500]">
                      សរុប
                    </td>
                    {MODEL_SCHOOL_YEAR_KEYS.map((yKey) => {
                      const isSelected = benchmarkYear === yKey;
                      const isRed = yKey === 'year4' || yKey === 'year5' || yKey === 'year6';
                      return (
                        <td
                          key={yKey}
                          className={`border-r border-slate-300 px-2 py-1.5 font-mono font-bold text-xs ${
                            isSelected ? 'bg-amber-50/90' : ''
                          } ${isRed ? 'text-red-600' : 'text-slate-900'}`}
                        >
                          100%
                        </td>
                      );
                    })}
                  </tr>
                  {/* Action Row */}
                  <tr className="bg-slate-50 no-print">
                    <td className="border-r border-slate-300 px-2 py-1.5 text-[10px] text-slate-500 font-bold">
                      សកម្មភាព
                    </td>
                    {MODEL_SCHOOL_YEAR_KEYS.map((yKey) => {
                      const b = MODEL_SCHOOL_BENCHMARKS[yKey];
                      const isSelected = benchmarkYear === yKey;
                      return (
                        <td
                          key={yKey}
                          className={`border-r border-slate-300 p-1 ${isSelected ? 'bg-amber-50/90' : ''}`}
                        >
                          <button
                            type="button"
                            onClick={() => handleApplyModelSchoolBenchmark(yKey)}
                            className={`w-full py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-2xs hover:bg-blue-700'
                                : 'bg-slate-200 hover:bg-blue-600 hover:text-white text-slate-700'
                            }`}
                            title={`អនុវត្តភាគរយគោលដៅ ${b.yearName} ភ្លាមៗ`}
                          >
                            អនុវត្ត
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Warning Banner: Displays prominently whenever any column percentage total > 100% */}
      {warningColumns.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-4 text-rose-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-in no-print">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-xl shrink-0 mt-0.5">
              ⚠️
            </div>
            <div>
              <h4 className="font-black text-sm text-rose-950 flex items-center gap-2">
                <span>សញ្ញាព្រមាន៖ ភាគរយលើសពី ១០០% ត្រូវបានរកឃើញ!</span>
                <span className="text-xs bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                  {warningColumns.length} ជួរឈរ
                </span>
              </h4>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                ជួរឈរដែលមានផលបូកលើសពី ១០០%៖{' '}
                {warningColumns.map((c, i) => (
                  <span key={i} className="inline-block bg-rose-200/80 text-rose-900 px-1.5 py-0.5 rounded text-[11px] font-bold mr-1 my-0.5">
                    {c.name}: {c.sum}%
                  </span>
                ))}
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                * តាមគោលការណ៍សាលារៀនគំរូ ផលបូកភាគរយនៃគ្រប់និទ្ទេសត្រូវតែស្មើ <strong>១០០% គត់</strong> (មិនអាចលើសពី ១០០% ឡើយ)។
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAutoBalanceAll}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-xs flex items-center gap-1.5 self-start md:self-auto hover:scale-105 active:scale-95"
            title="កែសម្រួលភាគរយក្នុងជួរឈរទាំងអស់ឱ្យស្មើ ១០០% គត់ដោយស្វ័យប្រវត្តិ"
          >
            <Scale className="w-4 h-4 text-white" />
            <span>⚖️ ថ្លឹងភាគរយឱ្យស្មើ ១០០% ស្វ័យប្រវត្ត</span>
          </button>
        </div>
      )}

      {/* Official Plan Sheet Container (Matches Excel Template Exactly for Display & Print) */}
      <div className="official-sheet bg-white rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none space-y-2">
        {/* Kingdom & Ministry Header (Hidden on screen as requested in Image 1, appears ONLY when printing as official Kingdom format) */}
        <div className="hidden print:block relative pt-1 pb-1 mb-2">
          {/* Top Left Organization */}
          <div className="sm:absolute sm:top-0 sm:left-0 text-xs text-black font-bold space-y-0.5 mb-2 sm:mb-0">
            <div className="flex items-center">
              <input
                type="text"
                value={plan.districtOffice}
                onChange={(e) => setPlan((p) => ({ ...p, districtOffice: e.target.value }))}
                className="font-bold text-xs text-black bg-transparent border-none outline-none w-60 hover:bg-slate-50 focus:bg-white rounded px-0.5 print:border-none"
              />
            </div>
            <div className="flex items-center">
              <input
                type="text"
                value={plan.schoolName}
                onChange={(e) => setPlan((p) => ({ ...p, schoolName: e.target.value }))}
                className="font-bold text-xs text-black bg-transparent border-none outline-none w-60 hover:bg-slate-50 focus:bg-white rounded px-0.5 print:border-none"
              />
            </div>
          </div>

          {/* Center Kingdom */}
          <div className="text-center">
            <div className="font-moul text-sm sm:text-base text-black tracking-wide">
              ព្រះរាជាណាចក្រកម្ពុជា
            </div>
            <div className="font-moul text-xs sm:text-sm text-black tracking-wider mt-0.5">
              ជាតិ សាសនា ព្រះមហាក្សត្រ
            </div>
            <div className="text-center text-xs tracking-widest my-1 text-black font-serif select-none">
              ❖ ❖ ❖
            </div>
          </div>
        </div>

        {/* Red Document Title */}
        <div className="text-center mt-1 mb-2">
          <h1 className="font-moul text-sm sm:text-base text-red-600 tracking-wide leading-relaxed">
            ផែនការបង្រៀនប្រចាំឆ្នាំរបស់គ្រូ មុខវិជ្ជា {plan.subject} ( ឆ្នាំសិក្សា{plan.academicYear} )
          </h1>
        </div>

        {/* Metadata Details Section (Exact Excel Layout) */}
        <div className="text-xs space-y-1 my-2 text-black">
          {/* Row 1: School */}
          <div className="flex items-center gap-2">
            <span className="font-bold w-24 shrink-0">ឈ្មោះសាលា</span>
            <input
              type="text"
              value={plan.schoolName}
              onChange={(e) => setPlan((p) => ({ ...p, schoolName: e.target.value }))}
              className="font-bold text-black bg-transparent border-b border-dotted border-slate-400 outline-none w-64 hover:bg-slate-50 focus:bg-white px-1 print:border-none"
            />
          </div>

          {/* Row 2: Class & Counts */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold w-24 shrink-0">ថ្នាក់ទី</span>
              <input
                type="text"
                value={plan.className}
                onChange={(e) => setPlan((p) => ({ ...p, className: e.target.value }))}
                className="font-bold text-black bg-transparent border-b border-dotted border-slate-400 outline-none w-20 hover:bg-slate-50 focus:bg-white px-1 print:border-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold">ចំនួនសិស្ស សរុប:</span>
              <span className="bg-[#FFC000] text-black font-bold font-mono px-3 py-0.5 border border-black/40 text-center min-w-[36px] shadow-2xs">
                {plan.totalStudents}
              </span>
              <span className="font-medium">នាក់</span>
              <span className="font-bold ml-3">ស្រី</span>
              <span className="bg-[#FFC000] text-black font-bold font-mono px-3 py-0.5 border border-black/40 text-center min-w-[36px] shadow-2xs">
                {plan.femaleStudents}
              </span>
              <span className="font-medium">នាក់</span>
            </div>
          </div>

          {/* Row 3: Teacher & Phone */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold w-24 shrink-0">ឈ្មោះគ្រូ</span>
              <input
                type="text"
                value={plan.teacherName}
                onChange={(e) => setPlan((p) => ({ ...p, teacherName: e.target.value }))}
                className="font-bold text-black bg-transparent border-b border-dotted border-slate-400 outline-none w-44 hover:bg-slate-50 focus:bg-white px-1 print:border-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">លេខទូរស័ព្ទ:</span>
              <input
                type="text"
                value={plan.teacherPhone}
                onChange={(e) => setPlan((p) => ({ ...p, teacherPhone: e.target.value }))}
                className="font-bold font-mono text-black bg-transparent border-b border-dotted border-slate-400 outline-none w-36 hover:bg-slate-50 focus:bg-white px-1 print:border-none"
              />
            </div>
          </div>

          {/* Row 4: Deputy Director & Phone */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold w-40 shrink-0">ឈ្មោះនាយករងបច្ចេកទេស</span>
              <input
                type="text"
                value={plan.deputyDirectorName}
                onChange={(e) => setPlan((p) => ({ ...p, deputyDirectorName: e.target.value }))}
                className="font-bold text-black bg-transparent border-b border-dotted border-slate-400 outline-none w-44 hover:bg-slate-50 focus:bg-white px-1 print:border-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">លេខទូរស័ព្ទ:</span>
              <input
                type="text"
                value={plan.deputyDirectorPhone}
                onChange={(e) => setPlan((p) => ({ ...p, deputyDirectorPhone: e.target.value }))}
                className="font-bold font-mono text-black bg-transparent border-b border-dotted border-slate-400 outline-none w-36 hover:bg-slate-50 focus:bg-white px-1 print:border-none"
              />
            </div>
          </div>
        </div>

        {/* Score Rubric Box (Exact 2-Row Bordered Table from Screenshot) */}
        <div className="overflow-x-auto my-2.5">
          <table className="w-full text-center border-collapse border border-black text-[11px]">
            <tbody>
              <tr className="bg-white">
                <td className="border border-black px-2 py-0.5 font-bold text-black w-24">កម្រិតពិន្ទុ</td>
                <td className="border border-black px-2 py-0.5 text-black">F ក្រោម៥០ពិន្ទុ</td>
                <td className="border border-black px-2 py-0.5 text-black">E ពី៥១-៦០ពិន្ទុ</td>
                <td className="border border-black px-2 py-0.5 text-black">D ពី៦១-៧០ពិន្ទុ</td>
                <td className="border border-black px-2 py-0.5 text-black">C ពី៧១-៧៩ពិន្ទុ</td>
                <td className="border border-black px-2 py-0.5 text-black">B ពី៨០-៨៩ពិន្ទុ</td>
                <td className="border border-black px-2 py-0.5 text-black font-bold">A ពី៩០-១០០ពិន្ទុ</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-black px-2 py-0.5 font-bold text-black w-24">កម្រិតពិន្ទុ</td>
                <td className="border border-black px-2 py-0.5 text-black">F ក្រោម 25ពិន្ទុ</td>
                <td className="border border-black px-2 py-0.5 text-black">E ពី 25-29ពិន្ទុ</td>
                <td className="border border-black px-2 py-0.5 text-black">D ពី 30-34ពិន្ទុ</td>
                <td className="border border-black px-2 py-0.5 text-black">C ពី 35-39ពិន្ទុ</td>
                <td className="border border-black px-2 py-0.5 text-black">B ពី 40-44ពិន្ទុ</td>
                <td className="border border-black px-2 py-0.5 text-black font-bold">A ពី 45-50ពិន្ទុ</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Table 1: ត្រីមាសទី ១ (ខែធ្នូ, ខែមករា, ខែកុម្ភៈ) */}
        {renderTableBlock('តារាងទី ១', TABLE_1_MONTHS)}

        {/* Table 2: ត្រីមាសទី ២ (ខែមីនា, ខែមេសា, ខែឧសភា) */}
        {renderTableBlock('តារាងទី ២', TABLE_2_MONTHS)}

        {/* Table 3: បញ្ចប់ឆ្នាំសិក្សា (ខែមិថុនា, ខែកក្កដា) */}
        {renderTableBlock('តារាងទី ៣', TABLE_3_MONTHS)}

        {/* Official Signatures (Kingdom of Cambodia Format) */}
        <div className="pt-6 pb-2 grid grid-cols-2 text-center text-xs text-black break-inside-avoid">
          {/* Left: Deputy Technical Director */}
          <div className="space-y-1">
            <div className="font-bold">បានឃើញ និងឯកភាព</div>
            <div className="text-slate-600">ថ្ងៃទី...........ខែ...........ឆ្នាំ២០២...</div>
            <div className="font-bold font-moul text-xs pt-1">នាយករងបច្ចេកទេស</div>
            <div className="text-[11px] text-slate-500 italic">(ហត្ថលេខា និងត្រា)</div>
            <div className="h-16" />
            <div className="font-bold text-sm text-black">{plan.deputyDirectorName}</div>
          </div>

          {/* Right: Subject Teacher */}
          <div className="space-y-1">
            <div className="text-slate-600">ថ្ងៃទី...........ខែ...........ឆ្នាំ២០២...</div>
            <div className="font-bold font-moul text-xs pt-1">គ្រូបង្រៀនមុខវិជ្ជា</div>
            <div className="text-[11px] text-slate-500 italic">(ហត្ថលេខា)</div>
            <div className="h-16" />
            <div className="font-bold text-sm text-black">{plan.teacherName}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
