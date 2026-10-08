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
} from 'lucide-react';
import type { TeacherSettings } from '../types';
import { db } from '../db/db';
import { toKhmerNum } from '../utils/dateUtils';

interface SettingsPageProps {
  settings: TeacherSettings | null;
  onRefresh: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onRefresh }) => {
  const [teacherName, setTeacherName] = useState(settings?.teacherName || 'ស៊ឹម វីរៈ');
  const [specialtySubject, setSpecialtySubject] = useState(settings?.specialtySubject || 'ភាសាខ្មែរ និងអក្សរសិល្ប៍');
  const [phone, setPhone] = useState(settings?.phone || '012 889 900');
  const [email, setEmail] = useState(settings?.email || 'sim.virak@moeys.edu.kh');
  const [schoolName, setSchoolName] = useState(settings?.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន មិត្តភាព');
  const [principalName, setPrincipalName] = useState(settings?.principalName || 'ហេង ពិសាល');
  const [provinceCity, setProvinceCity] = useState(settings?.provinceCity || 'រាជធានីភ្នំពេញ');
  const [academicYear, setAcademicYear] = useState(settings?.academicYear || '២០២៤-២០២៥');
  const [absenceWarningThreshold, setAbsenceWarningThreshold] = useState(settings?.absenceWarningThreshold || 3);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleLoad200Students = async () => {
    if (window.confirm('តើអ្នកចង់ផ្ទុកទិន្នន័យសិស្សគំរូចំនួន ២០០ នាក់ (ថ្នាក់ទី ៧ ដល់ ទី ១២) មែនទេ?')) {
      await db.loadSample200Students();
      alert('បានផ្ទុកទិន្នន័យសិស្ស ២០០ នាក់ (ថ្នាក់ទី ៧ ដល់ ទី ១២) ដោយជោគជ័យ!');
      onRefresh();
    }
  };

  const handleResetSampleData = async () => {
    if (window.confirm('តើអ្នកពិតជាចង់កំណត់ទិន្នន័យឡើងវិញទៅកាន់ទិន្នន័យគំរូដើមមែនទេ? ទិន្នន័យថ្មីដែលបានបញ្ចូលនឹងត្រូវបានលុប។')) {
      await db.resetToSeedData();
      alert('បានកំណត់ទិន្នន័យឡើងវិញដោយជោគជ័យ!');
      onRefresh();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center">
            <Settings className="w-6 h-6 text-blue-600 mr-2" />
            ការកំណត់ & Backup ទិន្នន័យ
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            គ្រប់គ្រងព័ត៌មានគ្រូបង្រៀន សាលារៀន និងការរក្សាទុកទិន្នន័យ
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl animate-fade-in">
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
            បានរក្សាទុកជោគជ័យ!
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
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

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 mr-2" />
            រក្សាទុកការកំណត់
          </button>
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

          {/* Reset Demo Data Button */}
          <button
            onClick={handleResetSampleData}
            className="flex items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 mr-2 text-slate-500" />
            កំណត់ទិន្នន័យឡើងវិញ
          </button>

          {/* Load 200 Students Button */}
          <button
            type="button"
            onClick={handleLoad200Students}
            className="col-span-1 sm:col-span-3 flex items-center justify-center p-3.5 rounded-xl border border-blue-500 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-md shadow-blue-500/20"
          >
            <RefreshCw className="w-4 h-4 mr-2 animate-spin-slow" />
            🚀 ផ្ទុកទិន្នន័យសិស្សគំរូ ២០០ នាក់ (ថ្នាក់ទី ៧ ដល់ ទី ១២)
          </button>
        </div>
      </div>
    </div>
  );
};
