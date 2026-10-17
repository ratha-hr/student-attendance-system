import React, { useState, useRef } from 'react';
import {
  Settings,
  Save,
  Download,
  Upload,
  RefreshCw,
  School,
  User,
  ShieldAlert,
  Database,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Key,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import type { TeacherSettings } from '../types';
import { db } from '../db/db';
import { toKhmerNum, formatKhmerDate } from '../utils/dateUtils';
import { getPinForDate, getDateBasedPin, getDailySecurityPin, type PinMode } from '../utils/pinUtils';
import { useUndoRedo } from '../context/UndoRedoContext';

interface SettingsPageProps {
  settings: TeacherSettings | null;
  onRefresh: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onRefresh }) => {
  const { pushSnapshot } = useUndoRedo();
  const [teacherName, setTeacherName] = useState(settings?.teacherName || 'ហ៊ុន រដ្ឋា');
  const [specialtySubject, setSpecialtySubject] = useState(settings?.specialtySubject || 'គណិតវិទ្យា');
  const [phone, setPhone] = useState(settings?.phone || '093 486 987 / 089 230 998 / 071 741 1141');
  const [email, setEmail] = useState(settings?.email || 'hun.ratha@moeys.edu.kh');
  const [schoolName, setSchoolName] = useState(settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច');
  const [principalName, setPrincipalName] = useState(settings?.principalName || 'នាយកសាលា');
  const [provinceCity, setProvinceCity] = useState(settings?.provinceCity || 'ខេត្តកំពង់ឆ្នាំង');
  const [academicYear, setAcademicYear] = useState(settings?.academicYear || '២០២៤-២០២៥');
  const [absenceWarningThreshold, setAbsenceWarningThreshold] = useState(settings?.absenceWarningThreshold || 3);
  const [studentAttendancePin, setStudentAttendancePin] = useState(settings?.studentAttendancePin || '1234');
  const [pinMode, setPinMode] = useState<PinMode>(settings?.pinMode || 'daily');

  const todayStr = React.useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const currentEffectivePin = React.useMemo(() => {
    return getPinForDate(todayStr, {
      ...settings,
      pinMode,
      studentAttendancePin,
    } as TeacherSettings);
  }, [todayStr, settings, pinMode, studentAttendancePin]);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await pushSnapshot('កែប្រែការកំណត់ប្រព័ន្ធ');
    await db.updateSettings({
      teacherName: teacherName.trim(),
      specialtySubject: specialtySubject.trim(),
      phone: phone.trim(),
      email: email.trim(),
      schoolName: schoolName.trim(),
      principalName: principalName.trim(),
      provinceCity: provinceCity.trim(),
      academicYear: academicYear.trim(),
      absenceWarningThreshold: Number(absenceWarningThreshold),
      studentAttendancePin: studentAttendancePin.trim() || '1234',
      pinMode,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    onRefresh();
  };

  const handleBackupDownload = async () => {
    try {
      const jsonStr = await db.exportBackupJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ទិន្នន័យបម្រុងទុក_ប្រព័ន្ធគ្រប់គ្រងសិស្ស_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('មានបញ្ហាក្នុងការទាញយក Backup!');
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('ការស្តារទិន្នន័យឡើងវិញនឹងជំនួសទិន្នន័យបច្ចុប្បន្នទាំងអស់។ តើអ្នកប្រាកដទេ?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      await pushSnapshot('ស្តារទិន្នន័យពី Backup JSON');
      const text = await file.text();
      await db.importBackupJSON(text);
      alert('បានស្តារទិន្នន័យដោយជោគជ័យ!');
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('ឯកសារបម្រុងទុកមិនត្រឹមត្រូវ!');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm('តើលោកគ្រូពិតជាចង់សម្អាតទិន្នន័យទាំងអស់ (សិស្ស ថ្នាក់ វត្តមាន ពិន្ទុ) ដើម្បីចាប់ផ្តើមបញ្ចូលទិន្នន័យជាក់ស្តែងដោយខ្លួនឯងមែនទេ?')) {
      await pushSnapshot('សម្អាតទិន្នន័យទាំងអស់ដើម្បីបញ្ចូលខ្លួនឯង');
      await db.clearAllData();
      alert('បានសម្អាតទិន្នន័យទាំងអស់ដោយជោគជ័យ! លោកគ្រូអាចចាប់ផ្តើមបង្កើតថ្នាក់ និងបញ្ចូលទិន្នន័យសិស្សជាក់ស្តែងដោយខ្លួនឯង។');
      onRefresh();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Header with Save Button right on top */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-xs">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 flex items-center">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mr-2 shrink-0" />
              <span>ការកំណត់ & Backup ទិន្នន័យ</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              គ្រប់គ្រងព័ត៌មានគ្រូបង្រៀន សាលារៀន និងការរក្សាទុកទិន្នន័យ
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {savedSuccess && (
              <div className="flex items-center px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl animate-fade-in">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                <span>បានរក្សាទុកជោគជ័យ!</span>
              </div>
            )}
            <button
              type="submit"
              className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 mr-2" />
              <span>រក្សាទុកការកំណត់</span>
            </button>
          </div>
        </div>

        {/* Card 1: Teacher Profile */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-800 flex items-center border-b border-slate-100 pb-3">
            <User className="w-5 h-5 text-blue-600 mr-2" />
            ព័ត៌មានលោកគ្រូ-អ្នកគ្រូ
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ឈ្មោះលោកគ្រូ / អ្នកគ្រូ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                មុខវិជ្ជាឯកទេស
              </label>
              <input
                type="text"
                value={specialtySubject}
                onChange={(e) => setSpecialtySubject(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                លេខទូរស័ព្ទ
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                អ៊ីមែល
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Card 2: School & Administrative Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-800 flex items-center border-b border-slate-100 pb-3">
            <School className="w-5 h-5 text-blue-600 mr-2" />
            ព័ត៌មានគ្រឹះស្ថានសិក្សា & រដ្ឋបាល
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ឈ្មោះសាលារៀន <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ឈ្មោះនាយកសាលា (សម្រាប់ចុះហត្ថលេខាលើលិខិតផ្លូវការ)
              </label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                រាជធានី / ខេត្ត
              </label>
              <input
                type="text"
                value={provinceCity}
                onChange={(e) => setProvinceCity(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ឆ្នាំសិក្សា
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Absence Warning Threshold */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-800 flex items-center border-b border-slate-100 pb-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 mr-2" />
            ការកំណត់កម្រិតព្រមានអវត្តមាន (Warning Threshold)
          </h3>

          <div className="max-w-md">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ចំនួនដងអវត្តមានឥតច្បាប់ដែលត្រូវប្រកាសអាសន្ន និងចេញលិខិតព្រមាន៖
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                min="1"
                max="30"
                value={absenceWarningThreshold}
                onChange={(e) => setAbsenceWarningThreshold(Number(e.target.value))}
                className="w-28 px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-extrabold text-rose-600"
              />
              <span className="text-xs text-slate-500 font-medium">
                ដង (នៅពេលសិស្សអវត្តមានដល់ចំនួននេះ ប្រព័ន្ធនឹងជូនដំណឹងឱ្យចេញលិខិត)
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Security & Daily Dynamic PIN Code for Student Attendance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-800 flex items-center">
              <Lock className="w-5 h-5 text-indigo-600 mr-2 shrink-0" />
              <span>សុវត្ថិភាពទប់ស្កាត់ការលួចកែវត្តមាន (លេខសម្ងាត់ PIN)</span>
            </h3>
            <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold w-fit">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" />
              {pinMode === 'daily'
                ? '✨ ប្តូររាល់ថ្ងៃស្វ័យប្រវត្តិ (Daily PIN)'
                : pinMode === 'date_format'
                ? '📅 តាមថ្ងៃខែ (DDMM)'
                : '🔒 លេខកូដថេរ (Fixed PIN)'}
            </span>
          </div>

          {/* Location Note: PIN display is moved directly to Share Modal */}
          <div className="bg-indigo-50/60 border border-indigo-200/70 rounded-2xl p-3.5 text-xs text-indigo-900 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <Key className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="font-normal text-slate-700">
                លេខកូដសម្ងាត់ដោះសោថ្ងៃនេះ ត្រូវបានផ្លាស់ប្តូរទីតាំងទៅបង្ហាញដោយផ្ទាល់នៅក្នុង <strong>«ផ្ទាំងចែករំលែកទៅសិស្ស (ស្រង់វត្តមាន)»</strong> ដើម្បីងាយស្រួលចម្លងផ្ញើទៅប្រធានថ្នាក់។
              </span>
            </div>
            <span className="text-[11px] font-mono font-normal text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200 shrink-0">
              កូដថ្ងៃនេះ៖ {currentEffectivePin}
            </span>
          </div>

          {/* PIN Mode Selection Cards */}
          <div className="space-y-2.5 pt-1">
            <label className="block text-xs font-bold text-slate-700">
              ជ្រើសរើសរបៀបកំណត់លេខកូដសម្ងាត់ (PIN Mode)៖
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {/* Option 1: Daily Dynamic (Recommended) */}
              <label
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  pinMode === 'daily'
                    ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="pinMode"
                    value="daily"
                    checked={pinMode === 'daily'}
                    onChange={() => setPinMode('daily')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="font-bold text-xs sm:text-sm text-slate-900">
                    🌟 ប្តូររាល់ថ្ងៃស្វ័យប្រវត្តិ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  កូដ ៤ ខ្ទង់សុវត្ថិភាពប្តូរថ្មីរៀងរាល់ថ្ងៃតាមកាលបរិច្ឆេទ (ថ្ងៃនេះ៖ <strong className="font-mono text-indigo-700 font-bold">{getDailySecurityPin(todayStr, studentAttendancePin)}</strong>)
                </p>
              </label>

              {/* Option 2: Date-based DDMM */}
              <label
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  pinMode === 'date_format'
                    ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="pinMode"
                    value="date_format"
                    checked={pinMode === 'date_format'}
                    onChange={() => setPinMode('date_format')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="font-bold text-xs sm:text-sm text-slate-900">
                    📅 តាមថ្ងៃ និងខែ (DDMM)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  យកថ្ងៃ និងខែធ្វើជាកូដ ងាយស្រួលចាំ (ឧ. ថ្ងៃទី១៧ ខែ១០ ➔ <strong className="font-mono text-indigo-700 font-bold">{getDateBasedPin(todayStr, 'DDMM')}</strong>)
                </p>
              </label>

              {/* Option 3: Fixed Custom */}
              <label
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  pinMode === 'fixed'
                    ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="pinMode"
                    value="fixed"
                    checked={pinMode === 'fixed'}
                    onChange={() => setPinMode('fixed')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="font-bold text-xs sm:text-sm text-slate-900">
                    🔒 លេខកូដថេរផ្ទាល់ខ្លួន
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  ប្រើលេខកូដថេរដដែលរាល់ថ្ងៃ ដែលលោកគ្រូវាយកំណត់ដោយខ្លួនឯង
                </p>
              </label>
            </div>
          </div>

          {/* Master Key / Custom PIN Input field (if fixed mode, or seed) */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {pinMode === 'fixed'
                ? 'វាយបញ្ចូលលេខកូដសម្ងាត់ថេរ (Fixed PIN ៤ ដល់ ៦ ខ្ទង់)៖'
                : 'ពាក្យសម្ងាត់គ្រឹះសម្រាប់បំប្លែងកូដប្រចាំថ្ងៃ (Master Key / Seed)៖'}
            </label>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={10}
                  value={studentAttendancePin}
                  onChange={(e) => setStudentAttendancePin(e.target.value)}
                  placeholder="1234"
                  className="w-40 pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono font-black text-indigo-700 tracking-widest text-center"
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {pinMode === 'fixed' ? '(លេខកូដថេរសម្រាប់ដោះសោ)' : '(ប្រើសម្រាប់បង្កើតកូដប្រចាំថ្ងៃ)'}
              </span>
            </div>
          </div>
        </div>
      </form>

      {/* Card 4: Backup & Restore & Reset Data */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-slate-800 flex items-center border-b border-slate-100 pb-3">
          <Database className="w-5 h-5 text-indigo-600 mr-2" />
          ការគ្រប់គ្រងទិន្នន័យ (Backup & Restore)
        </h3>
        <p className="text-xs text-slate-500">
          ទិន្នន័យទាំងអស់ត្រូវបានរក្សាទុកនៅលើកុំព្យូទ័ររបស់អ្នកដោយសុវត្ថិភាព (Local IndexedDB Offline 100%)។ អ្នកអាចទាញយកឯកសារបម្រុងទុកទុកពេលណាដែលចង់ ឬផ្ទេរទៅកុំព្យូទ័រផ្សេងទៀតបាន។
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Backup Button */}
          <button
            type="button"
            onClick={handleBackupDownload}
            className="flex items-center justify-center p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 font-bold text-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 mr-2" />
            ទាញយក Backup (.json)
          </button>

          {/* Restore Button */}
          <label className="flex items-center justify-center p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-700 font-bold text-xs transition-colors cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            ស្តារ Backup ឡើងវិញ
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleRestoreFile}
            />
          </label>

          {/* Clear All Data Button */}
          <button
            type="button"
            onClick={handleClearAllData}
            className="flex items-center justify-center p-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
            title="លុបទិន្នន័យសិស្ស ថ្នាក់ វត្តមាន ពិន្ទុ ដើម្បីចាប់ផ្តើមថ្មី"
          >
            <RefreshCw className="w-4 h-4 mr-2 text-rose-600" />
            🗑️ សម្អាតទិន្នន័យទាំងអស់ (Reset)
          </button>
        </div>

        {/* Cross-Device Sync Guide for Phone & Tablet */}
        <div className="mt-4 p-4 rounded-2xl bg-linear-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/80 text-xs text-slate-700 space-y-2">
          <p className="font-bold text-blue-900 flex items-center text-sm">
            📱 វិធីសមកាលកម្មទិន្នន័យឆ្លងឧបករណ៍ (PC ↔ ទូរស័ព្ទដៃ) ៖
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px] sm:text-xs leading-relaxed">
            <li>
              <strong>តំណភ្ជាប់ស្រង់វត្តមានប្រចាំថ្ងៃ (Share Link) ៖</strong> រាល់ពេលចុច «ចែករំលែកទៅសិស្ស (ស្រង់វត្តមាន)» ឬផ្ញើតំណទៅ Telegram ឈ្មោះសិស្សទាំងអស់ត្រូវបានបង្កប់ក្នុងតំណដោយស្វ័យប្រវត្តិ។ នៅពេលបើកលើទូរស័ព្ទដៃណាក៏ដោយ (ទូរស័ព្ទសិស្ស ឬទូរស័ព្ទគ្រូ) ឈ្មោះសិស្ស និងវត្តមាននឹងបង្ហាញឡើងភ្លាមៗ ១០០%!
            </li>
            <li>
              <strong>ផ្ទេរទិន្នន័យគ្រប់ថ្នាក់ទាំងអស់ទៅទូរស័ព្ទ ៖</strong> ចុចប៊ូតុង «ទាញយក Backup (.json)» នៅខាងលើ ផ្ញើឯកសារនោះចូល Telegram រួចបើកកម្មវិធីនេះលើទូរស័ព្ទ ហើយចុច «ស្តារ Backup ឡើងវិញ» ជាការស្រេច។
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
