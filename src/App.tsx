import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import type { NavTab } from './components/Sidebar';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Modal } from './components/common/Modal';
import { UndoRedoProvider } from './context/UndoRedoContext';

// Core Pages requested by user
import { AttendancePage } from './pages/AttendancePage';
import { MonthlyAttendancePage } from './pages/MonthlyAttendancePage';
import { StudentsPage } from './pages/StudentsPage';
import { GradesPage } from './pages/GradesPage';
import { TimetablePage } from './pages/TimetablePage';
import { OfficialLettersPage } from './pages/OfficialLettersPage';
import { SettingsPage } from './pages/SettingsPage';
import { GradeCoefficientsConfigPage } from './pages/GradeCoefficientsConfigPage';
import { TeachingPlanPage } from './pages/TeachingPlanPage';
import { DashboardPage } from './pages/DashboardPage';
import { ManageClassesModal } from './components/ManageClassesModal';
import { CrossDeviceSyncModal } from './components/CrossDeviceSyncModal';
import { StudentDailyAttendanceView } from './components/StudentDailyAttendanceView';
import type { TeacherSettings } from './types';
import { decodeRosterFromUrl } from './utils/attendanceShare';
import { initAutoSyncEngine, notifyLocalDataChanged } from './services/autoSyncService';

export function App() {
  // Check if link was shared for student daily attendance
  const [isStudentMode, setIsStudentMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'student' || params.get('student') === '1';
    }
    return false;
  });

  const studentModeParams = useMemo(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return {
        classId: params.get('class') || undefined,
        date: params.get('date') || undefined,
        session: (params.get('session') as 'morning' | 'afternoon') || undefined,
        timeSlot: params.get('time') || params.get('timeslot') || undefined,
        readOnly: params.get('view') === 'readonly' || params.get('readonly') === 'true' || true,
        payload: params.get('att') || params.get('data') || undefined,
        pinToken: params.get('pinToken') || params.get('token') || undefined,
      };
    }
    return {};
  }, []);

  // Starts directly on Attendance for rapid usage by teacher & class monitor (or from URL share link)
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as NavTab;
      if (tab) return tab;
    }
    return 'attendance';
  });

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cls = params.get('class');
      if (cls) return cls;
    }
    return 'ALL';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedStudentForLetter, setSelectedStudentForLetter] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals for settings, class management, and cross-device sync
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManageClassesOpen, setIsManageClassesOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

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

    // 🚀 Start AutoSyncEngine (Automatic background sync PC ⇄ Mobile phone)
    const cleanupAutoSync = initAutoSyncEngine(() => {
      handleRefresh();
    });

    const onDataSynced = () => {
      handleRefresh();
    };
    window.addEventListener('app-data-synced', onDataSynced);

    // Auto-detect & import sync_code from legacy link if present
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const syncCode = p.get('sync_code') || p.get('sync');
      if (syncCode) {
        const cleanCode = syncCode.replace(/\D/g, '');
        if (cleanCode.length === 6) {
          fetch(`https://ntfy.sh/kh-sync-hunratha-${cleanCode}/raw`)
            .then(async (res) => {
              if (res.ok) {
                const raw = await res.text();
                if (raw && raw.trim().startsWith('{')) {
                  await db.importBackupJSON(raw);
                  window.history.replaceState({}, '', window.location.pathname);
                  alert('✅ សមកាលកម្មជោគជ័យ! ទិន្នន័យពីកុំព្យូទ័រត្រូវបានផ្ទុកចូលទូរស័ព្ទដៃរួចរាល់ ១០០%។');
                  window.location.reload();
                }
              }
            })
            .catch(console.error);
        }
      }

      // Auto-detect & import student roster from URL query on any device/browser
      const encodedRoster = p.get('roster') || p.get('students') || p.get('importStudents');
      const classId = p.get('class') || p.get('importClass');
      const className = p.get('className');
      if (encodedRoster && classId) {
        const decoded = decodeRosterFromUrl(encodedRoster, classId);
        if (decoded.length > 0) {
          db.students.bulkPut(decoded).then(() => {
            if (className) {
              db.classes.put({
                id: classId,
                name: className,
                grade: className.replace(/\D/g, '') || '7',
                academicYear: '២០២៤-២០២៥',
                homeroomTeacher: '',
                createdAt: new Date().toISOString(),
              }).catch(console.error);
            }
            handleRefresh();
          }).catch(console.error);
        }
      }
    }

    return () => {
      cleanupAutoSync();
      window.removeEventListener('app-data-synced', onDataSynced);
    };
  }, []);

  useEffect(() => {
    db.getSettings().then(setSettings).catch(console.error);
  }, [refreshKey]);

  // Ensure that if classes or students are empty on mobile, auto-load standard 200 students immediately
  useEffect(() => {
    if (classes.length === 0 || students.length === 0) {
      const timer = setTimeout(() => {
        db.classes.count().then(async (cCount) => {
          if (cCount === 0) {
            console.log('Detected 0 classes on mobile/device - auto-loading 200 students and classes...');
            await db.loadSample200Students();
            handleRefresh();
          }
        }).catch(console.error);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [classes.length, students.length]);

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

  if (isStudentMode) {
    return (
      <StudentDailyAttendanceView
        classes={classes}
        students={students}
        attendanceRecords={attendanceRecords}
        timetableSlots={timetableSlots}
        settings={settings}
        initialClassId={studentModeParams.classId || (selectedClassId !== 'ALL' ? selectedClassId : undefined)}
        initialDate={studentModeParams.date}
        initialSession={studentModeParams.session}
        initialTimeSlot={studentModeParams.timeSlot}
        initialReadOnly={studentModeParams.readOnly}
        initialAttendancePayload={studentModeParams.payload}
        initialPinToken={studentModeParams.pinToken}
        onExitStudentMode={() => {
          setIsStudentMode(false);
          if (typeof window !== 'undefined' && window.history) {
            const url = new URL(window.location.href);
            url.searchParams.delete('mode');
            url.searchParams.delete('student');
            window.history.replaceState({}, '', url.toString());
          }
        }}
        onRefresh={handleRefresh}
      />
    );
  }

  return (
    <UndoRedoProvider onRefresh={handleRefresh}>
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
        onRefreshSettings={handleRefresh}
        settings={settings}
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
          onOpenSync={() => setIsSyncModalOpen(true)}
          hideClassSelector={currentTab === 'teaching-plan'}
        />

        {/* Content Body - Full Width Screen Layout */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 2xl:px-8 w-full pb-20 lg:pb-8">

          {currentTab === 'dashboard' && (
            <DashboardPage
              students={students}
              classes={classes}
              attendanceRecords={attendanceRecords}
              settings={settings}
              selectedClassId={selectedClassId}
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
              timetableSlots={timetableSlots}
              settings={settings}
              selectedClassId={selectedClassId}
              onSelectClass={setSelectedClassId}
              onRefresh={handleRefresh}
              onGenerateLetterForStudent={handleSelectStudentForLetter}
              onOpenManageClasses={() => setIsManageClassesOpen(true)}
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
              onSelectClass={setSelectedClassId}
              onRefresh={handleRefresh}
              onNavigateTab={setCurrentTab}
              onOpenManageClasses={() => setIsManageClassesOpen(true)}
            />
          )}

          {currentTab === 'grades' && (
            <GradesPage
              students={students}
              classes={classes}
              attendanceRecords={attendanceRecords}
              settings={settings}
              selectedClassId={selectedClassId}
              onSelectClass={setSelectedClassId}
              onRefresh={handleRefresh}
              onOpenGradeConfig={() => setCurrentTab('grade-config')}
              initialViewMode="monthly-subject"
            />
          )}

          {currentTab === 'continuous-assessment' && (
            <GradesPage
              students={students}
              classes={classes}
              attendanceRecords={attendanceRecords}
              settings={settings}
              selectedClassId={selectedClassId}
              onSelectClass={setSelectedClassId}
              onRefresh={handleRefresh}
              onOpenGradeConfig={() => setCurrentTab('grade-config')}
              initialViewMode="continuous"
            />
          )}

          {currentTab === 'grade-config' && (
            <GradeCoefficientsConfigPage
              settings={settings}
              onRefresh={handleRefresh}
            />
          )}

          {currentTab === 'teaching-plan' && (
            <TeachingPlanPage
              classes={classes}
              students={students}
              settings={settings}
              selectedClassId={selectedClassId}
              onSelectClass={setSelectedClassId}
              onRefresh={handleRefresh}
            />
          )}

          {((currentTab as string) === 'timetable-teacher' || (currentTab as string) === 'timetable-class') && (
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

      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="ការកំណត់"
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

      {/* Cross-Device PC ⇄ Mobile Sync Modal */}
      <CrossDeviceSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSuccess={handleRefresh}
      />
    </div>
    </UndoRedoProvider>
  );
}

export default App;
