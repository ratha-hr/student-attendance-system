import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import type { NavTab } from './components/Sidebar';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Modal } from './components/common/Modal';

// Core Pages requested by user
import { AttendancePage } from './pages/AttendancePage';
import { MonthlyAttendancePage } from './pages/MonthlyAttendancePage';
import { StudentsPage } from './pages/StudentsPage';
import { GradesPage } from './pages/GradesPage';
import { TimetablePage } from './pages/TimetablePage';
import { OfficialLettersPage } from './pages/OfficialLettersPage';
import { SettingsPage } from './pages/SettingsPage';
import { GradeCoefficientsConfigPage } from './pages/GradeCoefficientsConfigPage';
import { DashboardPage } from './pages/DashboardPage';
import { ManageClassesModal } from './components/ManageClassesModal';
import type { TeacherSettings } from './types';

export function App() {
  // Starts directly on Attendance for rapid usage by teacher & class monitor
  const [currentTab, setCurrentTab] = useState<NavTab>('attendance');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedStudentForLetter, setSelectedStudentForLetter] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals for settings and class management
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManageClassesOpen, setIsManageClassesOpen] = useState(false);

  // Live data from IndexedDB
  const classes = useLiveQuery(() => db.classes.toArray(), [refreshKey]) || [];
  const students = useLiveQuery(() => db.students.toArray(), [refreshKey]) || [];
  const attendanceRecords = useLiveQuery(() => db.attendance.toArray(), [refreshKey]) || [];
  const timetableSlots = useLiveQuery(() => db.timetable.toArray(), [refreshKey]) || [];
  const [settings, setSettings] = useState<TeacherSettings | null>(null);

  useEffect(() => {
    db.initializeSeedData()
      .then(() => {
        handleRefresh();
      })
      .catch(console.error);
      db.getSettings().then(setSettings).catch(console.error);
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
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
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen w-full">
        {/* Top Navbar (Class selector & teacher profile) */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          classes={classes}
          selectedClassId={selectedClassId}
          onSelectClass={setSelectedClassId}
          settings={settings}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenManageClasses={() => setIsManageClassesOpen(true)}
        />

        {/* Content Body - Full Width Screen Layout */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 2xl:px-8 w-full pb-20 lg:pb-8">
          {/* Quick Load 200 Students Banner if database has fewer than 50 students */}
          {students.length < 50 && (
            <div className="mb-4 bg-linear-to-r from-blue-600 to-indigo-600 text-white p-3.5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in no-print">
              <div className="flex items-center space-x-2.5">
                <span className="text-xl">🚀</span>
                <div>
                  <p className="font-bold text-xs sm:text-sm">
                    ទិន្នន័យសាកល្បងសិស្ស ២០០ នាក់ (ថ្នាក់ទី ៧ ដល់ ទី ១២) បានត្រៀមរួចជាស្រេច!
                  </p>
                  <p className="text-[11px] text-blue-100">
                    ចុចប៊ូតុងនេះដើម្បីផ្ទុកទិន្នន័យសាកល្បង ២០០នាក់ និង ៦ថ្នាក់ភ្លាមៗ
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  await db.loadSample200Students();
                  handleRefresh();
                }}
                className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer self-end sm:self-auto"
              >
                ផ្ទុក ២០០ នាក់ភ្លាម
              </button>
            </div>
          )}

          {currentTab === 'dashboard' && (
            <DashboardPage
              students={students}
              classes={classes}
              attendanceRecords={attendanceRecords}
              settings={settings}
              onNavigateTab={setCurrentTab}
              onSelectClass={setSelectedClassId}
              onSelectStudentForLetter={handleSelectStudentForLetter}
            />
          )}

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

          {currentTab === 'monthly-attendance' && (
            <MonthlyAttendancePage
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
              onRefresh={handleRefresh}
            />
          )}

          {currentTab === 'grades' && (
            <GradesPage
              students={students}
              classes={classes}
              settings={settings}
              selectedClassId={selectedClassId}
              onSelectClass={setSelectedClassId}
              onRefresh={handleRefresh}
              onOpenGradeConfig={() => setCurrentTab('grade-config')}
            />
          )}

          {currentTab === 'grade-config' && (
            <GradeCoefficientsConfigPage
              settings={settings}
              onRefresh={handleRefresh}
            />
          )}

          {currentTab === 'timetable-class' && (
            <TimetablePage
              classes={classes}
              timetableSlots={timetableSlots}
              settings={settings}
              selectedClassId={selectedClassId}
              onRefresh={handleRefresh}
              defaultMode="class"
            />
          )}

          {currentTab === 'timetable-teacher' && (
            <TimetablePage
              classes={classes}
              timetableSlots={timetableSlots}
              settings={settings}
              selectedClassId={selectedClassId}
              onRefresh={handleRefresh}
              defaultMode="teacher"
            />
          )}

          {currentTab === 'letters' && (
            <OfficialLettersPage
              students={students}
              classes={classes}
              attendanceRecords={attendanceRecords}
              settings={settings}
              selectedStudentId={selectedStudentForLetter}
              selectedClassId={selectedClassId}
              onSelectClass={setSelectedClassId}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenMenu={() => setIsSidebarOpen(true)}
        />
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

      {/* Comprehensive Manage Classes Modal (Add, Reduce, Edit & Standard Reset) */}
      <ManageClassesModal
        isOpen={isManageClassesOpen}
        onClose={() => setIsManageClassesOpen(false)}
        classes={classes}
        students={students}
        onRefresh={handleRefresh}
        selectedClassId={selectedClassId}
        onSelectClass={setSelectedClassId}
        academicYear={settings?.academicYear || '២០២៤-២០២៥'}
      />
    </div>
  );
}

export default App;
