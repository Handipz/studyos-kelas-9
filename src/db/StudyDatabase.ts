/**
 * Copyright (c) 2026 Hanif. All rights reserved.
 * StudyOS Kelas 9 — Persistent IndexedDB + LocalStorage Mirror Engine.
 */

import {
  ActivityItem,
  CurriculumSubject,
  Flashcard,
  FormulaCard,
  FullDatabaseDump,
  MasteryStatus,
  MistakeLog,
  PhotoNote,
  ScheduleSlot,
  StudyLog,
  SubjectGradeRecord,
  TaskItem,
} from '../types/study';
import {
  getInitialActivities,
  getInitialCurriculum,
  getInitialFlashcards,
  getInitialFormulas,
  getInitialGrades,
  getInitialMistakes,
  getInitialPhotoNotes,
  getInitialSchedule,
  getInitialStudyLogs,
  getInitialTasks,
} from '../data/defaultCurriculum';

const BASE_DB_NAME = 'StudyOS_Kelas9_IndexedDB';
const DB_VERSION = 3;
const LOCAL_SNAPSHOT_PREFIX = 'studyos_durable_snapshot_v3_';

export type StoreName =
  | 'tasks'
  | 'activities'
  | 'notes'
  | 'flashcards'
  | 'mistakes'
  | 'grades'
  | 'studyLogs'
  | 'curriculum'
  | 'formulas'
  | 'schedule';

const ALL_STORES: StoreName[] = [
  'tasks',
  'activities',
  'notes',
  'flashcards',
  'mistakes',
  'grades',
  'studyLogs',
  'curriculum',
  'formulas',
  'schedule',
];

const LEGACY_DUMMY_IDS = new Set([
  'task-1',
  'task-2',
  'task-3',
  'task-4',
  'task-5',
  'task-6',
  'act-1',
  'act-2',
  'act-3',
  'act-4',
  'act-5',
  'act-6',
  'note-1',
  'note-2',
  'note-3',
  'note-4',
  'mistake-1',
  'mistake-2',
  'mistake-3',
  'log-1',
  'log-2',
  'log-3',
  'sch-mon-1',
  'sch-mon-2',
  'sch-mon-3',
  'sch-tue-1',
  'sch-tue-2',
  'sch-tue-3',
  'sch-wed-1',
  'sch-wed-2',
  'sch-wed-3',
  'sch-thu-1',
  'sch-thu-2',
  'sch-thu-3',
  'sch-fri-1',
  'sch-fri-2',
  'sch-fri-3',
  'sch-sat-1',
  'sch-sat-2',
  'sch-sat-3',
  'fc-1',
  'fc-2',
  'fc-3',
  'fc-4',
  'fc-5',
  'fc-6',
]);

export class StudyDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private activeAccountScope = 'default';

  constructor() {
    this.requestPersistentBrowserStorage();
  }

  private requestPersistentBrowserStorage(): void {
    if (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.persist === 'function'
    ) {
      navigator.storage.persist().catch(() => {
        // Ignore if browser does not grant persistent storage automatically
      });
    }
  }

  public getAccountScope(): string {
    return this.activeAccountScope;
  }

  public setAccountScope(accountId?: string | null): void {
    const normalized =
      accountId && accountId.trim().length > 0
        ? accountId.trim().replace(/[^a-zA-Z0-9_-]/g, '_')
        : 'default';
    if (normalized !== this.activeAccountScope) {
      this.activeAccountScope = normalized;
      this.dbPromise = null;
    }
  }

  private getDbName(): string {
    if (this.activeAccountScope === 'default') {
      return BASE_DB_NAME;
    }
    return `${BASE_DB_NAME}_${this.activeAccountScope}`;
  }

  private getLocalBackupKey(): string {
    return `${LOCAL_SNAPSHOT_PREFIX}${this.activeAccountScope}`;
  }

  private saveLocalSnapshotBackup(dump: FullDatabaseDump): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.getLocalBackupKey(), JSON.stringify(dump));
    } catch {
      try {
        const compact: FullDatabaseDump = {
          ...dump,
          notes: dump.notes.slice(0, 8),
        };
        localStorage.setItem(this.getLocalBackupKey(), JSON.stringify(compact));
      } catch {
        // ignore
      }
    }
  }

  private loadLocalSnapshotBackup(): FullDatabaseDump | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.getLocalBackupKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw) as FullDatabaseDump;
      if (
        parsed &&
        Array.isArray(parsed.curriculum) &&
        parsed.curriculum.length > 0
      ) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  public async open(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    const dbName = this.getDbName();
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        for (const storeName of ALL_STORES) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error || new Error('Gagal membuka IndexedDB StudyOS'));
    });

    return this.dbPromise;
  }

  public async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async put<T extends { id: string }>(
    storeName: StoreName,
    item: T
  ): Promise<T> {
    const db = await this.open();
    const res = await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve(item);
      req.onerror = () => reject(req.error);
    });
    this.getFullSnapshot()
      .then((snap) => this.saveLocalSnapshotBackup(snap))
      .catch(() => {});
    return res;
  }

  public async putMany<T extends { id: string }>(
    storeName: StoreName,
    items: T[]
  ): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async delete(storeName: StoreName, id: string): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    this.getFullSnapshot()
      .then((snap) => this.saveLocalSnapshotBackup(snap))
      .catch(() => {});
  }

  public async clearStore(storeName: StoreName): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async initAndSeedIfNeeded(): Promise<FullDatabaseDump> {
    const curriculum = await this.getAll<CurriculumSubject>('curriculum');
    if (curriculum.length === 0) {
      const backup = this.loadLocalSnapshotBackup();
      if (backup) {
        return this.importFullSnapshot(backup);
      }
      await this.seedDefaultData();
    } else {
      // Remove any legacy pre-filled dummy items while keeping real user-created items
      for (const storeName of [
        'tasks',
        'activities',
        'notes',
        'mistakes',
        'studyLogs',
        'schedule',
      ] as StoreName[]) {
        const items = await this.getAll<{ id: string }>(storeName);
        for (const item of items) {
          if (LEGACY_DUMMY_IDS.has(item.id)) {
            await this.delete(storeName, item.id);
          }
        }
      }

      // Clean legacy pre-filled dummy grade assessments
      const existingGrades = await this.getAll<SubjectGradeRecord>('grades');
      for (const g of existingGrades) {
        const hasLegacyAssessment = (g.assessments || []).some((a) =>
          /^g-(mtk|ipa|bin|eng|ips|pkn)-\d+$/.test(a.id)
        );
        if (hasLegacyAssessment) {
          await this.delete('grades', g.id);
        }
      }

      // Sync formulas to ensure all researched Math, Physics, Biology, & English formulas are present
      const existingFormulas = await this.getAll<FormulaCard>('formulas');
      const defaultFormulas = getInitialFormulas();
      const defaultFormulaIds = new Set(defaultFormulas.map((f) => f.id));
      const existingFormulaMap = new Map(existingFormulas.map((f) => [f.id, f]));

      const customUserFormulas = existingFormulas.filter(
        (f) => /^form-\d{10,}$/.test(f.id) && !defaultFormulaIds.has(f.id)
      );

      const mergedFormulas: FormulaCard[] = [
        ...defaultFormulas.map((defForm) => {
          const prev = existingFormulaMap.get(defForm.id);
          return prev ? { ...defForm, isPinned: prev.isPinned } : defForm;
        }),
        ...customUserFormulas,
      ];

      await this.clearStore('formulas');
      await this.putMany('formulas', mergedFormulas);

      // Sync Active Recall flashcards to ensure all researched cards are available
      const existingFlashcards = await this.getAll<Flashcard>('flashcards');
      const defaultFlashcards = getInitialFlashcards();
      const defaultFcIds = new Set(defaultFlashcards.map((c) => c.id));
      const existingFcMap = new Map(existingFlashcards.map((c) => [c.id, c]));

      const customUserFlashcards = existingFlashcards.filter(
        (c) =>
          !defaultFcIds.has(c.id) &&
          !LEGACY_DUMMY_IDS.has(c.id) &&
          /^fc-\d{10,}$/.test(c.id)
      );

      const mergedFlashcards: Flashcard[] = [
        ...defaultFlashcards.map((defCard) => {
          const prev = existingFcMap.get(defCard.id);
          return prev
            ? {
                ...defCard,
                dueDate: prev.dueDate,
                intervalDays: prev.intervalDays,
                reviewCount: prev.reviewCount,
                lastReviewedAt: prev.lastReviewedAt,
              }
            : defCard;
        }),
        ...customUserFlashcards,
      ];

      await this.clearStore('flashcards');
      await this.putMany('flashcards', mergedFlashcards);
    }

    const snap = await this.getFullSnapshot();
    this.saveLocalSnapshotBackup(snap);
    return snap;
  }

  public async seedDefaultData(): Promise<void> {
    for (const storeName of ALL_STORES) {
      await this.clearStore(storeName);
    }

    await Promise.all([
      this.putMany('curriculum', getInitialCurriculum()),
      this.putMany('schedule', getInitialSchedule()),
      this.putMany('tasks', getInitialTasks()),
      this.putMany('activities', getInitialActivities()),
      this.putMany('notes', getInitialPhotoNotes()),
      this.putMany('flashcards', getInitialFlashcards()),
      this.putMany('formulas', getInitialFormulas()),
      this.putMany('mistakes', getInitialMistakes()),
      this.putMany('grades', getInitialGrades()),
      this.putMany('studyLogs', getInitialStudyLogs()),
    ]);
  }

  public async touchChapterStudied(
    subjectId: string,
    chapterId: string,
    optionalNewMastery?: MasteryStatus
  ): Promise<CurriculumSubject[]> {
    const subjects = await this.getAll<CurriculumSubject>('curriculum');
    const targetSubject = subjects.find((s) => s.id === subjectId);
    if (!targetSubject) return subjects;

    const nowIso = new Date().toISOString();
    let updated = false;

    const updatedChapters = targetSubject.chapters.map((ch) => {
      if (ch.id === chapterId) {
        updated = true;
        const nextMastery =
          optionalNewMastery ||
          (ch.mastery === 'Belum Belajar' ? 'Paham' : ch.mastery);
        return {
          ...ch,
          lastStudiedAt: nowIso,
          mastery: nextMastery,
        };
      }
      return ch;
    });

    if (updated) {
      const nextSubject: CurriculumSubject = {
        ...targetSubject,
        chapters: updatedChapters,
      };
      await this.put('curriculum', nextSubject);
      return subjects.map((s) => (s.id === subjectId ? nextSubject : s));
    }

    return subjects;
  }

  public async getFullSnapshot(): Promise<FullDatabaseDump> {
    const [
      curriculum,
      tasks,
      activities,
      schedule,
      notes,
      flashcards,
      formulas,
      mistakes,
      grades,
      studyLogs,
    ] = await Promise.all([
      this.getAll<CurriculumSubject>('curriculum'),
      this.getAll<TaskItem>('tasks'),
      this.getAll<ActivityItem>('activities'),
      this.getAll<ScheduleSlot>('schedule'),
      this.getAll<PhotoNote>('notes'),
      this.getAll<Flashcard>('flashcards'),
      this.getAll<FormulaCard>('formulas'),
      this.getAll<MistakeLog>('mistakes'),
      this.getAll<SubjectGradeRecord>('grades'),
      this.getAll<StudyLog>('studyLogs'),
    ]);

    return {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      curriculum,
      tasks,
      activities,
      schedule,
      notes,
      flashcards,
      formulas,
      mistakes,
      grades,
      studyLogs,
    };
  }

  public async importFullSnapshot(dump: FullDatabaseDump): Promise<FullDatabaseDump> {
    if (!dump || !Array.isArray(dump.curriculum)) {
      throw new Error('Format file JSON Backup StudyOS tidak valid.');
    }

    for (const storeName of ALL_STORES) {
      await this.clearStore(storeName);
    }

    const cleanTasks = (dump.tasks || []).filter(
      (t) => !LEGACY_DUMMY_IDS.has(t.id)
    );
    const cleanActivities = (dump.activities || []).filter(
      (a) => !LEGACY_DUMMY_IDS.has(a.id)
    );
    const cleanNotes = (dump.notes || []).filter(
      (n) => !LEGACY_DUMMY_IDS.has(n.id)
    );
    const cleanMistakes = (dump.mistakes || []).filter(
      (m) => !LEGACY_DUMMY_IDS.has(m.id)
    );
    const cleanSchedule = (dump.schedule || []).filter(
      (s) => !LEGACY_DUMMY_IDS.has(s.id)
    );
    const cleanLogs = (dump.studyLogs || []).filter(
      (l) => !LEGACY_DUMMY_IDS.has(l.id)
    );

    const formulasToImport =
      dump.formulas && dump.formulas.length >= 18
        ? dump.formulas
        : getInitialFormulas();
    const flashcardsToImport =
      dump.flashcards && dump.flashcards.length >= 20
        ? dump.flashcards
        : getInitialFlashcards();

    await Promise.all([
      this.putMany('curriculum', dump.curriculum || getInitialCurriculum()),
      this.putMany('tasks', cleanTasks),
      this.putMany('activities', cleanActivities),
      this.putMany('schedule', cleanSchedule),
      this.putMany('notes', cleanNotes),
      this.putMany('flashcards', flashcardsToImport),
      this.putMany('formulas', formulasToImport),
      this.putMany('mistakes', cleanMistakes),
      this.putMany('grades', dump.grades || []),
      this.putMany('studyLogs', cleanLogs),
    ]);

    const snapshot = await this.getFullSnapshot();
    this.saveLocalSnapshotBackup(snapshot);
    return snapshot;
  }
}

export const studyDb = new StudyDatabase();

if (typeof window !== 'undefined') {
  (window as unknown as { StudyDatabase: typeof StudyDatabase; studyDb: StudyDatabase }).StudyDatabase =
    StudyDatabase;
  (window as unknown as { StudyDatabase: typeof StudyDatabase; studyDb: StudyDatabase }).studyDb =
    studyDb;
}
