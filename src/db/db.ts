import Dexie, { type Table } from 'dexie';
import type {
  ClassRoom,
  Student,
  AttendanceRecord,
  LessonExtract,
  OfficialLetter,
  YearlyPlanItem,
  StudentGrade,
  TimetableSlot,
  TeacherSettings,
} from '../types';
import {
  initialClasses,
  initialStudents,
  initialAttendance,
  initialExtracts,
  initialYearlyPlan,
  initialSettings,
} from './seedData';

export class TeacherDatabase extends Dexie {
  classes!: Table<ClassRoom, string>;
  students!: Table<Student, string>;
  attendance!: Table<AttendanceRecord, string>;
  extracts!: Table<LessonExtract, string>;
  letters!: Table<OfficialLetter, string>;
  yearlyPlans!: Table<YearlyPlanItem, string>;
  grades!: Table<StudentGrade, string>;
  timetable!: Table<TimetableSlot, string>;
  settings!: Table<TeacherSettings & { id: string }, string>;

  constructor() {
    super('TeacherManagementDB');
    this.version(1).stores({
      classes: 'id, name, grade, academicYear, createdAt',
      students: 'id, classId, rollNo, studentCode, nameKh, gender, status, createdAt',
      attendance: 'id, classId, studentId, date, session, status, createdAt, [classId+date]',
      extracts: 'id, title, subject, grade, category, createdAt',
      letters: 'id, type, letterNumber, classId, studentId, dateCreated',
      yearlyPlans: 'id, academicYear, term, month, week, subject, grade, status',
      grades: 'id, classId, studentId, month, academicYear',
      timetable: 'id, dayOfWeek, timeSlot, classId',
      settings: 'id',
    });
  }

  async initializeSeedData() {
    const classCount = await this.classes.count();
    const studentCount = await this.students.count();
    if (classCount === 0 || studentCount < 50) {
      console.log('Seeding initial data with 200 students across Grade 7 to 12...');
      await this.classes.clear();
      await this.students.clear();
      await this.attendance.clear();
      await this.classes.bulkAdd(initialClasses);
      await this.students.bulkAdd(initialStudents);
      await this.attendance.bulkAdd(initialAttendance);
      if ((await this.extracts.count()) === 0) {
        await this.extracts.bulkAdd(initialExtracts);
      }
      if ((await this.yearlyPlans.count()) === 0) {
        await this.yearlyPlans.bulkAdd(initialYearlyPlan);
      }
      const s = await this.settings.get('current_settings');
      if (!s) {
        await this.settings.put({ ...initialSettings, id: 'current_settings' });
      }
    }
  }

  async loadSample200Students() {
    await this.classes.clear();
    await this.students.clear();
    await this.attendance.clear();
    await this.classes.bulkAdd(initialClasses);
    await this.students.bulkAdd(initialStudents);
    await this.attendance.bulkAdd(initialAttendance);
    if ((await this.extracts.count()) === 0) {
      await this.extracts.bulkAdd(initialExtracts);
    }
    if ((await this.yearlyPlans.count()) === 0) {
      await this.yearlyPlans.bulkAdd(initialYearlyPlan);
    }
  }

  async getSettings(): Promise<TeacherSettings> {
    const s = await this.settings.get('current_settings');
    if (!s) {
      await this.settings.put({ ...initialSettings, id: 'current_settings' });
      return initialSettings;
    }
    return s;
  }

  async updateSettings(settings: Partial<TeacherSettings>) {
    const current = await this.getSettings();
    const updated = { ...current, ...settings, id: 'current_settings' };
    await this.settings.put(updated);
    return updated;
  }

  async resetToSeedData() {
    await this.classes.clear();
    await this.students.clear();
    await this.attendance.clear();
    await this.extracts.clear();
    await this.letters.clear();
    await this.yearlyPlans.clear();
    await this.grades.clear();
    await this.timetable.clear();
    await this.settings.clear();

    await this.classes.bulkAdd(initialClasses);
    await this.students.bulkAdd(initialStudents);
    await this.attendance.bulkAdd(initialAttendance);
    await this.extracts.bulkAdd(initialExtracts);
    await this.yearlyPlans.bulkAdd(initialYearlyPlan);
    await this.settings.put({ ...initialSettings, id: 'current_settings' });
  }

  async exportBackupJSON(): Promise<string> {
    const backup = {
      version: 1,
      exportDate: new Date().toISOString(),
      classes: await this.classes.toArray(),
      students: await this.students.toArray(),
      attendance: await this.attendance.toArray(),
      extracts: await this.extracts.toArray(),
      letters: await this.letters.toArray(),
      yearlyPlans: await this.yearlyPlans.toArray(),
      grades: await this.grades.toArray(),
      timetable: await this.timetable.toArray(),
      settings: await this.getSettings(),
    };
    return JSON.stringify(backup, null, 2);
  }

  async importBackupJSON(jsonStr: string) {
    const backup = JSON.parse(jsonStr);
    if (!backup.classes || !backup.students) {
      throw new Error('ឯកសារ Backup មិនត្រឹមត្រូវ!');
    }

    await this.classes.clear();
    await this.students.clear();
    await this.attendance.clear();
    await this.extracts.clear();
    await this.letters.clear();
    await this.yearlyPlans.clear();
    await this.grades.clear();
    await this.timetable.clear();

    if (backup.classes?.length) await this.classes.bulkAdd(backup.classes);
    if (backup.students?.length) await this.students.bulkAdd(backup.students);
    if (backup.attendance?.length) await this.attendance.bulkAdd(backup.attendance);
    if (backup.extracts?.length) await this.extracts.bulkAdd(backup.extracts);
    if (backup.letters?.length) await this.letters.bulkAdd(backup.letters);
    if (backup.yearlyPlans?.length) await this.yearlyPlans.bulkAdd(backup.yearlyPlans);
    if (backup.grades?.length) await this.grades.bulkAdd(backup.grades);
    if (backup.timetable?.length) await this.timetable.bulkAdd(backup.timetable);
    if (backup.settings) await this.settings.put({ ...backup.settings, id: 'current_settings' });
  }
}

export const db = new TeacherDatabase();
// Auto seed on boot
db.initializeSeedData().catch(console.error);
