import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Save,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Info,
  Sliders,
  Scale,
} from 'lucide-react';
import type { TeacherSettings } from '../types';
import { db } from '../db/db';
import {
  ALL_SUBJECTS,
  GRADE_TRACKS,
  DEFAULT_GRADE_MATRIX,
  MAX_SCORE_PERCENTAGE_TABLE,
  type GradeTrackKey,
} from '../utils/gradeCoefficients';
import { toKhmerNum } from '../utils/dateUtils';

interface GradeCoefficientsConfigPageProps {
  settings: TeacherSettings | null;
  onRefresh: () => void;
}

export const GradeCoefficientsConfigPage: React.FC<GradeCoefficientsConfigPageProps> = ({
  settings,
  onRefresh,
}) => {
  // Local state for the editable matrix
  const [matrixState, setMatrixState] = useState<
    Record<string, Partial<Record<GradeTrackKey, { maxScore: number; coefficient: number }>>>
  >(DEFAULT_GRADE_MATRIX);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Initialize from settings if saved
  useEffect(() => {
    if (settings?.customGradeCoefficients) {
      setMatrixState(settings.customGradeCoefficients as any);
    } else {
      setMatrixState(DEFAULT_GRADE_MATRIX);
    }
  }, [settings]);

  // Handle cell edit with automatic synchronization (ពិន្ទុ ៥០ = មេគុណ ១)
  // កែប្រែពិន្ទុ => ប្តូរចេញមេគុណស្វ័យប្រវត្តិ (មេគុណ = ពិន្ទុ / ៥០)
  // កែប្រែមេគុណ => ប្តូរចេញពិន្ទុស្វ័យប្រវត្តិ (ពិន្ទុ = មេគុណ * ៥០)
  const handleCellChange = (
    subjectId: string,
    trackKey: GradeTrackKey,
    field: 'maxScore' | 'coefficient',
    valueStr: string
  ) => {
    const rawVal = valueStr.trim();
    let newScore = 0;
    let newCoeff = 0;

    if (rawVal !== '') {
      const val = Number(rawVal);
      if (field === 'maxScore') {
        newScore = val;
        // រូបមន្ត៖ ពិន្ទុ ៥០ ស្មើ មេគុណ ១ => មេគុណ = ពិន្ទុ / ៥០
        newCoeff = val > 0 ? parseFloat((val / 50).toFixed(2)) : 0;
      } else {
        newCoeff = val;
        // មេគុណ * ៥០ = ពិន្ទុ
        newScore = val > 0 ? Math.round(val * 50) : 0;
      }
    }

    setMatrixState((prev) => {
      const subObj = prev[subjectId] || {};
      return {
        ...prev,
        [subjectId]: {
          ...subObj,
          [trackKey]: {
            maxScore: newScore,
            coefficient: newCoeff,
          },
        },
      };
    });
  };

  // Save changes to database settings
  const handleSave = async () => {
    await db.updateSettings({
      customGradeCoefficients: matrixState as any,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    onRefresh();
  };

  // Reset to Defaults
  const handleResetToDefault = async () => {
    if (window.confirm('តើលោកគ្រូចង់កំណត់មេគុណ និងពិន្ទុអតិបរមាត្រឡប់ទៅតាមស្តង់ដារក្រសួងដើមវិញមែនទេ?')) {
      setMatrixState(DEFAULT_GRADE_MATRIX);
      await db.updateSettings({
        customGradeCoefficients: DEFAULT_GRADE_MATRIX as any,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
      onRefresh();
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Banner and Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-black text-slate-800 flex items-center">
              <Sliders className="w-6 h-6 text-blue-600 mr-2" />
              កំណត់មេគុណ & ពិន្ទុអតិបរមាតាមថ្នាក់ (ក្រសួងអប់រំ)
            </h2>
            {savedSuccess && (
              <span className="inline-flex items-center text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300 animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> បានរក្សាទុកជោគជ័យ!
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            ប្រព័ន្ធគណនាអូតូតាមស្តង់ដារក្រសួងអប់រំ៖ <strong>ពិន្ទុ ៥០ ស្មើ មេគុណ ១</strong> (លោកគ្រូកែពិន្ទុ ឬមេគុណ ប្រព័ន្ធនឹងប្តូរជូនភ្លាមៗ)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Reset to Default */}
          <button
            onClick={handleResetToDefault}
            className="inline-flex items-center px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            title="កំណត់ឡើងវិញតាមលំនាំដើមរបស់ក្រសួងអប់រំ"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            កំណត់ឡើងវិញតាមលំនាំដើម
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 mr-1.5" />
            រក្សាទុកការកែប្រែ
          </button>
        </div>
      </div>

      {/* Auto-Calculation Notification Callout */}
      <div className="bg-linear-to-r from-blue-50 via-indigo-50 to-amber-50 border border-blue-200/80 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs no-print shadow-2xs">
        <div className="flex items-center space-x-2.5 text-blue-950 font-bold">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-black text-blue-900">
              ⚖️ រូបមន្តស្វ័យប្រវត្តិ៖ ពិន្ទុ ៥០ = មេគុណ ១ (មេគុណ = ពិន្ទុ / ៥០)
            </p>
            <p className="text-[11px] text-blue-700/90 font-medium mt-0.5">
              ពេលលោកគ្រូកែប្រែប្រអប់ «ពិន្ទុ» ប្រព័ន្ធនឹងប្តូរ «មេគុណ» ស្វ័យប្រវត្តិ ឬកែ «មេគុណ» នឹងប្តូរ «ពិន្ទុ» ភ្លាមៗ!
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg font-mono font-bold text-[11px]">
            50ពិន្ទុ = 1.0
          </span>
          <span className="px-2 py-1 bg-amber-100 text-amber-900 rounded-lg font-mono font-bold text-[11px]">
            75ពិន្ទុ = 1.5
          </span>
          <span className="px-2 py-1 bg-emerald-100 text-emerald-900 rounded-lg font-mono font-bold text-[11px]">
            100ពិន្ទុ = 2.0
          </span>
        </div>
      </div>

      {/* Tables Container (Modern, High-Clarity, Clean Aesthetic) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Table 1: ពិន្ទុអតិបរមា & មេគុណ (Left Table, spans 8 cols) */}
        <div className="xl:col-span-8 bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
          {/* Table Header Ribbon */}
          <div className="bg-linear-to-r from-slate-900 via-blue-950 to-indigo-950 px-4 py-3 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-amber-400" />
              <h3 className="font-moul text-sm sm:text-base tracking-wide text-white">
                ពិន្ទុអតិបរមា & មេគុណតាមកម្រិតថ្នាក់
              </h3>
            </div>
            <span className="text-[11px] font-bold text-blue-200 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
              ថ្នាក់ទី ៧ ដល់ ១២
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                {/* Header Row 1: Grade tracks */}
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th rowSpan={2} className="py-2.5 px-3 border border-slate-200 text-left min-w-[130px] font-black bg-slate-200/70 text-slate-900 sticky left-0 z-10">
                    មុខវិជ្ជា
                  </th>
                  {GRADE_TRACKS.map((t) => (
                    <th
                      key={t.key}
                      colSpan={2}
                      className="py-2 px-1 border border-slate-200 whitespace-nowrap text-[11px] font-black text-slate-800 bg-slate-100"
                    >
                      {t.shortLabel}
                    </th>
                  ))}
                </tr>
                {/* Header Row 2: ពិន្ទុ & មេគុណ sub-headers */}
                <tr className="text-[10px] font-bold border-b border-slate-200">
                  {GRADE_TRACKS.map((t) => (
                    <React.Fragment key={t.key}>
                      <th className="py-1 px-1 border border-slate-200 min-w-[46px] bg-blue-50 text-blue-800 font-bold" title="ពិន្ទុអតិបរមា">
                        ពិន្ទុ
                      </th>
                      <th className="py-1 px-1 border border-slate-200 min-w-[46px] bg-amber-50 text-amber-900 font-black" title="មេគុណ (ស្មើ ពិន្ទុ / ៥០)">
                        មេគុណ
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-bold">
                {ALL_SUBJECTS.map((sub, sIdx) => {
                  const subTrackObj = matrixState[sub.id] || {};
                  const isEven = sIdx % 2 === 0;

                  return (
                    <tr key={sub.id} className={`hover:bg-blue-50/40 transition-colors ${isEven ? 'bg-white' : 'bg-slate-50/40'}`}>
                      {/* Subject Name (Sticky Left) */}
                      <td className="py-2 px-3 text-left border border-slate-200/80 font-bold text-slate-900 whitespace-nowrap bg-slate-50/90 sticky left-0 z-10 shadow-2xs">
                        <span className="text-slate-800">{sub.name}</span>
                      </td>

                      {/* Grade Tracks */}
                      {GRADE_TRACKS.map((t) => {
                        const cell = subTrackObj[t.key];
                        const hasVal = cell && (cell.maxScore > 0 || cell.coefficient > 0);

                        return (
                          <React.Fragment key={t.key}>
                            {/* ពិន្ទុ (Max score - Blue Tinted Box) */}
                            <td className="p-0.5 border border-slate-200/70 bg-blue-50/20">
                              <input
                                type="number"
                                placeholder="-"
                                value={hasVal && cell?.maxScore ? cell.maxScore : (cell?.maxScore === 0 ? '' : '')}
                                onChange={(e) =>
                                  handleCellChange(sub.id, t.key, 'maxScore', e.target.value)
                                }
                                title={`${sub.name} (${t.shortLabel}) - ពិន្ទុអតិបរមា: ${cell?.maxScore || 0}`}
                                className="w-full text-center py-1 bg-transparent text-blue-900 font-bold text-xs rounded border border-transparent hover:border-blue-300 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                              />
                            </td>

                            {/* មេគុណ (Coefficient - Amber Tinted Box, Auto-calculated) */}
                            <td className="p-0.5 border border-slate-200/70 bg-amber-50/30">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="-"
                                value={hasVal && cell?.coefficient ? cell.coefficient : (cell?.coefficient === 0 ? '' : '')}
                                onChange={(e) =>
                                  handleCellChange(sub.id, t.key, 'coefficient', e.target.value)
                                }
                                title={`${sub.name} (${t.shortLabel}) - មេគុណ: ${cell?.coefficient || 0} (ស្មើ ពិន្ទុ/៥០)`}
                                className="w-full text-center py-1 bg-transparent text-amber-950 font-black text-xs rounded border border-transparent hover:border-amber-300 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-400 outline-none transition-all"
                              />
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Helper */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <span>🔹 ជួរឈរ <strong className="text-blue-700">ពិន្ទុ</strong> = ពិន្ទុអតិបរមាសម្រាប់មុខវិជ្ជា</span>
            <span>🔸 ជួរឈរ <strong className="text-amber-800">មេគុណ</strong> = គណនាស្វ័យប្រវត្តិ (ពិន្ទុ ÷ ៥០)</span>
          </div>
        </div>

        {/* Table 2: ភាគរយនៃពិន្ទុអតិបរមា (Right Table, spans 4 cols) */}
        <div className="xl:col-span-4 bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
          {/* Table Header Ribbon */}
          <div className="bg-linear-to-r from-indigo-900 via-purple-950 to-slate-900 px-4 py-3 text-white flex items-center justify-between border-b border-indigo-950">
            <h3 className="font-moul text-sm sm:text-base tracking-wide text-white">
              ភាគរយនៃពិន្ទុអតិបរមា
            </h3>
            <span className="text-[11px] font-bold text-purple-200 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
              និទ្ទេស A - F
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-200 text-[11px]">
                  <th className="py-2 px-2 border border-slate-200 bg-slate-200/70">ពិន្ទុអតិ.</th>
                  <th className="py-2 px-1 border border-slate-200 bg-rose-50 text-rose-700">F<br/><span className="text-[9.5px] font-normal text-rose-500">0%</span></th>
                  <th className="py-2 px-1 border border-slate-200 bg-orange-50 text-orange-700">E<br/><span className="text-[9.5px] font-normal text-orange-500">50%</span></th>
                  <th className="py-2 px-1 border border-slate-200 bg-amber-50 text-amber-800">D<br/><span className="text-[9.5px] font-normal text-amber-600">60%</span></th>
                  <th className="py-2 px-1 border border-slate-200 bg-blue-50 text-blue-700">C<br/><span className="text-[9.5px] font-normal text-blue-500">70%</span></th>
                  <th className="py-2 px-1 border border-slate-200 bg-indigo-50 text-indigo-700">B<br/><span className="text-[9.5px] font-normal text-indigo-500">80%</span></th>
                  <th className="py-2 px-1 border border-slate-200 bg-emerald-50 text-emerald-800">A<br/><span className="text-[9.5px] font-normal text-emerald-600">90%</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {MAX_SCORE_PERCENTAGE_TABLE.map((row, rIdx) => {
                  const isEven = rIdx % 2 === 0;
                  return (
                    <tr key={row.max} className={`hover:bg-slate-50 transition-colors ${isEven ? 'bg-white' : 'bg-slate-50/40'}`}>
                      <td className="py-1.5 px-2 border border-slate-200 bg-slate-100/70 font-black font-sans text-slate-800">
                        {row.max}
                      </td>
                      <td className="py-1.5 px-1 border border-slate-200 text-rose-600 font-semibold">{row.f.toFixed(2)}</td>
                      <td className="py-1.5 px-1 border border-slate-200 text-orange-600 font-semibold">{row.e.toFixed(2)}</td>
                      <td className="py-1.5 px-1 border border-slate-200 text-amber-700 font-semibold">{row.d.toFixed(2)}</td>
                      <td className="py-1.5 px-1 border border-slate-200 text-blue-600 font-semibold">{row.c.toFixed(2)}</td>
                      <td className="py-1.5 px-1 border border-slate-200 text-indigo-700 font-semibold">{row.b.toFixed(2)}</td>
                      <td className="py-1.5 px-1 border border-slate-200 text-emerald-700 font-black bg-emerald-50/30">{row.a.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-slate-50 text-[11px] text-slate-600 border-t border-slate-200 space-y-1">
            <p className="font-bold text-slate-900 flex items-center">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 mr-1" />
              កំណត់សម្គាល់កម្រិតនិទ្ទេសក្រសួង៖
            </p>
            <div className="grid grid-cols-2 gap-1 text-[10.5px]">
              <p><strong className="text-emerald-700">● និទ្ទេស A៖</strong> ចាប់ពី ៩០% ឡើង (ល្អប្រសើរ)</p>
              <p><strong className="text-indigo-700">● និទ្ទេស B៖</strong> ៨០% ដល់ ៨៩.៩៩% (ល្អណាស់)</p>
              <p><strong className="text-blue-700">● និទ្ទេស C៖</strong> ៧០% ដល់ ៧៩.៩៩% (ល្អ)</p>
              <p><strong className="text-amber-700">● និទ្ទេស D៖</strong> ៦០% ដល់ ៦៩.៩៩% (ល្អបង្គួរ)</p>
              <p><strong className="text-orange-700">● និទ្ទេស E៖</strong> ៥០% ដល់ ៥៩.៩៩% (មធ្យម / ជាប់)</p>
              <p><strong className="text-rose-700">● និទ្ទេស F៖</strong> ក្រោម ៥០% (ធ្លាក់)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
