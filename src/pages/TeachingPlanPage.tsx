import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Target,
} from 'lucide-react';
import type { ClassRoom, Student, TeacherSettings, TeachingPlan, TeachingPlanGradeRow } from '../types';
import { db } from '../db/db';
import {
  TABLE_1_MONTHS,
  TABLE_2_MONTHS,
  TABLE_3_MONTHS,
  TABLE_4_MONTHS,
  ALL_MONTH_KEYS,
  POPULAR_SUBJECTS,
  MODEL_SCHOOL_BENCHMARKS,
  MODEL_SCHOOL_YEAR_KEYS,
  type BenchmarkYearKey,
  getModelSchoolBenchmarks,
  balancePctList,
  createDefaultTeachingPlan,
  calculateTotals,
  calculateBalancedPercentages,
  exportTeachingPlanToExcel,
  getTableBaseline,
  type MonthColDef,
  KHMER_MONTH_LIST,
  getNextKhmerMonth,
  generateMonthSequence,
  clearPlanAndActualData,
  isOldDummyPlan,
} from '../utils/teachingPlanUtils';
import { ALL_SUBJECTS } from '../utils/gradeCoefficients';
import { triggerPrint, type PrintOrientation } from '../utils/printUtils';
import { toKhmerNum } from '../utils/dateUtils';

export type PlanScope = 'all' | 'q1' | 'q2' | 'q3' | 'q4' | '1y' | '3y' | '6y';

interface TeachingPlanPageProps {
  classes: ClassRoom[];
  students: Student[];
  settings: TeacherSettings | null;
  selectedClassId: string;
  onSelectClass: (classId: string) => void;
  onRefresh?: () => void;
  initialPlanScope?: PlanScope;
}

export const TeachingPlanPage: React.FC<TeachingPlanPageProps> = ({
  classes,
  students,
  settings,
  selectedClassId,
  onSelectClass,
  initialPlanScope,
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

  // Plan scope (ត្រីមាសទី១, ទី២, ទី៣, មួយឆ្នាំ, បីឆ្នាំ, ៦ឆ្នាំ, ទាំងអស់)
  const [activeScope, setActiveScope] = useState<PlanScope>(initialPlanScope || 'all');

  useEffect(() => {
    if (initialPlanScope) {
      setActiveScope(initialPlanScope);
    }
  }, [initialPlanScope]);

  // Plan state
  const [plan, setPlan] = useState<TeachingPlan>(() => {
    const saved = localStorage.getItem(`teaching_plan_${activeClass?.id || 'default'}_${settings?.specialtySubject || 'គណិតវិទ្យា'}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (isOldDummyPlan(parsed)) {
          return clearPlanAndActualData(parsed);
        }
        return parsed;
      } catch (e) {
        // fallback
      }
    }
    return createDefaultTeachingPlan(activeClass, classTotal, classFemales, settings);
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Target DOM element for Top Navbar portal (លើកផ្ទាំងសកម្មភាពឡើងទៅរបារខាងលើ)
  const [navbarPortalEl, setNavbarPortalEl] = useState<HTMLElement | null>(() => {
    if (typeof document !== 'undefined') {
      return document.getElementById('navbar-custom-slot');
    }
    return null;
  });

  useEffect(() => {
    if (!navbarPortalEl && typeof document !== 'undefined') {
      const el = document.getElementById('navbar-custom-slot');
      if (el) setNavbarPortalEl(el);
    }
  }, [navbarPortalEl]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load from DB or localStorage whenever active class or subject changes
  useEffect(() => {
    const planKey = `teaching_plan_${activeClass?.id || 'default'}_${selectedSubject}`;
    const loadPlan = async () => {
      try {
        const allGrades = activeClass ? await db.grades.where('classId').equals(activeClass.id).toArray() : [];

        const applyGradesToPlan = (targetPlan: TeachingPlan): TeachingPlan => {
          if (!allGrades || allGrades.length === 0) return targetPlan;

          const subjectObj = ALL_SUBJECTS.find(
            (s) => s.name === selectedSubject || s.id === selectedSubject
          );
          const subjectId = subjectObj?.id || selectedSubject;
          const subjectName = subjectObj?.name || selectedSubject;

          const getScore = (rec: any): number => {
            const raw =
              rec.scores?.[selectedSubject] ??
              rec.scores?.[subjectName] ??
              rec.scores?.[subjectId] ??
              rec.scores?.[selectedSubject.toLowerCase()] ??
              rec.finalTotal100 ??
              rec.assessmentTotal ??
              0;
            return Number(raw) || 0;
          };

          const toGrade = (score: number): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' => {
            if (score <= 50 && score > 0 && selectedSubject.includes('ពលរដ្ឋ')) {
              if (score >= 45) return 'A';
              if (score >= 40) return 'B';
              if (score >= 35) return 'C';
              if (score >= 30) return 'D';
              if (score >= 25) return 'E';
              return 'F';
            }
            if (score >= 90) return 'A';
            if (score >= 80) return 'B';
            if (score >= 71) return 'C';
            if (score >= 61) return 'D';
            if (score >= 51) return 'E';
            return 'F';
          };

          const total = targetPlan.totalStudents || 1;
          const newRows = [...targetPlan.rows];

          // 1. Pull Baseline from 'តេស្តដើមឆ្នាំ'
          const diagRecords = allGrades.filter(
            (g) =>
              g.month === 'តេស្តដើមឆ្នាំ' ||
              g.month?.includes('តេស្តដើមឆ្នាំ') ||
              g.month?.includes('ដើមឆ្នាំ')
          );

          if (diagRecords.length > 0) {
            const diagCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
            diagRecords.forEach((rec) => {
              const score = getScore(rec);
              const g = toGrade(score);
              diagCounts[g]++;
            });
            const diagCountArr = newRows.map((r) => diagCounts[r.grade] || 0);
            const diagPctArr = calculateBalancedPercentages(diagCountArr, total);
            newRows.forEach((r, idx) => {
              r.baselineCount = diagCountArr[idx];
              r.baselinePct = diagPctArr[idx];
            });
          }

          // 2. Pull Monthly Actuals
          const allCols = [
            ...(targetPlan.monthCols?.table1 || TABLE_1_MONTHS),
            ...(targetPlan.monthCols?.table2 || TABLE_2_MONTHS),
            ...(targetPlan.monthCols?.table3 || TABLE_3_MONTHS),
            ...(targetPlan.monthCols?.table4 || TABLE_4_MONTHS),
          ];

          allCols.forEach((col) => {
            const cleanColMonth = col.monthName.replace(/^ខែ\s*/, '').trim();
            const monthRecords = allGrades.filter((g) => {
              if (!g.month || g.month.includes('តេស្តដើមឆ្នាំ') || g.month.includes('ដើមឆ្នាំ')) return false;
              const cleanGMonth = g.month.replace(/^ខែ\s*/, '').trim();
              return (
                cleanGMonth === cleanColMonth ||
                g.month === col.monthName ||
                g.month.includes(cleanColMonth)
              );
            });

            if (monthRecords.length > 0) {
              const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
              monthRecords.forEach((rec) => {
                const score = getScore(rec);
                const g = toGrade(score);
                counts[g]++;
              });
              const mCountArr = newRows.map((r) => counts[r.grade] || 0);
              const mPctArr = calculateBalancedPercentages(mCountArr, total);
              newRows.forEach((r, idx) => {
                r.monthly[col.key] = {
                  ...(r.monthly[col.key] || { planCount: 0, planPct: 0 }),
                  actualCount: mCountArr[idx],
                  actualPct: mPctArr[idx],
                };
              });
            }
          });

          return { ...targetPlan, rows: newRows };
        };

        const fromDb = await db.teachingPlans
          .where('classId')
          .equals(activeClass?.id || '')
          .filter((p) => p.subject === selectedSubject)
          .first();

        if (fromDb) {
          if (isOldDummyPlan(fromDb)) {
            const cleaned = clearPlanAndActualData(fromDb);
            const autoPopulated = applyGradesToPlan(cleaned);
            await db.teachingPlans.put(autoPopulated);
            setPlan(autoPopulated);
            return;
          }
          // If baseline counts are all 0 and grades exist, auto-pull baseline
          const isBaselineZero = fromDb.rows.every((r) => (r.baselineCount || 0) === 0);
          if (isBaselineZero && allGrades.length > 0) {
            const autoPopulated = applyGradesToPlan(fromDb);
            setPlan(autoPopulated);
            return;
          }
          setPlan(fromDb);
          return;
        }

        const savedLocal = localStorage.getItem(planKey);
        if (savedLocal) {
          const parsed = JSON.parse(savedLocal);
          if (isOldDummyPlan(parsed)) {
            const cleaned = clearPlanAndActualData(parsed);
            const autoPopulated = applyGradesToPlan(cleaned);
            localStorage.setItem(planKey, JSON.stringify(autoPopulated));
            setPlan(autoPopulated);
            return;
          }
          const isBaselineZero = parsed.rows.every((r: any) => (r.baselineCount || 0) === 0);
          if (isBaselineZero && allGrades.length > 0) {
            const autoPopulated = applyGradesToPlan(parsed);
            setPlan(autoPopulated);
            return;
          }
          setPlan(parsed);
          return;
        }

        // Initialize default and auto-pull from db.grades
        const newPlan = createDefaultTeachingPlan(activeClass, classTotal, classFemales, settings);
        newPlan.subject = selectedSubject;
        const populated = applyGradesToPlan(newPlan);
        setPlan(populated);
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

  // Cell change handler for Baseline Count (auto-balance percentages to 100%)
  const handleBaselineCountChange = (grade: string, count: number) => {
    setPlan((prev) => {
      const total = prev.totalStudents || 1;
      const newRows = prev.rows.map((r) => (r.grade === grade ? { ...r, baselineCount: count } : r));
      const allCounts = newRows.map((r) => r.baselineCount || 0);
      const balancedPcts = calculateBalancedPercentages(allCounts, total);
      newRows.forEach((r, idx) => {
        r.baselinePct = balancedPcts[idx];
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

  // Cell change handler for Month columns (plan / actual with auto-balanced percentages)
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
          return {
            ...r,
            monthly: {
              ...r.monthly,
              [monthKey]: { ...currentMonthly, [field]: val },
            },
          };
        }
        return r;
      });

      // Auto-calculate and balance percentages across the 6 grades if count changed
      if (field === 'planCount') {
        const counts = newRows.map((r) => r.monthly[monthKey]?.planCount || 0);
        const balanced = calculateBalancedPercentages(counts, total);
        newRows.forEach((r, idx) => {
          r.monthly[monthKey].planPct = balanced[idx];
        });
      } else if (field === 'actualCount') {
        const counts = newRows.map((r) => r.monthly[monthKey]?.actualCount || 0);
        const balanced = calculateBalancedPercentages(counts, total);
        newRows.forEach((r, idx) => {
          r.monthly[monthKey].actualPct = balanced[idx];
        });
      }

      const updated = { ...prev, rows: newRows };
      handleSave(updated);
      return updated;
    });
  };

  // Cell change handler for Baseline of any table (Table 1 updates baselineCount, Tables 2-4 update preceding quarter's end actuals)
  const handleTableBaselineCountChange = (
    tableKey: 'table1' | 'table2' | 'table3' | 'table4',
    grade: string,
    count: number
  ) => {
    if (tableKey === 'table1') {
      handleBaselineCountChange(grade, count);
      return;
    }

    let prevCols: MonthColDef[] = [];
    if (tableKey === 'table2') {
      prevCols = plan.monthCols?.table1 || TABLE_1_MONTHS;
    } else if (tableKey === 'table3') {
      prevCols = plan.monthCols?.table2 || TABLE_2_MONTHS;
    } else if (tableKey === 'table4') {
      prevCols = plan.monthCols?.table3 || TABLE_3_MONTHS;
    }

    if (prevCols.length > 0) {
      const lastColKey = prevCols[prevCols.length - 1].key;
      handleMonthCellChange(grade, lastColKey, 'actualCount', count);
    }
  };

  const handleTableBaselinePctChange = (
    tableKey: 'table1' | 'table2' | 'table3' | 'table4',
    grade: string,
    pct: number
  ) => {
    if (tableKey === 'table1') {
      handleBaselinePctChange(grade, pct);
      return;
    }

    let prevCols: MonthColDef[] = [];
    if (tableKey === 'table2') {
      prevCols = plan.monthCols?.table1 || TABLE_1_MONTHS;
    } else if (tableKey === 'table3') {
      prevCols = plan.monthCols?.table2 || TABLE_2_MONTHS;
    } else if (tableKey === 'table4') {
      prevCols = plan.monthCols?.table3 || TABLE_3_MONTHS;
    }

    if (prevCols.length > 0) {
      const lastColKey = prevCols[prevCols.length - 1].key;
      handleMonthCellChange(grade, lastColKey, 'actualPct', pct);
    }
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

  // Reset to default template
  const handleResetToDefault = () => {
    if (window.confirm('តើលោកគ្រូ-អ្នកគ្រូចង់ផ្ទុកគំរូដើមឡើងវិញឬទេ?')) {
      const def = createDefaultTeachingPlan(activeClass, classTotal, classFemales, settings);
      def.subject = selectedSubject;
      setPlan(def);
      handleSave(def);
      showToast('បានផ្ទុកទម្រង់គំរូដើមរួចរាល់!');
    }
  };

  // Handler for changing month name in column header
  const handleMonthNameChange = (
    tableKey: 'table1' | 'table2' | 'table3' | 'table4',
    colKey: string,
    newMonthName: string
  ) => {
    setPlan((prev) => {
      const curCols = {
        table1: prev.monthCols?.table1 || TABLE_1_MONTHS,
        table2: prev.monthCols?.table2 || TABLE_2_MONTHS,
        table3: prev.monthCols?.table3 || TABLE_3_MONTHS,
        table4: prev.monthCols?.table4 || TABLE_4_MONTHS,
      };

      const targetList = [...curCols[tableKey]];
      const colIdx = targetList.findIndex((m) => m.key === colKey);
      if (colIdx !== -1) {
        const isVeryLast = tableKey === 'table4' && colIdx === targetList.length - 1;
        const nxt = getNextKhmerMonth(newMonthName);
        const newActual = isVeryLast ? 'ចុងឆ្នាំ' : `ចុង${nxt}`;

        targetList[colIdx] = {
          ...targetList[colIdx],
          monthName: newMonthName,
          actualName: newActual,
        };
      }

      const updatedMonthCols = {
        ...curCols,
        [tableKey]: targetList,
      };

      const updated = {
        ...prev,
        monthCols: updatedMonthCols,
      };
      handleSave(updated);
      return updated;
    });
    showToast(`បានប្តូរទៅ «${newMonthName}» ដោយជោគជ័យ`);
  };

  // Handler for customizing month-end actual title
  const handleActualNameChange = (
    tableKey: 'table1' | 'table2' | 'table3' | 'table4',
    colKey: string,
    newActualName: string
  ) => {
    setPlan((prev) => {
      const curCols = {
        table1: prev.monthCols?.table1 || TABLE_1_MONTHS,
        table2: prev.monthCols?.table2 || TABLE_2_MONTHS,
        table3: prev.monthCols?.table3 || TABLE_3_MONTHS,
        table4: prev.monthCols?.table4 || TABLE_4_MONTHS,
      };

      const targetList = [...curCols[tableKey]];
      const colIdx = targetList.findIndex((m) => m.key === colKey);
      if (colIdx !== -1) {
        targetList[colIdx] = {
          ...targetList[colIdx],
          actualName: newActualName,
        };
      }

      const updatedMonthCols = {
        ...curCols,
        [tableKey]: targetList,
      };

      const updated = {
        ...prev,
        monthCols: updatedMonthCols,
      };
      handleSave(updated);
      return updated;
    });
  };

  // Preset for entire academic year month sequence
  const handleApplyMonthSequencePreset = (startMonth: string) => {
    const seq = generateMonthSequence(startMonth);
    setPlan((prev) => {
      const updated = {
        ...prev,
        monthCols: seq,
      };
      handleSave(updated);
      return updated;
    });
    showToast(`បានកំណត់លំដាប់ខែចាប់ពី ${startMonth} ដោយជោគជ័យ!`);
  };

  // Clear all baseline, plan and month-end counts to 0
  const handleClearPlanAndActual = () => {
    if (
      window.confirm(
        'តើលោកគ្រូ-អ្នកគ្រូពិតជាចង់សម្អាតទិន្នន័យចំនួន និងភាគរយនៃ «ទិន្នន័យមូលដ្ឋាន», «ផែនការ» និង «ចុងខែ» ទាំងអស់ឱ្យទៅជា ០ ឬទេ?'
      )
    ) {
      const cleared = clearPlanAndActualData(plan);
      setPlan(cleared);
      handleSave(cleared);
      showToast('បានសម្អាតទិន្នន័យមូលដ្ឋាន ផែនការ និងចុងខែទាំងអស់រួចរាល់ (០)!');
    }
  };

  // Model Standard School Configurable Start Year (Year 1)
  const [modelSchoolStartYear, setModelSchoolStartYear] = useState<number>(() => {
    const saved = localStorage.getItem('app_model_school_start_year');
    if (saved) {
      const p = parseInt(saved, 10);
      if (!isNaN(p) && p >= 1990 && p <= 2100) return p;
    }
    return 2022; // Default to 2022 matching school baseline implementation
  });

  const handleStartYearChange = (newYear: number) => {
    if (isNaN(newYear) || newYear < 1990 || newYear > 2100) return;
    setModelSchoolStartYear(newYear);
    localStorage.setItem('app_model_school_start_year', String(newYear));
    const implYears = `${toKhmerNum(newYear)} - ${toKhmerNum(newYear + 5)}`;
    setPlan((p) => {
      const updated = {
        ...p,
        startYear: newYear,
        implementationYears: implYears,
        updatedAt: new Date().toISOString(),
      };
      const planKey = `teaching_plan_${p.classId || activeClass?.id || 'default'}_${p.subject || selectedSubject}`;
      try {
        localStorage.setItem(planKey, JSON.stringify(updated));
      } catch (err) {
        // ignore
      }
      return updated;
    });
    showToast(`បានកំណត់ និងរក្សាទុកស្វ័យប្រវត្ត ឆ្នាំទី១៖ ${newYear} (ឆ្នាំអនុវត្ត៖ ${implYears})`);
  };

  // Dynamically compute benchmarks for 6 years based on modelSchoolStartYear
  const benchmarks = useMemo(() => {
    return getModelSchoolBenchmarks(modelSchoolStartYear);
  }, [modelSchoolStartYear]);

  // Model Standard School Benchmark Year Selection ('year1' to 'year6', defaults to 'year1' 2026)
  const [benchmarkYear, setBenchmarkYear] = useState<BenchmarkYearKey>(() => {
    const saved = localStorage.getItem('app_model_school_benchmark_year') as BenchmarkYearKey | null;
    if (saved && MODEL_SCHOOL_YEAR_KEYS.includes(saved)) {
      return saved;
    }
    return 'year1';
  });

  const handleSelectBenchmarkYear = (yKey: BenchmarkYearKey) => {
    setBenchmarkYear(yKey);
    localStorage.setItem('app_model_school_benchmark_year', yKey);
  };

  useEffect(() => {
    if (initialPlanScope) {
      if (initialPlanScope === '1y') handleSelectBenchmarkYear('year1');
      else if (initialPlanScope === '3y') handleSelectBenchmarkYear('year3');
      else if (initialPlanScope === '6y') handleSelectBenchmarkYear('year6');
    }
  }, [initialPlanScope]);

  const [showBenchmarkMatrix, setShowBenchmarkMatrix] = useState<boolean>(true);

  // Paper Print Orientation State (Default to 'portrait' as requested)
  const [printOrientation, setPrintOrientation] = useState<PrintOrientation>('portrait');

  // Apply Model Standard School (សាលារៀនគំរូ) Benchmark to Plan
  const handleApplyModelSchoolBenchmark = (yearKey: BenchmarkYearKey) => {
    handleSelectBenchmarkYear(yearKey);
    const benchmark = benchmarks[yearKey];
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
      const months = ['dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep'];
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
      const months = ['dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep'];
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


  // Auto-fill from actual student grades in db.grades (including beginning-of-year diagnostic test for baseline)
  const handleAutoFillFromGrades = async () => {
    if (!activeClass) return;
    try {
      const allGrades = await db.grades.where('classId').equals(activeClass.id).toArray();
      if (!allGrades || allGrades.length === 0) {
        alert(`មិនទាន់មានទិន្នន័យពិន្ទុសម្រាប់ថ្នាក់ «${activeClass.name}» ក្នុងប្រព័ន្ធនៅឡើយទេ។`);
        return;
      }

      let filledCount = 0;
      let pulledBaseline = false;

      // Find matching subject definition (both Khmer name and English id)
      const subjectObj = ALL_SUBJECTS.find(
        (s) => s.name === selectedSubject || s.id === selectedSubject
      );
      const subjectId = subjectObj?.id || selectedSubject;
      const subjectName = subjectObj?.name || selectedSubject;

      // Helper to extract score from record
      const getScoreFromRec = (rec: any): number => {
        const raw =
          rec.scores?.[selectedSubject] ??
          rec.scores?.[subjectName] ??
          rec.scores?.[subjectId] ??
          rec.scores?.[selectedSubject.toLowerCase()] ??
          rec.finalTotal100 ??
          rec.assessmentTotal ??
          0;
        return Number(raw) || 0;
      };

      // Helper to convert score to A-F grade based on MoEYS rubric
      const scoreToGrade = (score: number): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' => {
        // If score is on 50-scale (max <= 50)
        if (score <= 50 && score > 0 && selectedSubject.includes('ពលរដ្ឋ')) {
          if (score >= 45) return 'A';
          if (score >= 40) return 'B';
          if (score >= 35) return 'C';
          if (score >= 30) return 'D';
          if (score >= 25) return 'E';
          return 'F';
        }
        // Standard 100-scale
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 71) return 'C';
        if (score >= 61) return 'D';
        if (score >= 51) return 'E';
        return 'F';
      };

      setPlan((prev) => {
        const total = prev.totalStudents || 1;
        const newRows = [...prev.rows];

        // 1. Pull Baseline from 'តេស្តដើមឆ្នាំ' (Beginning of Year Diagnostic Test)
        const diagRecords = allGrades.filter(
          (g) =>
            g.month === 'តេស្តដើមឆ្នាំ' ||
            g.month?.includes('តេស្តដើមឆ្នាំ') ||
            g.month?.includes('ដើមឆ្នាំ')
        );

        if (diagRecords.length > 0) {
          pulledBaseline = true;
          const diagCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
          diagRecords.forEach((rec) => {
            const score = getScoreFromRec(rec);
            const g = scoreToGrade(score);
            diagCounts[g]++;
          });

          const diagCountArr = newRows.map((r) => diagCounts[r.grade] || 0);
          const diagPctArr = calculateBalancedPercentages(diagCountArr, total);
          newRows.forEach((r, idx) => {
            r.baselineCount = diagCountArr[idx];
            r.baselinePct = diagPctArr[idx];
          });
        }

        // 2. Pull Monthly Actuals for each month column in plan (Tables 1, 2, 3, 4)
        const allCols = [
          ...(prev.monthCols?.table1 || TABLE_1_MONTHS),
          ...(prev.monthCols?.table2 || TABLE_2_MONTHS),
          ...(prev.monthCols?.table3 || TABLE_3_MONTHS),
          ...(prev.monthCols?.table4 || TABLE_4_MONTHS),
        ];

        allCols.forEach((col) => {
          const cleanColMonth = col.monthName.replace(/^ខែ\s*/, '').trim();
          const monthRecords = allGrades.filter((g) => {
            if (!g.month || g.month.includes('តេស្តដើមឆ្នាំ') || g.month.includes('ដើមឆ្នាំ')) return false;
            const cleanGMonth = g.month.replace(/^ខែ\s*/, '').trim();
            return (
              cleanGMonth === cleanColMonth ||
              g.month === col.monthName ||
              g.month.includes(cleanColMonth)
            );
          });

          if (monthRecords.length > 0) {
            filledCount++;
            const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
            monthRecords.forEach((rec) => {
              const score = getScoreFromRec(rec);
              const g = scoreToGrade(score);
              counts[g]++;
            });

            const mCountArr = newRows.map((r) => counts[r.grade] || 0);
            const mPctArr = calculateBalancedPercentages(mCountArr, total);

            newRows.forEach((r, idx) => {
              r.monthly[col.key] = {
                ...(r.monthly[col.key] || { planCount: 0, planPct: 0 }),
                actualCount: mCountArr[idx],
                actualPct: mPctArr[idx],
              };
            });
          }
        });

        const updated = { ...prev, rows: newRows };
        handleSave(updated);
        return updated;
      });

      if (pulledBaseline || filledCount > 0) {
        const parts = [];
        if (pulledBaseline) parts.push('ទិន្នន័យមូលដ្ឋានពី «តេស្តដើមឆ្នាំ»');
        if (filledCount > 0) parts.push(`ទិន្នន័យជាក់ស្តែងចំនួន ${filledCount} ខែ`);
        showToast(`បានទាញយក${parts.join(' និង')} រួចរាល់!`);
      } else {
        alert('មិនទាន់មានពិន្ទុដែលត្រូវគ្នានឹងតេស្តដើមឆ្នាំ ឬខែក្នុងតារាងផែនការឡើយ។');
      }
    } catch (err) {
      console.error(err);
      showToast('បរាជ័យក្នុងការទាញយកពិន្ទុ');
    }
  };

  // Print trigger
  const handlePrint = (orientation: PrintOrientation = printOrientation) => {
    triggerPrint(orientation);
  };

  // Export to Excel
  const handleExportExcel = () => {
    exportTeachingPlanToExcel(plan);
    showToast('បានទាញយកឯកសារ Excel (.xlsx) រួចរាល់!');
  };

  // Excel-identical keyboard navigation handler (Enter down, Shift+Enter up, Tab right, Shift+Tab left, Arrow keys)
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    tableKey: string,
    rowIdx: number,
    colIdx: number,
    maxCols: number
  ) => {
    let nextRow = rowIdx;
    let nextCol = colIdx;
    let shouldNavigate = false;

    if (e.key === 'Enter') {
      shouldNavigate = true;
      if (e.shiftKey) {
        nextRow = rowIdx > 0 ? rowIdx - 1 : 5;
      } else {
        nextRow = rowIdx < 5 ? rowIdx + 1 : 0;
      }
    } else if (e.key === 'Tab') {
      shouldNavigate = true;
      if (e.shiftKey) {
        if (colIdx > 0) {
          nextCol = colIdx - 1;
        } else if (rowIdx > 0) {
          nextRow = rowIdx - 1;
          nextCol = maxCols - 1;
        } else {
          nextRow = 5;
          nextCol = maxCols - 1;
        }
      } else {
        if (colIdx < maxCols - 1) {
          nextCol = colIdx + 1;
        } else if (rowIdx < 5) {
          nextRow = rowIdx + 1;
          nextCol = 0;
        } else {
          nextRow = 0;
          nextCol = 0;
        }
      }
    } else if (e.key === 'ArrowDown') {
      shouldNavigate = true;
      nextRow = Math.min(5, rowIdx + 1);
    } else if (e.key === 'ArrowUp') {
      shouldNavigate = true;
      nextRow = Math.max(0, rowIdx - 1);
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      const atEnd = input.selectionEnd === input.value.length;
      const allSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;
      if ((atEnd || allSelected) && colIdx < maxCols - 1) {
        shouldNavigate = true;
        nextCol = colIdx + 1;
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      const atStart = input.selectionStart === 0;
      const allSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;
      if ((atStart || allSelected) && colIdx > 0) {
        shouldNavigate = true;
        nextCol = colIdx - 1;
      }
    }

    if (shouldNavigate) {
      e.preventDefault();
      const targetId = `plan-cell-${tableKey}-${nextRow}-${nextCol}`;
      const nextElem = document.getElementById(targetId) as HTMLInputElement | null;
      if (nextElem) {
        nextElem.focus();
        nextElem.select();
      }
    }
  };

  // Helper to render count cell (black font) with Excel-identical navigation
  const renderCountCell = (
    value: number,
    tableKey: string,
    rowIdx: number,
    colIdx: number,
    maxCols: number,
    onChange: (val: number) => void
  ) => {
    const cellId = `plan-cell-${tableKey}-${rowIdx}-${colIdx}`;
    return (
      <td className="border border-black p-0 text-center font-bold font-mono text-black text-xs print:text-[8.5px]">
        <div className="flex items-center justify-center w-full h-full min-h-[26px] print:hidden">
          <input
            id={cellId}
            type="number"
            min={0}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => handleCellKeyDown(e, tableKey, rowIdx, colIdx, maxCols)}
            className="w-full text-center font-mono font-bold text-black text-xs bg-transparent border-none outline-none p-0 focus:bg-amber-100 rounded"
          />
        </div>
        <span className="hidden print:inline-block font-bold font-mono text-black text-[11px] print:text-[8.5px]">
          {value}
        </span>
      </td>
    );
  };

  // Helper to render percentage cell (red font) with >100% warning and Excel-identical navigation
  const renderPercentCell = (
    value: number,
    tableKey: string,
    rowIdx: number,
    colIdx: number,
    maxCols: number,
    onChange: (val: number) => void
  ) => {
    const isOver100 = value > 100;
    const cellId = `plan-cell-${tableKey}-${rowIdx}-${colIdx}`;
    return (
      <td
        className={`border border-black p-0 text-center font-bold font-mono text-xs print:text-[8.5px] ${
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
            id={cellId}
            type="number"
            min={0}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => handleCellKeyDown(e, tableKey, rowIdx, colIdx, maxCols)}
            className={`w-7 text-right font-mono font-bold text-xs bg-transparent border-none outline-none p-0 rounded ${
              isOver100 ? 'text-rose-700 font-black' : 'text-red-600'
            } focus:bg-amber-100`}
          />
          <span className={`font-bold text-[11px] ml-0.5 select-none ${isOver100 ? 'text-rose-700 font-black' : 'text-red-600'}`}>%</span>
        </div>
        <span className={`hidden print:inline-block font-bold font-mono text-[11px] print:text-[8.5px] ${isOver100 ? 'text-rose-700 font-black' : 'text-red-600'}`}>
          {value}%
        </span>
      </td>
    );
  };

  // Helper to render year-end target percentage cell with Excel-identical navigation
  const renderTargetCell = (
    value: number,
    grade: string,
    tableKey: string,
    rowIdx: number,
    colIdx: number,
    maxCols: number,
    onChange: (val: number) => void
  ) => {
    const isHighGrade = ['A', 'B', 'C'].includes(grade);
    const isOver100 = value > 100;
    const bgClass = isOver100 ? 'bg-rose-100 ring-2 ring-rose-500 ring-inset' : isHighGrade ? 'bg-[#FFC000]' : 'bg-white';
    const cellId = `plan-cell-${tableKey}-${rowIdx}-${colIdx}`;
    return (
      <td
        className={`border border-black p-0 text-center font-bold font-mono text-xs print:text-[8.5px] ${bgClass} ${
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
            id={cellId}
            type="number"
            min={0}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => handleCellKeyDown(e, tableKey, rowIdx, colIdx, maxCols)}
            className={`w-7 text-right font-mono font-bold text-xs bg-transparent border-none outline-none p-0 focus:bg-amber-100 rounded ${
              isOver100 ? 'text-rose-700 font-black' : 'text-black'
            }`}
          />
          <span className="text-black font-bold text-[11px] ml-0.5 select-none">%</span>
        </div>
        <span className="hidden print:inline-block font-bold font-mono text-black text-[11px] print:text-[8.5px]">
          {value}%
        </span>
      </td>
    );
  };

  // Helper to render an Excel-identical 3-tier table block
  const renderTableBlock = (
    title: string,
    months: MonthColDef[],
    tableKey: 'table1' | 'table2' | 'table3' | 'table4'
  ) => {
    const baselineTotals = calculateTotals(
      plan.rows,
      (r) => getTableBaseline(plan, tableKey, r).count,
      (r) => getTableBaseline(plan, tableKey, r).pct
    );

    const prevQuarterLabel =
      tableKey === 'table2'
        ? 'ត្រីមាសទី១'
        : tableKey === 'table3'
        ? 'ត្រីមាសទី២'
        : tableKey === 'table4'
        ? 'ត្រីមាសទី៣'
        : '';

    const baselineTitle =
      tableKey === 'table1'
        ? 'ទិន្នន័យមូលដ្ឋានដើមឆ្នាំ (តេស្តដើមឆ្នាំ)'
        : `ទិន្នន័យមូលដ្ឋានគិតបន្តពីចុង${prevQuarterLabel}`;

    const yearTargetTotal = plan.rows.reduce((sum, r) => sum + (r.yearEndTargetPct || 0), 0);
    const totalCols = 1 + 2 + months.length * 4 + 1;
    const is3Months = months.length === 3;
    const maxCols = 2 + months.length * 4 + 1;

    return (
      <div className="overflow-x-auto mb-3.5 print:mb-2.5 print:overflow-visible break-inside-avoid">
        <table className="w-full table-fixed text-center border-collapse border border-black text-xs font-sans print:text-[8.5px]">
          <colgroup>
            {/* Grade (និទ្ទេស): 6.0% */}
            <col style={{ width: '6.0%' }} />
            {/* Baseline (ទិន្នន័យមូលដ្ឋាន): ចំនួន 4.5%, % 4.5% */}
            <col style={{ width: '4.5%' }} />
            <col style={{ width: '4.5%' }} />
            {/* Months (Total 78.0%) */}
            {is3Months ? (
              // 3 months: 12 sub-columns of exactly 6.5% each (total 78.0%)
              Array.from({ length: 12 }).map((_, i) => (
                <col key={i} style={{ width: '6.5%' }} />
              ))
            ) : (
              // 2 months: 8 sub-columns of exactly 9.75% each (total 78.0%)
              Array.from({ length: 8 }).map((_, i) => (
                <col key={i} style={{ width: '9.75%' }} />
              ))
            )}
            {/* Year-End Target (ផែនការ % ចុងឆ្នាំសិក្សា): 7.0% */}
            <col style={{ width: '7.0%' }} />
          </colgroup>
          <thead>
            {/* Banner Row 0 */}
            <tr>
              <th
                colSpan={totalCols}
                className="bg-[#FCE4D6] border border-black py-1 px-2 text-center font-bold text-black text-xs sm:text-sm tracking-wide print:py-0.5 print:text-[9px]"
              >
                ចំនួន និងភាគរយ {plan.subject}
              </th>
            </tr>

            {/* Header Tier 1 */}
            <tr className="bg-white text-black font-bold text-xs print:text-[8px]">
              <th rowSpan={3} className="border border-black px-1 py-1 align-middle text-center print:px-0.5 print:py-0.5">
                និទ្ទេស
              </th>
              <th
                colSpan={2}
                rowSpan={2}
                className="border border-black px-1 py-0.5 align-middle text-center leading-tight print:px-0.5 print:py-0.5"
                title={baselineTitle}
              >
                <div>ទិន្នន័យ</div>
                <div>មូលដ្ឋាន</div>
                {tableKey !== 'table1' && (
                  <div className="text-[9px] text-blue-700 font-semibold print:text-[7.5px] print:text-black">
                    (បន្តពី {prevQuarterLabel})
                  </div>
                )}
              </th>
              {months.map((m) => (
                <th key={m.key} colSpan={4} className="border border-black px-1 py-0.5 align-middle text-center print:px-0.5 print:py-0.5">
                  <div className="flex items-center justify-center print:hidden">
                    <select
                      value={m.monthName}
                      onChange={(e) => handleMonthNameChange(tableKey, m.key, e.target.value)}
                      className="bg-amber-50 hover:bg-amber-100 font-bold text-slate-900 text-center text-xs cursor-pointer rounded px-1.5 py-0.5 border border-amber-300 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-full"
                      title="ចុចដើម្បីជ្រើសរើសខែ"
                    >
                      {KHMER_MONTH_LIST.map((km) => (
                        <option key={km} value={km}>
                          {km}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="hidden print:inline-block font-bold">
                    {m.monthName}
                  </span>
                </th>
              ))}
              <th rowSpan={3} className="border border-black px-1 py-0.5 align-middle text-center leading-tight print:px-0.5 print:py-0.5">
                <div>ផែនការ %</div>
                <div>ចុងឆ្នាំសិក្សា</div>
              </th>
            </tr>

            {/* Header Tier 2 */}
            <tr className="bg-white text-black font-bold text-xs print:text-[8px]">
              {months.map((m) => (
                <React.Fragment key={m.key}>
                  <th colSpan={2} className="border border-black px-1 py-0.5 text-center print:px-0.5 print:py-0.5">
                    ផែនការ
                  </th>
                  <th colSpan={2} className="border border-black px-1 py-0.5 text-center print:px-0.5 print:py-0.5">
                    <div className="flex items-center justify-center print:hidden">
                      <input
                        type="text"
                        value={m.actualName}
                        onChange={(e) => handleActualNameChange(tableKey, m.key, e.target.value)}
                        className="bg-transparent hover:bg-amber-50 focus:bg-white font-bold text-slate-900 text-center text-xs w-full rounded px-1 py-0.5 outline-none border-b border-transparent focus:border-blue-500"
                        title="ចំណងជើងចុងខែ (អាចកែសម្រួលបាន)"
                      />
                    </div>
                    <span className="hidden print:inline-block font-bold">
                      {m.actualName}
                    </span>
                  </th>
                </React.Fragment>
              ))}
            </tr>

            {/* Header Tier 3 (Subheaders: ចំនួន vs %) */}
            <tr className="bg-white font-bold text-[11px] print:text-[8px]">
              <th className="border border-black px-0.5 py-0.5 text-center text-black print:py-0.5">ចំនួន</th>
              <th className="border border-black px-0.5 py-0.5 text-center text-red-600 print:py-0.5">%</th>
              {months.map((m) => (
                <React.Fragment key={m.key}>
                  <th className="border border-black px-0.5 py-0.5 text-center text-black print:py-0.5">ចំនួន</th>
                  <th className="border border-black px-0.5 py-0.5 text-center text-red-600 print:py-0.5">%</th>
                  <th className="border border-black px-0.5 py-0.5 text-center text-black print:py-0.5">ចំនួន</th>
                  <th className="border border-black px-0.5 py-0.5 text-center text-red-600 print:py-0.5">%</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {plan.rows.map((row, rowIdx) => (
              <tr key={row.grade} className="bg-white hover:bg-slate-50/50 transition-colors">
                {/* Grade */}
                <td className="border border-black px-2 py-1 font-bold text-black text-xs text-center">
                  {row.grade}
                </td>

                {/* Baseline Count (Black) - Col 0 */}
                {renderCountCell(
                  getTableBaseline(plan, tableKey, row).count,
                  tableKey,
                  rowIdx,
                  0,
                  maxCols,
                  (val) => handleTableBaselineCountChange(tableKey, row.grade, val)
                )}

                {/* Baseline % (Red) - Col 1 */}
                {renderPercentCell(
                  getTableBaseline(plan, tableKey, row).pct,
                  tableKey,
                  rowIdx,
                  1,
                  maxCols,
                  (val) => handleTableBaselinePctChange(tableKey, row.grade, val)
                )}

                {/* Months Data */}
                {months.map((m, mIdx) => {
                  const d = row.monthly[m.key] || {
                    planCount: 0,
                    planPct: 0,
                    actualCount: 0,
                    actualPct: 0,
                  };
                  const baseCol = 2 + mIdx * 4;
                  return (
                    <React.Fragment key={m.key}>
                      {/* Plan Count */}
                      {renderCountCell(
                        d.planCount,
                        tableKey,
                        rowIdx,
                        baseCol + 0,
                        maxCols,
                        (val) => handleMonthCellChange(row.grade, m.key, 'planCount', val)
                      )}
                      {/* Plan % */}
                      {renderPercentCell(
                        d.planPct,
                        tableKey,
                        rowIdx,
                        baseCol + 1,
                        maxCols,
                        (val) => handleMonthCellChange(row.grade, m.key, 'planPct', val)
                      )}
                      {/* Actual Count */}
                      {renderCountCell(
                        d.actualCount,
                        tableKey,
                        rowIdx,
                        baseCol + 2,
                        maxCols,
                        (val) => handleMonthCellChange(row.grade, m.key, 'actualCount', val)
                      )}
                      {/* Actual % */}
                      {renderPercentCell(
                        d.actualPct,
                        tableKey,
                        rowIdx,
                        baseCol + 3,
                        maxCols,
                        (val) => handleMonthCellChange(row.grade, m.key, 'actualPct', val)
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Year-End Target % - Col maxCols - 1 */}
                {renderTargetCell(
                  row.yearEndTargetPct,
                  row.grade,
                  tableKey,
                  rowIdx,
                  maxCols - 1,
                  maxCols,
                  (val) => handleYearEndTargetChange(row.grade, val)
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
      {/* Print CSS Configuration for Official A4 Portrait/Landscape Report */}
      <style>{`
        @media print {
          @page {
            size: A4 ${printOrientation};
            margin: ${printOrientation === 'portrait' ? '6mm 5mm 6mm 5mm' : '6mm 8mm 6mm 8mm'};
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
          .font-moul {
            font-family: 'Moul', 'Khmer OS Muol Light', 'Khmer OS Muol', 'Khmer OS Muol Pali', 'Noto Serif Khmer', cursive, serif !important;
            letter-spacing: 0.02em !important;
          }
          .overflow-x-auto {
            overflow: visible !important;
          }
          table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          th, td {
            border: 1px solid #000000 !important;
            padding: ${printOrientation === 'portrait' ? '3px 1px' : '4px 2px'} !important;
            font-size: ${printOrientation === 'portrait' ? '8.5px' : '9.5px'} !important;
            line-height: 1.25 !important;
          }
          th {
            font-size: ${printOrientation === 'portrait' ? '8.5px' : '9.5px'} !important;
            font-weight: bold !important;
          }
          td span {
            font-size: ${printOrientation === 'portrait' ? '8.5px' : '9.5px'} !important;
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
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
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

      {/* Top Navbar Action Bar (Portaled to Top Navbar - លើកផ្ទាំងចំណងជើង និងប៊ូតុងឡើងទៅរបារខាងលើ) */}
      {navbarPortalEl &&
        createPortal(
          <div className="flex items-center justify-between gap-2 sm:gap-3 w-full py-1">
            {/* Title & Subject Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-2xs">
                <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-black text-slate-800 leading-tight">តារាងផែនការបង្រៀន</span>
                <span className="text-[10px] text-slate-500 font-bold leading-none">{plan.subject || selectedSubject}</span>
              </div>
              <span className="sm:hidden text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
                {plan.subject || selectedSubject}
              </span>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={handleAutoFillFromGrades}
                className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="ទាញយកការបែងចែកនិទ្ទេសស្វ័យប្រវត្តិតាមពិន្ទុដែលបានបញ្ចូលក្នុងប្រព័ន្ធ"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden md:inline">ទាញយកពីពិន្ទុជាក់ស្តែង</span>
                <span className="md:hidden">ទាញយកពិន្ទុ</span>
              </button>

              <button
                type="button"
                onClick={handleClearPlanAndActual}
                className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs shrink-0"
                title="លុបចំនួនទិន្នន័យផែនការ និងចុងខែទាំងអស់ឱ្យទៅជា ០"
              >
                <span>🧹</span>
                <span className="hidden lg:inline">សម្អាតទិន្នន័យ (០)</span>
                <span className="lg:hidden">សម្អាត (០)</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-2.5 py-1 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs shrink-0"
                title="ទាញយកជាឯកសារ Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>

              {/* Paper Orientation Selector: Portrait (បញ្ឈរ) / Landscape (ផ្ដេក) */}
              <div
                className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold shadow-2xs shrink-0"
                title="ជ្រើសរើសទម្រង់ក្រដាសបោះពុម្ព (Default: បញ្ឈរ)"
              >
                <button
                  type="button"
                  onClick={() => setPrintOrientation('portrait')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    printOrientation === 'portrait'
                      ? 'bg-white text-blue-700 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="បោះពុម្ពជាទម្រង់បញ្ឈរ (A4 Portrait)"
                >
                  <span>📄</span>
                  <span className="hidden sm:inline">បញ្ឈរ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintOrientation('landscape')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    printOrientation === 'landscape'
                      ? 'bg-white text-blue-700 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="បោះពុម្ពជាទម្រង់ផ្ដេក (A4 Landscape)"
                >
                  <span>📃</span>
                  <span className="hidden sm:inline">ផ្ដេក</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handlePrint(printOrientation)}
                className="px-2.5 py-1 sm:py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
                title={`បោះពុម្ពជាទម្រង់${printOrientation === 'portrait' ? 'បញ្ឈរ (A4 Portrait)' : 'ផ្ដេក (A4 Landscape)'}`}
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">បោះពុម្ព</span>
              </button>

              <button
                type="button"
                onClick={handleResetToDefault}
                className="p-1 sm:p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200 shrink-0"
                title="ផ្ទុកគំរូដើមឡើងវិញ"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleSave()}
                className="px-3 py-1 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs shrink-0"
                title="រក្សាទុកទិន្នន័យផែនការបង្រៀន"
              >
                <Save className="w-3.5 h-3.5" />
                <span>រក្សាទុក</span>
              </button>
            </div>
          </div>,
          navbarPortalEl
        )}

      {/* Filter Controls Row (Hide in Print) */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-2xs space-y-3 no-print">
        {/* Filter Controls Row (4 Columns - ឆ្នាំសិក្សា removed as requested) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

          {/* Month Sequence Preset */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">លំដាប់ខែសិក្សា</label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleApplyMonthSequencePreset(e.target.value);
                }
              }}
              defaultValue=""
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
              title="កំណត់លំដាប់ខែស្វ័យប្រវត្តសម្រាប់តារាងទាំងមូល"
            >
              <option value="" disabled>🗓️ កំណត់ខែស្វ័យប្រវត្ត...</option>
              <option value="ខែតុលា">ចាប់ពី ខែតុលា (ស្តង់ដារក្រសួង)</option>
              <option value="ខែវិច្ឆិកា">ចាប់ពី ខែវិច្ឆិកា</option>
              <option value="ខែធ្នូ">ចាប់ពី ខែធ្នូ (គំរូដើម)</option>
              <option value="ខែមករា">ចាប់ពី ខែមករា</option>
            </select>
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

      {/* ផែនការទូទៅ និង ផែនការ ៦ឆ្នាំ៖ ផែនការគោលដៅសាលារៀនជំនាន់ថ្មី ៦ឆ្នាំ (Model School Target Benchmarks) */}
      {(activeScope === 'all' || activeScope === '6y') && (
        <div className="official-sheet bg-white rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none space-y-3">
          {/* Official Kingdom & Ministry Administrative Header */}
          <div className="w-full relative mb-4 print:mb-3 pt-1 pb-1 min-h-[96px] print:min-h-[86px]">
            {/* Top Center: National Motto */}
            <div className="w-full text-center">
              <h2 className="font-moul text-sm sm:text-base print:text-[13pt] text-black tracking-wide leading-relaxed select-none">
                ព្រះរាជាណាចក្រកម្ពុជា
              </h2>
              <h3 className="font-moul text-xs sm:text-sm print:text-[11pt] text-black tracking-wider mt-0.5 leading-relaxed select-none">
                ជាតិ សាសនា ព្រះមហាក្សត្រ
              </h3>
              <div className="flex items-center justify-center space-x-1.5 pt-0.5 text-black">
                <span className="w-7 h-[1px] bg-black/70 rounded-full select-none" />
                <span className="text-[10px] sm:text-xs font-serif leading-none select-none tracking-widest text-black">❖ ❖ ❖</span>
                <span className="w-7 h-[1px] bg-black/70 rounded-full select-none" />
              </div>
            </div>

            {/* Left: Office & School */}
            <div className="sm:absolute sm:left-0 sm:top-[44px] print:absolute print:left-0 print:top-[38px] text-left text-black space-y-0.5 max-w-[42%]">
              <input
                type="text"
                value={plan.districtOffice || settings?.districtOffice || 'ការិ.អយកស្រុកកំពង់ត្រឡាច'}
                onChange={(e) => setPlan((p) => ({ ...p, districtOffice: e.target.value }))}
                className="font-moul text-[10.5px] sm:text-[11.5px] print:text-[9.5pt] text-black bg-transparent border-none outline-none w-full p-0 hover:bg-amber-50 focus:bg-white rounded cursor-text"
                title="ចុចដើម្បីកែសម្រួលឈ្មោះការិយាល័យអប់រំ"
              />
              <input
                type="text"
                value={plan.schoolName || settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}
                onChange={(e) => setPlan((p) => ({ ...p, schoolName: e.target.value }))}
                className="font-moul text-[10px] sm:text-[11px] print:text-[9pt] text-black bg-transparent border-none outline-none w-full p-0 hover:bg-amber-50 focus:bg-white rounded cursor-text"
                title="ចុចដើម្បីកែសម្រួលឈ្មោះវិទ្យាល័យ"
              />
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center my-3 print:my-2">
            <h1 className="font-moul text-sm sm:text-base print:text-[12pt] text-red-600 leading-snug">
              ផែនការគោលដៅសាលារៀនជំនាន់ថ្មី ៦ឆ្នាំ តាមកម្រិតនិទ្ទេស
            </h1>
            <h2 className="font-moul text-xs sm:text-sm print:text-[10.5pt] text-red-600 mt-1">
              មុខវិជ្ជា ៖ {plan.subject || selectedSubject}
            </h2>
          </div>

          {/* Metadata Details Section */}
          <div className="text-xs text-black space-y-1.5 my-2.5 print:my-1.5 print:text-[8.5pt]">
            <div className="flex flex-wrap print:flex-nowrap items-center justify-between gap-x-4 gap-y-1 border-b border-slate-100 print:border-none pb-1 print:pb-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-bold text-black text-xs print:text-[8.5pt]">ឈ្មោះសាលា ៖</span>
                <span className="font-bold text-black text-xs print:text-[8.5pt]">{plan.schoolName}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-bold text-black text-xs print:text-[8.5pt]">ថ្នាក់ទី ៖</span>
                <span className="font-bold text-black text-xs print:text-[8.5pt]">{plan.className}</span>
              </div>
              {/* ឆ្នាំអនុវត្ត (តែមួយទីតាំងគត់លើក្បាលឯកសារផ្លូវការ) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-bold text-black text-xs print:text-[8.5pt]">ឆ្នាំអនុវត្ត ៖</span>
                <span className="font-bold text-black text-xs print:text-[8.5pt]">
                  {toKhmerNum(modelSchoolStartYear)} - {toKhmerNum(modelSchoolStartYear + 5)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-bold text-black text-xs print:text-[8.5pt]">ចំនួនសិស្ស សរុប ៖</span>
                <span className="bg-[#FFC000] text-black font-bold font-mono px-2.5 py-0.5 border border-black/40 text-center min-w-[30px] text-xs print:text-[8.5pt] shadow-2xs">
                  {plan.totalStudents}
                </span>
                <span className="font-medium text-black text-xs print:text-[8.5pt] mr-2">នាក់</span>
                <span className="font-bold text-black text-xs print:text-[8.5pt]">ស្រី ៖</span>
                <span className="bg-[#FFC000] text-black font-bold font-mono px-2.5 py-0.5 border border-black/40 text-center min-w-[30px] text-xs print:text-[8.5pt] shadow-2xs">
                  {plan.femaleStudents}
                </span>
                <span className="font-medium text-black text-xs print:text-[8.5pt]">នាក់</span>
              </div>
            </div>

            <div className="flex flex-wrap print:flex-nowrap items-center justify-between gap-x-4 gap-y-1 pt-0.5">
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-black text-xs print:text-[8.5pt]">ឈ្មោះគ្រូ ៖</span>
                  <span className="font-bold text-black text-xs print:text-[8.5pt]">{plan.teacherName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-black text-xs print:text-[8.5pt]">លេខទូរស័ព្ទ ៖</span>
                  <span className="font-bold font-mono text-black text-xs print:text-[8.5pt]">{plan.teacherPhone}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-black text-xs print:text-[8.5pt]">ឈ្មោះនាយករងបច្ចេកទេស ៖</span>
                  <span className="font-bold text-black text-xs print:text-[8.5pt]">{plan.deputyDirectorName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-black text-xs print:text-[8.5pt]">លេខទូរស័ព្ទ ៖</span>
                  <span className="font-bold font-mono text-black text-xs print:text-[8.5pt]">{plan.deputyDirectorPhone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Year 1 Config Toolbar (Interactive in UI, hidden in Print) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50/80 via-indigo-50/70 to-blue-50/80 border border-blue-200/90 rounded-2xl p-3 no-print">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Award className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <span className="font-black text-xs text-blue-950">
                  ផែនការបែងចែកភាគរយតាមកម្រិតនិទ្ទេស A, B, C, D, E, F សម្រាប់ ៦ ឆ្នាំ
                </span>
                <span className="text-[10px] bg-blue-200/90 text-blue-900 px-2 py-0.2 rounded-full font-bold ml-2">
                  ស្តង់ដារក្រសួងអប់រំ យុវជន និងកីឡា
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-950 bg-white px-3 py-1.5 rounded-xl border border-blue-300 shadow-2xs self-start sm:self-auto">
              <span className="shrink-0 flex items-center gap-1 text-slate-800 font-bold">
                📅 ឆ្នាំទី១ ៖
              </span>
              <select
                value={modelSchoolStartYear}
                onChange={(e) => handleStartYearChange(parseInt(e.target.value, 10))}
                className="px-2.5 py-1 font-bold font-mono text-center text-blue-900 bg-blue-50 border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs cursor-pointer hover:bg-blue-100 transition-colors"
                title="ជ្រើសរើសឆ្នាំទី១ (នឹងកំណត់អូតូរក្សាទុក)"
              >
                {[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Full Official MoEYS Standard Matrix Reference Table */}
          <div className="overflow-x-auto my-2 print:overflow-visible">
            <table className="w-full text-center border-collapse border border-black text-xs print:text-[8.5pt]">
              <thead>
                <tr className="bg-slate-100 border border-black text-black font-bold">
                  <th rowSpan={2} className="border border-black px-3 py-2 w-20 text-[#8B2500]">
                    និទ្ទេស
                  </th>
                  {MODEL_SCHOOL_YEAR_KEYS.map((yKey) => {
                    const b = benchmarks[yKey];
                    return (
                      <th
                        key={yKey}
                        className="border border-black px-2 py-1.5 font-bold text-[#8B2500]"
                      >
                        {b.yearName} ({b.calendarYear})
                      </th>
                    );
                  })}
                </tr>
                <tr className="bg-slate-50 border border-black text-black font-bold">
                  {MODEL_SCHOOL_YEAR_KEYS.map((yKey) => {
                    const b = benchmarks[yKey];
                    return (
                      <th
                        key={yKey}
                        className="border border-black px-2 py-1 text-[11px] print:text-[7.5pt] text-[#8B2500] font-normal"
                      >
                        <div>ក្រុមគោលដៅ</div>
                        <div className="font-bold">ABC( {b.targetABC}% )</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((grade) => (
                  <tr key={grade} className="bg-white hover:bg-blue-50/40 transition-colors">
                    <td className="border border-black px-3 py-1.5 font-black text-black bg-slate-50">
                      {grade}
                    </td>
                    {MODEL_SCHOOL_YEAR_KEYS.map((yKey) => {
                      const val = benchmarks[yKey].targets[grade];
                      const isRed =
                        (yKey === 'year4' && (grade === 'D' || grade === 'E' || grade === 'F')) ||
                        (yKey === 'year5' && (grade === 'D' || grade === 'E' || grade === 'F')) ||
                        (yKey === 'year6' && (grade === 'E' || grade === 'F'));
                      return (
                        <td
                          key={yKey}
                          className={`border border-black px-2 py-1.5 font-mono text-xs print:text-[8.5pt] ${
                            isRed ? 'text-red-600 font-bold' : 'text-black font-medium'
                          }`}
                        >
                          {val}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-100 font-bold border-t-2 border-black">
                  <td className="border border-black px-3 py-1.5 text-[#8B2500]">
                    សរុប
                  </td>
                  {MODEL_SCHOOL_YEAR_KEYS.map((yKey) => {
                    const isRed = yKey === 'year4' || yKey === 'year5' || yKey === 'year6';
                    return (
                      <td
                        key={yKey}
                        className={`border border-black px-2 py-1.5 font-mono font-bold text-xs print:text-[8.5pt] ${
                          isRed ? 'text-red-600' : 'text-black'
                        }`}
                      >
                        100%
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Official Signatures */}
          <div className="pt-5 pb-1 print:pt-4 print:pb-0 grid grid-cols-2 text-center text-xs text-black break-inside-avoid">
            <div className="space-y-1">
              <div className="font-bold">បានឃើញ និងឯកភាព</div>
              <div className="text-slate-600">ថ្ងៃទី...........ខែ...........ឆ្នាំ២០២...</div>
              <div className="font-bold font-moul text-xs pt-1">នាយករងបច្ចេកទេស</div>
              <div className="text-[11px] text-slate-500 italic">(ហត្ថលេខា និងត្រា)</div>
              <div className="h-16 print:h-20" />
              <div className="font-bold text-sm text-black">{plan.deputyDirectorName}</div>
            </div>

            <div className="space-y-1">
              <div className="text-slate-600">ថ្ងៃទី...........ខែ...........ឆ្នាំ២០២...</div>
              <div className="font-bold font-moul text-xs pt-1">គ្រូបង្រៀនមុខវិជ្ជា</div>
              <div className="text-[11px] text-slate-500 italic">(ហត្ថលេខា)</div>
              <div className="h-16 print:h-20" />
              <div className="font-bold text-sm text-black">{plan.teacherName}</div>
            </div>
          </div>
        </div>
      )}

      {/* ផែនការតាមត្រីមាស និង ១ឆ្នាំ, ៣ឆ្នាំ (លាក់ទាំងស្រុងពីផែនការទូទៅ និង ផែនការ ៦ឆ្នាំ) */}
      {activeScope !== 'all' && activeScope !== '6y' && (
        <>
          {/* Scope Navigation Switcher (ត្រីមាសទី១, ទី២, ទី៣, មួយឆ្នាំ, បីឆ្នាំ, ៦ឆ្នាំ) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 flex-wrap no-print">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-800 flex items-center">
                <Target className="w-4 h-4 text-blue-600 mr-1.5" />
                ប្រភេទផែនការ ៖
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'q1' as PlanScope, label: 'ត្រីមាសទី១' },
                { id: 'q2' as PlanScope, label: 'ត្រីមាសទី២' },
                { id: 'q3' as PlanScope, label: 'ត្រីមាសទី៣' },
                { id: 'q4' as PlanScope, label: 'ត្រីមាសទី៤' },
                { id: '1y' as PlanScope, label: 'ផែនការ ១ឆ្នាំ' },
                { id: '3y' as PlanScope, label: 'ផែនការ ៣ឆ្នាំ' },
                { id: '6y' as PlanScope, label: 'ផែនការ ៦ឆ្នាំ' },
              ].map((sc) => {
                const isCur = activeScope === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setActiveScope(sc.id);
                      if (sc.id === '1y') handleSelectBenchmarkYear('year1');
                      else if (sc.id === '3y') handleSelectBenchmarkYear('year3');
                      else if (sc.id === '6y') handleSelectBenchmarkYear('year6');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isCur
                        ? 'bg-blue-600 text-white shadow-xs scale-105'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {sc.label}
                  </button>
                );
              })}
            </div>
          </div>

      {/* Scope Notice Banner (When specific scope is selected) */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/90 rounded-2xl p-3 flex items-center justify-between no-print gap-2">
        <div className="flex items-center space-x-2 text-xs font-bold text-blue-900">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            {activeScope === 'q1' && '📊 កំពុងបង្ហាញ ៖ ផែនការត្រីមាសទី១ (៣ខែដំបូង) • បង្ហាញតារាងទី១'}
            {activeScope === 'q2' && '📊 កំពុងបង្ហាញ ៖ ផែនការត្រីមាសទី២ (៣ខែបន្ទាប់) • បង្ហាញតារាងទី២'}
            {activeScope === 'q3' && '📊 កំពុងបង្ហាញ ៖ ផែនការត្រីមាសទី៣ (២ខែ) • បង្ហាញតារាងទី៣'}
            {activeScope === 'q4' && '📊 កំពុងបង្ហាញ ៖ ផែនការត្រីមាសទី៤ (២ខែចុងក្រោយ & ចុងឆ្នាំ) • បង្ហាញតារាងទី៤'}
            {activeScope === '1y' && '🏆 កំពុងបង្ហាញ ៖ ផែនការ ១ឆ្នាំ (ឆ្នាំទី១ - គោលដៅ ABC ៣២%) • តារាងពេញ ១ឆ្នាំសិក្សា'}
            {activeScope === '3y' && '⏳ កំពុងបង្ហាញ ៖ ផែនការ ៣ឆ្នាំ • ទុកអភិវឌ្ឍន៍ពេលក្រោយ'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setActiveScope('all')}
          className="text-xs text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer whitespace-nowrap"
        >
          ត្រឡប់ទៅផែនការទូទៅ
        </button>
      </div>

      {/* Official Plan Sheet Container (Matches Excel Template Exactly for Display & Print) */}
      <div className="official-sheet bg-white rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none space-y-2">
        {/* Official Kingdom & Ministry Administrative Header (បាវចនាជាតិនៅខាងលើកណ្តាល • ការិ.អយក និង វិទ្យាល័យ តម្រឹមខាងឆ្វេង ទម្លាក់មកបន្ទាត់ទី ៣) */}
        <div className="w-full relative mb-4 print:mb-3 pt-1 pb-1 min-h-[96px] print:min-h-[86px]">
          {/* Top Center: National Motto (បាវចនាជាតិនៅខាងលើកណ្តាល) */}
          <div className="w-full text-center">
            <h2 className="font-moul text-sm sm:text-base print:text-[13pt] text-black tracking-wide leading-relaxed select-none">
              ព្រះរាជាណាចក្រកម្ពុជា
            </h2>
            <h3 className="font-moul text-xs sm:text-sm print:text-[11pt] text-black tracking-wider mt-0.5 leading-relaxed select-none">
              ជាតិ សាសនា ព្រះមហាក្សត្រ
            </h3>
            {/* Elegant Administrative Flourish (❖ ❖ ❖ with subtle divider) */}
            <div className="flex items-center justify-center space-x-1.5 pt-0.5 text-black">
              <span className="w-7 h-[1px] bg-black/70 rounded-full select-none" />
              <span className="text-[10px] sm:text-xs font-serif leading-none select-none tracking-widest text-black">❖ ❖ ❖</span>
              <span className="w-7 h-[1px] bg-black/70 rounded-full select-none" />
            </div>
          </div>

          {/* Left: Office & School (ទម្លាក់មកក្រោម មកបន្ទាត់ទី៣ ស្របនឹង ❖ ❖ ❖) */}
          <div className="sm:absolute sm:left-0 sm:top-[44px] print:absolute print:left-0 print:top-[38px] text-left text-black space-y-0.5 max-w-[42%]">
            <input
              type="text"
              value={plan.districtOffice || settings?.districtOffice || 'ការិ.អយកស្រុកកំពង់ត្រឡាច'}
              onChange={(e) => setPlan((p) => ({ ...p, districtOffice: e.target.value }))}
              className="font-moul text-[10.5px] sm:text-[11.5px] print:text-[9.5pt] text-black bg-transparent border-none outline-none w-full p-0 hover:bg-amber-50 focus:bg-white rounded cursor-text"
              title="ចុចដើម្បីកែសម្រួលឈ្មោះការិយាល័យអប់រំ"
            />
            <input
              type="text"
              value={plan.schoolName || settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}
              onChange={(e) => setPlan((p) => ({ ...p, schoolName: e.target.value }))}
              className="font-moul text-[10px] sm:text-[11px] print:text-[9pt] text-black bg-transparent border-none outline-none w-full p-0 hover:bg-amber-50 focus:bg-white rounded cursor-text"
              title="ចុចដើម្បីកែសម្រួលឈ្មោះវិទ្យាល័យ"
            />
            <div className="w-16 h-[0.75px] bg-black/70 my-0.5 print:my-0.5" />
          </div>
        </div>

        {/* Red Document Title */}
        <div className="text-center mt-2 mb-2 print:mt-1.5 print:mb-1.5">
          <h1 className="font-moul text-sm sm:text-base print:text-[13pt] text-red-600 tracking-wide leading-relaxed">
            ផែនការបង្រៀនប្រចាំឆ្នាំរបស់គ្រូ មុខវិជ្ជា {plan.subject}
          </h1>
        </div>

        {/* Metadata Details Section (រៀបជា ២ ជួរ យ៉ាងស្អាត និងមានរបៀបរៀបរយ) */}
        <div className="text-xs text-black space-y-1.5 my-2.5 print:my-1.5 print:text-[8.5pt]">
          {/* ជួរទី ១ (Row 1): ឈ្មោះសាលា • ថ្នាក់ទី • ចំនួនសិស្សសរុប • ស្រី */}
          <div className="flex flex-wrap print:flex-nowrap items-center justify-between gap-x-4 gap-y-1 border-b border-slate-100 print:border-none pb-1 print:pb-0">
            {/* ឈ្មោះសាលា */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-bold text-black text-xs print:text-[8.5pt]">ឈ្មោះសាលា ៖</span>
              <input
                type="text"
                value={plan.schoolName}
                onChange={(e) => setPlan((p) => ({ ...p, schoolName: e.target.value }))}
                className="font-bold text-black text-xs print:text-[8.5pt] bg-transparent border-b border-dotted border-slate-400 outline-none w-52 sm:w-64 hover:bg-slate-50 focus:bg-amber-50/60 px-1 print:border-none"
                placeholder="ឈ្មោះសាលា"
              />
            </div>

            {/* ថ្នាក់ទី */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-bold text-black text-xs print:text-[8.5pt]">ថ្នាក់ទី ៖</span>
              <input
                type="text"
                value={plan.className}
                onChange={(e) => setPlan((p) => ({ ...p, className: e.target.value }))}
                className="font-bold text-black text-xs print:text-[8.5pt] bg-transparent border-b border-dotted border-slate-400 outline-none w-20 text-center hover:bg-slate-50 focus:bg-amber-50/60 px-1 print:border-none"
                placeholder="ថ្នាក់ទី"
              />
            </div>

            {/* ឆ្នាំអនុវត្ត */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-bold text-black text-xs print:text-[8.5pt]">ឆ្នាំអនុវត្ត ៖</span>
              <span className="font-bold text-blue-900 print:text-black text-xs print:text-[8.5pt] bg-amber-50 print:bg-transparent px-1.5 py-0.5 rounded border border-amber-200 print:border-none">
                {toKhmerNum(modelSchoolStartYear)} - {toKhmerNum(modelSchoolStartYear + 5)}
              </span>
            </div>

            {/* ស្ថិតិសិស្ស (សរុប & ស្រី) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-bold text-black text-xs print:text-[8.5pt]">ចំនួនសិស្ស សរុប ៖</span>
              <span className="bg-[#FFC000] text-black font-bold font-mono px-2.5 py-0.5 border border-black/40 text-center min-w-[30px] text-xs print:text-[8.5pt] shadow-2xs">
                {plan.totalStudents}
              </span>
              <span className="font-medium text-black text-xs print:text-[8.5pt] mr-2">នាក់</span>

              <span className="font-bold text-black text-xs print:text-[8.5pt]">ស្រី ៖</span>
              <span className="bg-[#FFC000] text-black font-bold font-mono px-2.5 py-0.5 border border-black/40 text-center min-w-[30px] text-xs print:text-[8.5pt] shadow-2xs">
                {plan.femaleStudents}
              </span>
              <span className="font-medium text-black text-xs print:text-[8.5pt]">នាក់</span>
            </div>
          </div>

          {/* ជួរទី ២ (Row 2): ឈ្មោះគ្រូ • លេខទូរស័ព្ទ • ឈ្មោះនាយករងបច្ចេកទេស • លេខទូរស័ព្ទ */}
          <div className="flex flex-wrap print:flex-nowrap items-center justify-between gap-x-4 gap-y-1 pt-0.5">
            {/* ឈ្មោះគ្រូ & លេខទូរស័ព្ទ */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-black text-xs print:text-[8.5pt]">ឈ្មោះគ្រូ ៖</span>
                <input
                  type="text"
                  value={plan.teacherName}
                  onChange={(e) => setPlan((p) => ({ ...p, teacherName: e.target.value }))}
                  className="font-bold text-black text-xs print:text-[8.5pt] bg-transparent border-b border-dotted border-slate-400 outline-none w-36 sm:w-44 hover:bg-slate-50 focus:bg-amber-50/60 px-1 print:border-none"
                  placeholder="ឈ្មោះគ្រូ"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-black text-xs print:text-[8.5pt]">លេខទូរស័ព្ទ ៖</span>
                <input
                  type="text"
                  value={plan.teacherPhone}
                  onChange={(e) => setPlan((p) => ({ ...p, teacherPhone: e.target.value }))}
                  className="font-bold font-mono text-black text-xs print:text-[8.5pt] bg-transparent border-b border-dotted border-slate-400 outline-none w-32 sm:w-36 hover:bg-slate-50 focus:bg-amber-50/60 px-1 print:border-none"
                  placeholder="លេខទូរស័ព្ទ"
                />
              </div>
            </div>

            {/* ឈ្មោះនាយករងបច្ចេកទេស & លេខទូរស័ព្ទ */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-black text-xs print:text-[8.5pt]">ឈ្មោះនាយករងបច្ចេកទេស ៖</span>
                <input
                  type="text"
                  value={plan.deputyDirectorName}
                  onChange={(e) => setPlan((p) => ({ ...p, deputyDirectorName: e.target.value }))}
                  className="font-bold text-black text-xs print:text-[8.5pt] bg-transparent border-b border-dotted border-slate-400 outline-none w-36 sm:w-44 hover:bg-slate-50 focus:bg-amber-50/60 px-1 print:border-none"
                  placeholder="ឈ្មោះនាយករងបច្ចេកទេស"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-black text-xs print:text-[8.5pt]">លេខទូរស័ព្ទ ៖</span>
                <input
                  type="text"
                  value={plan.deputyDirectorPhone}
                  onChange={(e) => setPlan((p) => ({ ...p, deputyDirectorPhone: e.target.value }))}
                  className="font-bold font-mono text-black text-xs print:text-[8.5pt] bg-transparent border-b border-dotted border-slate-400 outline-none w-28 sm:w-32 hover:bg-slate-50 focus:bg-amber-50/60 px-1 print:border-none"
                  placeholder="លេខទូរស័ព្ទ"
                />
              </div>
            </div>
          </div>
        </div>

        {/* If activeScope is 3y: show clean "ទុកអភិវឌ្ឍន៍ពេលក្រោយ" notice and hide tables as requested */}
        {activeScope === '3y' ? (
          <div className="bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-2xl p-12 text-center my-6 space-y-3">
            <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-3xl shadow-xs">
              ⏳
            </div>
            <h3 className="font-moul text-base text-amber-950">
              ផែនការបង្រៀន ៣ឆ្នាំ
            </h3>
            <p className="text-sm font-bold text-amber-800">
              ខ្លឹមសារនេះត្រូវបានដកចេញជាបណ្ដោះអាសន្ន និង «ទុកអភិវឌ្ឍន៍ពេលក្រោយ»
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              ផ្នែកនេះនឹងត្រូវអភិវឌ្ឍបន្ថែមឱ្យកាន់តែសម្បូរបែប ស្របតាមទិសដៅយុទ្ធសាស្ត្រ និងគោលការណ៍ណែនាំថ្មីៗរបស់ក្រសួងអប់រំ យុវជន និងកីឡា។
            </p>
          </div>
        ) : (
          <>
            {/* Table 1: ត្រីមាសទី ១ */}
            {(activeScope === 'q1' || activeScope === '1y') &&
              renderTableBlock('តារាងទី ១ (ត្រីមាសទី១)', plan.monthCols?.table1 || TABLE_1_MONTHS, 'table1')}

            {/* Table 2: ត្រីមាសទី ២ */}
            {(activeScope === 'q2' || activeScope === '1y') &&
              renderTableBlock('តារាងទី ២ (ត្រីមាសទី២)', plan.monthCols?.table2 || TABLE_2_MONTHS, 'table2')}

            {/* Table 3: ត្រីមាសទី ៣ */}
            {(activeScope === 'q3' || activeScope === '1y') &&
              renderTableBlock('តារាងទី ៣ (ត្រីមាសទី៣)', plan.monthCols?.table3 || TABLE_3_MONTHS, 'table3')}

            {/* Table 4: ត្រីមាសទី ៤ (បន្ថែមថ្មី) */}
            {(activeScope === 'q4' || activeScope === '1y') &&
              renderTableBlock('តារាងទី ៤ (ត្រីមាសទី៤)', plan.monthCols?.table4 || TABLE_4_MONTHS, 'table4')}
          </>
        )}

        {/* Official Signatures (Kingdom of Cambodia Format) */}
        <div className="pt-5 pb-1 print:pt-4 print:pb-0 grid grid-cols-2 text-center text-xs text-black break-inside-avoid">
          {/* Left: Deputy Technical Director */}
          <div className="space-y-1">
            <div className="font-bold">បានឃើញ និងឯកភាព</div>
            <div className="text-slate-600">ថ្ងៃទី...........ខែ...........ឆ្នាំ២០២...</div>
            <div className="font-bold font-moul text-xs pt-1">នាយករងបច្ចេកទេស</div>
            <div className="text-[11px] text-slate-500 italic">(ហត្ថលេខា និងត្រា)</div>
            <div className="h-16 print:h-20" />
            <div className="font-bold text-sm text-black">{plan.deputyDirectorName}</div>
          </div>

          {/* Right: Subject Teacher */}
          <div className="space-y-1">
            <div className="text-slate-600">ថ្ងៃទី...........ខែ...........ឆ្នាំ២០២...</div>
            <div className="font-bold font-moul text-xs pt-1">គ្រូបង្រៀនមុខវិជ្ជា</div>
            <div className="text-[11px] text-slate-500 italic">(ហត្ថលេខា)</div>
            <div className="h-16 print:h-20" />
            <div className="font-bold text-sm text-black">{plan.teacherName}</div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
