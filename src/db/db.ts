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
  initialTimetable,
} from './seedData';

import { enrichStudentWithMoEYSFields } from '../utils/studentEnricher';
import { generateStandardClasses } from '../utils/classUtils';
import { fromKhmerNum } from '../utils/dateUtils';

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
      const enriched = initialStudents.map((s, i) => enrichStudentWithMoEYSFields(s, i));
      await this.students.bulkAdd(enriched);
      await this.attendance.bulkAdd(initialAttendance);
      if ((await this.extracts.count()) === 0) {
        await this.extracts.bulkAdd(initialExtracts);
      }
      if ((await this.yearlyPlans.count()) === 0) {
        await this.yearlyPlans.bulkAdd(initialYearlyPlan);
      }
      if ((await this.timetable.count()) === 0) {
        await this.timetable.bulkAdd(initialTimetable);
      }
      await this.settings.put({ ...initialSettings, id: 'current_settings' });
    } else {
      // Auto-enrich existing students if they don't have Image 2 fields yet
      const current = await this.students.toArray();
      const needsEnrich = current.some((s) => !s.fatherName || !s.pobVillage || !s.motherName);
      if (needsEnrich) {
        console.log('Auto-enriching existing students with Image 2 fields...');
        const enriched = current.map((s, i) => enrichStudentWithMoEYSFields(s, i));
        await this.students.bulkPut(enriched);
      }

      if ((await this.timetable.count()) === 0) {
        await this.timetable.bulkAdd(initialTimetable);
      }
    }

    // Auto-migrate any student codes with Khmer digits (e.g. STU-0៧-001 -> STU-07-001)
    const existingStudents = await this.students.toArray();
    const hasKhmerCodes = existingStudents.some((s) => /[០-៩]/.test(s.studentCode));
    if (hasKhmerCodes) {
      console.log('Migrating student codes from Khmer digits to normal numbers...');
      const updatedStudents = existingStudents.map((s) => ({
        ...s,
        studentCode: fromKhmerNum(s.studentCode),
      }));
      await this.students.bulkPut(updatedStudents);
    }

    // Always ensure all 49 standard classes exist and room/building are removed
    await this.ensureStandardClasses();
  }

  async ensureStandardClasses() {
    const existingClasses = await this.classes.toArray();

    // 1. Rename existing legacy classes and strip room/building
    const legacyMap: Record<string, { name: string; grade: string }> = {
      'class-7': { name: 'ថ្នាក់ទី 7A', grade: '7' },
      'class-8': { name: 'ថ្នាក់ទី 8A', grade: '8' },
      'class-9': { name: 'ថ្នាក់ទី 9A', grade: '9' },
      'class-10': { name: 'ថ្នាក់ទី 10A', grade: '10' },
      'class-11': { name: 'ថ្នាក់ទី 11A', grade: '11' },
      'class-12': { name: 'ថ្នាក់ទី 12A', grade: '12' },
    };

    for (const c of existingClasses) {
      let changed = false;
      let newName = c.name;
      let newGrade = c.grade;

      if (legacyMap[c.id]) {
        newName = legacyMap[c.id].name;
        newGrade = legacyMap[c.id].grade;
        changed = true;
      } else if (c.name.includes('៧ ក')) {
        newName = 'ថ្នាក់ទី 7A';
        newGrade = '7';
        changed = true;
      } else if (c.name.includes('៨ ក')) {
        newName = 'ថ្នាក់ទី 8A';
        newGrade = '8';
        changed = true;
      } else if (c.name.includes('៩ ក')) {
        newName = 'ថ្នាក់ទី 9A';
        newGrade = '9';
        changed = true;
      } else if (c.name.includes('១០ វិទ្យាសាស្ត្រ')) {
        newName = 'ថ្នាក់ទី 10A';
        newGrade = '10';
        changed = true;
      } else if (c.name.includes('១១ សង្គម')) {
        newName = 'ថ្នាក់ទី 11A';
        newGrade = '11';
        changed = true;
      } else if (c.name.includes('១២ វិទ្យាសាស្ត្រ')) {
        newName = 'ថ្នាក់ទី 12A';
        newGrade = '12';
        changed = true;
      }

      if (c.room) {
        c.room = '';
        changed = true;
      }

      if (changed) {
        await this.classes.put({
          ...c,
          name: newName,
          grade: newGrade,
          room: '',
        });
      }
    }

    // 2. Add missing standard classes from 7A-E, 8A-E, 9A-D, 10A-L, 11A-J, 12A-M
    const standard = generateStandardClasses();
    const updatedClasses = await this.classes.toArray();
    const nameSet = new Set(updatedClasses.map((c) => c.name));
    const idSet = new Set(updatedClasses.map((c) => c.id));

    const toAdd: ClassRoom[] = [];
    for (const sc of standard) {
      if (!nameSet.has(sc.name) && !idSet.has(sc.id)) {
        toAdd.push(sc);
      }
    }

    if (toAdd.length > 0) {
      await this.classes.bulkAdd(toAdd);
    }
  }

  async resetToStandardClasses() {
    const standard = generateStandardClasses();
    await this.classes.clear();
    await this.classes.bulkAdd(standard);
  }

  async loadSample200Students() {
    await this.classes.clear();
    await this.students.clear();
    await this.attendance.clear();
    await this.timetable.clear();
    await this.classes.bulkAdd(initialClasses);
    const enriched = initialStudents.map((s, i) => enrichStudentWithMoEYSFields(s, i));
    await this.students.bulkAdd(enriched);
    await this.attendance.bulkAdd(initialAttendance);
    await this.timetable.bulkAdd(initialTimetable);
    if ((await this.extracts.count()) === 0) {
      await this.extracts.bulkAdd(initialExtracts);
    }
    if ((await this.yearlyPlans.count()) === 0) {
      await this.yearlyPlans.bulkAdd(initialYearlyPlan);
    }
    await this.settings.put({ ...initialSettings, id: 'current_settings' });
  }

  async getSettings(): Promise<TeacherSettings> {
    const s = await this.settings.get('current_settings');
    if (!s || s.teacherName === 'ស៊ឹម វីរៈ') {
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
    await this.timetable.bulkAdd(initialTimetable);
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
