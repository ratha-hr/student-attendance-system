import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  BookOpen,
  Quote,
  Calculator,
  PenTool,
  Copy,
  Check,
  Printer,
  Edit2,
  Trash2,
  Tag,
  BookMarked,
  Filter,
} from 'lucide-react';
import type { LessonExtract, ExtractCategory } from '../types';
import { db } from '../db/db';
import { Modal } from '../components/common/Modal';
import { formatKhmerDate } from '../utils/dateUtils';

interface LessonExtractsPageProps {
  extracts: LessonExtract[];
  onRefresh: () => void;
}

export const LessonExtractsPage: React.FC<LessonExtractsPageProps> = ({
  extracts,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExtract, setEditingExtract] = useState<LessonExtract | null>(null);
  const [viewingExtract, setViewingExtract] = useState<LessonExtract | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('ភាសាខ្មែរ');
  const [grade, setGrade] = useState('៧');
  const [category, setCategory] = useState<ExtractCategory>('reading');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const categoryLabels: Record<ExtractCategory, { label: string; icon: any; color: string }> = {
    reading: { label: 'អត្ថបទអាន/អក្សរសិល្ប៍', icon: BookOpen, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    lesson_summary: { label: 'ខ្លឹមសារមេរៀនសង្ខេប', icon: FileText, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    dictation: { label: 'សរសេរតាមអាន', icon: PenTool, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    quote: { label: 'ពាក្យស្លោក/គតិបណ្ឌិត', icon: Quote, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    formula: { label: 'រូបមន្ត/វិធាន', icon: Calculator, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    general: { label: 'ទូទៅ', icon: BookMarked, color: 'text-slate-600 bg-slate-50 border-slate-200' },
  };

  const filteredExtracts = extracts.filter((ext) => {
    const matchesCategory = selectedCategory === 'all' || ext.category === selectedCategory;
    const matchesSearch =
      ext.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ext.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ext.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ext.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const openAddModal = () => {
    setEditingExtract(null);
    setTitle('');
    setSubject('ភាសាខ្មែរ');
    setGrade('៧');
    setCategory('reading');
    setContent('');
    setSource('');
    setTagsInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (ext: LessonExtract) => {
    setEditingExtract(ext);
    setTitle(ext.title);
    setSubject(ext.subject);
    setGrade(ext.grade);
    setCategory(ext.category);
    setContent(ext.content);
    setSource(ext.source || '');
    setTagsInput(ext.tags.join(', '));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingExtract) {
      await db.extracts.update(editingExtract.id, {
        title: title.trim(),
        subject: subject.trim(),
        grade: grade.trim(),
        category,
        content: content.trim(),
        source: source.trim(),
        tags,
      });
    } else {
      const newExtract: LessonExtract = {
        id: 'ext-' + Date.now(),
        title: title.trim(),
        subject: subject.trim(),
        grade: grade.trim(),
        category,
        content: content.trim(),
        source: source.trim(),
        tags,
        createdAt: new Date().toISOString(),
      };
      await db.extracts.add(newExtract);
    }

    setIsModalOpen(false);
    onRefresh();
  };

  const handleDelete = async (ext: LessonExtract) => {
    if (window.confirm(`តើអ្នកពិតជាចង់លុបសម្រង់អត្ថបទ "${ext.title}" មែនទេ?`)) {
      await db.extracts.delete(ext.id);
      onRefresh();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center">
            <FileText className="w-6 h-6 text-blue-600 mr-2" />
            សម្រង់អត្ថបទ & មេរៀន
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            កម្រងឯកសារដកស្រង់ អត្ថបទអាន គតិបណ្ឌិត វិធានវេយ្យាករណ៍ និងរូបមន្តសម្រាប់បង្រៀន
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          បង្កើតសម្រង់ថ្មី
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 no-print">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ស្វែងរកតាមចំណងជើង, ខ្លឹមសារ, ស្លាក..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ទាំងអស់ ({extracts.length})
          </button>
          {Object.entries(categoryLabels).map(([catKey, info]) => {
            const count = extracts.filter((e) => e.category === catKey).length;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  selectedCategory === catKey
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {info.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Extracts Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredExtracts.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200">
            <BookMarked className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 text-sm font-medium">មិនមានសម្រង់អត្ថបទត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ</p>
          </div>
        ) : (
          filteredExtracts.map((ext) => {
            const catInfo = categoryLabels[ext.category] || categoryLabels.general;
            const CatIcon = catInfo.icon;

            return (
              <div
                key={ext.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${catInfo.color}`}
                    >
                      <CatIcon className="w-3 h-3 mr-1" />
                      {catInfo.label}
                    </span>

                    <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(ext.content, ext.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="ចម្លងខ្លឹមសារ"
                      >
                        {copiedId === ext.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEditModal(ext)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="កែប្រែ"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(ext)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="លុប"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3
                    onClick={() => setViewingExtract(ext)}
                    className="text-base font-bold text-slate-900 mt-2 hover:text-blue-600 cursor-pointer line-clamp-2"
                  >
                    {ext.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    មុខវិជ្ជា៖ <span className="font-semibold text-slate-600">{ext.subject}</span> • ថ្នាក់ទី {ext.grade}
                  </p>
                </div>

                {/* Content snippet */}
                <div
                  onClick={() => setViewingExtract(ext)}
                  className="p-5 flex-1 bg-slate-50/40 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <p className="text-xs text-slate-700 whitespace-pre-line line-clamp-5 leading-relaxed font-sans">
                    {ext.content}
                  </p>
                </div>

                {/* Footer Source and Tags */}
                <div className="p-4 border-t border-slate-100 bg-white">
                  {ext.source && (
                    <p className="text-[11px] text-slate-400 truncate mb-2">
                      ប្រភព៖ <span className="italic">{ext.source}</span>
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-1">
                    {ext.tags.map((t, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: View Full Extract with Print and Copy */}
      <Modal
        isOpen={!!viewingExtract}
        onClose={() => setViewingExtract(null)}
        title={viewingExtract?.title || 'សម្រង់អត្ថបទ'}
        subtitle={`មុខវិជ្ជា៖ ${viewingExtract?.subject} • ថ្នាក់ទី ${viewingExtract?.grade}`}
        maxWidth="2xl"
      >
        {viewingExtract && (
          <div className="space-y-4">
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
              <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                {viewingExtract.content}
              </p>
            </div>

            {viewingExtract.source && (
              <p className="text-xs text-slate-500 italic">
                ប្រភពយោង៖ {viewingExtract.source}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              {viewingExtract.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded-lg"
                >
                  #{t}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => handleCopy(viewingExtract.content, viewingExtract.id)}
                className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {copiedId === viewingExtract.id ? (
                  <>
                    <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                    បានចម្លងរួចរាល់!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1.5" />
                    ចម្លងអត្ថបទ
                  </>
                )}
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 mr-1.5" />
                  បោះពុម្ព
                </button>
                <button
                  onClick={() => setViewingExtract(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer"
                >
                  បិទ
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Add / Edit Extract */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExtract ? 'កែប្រែសម្រង់អត្ថបទ' : 'បន្ថែមសម្រង់អត្ថបទថ្មី'}
        subtitle="បញ្ចូលអត្ថបទអាន គតិបណ្ឌិត ឬមេរៀនសង្ខេប"
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ចំណងជើងសម្រង់ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ឧ. សម្រង់ឱវាទអប់រំ សម្តេចព្រះសង្ឃរាជ ជួន ណាត..."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ប្រភេទសម្រង់ <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExtractCategory)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(categoryLabels).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                មុខវិជ្ជា
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="ឧ. ភាសាខ្មែរ, គណិត..."
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                កម្រិតថ្នាក់
              </label>
              <input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="ឧ. ៧, ៨, ទូទៅ..."
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ខ្លឹមសារពេញលេញ <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="សូមសរសេរ ឬបិទភ្ជាប់ខ្លឹមសារអត្ថបទនៅទីនេះ..."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ប្រភព / សៀវភៅយោង
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="ឧ. សៀវភៅពុម្ពក្រសួងអប់រំ..."
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ស្លាក (Tags) - បំបែកដោយក្បៀស (,)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="ឧ. សីលធម៌, កំណាព្យ, វិធាន..."
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
              {editingExtract ? 'រក្សាទុកការកែប្រែ' : 'បង្កើតសម្រង់'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
