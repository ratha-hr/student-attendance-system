import React, { useState, useRef } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Upload,
  Printer,
  Edit2,
  Trash2,
  Phone,
  Eye,
  AlertTriangle,
  UserCheck,
  Calendar,
  MapPin,
  Heart,
  ChevronDown,
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
  onSelectClass: (id: string) => void;
  onRefresh: () => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({
  students,
  classes,
  attendanceRecords,
  settings,
  selectedClassId,
  onSelectClass,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'ប្រុស' | 'ស្រី'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [rollNo, setRollNo] = useState(1);
  const [studentCode, setStudentCode] = useState('');
  const [nameKh, setNameKh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [gender, setGender] = useState<Gender>('ប្រុស');
  const [dob, setDob] = useState('2011-01-01');
  const [pob, setPob] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('ឪពុក');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianOccupation, setGuardianOccupation] = useState('');
  const [notes, setNotes] = useState('');

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesClass = selectedClassId === 'ALL' || s.classId === selectedClassId;
    const matchesGender = genderFilter === 'all' || s.gender === genderFilter;
    const matchesSearch =
      s.nameKh.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.guardianPhone.includes(searchTerm);
    return matchesClass && matchesGender && matchesSearch;
  });

  const openAddModal = () => {
    setEditingStudent(null);
    const targetClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
    const classStudents = students.filter((s) => s.classId === targetClassId);
    const nextRoll = classStudents.length + 1;

    setClassId(targetClassId);
    setRollNo(nextRoll);
    setStudentCode(`STU-${String(nextRoll).padStart(3, '0')}`);
    setNameKh('');
    setNameEn('');
    setGender('ប្រុស');
    setDob('2011-01-01');
    setPob('');
    setCurrentAddress('');
    setGuardianName('');
    setGuardianRelationship('ឪពុក');
    setGuardianPhone('');
    setGuardianOccupation('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Student) => {
    setEditingStudent(s);
    setClassId(s.classId);
    setRollNo(s.rollNo);
    setStudentCode(s.studentCode);
    setNameKh(s.nameKh);
    setNameEn(s.nameEn);
    setGender(s.gender);
    setDob(s.dob);
    setPob(s.pob);
    setCurrentAddress(s.currentAddress);
    setGuardianName(s.guardianName);
    setGuardianRelationship(s.guardianRelationship);
    setGuardianPhone(s.guardianPhone);
    setGuardianOccupation(s.guardianOccupation || '');
    setNotes(s.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameKh.trim()) return;

    if (editingStudent) {
      await db.students.update(editingStudent.id, {
        classId,
        rollNo: Number(rollNo),
        studentCode: studentCode.trim(),
        nameKh: nameKh.trim(),
        nameEn: nameEn.trim(),
        gender,
        dob,
        pob: pob.trim(),
        currentAddress: currentAddress.trim(),
        guardianName: guardianName.trim(),
        guardianRelationship,
        guardianPhone: guardianPhone.trim(),
        guardianOccupation: guardianOccupation.trim(),
        notes: notes.trim(),
      });
    } else {
      const newStudent: Student = {
        id: 'stu-' + Date.now(),
        classId,
        rollNo: Number(rollNo),
        studentCode: studentCode.trim(),
        nameKh: nameKh.trim(),
        nameEn: nameEn.trim(),
        gender,
        dob,
        pob: pob.trim(),
        currentAddress: currentAddress.trim(),
        guardianName: guardianName.trim(),
        guardianRelationship,
        guardianPhone: guardianPhone.trim(),
        guardianOccupation: guardianOccupation.trim(),
        notes: notes.trim(),
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      await db.students.add(newStudent);
    }

    setIsModalOpen(false);
    onRefresh();
  };

  const handleDeleteStudent = async (s: Student) => {
    if (window.confirm(`តើអ្នកពិតជាចង់លុបសិស្សឈ្មោះ "${s.nameKh}" មែនទេ?`)) {
      await db.students.delete(s.id);
      onRefresh();
    }
  };

  const handleExportExcel = () => {
    const targetClass = classes.find((c) => c.id === selectedClassId);
    const className = targetClass ? targetClass.name : 'ទាំងអស់';
    exportStudentsToExcel(filteredStudents, className);
  };

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
      alert(`នាំចូលសិស្សចំនួន ${toKhmerNum(parsed.length)} នាក់បានជោគជ័យ!`);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('មានបញ្ហាក្នុងការអានឯកសារ Excel! សូមពិនិត្យទម្រង់ឯកសារឡើងវិញ។');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getAbsenceCount = (stuId: string) => {
    const records = attendanceRecords.filter((r) => r.studentId === stuId);
    const unexcused = records.filter((r) => r.status === 'absent').length;
    const excused = records.filter((r) => r.status === 'permission').length;
    return { unexcused, excused, total: unexcused + excused };
  };

  const currentClassName = selectedClassId === 'ALL'
    ? 'ថ្នាក់ទាំងអស់'
    : classes.find((c) => c.id === selectedClassId)?.name || 'ថ្នាក់រៀន';

  return (
    <div className="space-y-6">
      {/* Top Banner and Quick Excel Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center">
            <Users className="w-6 h-6 text-blue-600 mr-2" />
            ពត៌មានសិស្ស ({currentClassName})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            សរុប {toKhmerNum(filteredStudents.length)} នាក់ (ស្រី {toKhmerNum(filteredStudents.filter((s) => s.gender === 'ស្រី').length)} នាក់, ប្រុស {toKhmerNum(filteredStudents.filter((s) => s.gender === 'ប្រុស').length)} នាក់)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
          <label className="inline-flex items-center px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            នាំចូល Excel
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={handleImportFile}
            />
          </label>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-blue-600" />
            ទាញចេញ Excel
          </button>

          {/* Print List */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            បោះពុម្ពបញ្ជី
          </button>

          {/* Add Student */}
          <button
            onClick={openAddModal}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1" />
            បន្ថែមសិស្សថ្មី
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះ, អត្តលេខ, ទូរស័ព្ទ..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          {/* Gender Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setGenderFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                genderFilter === 'all' ? 'bg-white font-bold text-slate-800 shadow-2xs' : 'text-slate-600'
              }`}
            >
              ទាំងអស់
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

      {/* Printable Official Header (Shown Only when Printing) */}
      <div className="hidden print:block text-center mb-6">
        <h3 className="font-moul text-base">ព្រះរាជាណាចក្រកម្ពុជា</h3>
        <h4 className="font-moul text-sm">ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
        <div className="w-24 h-0.5 bg-black mx-auto my-2" />
        <div className="text-left mt-2">
          <p className="font-bold text-xs">{settings?.schoolName}</p>
          <p className="text-xs">ឆ្នាំសិក្សា៖ {settings?.academicYear}</p>
        </div>
        <h2 className="font-moul text-lg mt-4">
          បញ្ជីរាយនាមសិស្ស {currentClassName}
        </h2>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-12">ល.រ</th>
                <th className="py-3 px-3">អត្តលេខ</th>
                <th className="py-3 px-3">គោត្តនាម-នាម</th>
                <th className="py-3 px-3 hidden md:table-cell">ឈ្មោះឡាតាំង</th>
                <th className="py-3 px-3 text-center">ភេទ</th>
                <th className="py-3 px-3 hidden sm:table-cell">ថ្ងៃកំណើត</th>
                <th className="py-3 px-3 hidden lg:table-cell">អាណាព្យាបាល</th>
                <th className="py-3 px-3 hidden xl:table-cell">ទូរស័ព្ទ</th>
                <th className="py-3 px-3 text-center">អវត្តមាន</th>
                <th className="py-3 px-3 text-center no-print">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    មិនមានទិន្នន័យសិស្សត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu, index) => {
                  const abs = getAbsenceCount(stu.id);
                  const isHighAbsence = abs.unexcused >= (settings?.absenceWarningThreshold || 3);

                  return (
                    <tr
                      key={stu.id}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        {toKhmerNum(index + 1)}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs font-bold text-slate-600">
                        {stu.studentCode}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 group-hover:text-blue-700">
                          {stu.nameKh}
                        </span>
                        {stu.notes && (
                          <span className="ml-1.5 text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                            {stu.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 hidden md:table-cell text-slate-500 font-medium">
                        {stu.nameEn}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            stu.gender === 'ស្រី'
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {stu.gender}
                        </span>
                      </td>
                      <td className="py-3 px-3 hidden sm:table-cell text-slate-500 whitespace-nowrap">
                        {stu.dob ? formatKhmerDate(stu.dob) : '-'}
                      </td>
                      <td className="py-3 px-3 hidden lg:table-cell">
                        <span className="font-semibold text-slate-800">{stu.guardianName}</span>{' '}
                        <span className="text-slate-400 text-xs">({stu.guardianRelationship})</span>
                      </td>
                      <td className="py-3 px-3 hidden xl:table-cell whitespace-nowrap">
                        {stu.guardianPhone ? (
                          <a
                            href={`tel:${stu.guardianPhone}`}
                            className="inline-flex items-center text-blue-600 font-semibold hover:underline"
                          >
                            <Phone className="w-3 h-3 mr-1 text-blue-500" />
                            {stu.guardianPhone}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {abs.total > 0 ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              isHighAbsence
                                ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isHighAbsence && <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" />}
                            {toKhmerNum(abs.unexcused)} ឥតច្បាប់
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-xs font-medium">ពេញ</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center no-print">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setViewingStudent(stu)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="មើលលម្អិត"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(stu)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="កែប្រែ"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(stu)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="លុប"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal: View Full Student Profile */}
      <Modal
        isOpen={!!viewingStudent}
        onClose={() => setViewingStudent(null)}
        title="ព័ត៌មានលម្អិតសិស្ស"
        subtitle={viewingStudent?.nameKh}
        maxWidth="lg"
      >
        {viewingStudent && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
                {viewingStudent.nameKh.charAt(0)}
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">{viewingStudent.nameKh}</h4>
                <p className="text-xs text-slate-500 font-medium">{viewingStudent.nameEn}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-md font-bold">
                    {viewingStudent.studentCode}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xs rounded-md font-bold">
                    {classes.find((c) => c.id === viewingStudent.classId)?.name}
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
                <span className="font-bold text-slate-800">{formatKhmerDate(viewingStudent.dob)}</span>
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
                <p><span className="text-slate-500">ឈ្មោះ៖</span> <span className="font-bold">{viewingStudent.guardianName}</span></p>
                <p><span className="text-slate-500">ត្រូវជា៖</span> <span className="font-bold">{viewingStudent.guardianRelationship}</span></p>
                <p><span className="text-slate-500">លេខទូរស័ព្ទ៖</span> <a href={`tel:${viewingStudent.guardianPhone}`} className="text-blue-700 font-bold hover:underline">{viewingStudent.guardianPhone}</a></p>
                <p><span className="text-slate-500">មុខរបរ៖</span> <span className="font-bold">{viewingStudent.guardianOccupation || '-'}</span></p>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setViewingStudent(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
              >
                បិទផ្ទាំង
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Add / Edit Student */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? 'កែប្រែព័ត៌មានសិស្ស' : 'បន្ថែមសិស្សថ្មី'}
        subtitle="សូមបំពេញព័ត៌មានផ្ទាល់ខ្លួន និងអាណាព្យាបាល"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ថ្នាក់រៀន <span className="text-rose-500">*</span>
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                លេខរៀងក្នុងថ្នាក់
              </label>
              <input
                type="number"
                min="1"
                value={rollNo}
                onChange={(e) => setRollNo(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                អត្តលេខសិស្ស <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                placeholder="STU-001"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                គោត្តនាម-នាម (ខ្មែរ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nameKh}
                onChange={(e) => setNameKh(e.target.value)}
                placeholder="ឧ. ចាន់ សុខា"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ឈ្មោះជាអក្សរឡាតាំង
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="ឧ. Chan Sokha"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ភេទ <span className="text-rose-500">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                <option value="ប្រុស">ប្រុស</option>
                <option value="ស្រី">ស្រី</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ថ្ងៃខែឆ្នាំកំណើត
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ទីកន្លែងកំណើត
              </label>
              <input
                type="text"
                value={pob}
                onChange={(e) => setPob(e.target.value)}
                placeholder="ស្រុក/ខេត្ត កំណើត"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              អាសយដ្ឋានបច្ចុប្បន្ន
            </label>
            <input
              type="text"
              value={currentAddress}
              onChange={(e) => setCurrentAddress(e.target.value)}
              placeholder="ផ្ទះលេខ, ផ្លូវ, ភូមិ, ឃុំ/សង្កាត់..."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Guardian Info Header */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">
              ព័ត៌មានអាណាព្យាបាល
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ឈ្មោះអាណាព្យាបាល
                </label>
                <input
                  type="text"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="ឈ្មោះឪពុក ឬម្តាយ..."
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ត្រូវជា
                </label>
                <select
                  value={guardianRelationship}
                  onChange={(e) => setGuardianRelationship(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ឪពុក">ឪពុក</option>
                  <option value="ម្តាយ">ម្តាយ</option>
                  <option value="អាណាព្យាបាល">អាណាព្យាបាល</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  លេខទូរស័ព្ទ
                </label>
                <input
                  type="tel"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="012 345 678"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              កំណត់ចំណាំពិសេស (អាកប្បកិរិយា, សុខភាព...)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ឧ. ប្រធានថ្នាក់, ឧស្សាហ៍ឈឺ..."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
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
              {editingStudent ? 'រក្សាទុកការកែប្រែ' : 'បន្ថែមសិស្ស'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
