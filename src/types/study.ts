/**
 * StudyOS Kelas 9 — Type Definitions
 * Copyright (c) 2026 Hanif. All rights reserved.
 */
export type MasteryStatus = 'Belum Belajar' | 'Masih Bingung' | 'Paham' | 'Siap Ujian';

export type SemesterNumber = 1 | 2;

export interface CurriculumChapter {
  id: string;
  subjectId: string;
  semester: SemesterNumber;
  number: number;
  title: string;
  mastery: MasteryStatus;
  lastStudiedAt: string | null; // ISO Date string
  notesCount?: number;
  flashcardsCount?: number;
}

export interface CurriculumSubject {
  id: string;
  name: string;
  shortCode: string;
  teacher?: string;
  chapters: CurriculumChapter[];
}

export type TaskCategory = 'PR' | 'Latihan Soal' | 'Proyek' | 'Hafalan';

export type TaskPriority = 'Urgent & Penting' | 'Penting / Tidak Urgent' | 'Cicil Santai';

export interface TaskItem {
  id: string;
  title: string;
  subjectId: string;
  chapterId: string;
  dueDate: string; // YYYY-MM-DD
  category: TaskCategory;
  priority: TaskPriority;
  completed: boolean;
  createdAt: string;
}

export type ActivityCategory =
  | 'Les / Bimbel & Belajar Mandiri'
  | 'Ekstrakurikuler & Organisasi'
  | 'Ibadah, Olahraga & Rutinitas'
  | 'Acara Sekolah, Lomba & Pribadi';

export type ActivityPriority = 'Wajib Hari Ini' | 'Rutin Harian' | 'Fleksibel';

export interface ActivityItem {
  id: string;
  title: string;
  category: ActivityCategory;
  priority: ActivityPriority;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g., "15:30 - 17:00"
  locationOrNote: string; // e.g., "Lapangan Basket / Ruang OSIS"
  completed: boolean;
  createdAt: string;
}

export type SchoolDay = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';

export interface ScheduleSlot {
  id: string;
  day: SchoolDay;
  period: string; // e.g., "07:00 - 08:20"
  subjectId: string;
  roomOrNote?: string;
}

export interface PhotoNote {
  id: string;
  semester: SemesterNumber;
  subjectId: string;
  chapterId: string;
  title: string;
  images: string[]; // Compressed WebP/JPEG data URLs stored in IndexedDB
  keyPoints: string; // Cornell left column: Poin Kunci / Pertanyaan Penting
  summary: string; // Cornell bottom column: Kesimpulan Inti (Summary 3 Kalimat)
  createdAt: string;
  updatedAt: string;
  compressionStats?: {
    originalKB: number;
    compressedKB: number;
    width: number;
    height: number;
    format: string;
  };
}

export type FlashcardSelfEval = 'lupa' | 'ragu' | 'hafal';

export interface Flashcard {
  id: string;
  semester: SemesterNumber;
  subjectId: string;
  chapterId: string;
  front: string;
  back: string;
  dueDate: string; // YYYY-MM-DD
  intervalDays: number;
  reviewCount: number;
  lastReviewedAt: string | null;
  sourceNoteId?: string;
}

export interface FormulaSubItem {
  target: string; // e.g., "Mencari Luas (L)"
  expr: string; // e.g., "s × s  (atau s²)"
}

export interface FormulaCard {
  id: string;
  semester: SemesterNumber;
  subjectId: string;
  chapterId: string;
  title: string;
  formula: string;
  subFormulas?: FormulaSubItem[];
  variables: string;
  steps?: string;
  examTip?: string;
  example: string;
  isPinned: boolean;
}

export type MistakeErrorType =
  | 'Salah Rumus'
  | 'Kurang Teliti'
  | 'Salah Konsep'
  | 'Lupa Langkah';

export interface MistakeLog {
  id: string;
  semester: SemesterNumber;
  subjectId: string;
  chapterId: string;
  questionTitle: string;
  imageDataUrl: string; // Compressed photo of the question/work
  errorType: MistakeErrorType;
  errorDetail: string;
  correctSolution: string;
  createdAt: string;
}

export interface GradeAssessmentItem {
  id: string;
  label: string;
  type: 'Tugas' | 'UH' | 'PTS' | 'PAS';
  score: number;
  date: string;
}

export interface SubjectGradeRecord {
  id: string; // matches subjectId
  subjectId: string;
  semester: SemesterNumber;
  targetGrade: number; // e.g., 90
  assessments: GradeAssessmentItem[];
}

export interface StudyLog {
  id: string;
  subjectId: string;
  chapterId: string;
  mode: 'Pomodoro 25/5' | 'Deep Work 50/10';
  durationMinutes: number;
  completedAt: string;
}

export interface FullDatabaseDump {
  version: number;
  exportedAt: string;
  curriculum: CurriculumSubject[];
  tasks: TaskItem[];
  activities?: ActivityItem[];
  schedule: ScheduleSlot[];
  notes: PhotoNote[];
  flashcards: Flashcard[];
  formulas: FormulaCard[];
  mistakes: MistakeLog[];
  grades: SubjectGradeRecord[];
  studyLogs: StudyLog[];
}

export type UserRole = 'student' | 'admin';

export interface UserSession {
  accountId: string; // e.g. '628123456789' or 'admin'
  role: UserRole;
  phone: string;
  displayName: string;
  loginAt: string;
  expiresAt?: string;
  integritySignature?: string;
}

export interface FonnteConfig {
  token: string;
  otpTemplate: string;
  updatedAt: string;
}

export interface RegisteredUserSummary {
  accountId: string;
  phone: string;
  displayName: string;
  role: UserRole;
  tasksCount: number;
  activitiesCount: number;
  notesCount: number;
  lastSyncedAt: string;
}

export interface OtpVerificationLog {
  id: string;
  phone: string;
  displayName: string;
  otpCode: string;
  deliveryMethod: 'fonnte_wa' | 'fallback_screen';
  status: string;
  createdAt: string;
}


