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
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, Gender, TeacherSettings } from '../types';
import { db } from '../db/db';
import { Modal } from '../components/common/Modal';
import { toKhmerNum, formatKhmerDate } from '../utils/dateUtils';
import {
  exportStudentsToExcel,
  downloadStudentTemplate,
  parseExcelStudents,
  calculateAge,
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
        (s.pobProvince && s.pobProvince.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.pob && s.pob.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.addrProvince && s.addrProvince.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.currentAddress && s.currentAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.fatherPhone && s.fatherPhone.includes(searchTerm)) ||
        (s.guardianPhone && s.guardianPhone.includes(searchTerm)) ||
        (s.studentPhone && s.studentPhone.includes(searchTerm));
      return matchesClass && matchesGender && matchesSearch;
    })
    .sort((a, b) => a.rollNo - b.rollNo);

  const totalFiltered = filteredStudents.length;
  const femaleFiltered = filteredStudents.filter((s) => s.gender === 'ស្រី').length;
  const maleFiltered = filteredStudents.filter((s) => s.gender === 'ប្រុស').length;

  // Direct Inline Cell Edit Handler (Auto-Save on blur or change)
  const handleInlineChange = async (studentId: string, field: keyof Student, value: any) => {
    try {
      const updateData: Partial<Student> = { [field]: value };
      // If dob is updated, also update age
      if (field === 'dob') {
        updateData.age = calculateAge(value);
      }
      await db.students.update(studentId, updateData);
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

  // Direct Add New Blank Row (បន្ថែមជួរដេក Excel ថ្មីដោយផ្ទាល់ តាមរូបទី២)
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
      age: 14,
      originSchool: 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច',
      pobVillage: 'ត្រពាំងព្រីង',
      pobCommune: 'កំពង់ត្រឡាច',
      pobDistrict: 'កំពង់ត្រឡាច',
      pobProvince: 'កំពង់ឆ្នាំង',
      addrVillage: 'ត្រពាំងព្រីង',
      addrCommune: 'កំពង់ត្រឡាច',
      addrDistrict: 'កំពង់ត្រឡាច',
      addrProvince: 'កំពង់ឆ្នាំង',
      studentPhone: '',
      orphanStatus: 'none',
      isDisabled: false,
      isPoor: false,
      hasScholarship: false,
      stayInPagoda: false,
      fatherName: '',
      fatherOccupation: '',
      fatherPhone: '',
      motherName: '',
      motherOccupation: '',
      motherPhone: '',
      guardianName: '',
      guardianRelationship: 'ឪពុក',
      guardianPhone: '',
      guardianOccupation: '',
      otherNotes: '',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await db.students.add(newStudent);
    setLastSavedId(newStudent.id);
    onRefresh();
  };

  // Export to Excel
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
      {/* Top Banner (No overlapping class dropdown) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-black text-slate-800 flex items-center">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600 mr-2" />
              ព័ត៌មាន និងប្រវត្តិរូបសង្ខេបសិស្ស ({currentClassName})
            </h2>
            <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
              📊 ទម្រង់ក្រសួងអប់រំ (រូបទី២) XLSM កែប្រែផ្ទាល់
            </span>
            {lastSavedId && (
              <span className="inline-flex items-center text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse border border-emerald-300">
                <Check className="w-3.5 h-3.5 mr-1" /> រក្សាទុកស្វ័យប្រវត្តិ
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            តារាងប្រវត្តិរូបសិស្សពេញលេញតាមរូបទី២៖ ទីកន្លែងកំណើត អាសយដ្ឋានបច្ចុប្បន្ន ស្ថានភាពសិស្ស ព័ត៌មានឪពុកម្តាយ (កែ លុប ចម្លងផ្ទាល់)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Row Button */}
          <button
            onClick={handleAddNewBlankRow}
            className="inline-flex items-center px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            title="បន្ថែមជួរដេកសិស្សថ្មីមួយទៀតនៅខាងក្រោមតារាង"
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

      {/* Summary KPI Badges */}
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
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះ, អត្តលេខ, ស្រុក, ខេត្ត, ទូរស័ព្ទ..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setGenderFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                genderFilter === 'all' ? 'bg-white font-bold text-slate-800 shadow-2xs' : 'text-slate-600'
              }`}
            >
              ទាំងអស់ ({toKhmerNum(students.filter((s) => selectedClassId === 'ALL' || s.classId === activeClassId).length)})
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
          បញ្ជីស្រង់ស្ថិតិ និងប្រវត្តិរូបសង្ខេបសិស្ស {currentClassName}
        </h2>
        <p className="text-xs mt-1">
          សិស្សសរុប៖ {toKhmerNum(totalFiltered)} នាក់ | ស្រី៖ {toKhmerNum(femaleFiltered)} នាក់ | ប្រុស៖ {toKhmerNum(maleFiltered)} នាក់
        </p>
      </div>

      {/* Excel/XLSM Interactive Editable Spreadsheet Grid - EXACT REPLICA OF IMAGE 2 */}
      <div className="bg-white rounded-2xl border-2 border-blue-900/40 shadow-lg overflow-hidden">
        {/* Spreadsheet Header Bar */}
        <div className="bg-[#002060] text-white px-4 py-2 flex items-center justify-between text-xs font-bold no-print">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>សន្លឹកទិន្នន័យ៖ បញ្ជីស្រង់ស្ថិតិ និងប្រវត្តិរូបសិស្ស.xlsm</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-blue-100 font-normal">
            <span>💡 ចុចលើក្រឡាដើម្បីវាយបញ្ចូល/កែប្រែផ្ទាល់</span>
            <span>|</span>
            <span>⚡ រក្សាទុកស្វ័យប្រវត្តិ (Auto-Saved)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            {/* Table Header: 2 Rows Exactly Matching Image 2 */}
            <thead>
              {/* Row 1 Header */}
              <tr className="bg-[#002060] text-white font-bold text-center border-b border-white/20">
                <th rowSpan={2} className="py-2.5 px-2 border border-white/30 w-10">ល.រ</th>
                <th rowSpan={2} className="py-2.5 px-2 border border-white/30 min-w-[70px]">អត្តលេខ</th>
                <th rowSpan={2} className="py-2.5 px-3 border border-white/30 min-w-[130px]">គោត្តនាម នាម</th>
                <th rowSpan={2} className="py-2.5 px-2 border border-white/30 w-16">ភេទ</th>
                <th rowSpan={2} className="py-2.5 px-2 border border-white/30 min-w-[95px]">ថ្ងៃខែឆ្នាំកំណើត</th>
                <th rowSpan={2} className="py-2.5 px-1 border border-white/30 w-12">អាយុ</th>
                <th rowSpan={2} className="py-2.5 px-2 border border-white/30 min-w-[110px]">មកពីសាលា</th>
                <th colSpan={4} className="py-1 px-2 border border-white/30 bg-[#0f3b73]">ទីកន្លែងកំណើត</th>
                <th colSpan={4} className="py-1 px-2 border border-white/30 bg-[#0f3b73]">អាសយដ្ឋានបច្ចុប្បន្ន</th>
                <th rowSpan={2} className="py-2.5 px-2 border border-white/30 min-w-[100px]">លេខទូរស័ព្ទផ្ទាល់ខ្លួន</th>
                <th colSpan={7} className="py-1 px-2 border border-white/30 bg-[#0f3b73]">ស្ថានភាពសិស្ស</th>
                <th colSpan={3} className="py-1 px-2 border border-white/30 bg-[#0f3b73]">គោត្តនាម នាម (ឪពុក)</th>
                <th colSpan={3} className="py-1 px-2 border border-white/30 bg-[#0f3b73]">គោត្តនាម នាម (ម្តាយ)</th>
                <th rowSpan={2} className="py-2.5 px-2 border border-white/30 min-w-[80px]">ផ្សេងៗ</th>
                <th rowSpan={2} className="py-2.5 px-2 border border-white/30 w-24 no-print bg-[#001730]">សកម្មភាព</th>
              </tr>

              {/* Row 2 Sub-Headers */}
              <tr className="bg-[#0f3b73] text-white text-[10px] font-bold text-center border-b border-white/30">
                {/* ទីកន្លែងកំណើត */}
                <th className="py-1 px-1 border border-white/30 min-w-[70px]">ភូមិ</th>
                <th className="py-1 px-1 border border-white/30 min-w-[80px]">ឃុំ/សង្កាត់</th>
                <th className="py-1 px-1 border border-white/30 min-w-[80px]">ស្រុក/ខណ្ឌ</th>
                <th className="py-1 px-1 border border-white/30 min-w-[85px]">ខេត្ត/រាជធានី</th>
                {/* អាសយដ្ឋានបច្ចុប្បន្ន */}
                <th className="py-1 px-1 border border-white/30 min-w-[70px]">ភូមិ</th>
                <th className="py-1 px-1 border border-white/30 min-w-[75px]">ឃុំ</th>
                <th className="py-1 px-1 border border-white/30 min-w-[75px]">ស្រុក</th>
                <th className="py-1 px-1 border border-white/30 min-w-[80px]">ខេត្ត</th>
                {/* ស្ថានភាពសិស្ស */}
                <th className="py-1 px-1 border border-white/30 min-w-[42px]" title="កំព្រាឪពុក">ឪពុក</th>
                <th className="py-1 px-1 border border-white/30 min-w-[42px]" title="កំព្រាម្តាយ">ម្តាយ</th>
                <th className="py-1 px-1 border border-white/30 min-w-[55px]" title="កំព្រាទាំងឪពុកម្តាយ">ឪពុកម្តាយ</th>
                <th className="py-1 px-1 border border-white/30 min-w-[42px]">ពិការ</th>
                <th className="py-1 px-1 border border-white/30 min-w-[42px]">ក្រីក្រ</th>
                <th className="py-1 px-1 border border-white/30 min-w-[65px]">អាហារូបករណ៍</th>
                <th className="py-1 px-1 border border-white/30 min-w-[60px]">ស្នាក់នៅវត្ត</th>
                {/* ឪពុក */}
                <th className="py-1 px-1 border border-white/30 min-w-[95px]">ឪពុក</th>
                <th className="py-1 px-1 border border-white/30 min-w-[75px]">មុខរបរ</th>
                <th className="py-1 px-1 border border-white/30 min-w-[90px]">លេខទូរស័ព្ទ</th>
                {/* ម្តាយ */}
                <th className="py-1 px-1 border border-white/30 min-w-[95px]">ម្តាយ</th>
                <th className="py-1 px-1 border border-white/30 min-w-[75px]">មុខរបរ</th>
                <th className="py-1 px-1 border border-white/30 min-w-[90px]">លេខទូរស័ព្ទ</th>
              </tr>
            </thead>

            {/* Table Body: Editable Rows */}
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={28} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    មិនមានទិន្នន័យសិស្សត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu, index) => {
                  const age = stu.age || calculateAge(stu.dob);

                  return (
                    <tr
                      key={stu.id}
                      className="hover:bg-blue-50/40 transition-colors group border-b border-slate-200"
                    >
                      {/* ល.រ */}
                      <td className="py-1 px-1 text-center font-bold text-slate-600 bg-slate-50 border-r border-slate-200">
                        <input
                          type="number"
                          value={stu.rollNo}
                          onChange={(e) => handleInlineChange(stu.id, 'rollNo', Number(e.target.value))}
                          className="w-8 text-center font-bold bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded p-0 text-[11px]"
                        />
                      </td>

                      {/* អត្តលេខ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.studentCode}
                          onChange={(e) => handleInlineChange(stu.id, 'studentCode', e.target.value)}
                          className="w-full font-mono text-[11px] font-bold text-slate-700 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* គោត្តនាម នាម */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.nameKh}
                          onChange={(e) => handleInlineChange(stu.id, 'nameKh', e.target.value)}
                          className="w-full font-bold text-slate-900 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* ភេទ */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <select
                          value={stu.gender}
                          onChange={(e) => handleInlineChange(stu.id, 'gender', e.target.value as Gender)}
                          className={`text-[10px] font-bold rounded px-1 py-0.5 cursor-pointer border-0 ${
                            stu.gender === 'ស្រី'
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          <option value="ប្រុស">ប្រុស</option>
                          <option value="ស្រី">ស្រី</option>
                        </select>
                      </td>

                      {/* ថ្ងៃខែឆ្នាំកំណើត */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="date"
                          value={stu.dob || ''}
                          onChange={(e) => handleInlineChange(stu.id, 'dob', e.target.value)}
                          className="w-full text-[10px] text-slate-700 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* អាយុ */}
                      <td className="py-1 px-1 text-center font-bold text-slate-700 bg-slate-50/50 border-r border-slate-200">
                        {toKhmerNum(age)}
                      </td>

                      {/* មកពីសាលា */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.originSchool || ''}
                          placeholder="សាលាចាស់..."
                          onChange={(e) => handleInlineChange(stu.id, 'originSchool', e.target.value)}
                          className="w-full text-[10px] text-slate-700 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* ទីកន្លែងកំណើត - ភូមិ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.pobVillage || ''}
                          onChange={(e) => handleInlineChange(stu.id, 'pobVillage', e.target.value)}
                          className="w-full text-[10px] text-slate-700 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* ទីកន្លែងកំណើត - ឃុំ/សង្កាត់ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.pobCommune || ''}
                          onChange={(e) => handleInlineChange(stu.id, 'pobCommune', e.target.value)}
                          className="w-full text-[10px] text-slate-700 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* ទីកន្លែងកំណើត - ស្រុក/ខណ្ឌ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.pobDistrict || ''}
                          onChange={(e) => handleInlineChange(stu.id, 'pobDistrict', e.target.value)}
                          className="w-full text-[10px] text-slate-700 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* ទីកន្លែងកំណើត - ខេត្ត/រាជធានី */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.pobProvince || stu.pob || ''}
                          onChange={(e) => handleInlineChange(stu.id, 'pobProvince', e.target.value)}
                          className="w-full text-[10px] text-slate-700 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* អាសយដ្ឋានបច្ចុប្បន្ន - ភូមិ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.addrVillage || ''}
                          onChange={(e) => handleInlineChange(stu.id, 'addrVillage', e.target.value)}
                          className="w-full text-[10px] text-slate-700 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* អាសយដ្ឋានបច្ចុប្បន្ន - ឃុំ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.addrCommune || ''}
                          onChange={(e) => handleInlineChange(stu.id, 'addrCommune', e.target.value)}
                          className="w-full text-[10px] text-slate-700 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* អាសយដ្ឋានបច្ចុប្បន្ន - ស្រុក */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.addrDistrict || ''}
                          onChange={(e) => handleInlineChange(stu.id, 'addrDistrict', e.target.value)}
                          className="w-full text-[10px] text-slate-700 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* អាសយដ្ឋានបច្ចុប្បន្ន - ខេត្ត */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.addrProvince || stu.currentAddress || ''}
                          onChange={(e) => handleInlineChange(stu.id, 'addrProvince', e.target.value)}
                          className="w-full text-[10px] text-slate-700 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* លេខទូរស័ព្ទផ្ទាល់ខ្លួន */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.studentPhone || ''}
                          placeholder="ទូរស័ព្ទសិស្ស..."
                          onChange={(e) => handleInlineChange(stu.id, 'studentPhone', e.target.value)}
                          className="w-full text-[10px] font-mono text-blue-700 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* ស្ថានភាពសិស្ស - កំព្រាឪពុក */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <input
                          type="checkbox"
                          checked={stu.orphanStatus === 'father' || stu.orphanStatus === 'both'}
                          onChange={(e) =>
                            handleInlineChange(
                              stu.id,
                              'orphanStatus',
                              e.target.checked
                                ? stu.orphanStatus === 'mother'
                                  ? 'both'
                                  : 'father'
                                : stu.orphanStatus === 'both'
                                ? 'mother'
                                : 'none'
                            )
                          }
                          className="rounded text-blue-600 cursor-pointer"
                        />
                      </td>

                      {/* ស្ថានភាពសិស្ស - កំព្រាម្តាយ */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <input
                          type="checkbox"
                          checked={stu.orphanStatus === 'mother' || stu.orphanStatus === 'both'}
                          onChange={(e) =>
                            handleInlineChange(
                              stu.id,
                              'orphanStatus',
                              e.target.checked
                                ? stu.orphanStatus === 'father'
                                  ? 'both'
                                  : 'mother'
                                : stu.orphanStatus === 'both'
                                ? 'father'
                                : 'none'
                            )
                          }
                          className="rounded text-blue-600 cursor-pointer"
                        />
                      </td>

                      {/* ស្ថានភាពសិស្ស - កំព្រាទាំងឪពុកម្តាយ */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <input
                          type="checkbox"
                          checked={stu.orphanStatus === 'both'}
                          onChange={(e) =>
                            handleInlineChange(stu.id, 'orphanStatus', e.target.checked ? 'both' : 'none')
                          }
                          className="rounded text-rose-600 cursor-pointer"
                        />
                      </td>

                      {/* ស្ថានភាពសិស្ស - ពិការ */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <input
                          type="checkbox"
                          checked={!!stu.isDisabled}
                          onChange={(e) => handleInlineChange(stu.id, 'isDisabled', e.target.checked)}
                          className="rounded text-amber-600 cursor-pointer"
                        />
                      </td>

                      {/* ស្ថានភាពសិស្ស - ក្រីក្រ */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <input
                          type="checkbox"
                          checked={!!stu.isPoor}
                          onChange={(e) => handleInlineChange(stu.id, 'isPoor', e.target.checked)}
                          className="rounded text-amber-600 cursor-pointer"
                        />
                      </td>

                      {/* ស្ថានភាពសិស្ស - អាហារូបករណ៍ */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <input
                          type="checkbox"
                          checked={!!stu.hasScholarship}
                          onChange={(e) => handleInlineChange(stu.id, 'hasScholarship', e.target.checked)}
                          className="rounded text-emerald-600 cursor-pointer"
                        />
                      </td>

                      {/* ស្ថានភាពសិស្ស - ស្នាក់នៅវត្ត */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <input
                          type="checkbox"
                          checked={!!stu.stayInPagoda}
                          onChange={(e) => handleInlineChange(stu.id, 'stayInPagoda', e.target.checked)}
                          className="rounded text-indigo-600 cursor-pointer"
                        />
                      </td>

                      {/* ឪពុក - ឈ្មោះ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.fatherName || stu.guardianName || ''}
                          placeholder="ឈ្មោះឪពុក..."
                          onChange={(e) => handleInlineChange(stu.id, 'fatherName', e.target.value)}
                          className="w-full text-[10px] font-semibold text-slate-800 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* ឪពុក - មុខរបរ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.fatherOccupation || stu.guardianOccupation || ''}
                          placeholder="មុខរបរ..."
                          onChange={(e) => handleInlineChange(stu.id, 'fatherOccupation', e.target.value)}
                          className="w-full text-[10px] text-slate-700 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* ឪពុក - លេខទូរស័ព្ទ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.fatherPhone || stu.guardianPhone || ''}
                          placeholder="ទូរស័ព្ទ..."
                          onChange={(e) => handleInlineChange(stu.id, 'fatherPhone', e.target.value)}
                          className="w-full text-[10px] font-mono text-slate-700 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* ម្តាយ - ឈ្មោះ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.motherName || ''}
                          placeholder="ឈ្មោះម្តាយ..."
                          onChange={(e) => handleInlineChange(stu.id, 'motherName', e.target.value)}
                          className="w-full text-[10px] font-semibold text-slate-800 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* ម្តាយ - មុខរបរ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.motherOccupation || ''}
                          placeholder="មុខរបរ..."
                          onChange={(e) => handleInlineChange(stu.id, 'motherOccupation', e.target.value)}
                          className="w-full text-[10px] text-slate-700 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* ម្តាយ - លេខទូរស័ព្ទ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.motherPhone || ''}
                          placeholder="ទូរស័ព្ទ..."
                          onChange={(e) => handleInlineChange(stu.id, 'motherPhone', e.target.value)}
                          className="w-full text-[10px] font-mono text-slate-700 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* ផ្សេងៗ */}
                      <td className="py-1 px-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={stu.otherNotes || stu.notes || ''}
                          placeholder="ចំណាំ..."
                          onChange={(e) => handleInlineChange(stu.id, 'otherNotes', e.target.value)}
                          className="w-full text-[10px] text-slate-600 bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                        />
                      </td>

                      {/* សកម្មភាព */}
                      <td className="py-1 px-1 text-center no-print bg-slate-50/50">
                        <div className="flex items-center justify-center space-x-1">
                          {/* ចម្លងសិស្ស */}
                          <button
                            onClick={() => handleDirectDuplicate(stu)}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                            title="ចម្លងសិស្ស (បង្កើតសិស្សស្ទួន)"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* មើលប្រវត្តិរូប */}
                          <button
                            onClick={() => setViewingStudent(stu)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="មើលប្រវត្តិរូបលម្អិត"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* លុប */}
                          <button
                            onClick={() => handleDirectDelete(stu)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
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

        {/* Bottom Status Row */}
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
            + បន្ថែមសិស្សថ្មីមួយជួរដេកទៀត
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
        maxWidth="2xl"
      >
        {viewingStudent && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-md">
                {viewingStudent.nameKh.charAt(0)}
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">{viewingStudent.nameKh}</h4>
                <p className="text-xs text-slate-500 font-medium">{viewingStudent.nameEn || '-'}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-md font-bold font-mono">
                    {viewingStudent.studentCode}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-xs rounded-md font-bold">
                    {classes.find((c) => c.id === viewingStudent.classId)?.name || 'ថ្នាក់រៀន'}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded-md font-bold">
                    លេខរៀង៖ {toKhmerNum(viewingStudent.rollNo)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-0.5">ភេទ</span>
                <span className="font-bold text-slate-800">{viewingStudent.gender}</span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-0.5">ថ្ងៃខែឆ្នាំកំណើត</span>
                <span className="font-bold text-slate-800">{viewingStudent.dob ? formatKhmerDate(viewingStudent.dob) : '-'}</span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-0.5">អាយុ</span>
                <span className="font-bold text-slate-800">{toKhmerNum(viewingStudent.age || calculateAge(viewingStudent.dob))} ឆ្នាំ</span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-0.5">ទូរស័ព្ទសិស្ស</span>
                <span className="font-bold text-blue-700">{viewingStudent.studentPhone || '-'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-400 font-bold block">ទីកន្លែងកំណើត៖</span>
                <p><span className="text-slate-500">ភូមិ៖</span> <strong>{viewingStudent.pobVillage || '-'}</strong></p>
                <p><span className="text-slate-500">ឃុំ/សង្កាត់៖</span> <strong>{viewingStudent.pobCommune || '-'}</strong></p>
                <p><span className="text-slate-500">ស្រុក/ខណ្ឌ៖</span> <strong>{viewingStudent.pobDistrict || '-'}</strong></p>
                <p><span className="text-slate-500">ខេត្ត/រាជធានី៖</span> <strong>{viewingStudent.pobProvince || viewingStudent.pob || '-'}</strong></p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-400 font-bold block">អាសយដ្ឋានបច្ចុប្បន្ន៖</span>
                <p><span className="text-slate-500">ភូមិ៖</span> <strong>{viewingStudent.addrVillage || '-'}</strong></p>
                <p><span className="text-slate-500">ឃុំ៖</span> <strong>{viewingStudent.addrCommune || '-'}</strong></p>
                <p><span className="text-slate-500">ស្រុក៖</span> <strong>{viewingStudent.addrDistrict || '-'}</strong></p>
                <p><span className="text-slate-500">ខេត្ត៖</span> <strong>{viewingStudent.addrProvince || viewingStudent.currentAddress || '-'}</strong></p>
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs space-y-2">
              <h5 className="font-bold text-blue-900">ព័ត៌មានឪពុកម្តាយ & អាណាព្យាបាល៖</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2 bg-white rounded-xl border border-blue-100">
                  <p className="font-bold text-slate-800">ឪពុក៖ {viewingStudent.fatherName || viewingStudent.guardianName || '-'}</p>
                  <p className="text-slate-500 mt-0.5">មុខរបរ៖ {viewingStudent.fatherOccupation || viewingStudent.guardianOccupation || '-'}</p>
                  <p className="text-blue-700 font-bold mt-0.5">ទូរស័ព្ទ៖ {viewingStudent.fatherPhone || viewingStudent.guardianPhone || '-'}</p>
                </div>
                <div className="p-2 bg-white rounded-xl border border-blue-100">
                  <p className="font-bold text-slate-800">ម្តាយ៖ {viewingStudent.motherName || '-'}</p>
                  <p className="text-slate-500 mt-0.5">មុខរបរ៖ {viewingStudent.motherOccupation || '-'}</p>
                  <p className="text-blue-700 font-bold mt-0.5">ទូរស័ព្ទ៖ {viewingStudent.motherPhone || '-'}</p>
                </div>
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
