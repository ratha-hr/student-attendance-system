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
  Lock,
  Key,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileBadge,
  GraduationCap,
  Smartphone,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import type { TeacherSettings } from '../types';
import { db } from '../db/db';
import { toKhmerNum } from '../utils/dateUtils';
import { getPinForDate, getDateBasedPin, getDailySecurityPin, type PinMode } from '../utils/pinUtils';
import { useUndoRedo } from '../context/UndoRedoContext';

interface SettingsPageProps {
  settings: TeacherSettings | null;
  onRefresh: () => void;
}

type SettingsTab = 'teacher' | 'school' | 'security' | 'backup';

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onRefresh }) => {
  const { pushSnapshot } = useUndoRedo();

  // Active Category Tab
  const [activeTab, setActiveTab] = useState<SettingsTab>('teacher');

  // Form States (With user's preferred defaults from screenshot)
  const [teacherName, setTeacherName] = useState(settings?.teacherName || 'ហ៊ុន រដ្ឋា');
  const [specialtySubject, setSpecialtySubject] = useState(settings?.specialtySubject || 'គណិតវិទ្យា');
  const [phone, setPhone] = useState(settings?.phone || '093 486 987 / 089 230 998 / 071 741 1141');
  const [email, setEmail] = useState(settings?.email || 'hun.ratha@moeys.edu.kh');
  const [schoolName, setSchoolName] = useState(settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច');
  const [principalName, setPrincipalName] = useState(settings?.principalName || 'ទី ម៉ៅ');
  const [provinceCity, setProvinceCity] = useState(settings?.provinceCity || 'ខេត្តកំពង់ឆ្នាំង');
  const [academicYear, setAcademicYear] = useState(settings?.academicYear || '២០២៦-២០២៧');
  const [absenceWarningThreshold, setAbsenceWarningThreshold] = useState(settings?.absenceWarningThreshold || 3);
  const [studentAttendancePin, setStudentAttendancePin] = useState(settings?.studentAttendancePin || '1234');
  const [pinMode, setPinMode] = useState<PinMode>(settings?.pinMode || 'daily');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const tabs = [
    { id: 'teacher' as SettingsTab, label: 'ព័ត៌មានគ្រូបង្រៀន', icon: User, badge: 'គ្រូ' },
    { id: 'school' as SettingsTab, label: 'សាលារៀន & រដ្ឋបាល', icon: School, badge: 'សាលា' },
    { id: 'security' as SettingsTab, label: 'សុវត្ថិភាព & កូដ PIN', icon: Lock, badge: 'កូដ' },
    { id: 'backup' as SettingsTab, label: 'ទិន្នន័យ & បម្រុងទុក', icon: Database, badge: 'Backup' },
  ];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Modern Sticky Header Toolbar */}
      <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Settings className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-black text-slate-800 leading-tight">
                ការកំណត់
              </h2>
              <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                ប្រព័ន្ធគ្រប់គ្រង
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              កែសម្រួលព័ត៌មានគ្រូបង្រៀន សាលារៀន សុវត្ថិភាព និងការបម្រុងទុក
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-end sm:self-auto">
          {savedSuccess && (
            <div className="flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 animate-in fade-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
              <span>បានរក្សាទុក!</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSaveSettings}
            className="inline-flex items-center px-5 py-2.5 bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer border border-blue-400/30"
          >
            <Save className="w-4 h-4 mr-2 text-amber-300" />
            <span>រក្សាទុកការកំណត់</span>
          </button>
        </div>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[130px] sm:min-w-0 inline-flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-blue-700 shadow-sm font-black border border-slate-200/80 ring-2 ring-blue-500/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Settings Form Panels */}
      <form onSubmit={handleSaveSettings} className="space-y-5">
        {/* TAB 1: 👤 ព័ត៌មានលោកគ្រូ-អ្នកគ្រូ */}
        {activeTab === 'teacher' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Visual Profile Hero Card */}
            <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 p-5 rounded-2xl text-white shadow-md flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 text-white flex items-center justify-center font-black text-3xl shadow-inner shrink-0 overflow-hidden">
                {settings?.teacherAvatar ? (
                  settings.teacherAvatar.startsWith('data:image') || settings.teacherAvatar.startsWith('http') ? (
                    <img src={settings.teacherAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{settings.teacherAvatar}</span>
                  )
                ) : (
                  <span>👨‍🏫</span>
                )}
              </div>
              <div className="overflow-hidden min-w-0">
                <h3 className="text-base sm:text-lg font-black truncate">{teacherName || 'ហ៊ុន រដ្ឋា'}</h3>
                <p className="text-xs text-blue-100 font-medium truncate">
                  គ្រូបង្រៀនមុខវិជ្ជា {specialtySubject || 'គណិតវិទ្យា'} • {schoolName || 'វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច'}
                </p>
                <div className="flex items-center space-x-3 text-[11px] text-blue-200 mt-1 font-mono">
                  <span>📞 {phone ? phone.split('/')[0] : '093 486 987'}</span>
                  <span>✉️ {email || 'hun.ratha@moeys.edu.kh'}</span>
                </div>
              </div>
            </div>

            {/* Input Grid Card */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center border-b border-slate-100 pb-3">
                <User className="w-4 h-4 text-blue-600 mr-2" />
                កែប្រែព័ត៌មានផ្ទាល់ខ្លួនគ្រូបង្រៀន
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ឈ្មោះលោកគ្រូ / អ្នកគ្រូ <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="ហ៊ុន រដ្ឋា"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm font-bold bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    មុខវិជ្ជាឯកទេស
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={specialtySubject}
                      onChange={(e) => setSpecialtySubject(e.target.value)}
                      placeholder="គណិតវិទ្យា"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm font-bold bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    លេខទូរស័ព្ទទំនាក់ទំនង
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="093 486 987 / 089 230 998"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm font-mono font-bold bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    អ៊ីមែលផ្លូវការ (MoEYS)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hun.ratha@moeys.edu.kh"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm font-mono font-bold bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 🏫 ព័ត៌មានគ្រឹះស្ថានសិក្សា & រដ្ឋបាល */}
        {activeTab === 'school' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center border-b border-slate-100 pb-3">
                <School className="w-4 h-4 text-blue-600 mr-2" />
                ព័ត៌មានគ្រឹះស្ថានសិក្សា & រដ្ឋបាល
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ឈ្មោះសាលារៀន <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <School className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm font-bold bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ឈ្មោះនាយកសាលា (សម្រាប់ចុះហត្ថលេខាលើលិខិត)
                  </label>
                  <div className="relative">
                    <FileBadge className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={principalName}
                      onChange={(e) => setPrincipalName(e.target.value)}
                      placeholder="ទី ម៉ៅ"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm font-bold bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    រាជធានី / ខេត្ត
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={provinceCity}
                      onChange={(e) => setProvinceCity(e.target.value)}
                      placeholder="ខេត្តកំពង់ឆ្នាំង"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm font-bold bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ឆ្នាំសិក្សា
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="២០២៦-២០២៧"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm font-bold bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Warning Threshold Card */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
              <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center border-b border-slate-100 pb-3">
                <ShieldAlert className="w-4 h-4 text-rose-600 mr-2" />
                កម្រិតប្រកាសអាសន្នអវត្តមានឥតច្បាប់ (Warning Threshold)
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                ចំនួនដងអវត្តមានឥតច្បាប់សរុប ដែលប្រព័ន្ធនឹងផ្ញើសញ្ញាប្រកាសអាសន្ន និងជំរុញឱ្យចេញលិខិតព្រមានផ្លូវការ A4 ៖
              </p>
              <div className="flex items-center space-x-3 pt-1">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAbsenceWarningThreshold(Math.max(1, absenceWarningThreshold - 1))}
                    className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-black shadow-2xs cursor-pointer"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-sm font-black text-rose-600 font-mono">
                    {absenceWarningThreshold}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAbsenceWarningThreshold(Math.min(20, absenceWarningThreshold + 1))}
                    className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-black shadow-2xs cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs font-bold text-slate-600">
                  ដង (លំនាំដើម MoEYS ៖ ៣ ដង)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: 🔒 សុវត្ថិភាព & កូដ PIN */}
        {activeTab === 'security' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center">
                    <Lock className="w-4 h-4 text-indigo-600 mr-2" />
                    សុវត្ថិភាពទប់ស្កាត់ការលួចកែវត្តមាន (លេខសម្ងាត់ PIN)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ការពារមិនឱ្យសិស្ស ឬអ្នកដទៃលួចកែប្រែវត្តមានពេលបើកតំណ
                  </p>
                </div>
                <div className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-800 rounded-xl border border-indigo-200 text-xs font-bold font-mono">
                  🔑 កូដថ្ងៃនេះ៖ <span className="font-black ml-1 text-indigo-900">{currentEffectivePin}</span>
                </div>
              </div>

              {/* Mode Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {/* Daily Dynamic */}
                <label
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    pinMode === 'daily'
                      ? 'bg-indigo-50/70 border-indigo-600 shadow-xs'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="radio"
                      name="pinMode"
                      value="daily"
                      checked={pinMode === 'daily'}
                      onChange={() => setPinMode('daily')}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-black text-xs sm:text-sm text-slate-900">
                      🌟 ប្តូររៀងរាល់ថ្ងៃ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    កូដ ៤ ខ្ទង់សុវត្ថិភាពប្តូរស្វ័យប្រវត្តិតាមកាលបរិច្ឆេទ (ថ្ងៃនេះ៖ <strong className="font-mono text-indigo-700">{getDailySecurityPin(todayStr, studentAttendancePin)}</strong>)
                  </p>
                </label>

                {/* Date-based DDMM */}
                <label
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    pinMode === 'date_format'
                      ? 'bg-indigo-50/70 border-indigo-600 shadow-xs'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="radio"
                      name="pinMode"
                      value="date_format"
                      checked={pinMode === 'date_format'}
                      onChange={() => setPinMode('date_format')}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-black text-xs sm:text-sm text-slate-900">
                      📅 តាមថ្ងៃ-ខែ (DDMM)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    ងាយចាំ យកថ្ងៃ និងខែបច្ចុប្បន្នធ្វើជាកូដ (ឧ. <strong className="font-mono text-indigo-700">{getDateBasedPin(todayStr, 'DDMM')}</strong>)
                  </p>
                </label>

                {/* Fixed Custom */}
                <label
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    pinMode === 'fixed'
                      ? 'bg-indigo-50/70 border-indigo-600 shadow-xs'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="radio"
                      name="pinMode"
                      value="fixed"
                      checked={pinMode === 'fixed'}
                      onChange={() => setPinMode('fixed')}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-black text-xs sm:text-sm text-slate-900">
                      🔒 លេខកូដថេរផ្ទាល់ខ្លួន
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    ប្រើលេខកូដថេរដដែលរាល់ថ្ងៃ ដែលលោកគ្រូកំណត់ដោយខ្លួនឯង
                  </p>
                </label>
              </div>

              {/* Master Key Input */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {pinMode === 'fixed'
                    ? 'វាយលេខកូដសម្ងាត់ថេរ (Fixed PIN ៤ ដល់ ៦ ខ្ទង់) ៖'
                    : 'ពាក្យសម្ងាត់គ្រឹះសម្រាប់បំប្លែងកូដប្រចាំថ្ងៃ (Master Key / Seed) ៖'}
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
                      className="w-40 pl-9 pr-3 py-2 text-sm font-mono font-black text-indigo-700 tracking-widest text-center bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {pinMode === 'fixed' ? '(លេខកូដថេរសម្រាប់ដោះសោ)' : '(ប្រើសម្រាប់បំប្លែងកូដរៀងរាល់ថ្ងៃ)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: 💾 ទិន្នន័យ & បម្រុងទុក */}
        {activeTab === 'backup' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Backup & Restore Action Cards */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center border-b border-slate-100 pb-3">
                <Database className="w-4 h-4 text-blue-600 mr-2" />
                ការគ្រប់គ្រង និងបម្រុងទុកទិន្នន័យ (Backup & Restore)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Download Backup */}
                <button
                  type="button"
                  onClick={handleBackupDownload}
                  className="flex flex-col items-start p-4 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 transition-all cursor-pointer group text-left shadow-2xs"
                >
                  <div className="flex items-center space-x-2 text-blue-700 font-black text-xs sm:text-sm">
                    <div className="p-2 bg-white rounded-xl shadow-2xs border border-blue-200 group-hover:scale-105 transition-transform">
                      <Download className="w-4 h-4 text-blue-600" />
                    </div>
                    <span>ទាញយក Backup (.json)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    រក្សាទុកទិន្នន័យសិស្ស ថ្នាក់ វត្តមាន និងពិន្ទុទាំងអស់ជាឯកសារសុវត្ថិភាពចូលកុំព្យូទ័រ
                  </p>
                </button>

                {/* Restore Backup */}
                <label className="flex flex-col items-start p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 transition-all cursor-pointer group text-left shadow-2xs">
                  <div className="flex items-center space-x-2 text-emerald-700 font-black text-xs sm:text-sm">
                    <div className="p-2 bg-white rounded-xl shadow-2xs border border-emerald-200 group-hover:scale-105 transition-transform">
                      <Upload className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span>ស្តារទិន្នន័យពី Backup (.json)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    បញ្ចូលឯកសារ .json ត្រឡប់មកវិញ ដើម្បីស្តារទិន្នន័យទាំងអស់ឡើងវិញពេញលេញ
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleRestoreFile}
                  />
                </label>
              </div>
            </div>

            {/* Cross-Device Sync Card */}
            <div className="p-5 rounded-2xl bg-linear-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/90 text-xs text-slate-700 space-y-3">
              <div className="flex items-center space-x-2 text-blue-900 font-black text-sm">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span>សមកាលកម្មឆ្លងឧបករណ៍ (PC ↔ ទូរស័ព្ទដៃ / Tablet) ៖</span>
              </div>
              <ul className="space-y-2 text-slate-600 text-[11px] sm:text-xs leading-relaxed">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 font-black">✓</span>
                  <span>
                    <strong>តំណភ្ជាប់ស្រង់វត្តមាន ៖</strong> រាល់ពេលចុច «ចែករំលែកទៅសិស្ស (ស្រង់វត្តមាន)» ឬផ្ញើតំណទៅ Telegram ឈ្មោះសិស្សទាំងអស់ត្រូវបានបង្កប់ក្នុងតំណ។ បើកលើទូរស័ព្ទណាក៏បង្ហាញឈ្មោះសិស្ស និងវត្តមានភ្លាមៗ ១០០%។
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 font-black">✓</span>
                  <span>
                    <strong>ផ្ទេរទិន្នន័យគ្រប់ថ្នាក់ទាំងអស់ទៅទូរស័ព្ទ ៖</strong> ចុច «ទាញយក Backup (.json)» ផ្ញើឯកសារនោះចូល Telegram រួចបើកលើទូរស័ព្ទហើយចុច «ស្តារទិន្នន័យពី Backup» ជាការស្រេច។
                  </span>
                </li>
              </ul>
            </div>

            {/* Danger Zone */}
            <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs sm:text-sm font-black text-rose-800 flex items-center">
                    <AlertTriangle className="w-4 h-4 text-rose-600 mr-2" />
                    តំបន់ប្រុងប្រយ័ត្ន (Danger Zone)
                  </h5>
                  <p className="text-[11px] text-rose-600/80 mt-0.5">
                    លុបទិន្នន័យសិស្ស ថ្នាក់ និងវត្តមានទាំងអស់ដើម្បីចាប់ផ្តើមបញ្ចូលជាថ្មី
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllData}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  សម្អាតទិន្នន័យ (Reset)
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
