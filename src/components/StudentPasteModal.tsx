import React, { useState, useEffect } from 'react';
import {
  Clipboard,
  Check,
  FileSpreadsheet,
  Users,
  Settings2,
} from 'lucide-react';
import type { Student } from '../types';
import { db } from '../db/db';
import { parsePastedExcelText } from '../utils/excelUtils';
import { formatToDMY } from '../utils/dateUtils';
import { Modal } from './common/Modal';

interface StudentPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  className: string;
  startRollNo: number;
  onSuccess: (count: number) => void;
}

export const StudentPasteModal: React.FC<StudentPasteModalProps> = ({
  isOpen,
  onClose,
  classId,
  className,
  startRollNo,
  onSuccess,
}) => {
  const [pastedText, setPastedText] = useState('');
  const [startColKey, setStartColKey] = useState<string>('auto');
  const [parsedStudents, setParsedStudents] = useState<Partial<Student>[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Automatically update preview when text or column mode changes
  useEffect(() => {
    if (!pastedText.trim()) {
      setParsedStudents([]);
      return;
    }
    const targetCol = startColKey === 'auto' ? undefined : (startColKey as keyof Student);
    const parsed = parsePastedExcelText(pastedText, classId, startRollNo, targetCol);
    setParsedStudents(parsed);
  }, [pastedText, classId, startRollNo, startColKey]);

  // Read from system clipboard
  const handleReadClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPastedText(text);
        }
      }
    } catch (err) {
      console.warn('Clipboard read error (security policy):', err);
    }
  };

  const handleSave = async () => {
    if (parsedStudents.length === 0) return;
    setIsSaving(true);
    try {
      const existingInClass = await db.students.where('classId').equals(classId).toArray();
      const existingMapByName = new Map<string, Student>();
      const existingMapByCode = new Map<string, Student>();
      existingInClass.forEach((s) => {
        existingMapByName.set((s.nameKh || '').trim().toLowerCase(), s);
        if (s.studentCode) existingMapByCode.set(s.studentCode.trim().toLowerCase(), s);
      });

      const toUpdate: Student[] = [];
      const toAdd: Student[] = [];

      parsedStudents.forEach((p, idx) => {
        const keyName = (p.nameKh || '').trim().toLowerCase();
        const keyCode = (p.studentCode || '').trim().toLowerCase();
        const existing = existingMapByName.get(keyName) || (keyCode ? existingMapByCode.get(keyCode) : undefined);

        if (existing) {
          toUpdate.push({
            ...existing,
            ...p,
            id: existing.id,
            classId,
          } as Student);
        } else {
          const targetRoll = p.rollNo || (existingInClass.length + toAdd.length + 1);
          toAdd.push({
            id: `stu-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            classId,
            rollNo: targetRoll,
            studentCode: p.studentCode || `STU-${String(targetRoll).padStart(3, '0')}`,
            nameKh: p.nameKh || `សិស្ស ${targetRoll}`,
            nameEn: p.nameEn || '',
            gender: p.gender || 'ប្រុស',
            dob: p.dob || '',
            status: 'active',
            createdAt: new Date().toISOString(),
            ...p,
          } as Student);
        }
      });

      if (toUpdate.length > 0) {
        await db.students.bulkPut(toUpdate);
      }
      if (toAdd.length > 0) {
        await db.students.bulkAdd(toAdd);
      }

      onSuccess(toUpdate.length + toAdd.length);
      setPastedText('');
      setParsedStudents([]);
      onClose();
    } catch (err) {
      console.error('Error saving pasted students:', err);
      alert('មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យសិស្ស!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📋 បិទភ្ជាប់ទិន្នន័យដែលបាន Copy ពី Excel / XLSM (Paste Data)"
      subtitle={`ថ្នាក់គោលដៅ៖ ${className} | ចាប់ផ្តើមពីលេខរៀងទី៖ ${startRollNo}`}
      maxWidth="6xl"
    >
      <div className="space-y-4">
        {/* Instructions banner */}
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
          <FileSpreadsheet className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">
              💡 របៀបប្រើប្រាស់៖ បើកឯកសារ Excel (.xlsx / .xlsm) រួចជ្រើសរើស (Highlight) ជួរដេកសិស្ស → ចុច <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-2xs font-mono font-bold">Ctrl + C</kbd> → រួចចុច <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-2xs font-mono font-bold">Ctrl + V</kbd> ក្នុងប្រអប់ខាងក្រោមនេះ!
            </p>
            <p className="text-[11px] text-blue-700">
              ប្រព័ន្ធអាចអានទម្រង់ក្បាលតារាងក្រសួង (MoEYS ២៣ ជួរឈរ) ឬទម្រង់សាមញ្ញ (ល.រ, ឈ្មោះ, ភេទ, ថ្ងៃខែឆ្នាំកំណើត) ដោយស្វ័យប្រវត្តិ។ ថ្ងៃខែឆ្នាំកំណើតនឹងមិនត្រូវបានដាក់អូតូក្លែងក្លាយជាដាច់ខាត។
            </p>
          </div>
        </div>

        {/* Action bar above textarea */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-bold text-slate-700">
              ប្រអប់បិទភ្ជាប់ (Paste Area)៖
            </label>
            <div className="flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
              <Settings2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-[11px]">តម្រឹមជួរឈរ៖</span>
              <select
                value={startColKey}
                onChange={(e) => setStartColKey(e.target.value)}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-slate-700 cursor-pointer outline-none"
              >
                <option value="auto">✨ ស្វ័យប្រវត្តិ (Auto Detect)</option>
                <option value="nameKh">គោត្តនាម នាម (ឈ្មោះសិស្ស)</option>
                <option value="rollNo">ល.រ (ចាប់ពីលេខរៀង)</option>
                <option value="studentCode">អត្តលេខ</option>
                <option value="dob">ថ្ងៃខែឆ្នាំកំណើត</option>
                <option value="studentPhone">លេខទូរស័ព្ទ</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReadClipboard}
            className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-300"
            title="អានទិន្នន័យពី Clipboard ដោយស្វ័យប្រវត្តិ"
          >
            <Clipboard className="w-3.5 h-3.5 text-indigo-600" />
            <span>📥 អានពី Clipboard (Auto Read)</span>
          </button>
        </div>

        {/* Paste textarea */}
        <textarea
          rows={5}
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="ចុច Ctrl + V នៅទីនេះដើម្បីបិទភ្ជាប់ទិន្នន័យសិស្សពី Excel (Paste here)..."
          className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 shadow-2xs outline-none"
          autoFocus
        />

        {/* Live Preview Section */}
        {parsedStudents.length > 0 && (
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>បានរកឃើញទិន្នន័យត្រឹមត្រូវ៖ <strong>{parsedStudents.length} នាក់</strong></span>
              </span>

              <span className="text-[11px] text-slate-500 font-medium">
                (បង្ហាញគំរូ ១០ ជួរដំបូង)
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-48 bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#002060] text-white font-bold sticky top-0">
                  <tr>
                    <th className="p-2 border-r border-white/20 text-center w-12">ល.រ</th>
                    <th className="p-2 border-r border-white/20 min-w-[90px]">អត្តលេខ</th>
                    <th className="p-2 border-r border-white/20 min-w-[130px]">គោត្តនាម នាម</th>
                    <th className="p-2 border-r border-white/20 text-center w-16">ភេទ</th>
                    <th className="p-2 border-r border-white/20 min-w-[110px]">ថ្ងៃខែឆ្នាំកំណើត</th>
                    <th className="p-2 border-r border-white/20 min-w-[120px]">ខេត្តកំណើត</th>
                    <th className="p-2 border-r border-white/20 min-w-[110px]">ទូរស័ព្ទ</th>
                    <th className="p-2 min-w-[120px]">ឪពុក/ម្តាយ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedStudents.slice(0, 10).map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 text-center font-bold text-slate-700 bg-slate-50 border-r">{s.rollNo}</td>
                      <td className="p-2 font-mono text-slate-800 border-r">{s.studentCode}</td>
                      <td className="p-2 font-bold text-slate-900 border-r">{s.nameKh}</td>
                      <td className="p-2 text-center border-r">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.gender === 'ស្រី' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                          {s.gender}
                        </span>
                      </td>
                      <td className="p-2 font-mono text-slate-700 border-r">
                        {s.dob ? (
                          formatToDMY(s.dob)
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>
                      <td className="p-2 text-slate-700 border-r">{s.pobProvince || '-'}</td>
                      <td className="p-2 font-mono text-blue-700 border-r">{s.studentPhone || '-'}</td>
                      <td className="p-2 text-slate-700">{s.fatherName || s.motherName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal footer action buttons */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            បោះបង់
          </button>
          <button
            type="button"
            disabled={parsedStudents.length === 0 || isSaving}
            onClick={handleSave}
            className={`inline-flex items-center space-x-1.5 px-5 py-2 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer ${
              parsedStudents.length > 0 && !isSaving
                ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                : 'bg-slate-300 cursor-not-allowed opacity-60'
            }`}
          >
            <Check className="w-4 h-4 mr-1" />
            <span>
              {isSaving ? 'កំពុងរក្សាទុក...' : `បញ្ចូលទិន្នន័យ ${parsedStudents.length > 0 ? `(${parsedStudents.length} នាក់)` : ''} ទៅក្នុងថ្នាក់`}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
