import React, { useState } from 'react';
import { Printer, Download, X, QrCode, User, CheckSquare, Square } from 'lucide-react';
import type { Student, ClassRoom, TeacherSettings } from '../types';
import { generateStudentQRCodeSVG } from '../utils/qrCode';
import { toKhmerNum, fromKhmerNum, formatKhmerDate } from '../utils/dateUtils';
import { PrintButton } from './common/PrintButton';

interface StudentIDCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  currentClass: ClassRoom | null;
  settings: TeacherSettings | null;
}

export const StudentIDCardsModal: React.FC<StudentIDCardsModalProps> = ({
  isOpen,
  onClose,
  students,
  currentClass,
  settings,
}) => {
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(students.map((s) => s.id))
  );

  if (!isOpen) return null;

  const toggleSelectStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const selectAll = () => setSelectedStudentIds(new Set(students.map((s) => s.id)));
  const deselectAll = () => setSelectedStudentIds(new Set());

  const printableStudents = students.filter((s) => selectedStudentIds.has(s.id));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-blue-950 text-white p-4 sm:p-5 flex items-center justify-between no-print">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/60 border border-blue-400/40 flex items-center justify-center text-white">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-moul text-sm sm:text-base tracking-wide">
                កាតសម្គាល់ខ្លួនសិស្សទំនើប (Student ID Cards)
              </h3>
              <p className="text-xs text-blue-200">
                បោះពុម្ពកាតសិស្សភ្ជាប់ QR Code តាមស្តង់ដារក្រសួង ({currentClass?.name || 'ថ្នាក់ទាំងអស់'})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <PrintButton
              defaultOrientation="portrait"
              label={`បោះពុម្ព (${printableStudents.length} កាត)`}
            />
            <button
              onClick={onClose}
              className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Selection Toolbar (Screen only) */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs no-print">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-slate-700">
              ជ្រើសរើស៖ {toKhmerNum(printableStudents.length)} / {toKhmerNum(students.length)} នាក់
            </span>
            <button
              onClick={selectAll}
              className="text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              ជ្រើសរើសទាំងអស់
            </button>
            <span>|</span>
            <button
              onClick={deselectAll}
              className="text-slate-500 hover:underline cursor-pointer"
            >
              ដោះទាំងអស់
            </button>
          </div>
          <span className="text-slate-400 hidden sm:inline">
            📄 ទម្រង់ក្រដាស A4 ស្វ័យប្រវត្តិតម្រៀប ៨ កាតក្នុងមួយសន្លឹក
          </span>
        </div>

        {/* Cards Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60 print:bg-white print:p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
            {printableStudents.map((s, idx) => {
              const qrSvg = generateStudentQRCodeSVG(
                `ID:${s.studentCode}|NAME:${s.nameKh}|CLASS:${currentClass?.name || ''}|SCH:${settings?.schoolName || 'HSKTL'}`,
                88
              );

              return (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl border-2 border-blue-900/40 shadow-md p-3.5 relative overflow-hidden flex flex-col justify-between print:shadow-none print:border-slate-800 print:break-inside-avoid print:h-[240px]"
                >
                  {/* Card Header */}
                  <div className="border-b-2 border-blue-900/30 pb-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-900 text-white flex items-center justify-center font-moul text-[9px] shadow-xs">
                        ស
                      </div>
                      <div>
                        <p className="font-moul text-[9px] text-blue-950 leading-tight">
                          {settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}
                        </p>
                        <p className="text-[8px] font-bold text-slate-500 tracking-wider">
                          កាតសម្គាល់ខ្លួនសិស្ស • STUDENT ID CARD
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200">
                      {currentClass?.name || 'ទូទៅ'}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="py-2.5 flex items-start gap-3">
                    {/* Photo Placeholder */}
                    <div className="w-20 h-24 rounded-xl border border-slate-300 bg-linear-to-b from-slate-100 to-slate-200 flex flex-col items-center justify-center shrink-0 overflow-hidden shadow-inner">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          s.gender === 'ស្រី'
                            ? 'bg-pink-200 text-pink-700'
                            : 'bg-blue-200 text-blue-700'
                        }`}
                      >
                        {s.nameKh.charAt(0)}
                      </div>
                      <span className="text-[8px] text-slate-500 mt-1 font-bold">រូបថត 3x4</span>
                    </div>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0 space-y-1 text-[10px]">
                      <div>
                        <p className="font-moul text-xs text-blue-950 truncate">{s.nameKh}</p>
                        <p className="font-sans font-bold text-[10px] text-slate-600 tracking-wide uppercase">
                          {s.nameEn || 'STUDENT NAME'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-700">
                        <p>
                          <span className="text-slate-400">អត្តលេខ៖ </span>
                          <span className="font-bold text-blue-900 font-mono">{fromKhmerNum(s.studentCode)}</span>
                        </p>
                        <p>
                          <span className="text-slate-400">ភេទ៖ </span>
                          <span className="font-bold">{s.gender}</span>
                        </p>
                        <p className="col-span-2">
                          <span className="text-slate-400">ថ្ងៃកំណើត៖ </span>
                          <span className="font-bold">{s.dob || '---'}</span>
                        </p>
                        <p className="col-span-2 truncate">
                          <span className="text-slate-400">ទីកន្លែង៖ </span>
                          <span>{s.pobDistrict || 'កំពង់ត្រឡាច'}, {s.pobProvince || 'កំពង់ឆ្នាំង'}</span>
                        </p>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="shrink-0 flex flex-col items-center justify-center">
                      <div
                        className="p-1 bg-white rounded-lg border border-slate-200 shadow-2xs"
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                      />
                      <span className="text-[7px] text-slate-400 font-mono mt-0.5">
                        ស្កេនពិនិត្យ
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="border-t border-slate-200/80 pt-1.5 flex items-center justify-between text-[8px] text-slate-500">
                    <div>
                      <span>ឆ្នាំសិក្សា {settings?.academicYear || '២០២៤-២០២៥'}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-700">នាយកសាលា / គ្រូបន្ទុកថ្នាក់</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
