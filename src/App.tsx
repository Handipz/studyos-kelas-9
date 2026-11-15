/**
 * StudyOS Kelas 9 — Main Application Workspace
 * Copyright (c) 2026 Hanif. All rights reserved.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Camera,
  Brain,
  BookOpen,
  Timer,
  Sun,
  Moon,
  ShieldCheck,
  Smartphone,
  CloudCheck,
  RefreshCw,
} from 'lucide-react';
import { studyDb } from './db/StudyDatabase';
import {
  ActivityItem,
  CurriculumSubject,
  Flashcard,
  FlashcardSelfEval,
  FormulaCard,
  FullDatabaseDump,
  MasteryStatus,
  MistakeLog,
  PhotoNote,
  ScheduleSlot,
  SemesterNumber,
  StudyLog,
  SubjectGradeRecord,
  TaskItem,
  UserSession,
} from './types/study';
import {
  evaluateFlashcardReview,
  getTodayDateString,
  isFlashcardDueToday,
} from './utils/studyLogic';
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
} from './data/defaultCurriculum';
import {
  deleteCloudPhotoNote,
  getSavedUserSession,
  loadWorkspaceFromCloud,
  saveUserSession,
  syncWorkspaceToCloud,
} from './services/authAndCloudService';
import { CommandCenterView } from './components/CommandCenterView';
import { PhotoNotesVaultView } from './components/PhotoNotesVaultView';
import { ActiveRecallView } from './components/ActiveRecallView';
import { CurriculumMasteryView } from './components/CurriculumMasteryView';
import { FocusAndGradesView } from './components/FocusAndGradesView';
import { AuthGateModal } from './components/AuthGateModal';
import { AdminDashboardView } from './components/AdminDashboardView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

type ActiveTab =
  | 'dashboard'
  | 'notes'
  | 'recall'
  | 'curriculum'
  | 'focus'
  | 'admin';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isDark, setIsDark] = useState<boolean>(false);

  // User Authentication & Cloud Sync State
  const [userSession, setUserSession] = useState<UserSession | null>(() =>
    getSavedUserSession()
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<
    'idle' | 'syncing' | 'synced'
  >('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const isHydratingRef = useRef<boolean>(true);
  const syncDebounceRef = useRef<number | null>(null);

  // Centralized Application State synced with IndexedDB + Cloud Firestore
  const [curriculum, setCurriculum] = useState<CurriculumSubject[]>(() =>
    getInitialCurriculum()
  );
  const [tasks, setTasks] = useState<TaskItem[]>(() => getInitialTasks());
  const [activities, setActivities] = useState<ActivityItem[]>(() =>
    getInitialActivities()
  );
  const [schedule, setSchedule] = useState<ScheduleSlot[]>(() =>
    getInitialSchedule()
  );
  const [notes, setNotes] = useState<PhotoNote[]>(() => getInitialPhotoNotes());
  const [flashcards, setFlashcards] = useState<Flashcard[]>(() =>
    getInitialFlashcards()
  );
  const [formulas, setFormulas] = useState<FormulaCard[]>(() =>
    getInitialFormulas()
  );
  const [mistakes, setMistakes] = useState<MistakeLog[]>(() =>
    getInitialMistakes()
  );
  const [grades, setGrades] = useState<SubjectGradeRecord[]>(() =>
    getInitialGrades()
  );
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>(() =>
    getInitialStudyLogs()
  );

  // Sync theme class with document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const applySnapshotToState = (snap: FullDatabaseDump) => {
    setCurriculum(snap.curriculum);
    setTasks(snap.tasks);
    setActivities(snap.activities || getInitialActivities());
    setSchedule(snap.schedule);
    setNotes(snap.notes);
    setFlashcards(snap.flashcards);
    setFormulas(snap.formulas);
    setMistakes(snap.mistakes);
    setGrades(snap.grades);
    setStudyLogs(snap.studyLogs);
  };

  // Hydrate workspace from IndexedDB + Cloud Firestore when session changes or on boot
  useEffect(() => {
    let mounted = true;
    isHydratingRef.current = true;

    const hydrateWorkspace = async () => {
      studyDb.setAccountScope(userSession?.accountId || 'default');
      try {
        const localSnap = await studyDb.initAndSeedIfNeeded();
        if (!mounted) return;
        applySnapshotToState(localSnap);

        if (userSession) {
          setCloudSyncStatus('syncing');
          const cloudSnap = await loadWorkspaceFromCloud(userSession.accountId);
          if (!mounted) return;

          if (
            cloudSnap &&
            Array.isArray(cloudSnap.curriculum) &&
            cloudSnap.curriculum.length > 0
          ) {
            const restored = await studyDb.importFullSnapshot(cloudSnap);
            if (!mounted) return;
            applySnapshotToState(restored);
            setCloudSyncStatus('synced');
            setLastSyncedAt(new Date().toISOString());
          } else {
            // First time this account logs in on Cloud: upload current local workspace to Cloud
            const res = await syncWorkspaceToCloud(userSession, localSnap);
            if (!mounted) return;
            setCloudSyncStatus(res.ok ? 'synced' : 'idle');
            if (res.ok) setLastSyncedAt(res.syncedAt);
          }
        } else {
          setCloudSyncStatus('idle');
        }
      } catch (err) {
        console.error('Workspace hydration fallback:', err);
      } finally {
        if (mounted) {
          isHydratingRef.current = false;
        }
      }
    };

    hydrateWorkspace();

    return () => {
      mounted = false;
    };
  }, [userSession]);

  // Debounced background Cloud Sync + Automatic Re-Sync when network returns online
  const triggerBackgroundCloudSync = async () => {
    if (!userSession || isHydratingRef.current) return;
    if (syncDebounceRef.current) {
      window.clearTimeout(syncDebounceRef.current);
    }
    syncDebounceRef.current = window.setTimeout(async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setCloudSyncStatus('idle');
        return;
      }
      try {
        setCloudSyncStatus('syncing');
        const fullSnap = await studyDb.getFullSnapshot();
        const res = await syncWorkspaceToCloud(userSession, fullSnap);
        setCloudSyncStatus(res.ok ? 'synced' : 'idle');
        if (res.ok) setLastSyncedAt(res.syncedAt);
      } catch {
        setCloudSyncStatus('idle');
      }
    }, 600);
  };

  useEffect(() => {
    const handleOnline = () => {
      if (userSession && !isHydratingRef.current) {
        triggerBackgroundCloudSync();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userSession]);

  const handleAuthenticated = (session: UserSession) => {
    saveUserSession(session);
    setUserSession(session);
    setIsAuthModalOpen(false);
    if (session.role === 'admin') {
      setActiveTab('admin');
    }
  };

  const handleLogout = () => {
    saveUserSession(null);
    setUserSession(null);
    setIsAuthModalOpen(false);
    if (activeTab === 'admin') {
      setActiveTab('dashboard');
    }
  };

  // --- Task Handlers ---
  const handleToggleTask = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    const updated: TaskItem = { ...target, completed: !target.completed };
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    await studyDb.put('tasks', updated);
    if (updated.completed && updated.chapterId) {
      const nextCurr = await studyDb.touchChapterStudied(
        updated.subjectId,
        updated.chapterId
      );
      setCurriculum(nextCurr);
    }
    await triggerBackgroundCloudSync();
  };

  const handleAddTask = async (
    newTaskData: Omit<TaskItem, 'id' | 'createdAt' | 'completed'>
  ) => {
    const item: TaskItem = {
      ...newTaskData,
      id: `task-${Date.now()}`,
      completed: false,
      createdAt: getTodayDateString(),
    };
    setTasks((prev) => [item, ...prev]);
    await studyDb.put('tasks', item);
    await triggerBackgroundCloudSync();
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await studyDb.delete('tasks', taskId);
    await triggerBackgroundCloudSync();
  };

  // --- Non-Homework Daily Activity Handlers ---
  const handleToggleActivity = async (activityId: string) => {
    const target = activities.find((a) => a.id === activityId);
    if (!target) return;
    const updated: ActivityItem = { ...target, completed: !target.completed };
    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? updated : a))
    );
    await studyDb.put('activities', updated);
    await triggerBackgroundCloudSync();
  };

  const handleAddActivity = async (
    newActData: Omit<ActivityItem, 'id' | 'createdAt' | 'completed'>
  ) => {
    const item: ActivityItem = {
      ...newActData,
      id: `act-${Date.now()}`,
      completed: false,
      createdAt: getTodayDateString(),
    };
    setActivities((prev) => [item, ...prev]);
    await studyDb.put('activities', item);
    await triggerBackgroundCloudSync();
  };

  const handleDeleteActivity = async (activityId: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
    await studyDb.delete('activities', activityId);
    await triggerBackgroundCloudSync();
  };

  // --- Schedule Handlers ---
  const handleAddScheduleSlot = async (slotData: Omit<ScheduleSlot, 'id'>) => {
    const slot: ScheduleSlot = {
      ...slotData,
      id: `sch-${Date.now()}`,
    };
    setSchedule((prev) => [...prev, slot]);
    await studyDb.put('schedule', slot);
    await triggerBackgroundCloudSync();
  };

  const handleDeleteScheduleSlot = async (slotId: string) => {
    setSchedule((prev) => prev.filter((s) => s.id !== slotId));
    await studyDb.delete('schedule', slotId);
    await triggerBackgroundCloudSync();
  };

  // --- Photo Notes Vault Handlers (with Cross-Module Curriculum Reactivity + Cloud Photo Sync) ---
  const handleAddNote = async (
    noteData: Omit<PhotoNote, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const nowIso = new Date().toISOString();
    const newNote: PhotoNote = {
      ...noteData,
      id: `note-${Date.now()}`,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setNotes((prev) => [newNote, ...prev]);
    await studyDb.put('notes', newNote);

    const updatedCurriculum = await studyDb.touchChapterStudied(
      newNote.subjectId,
      newNote.chapterId
    );
    setCurriculum(updatedCurriculum);
    await triggerBackgroundCloudSync();
  };

  const handleUpdateNote = async (updatedNote: PhotoNote) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
    );
    await studyDb.put('notes', updatedNote);
    const updatedCurriculum = await studyDb.touchChapterStudied(
      updatedNote.subjectId,
      updatedNote.chapterId
    );
    setCurriculum(updatedCurriculum);
    await triggerBackgroundCloudSync();
  };

  const handleDeleteNote = async (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    await studyDb.delete('notes', noteId);
    if (userSession) {
      await deleteCloudPhotoNote(userSession.accountId, noteId);
    }
    await triggerBackgroundCloudSync();
  };

  // --- Flashcard & Spaced Repetition Handlers ---
  const handleAddFlashcard = async (
    cardData: Omit<
      Flashcard,
      'id' | 'dueDate' | 'intervalDays' | 'reviewCount' | 'lastReviewedAt'
    >
  ) => {
    const newCard: Flashcard = {
      ...cardData,
      id: `fc-${Date.now()}`,
      dueDate: getTodayDateString(),
      intervalDays: 0,
      reviewCount: 0,
      lastReviewedAt: null,
    };
    setFlashcards((prev) => [newCard, ...prev]);
    await studyDb.put('flashcards', newCard);

    const updatedCurriculum = await studyDb.touchChapterStudied(
      newCard.subjectId,
      newCard.chapterId
    );
    setCurriculum(updatedCurriculum);
    await triggerBackgroundCloudSync();
  };

  const handleReviewFlashcard = async (
    card: Flashcard,
    evaluation: FlashcardSelfEval
  ) => {
    const updatedCard = evaluateFlashcardReview(card, evaluation);
    setFlashcards((prev) =>
      prev.map((c) => (c.id === card.id ? updatedCard : c))
    );
    await studyDb.put('flashcards', updatedCard);

    const updatedCurriculum = await studyDb.touchChapterStudied(
      card.subjectId,
      card.chapterId
    );
    setCurriculum(updatedCurriculum);
    await triggerBackgroundCloudSync();
  };

  const handleDeleteFlashcard = async (cardId: string) => {
    setFlashcards((prev) => prev.filter((c) => c.id !== cardId));
    await studyDb.delete('flashcards', cardId);
    await triggerBackgroundCloudSync();
  };

  // --- Formula Bank Handlers ---
  const handleAddFormula = async (formulaData: Omit<FormulaCard, 'id'>) => {
    const newFormula: FormulaCard = {
      ...formulaData,
      id: `form-${Date.now()}`,
    };
    setFormulas((prev) => [newFormula, ...prev]);
    await studyDb.put('formulas', newFormula);
    await triggerBackgroundCloudSync();
  };

  const handleTogglePinFormula = async (formula: FormulaCard) => {
    const updated: FormulaCard = { ...formula, isPinned: !formula.isPinned };
    setFormulas((prev) =>
      prev.map((f) => (f.id === formula.id ? updated : f))
    );
    await studyDb.put('formulas', updated);
    await triggerBackgroundCloudSync();
  };

  const handleDeleteFormula = async (formulaId: string) => {
    setFormulas((prev) => prev.filter((f) => f.id !== formulaId));
    await studyDb.delete('formulas', formulaId);
    await triggerBackgroundCloudSync();
  };

  // --- Mistake Logbook Handlers ---
  const handleAddMistake = async (
    mistakeData: Omit<MistakeLog, 'id' | 'createdAt'>
  ) => {
    const newMistake: MistakeLog = {
      ...mistakeData,
      id: `mistake-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setMistakes((prev) => [newMistake, ...prev]);
    await studyDb.put('mistakes', newMistake);

    const updatedCurriculum = await studyDb.touchChapterStudied(
      newMistake.subjectId,
      newMistake.chapterId
    );
    setCurriculum(updatedCurriculum);
    await triggerBackgroundCloudSync();
  };

  const handleDeleteMistake = async (mistakeId: string) => {
    setMistakes((prev) => prev.filter((m) => m.id !== mistakeId));
    await studyDb.delete('mistakes', mistakeId);
    await triggerBackgroundCloudSync();
  };

  // --- Curriculum & Mastery Handlers ---
  const handleUpdateChapterMastery = async (
    subjectId: string,
    chapterId: string,
    mastery: MasteryStatus
  ) => {
    const updatedCurriculum = await studyDb.touchChapterStudied(
      subjectId,
      chapterId,
      mastery
    );
    setCurriculum(updatedCurriculum);
    await triggerBackgroundCloudSync();
  };

  const handleMarkChapterStudiedToday = async (
    subjectId: string,
    chapterId: string
  ) => {
    const updatedCurriculum = await studyDb.touchChapterStudied(
      subjectId,
      chapterId
    );
    setCurriculum(updatedCurriculum);
    await triggerBackgroundCloudSync();
  };

  const handleAddSubject = async (
    name: string,
    shortCode: string,
    teacher: string
  ) => {
    const id = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;
    const newSubject: CurriculumSubject = {
      id,
      name,
      shortCode,
      teacher,
      chapters: [
        {
          id: `${id}-ch1`,
          subjectId: id,
          semester: 1,
          number: 1,
          title: `Bab 1 Pengantar ${name}`,
          mastery: 'Belum Belajar',
          lastStudiedAt: null,
        },
      ],
    };
    setCurriculum((prev) => [...prev, newSubject]);
    await studyDb.put('curriculum', newSubject);
    await triggerBackgroundCloudSync();
  };

  const handleAddChapter = async (
    subjectId: string,
    semester: SemesterNumber,
    title: string
  ) => {
    const targetSubj = curriculum.find((s) => s.id === subjectId);
    if (!targetSubj) return;
    const nextNumber = targetSubj.chapters.length + 1;
    const updatedSubject: CurriculumSubject = {
      ...targetSubj,
      chapters: [
        ...targetSubj.chapters,
        {
          id: `${subjectId}-ch-${Date.now()}`,
          subjectId,
          semester,
          number: nextNumber,
          title,
          mastery: 'Belum Belajar',
          lastStudiedAt: null,
        },
      ],
    };
    setCurriculum((prev) =>
      prev.map((s) => (s.id === subjectId ? updatedSubject : s))
    );
    await studyDb.put('curriculum', updatedSubject);
    await triggerBackgroundCloudSync();
  };

  const handleDeleteChapter = async (subjectId: string, chapterId: string) => {
    const targetSubj = curriculum.find((s) => s.id === subjectId);
    if (!targetSubj) return;
    const updatedSubject: CurriculumSubject = {
      ...targetSubj,
      chapters: targetSubj.chapters.filter((ch) => ch.id !== chapterId),
    };
    setCurriculum((prev) =>
      prev.map((s) => (s.id === subjectId ? updatedSubject : s))
    );
    await studyDb.put('curriculum', updatedSubject);
    await triggerBackgroundCloudSync();
  };

  // --- Focus Studio & Grade Tracker Handlers ---
  const handleLogStudySession = async (
    subjectId: string,
    chapterId: string,
    mode: 'Pomodoro 25/5' | 'Deep Work 50/10',
    durationMinutes: number
  ) => {
    const newLog: StudyLog = {
      id: `log-${Date.now()}`,
      subjectId,
      chapterId,
      mode,
      durationMinutes,
      completedAt: new Date().toISOString(),
    };
    setStudyLogs((prev) => [newLog, ...prev]);
    await studyDb.put('studyLogs', newLog);

    if (chapterId) {
      const updatedCurriculum = await studyDb.touchChapterStudied(
        subjectId,
        chapterId
      );
      setCurriculum(updatedCurriculum);
    }
    await triggerBackgroundCloudSync();
  };

  const handleUpdateTargetGrade = async (
    subjectId: string,
    targetGrade: number
  ) => {
    const existing = grades.find((g) => g.subjectId === subjectId) || {
      id: subjectId,
      subjectId,
      semester: 1 as SemesterNumber,
      targetGrade: 90,
      assessments: [],
    };
    const updated: SubjectGradeRecord = {
      ...existing,
      targetGrade,
    };
    setGrades((prev) => {
      const exists = prev.some((g) => g.subjectId === subjectId);
      return exists
        ? prev.map((g) => (g.subjectId === subjectId ? updated : g))
        : [...prev, updated];
    });
    await studyDb.put('grades', updated);
    await triggerBackgroundCloudSync();
  };

  const handleAddGradeAssessment = async (
    subjectId: string,
    type: 'Tugas' | 'UH' | 'PTS' | 'PAS',
    label: string,
    score: number
  ) => {
    const existing = grades.find((g) => g.subjectId === subjectId) || {
      id: subjectId,
      subjectId,
      semester: 1 as SemesterNumber,
      targetGrade: 90,
      assessments: [],
    };
    const updated: SubjectGradeRecord = {
      ...existing,
      assessments: [
        ...existing.assessments,
        {
          id: `ass-${Date.now()}`,
          label,
          type,
          score,
          date: getTodayDateString(),
        },
      ],
    };
    setGrades((prev) => {
      const exists = prev.some((g) => g.subjectId === subjectId);
      return exists
        ? prev.map((g) => (g.subjectId === subjectId ? updated : g))
        : [...prev, updated];
    });
    await studyDb.put('grades', updated);
    await triggerBackgroundCloudSync();
  };

  const handleDeleteGradeAssessment = async (
    subjectId: string,
    assessmentId: string
  ) => {
    const existing = grades.find((g) => g.subjectId === subjectId);
    if (!existing) return;
    const updated: SubjectGradeRecord = {
      ...existing,
      assessments: existing.assessments.filter((a) => a.id !== assessmentId),
    };
    setGrades((prev) =>
      prev.map((g) => (g.subjectId === subjectId ? updated : g))
    );
    await studyDb.put('grades', updated);
    await triggerBackgroundCloudSync();
  };

  // --- Backup & Restore Handlers ---
  const handleExportJson = async () => {
    return studyDb.getFullSnapshot();
  };

  const handleImportJson = async (dump: FullDatabaseDump) => {
    const restored = await studyDb.importFullSnapshot(dump);
    applySnapshotToState(restored);
    await triggerBackgroundCloudSync();
  };

  const handleResetDefault = async () => {
    await studyDb.seedDefaultData();
    const fresh = await studyDb.getFullSnapshot();
    applySnapshotToState(fresh);
    await triggerBackgroundCloudSync();
  };

  const dueFlashcardsCount = flashcards.filter((c) =>
    isFlashcardDueToday(c)
  ).length;
  const pendingTasksCount = tasks.filter((t) => !t.completed).length;

  const baseNavItems: {
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.FC<{ className?: string }>;
    counter?: number;
  }[] = [
    {
      id: 'dashboard',
      label: 'Command Center',
      shortLabel: 'Beranda',
      icon: LayoutDashboard,
      counter: pendingTasksCount,
    },
    {
      id: 'notes',
      label: 'Catatan Foto Cornell',
      shortLabel: 'Catatan',
      icon: Camera,
      counter: notes.length,
    },
    {
      id: 'recall',
      label: 'Active Recall & Rumus',
      shortLabel: 'Recall',
      icon: Brain,
      counter: dueFlashcardsCount,
    },
    {
      id: 'curriculum',
      label: 'Kurikulum Kelas 9',
      shortLabel: 'Kurikulum',
      icon: BookOpen,
    },
    {
      id: 'focus',
      label: 'Focus & Target Rapor',
      shortLabel: 'Focus',
      icon: Timer,
    },
  ];

  const navItems: {
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.FC<{ className?: string }>;
    counter?: number;
  }[] =
    userSession?.role === 'admin'
      ? [
          ...baseNavItems,
          {
            id: 'admin' as ActiveTab,
            label: 'Admin & Database Server',
            shortLabel: 'Admin DB',
            icon: ShieldCheck,
          },
        ]
      : baseNavItems;

  const currentSnapshot: FullDatabaseDump = {
    version: 2,
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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC]">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-[#111827] border-r border-[#E2E8F0] dark:border-[#1E293B] z-30">
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <span className="text-base font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap shrink-0">
            StudyOS Kelas 9
          </span>
          <span className="text-xs font-mono text-[#2563EB]">SMP Sem 1–2</span>
        </div>

        <nav
          aria-label="Navigasi Utama Sidebar"
          className="flex-1 px-3 py-5 space-y-1 overflow-y-auto"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#2563EB] text-white'
                    : 'text-[#475569] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#090D16] hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {typeof item.counter === 'number' && item.counter > 0 && (
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-blue-800 text-white'
                        : 'text-[#475569] dark:text-[#94A3B8]'
                    }`}
                  >
                    {item.counter}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-3">
          {/* Cloud & Local Persistence Card */}
          <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] text-xs space-y-1.5">
            {userSession ? (
              <>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                    {userSession.displayName}
                  </span>
                  <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-[#16A34A]">
                    {userSession.role}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-[#2563EB] truncate">
                  ID: {userSession.phone}
                </p>
                <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] flex items-center gap-1">
                  {cloudSyncStatus === 'syncing' ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin text-[#2563EB]" />
                      <span>Menyinkronkan ke Cloud...</span>
                    </>
                  ) : (
                    <>
                      <CloudCheck className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                      <span>
                        Cloud & Lokal Aktif ({notes.length} Foto)
                      </span>
                    </>
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  Penyimpanan Perangkat Aktif
                </p>
                <p className="font-mono text-[11px] text-[#475569] dark:text-[#94A3B8]">
                  IndexedDB · {tasks.length} Tugas · {notes.length} Foto
                </p>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full mt-1.5 min-h-[36px] px-2.5 py-1.5 rounded-md text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span>
                {userSession ? 'Kelola Akun / Ganti' : 'Login No HP / Admin'}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsDark((d) => !d)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#2563EB] transition-colors whitespace-nowrap shrink-0"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-[#D97706]" />
                <span>Mode Terang (Light)</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Mode Gelap (Dark)</span>
              </>
            )}
          </button>

          <p className="text-[11px] font-mono text-center text-[#475569] dark:text-[#94A3B8] pt-1">
            Copyright © 2026 Hanif
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top Bar Contract (3 Zones separated by gap-4 sm:gap-8) */}
        <header className="h-16 bg-white dark:bg-[#111827] border-b border-[#E2E8F0] dark:border-[#1E293B] px-3 sm:px-8 flex items-center justify-between gap-3 sm:gap-8 sticky top-0 z-20">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#workspace"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('dashboard');
            }}
            className="text-sm sm:text-base font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap shrink-0"
          >
            StudyOS Kelas 9
          </a>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav
            aria-label="Navigasi Cepat Header"
            className="hidden xl:flex items-center gap-6 text-xs font-medium text-[#475569] dark:text-[#94A3B8]"
          >
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`hover:text-[#0F172A] dark:hover:text-white hover:underline transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'dashboard'
                  ? 'text-[#2563EB] dark:text-blue-400 font-semibold underline'
                  : ''
              }`}
            >
              Command Center
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`hover:text-[#0F172A] dark:hover:text-white hover:underline transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'notes'
                  ? 'text-[#2563EB] dark:text-blue-400 font-semibold underline'
                  : ''
              }`}
            >
              Catatan Foto
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recall')}
              className={`hover:text-[#0F172A] dark:hover:text-white hover:underline transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'recall'
                  ? 'text-[#2563EB] dark:text-blue-400 font-semibold underline'
                  : ''
              }`}
            >
              Active Recall
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('curriculum')}
              className={`hover:text-[#0F172A] dark:hover:text-white hover:underline transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'curriculum'
                  ? 'text-[#2563EB] dark:text-blue-400 font-semibold underline'
                  : ''
              }`}
            >
              Kurikulum SMP
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('focus')}
              className={`hover:text-[#0F172A] dark:hover:text-white hover:underline transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'focus'
                  ? 'text-[#2563EB] dark:text-blue-400 font-semibold underline'
                  : ''
              }`}
            >
              Focus & Rapor
            </button>
            {userSession?.role === 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`hover:text-[#0F172A] dark:hover:text-white hover:underline transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'admin'
                    ? 'text-[#2563EB] dark:text-blue-400 font-semibold underline'
                    : ''
                }`}
              >
                Panel Admin
              </button>
            )}
          </nav>

          {/* Zone 3: PWA Install + Login / Cloud Account + Theme Action */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <PWAInstallButton />

            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className={`min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                userSession
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 hover:border-[#16A34A]'
                  : 'bg-[#2563EB] text-white border-[#2563EB] hover:bg-blue-700'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span>
                {userSession
                  ? `${userSession.displayName.slice(0, 14)}`
                  : 'Login No HP / OTP'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              aria-label={isDark ? 'Aktifkan Light Mode' : 'Aktifkan Dark Mode'}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#D97706]" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Sub-header Cloud Sync & Persistence Assurance Bar on Mobile/Tablet */}
        <div className="bg-[#F8FAFC] dark:bg-[#090D16] border-b border-[#E2E8F0] dark:border-[#1E293B] px-3 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#475569] dark:text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <CloudCheck className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
            <span>
              {userSession ? (
                <>
                  Sinkronisasi Cloud & Perangkat Aktif untuk{' '}
                  <strong className="text-[#0F172A] dark:text-[#F8FAFC]">
                    {userSession.displayName} ({userSession.phone})
                  </strong>
                  {lastSyncedAt
                    ? ` · Tersimpan ${new Date(lastSyncedAt).toLocaleTimeString('id-ID')}`
                    : ''}
                </>
              ) : (
                <>
                  Wajib Login OTP / Admin untuk membuka dan menyinkronkan
                  workspace belajar Anda.
                </>
              )}
            </span>
          </div>
          {userSession?.role === 'admin' && activeTab !== 'admin' && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="font-bold text-[#2563EB] hover:underline"
            >
              Buka Panel Admin Fonnte →
            </button>
          )}
        </div>

        {/* Active Module Viewport */}
        <main
          id="workspace"
          className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto"
        >
          {activeTab === 'dashboard' && (
            <CommandCenterView
              curriculum={curriculum}
              tasks={tasks}
              activities={activities}
              schedule={schedule}
              flashcards={flashcards}
              formulas={formulas}
              studyLogs={studyLogs}
              onToggleTask={handleToggleTask}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
              onToggleActivity={handleToggleActivity}
              onAddActivity={handleAddActivity}
              onDeleteActivity={handleDeleteActivity}
              onAddScheduleSlot={handleAddScheduleSlot}
              onDeleteScheduleSlot={handleDeleteScheduleSlot}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'notes' && (
            <PhotoNotesVaultView
              curriculum={curriculum}
              notes={notes}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              onQuickCreateFlashcard={handleAddFlashcard}
            />
          )}

          {activeTab === 'recall' && (
            <ActiveRecallView
              curriculum={curriculum}
              flashcards={flashcards}
              formulas={formulas}
              mistakes={mistakes}
              onAddFlashcard={handleAddFlashcard}
              onReviewFlashcard={handleReviewFlashcard}
              onDeleteFlashcard={handleDeleteFlashcard}
              onAddFormula={handleAddFormula}
              onTogglePinFormula={handleTogglePinFormula}
              onDeleteFormula={handleDeleteFormula}
              onAddMistake={handleAddMistake}
              onDeleteMistake={handleDeleteMistake}
            />
          )}

          {activeTab === 'curriculum' && (
            <CurriculumMasteryView
              curriculum={curriculum}
              notes={notes}
              flashcards={flashcards}
              onUpdateChapterMastery={handleUpdateChapterMastery}
              onMarkChapterStudiedToday={handleMarkChapterStudiedToday}
              onAddSubject={handleAddSubject}
              onAddChapter={handleAddChapter}
              onDeleteChapter={handleDeleteChapter}
            />
          )}

          {activeTab === 'focus' && (
            <FocusAndGradesView
              curriculum={curriculum}
              studyLogs={studyLogs}
              grades={grades}
              onLogStudySession={handleLogStudySession}
              onUpdateTargetGrade={handleUpdateTargetGrade}
              onAddGradeAssessment={handleAddGradeAssessment}
              onDeleteGradeAssessment={handleDeleteGradeAssessment}
            />
          )}

          {activeTab === 'admin' && userSession?.role === 'admin' && (
            <AdminDashboardView
              curriculum={curriculum}
              snapshot={currentSnapshot}
              onNavigateCurriculum={() => setActiveTab('curriculum')}
              onExportJson={handleExportJson}
              onImportJson={handleImportJson}
              onResetDefault={handleResetDefault}
            />
          )}
        </main>

        {/* Global Web Footer with Copyright © Hanif */}
        <footer className="mt-auto border-t border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] px-4 sm:px-8 py-4 text-xs text-[#475569] dark:text-[#94A3B8] flex flex-col sm:flex-row items-center justify-between gap-2 print:hidden">
          <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            Copyright © 2026 Hanif — StudyOS Kelas 9 SMP (Semester 1 & 2)
          </div>
          <div className="font-mono text-[11px] text-center sm:text-right">
            Rumus Terstruktur · Active Recall · Cloud & Offline PWA · Seluruh Hak Cipta Dilindungi
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation Bar (< 768px, height 56px <= 15% viewport cap) */}
      <nav
        aria-label="Navigasi Mobile Bawah"
        className={`md:hidden fixed bottom-0 inset-x-0 h-14 bg-white dark:bg-[#111827] border-t border-[#E2E8F0] dark:border-[#1E293B] grid ${
          navItems.length === 6 ? 'grid-cols-6' : 'grid-cols-5'
        } z-30`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'text-[#2563EB]'
                  : 'text-[#475569] dark:text-[#94A3B8]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Offline Status Banner */}
      <OfflineIndicator />

      {/* Mandatory Public Login Gate or Account Switch Modal */}
      <AuthGateModal
        isOpen={!userSession || isAuthModalOpen}
        isMandatoryGate={!userSession}
        currentSession={userSession}
        onClose={userSession ? () => setIsAuthModalOpen(false) : undefined}
        onAuthenticated={handleAuthenticated}
        onLogout={handleLogout}
      />
    </div>
  );
}
