import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Printer,
  Plus,
  Trash2,
  Copy,
  Save,
  Search,
  Eye,
  Check,
  Users,
  Phone,
  Sparkles,
  Edit3,
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, Gender, TeacherSettings } from '../types';
import { db } from '../db/db';
import { Modal } from '../components/common/Modal';
import { toKhmerNum, formatKhmerDate } from '../utils/dateUtils';
import {
  exportStudentsToExcel,
  downloadStudentTemplate,
  parseExcelStudents,
} from '../utils/excelUtils';

interface StudentsPageProps {
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords: AttendanceRecord[];
  settings: TeacherSettings | null;
  selectedClassId: string;
  onRefresh: () => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({
  students,
  classes,
  attendanceRecords,
  settings,
  selectedClassId,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'ប្រុស' | 'ស្រី'>('all');
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isFullModalOpen, setIsFullModalOpen] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Class identifier (no inner dropdown - controlled cleanly from top Navbar)
  const activeClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
  const currentClass = classes.find((c) => c.id === activeClassId);
  const currentClassName = selectedClassId === 'ALL' ? 'ថ្នាក់ទាំងអស់' : currentClass?.name || 'ថ្នាក់រៀន';

  // Filter students based on active class, gender, and search query
  const filteredStudents = students
    .filter((s) => {
      const matchesClass = selectedClassId === 'ALL' || s.classId === activeClassId;
      const matchesGender = genderFilter === 'all' || s.gender === genderFilter;
      const matchesSearch =
        s.nameKh.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.pob && s.pob.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.currentAddress && s.currentAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.guardianPhone && s.guardianPhone.includes(searchTerm));
      return matchesClass && matchesGender && matchesSearch;
    })
    .sort((a, b) => a.rollNo - b.rollNo);

  const totalFiltered = filteredStudents.length;
  const femaleFiltered = filteredStudents.filter((s) => s.gender === 'ស្រី').length;
  const maleFiltered = filteredStudents.filter((s) => s.gender === 'ប្រុស').length;

  // Direct Inline Cell Edit Handler (Auto-Save on blur or change)
  const handleInlineChange = async (studentId: string, field: keyof Student, value: any) => {
    try {
      await db.students.update(studentId, { [field]: value });
      setLastSavedId(studentId);
      setTimeout(() => setLastSavedId(null), 2000);
      onRefresh();
    } catch (err) {
      console.error('Error auto-saving cell:', err);
    }
  };

  // Direct Duplicate Row Handler (ចម្លងសិស្សដោយផ្ទាល់)
  const handleDirectDuplicate = async (s: Student) => {
    const classStudents = students.filter((stu) => stu.classId === s.classId);
    const nextRoll = classStudents.length + 1;
    const duplicated: Student = {
      ...s,
      id: 'stu-' + Date.now(),
      rollNo: nextRoll,
      studentCode: `${s.studentCode}-កូពី`,
      nameKh: `${s.nameKh} (ចម្លង)`,
      createdAt: new Date().toISOString(),
    };
    await db.students.add(duplicated);
    setLastSavedId(duplicated.id);
    onRefresh();
  };

  // Direct Delete Row Handler (លុបសិស្សដោយផ្ទាល់)
  const handleDirectDelete = async (s: Student) => {
    if (window.confirm(`តើអ្នកពិតជាចង់លុបសិស្ស "${s.nameKh}" (អត្តលេខ ${s.studentCode}) មែនទេ?`)) {
      await db.students.delete(s.id);
      onRefresh();
    }
  };

  // Direct Add New Blank Row (បន្ថែមជួរដេក Excel ថ្មីដោយផ្ទាល់)
  const handleAddNewBlankRow = async () => {
    const targetClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
    const classStudents = students.filter((s) => s.classId === targetClassId);
    const nextRoll = classStudents.length + 1;
    const codeNumber = String(nextRoll).padStart(3, '0');

    const newStudent: Student = {
      id: 'stu-' + Date.now(),
      classId: targetClassId,
      rollNo: nextRoll,
      studentCode: `STU-${codeNumber}`,
      nameKh: `សិស្សថ្មី ${toKhmerNum(nextRoll)}`,
      nameEn: `New Student ${nextRoll}`,
      gender: 'ប្រុស',
      dob: '2011-01-01',
      pob: 'ខេត្តកំពង់ឆ្នាំង',
      currentAddress: 'កំពង់ត្រឡាច',
      guardianName: '',
      guardianRelationship: 'ឪពុក',
      guardianPhone: '',
      guardianOccupation: '',
      notes: '',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await db.students.add(newStudent);
    setLastSavedId(newStudent.id);
    onRefresh();
  };

  // Export to Excel / XLSM compatible format
  const handleExportExcel = () => {
    exportStudentsToExcel(filteredStudents, currentClassName);
  };

  // Import from Excel file
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
    if (!targetClassId) {
      alert('សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន មុនពេលនាំចូល Excel!');
      return;
    }

    try {
      const parsed = await parseExcelStudents(file, targetClassId);
      if (parsed.length === 0) {
        alert('មិនមានទិន្នន័យសិស្សនៅក្នុងឯកសារទេ!');
        return;
      }
      await db.students.bulkAdd(parsed as Student[]);
      alert(`បាននាំចូលទិន្នន័យសិស្សចំនួន ${toKhmerNum(parsed.length)} នាក់ដោយជោគជ័យ!`);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('មានបញ្ហាក្នុងការអានឯកសារ Excel! សូមពិនិត្យទម្រង់ឯកសារឡើងវិញ។');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner (Clean - NO duplicate class selector!) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-black text-slate-800 flex items-center">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600 mr-2" />
              ព័ត៌មានសិស្សទម្រង់ XLSM ({currentClassName})
            </h2>
            <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
              📊 ទម្រង់ Excel/XLSM កែ លុប ចម្លងផ្ទាល់
            </span>
            {lastSavedId && (
              <span className="inline-flex items-center text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse border border-emerald-300">
                <Check className="w-3.5 h-3.5 mr-1" /> បានរក្សាទុកស្វ័យប្រវត្តិ
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            តារាងប្រវត្តិរូបសង្ខេបសិស្ស៖ អាចវាយបញ្ចូល កែប្រែ លុប និងចម្លងជួរដេកបានដោយផ្ទាល់ក្នុងក្រឡាតារាង (Auto-Save)
          </p>
        </div>

        {/* Action Buttons: Add Row, Download Template, Import/Export, Print */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Row Button */}
          <button
            onClick={handleAddNewBlankRow}
            className="inline-flex items-center px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            title="បន្ថែមជួរដេកសិស្សថ្មីមួយទៀតនៅខាងក្រោមតារាង Excel"
          >
            <Plus className="w-4 h-4 mr-1" />
            + បន្ថែមជួរដេកថ្មី
          </button>

          {/* Download Template */}
          <button
            onClick={downloadStudentTemplate}
            className="inline-flex items-center px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            title="ទាញយកគំរូ Excel សម្រាប់បំពេញទិន្នន័យ"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-slate-600" />
            គំរូ Excel
          </button>

          {/* Import Excel */}
          <label className="inline-flex items-center px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            នាំចូល Excel
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .xlsm"
              className="hidden"
              onChange={handleImportFile}
            />
          </label>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors cursor-pointer"
            title="ទាញចេញជាឯកសារ Excel .xlsx / .xlsm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-blue-600" />
            នាំចេញ Excel (.xlsm)
          </button>

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            បោះពុម្ព
          </button>
        </div>
      </div>

      {/* Spreadsheet Status & Summary KPI Bar */}
      <div className="grid grid-cols-3 gap-3 no-print">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">សិស្សសរុប ({currentClassName})</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{toKhmerNum(totalFiltered)} នាក់</p>
        </div>
        <div className="bg-pink-50/70 p-3.5 rounded-2xl border border-pink-200 shadow-2xs text-center">
          <p className="text-[11px] font-bold text-pink-700 uppercase tracking-wider">សិស្សស្រី</p>
          <p className="text-2xl font-black text-pink-700 mt-1">{toKhmerNum(femaleFiltered)} នាក់</p>
        </div>
        <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 shadow-2xs text-center">
          <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">សិស្សប្រុស</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{toKhmerNum(maleFiltered)} នាក់</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះ, អត្តលេខ, ទីកន្លែងកំណើត, ទូរស័ព្ទ..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Gender Filter Buttons */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setGenderFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                genderFilter === 'all' ? 'bg-white font-bold text-slate-800 shadow-2xs' : 'text-slate-600'
              }`}
            >
              ទាំងអស់ ({toKhmerNum(students.filter(s => selectedClassId === 'ALL' || s.classId === activeClassId).length)})
            </button>
            <button
              onClick={() => setGenderFilter('ប្រុស')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                genderFilter === 'ប្រុស' ? 'bg-white font-bold text-blue-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              ប្រុស
            </button>
            <button
              onClick={() => setGenderFilter('ស្រី')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                genderFilter === 'ស្រី' ? 'bg-white font-bold text-pink-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              ស្រី
            </button>
          </div>
        </div>
      </div>

      {/* Official Header (Print Mode Only) */}
      <div className="hidden print:block text-center mb-6">
        <h3 className="font-moul text-base">ព្រះរាជាណាចក្រកម្ពុជា</h3>
        <h4 className="font-moul text-sm">ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
        <div className="w-24 h-0.5 bg-black mx-auto my-2" />
        <div className="flex justify-between items-start text-left mt-2 text-xs">
          <div>
            <p className="font-bold">{settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}</p>
            <p>ឆ្នាំសិក្សា៖ {settings?.academicYear || '២០២៤-២០២៥'}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">គ្រូបន្ទុកថ្នាក់៖ {settings?.teacherName || 'ហ៊ុន រដ្ឋា'}</p>
            <p>ទូរស័ព្ទ៖ {settings?.phone || '093 486 987'}</p>
          </div>
        </div>
        <h2 className="font-moul text-base mt-4">
          តារាងប្រវត្តិរូបសង្ខេបសិស្ស {currentClassName}
        </h2>
        <p className="text-xs mt-1">
          សិស្សសរុប៖ {toKhmerNum(totalFiltered)} នាក់ | ស្រី៖ {toKhmerNum(femaleFiltered)} នាក់ | ប្រុស៖ {toKhmerNum(maleFiltered)} នាក់
        </p>
      </div>

      {/* Excel/XLSM Interactive Editable Spreadsheet Grid */}
      <div className="bg-white rounded-2xl border-2 border-emerald-700/30 shadow-md overflow-hidden">
        {/* Spreadsheet Tab Bar */}
        <div className="bg-emerald-800 text-white px-4 py-2 flex items-center justify-between text-xs font-bold no-print">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>សន្លឹកទិន្នន័យ (Sheet1): តារាងប្រវត្តិរូបសង្ខេបសិស្ស.xlsm</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-emerald-100 font-normal">
            <span>💡 ចុចលើក្រឡាដើម្បីវាយបញ្ចូល/កែប្រែផ្ទាល់</span>
            <span>|</span>
            <span>⚡ រក្សាទុកស្វ័យប្រវត្តិ (Auto-Saved)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-2 text-center border-r border-slate-200 w-12 bg-slate-200/70">ល.រ</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-28">អត្តលេខ</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[150px]">គោត្តនាម-នាម</th>
                <th className="py-2.5 px-2 border-r border-slate-200 text-center w-20">ភេទ</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-32">ថ្ងៃខែឆ្នាំកំណើត</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[140px]">ទីកន្លែងកំណើត</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[160px]">អាសយដ្ឋានបច្ចុប្បន្ន</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[140px]">អាណាព្យាបាល</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-32">លេខទូរស័ព្ទ</th>
                <th className="py-2.5 px-2 text-center w-28 bg-slate-200/70 no-print">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    មិនមានទិន្នន័យសិស្សត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu, index) => {
                  return (
                    <tr
                      key={stu.id}
                      className="hover:bg-emerald-50/40 transition-colors group border-b border-slate-200"
                    >
                      {/* ល.រ (Roll No) */}
                      <td className="py-2 px-2 text-center font-bold text-slate-600 bg-slate-50/80 border-r border-slate-200">
                        <input
                          type="number"
                          value={stu.rollNo}
                          onChange={(e) => handleInlineChange(stu.id, 'rollNo', Number(e.target.value))}
                          className="w-10 text-center font-bold bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded"
                        />
                      </td>

                      {/* អត្តលេខ (Student Code) */}
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.studentCode}
                          onChange={(e) => handleInlineChange(stu.id, 'studentCode', e.target.value)}
                          className="w-full font-mono text-xs font-bold text-slate-700 bg-transparent px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white transition-colors"
                        />
                      </td>

                      {/* គោត្តនាម-នាម (Khmer Name) */}
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.nameKh}
                          onChange={(e) => handleInlineChange(stu.id, 'nameKh', e.target.value)}
                          className="w-full font-bold text-slate-900 bg-transparent px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white transition-colors"
                        />
                      </td>

                      {/* ភេទ (Gender: ប្រុស / ស្រី) */}
                      <td className="py-1.5 px-2 text-center border-r border-slate-200">
                        <select
                          value={stu.gender}
                          onChange={(e) => handleInlineChange(stu.id, 'gender', e.target.value as Gender)}
                          className={`text-xs font-bold rounded-lg px-2 py-1 cursor-pointer transition-colors border-0 ${
                            stu.gender === 'ស្រី'
                              ? 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          <option value="ប្រុស">ប្រុស</option>
                          <option value="ស្រី">ស្រី</option>
                        </select>
                      </td>

                      {/* ថ្ងៃខែឆ្នាំកំណើត (DOB) */}
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <input
                          type="date"
                          value={stu.dob || ''}
                          onChange={(e) => handleInlineChange(stu.id, 'dob', e.target.value)}
                          className="w-full text-xs text-slate-700 bg-transparent px-1 py-1 rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white transition-colors"
                        />
                      </td>

                      {/* ទីកន្លែងកំណើត (Place of Birth) */}
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.pob || ''}
                          placeholder="ទីកន្លែងកំណើត..."
                          onChange={(e) => handleInlineChange(stu.id, 'pob', e.target.value)}
                          className="w-full text-xs text-slate-700 bg-transparent px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white transition-colors"
                        />
                      </td>

                      {/* អាសយដ្ឋានបច្ចុប្បន្ន (Current Address) */}
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.currentAddress || ''}
                          placeholder="អាសយដ្ឋានបច្ចុប្បន្ន..."
                          onChange={(e) => handleInlineChange(stu.id, 'currentAddress', e.target.value)}
                          className="w-full text-xs text-slate-700 bg-transparent px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white transition-colors"
                        />
                      </td>

                      {/* អាណាព្យាបាល (Guardian) */}
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.guardianName || ''}
                          placeholder="ឈ្មោះអាណាព្យាបាល..."
                          onChange={(e) => handleInlineChange(stu.id, 'guardianName', e.target.value)}
                          className="w-full text-xs font-semibold text-slate-800 bg-transparent px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white transition-colors"
                        />
                      </td>

                      {/* លេខទូរស័ព្ទ (Phone) */}
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <div className="flex items-center space-x-1">
                          <input
                            type="text"
                            value={stu.guardianPhone || ''}
                            placeholder="012 345 678"
                            onChange={(e) => handleInlineChange(stu.id, 'guardianPhone', e.target.value)}
                            className="w-full text-xs font-mono text-blue-700 bg-transparent px-1 py-1 rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white transition-colors"
                          />
                          {stu.guardianPhone && (
                            <a
                              href={`tel:${stu.guardianPhone}`}
                              className="p-1 text-blue-600 hover:text-blue-800 rounded no-print"
                              title="ចុចដើម្បីហៅទូរស័ព្ទ"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* សកម្មភាព (Actions: ចម្លង, លុប, មើលកាត) */}
                      <td className="py-1.5 px-2 text-center no-print bg-slate-50/50">
                        <div className="flex items-center justify-center space-x-1">
                          {/* ចម្លងសិស្ស (Duplicate) */}
                          <button
                            onClick={() => handleDirectDuplicate(stu)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="ចម្លងសិស្ស (បង្កើតសិស្សស្ទួន)"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* មើលប្រវត្តិរូបសង្ខេប (View Bio Card) */}
                          <button
                            onClick={() => setViewingStudent(stu)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="មើលប្រវត្តិរូបលម្អិត"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* លុប (Delete) */}
                          <button
                            onClick={() => handleDirectDelete(stu)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="លុបសិស្សនេះចេញ"
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

        {/* Bottom Status Row of Excel Sheet */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500 no-print">
          <div className="flex items-center space-x-3">
            <span>ចំនួនសិស្សក្នុងតារាង៖ <strong className="text-slate-800">{toKhmerNum(filteredStudents.length)}</strong> នាក់</span>
            <span>|</span>
            <span>សិស្សស្រី៖ <strong className="text-pink-600">{toKhmerNum(femaleFiltered)}</strong> នាក់</span>
            <span>|</span>
            <span>សិស្សប្រុស៖ <strong className="text-blue-600">{toKhmerNum(maleFiltered)}</strong> នាក់</span>
          </div>
          <button
            onClick={handleAddNewBlankRow}
            className="inline-flex items-center text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            ចុចទីនេះដើម្បីបន្ថែមសិស្សថ្មីមួយជួរដេកទៀត
          </button>
        </div>
      </div>

      {/* Official Signatures on Print */}
      <div className="hidden print:block mt-8 text-xs">
        <div className="flex justify-between items-start">
          <div className="text-center w-52">
            <p className="font-bold">បានឃើញ និងពិនិត្យត្រឹមត្រូវ</p>
            <p className="text-[11px] text-slate-500">នាយកសាលា</p>
            <div className="h-20" />
            <p className="font-bold">{settings?.principalName || 'នាយកសាលា'}</p>
          </div>

          <div className="text-center w-52">
            <p className="italic text-[11px]">
              {settings?.provinceCity || 'ខេត្តកំពង់ឆ្នាំង'}, ថ្ងៃទី....... ខែ....... ឆ្នាំ២០២...
            </p>
            <p className="font-bold">គ្រូបន្ទុកថ្នាក់</p>
            <div className="h-20" />
            <p className="font-bold">{settings?.teacherName || 'ហ៊ុន រដ្ឋា'}</p>
            <p className="text-[10px] text-slate-500">{settings?.phone}</p>
          </div>
        </div>
      </div>

      {/* Modal: View Full Student Profile Card */}
      <Modal
        isOpen={!!viewingStudent}
        onClose={() => setViewingStudent(null)}
        title="ប្រវត្តិរូបសង្ខេបសិស្ស"
        subtitle={viewingStudent?.nameKh}
        maxWidth="lg"
      >
        {viewingStudent && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl font-black shadow-md">
                {viewingStudent.nameKh.charAt(0)}
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">{viewingStudent.nameKh}</h4>
                <p className="text-xs text-slate-500 font-medium">{viewingStudent.nameEn || '-'}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded-md font-bold font-mono">
                    {viewingStudent.studentCode}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-md font-bold">
                    {classes.find((c) => c.id === viewingStudent.classId)?.name || 'ថ្នាក់រៀន'}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xs rounded-md font-bold">
                    លេខរៀង៖ {toKhmerNum(viewingStudent.rollNo)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-0.5">ភេទ</span>
                <span className="font-bold text-slate-800">{viewingStudent.gender}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-0.5">ថ្ងៃខែឆ្នាំកំណើត</span>
                <span className="font-bold text-slate-800">{viewingStudent.dob ? formatKhmerDate(viewingStudent.dob) : '-'}</span>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
              <span className="text-slate-400 block">ទីកន្លែងកំណើត</span>
              <span className="font-bold text-slate-800">{viewingStudent.pob || 'មិនបានបញ្ជាក់'}</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
              <span className="text-slate-400 block">អាសយដ្ឋានបច្ចុប្បន្ន</span>
              <span className="font-bold text-slate-800">{viewingStudent.currentAddress || 'មិនបានបញ្ជាក់'}</span>
            </div>

            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-xs space-y-2">
              <h5 className="font-bold text-blue-900">ព័ត៌មានអាណាព្យាបាល៖</h5>
              <div className="grid grid-cols-2 gap-2">
                <p><span className="text-slate-500">ឈ្មោះ៖</span> <span className="font-bold">{viewingStudent.guardianName || '-'}</span></p>
                <p><span className="text-slate-500">ត្រូវជា៖</span> <span className="font-bold">{viewingStudent.guardianRelationship || '-'}</span></p>
                <p>
                  <span className="text-slate-500">ទូរស័ព្ទ៖</span>{' '}
                  {viewingStudent.guardianPhone ? (
                    <a href={`tel:${viewingStudent.guardianPhone}`} className="text-blue-700 font-bold hover:underline">
                      {viewingStudent.guardianPhone}
                    </a>
                  ) : '-'}
                </p>
                <p><span className="text-slate-500">មុខរបរ៖</span> <span className="font-bold">{viewingStudent.guardianOccupation || '-'}</span></p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDirectDuplicate(viewingStudent)}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 mr-1 inline-block" />
                ចម្លងសិស្សនេះ
              </button>

              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
              >
                បិទផ្ទាំង
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
