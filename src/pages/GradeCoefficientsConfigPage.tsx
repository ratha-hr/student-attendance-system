import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Save,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Info,
  Sliders,
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

  // Handle cell edit
  const handleCellChange = (
    subjectId: string,
    trackKey: GradeTrackKey,
    field: 'maxScore' | 'coefficient',
    valueStr: string
  ) => {
    const val = valueStr === '' ? 0 : Number(valueStr);
    setMatrixState((prev) => {
      const subObj = prev[subjectId] || {};
      const trackObj = subObj[trackKey] || { maxScore: 0, coefficient: 0 };
      return {
        ...prev,
        [subjectId]: {
          ...subObj,
          [trackKey]: {
            ...trackObj,
            [field]: val,
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

  // Reset to Image 3 Defaults
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
    <div className="space-y-6">
      {/* Top Banner and Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
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
            លោកគ្រូអាចកែប្រែពិន្ទុអតិបរមា និងមេគុណតាមចិត្តសម្រាប់ថ្នាក់នីមួយៗ (៧ ដល់ ១២) ហើយប្រព័ន្ធនឹងគណនាពិន្ទុ និងនិទ្ទេសស្វ័យប្រវត្តិតាមការកំណត់នេះ
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

      {/* Tables Container (Matching Visual Design of Image 3) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Table 1: ពិន្ទុអតិបរមា & មេគុណ (Left Table, spans 8 cols) */}
        <div className="xl:col-span-8 bg-[#001f3f] rounded-2xl border-4 border-amber-400/90 shadow-xl overflow-hidden p-1">
          <div className="bg-amber-300 py-2 text-center border-b-2 border-amber-500">
            <h3 className="font-moul text-base sm:text-lg text-[#001f3f] tracking-wide">
              ពិន្ទុអតិបរមា & មេគុណ
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                {/* Header Row 1: Grade tracks */}
                <tr className="bg-[#b3d7ff] text-[#001f3f] font-bold border-b border-white/20">
                  <th rowSpan={2} className="py-2.5 px-3 border border-white/40 text-left min-w-[130px] font-bold">
                    មុខវិជ្ជា
                  </th>
                  {GRADE_TRACKS.map((t) => (
                    <th
                      key={t.key}
                      colSpan={2}
                      className="py-2 px-1 border border-white/40 whitespace-nowrap text-[11px] font-black"
                    >
                      {t.shortLabel}
                    </th>
                  ))}
                </tr>
                {/* Header Row 2: ពិន្ទុ & មេគុណ sub-headers */}
                <tr className="bg-[#b3d7ff] text-[#001f3f] text-[10px] font-bold border-b border-white/40">
                  {GRADE_TRACKS.map((t) => (
                    <React.Fragment key={t.key}>
                      <th className="py-1 px-1 border border-white/40 min-w-[42px] bg-[#99c8ff]">ពិន្ទុ</th>
                      <th className="py-1 px-1 border border-white/40 min-w-[42px] bg-[#ff8080] text-red-950 font-black">
                        មេគុណ
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="text-white divide-y divide-white/20 font-bold">
                {ALL_SUBJECTS.map((sub) => {
                  const subTrackObj = matrixState[sub.id] || {};

                  return (
                    <tr key={sub.id} className="hover:bg-white/10 transition-colors">
                      {/* Subject Name */}
                      <td className="py-1.5 px-2.5 text-left border border-white/30 bg-[#001730] font-bold whitespace-nowrap">
                        {sub.name}
                      </td>

                      {/* Grade Tracks */}
                      {GRADE_TRACKS.map((t) => {
                        const cell = subTrackObj[t.key];
                        const hasVal = cell && (cell.maxScore > 0 || cell.coefficient > 0);

                        return (
                          <React.Fragment key={t.key}>
                            {/* ពិន្ទុ (Max score - Teal/Navy) */}
                            <td className="p-0 border border-white/30 bg-[#002b5c]">
                              {hasVal ? (
                                <input
                                  type="number"
                                  value={cell?.maxScore ?? ''}
                                  onChange={(e) =>
                                    handleCellChange(sub.id, t.key, 'maxScore', e.target.value)
                                  }
                                  className="w-full text-center py-1 bg-transparent text-white font-bold text-xs focus:bg-white focus:text-slate-900 border-0 outline-none"
                                />
                              ) : (
                                <input
                                  type="number"
                                  placeholder="-"
                                  value={cell?.maxScore ?? ''}
                                  onChange={(e) =>
                                    handleCellChange(sub.id, t.key, 'maxScore', e.target.value)
                                  }
                                  className="w-full text-center py-1 bg-transparent text-slate-400 font-bold text-xs focus:bg-white focus:text-slate-900 border-0 outline-none"
                                />
                              )}
                            </td>

                            {/* មេគុណ (Coefficient - Red background) */}
                            <td className="p-0 border border-white/30 bg-[#cc0000]">
                              {hasVal ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={cell?.coefficient ?? ''}
                                  onChange={(e) =>
                                    handleCellChange(sub.id, t.key, 'coefficient', e.target.value)
                                  }
                                  className="w-full text-center py-1 bg-transparent text-white font-black text-xs focus:bg-white focus:text-red-700 border-0 outline-none"
                                />
                              ) : (
                                <input
                                  type="number"
                                  step="0.1"
                                  placeholder="-"
                                  value={cell?.coefficient ?? ''}
                                  onChange={(e) =>
                                    handleCellChange(sub.id, t.key, 'coefficient', e.target.value)
                                  }
                                  className="w-full text-center py-1 bg-transparent text-red-200 font-black text-xs focus:bg-white focus:text-red-700 border-0 outline-none"
                                />
                              )}
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
        </div>

        {/* Table 2: ភាគរយនៃពិន្ទុអតិបរមា (Right Table, spans 4 cols) */}
        <div className="xl:col-span-4 bg-[#001f3f] rounded-2xl border-4 border-amber-400/90 shadow-xl overflow-hidden p-1 flex flex-col">
          <div className="bg-amber-300 py-2 text-center border-b-2 border-amber-500">
            <h3 className="font-moul text-base sm:text-lg text-[#001f3f] tracking-wide">
              ភាគរយនៃពិន្ទុអតិបរមា
            </h3>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="bg-[#b3d7ff] text-[#001f3f] font-black border-b border-white/30 text-[11px]">
                  <th className="py-2.5 px-2 border border-white/40">ពិន្ទុអតិ.</th>
                  <th className="py-2.5 px-1 border border-white/40">F<br/><span className="text-[10px] font-normal">0%</span></th>
                  <th className="py-2.5 px-1 border border-white/40">E<br/><span className="text-[10px] font-normal">50%</span></th>
                  <th className="py-2.5 px-1 border border-white/40">D<br/><span className="text-[10px] font-normal">60%</span></th>
                  <th className="py-2.5 px-1 border border-white/40">C<br/><span className="text-[10px] font-normal">70%</span></th>
                  <th className="py-2.5 px-1 border border-white/40">B<br/><span className="text-[10px] font-normal">80%</span></th>
                  <th className="py-2.5 px-1 border border-white/40">A<br/><span className="text-[10px] font-normal">90%</span></th>
                </tr>
              </thead>
              <tbody className="text-white divide-y divide-white/20 font-mono text-xs">
                {MAX_SCORE_PERCENTAGE_TABLE.map((row) => (
                  <tr key={row.max} className="hover:bg-white/10 transition-colors">
                    <td className="py-1.5 px-2 border border-white/30 bg-[#002b5c] font-black font-sans text-amber-300">
                      {row.max}
                    </td>
                    <td className="py-1.5 px-1 border border-white/30 text-rose-300">{row.f.toFixed(2)}</td>
                    <td className="py-1.5 px-1 border border-white/30 text-orange-200">{row.e.toFixed(2)}</td>
                    <td className="py-1.5 px-1 border border-white/30 text-amber-200">{row.d.toFixed(2)}</td>
                    <td className="py-1.5 px-1 border border-white/30 text-blue-200">{row.c.toFixed(2)}</td>
                    <td className="py-1.5 px-1 border border-white/30 text-sky-200">{row.b.toFixed(2)}</td>
                    <td className="py-1.5 px-1 border border-white/30 text-emerald-300 font-bold">{row.a.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-[#001730] text-[11px] text-slate-300 border-t border-white/20 space-y-1">
            <p className="font-bold text-amber-300">💡 កំណត់សម្គាល់និទ្ទេស៖</p>
            <p>• និទ្ទេស A: ចាប់ពី ៩០% ឡើងទៅ (ល្អប្រសើរ)</p>
            <p>• និទ្ទេស B: ចាប់ពី ៨០% ដល់ ៨៩.៩៩% (ល្អណាស់)</p>
            <p>• និទ្ទេស C: ចាប់ពី ៧០% ដល់ ៧៩.៩៩% (ល្អ)</p>
            <p>• និទ្ទេស D: ចាប់ពី ៦០% ដល់ ៦៩.៩៩% (ល្អបង្គួរ)</p>
            <p>• និទ្ទេស E: ចាប់ពី ៥០% ដល់ ៥៩.៩៩% (មធ្យម / ជាប់)</p>
            <p>• និទ្ទេស F: ក្រោម ៥០% (ធ្លាក់)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
