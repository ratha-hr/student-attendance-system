import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
  Edit2,
  Trash2,
  BookOpen,
  Target,
  BarChart3,
  Calendar,
} from 'lucide-react';
import type { YearlyPlanItem, PlanStatus, TeacherSettings } from '../types';
import { db } from '../db/db';
import { Modal } from '../components/common/Modal';
import { toKhmerNum, KHMER_MONTHS } from '../utils/dateUtils';

interface AnnualPlanPageProps {
  yearlyPlans: YearlyPlanItem[];
  settings: TeacherSettings | null;
  onRefresh: () => void;
}

export const AnnualPlanPage: React.FC<AnnualPlanPageProps> = ({
  yearlyPlans,
  settings,
  onRefresh,
}) => {
  const [activeTerm, setActiveTerm] = useState<'all' | 'term1' | 'term2'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<YearlyPlanItem | null>(null);

  // Form Fields
  const [academicYear, setAcademicYear] = useState(settings?.academicYear || '២០២៤-២០២៥');
  const [term, setTerm] = useState<'term1' | 'term2'>('term1');
  const [month, setMonth] = useState('តុលា');
  const [week, setWeek] = useState(1);
  const [subject, setSubject] = useState(settings?.specialtySubject || 'ភាសាខ្មែរ');
  const [grade, setGrade] = useState('៧');
  const [chapter, setChapter] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [durationHours, setDurationHours] = useState(2);
  const [objectives, setObjectives] = useState('');
  const [materials, setMaterials] = useState('');
  const [assessment, setAssessment] = useState('');
  const [status, setStatus] = useState<PlanStatus>('pending');
  const [notes, setNotes] = useState('');

  // Filter items
  const filteredPlans = useMemo(() => {
    return yearlyPlans.filter((p) => {
      const matchTerm = activeTerm === 'all' || p.term === activeTerm;
      const matchMonth = selectedMonth === 'all' || p.month === selectedMonth;
      return matchTerm && matchMonth;
    });
  }, [yearlyPlans, activeTerm, selectedMonth]);

  // Overall Statistics
  const totalItems = yearlyPlans.length;
  const completedItems = yearlyPlans.filter((p) => p.status === 'completed').length;
  const inProgressItems = yearlyPlans.filter((p) => p.status === 'in_progress').length;
  const pendingItems = yearlyPlans.filter((p) => p.status === 'pending').length;
  const totalHours = yearlyPlans.reduce((sum, item) => sum + (item.durationHours || 0), 0);
  const completedHours = yearlyPlans
    .filter((p) => p.status === 'completed')
    .reduce((sum, item) => sum + (item.durationHours || 0), 0);
  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const openAddModal = () => {
    setEditingItem(null);
    setAcademicYear(settings?.academicYear || '២០២៤-២០២៥');
    setTerm('term1');
    setMonth('តុលា');
    setWeek(1);
    setSubject(settings?.specialtySubject || 'ភាសាខ្មែរ');
    setGrade('៧');
    setChapter('');
    setLessonTitle('');
    setDurationHours(2);
    setObjectives('');
    setMaterials('');
    setAssessment('');
    setStatus('pending');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: YearlyPlanItem) => {
    setEditingItem(item);
    setAcademicYear(item.academicYear);
    setTerm(item.term);
    setMonth(item.month);
    setWeek(item.week);
    setSubject(item.subject);
    setGrade(item.grade);
    setChapter(item.chapter);
    setLessonTitle(item.lessonTitle);
    setDurationHours(item.durationHours);
    setObjectives(item.objectives);
    setMaterials(item.materials || '');
    setAssessment(item.assessment || '');
    setStatus(item.status);
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (item: YearlyPlanItem) => {
    const nextStatus: PlanStatus =
      item.status === 'pending'
        ? 'in_progress'
        : item.status === 'in_progress'
        ? 'completed'
        : 'pending';
    await db.yearlyPlans.update(item.id, { status: nextStatus });
    onRefresh();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) return;

    if (editingItem) {
      await db.yearlyPlans.update(editingItem.id, {
        academicYear,
        term,
        month,
        week: Number(week),
        subject,
        grade,
        chapter: chapter.trim(),
        lessonTitle: lessonTitle.trim(),
        durationHours: Number(durationHours),
        objectives: objectives.trim(),
        materials: materials.trim(),
        assessment: assessment.trim(),
        status,
        notes: notes.trim(),
      });
    } else {
      const newItem: YearlyPlanItem = {
        id: 'yp-' + Date.now(),
        academicYear,
        term,
        month,
        week: Number(week),
        subject,
        grade,
        chapter: chapter.trim(),
        lessonTitle: lessonTitle.trim(),
        durationHours: Number(durationHours),
        objectives: objectives.trim(),
        materials: materials.trim(),
        assessment: assessment.trim(),
        status,
        notes: notes.trim(),
      };
      await db.yearlyPlans.add(newItem);
    }

    setIsModalOpen(false);
    onRefresh();
  };

  const handleDelete = async (item: YearlyPlanItem) => {
    if (window.confirm(`តើអ្នកពិតជាចង់លុបមេរៀន "${item.lessonTitle}" ចេញពីផែនការមែនទេ?`)) {
      await db.yearlyPlans.delete(item.id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center">
            <CalendarDays className="w-6 h-6 text-blue-600 mr-2" />
            ផែនការគ្រូ ១ ឆ្នាំ (ផែនការបង្រៀនប្រចាំឆ្នាំ)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            បំណែងចែកកម្មវិធីបង្រៀនប្រចាំឆមាសទី១ និងទី២ តាមខែ និងសប្តាហ៍ ឆ្នាំសិក្សា {settings?.academicYear || '២០២៤-២០២៥'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            បោះពុម្ពផែនការ
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1" />
            បន្ថែមមេរៀនក្នុងផែនការ
          </button>
        </div>
      </div>

      {/* Progress & Metrics Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-slate-500">វឌ្ឍនភាពនៃការអនុវត្តផែនការបង្រៀន៖</span>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-blue-600">{toKhmerNum(percentage)}%</span>
              <span className="text-xs text-slate-500">
                (បានបញ្ចប់ {toKhmerNum(completedItems)} / {toKhmerNum(totalItems)} មេរៀន • {toKhmerNum(completedHours)} / {toKhmerNum(totalHours)} ម៉ោង)
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-semibold">
            <span className="flex items-center text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5" /> បានបញ្ចប់: {toKhmerNum(completedItems)}
            </span>
            <span className="flex items-center text-blue-600">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5" /> កំពុងអនុវត្ត: {toKhmerNum(inProgressItems)}
            </span>
            <span className="flex items-center text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 mr-1.5" /> មិនទាន់អនុវត្ត: {toKhmerNum(pendingItems)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
          <div
            className="bg-blue-500 h-full transition-all duration-500"
            style={{ width: `${totalItems > 0 ? (inProgressItems / totalItems) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Term & Month Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 no-print">
        {/* Term Switch */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTerm('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTerm === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            ពេញមួយឆ្នាំ (ទាំង២ឆមាស)
          </button>
          <button
            onClick={() => setActiveTerm('term1')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTerm === 'term1' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            ឆមាសទី ១ (តុលា - កុម្ភៈ)
          </button>
          <button
            onClick={() => setActiveTerm('term2')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTerm === 'term2' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            ឆមាសទី ២ (មីនា - កក្កដា)
          </button>
        </div>

        {/* Month Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-bold text-slate-700">ខែ៖</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
          >
            <option value="all">គ្រប់ខែទាំងអស់</option>
            {['តុលា', 'វិច្ឆិកា', 'ធ្នូ', 'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា'].map((m) => (
              <option key={m} value={m}>
                ខែ {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Printable Official Header */}
      <div className="hidden print:block text-center my-4">
        <h3 className="font-moul text-base">ព្រះរាជាណាចក្រកម្ពុជា</h3>
        <h4 className="font-moul text-sm">ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
        <div className="w-24 h-0.5 bg-black mx-auto my-2" />
        <h2 className="font-moul text-base mt-3">
          ផែនការបង្រៀនប្រចាំឆ្នាំ (១ ឆ្នាំ) - ឆ្នាំសិក្សា {settings?.academicYear}
        </h2>
        <p className="text-xs mt-1">
          គ្រូបង្រៀន៖ {settings?.teacherName} • មុខវិជ្ជា៖ {settings?.specialtySubject} • {settings?.schoolName}
        </p>
      </div>

      {/* Annual Plan Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[11px] sm:text-xs font-bold uppercase">
                <th className="py-3 px-2 text-center w-14">ខែ / សប្តាហ៍</th>
                <th className="py-3 px-3 w-40">ជំពូក</th>
                <th className="py-3 px-3">ចំណងជើងមេរៀន / សកម្មភាព</th>
                <th className="py-3 px-2 text-center w-16">ម៉ោង</th>
                <th className="py-3 px-3 hidden lg:table-cell w-56">វត្ថុបំណង</th>
                <th className="py-3 px-3 hidden xl:table-cell w-44">សម្ភារៈឧបទេស</th>
                <th className="py-3 px-3 text-center w-28">ស្ថានភាព</th>
                <th className="py-3 px-3 text-center w-20 no-print">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    មិនទាន់មានមេរៀនក្នុងផែនការសម្រាប់ជម្រើសនេះទេ
                  </td>
                </tr>
              ) : (
                filteredPlans.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      <td className="py-3 px-2 text-center font-bold text-slate-700 whitespace-nowrap">
                        <span className="block text-xs text-blue-700">{item.month}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          សប្តាហ៍ទី {toKhmerNum(item.week)}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-800 text-xs">
                        {item.chapter || '-'}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block group-hover:text-blue-700">
                          {item.lessonTitle}
                        </span>
                        {item.notes && (
                          <span className="text-[11px] text-slate-400 italic block mt-0.5">
                            {item.notes}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-center font-bold text-blue-700 whitespace-nowrap">
                        {toKhmerNum(item.durationHours)} ម៉ោង
                      </td>

                      <td className="py-3 px-3 hidden lg:table-cell text-xs text-slate-600 leading-snug">
                        {item.objectives}
                      </td>

                      <td className="py-3 px-3 hidden xl:table-cell text-xs text-slate-500 leading-snug">
                        {item.materials || '-'}
                      </td>

                      {/* Status pill with one-click toggle */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            item.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : item.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}
                          title="ចុចដើម្បីប្តូរស្ថានភាព"
                        >
                          {item.status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {item.status === 'in_progress' && <Clock className="w-3 h-3 mr-1" />}
                          {item.status === 'completed'
                            ? 'បានបញ្ចប់'
                            : item.status === 'in_progress'
                            ? 'កំពុងអនុវត្ត'
                            : 'មិនទាន់អនុវត្ត'}
                        </button>
                      </td>

                      <td className="py-3 px-3 text-center no-print whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="កែប្រែ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="លុប"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add / Edit Annual Plan Item */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'កែប្រែផែនការបង្រៀន' : 'បន្ថែមមេរៀនក្នុងផែនការ ១ ឆ្នាំ'}
        subtitle="កំណត់កម្មវិធីបង្រៀនតាមខែ និងសប្តាហ៍"
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ឆមាស <span className="text-rose-500">*</span>
              </label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value as 'term1' | 'term2')}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
              >
                <option value="term1">ឆមាសទី ១</option>
                <option value="term2">ឆមាសទី ២</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ខែ <span className="text-rose-500">*</span>
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
              >
                {['តុលា', 'វិច្ឆិកា', 'ធ្នូ', 'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា'].map((m) => (
                  <option key={m} value={m}>
                    ខែ {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                សប្តាហ៍ទី
              </label>
              <select
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
              >
                {[1, 2, 3, 4, 5].map((w) => (
                  <option key={w} value={w}>
                    សប្តាហ៍ទី {toKhmerNum(w)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ជំពូកទី / ផ្នែក
              </label>
              <input
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="ឧ. ជំពូកទី ១៖ ការស្គាល់ខ្លួនឯង..."
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ចំនួនម៉ោងបង្រៀន
              </label>
              <input
                type="number"
                min="1"
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ចំណងជើងមេរៀន / សកម្មភាព <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="ឧ. មេរៀនទី ២៖ អត្ថបទអាន «ថ្ងៃដំបូងនៃការចូលរៀន»..."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              វត្ថុបំណងនៃការបង្រៀន
            </label>
            <textarea
              rows={2}
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="សិស្សអាចយល់ដឹង អាន ឬដោះស្រាយលំហាត់..."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                សម្ភារៈឧបទេស / ឧបករណ៍បង្រៀន
              </label>
              <input
                type="text"
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                placeholder="សៀវភៅពុម្ព, ផ្ទាំងរូបភាព, កាតពាក្យ..."
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                វិធីសាស្ត្រវាយតម្លៃ
              </label>
              <input
                type="text"
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                placeholder="សង្កេត, កិច្ចការផ្ទះ, តេស្តប្រចាំខែ..."
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ស្ថានភាពបច្ចុប្បន្ន
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PlanStatus)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
              >
                <option value="pending">មិនទាន់អនុវត្ត (Pending)</option>
                <option value="in_progress">កំពុងអនុវត្ត (In Progress)</option>
                <option value="completed">បានបញ្ចប់ (Completed)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                កំណត់ចំណាំ
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="កំណត់ចំណាំផ្សេងៗ..."
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
            >
              {editingItem ? 'រក្សាទុកការកែប្រែ' : 'បញ្ចូលក្នុងផែនការ'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
