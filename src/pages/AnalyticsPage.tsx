import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  UserCheck,
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import type { Student, ClassRoom, AttendanceRecord, TeacherSettings } from '../types';
import { toKhmerNum, KHMER_DAYS } from '../utils/dateUtils';

interface AnalyticsPageProps {
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords: AttendanceRecord[];
  settings: TeacherSettings | null;
  selectedClassId: string;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  students,
  classes,
  attendanceRecords,
  settings,
  selectedClassId,
}) => {
  const activeClassId = selectedClassId === 'ALL' ? (classes[0]?.id || '') : selectedClassId;
  const currentClass = classes.find((c) => c.id === activeClassId);

  const classStudents = selectedClassId === 'ALL'
    ? students
    : students.filter((s) => s.classId === activeClassId);

  const studentIds = new Set(classStudents.map((s) => s.id));
  const classRecords = attendanceRecords.filter((r) => studentIds.has(r.studentId));

  // Compute stats per student
  const studentMetrics = useMemo(() => {
    return classStudents.map((stu) => {
      const records = classRecords.filter((r) => r.studentId === stu.id);
      const present = records.filter((r) => r.status === 'present').length;
      const permission = records.filter((r) => r.status === 'permission').length;
      const absent = records.filter((r) => r.status === 'absent').length;
      const late = records.filter((r) => r.status === 'late').length;
      const total = records.length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

      return {
        student: stu,
        present,
        permission,
        absent,
        late,
        total,
        rate,
      };
    });
  }, [classStudents, classRecords]);

  // Top regular students (rate >= 95%)
  const topRegular = studentMetrics.filter((m) => m.absent === 0).slice(0, 5);

  // At risk students (absent >= 2)
  const atRisk = studentMetrics.filter((m) => m.absent >= (settings?.absenceWarningThreshold || 3));

  // Day of week analysis (0=Sun, 1=Mon, ..., 6=Sat)
  const weekdayAbsences = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    classRecords.forEach((r) => {
      if (r.status === 'absent') {
        const dayIdx = new Date(r.date).getDay();
        counts[dayIdx]++;
      }
    });
    return counts;
  }, [classRecords]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center">
            <BarChart3 className="w-6 h-6 text-indigo-600 mr-2" />
            ស្ថិតិ & ការវិភាគស៊ីជម្រៅ ({selectedClassId === 'ALL' ? 'គ្រប់ថ្នាក់ទាំងអស់' : currentClass?.name})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ទិន្នន័យវិភាគអត្រាវត្តមាន និន្នាការតាមថ្ងៃ និងសិស្សប្រឈម
          </p>
        </div>
      </div>

      {/* Grid: 3 Metric Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">សិស្សទៀងទាត់ ១០០%</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">
            {toKhmerNum(topRegular.length)} <span className="text-xs font-normal text-slate-500">នាក់</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">មិនធ្លាប់អវត្តមានឥតច្បាប់សូម្បីម្តង</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">សិស្សប្រឈមការព្រមាន</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-600 mt-2">
            {toKhmerNum(atRisk.length)} <span className="text-xs font-normal text-slate-500">នាក់</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">អវត្តមានឥតច្បាប់ចាប់ពី {toKhmerNum(settings?.absenceWarningThreshold || 3)} ដងឡើង</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ចំនួនកត់ត្រាវត្តមានសរុប</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-blue-600 mt-2">
            {toKhmerNum(classRecords.length)} <span className="text-xs font-normal text-slate-500">កំណត់ត្រា</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">បានរក្សាទុកក្នុងប្រព័ន្ធ</p>
        </div>
      </div>

      {/* Weekday Absence Trend Visualizer */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-800 flex items-center">
          <Calendar className="w-4 h-4 text-blue-600 mr-2" />
          និន្នាការអវត្តមានតាមថ្ងៃក្នុងសប្តាហ៍ (តើថ្ងៃណាអវត្តមានច្រើនជាងគេ?)
        </h3>

        <div className="grid grid-cols-6 gap-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((dayIdx) => {
            const count = weekdayAbsences[dayIdx] || 0;
            const maxVal = Math.max(...weekdayAbsences, 1);
            const heightPercent = Math.min(100, Math.max(12, (count / maxVal) * 100));

            return (
              <div key={dayIdx} className="flex flex-col items-center justify-end space-y-2">
                <span className="text-xs font-bold text-slate-700">{toKhmerNum(count)} លើក</span>
                <div className="w-full bg-slate-100 rounded-xl h-28 flex items-end p-1">
                  <div
                    className={`w-full rounded-lg transition-all duration-500 ${
                      count >= 3 ? 'bg-rose-500' : count > 0 ? 'bg-amber-400' : 'bg-blue-400'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center">
                  {KHMER_DAYS[dayIdx]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Student List Rates Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-800">អត្រាវត្តមានតាមសិស្សម្នាក់ៗ</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2.5 px-3">ល.រ</th>
                <th className="py-2.5 px-3">គោត្តនាម-នាម</th>
                <th className="py-2.5 px-3 text-center">ភេទ</th>
                <th className="py-2.5 px-3 text-center">បានមក</th>
                <th className="py-2.5 px-3 text-center">ច្បាប់</th>
                <th className="py-2.5 px-3 text-center">ឥតច្បាប់</th>
                <th className="py-2.5 px-3">អត្រាវត្តមាន</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentMetrics.map((m, idx) => (
                <tr key={m.student.id} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 font-bold text-slate-500">{toKhmerNum(idx + 1)}</td>
                  <td className="py-2 px-3 font-bold text-slate-900">{m.student.nameKh}</td>
                  <td className="py-2 px-3 text-center text-slate-600">{m.student.gender}</td>
                  <td className="py-2 px-3 text-center font-bold text-emerald-600">{toKhmerNum(m.present)}</td>
                  <td className="py-2 px-3 text-center font-bold text-amber-600">{toKhmerNum(m.permission)}</td>
                  <td className="py-2 px-3 text-center font-bold text-rose-600">{toKhmerNum(m.absent)}</td>
                  <td className="py-2 px-3 w-44">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            m.rate >= 90 ? 'bg-emerald-500' : m.rate >= 75 ? 'bg-amber-400' : 'bg-rose-500'
                          }`}
                          style={{ width: `${m.rate}%` }}
                        />
                      </div>
                      <span className="font-bold text-[11px] text-slate-700 w-9 text-right">
                        {toKhmerNum(m.rate)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
