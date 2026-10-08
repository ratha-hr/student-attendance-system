import React, { useState } from 'react';
import {
  Award,
  CreditCard,
  Printer,
  User,
  Star,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import type { Student, ClassRoom, TeacherSettings } from '../types';
import { toKhmerNum, formatKhmerDate, getTodayDateString, KHMER_MONTHS } from '../utils/dateUtils';

interface CertificatesPageProps {
  students: Student[];
  classes: ClassRoom[];
  settings: TeacherSettings | null;
  selectedClassId: string;
}

export const CertificatesPage: React.FC<CertificatesPageProps> = ({
  students,
  classes,
  settings,
  selectedClassId,
}) => {
  const [activeTab, setActiveTab] = useState<'certificate' | 'id-cards'>('certificate');

  const activeClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
  const currentClass = classes.find((c) => c.id === activeClassId);

  const classStudents = students
    .filter((s) => s.classId === activeClassId)
    .sort((a, b) => a.rollNo - b.rollNo);

  // Certificate State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(classStudents[0]?.id || '');
  const [honorType, setHonorType] = useState('ទទួលបានចំណាត់ថ្នាក់លេខ ១');
  const [examMonth, setExamMonth] = useState('តុលា');
  const [customRemark, setCustomRemark] = useState('ខិតខំរៀនសូត្រ មានវិន័យ និងសីលធម៌ល្អប្រពៃ');

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || classStudents[0];
  const todayKhmer = formatKhmerDate(getTodayDateString(), false);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center">
            <Award className="w-6 h-6 text-amber-500 mr-2" />
            ប័ណ្ណសរសើរ & កាតសិស្ស
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            បោះពុម្ពប័ណ្ណសរសើរសិស្សឆ្នើម និងកាតសម្គាល់ខ្លួនសិស្ស ({currentClass?.name || 'ថ្នាក់រៀន'})
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Tab switch */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('certificate')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'certificate' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              ប័ណ្ណសរសើរ
            </button>
            <button
              onClick={() => setActiveTab('id-cards')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'id-cards' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              កាតសិស្ស (ID Cards)
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            បោះពុម្ព
          </button>
        </div>
      </div>

      {/* Tab 1: Certificate of Merit (ប័ណ្ណសរសើរ) */}
      {activeTab === 'certificate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Certificate Options Form */}
          <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 no-print">
            <h3 className="font-bold text-sm text-slate-800 flex items-center">
              <Sparkles className="w-4 h-4 text-amber-500 mr-2" />
              ការកំណត់ប័ណ្ណសរសើរ
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ជ្រើសរើសសិស្សទទួលប័ណ្ណ៖
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500"
              >
                {classStudents.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    {toKhmerNum(idx + 1)}. {s.nameKh} ({s.gender})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                កិត្តិយស / សមិទ្ធផល៖
              </label>
              <select
                value={honorType}
                onChange={(e) => setHonorType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500"
              >
                <option value="ទទួលបានចំណាត់ថ្នាក់លេខ ១">ទទួលបានចំណាត់ថ្នាក់លេខ ១</option>
                <option value="ទទួលបានចំណាត់ថ្នាក់លេខ ២">ទទួលបានចំណាត់ថ្នាក់លេខ ២</option>
                <option value="ទទួលបានចំណាត់ថ្នាក់លេខ ៣">ទទួលបានចំណាត់ថ្នាក់លេខ ៣</option>
                <option value="សិស្សគំរូ និងមានវិន័យល្អប្រពៃ">សិស្សគំរូ និងមានវិន័យល្អប្រពៃ</option>
                <option value="សិស្សឆ្នើមក្នុងការសិក្សា">សិស្សឆ្នើមក្នុងការសិក្សា</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ការប្រឡងប្រចាំខែ៖
              </label>
              <select
                value={examMonth}
                onChange={(e) => setExamMonth(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500"
              >
                {KHMER_MONTHS.map((m) => (
                  <option key={m} value={m}>
                    ខែ {m}
                  </option>
                ))}
                <option value="ឆមាសទី ១">ឆមាសទី ១</option>
                <option value="ឆមាសទី ២">ឆមាសទី ២</option>
                <option value="ប្រចាំឆ្នាំ">ប្រចាំឆ្នាំ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                សេចក្តីសរសើរ / គុណសម្បត្តិ៖
              </label>
              <textarea
                rows={3}
                value={customRemark}
                onChange={(e) => setCustomRemark(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Right: Printable Certificate View */}
          <div className="lg:col-span-2">
            <div className="bg-amber-50/20 p-6 sm:p-10 rounded-3xl border-8 border-double border-amber-500/80 text-center relative print:border-8 print:p-8 print-card shadow-xl">
              {/* Corner decorative circles */}
              <div className="absolute top-2 left-2 w-4 h-4 border-2 border-amber-500 rounded-full" />
              <div className="absolute top-2 right-2 w-4 h-4 border-2 border-amber-500 rounded-full" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-2 border-amber-500 rounded-full" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-2 border-amber-500 rounded-full" />

              {/* Header */}
              <p className="font-moul text-sm text-slate-900">ព្រះរាជាណាចក្រកម្ពុជា</p>
              <p className="font-moul text-xs text-slate-900 mt-1">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
              <div className="w-20 h-0.5 bg-amber-600 mx-auto my-2" />
              <p className="text-xs font-bold text-slate-700 mt-2">{settings?.schoolName}</p>

              {/* Title */}
              <div className="my-8">
                <h1 className="font-moul text-2xl sm:text-3xl text-amber-600 tracking-wider">
                  ប័ណ្ណសរសើរ
                </h1>
                <p className="text-xs text-slate-500 mt-1 italic">
                  CERTIFICATE OF COMMENDATION
                </p>
              </div>

              {/* Salutation & Body */}
              <div className="space-y-4 max-w-lg mx-auto text-xs sm:text-sm text-slate-800 leading-relaxed">
                <p className="text-slate-600">គណៈគ្រប់គ្រងសាលា និងលោកគ្រូ-អ្នកគ្រូ សូមផ្តល់ជូននូវប័ណ្ណសរសើរនេះដល់៖</p>

                <div className="py-2">
                  <h2 className="font-moul text-xl sm:text-2xl text-slate-950">
                    {selectedStudent?.nameKh || '............................'}
                  </h2>
                  <p className="text-xs text-slate-500 font-serif italic mt-0.5">
                    {selectedStudent?.nameEn}
                  </p>
                </div>

                <p>
                  សិស្សថ្នាក់៖ <span className="font-bold text-slate-900">{currentClass?.name}</span> • អត្តលេខ៖ <span className="font-bold font-mono text-slate-900">{selectedStudent?.studentCode}</span>
                </p>

                <div className="p-3 bg-amber-100/60 rounded-xl border border-amber-200">
                  <p className="font-bold text-amber-900 text-sm sm:text-base">
                    🌟 {honorType} ប្រចាំ{examMonth}
                  </p>
                  <p className="text-xs text-amber-800 mt-1">
                    ឆ្នាំសិក្សា {settings?.academicYear}
                  </p>
                </div>

                <p className="italic text-xs text-slate-700 pt-1">
                  «{customRemark}»
                </p>
              </div>

              {/* Signatures */}
              <div className="mt-12 flex justify-between items-start text-xs sm:text-sm px-6">
                <div className="text-center">
                  <p className="font-bold text-slate-800">បានឃើញ និងឯកភាព</p>
                  <p className="font-bold text-slate-800">នាយកសាលា</p>
                  <div className="h-16" />
                  <p className="font-moul text-xs text-slate-900">{settings?.principalName}</p>
                </div>

                <div className="text-center">
                  <p className="italic text-xs text-slate-500">{settings?.provinceCity}, {todayKhmer}</p>
                  <p className="font-bold text-slate-800">គ្រូបន្ទុកថ្នាក់</p>
                  <div className="h-16" />
                  <p className="font-moul text-xs text-slate-900">{settings?.teacherName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Student ID Cards (កាតសិស្សឌីជីថល) */}
      {activeTab === 'id-cards' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 no-print">
            កាតសម្គាល់ខ្លួនសិស្សឌីជីថលសម្រាប់ {currentClass?.name} (អាចបោះពុម្ពបានគ្រប់ទំហំ ឬកាត់ដាក់ហោប៉ៅ)៖
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classStudents.map((stu) => (
              <div
                key={stu.id}
                className="bg-white rounded-2xl border-2 border-blue-600/30 overflow-hidden shadow-md flex flex-col justify-between"
              >
                {/* ID Card Top Header Banner */}
                <div className="bg-linear-to-r from-blue-700 to-indigo-800 text-white p-3 text-center">
                  <p className="font-moul text-[10px] leading-tight">ក្រសួងអប់រំ យុវជន និងកីឡា</p>
                  <p className="font-bold text-xs truncate mt-0.5">{settings?.schoolName}</p>
                  <span className="inline-block px-2 py-0.5 bg-blue-500/40 rounded-full text-[9px] font-semibold mt-1">
                    កាតសម្គាល់ខ្លួនសិស្ស
                  </span>
                </div>

                {/* ID Card Body */}
                <div className="p-4 flex items-center space-x-3 bg-slate-50/50 flex-1">
                  {/* Photo / Avatar */}
                  <div className="w-16 h-20 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 text-white flex flex-col items-center justify-center font-bold text-xl shrink-0 shadow-xs border border-blue-200">
                    {stu.nameKh.charAt(0)}
                    <span className="text-[9px] font-normal opacity-75 mt-1">{stu.gender}</span>
                  </div>

                  {/* Student Details */}
                  <div className="space-y-1 text-xs min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{stu.nameKh}</p>
                    <p className="text-[11px] text-slate-500 truncate italic">{stu.nameEn || '-'}</p>
                    <p className="text-[11px] text-slate-600">
                      អត្តលេខ៖ <span className="font-mono font-bold text-blue-700">{stu.studentCode}</span>
                    </p>
                    <p className="text-[11px] text-slate-600">
                      ថ្នាក់៖ <span className="font-bold">{currentClass?.name}</span> (ល.រ: {toKhmerNum(stu.rollNo)})
                    </p>
                  </div>
                </div>

                {/* ID Card Footer */}
                <div className="p-2.5 bg-slate-100 border-t border-slate-200 text-center text-[10px] text-slate-500 flex items-center justify-between px-4">
                  <span>ឆ្នាំសិក្សា៖ {settings?.academicYear}</span>
                  <span className="text-emerald-600 font-bold">សុពលភាពផ្លូវការ</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
