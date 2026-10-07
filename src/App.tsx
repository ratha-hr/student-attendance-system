import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import type { NavTab } from './components/Sidebar';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { ClassesPage } from './pages/ClassesPage';
import { StudentsPage } from './pages/StudentsPage';
import { AttendancePage } from './pages/AttendancePage';
import { LessonExtractsPage } from './pages/LessonExtractsPage';
import { OfficialLettersPage } from './pages/OfficialLettersPage';
import { AnnualPlanPage } from './pages/AnnualPlanPage';
import { GradesPage } from './pages/GradesPage';
import { TimetablePage } from './pages/TimetablePage';
import { SettingsPage } from './pages/SettingsPage';
import type { TeacherSettings } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedStudentForLetter, setSelectedStudentForLetter] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

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
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          classes={classes}
          selectedClassId={selectedClassId}
          onSelectClass={setSelectedClassId}
          settings={settings}
          onNavigate={setCurrentTab}
        />

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              classes={classes}
              students={students}
              attendanceRecords={attendanceRecords}
              settings={settings}
              selectedClassId={selectedClassId}
              onNavigate={setCurrentTab}
              onSelectStudentForLetter={handleSelectStudentForLetter}
            />
          )}

          {currentTab === 'classes' && (
            <ClassesPage
              classes={classes}
              students={students}
              selectedClassId={selectedClassId}
              onSelectClass={setSelectedClassId}
              onNavigate={setCurrentTab}
              onRefresh={handleRefresh}
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

          {currentTab === 'extracts' && (
            <LessonExtractsPage
              extracts={extracts}
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

          {currentTab === 'annual-plan' && (
            <AnnualPlanPage
              yearlyPlans={yearlyPlans}
              settings={settings}
              onRefresh={handleRefresh}
            />
          )}

          {currentTab === 'grades' && (
            <GradesPage
              students={students}
              classes={classes}
              settings={settings}
              selectedClassId={selectedClassId}
              onRefresh={handleRefresh}
            />
          )}

          {currentTab === 'timetable' && (
            <TimetablePage
              classes={classes}
              settings={settings}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsPage
              settings={settings}
              onRefresh={handleRefresh}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
