/**
 * StudyOS Kelas 9 — Command Center View
 * Copyright (c) 2026 Hanif. All rights reserved.
 */
import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Clock,
  Brain,
  Pin,
  ArrowRight,
  Sparkles,
  MapPin,
} from 'lucide-react';
import {
  ActivityCategory,
  ActivityItem,
  ActivityPriority,
  CurriculumSubject,
  Flashcard,
  FormulaCard,
  ScheduleSlot,
  SchoolDay,
  SemesterNumber,
  StudyLog,
  TaskCategory,
  TaskItem,
  TaskPriority,
} from '../types/study';
import {
  addDaysToDateString,
  buildTomorrowAlertData,
  calculateActivityProgress,
  calculateTaskProgress,
  getChapterRecencyInfo,
  getChaptersForSubjectAndSemester,
  getTodayDateString,
  isFlashcardDueToday,
  resolveSubFormulas,
  sortActivitiesByPriority,
  sortTasksByPriorityMatrix,
} from '../utils/studyLogic';

interface CommandCenterViewProps {
  curriculum: CurriculumSubject[];
  tasks: TaskItem[];
  activities: ActivityItem[];
  schedule: ScheduleSlot[];
  flashcards: Flashcard[];
  formulas: FormulaCard[];
  studyLogs: StudyLog[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Omit<TaskItem, 'id' | 'createdAt' | 'completed'>) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleActivity: (activityId: string) => void;
  onAddActivity: (activity: Omit<ActivityItem, 'id' | 'createdAt' | 'completed'>) => void;
  onDeleteActivity: (activityId: string) => void;
  onAddScheduleSlot: (slot: Omit<ScheduleSlot, 'id'>) => void;
  onDeleteScheduleSlot: (slotId: string) => void;
  onNavigateTab: (tab: 'dashboard' | 'notes' | 'recall' | 'curriculum' | 'focus' | 'admin') => void;
}

const SCHOOL_DAYS: SchoolDay[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  'Les / Bimbel & Belajar Mandiri',
  'Ekstrakurikuler & Organisasi',
  'Ibadah, Olahraga & Rutinitas',
  'Acara Sekolah, Lomba & Pribadi',
];

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  curriculum,
  tasks,
  activities,
  schedule,
  flashcards,
  formulas,
  studyLogs,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  onToggleActivity,
  onAddActivity,
  onDeleteActivity,
  onAddScheduleSlot,
  onDeleteScheduleSlot,
  onNavigateTab,
}) => {
  // Side-by-side To-Do Mode Switcher: Academic Tasks vs Non-Homework Daily Activities
  const [todoTab, setTodoTab] = useState<'academic' | 'activities'>('academic');

  const [priorityFilter, setPriorityFilter] = useState<'ALL' | TaskPriority>('ALL');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  // Add Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSemester, setTaskSemester] = useState<SemesterNumber>(1);
  const [taskSubjectId, setTaskSubjectId] = useState<string>(curriculum[0]?.id || 'matematika');
  const [taskChapterId, setTaskChapterId] = useState<string>(
    curriculum[0]?.chapters[0]?.id || 'mtk-1-1'
  );
  const [taskDueDate, setTaskDueDate] = useState<string>(
    addDaysToDateString(getTodayDateString(), 1)
  );
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('PR');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('Urgent & Penting');
  const [taskFormError, setTaskFormError] = useState('');

  // Activity Filter & Add Activity Form State
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<'ALL' | ActivityCategory>(
    'ALL'
  );
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [actTitle, setActTitle] = useState('');
  const [actCategory, setActCategory] = useState<ActivityCategory>(
    'Les / Bimbel & Belajar Mandiri'
  );
  const [actPriority, setActPriority] = useState<ActivityPriority>('Wajib Hari Ini');
  const [actTimeSlot, setActTimeSlot] = useState('15:30 - 17:00');
  const [actDate, setActDate] = useState<string>(getTodayDateString());
  const [actLocation, setActLocation] = useState('');
  const [actFormError, setActFormError] = useState('');

  // Schedule customization state
  const [selectedTomorrowPreview, setSelectedTomorrowPreview] = useState<SchoolDay | undefined>(
    undefined
  );
  const [showAddScheduleForm, setShowAddScheduleForm] = useState(false);
  const [newSchedDay, setNewSchedDay] = useState<SchoolDay>('Senin');
  const [newSchedPeriod, setNewSchedPeriod] = useState('13:00 - 14:15');
  const [newSchedSubjectId, setNewSchedSubjectId] = useState(curriculum[0]?.id || 'matematika');
  const [newSchedRoom, setNewSchedRoom] = useState('R. 9A');

  const availableChapters = useMemo(
    () => getChaptersForSubjectAndSemester(curriculum, taskSubjectId, taskSemester),
    [curriculum, taskSubjectId, taskSemester]
  );

  const handleSubjectChange = (newSubjId: string) => {
    setTaskSubjectId(newSubjId);
    const chaps = getChaptersForSubjectAndSemester(curriculum, newSubjId, taskSemester);
    setTaskChapterId(chaps[0]?.id || '');
  };

  const handleSemesterChange = (sem: SemesterNumber) => {
    setTaskSemester(sem);
    const chaps = getChaptersForSubjectAndSemester(curriculum, taskSubjectId, sem);
    setTaskChapterId(chaps[0]?.id || '');
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setTaskFormError('Judul tugas wajib diisi.');
      return;
    }
    setTaskFormError('');
    onAddTask({
      title: taskTitle.trim(),
      subjectId: taskSubjectId,
      chapterId: taskChapterId || availableChapters[0]?.id || '',
      dueDate: taskDueDate,
      category: taskCategory,
      priority: taskPriority,
    });
    setTaskTitle('');
    setShowAddTaskModal(false);
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim()) {
      setActFormError('Nama kegiatan wajib diisi.');
      return;
    }
    setActFormError('');
    onAddActivity({
      title: actTitle.trim(),
      category: actCategory,
      priority: actPriority,
      timeSlot: actTimeSlot.trim() || '15:30 - 17:00',
      date: actDate,
      locationOrNote: actLocation.trim() || 'Sekolah / Rumah',
    });
    setActTitle('');
    setActLocation('');
    setShowAddActivityModal(false);
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedPeriod.trim()) return;
    onAddScheduleSlot({
      day: newSchedDay,
      period: newSchedPeriod.trim(),
      subjectId: newSchedSubjectId,
      roomOrNote: newSchedRoom.trim() || 'R. 9A',
    });
    setShowAddScheduleForm(false);
  };

  const progress = useMemo(() => calculateTaskProgress(tasks), [tasks]);
  const activityProgress = useMemo(() => calculateActivityProgress(activities), [activities]);

  const sortedTasks = useMemo(() => {
    const base = sortTasksByPriorityMatrix(tasks);
    if (priorityFilter === 'ALL') return base;
    return base.filter((t) => t.priority === priorityFilter);
  }, [tasks, priorityFilter]);

  const sortedActivities = useMemo(() => {
    const base = sortActivitiesByPriority(activities);
    if (activityCategoryFilter === 'ALL') return base;
    return base.filter((a) => a.category === activityCategoryFilter);
  }, [activities, activityCategoryFilter]);

  const tomorrowAlert = useMemo(
    () => buildTomorrowAlertData(schedule, tasks, curriculum, selectedTomorrowPreview),
    [schedule, tasks, curriculum, selectedTomorrowPreview]
  );

  const dueFlashcardsCount = useMemo(
    () => flashcards.filter((fc) => isFlashcardDueToday(fc)).length,
    [flashcards]
  );

  const staleChaptersCount = useMemo(() => {
    let count = 0;
    for (const subj of curriculum) {
      for (const ch of subj.chapters) {
        const info = getChapterRecencyInfo(ch.lastStudiedAt);
        if (info.level === 'stale') count++;
      }
    }
    return count;
  }, [curriculum]);

  const totalStudyMinutes = useMemo(
    () => studyLogs.reduce((acc, log) => acc + (log.durationMinutes || 0), 0),
    [studyLogs]
  );

  const pinnedFormulas = useMemo(
    () => formulas.filter((f) => f.isPinned).slice(0, 3),
    [formulas]
  );

  const getSubjectName = (subjectId: string) =>
    curriculum.find((s) => s.id === subjectId)?.name || subjectId;

  const getChapterTitle = (subjectId: string, chapterId: string) => {
    const subj = curriculum.find((s) => s.id === subjectId);
    return subj?.chapters.find((c) => c.id === chapterId)?.title || 'Bab Umum';
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Top KPI Summary Row: 2x2 compact grid on mobile, 4 cols on desktop */}
      <section aria-label="Ringkasan Produktivitas Harian" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Ketuntasan Harian (Tugas & Kegiatan) */}
        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#475569] dark:text-[#94A3B8]">
            <span className="font-medium">Ketuntasan Tugas & Kegiatan</span>
            <CheckSquare className="w-4 h-4 text-[#2563EB] shrink-0" />
          </div>
          <div className="my-2.5 sm:my-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#0F172A] dark:text-[#F8FAFC]">
                {progress.percentage}%
              </span>
              <span className="text-[11px] sm:text-xs font-mono tabular-nums text-[#475569] dark:text-[#94A3B8] truncate">
                Tugas {progress.completed}/{progress.total} · Agenda {activityProgress.completed}/{activityProgress.total}
              </span>
            </div>
            <div className="w-full h-2 bg-[#E2E8F0] dark:bg-[#1E293B] rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-[#16A34A] transition-transform duration-200 origin-left"
                style={{ transform: `scaleX(${progress.percentage / 100})` }}
              />
            </div>
          </div>
          <p className="text-[11px] sm:text-xs text-[#475569] dark:text-[#94A3B8]">
            <span className="font-mono tabular-nums font-semibold text-[#DC2626]">
              {progress.urgentPending}
            </span>{' '}
            PR Urgent &{' '}
            <span className="font-mono tabular-nums font-semibold text-[#2563EB]">
              {activityProgress.mandatoryPending}
            </span>{' '}
            Kegiatan Wajib
          </p>
        </div>

        {/* Card 2: Flashcard Due Today */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-3.5 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs text-[#475569] dark:text-[#94A3B8]">
            <span className="font-medium truncate">Flashcard Hari Ini</span>
            <Brain className="w-4 h-4 text-[#2563EB] shrink-0" />
          </div>
          <div className="my-2 sm:my-3">
            <span
              data-testid="dashboard-due-flashcards"
              className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-[#0F172A] dark:text-[#F8FAFC]"
            >
              {dueFlashcardsCount} Kartu
            </span>
            <p className="text-[11px] sm:text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5 line-clamp-1">
              Siap diuji Active Recall
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('recall')}
            className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-[#2563EB] hover:underline whitespace-nowrap shrink-0"
          >
            <span>Mulai Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Spaced Review Alert (>7 Days) */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-3.5 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs text-[#475569] dark:text-[#94A3B8]">
            <span className="font-medium truncate">Bab &gt;7 Hari</span>
            <BookOpen className="w-4 h-4 text-[#D97706] shrink-0" />
          </div>
          <div className="my-2 sm:my-3">
            <span className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-[#D97706]">
              {staleChaptersCount} Bab
            </span>
            <p className="text-[11px] sm:text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5 line-clamp-1">
              Perlu dipelajari ulang
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('curriculum')}
            className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-[#2563EB] hover:underline whitespace-nowrap shrink-0"
          >
            <span>Peta Kurikulum</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 4: Jam Belajar Focus Studio */}
        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#475569] dark:text-[#94A3B8]">
            <span className="font-medium">Total Waktu Fokus</span>
            <Clock className="w-4 h-4 text-[#16A34A] shrink-0" />
          </div>
          <div className="my-2 sm:my-3">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#0F172A] dark:text-[#F8FAFC]">
              {Math.floor(totalStudyMinutes / 60)}j {totalStudyMinutes % 60}m
            </span>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
              <span className="font-mono tabular-nums">{studyLogs.length}</span> sesi Deep Work tercatat
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('focus')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline whitespace-nowrap shrink-0"
          >
            <span>Buka Focus Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Main Split Grid: Left = Side-by-Side Tabs (Tugas Akademik vs Kegiatan Harian), Right = Smart Tomorrow Alert & Pinned Formulas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left 7 Cols: Dual To-Do List Hub (Tugas & PR Akademik + Agenda & Kegiatan Harian) */}
        <section className="lg:col-span-7 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-6 min-w-0">
          {/* Side-by-Side Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="grid grid-cols-2 sm:flex items-center gap-1 p-1 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setTodoTab('academic')}
                className={`min-h-[40px] px-2.5 sm:px-3.5 py-2 text-xs font-bold rounded-md transition-colors truncate ${
                  todoTab === 'academic'
                    ? 'bg-[#2563EB] text-white'
                    : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                <span className="sm:hidden">Tugas & PR ({tasks.length})</span>
                <span className="hidden sm:inline">Tugas & PR Akademik ({tasks.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setTodoTab('activities')}
                className={`min-h-[40px] px-2.5 sm:px-3.5 py-2 text-xs font-bold rounded-md transition-colors truncate ${
                  todoTab === 'activities'
                    ? 'bg-[#2563EB] text-white'
                    : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                <span className="sm:hidden">Kegiatan ({activities.length})</span>
                <span className="hidden sm:inline">Agenda & Kegiatan Harian ({activities.length})</span>
              </button>
            </div>

            {todoTab === 'academic' ? (
              <button
                type="button"
                onClick={() => setShowAddTaskModal((v) => !v)}
                className="w-full sm:w-auto min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Tugas / PR</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddActivityModal((v) => !v)}
                className="w-full sm:w-auto min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kegiatan Baru</span>
              </button>
            )}
          </div>

          {/* TAB 1: TUGAS & PR AKADEMIK */}
          {todoTab === 'academic' && (
            <>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Matriks Prioritas Tugas & PR Sekolah
                  </h2>
                  <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                    Urutan otomatis berdasarkan tingkat urgensi dan tenggat waktu terdekat
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-[#16A34A]">
                  {progress.completed}/{progress.total} Selesai ({progress.percentage}%)
                </span>
              </div>

              {/* Inline Add Task Form Drawer */}
              {showAddTaskModal && (
                <form
                  onSubmit={handleCreateTask}
                  className="mt-4 p-4 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      Buat Tugas / PR Baru
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddTaskModal(false)}
                      className="text-xs text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
                    >
                      Tutup
                    </button>
                  </div>

                  {taskFormError && (
                    <p className="text-xs font-medium text-[#DC2626]">{taskFormError}</p>
                  )}

                  <div>
                    <label
                      htmlFor="task-title-input"
                      className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
                    >
                      Judul Tugas / PR
                    </label>
                    <input
                      id="task-title-input"
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="Contoh: PR Latihan Soal Kesebangunan Segitiga Hal. 214"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label
                        htmlFor="task-sem-select"
                        className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
                      >
                        Semester
                      </label>
                      <select
                        id="task-sem-select"
                        value={taskSemester}
                        onChange={(e) => handleSemesterChange(Number(e.target.value) as SemesterNumber)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
                      >
                        <option value={1}>Semester 1 (Gasal)</option>
                        <option value={2}>Semester 2 (Genap)</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="task-subj-select"
                        className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
                      >
                        Mata Pelajaran
                      </label>
                      <select
                        id="task-subj-select"
                        value={taskSubjectId}
                        onChange={(e) => handleSubjectChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
                      >
                        {curriculum.map((subj) => (
                          <option key={subj.id} value={subj.id}>
                            {subj.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="task-chap-select"
                        className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
                      >
                        Bab Terkait
                      </label>
                      <select
                        id="task-chap-select"
                        value={taskChapterId}
                        onChange={(e) => setTaskChapterId(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
                      >
                        {availableChapters.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            Bab {ch.number}: {ch.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label
                        htmlFor="task-cat-select"
                        className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
                      >
                        Kategori Tugas
                      </label>
                      <select
                        id="task-cat-select"
                        value={taskCategory}
                        onChange={(e) => setTaskCategory(e.target.value as TaskCategory)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
                      >
                        <option value="PR">PR (Pekerjaan Rumah)</option>
                        <option value="Latihan Soal">Latihan Soal</option>
                        <option value="Proyek">Proyek / Praktikum</option>
                        <option value="Hafalan">Hafalan</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="task-prio-select"
                        className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
                      >
                        Matriks Prioritas
                      </label>
                      <select
                        id="task-prio-select"
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
                      >
                        <option value="Urgent & Penting">Urgent & Penting</option>
                        <option value="Penting / Tidak Urgent">Penting / Tidak Urgent</option>
                        <option value="Cicil Santai">Cicil Santai</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="task-due-input"
                        className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
                      >
                        Tenggat Waktu
                      </label>
                      <input
                        id="task-due-input"
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddTaskModal(false)}
                      className="px-4 py-2 text-xs font-medium text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-md"
                    >
                      Simpan Tugas
                    </button>
                  </div>
                </form>
              )}

              {/* Interactive Filter Controls (Horizontal Scrollable Bar on Mobile) */}
              <div className="flex overflow-x-auto no-scrollbar items-center gap-1 p-1 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg mt-4 max-w-full">
                {(['ALL', 'Urgent & Penting', 'Penting / Tidak Urgent', 'Cicil Santai'] as const).map(
                  (prio) => (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => setPriorityFilter(prio)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        priorityFilter === prio
                          ? 'bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] shadow-xs border border-[#E2E8F0] dark:border-[#1E293B]'
                          : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                      }`}
                    >
                      {prio === 'ALL' ? 'Semua Prioritas' : prio}
                    </button>
                  )
                )}
              </div>

              {/* Task Items List */}
              <div className="mt-4 divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                {sortedTasks.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-[#475569] dark:text-[#94A3B8]">
                      Tidak ada tugas pada filter prioritas ini.
                    </p>
                  </div>
                ) : (
                  sortedTasks.map((task) => {
                    const prioColor =
                      task.priority === 'Urgent & Penting'
                        ? 'text-[#DC2626]'
                        : task.priority === 'Penting / Tidak Urgent'
                        ? 'text-[#D97706]'
                        : 'text-[#16A34A]';

                    return (
                      <div
                        key={task.id}
                        className={`py-3.5 flex items-start justify-between gap-3 transition-opacity ${
                          task.completed ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => onToggleTask(task.id)}
                            aria-label={`Tandai selesai ${task.title}`}
                            className="mt-0.5 text-[#475569] dark:text-[#94A3B8] hover:text-[#2563EB] shrink-0"
                          >
                            {task.completed ? (
                              <CheckSquare className="w-5 h-5 text-[#16A34A]" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <p
                              className={`text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] ${
                                task.completed ? 'line-through' : ''
                              }`}
                            >
                              {task.title}
                            </p>
                            {/* Clean unboxed metadata with typographic separators */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                              <span className={`font-semibold ${prioColor}`}>{task.priority}</span>
                              <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                                · {getSubjectName(task.subjectId)}
                              </span>
                              <span className="truncate max-w-[200px]">
                                · {getChapterTitle(task.subjectId, task.chapterId)}
                              </span>
                              <span>· {task.category}</span>
                              <span className="font-mono tabular-nums">· Tenggat: {task.dueDate}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          aria-label={`Hapus tugas ${task.title}`}
                          className="text-[#475569] dark:text-[#94A3B8] hover:text-[#DC2626] p-1 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* TAB 2: AGENDA & KEGIATAN HARIAN (NON-HOMEWORK TO-DO LIST) */}
          {todoTab === 'activities' && (
            <>
              {/* Activity Header & Daily Completion Bar */}
              <div className="mt-4 p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#2563EB]" />
                    <div>
                      <h2 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        To-Do List Kegiatan Harian (Di Luar Tugas & PR Sekolah)
                      </h2>
                      <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                        Kelola jadwal Les/Bimbel, Ekstrakurikuler & OSIS, Ibadah & Olahraga, serta Acara Pribadi
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-sm font-bold text-[#16A34A]">
                      {activityProgress.percentage}%
                    </span>
                    <span className="text-xs text-[#475569] dark:text-[#94A3B8] ml-1.5">
                      ({activityProgress.completed}/{activityProgress.total} Kegiatan Tuntas)
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-[#E2E8F0] dark:bg-[#1E293B] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2563EB] transition-transform duration-200 origin-left"
                    style={{ transform: `scaleX(${activityProgress.percentage / 100})` }}
                  />
                </div>
              </div>

              {/* Inline Add Activity Form Drawer */}
              {showAddActivityModal && (
                <form
                  onSubmit={handleCreateActivity}
                  className="mt-4 p-4 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      Tambah Kegiatan Harian Baru
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddActivityModal(false)}
                      className="text-xs text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
                    >
                      Tutup
                    </button>
                  </div>

                  {actFormError && (
                    <p className="text-xs font-medium text-[#DC2626]">{actFormError}</p>
                  )}

                  <div>
                    <label
                      htmlFor="act-title-input"
                      className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
                    >
                      Nama Kegiatan
                    </label>
                    <input
                      id="act-title-input"
                      type="text"
                      value={actTitle}
                      onChange={(e) => setActTitle(e.target.value)}
                      placeholder="Contoh: Les Privat Matematika / Latihan Basket / Rapat OSIS"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="act-cat-select"
                        className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
                      >
                        Kategori Kegiatan
                      </label>
                      <select
                        id="act-cat-select"
                        value={actCategory}
                        onChange={(e) => setActCategory(e.target.value as ActivityCategory)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
                      >
                        {ACTIVITY_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="act-prio-select"
                        className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
                      >
                        Prioritas Kegiatan
                      </label>
                      <select
                        id="act-prio-select"
                        value={actPriority}
                        onChange={(e) => setActPriority(e.target.value as ActivityPriority)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
                      >
                        <option value="Wajib Hari Ini">Wajib Hari Ini</option>
                        <option value="Rutin Harian">Rutin Harian</option>
                        <option value="Fleksibel">Fleksibel</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label
                        htmlFor="act-time-input"
                        className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
                      >
                        Waktu / Jam Pelaksanaan
                      </label>
                      <input
                        id="act-time-input"
                        type="text"
                        value={actTimeSlot}
                        onChange={(e) => setActTimeSlot(e.target.value)}
                        placeholder="15:30 - 17:00"
                        className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="act-date-input"
                        className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
                      >
                        Tanggal Kegiatan
                      </label>
                      <input
                        id="act-date-input"
                        type="date"
                        value={actDate}
                        onChange={(e) => setActDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="act-loc-input"
                        className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
                      >
                        Lokasi / Catatan
                      </label>
                      <input
                        id="act-loc-input"
                        type="text"
                        value={actLocation}
                        onChange={(e) => setActLocation(e.target.value)}
                        placeholder="Lapangan Sekolah / Ruang Bimbel"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddActivityModal(false)}
                      className="px-4 py-2 text-xs font-medium text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-md"
                    >
                      Simpan Kegiatan
                    </button>
                  </div>
                </form>
              )}

              {/* Activity Category Filter Bar (Horizontal Scrollable on Mobile) */}
              <div className="flex overflow-x-auto no-scrollbar items-center gap-1 p-1 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg mt-4 max-w-full">
                <button
                  type="button"
                  onClick={() => setActivityCategoryFilter('ALL')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activityCategoryFilter === 'ALL'
                      ? 'bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] shadow-xs border border-[#E2E8F0] dark:border-[#1E293B]'
                      : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  Semua Kegiatan ({activities.length})
                </button>
                {ACTIVITY_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActivityCategoryFilter(cat)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      activityCategoryFilter === cat
                        ? 'bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] shadow-xs border border-[#E2E8F0] dark:border-[#1E293B]'
                        : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Activity Items List */}
              <div className="mt-4 divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                {sortedActivities.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-[#475569] dark:text-[#94A3B8]">
                      Belum ada kegiatan pada kategori ini. Klik &ldquo;Tambah Kegiatan Baru&rdquo; di atas.
                    </p>
                  </div>
                ) : (
                  sortedActivities.map((act) => {
                    const prioColor =
                      act.priority === 'Wajib Hari Ini'
                        ? 'text-[#DC2626]'
                        : act.priority === 'Rutin Harian'
                        ? 'text-[#2563EB]'
                        : 'text-[#16A34A]';

                    return (
                      <div
                        key={act.id}
                        className={`py-3.5 flex items-start justify-between gap-3 transition-opacity ${
                          act.completed ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => onToggleActivity(act.id)}
                            aria-label={`Tandai selesai kegiatan ${act.title}`}
                            className="mt-0.5 text-[#475569] dark:text-[#94A3B8] hover:text-[#2563EB] shrink-0"
                          >
                            {act.completed ? (
                              <CheckSquare className="w-5 h-5 text-[#16A34A]" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <p
                              className={`text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] ${
                                act.completed ? 'line-through' : ''
                              }`}
                            >
                              {act.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                              <span className={`font-semibold ${prioColor}`}>{act.priority}</span>
                              <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                                · {act.category}
                              </span>
                              <span className="font-mono tabular-nums text-[#2563EB] dark:text-blue-400">
                                · ⏰ {act.timeSlot}
                              </span>
                              {act.locationOrNote && (
                                <span className="inline-flex items-center gap-0.5">
                                  · <MapPin className="w-3 h-3 inline" /> {act.locationOrNote}
                                </span>
                              )}
                              <span className="font-mono tabular-nums">· {act.date}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onDeleteActivity(act.id)}
                          aria-label={`Hapus kegiatan ${act.title}`}
                          className="text-[#475569] dark:text-[#94A3B8] hover:text-[#DC2626] p-1 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>

        {/* Right 5 Cols: Smart Tomorrow Alert + Pinned Formula Cheat-Sheet */}
        <div className="lg:col-span-5 space-y-5 sm:space-y-6 min-w-0">
          {/* Smart Tomorrow Alert Widget */}
          <section
            aria-label="Auto-Reminder Jadwal Besok"
            className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#2563EB] shrink-0" />
                  <h2 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Smart Tomorrow Alert ({tomorrowAlert.tomorrowDay})
                  </h2>
                </div>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
                  Deteksi otomatis jadwal besok & peringatan PR yang belum tuntas
                </p>
              </div>

              <select
                aria-label="Pilih hari jadwal untuk dipratinjau"
                value={tomorrowAlert.tomorrowDay}
                onChange={(e) => setSelectedTomorrowPreview(e.target.value as SchoolDay)}
                className="px-2.5 py-1.5 text-xs font-medium bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
              >
                {SCHOOL_DAYS.map((d) => (
                  <option key={d} value={d}>
                    Hari {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Summary Banner */}
            <div className="mt-4 p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-3">
              {tomorrowAlert.totalPendingForTomorrow > 0 ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0" />
                  <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC]">
                    Perhatian: Ada{' '}
                    <span className="font-mono font-bold text-[#D97706]">
                      {tomorrowAlert.totalPendingForTomorrow} PR/Tugas
                    </span>{' '}
                    yang belum selesai untuk mata pelajaran hari{' '}
                    <span className="font-semibold">{tomorrowAlert.tomorrowDay}</span>!
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
                  <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC]">
                    Aman! Seluruh tugas untuk mata pelajaran hari{' '}
                    <span className="font-semibold">{tomorrowAlert.tomorrowDay}</span> sudah tuntas.
                  </p>
                </>
              )}
            </div>

            {/* Tomorrow's Subjects & Pending Tasks */}
            <div className="mt-4 divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
              {tomorrowAlert.items.map((item) => (
                <div key={item.slot.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {item.subjectName}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-[#475569] dark:text-[#94A3B8] shrink-0">
                      {item.slot.period} · {item.slot.roomOrNote || 'R. 9A'}
                    </span>
                  </div>

                  {item.pendingTasks.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                      {item.pendingTasks.map((pt) => (
                        <div
                          key={pt.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] truncate">
                              Belum Selesai: {pt.title}
                            </p>
                            <p className="text-[11px] font-mono text-[#D97706]">
                              {pt.category} · Tenggat {pt.dueDate}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onToggleTask(pt.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded text-[#16A34A] hover:underline whitespace-nowrap shrink-0"
                          >
                            Selesaikan
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#16A34A] mt-1">
                      ✓ Tidak ada tanggungan PR/Tugas
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Pinned Formula & Cheat-Sheet Quick Access */}
          <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <div className="flex items-center gap-2 min-w-0">
                <Pin className="w-4 h-4 text-[#2563EB] shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                  Rumus Kilat Tersemat (Pinned)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('recall')}
                className="text-xs font-semibold text-[#2563EB] hover:underline whitespace-nowrap shrink-0"
              >
                Lihat Semua
              </button>
            </div>

            <div className="mt-3 divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
              {pinnedFormulas.map((form) => {
                const subItems = resolveSubFormulas(form);
                return (
                  <div key={form.id} className="py-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#475569] dark:text-[#94A3B8]">
                      <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        {form.title} :
                      </span>
                      <span className="shrink-0">{getSubjectName(form.subjectId)}</span>
                    </div>
                    <div className="mt-1.5 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                      {subItems.map((sf, idx) => (
                        <div
                          key={`${form.id}-pin-sf-${idx}`}
                          className="px-3 py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2 text-xs"
                        >
                          <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                            {sf.target} :
                          </span>
                          <span className="font-mono font-bold text-[#2563EB] dark:text-blue-400 break-words">
                            {sf.expr}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Full Monday-Saturday Class Schedule Table */}
      <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Jadwal Pelajaran Kelas 9 (Senin – Sabtu)
            </h2>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
              Terhubung otomatis dengan pengingat tugas harian dan Smart Tomorrow Alert
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddScheduleForm((v) => !v)}
            className="w-full sm:w-auto min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Jam Pelajaran</span>
          </button>
        </div>

        {showAddScheduleForm && (
          <form
            onSubmit={handleCreateSchedule}
            className="mt-4 p-4 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1">
                Hari
              </label>
              <select
                value={newSchedDay}
                onChange={(e) => setNewSchedDay(e.target.value as SchoolDay)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
              >
                {SCHOOL_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1">
                Jam Pelajaran
              </label>
              <input
                type="text"
                value={newSchedPeriod}
                onChange={(e) => setNewSchedPeriod(e.target.value)}
                placeholder="07:00 - 08:30"
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1">
                Mata Pelajaran
              </label>
              <select
                value={newSchedSubjectId}
                onChange={(e) => setNewSchedSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
              >
                {curriculum.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1">
                Ruang / Catatan
              </label>
              <input
                type="text"
                value={newSchedRoom}
                onChange={(e) => setNewSchedRoom(e.target.value)}
                placeholder="R. 9A / Lab"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-md"
            >
              Simpan Jadwal
            </button>
          </form>
        )}

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SCHOOL_DAYS.map((day) => {
            const slots = schedule.filter((s) => s.day === day);
            return (
              <div
                key={day}
                className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-4 bg-[#F8FAFC]/50 dark:bg-[#090D16]/50"
              >
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{day}</h3>
                  <span className="text-xs font-mono text-[#475569] dark:text-[#94A3B8]">
                    {slots.length} Mapel
                  </span>
                </div>
                <div className="space-y-2">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between gap-2 text-xs py-1"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                          {getSubjectName(slot.subjectId)}
                        </p>
                        <p className="font-mono text-[11px] text-[#475569] dark:text-[#94A3B8]">
                          {slot.period} · {slot.roomOrNote || 'R. 9A'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteScheduleSlot(slot.id)}
                        aria-label={`Hapus jadwal ${getSubjectName(slot.subjectId)} hari ${day}`}
                        className="text-[#475569] dark:text-[#94A3B8] hover:text-[#DC2626] p-1 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
