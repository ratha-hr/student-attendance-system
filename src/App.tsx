import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import type { NavTab } from './components/Sidebar';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Modal } from './components/common/Modal';

// 5 Core Pages requested by user
import { AttendancePage } from './pages/AttendancePage';
import { StudentsPage } from './pages/StudentsPage';
import { OfficialLettersPage } from './pages/OfficialLettersPage';
import { LessonExtractsPage } from './pages/LessonExtractsPage';
import { AnnualPlanPage } from './pages/AnnualPlanPage';
import { SettingsPage } from './pages/SettingsPage';
import type { TeacherSettings, ClassRoom } from './types';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { toKhmerNum } from './utils/dateUtils';

export function App() {
  // Starts directly on Attendance for rapid usage by teacher & class monitor
  const [currentTab, setCurrentTab] = useState<NavTab>('attendance');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedStudentForLetter, setSelectedStudentForLetter] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals for settings and quick class management
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManageClassesOpen, setIsManageClassesOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  // Live data from IndexedDB
  const classes = useLiveQuery(() => db.classes.toArray(), [refreshKey]) || [];
  const students = useLiveQuery(() => db.students.toArray(), [refreshKey]) || [];
  const attendanceRecords = useLiveQuery(() => db.attendance.toArray(), [refreshKey]) || [];
  const extracts = useLiveQuery(() => db.extracts.toArray(), [refreshKey]) || [];
  const yearlyPlans = useLiveQuery(() => db.yearlyPlans.toArray(), [refreshKey]) || [];
  const [settings, setSettings] = useState<TeacherSettings | null>(null);

  useEffect(() => {
    db.getSettings().then(setSettings).catch(console.error);
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    db.getSettings().then(setSettings).catch(console.error);
  };

  const activeClass = selectedClassId === 'ALL'
    ? null
    : classes.find((c) => c.id === selectedClassId) || null;

  const handleSelectStudentForLetter = (studentId: string) => {
    setSelectedStudentForLetter(studentId);
    setCurrentTab('letters');
  };

  // Quick Add Class handler
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const newClass: ClassRoom = {
      id: 'class-' + Date.now(),
      name: newClassName.trim(),
      grade: 'ទូទៅ',
      academicYear: settings?.academicYear || '២០២៤-២០២៥',
      createdAt: new Date().toISOString(),
    };

    await db.classes.add(newClass);
    setSelectedClassId(newClass.id);
    setNewClassName('');
    setIsManageClassesOpen(false);
    handleRefresh();
  };

  // Quick Delete Class handler
  const handleDeleteClass = async (c: ClassRoom) => {
    const studentCount = students.filter((s) => s.classId === c.id).length;
    if (studentCount > 0) {
      alert(`មិនអាចលុបបានទេ ព្រោះមានសិស្សចំនួន ${toKhmerNum(studentCount)} នាក់កំពុងរៀនក្នុងថ្នាក់នេះ!`);
      return;
    }
    if (window.confirm(`តើអ្នកពិតជាចង់លុបថ្នាក់ "${c.name}" មែនទេ?`)) {
      await db.classes.delete(c.id);
      if (selectedClassId === c.id) setSelectedClassId('ALL');
      handleRefresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 5-Item Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeClass={activeClass}
        classesCount={classes.length}
        studentsCount={students.length}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-56 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          classes={classes}
          selectedClassId={selectedClassId}
          onSelectClass={setSelectedClassId}
          settings={settings}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenManageClasses={() => setIsManageClassesOpen(true)}
        />

        {/* Content Body - Clean & Direct */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-6xl w-full mx-auto">
          {currentTab === 'attendance' && (
            <AttendancePage
              students={students}
              classes={classes}
              attendanceRecords={attendanceRecords}
              settings={settings}
              selectedClassId={selectedClassId}
              onSelectClass={setSelectedClassId}
              onRefresh={handleRefresh}
              onGenerateLetterForStudent={handleSelectStudentForLetter}
            />
          )}

          {currentTab === 'students' && (
            <StudentsPage
              students={students}
              classes={classes}
              attendanceRecords={attendanceRecords}
              settings={settings}
              selectedClassId={selectedClassId}
              onSelectClass={setSelectedClassId}
              onRefresh={handleRefresh}
            />
          )}

          {currentTab === 'letters' && (
            <OfficialLettersPage
              students={students}
              classes={classes}
              attendanceRecords={attendanceRecords}
              settings={settings}
              selectedStudentId={selectedStudentForLetter}
            />
          )}

          {currentTab === 'extracts' && (
            <LessonExtractsPage
              extracts={extracts}
              onRefresh={handleRefresh}
            />
          )}

          {currentTab === 'annual-plan' && (
            <AnnualPlanPage
              yearlyPlans={yearlyPlans}
              settings={settings}
              onRefresh={handleRefresh}
            />
          )}
        </main>
      </div>

      {/* Settings Modal (Teacher info, School info, Backup/Restore JSON) */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="ការកំណត់ប្រព័ន្ធ & បម្រុងទុកទិន្នន័យ"
        maxWidth="4xl"
      >
        <SettingsPage settings={settings} onRefresh={handleRefresh} />
      </Modal>

      {/* Manage Classes Modal */}
      <Modal
        isOpen={isManageClassesOpen}
        onClose={() => setIsManageClassesOpen(false)}
        title="គ្រប់គ្រងថ្នាក់រៀន"
        maxWidth="md"
      >
        <div className="space-y-4">
          <form onSubmit={handleAddClass} className="flex gap-2">
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="បញ្ចូលឈ្មោះថ្នាក់ (ឧ. ថ្នាក់ទី ៨A)"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1" />
              បន្ថែម
            </button>
          </form>

          <div className="border-t border-slate-200 pt-3">
            <p className="text-xs font-bold text-slate-500 mb-2">បញ្ជីថ្នាក់រៀនទាំងអស់ ({toKhmerNum(classes.length)})៖</p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {classes.map((c) => {
                const count = students.filter((s) => s.classId === c.id).length;
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200"
                  >
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-sm text-slate-800">{c.name}</span>
                      <span className="text-xs text-slate-400">({toKhmerNum(count)} នាក់)</span>
                    </div>
                    {count === 0 && (
                      <button
                        onClick={() => handleDeleteClass(c)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="លុបថ្នាក់ទទេ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;
