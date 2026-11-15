/**
 * StudyOS Kelas 9 — Core Study & Formula Calculation Logic
 * Copyright (c) 2026 Hanif. All rights reserved.
 */
import {
  ActivityItem,
  ActivityPriority,
  CurriculumChapter,
  CurriculumSubject,
  Flashcard,
  FlashcardSelfEval,
  FormulaCard,
  FormulaSubItem,
  ScheduleSlot,
  SchoolDay,
  SubjectGradeRecord,
  TaskItem,
  TaskPriority,
} from '../types/study';

export function getTodayDateString(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDateString(baseDateStr: string, daysToAdd: number): string {
  const parts = baseDateStr.split('-').map(Number);
  const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  d.setDate(d.getDate() + daysToAdd);
  return getTodayDateString(d);
}

export function getDaysSinceLastStudied(
  lastStudiedAt: string | null,
  now: Date = new Date()
): number | null {
  if (!lastStudiedAt) return null;
  const studiedDate = new Date(lastStudiedAt);
  if (Number.isNaN(studiedDate.getTime())) return null;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfStudied = new Date(
    studiedDate.getFullYear(),
    studiedDate.getMonth(),
    studiedDate.getDate()
  );

  const diffMs = startOfToday.getTime() - startOfStudied.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

export type ChapterRecencyLevel = 'recent' | 'moderate' | 'stale' | 'never';

export interface ChapterRecencyInfo {
  daysAgo: number | null;
  level: ChapterRecencyLevel;
  label: string;
  needsReview: boolean;
}

export function getChapterRecencyInfo(
  lastStudiedAt: string | null,
  now: Date = new Date()
): ChapterRecencyInfo {
  const days = getDaysSinceLastStudied(lastStudiedAt, now);
  if (days === null) {
    return {
      daysAgo: null,
      level: 'never',
      label: 'Belum pernah disentuh',
      needsReview: true,
    };
  }
  if (days === 0) {
    return {
      daysAgo: 0,
      level: 'recent',
      label: 'Dipelajari hari ini',
      needsReview: false,
    };
  }
  if (days <= 4) {
    return {
      daysAgo: days,
      level: 'recent',
      label: `Terakhir dipelajari ${days} hari lalu`,
      needsReview: false,
    };
  }
  if (days <= 7) {
    return {
      daysAgo: days,
      level: 'moderate',
      label: `Terakhir dipelajari ${days} hari lalu`,
      needsReview: true,
    };
  }
  return {
    daysAgo: days,
    level: 'stale',
    label: `Terakhir dipelajari ${days} hari lalu (>7 hari)`,
    needsReview: true,
  };
}

export function evaluateFlashcardReview(
  card: Flashcard,
  evaluation: FlashcardSelfEval,
  todayStr: string = getTodayDateString()
): Flashcard {
  let intervalDays = 0;
  if (evaluation === 'lupa') {
    intervalDays = 0; // Ulangi Hari Ini
  } else if (evaluation === 'ragu') {
    intervalDays = 1; // Ulangi Besok
  } else if (evaluation === 'hafal') {
    intervalDays = 4; // Ulangi 4 Hari Lagi
  }

  const nextDueDate = addDaysToDateString(todayStr, intervalDays);

  return {
    ...card,
    dueDate: nextDueDate,
    intervalDays,
    reviewCount: (card.reviewCount || 0) + 1,
    lastReviewedAt: new Date().toISOString(),
  };
}

export function isFlashcardDueToday(
  card: Flashcard,
  todayStr: string = getTodayDateString()
): boolean {
  return card.dueDate <= todayStr;
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  'Urgent & Penting': 1,
  'Penting / Tidak Urgent': 2,
  'Cicil Santai': 3,
};

export function sortTasksByPriorityMatrix(tasks: TaskItem[]): TaskItem[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    const weightA = PRIORITY_WEIGHT[a.priority] ?? 99;
    const weightB = PRIORITY_WEIGHT[b.priority] ?? 99;
    if (weightA !== weightB) {
      return weightA - weightB;
    }
    return a.dueDate.localeCompare(b.dueDate);
  });
}

export interface TaskProgressSummary {
  total: number;
  completed: number;
  pending: number;
  percentage: number;
  urgentPending: number;
}

export function calculateTaskProgress(tasks: TaskItem[]): TaskProgressSummary {
  const total = tasks.length;
  if (total === 0) {
    return { total: 0, completed: 0, pending: 0, percentage: 0, urgentPending: 0 };
  }
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const percentage = Math.round((completed / total) * 100);
  const urgentPending = tasks.filter(
    (t) => !t.completed && t.priority === 'Urgent & Penting'
  ).length;

  return {
    total,
    completed,
    pending,
    percentage,
    urgentPending,
  };
}

export function getTomorrowSchoolDay(now: Date = new Date()): {
  dayName: SchoolDay;
  isWeekendJump: boolean;
} {
  // JS getDay(): 0 = Minggu, 1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat, 6 = Sabtu
  const currentDayIndex = now.getDay();
  // Tomorrow's day index (0..6)
  const tomorrowIndex = (currentDayIndex + 1) % 7;

  const map: Record<number, SchoolDay> = {
    0: 'Senin', // If tomorrow is Sunday, show Monday's schedule for school preparation
    1: 'Senin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Kamis',
    5: 'Jumat',
    6: 'Sabtu',
  };

  return {
    dayName: map[tomorrowIndex] || 'Senin',
    isWeekendJump: tomorrowIndex === 0,
  };
}

export interface TomorrowSubjectAlert {
  slot: ScheduleSlot;
  subjectName: string;
  pendingTasks: TaskItem[];
}

export interface TomorrowAlertSummary {
  tomorrowDay: SchoolDay;
  isWeekendJump: boolean;
  items: TomorrowSubjectAlert[];
  totalPendingForTomorrow: number;
}

export function buildTomorrowAlertData(
  schedule: ScheduleSlot[],
  tasks: TaskItem[],
  subjects: CurriculumSubject[],
  overrideDay?: SchoolDay,
  now: Date = new Date()
): TomorrowAlertSummary {
  const resolved = getTomorrowSchoolDay(now);
  const tomorrowDay = overrideDay || resolved.dayName;
  const daySlots = schedule.filter((s) => s.day === tomorrowDay);
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

  const items: TomorrowSubjectAlert[] = daySlots.map((slot) => {
    const pendingTasks = tasks.filter(
      (t) => !t.completed && t.subjectId === slot.subjectId
    );
    return {
      slot,
      subjectName: subjectMap.get(slot.subjectId) || slot.subjectId,
      pendingTasks,
    };
  });

  // Deduplicate pending task counts across multiple slots of the same subject
  const uniqueSubjectIds = new Set(daySlots.map((s) => s.subjectId));
  const totalPendingForTomorrow = tasks.filter(
    (t) => !t.completed && uniqueSubjectIds.has(t.subjectId)
  ).length;

  return {
    tomorrowDay,
    isWeekendJump: overrideDay ? false : resolved.isWeekendJump,
    items,
    totalPendingForTomorrow,
  };
}

export interface GradeSimulationResult {
  tugasAvg: number | null;
  uhAvg: number | null;
  ptsScore: number | null;
  pasScore: number | null;
  currentAverage: number;
  targetGrade: number;
  gapToTarget: number;
  requiredNextScore: number;
  status: 'achieved' | 'reachable' | 'challenging' | 'no-data';
  recommendationText: string;
}

/**
 * Calculates current average and simulates the minimum required score on the next exam/assessment
 * to reach the Target Nilai Rapor.
 * Weighting model:
 * Each logged assessment contributes to the current average, and we also calculate component averages
 * (Tugas 25%, UH 35%, PTS 20%, PAS 20% when complete, or dynamic weighted projection for remaining components).
 */
export function calculateSubjectGradeSimulation(
  record: SubjectGradeRecord
): GradeSimulationResult {
  const assessments = record.assessments || [];
  const target = record.targetGrade || 90;

  if (assessments.length === 0) {
    return {
      tugasAvg: null,
      uhAvg: null,
      ptsScore: null,
      pasScore: null,
      currentAverage: 0,
      targetGrade: target,
      gapToTarget: target,
      requiredNextScore: target,
      status: 'no-data',
      recommendationText: `Belum ada nilai tercatat. Capai minimal ${target} di ujian pertama untuk mengamankan target rapor.`,
    };
  }

  const tugasList = assessments.filter((a) => a.type === 'Tugas').map((a) => a.score);
  const uhList = assessments.filter((a) => a.type === 'UH').map((a) => a.score);
  const ptsList = assessments.filter((a) => a.type === 'PTS').map((a) => a.score);
  const pasList = assessments.filter((a) => a.type === 'PAS').map((a) => a.score);

  const avg = (arr: number[]) =>
    arr.length > 0
      ? Number((arr.reduce((sum, val) => sum + val, 0) / arr.length).toFixed(1))
      : null;

  const tugasAvg = avg(tugasList);
  const uhAvg = avg(uhList);
  const ptsScore = avg(ptsList);
  const pasScore = avg(pasList);

  const totalScoreSum = assessments.reduce((sum, item) => sum + item.score, 0);
  const count = assessments.length;
  const currentAverage = Number((totalScoreSum / count).toFixed(1));

  // Minimum score needed on the NEXT single exam (n + 1) so that the new average >= targetGrade:
  // (totalScoreSum + nextScore) / (count + 1) = target
  const rawRequiredNext = target * (count + 1) - totalScoreSum;
  const requiredNextScore = Number(Math.max(0, rawRequiredNext).toFixed(1));
  const gapToTarget = Number((target - currentAverage).toFixed(1));

  let status: GradeSimulationResult['status'] = 'reachable';
  let recommendationText = '';

  if (currentAverage >= target && requiredNextScore <= currentAverage) {
    status = 'achieved';
    recommendationText = `Rata-rata saat ini (${currentAverage}) sudah melampaui Target ${target}. Pertahankan minimal nilai ${Math.max(70, requiredNextScore)} di ujian berikutnya.`;
  } else if (requiredNextScore <= 100) {
    status = 'reachable';
    recommendationText = `Butuh minimal nilai ${requiredNextScore} pada ujian/tugas berikutnya untuk langsung mencapai rata-rata Target ${target}.`;
  } else {
    status = 'challenging';
    const twoExamsNeeded = Number(
      ((target * (count + 2) - totalScoreSum) / 2).toFixed(1)
    );
    recommendationText = `Untuk mengejar Target ${target},1 ujian saja butuh ${requiredNextScore} (>100). Kejar rata-rata ${Math.min(100, twoExamsNeeded)} di 2 ujian berikutnya.`;
  }

  return {
    tugasAvg,
    uhAvg,
    ptsScore,
    pasScore,
    currentAverage,
    targetGrade: target,
    gapToTarget,
    requiredNextScore,
    status,
    recommendationText,
  };
}

export function getChaptersForSubjectAndSemester(
  subjects: CurriculumSubject[],
  subjectId: string,
  semester: 1 | 2
): CurriculumChapter[] {
  const subject = subjects.find((s) => s.id === subjectId);
  if (!subject) return [];
  return subject.chapters
    .filter((ch) => ch.semester === semester)
    .sort((a, b) => a.number - b.number);
}

export type CurvedSolidType = 'tabung' | 'kerucut' | 'bola';

export interface FormulaFilterOptions {
  semester?: 'ALL' | 1 | 2;
  subjectId?: string;
  chapterId?: string;
  pinnedOnly?: boolean;
  searchQuery?: string;
}

export interface FormulaChapterGroup {
  groupKey: string;
  semester: 1 | 2;
  subjectId: string;
  subjectName: string;
  subjectShortCode: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  formulas: FormulaCard[];
  items: FormulaCard[];
}

export function parseFormulaTextToSubItems(formulaText: string): FormulaSubItem[] {
  const lines = formulaText
    .split(/\n|\|/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [{ target: 'Rumus Utama', expr: formulaText.trim() }];
  }

  return lines.map((line, idx) => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && colonIdx < line.length - 1) {
      return {
        target: line.slice(0, colonIdx).trim(),
        expr: line.slice(colonIdx + 1).trim(),
      };
    }
    return {
      target: lines.length === 1 ? 'Mencari Nilai / Rumus' : `Rumus ${idx + 1}`,
      expr: line,
    };
  });
}

export function resolveSubFormulas(item: FormulaCard): FormulaSubItem[] {
  if (item.subFormulas && item.subFormulas.length > 0) {
    return item.subFormulas;
  }
  return parseFormulaTextToSubItems(item.formula);
}

const ACTIVITY_PRIORITY_WEIGHT: Record<ActivityPriority, number> = {
  'Wajib Hari Ini': 1,
  'Rutin Harian': 2,
  Fleksibel: 3,
};

export function sortActivitiesByPriority(activities: ActivityItem[]): ActivityItem[] {
  return [...activities].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    const weightA = ACTIVITY_PRIORITY_WEIGHT[a.priority] ?? 99;
    const weightB = ACTIVITY_PRIORITY_WEIGHT[b.priority] ?? 99;
    if (weightA !== weightB) {
      return weightA - weightB;
    }
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.timeSlot.localeCompare(b.timeSlot);
  });
}

export interface ActivityProgressSummary {
  total: number;
  completed: number;
  pending: number;
  percentage: number;
  mandatoryPending: number;
}

export function calculateActivityProgress(activities: ActivityItem[]): ActivityProgressSummary {
  const total = activities.length;
  if (total === 0) {
    return { total: 0, completed: 0, pending: 0, percentage: 0, mandatoryPending: 0 };
  }
  const completed = activities.filter((a) => a.completed).length;
  const pending = total - completed;
  const percentage = Math.round((completed / total) * 100);
  const mandatoryPending = activities.filter(
    (a) => !a.completed && a.priority === 'Wajib Hari Ini'
  ).length;

  return {
    total,
    completed,
    pending,
    percentage,
    mandatoryPending,
  };
}

export function groupFormulasByChapter(
  formulas: FormulaCard[],
  curriculum: CurriculumSubject[],
  filters: FormulaFilterOptions = {}
): FormulaChapterGroup[] {
  const {
    semester = 'ALL',
    subjectId = 'ALL',
    chapterId = 'ALL',
    pinnedOnly = false,
    searchQuery = '',
  } = filters;

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredFormulas = formulas.filter((item) => {
    if (semester !== 'ALL' && item.semester !== semester) return false;
    if (subjectId !== 'ALL' && item.subjectId !== subjectId) return false;
    if (chapterId !== 'ALL' && item.chapterId !== chapterId) return false;
    if (pinnedOnly && !item.isPinned) return false;
    if (normalizedQuery) {
      const subText = (item.subFormulas || [])
        .map((sf) => `${sf.target} ${sf.expr}`)
        .join(' ');
      const haystack = [
        item.title,
        item.formula,
        subText,
        item.variables,
        item.example,
        item.steps || '',
        item.examTip || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    return true;
  });

  const PRIORITY_SUBJECT_ORDER: Record<string, number> = {
    matematika: 1,
    ipa: 2,
    b_inggris: 3,
    b_indonesia: 4,
    ips: 5,
    ppkn: 6,
    informatika: 7,
    pai: 8,
    b_daerah: 9,
    pjok: 10,
  };

  const subjectMap = new Map(curriculum.map((s) => [s.id, s]));
  const groupsMap = new Map<string, FormulaChapterGroup>();

  for (const item of filteredFormulas) {
    const subj = subjectMap.get(item.subjectId);
    const chap = subj?.chapters.find((c) => c.id === item.chapterId);
    const key = `${item.semester}__${item.subjectId}__${item.chapterId}`;

    if (!groupsMap.has(key)) {
      const list: FormulaCard[] = [];
      groupsMap.set(key, {
        groupKey: key,
        semester: item.semester,
        subjectId: item.subjectId,
        subjectName: subj?.name || item.subjectId,
        subjectShortCode: subj?.shortCode || item.subjectId.toUpperCase(),
        chapterId: item.chapterId,
        chapterNumber: chap?.number || 1,
        chapterTitle: chap?.title || 'Ringkasan Konsep Umum',
        formulas: list,
        items: list,
      });
    }
    groupsMap.get(key)!.formulas.push(item);
  }

  const groups = Array.from(groupsMap.values());
  groups.sort((a, b) => {
    const orderA = PRIORITY_SUBJECT_ORDER[a.subjectId] ?? 99;
    const orderB = PRIORITY_SUBJECT_ORDER[b.subjectId] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    if (a.semester !== b.semester) return a.semester - b.semester;
    return a.chapterNumber - b.chapterNumber;
  });

  // Sort items within each chapter: pinned first, then by title
  for (const grp of groups) {
    grp.formulas.sort((a, b) =>
      a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1
    );
  }

  return groups;
}

export interface QuadraticCalcOutput {
  valid: boolean;
  discriminant: number;
  rootStatus: string;
  nature: string;
  x1: number | null;
  x2: number | null;
  xp: number;
  yp: number;
  stepsText: string;
  steps: string;
}

export function calculateQuadraticFormula(
  a: number,
  b: number,
  c: number
): QuadraticCalcOutput {
  const safeA = a === 0 ? 1 : a;
  const D = Number((b * b - 4 * safeA * c).toFixed(4));
  const xp = Number((-b / (2 * safeA)).toFixed(3));
  const yp = Number((-D / (4 * safeA)).toFixed(3));

  let x1: number | null = null;
  let x2: number | null = null;
  let rootStatus = '';

  if (D > 0) {
    x1 = Number(((-b + Math.sqrt(D)) / (2 * safeA)).toFixed(3));
    x2 = Number(((-b - Math.sqrt(D)) / (2 * safeA)).toFixed(3));
    rootStatus = '2 Akar Real Berbeda (D > 0)';
  } else if (D === 0) {
    x1 = xp;
    x2 = xp;
    rootStatus = 'Akar Kembar / Menyinggung Sumbu-X (D = 0)';
  } else {
    rootStatus = 'Tidak Memotong Sumbu-X / Akar Imajiner (D < 0)';
  }

  const stepsText = `D = (${b})² - 4(${safeA})(${c}) = ${D}  |  xp = -(${b}) / (2·${safeA}) = ${xp}  |  yp = -(${D}) / (4·${safeA}) = ${yp}`;

  return {
    valid: a !== 0,
    discriminant: D,
    rootStatus,
    nature: rootStatus,
    x1,
    x2,
    xp,
    yp,
    stepsText,
    steps: stepsText,
  };
}

export interface CurvedSolidCalcOutput {
  valid: boolean;
  slantHeightS: number;
  lateralArea: number;
  curvedArea: number;
  fullSurfaceArea: number;
  openTopSurfaceArea: number;
  noCapSurfaceArea: number;
  volume: number;
  piUsed: string;
  stepsText: string;
  steps: string;
}

export function calculateCurvedSolidFormula(
  shape: CurvedSolidType,
  r: number,
  t: number
): CurvedSolidCalcOutput {
  const safeR = Math.max(0, r);
  const safeT = Math.max(0, t);
  const use22Over7 = safeR > 0 && safeR % 7 === 0;
  const pi = use22Over7 ? 22 / 7 : Math.PI;
  const piUsed = use22Over7 ? '22/7' : '3,1416';

  const s = Number(Math.sqrt(safeR * safeR + safeT * safeT).toFixed(2));

  if (shape === 'tabung') {
    const lateralArea = Number((2 * pi * safeR * safeT).toFixed(2));
    const fullSurfaceArea = Number((2 * pi * safeR * (safeR + safeT)).toFixed(2));
    const openTopSurfaceArea = Number((pi * safeR * (safeR + 2 * safeT)).toFixed(2));
    const volume = Number((pi * safeR * safeR * safeT).toFixed(2));
    const stepsText = `Tabung (r=${safeR}, t=${safeT}, π=${piUsed}): V = πr²t = ${volume} cm³ | L_utuh = 2πr(r+t) = ${fullSurfaceArea} cm² | L_tanpa_tutup = πr(r+2t) = ${openTopSurfaceArea} cm²`;
    return {
      valid: safeR > 0 && safeT > 0,
      slantHeightS: safeT,
      lateralArea,
      curvedArea: lateralArea,
      fullSurfaceArea,
      openTopSurfaceArea,
      noCapSurfaceArea: openTopSurfaceArea,
      volume,
      piUsed,
      stepsText,
      steps: stepsText,
    };
  }

  if (shape === 'kerucut') {
    const lateralArea = Number((pi * safeR * s).toFixed(2));
    const fullSurfaceArea = Number((pi * safeR * (safeR + s)).toFixed(2));
    const openTopSurfaceArea = lateralArea;
    const volume = Number(((1 / 3) * pi * safeR * safeR * safeT).toFixed(2));
    const stepsText = `Kerucut (r=${safeR}, t=${safeT} → s=√(${safeR}²+${safeT}²)=${s}): V = ⅓πr²t = ${volume} cm³ | L_selimut = πrs = ${lateralArea} cm² | L_utuh = πr(r+s) = ${fullSurfaceArea} cm²`;
    return {
      valid: safeR > 0 && safeT > 0,
      slantHeightS: s,
      lateralArea,
      curvedArea: lateralArea,
      fullSurfaceArea,
      openTopSurfaceArea,
      noCapSurfaceArea: openTopSurfaceArea,
      volume,
      piUsed,
      stepsText,
      steps: stepsText,
    };
  }

  // Bola
  const fullSurfaceArea = Number((4 * pi * safeR * safeR).toFixed(2));
  const lateralArea = Number((2 * pi * safeR * safeR).toFixed(2)); // ½ bola berongga
  const openTopSurfaceArea = Number((3 * pi * safeR * safeR).toFixed(2)); // ½ bola pejal/padat
  const volume = Number(((4 / 3) * pi * Math.pow(safeR, 3)).toFixed(2));
  const stepsText = `Bola (r=${safeR}, π=${piUsed}): V = (4/3)πr³ = ${volume} cm³ | L_bola = 4πr² = ${fullSurfaceArea} cm² | L_½_bola_pejal = 3πr² = ${openTopSurfaceArea} cm²`;

  return {
    valid: safeR > 0,
    slantHeightS: safeR,
    lateralArea,
    curvedArea: lateralArea,
    fullSurfaceArea,
    openTopSurfaceArea,
    noCapSurfaceArea: openTopSurfaceArea,
    volume,
    piUsed,
    stepsText,
    steps: stepsText,
  };
}

export interface CoulombCalcOutput {
  valid: boolean;
  forceNewton: number;
  rMeters: number;
  scientificNotation: string;
  stepsText: string;
  steps: string;
}

export function calculateCoulombFormula(
  q1MicroC: number,
  q2MicroC: number,
  rCm: number
): CoulombCalcOutput {
  const safeRCm = Math.max(0.01, rCm);
  const rMeters = safeRCm / 100;
  const k = 9e9;
  const q1C = Math.abs(q1MicroC) * 1e-6;
  const q2C = Math.abs(q2MicroC) * 1e-6;
  const forceNewton = Number(((k * q1C * q2C) / (rMeters * rMeters)).toFixed(2));
  const scientificNotation = `${forceNewton.toExponential(2)} N`;
  const stepsText = `F = (9×10⁹ · ${Math.abs(q1MicroC)}×10⁻⁶ · ${Math.abs(q2MicroC)}×10⁻⁶) / (${rMeters})² = ${forceNewton} Newton`;

  return {
    valid: rCm > 0,
    forceNewton,
    rMeters,
    scientificNotation,
    stepsText,
    steps: stepsText,
  };
}

export interface OhmPowerCalcOutput {
  valid: boolean;
  currentAmpere: number;
  powerWatt: number;
  energyJoule: number;
  energyKwh: number;
  stepsText: string;
  steps: string;
}

export function calculateOhmPowerFormula(
  voltageV: number,
  resistanceOhm: number,
  timeMinutes: number
): OhmPowerCalcOutput {
  const safeR = Math.max(0.01, resistanceOhm);
  const currentAmpere = Number((voltageV / safeR).toFixed(3));
  const powerWatt = Number((voltageV * currentAmpere).toFixed(2));
  const timeSeconds = Math.max(0, timeMinutes) * 60;
  const energyJoule = Number((powerWatt * timeSeconds).toFixed(1));
  const energyKwh = Number(((powerWatt * (timeMinutes / 60)) / 1000).toFixed(4));
  const stepsText = `I = V/R = ${voltageV}/${safeR} = ${currentAmpere} A  |  P = V·I = ${powerWatt} W  |  W = P·t = ${powerWatt} × ${timeSeconds}s = ${energyJoule} Joule`;

  return {
    valid: resistanceOhm > 0,
    currentAmpere,
    powerWatt,
    energyJoule,
    energyKwh,
    stepsText,
    steps: stepsText,
  };
}

/**
 * Normalizes Indonesian phone numbers (e.g. "0812-3456-7890" -> "6281234567890")
 * for Fonnte WhatsApp API and per-user Cloud account IDs.
 */
export function normalizePhoneNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('08')) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith('8')) {
    return `62${digits}`;
  }
  return digits;
}

export interface WhatsAppPhoneValidationResult {
  valid: boolean;
  normalized: string;
  reason?: string;
}

/**
 * Validates that a phone number is a genuine-format Indonesian mobile WhatsApp number
 * (starts with 08/628, 10-15 digits, and is not a dummy/fake sequential or repeated number).
 */
export function isValidWhatsAppPhone(
  rawPhone: string
): WhatsAppPhoneValidationResult {
  const normalized = normalizePhoneNumber(rawPhone);
  if (!normalized || !/^628[1-9][0-9]{6,11}$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      reason:
        'Masukkan nomor WhatsApp aktif yang valid (diawali 08xx atau 628xx, 10–14 digit).',
    };
  }

  const subscriberDigits = normalized.slice(3); // digits after '628'
  const fakePatterns = [
    '12345678',
    '123456789',
    '1234567890',
    '987654321',
    '0000000',
  ];

  if (
    /(.)\1{6,}/.test(subscriberDigits) ||
    fakePatterns.some((pat) => subscriberDigits.includes(pat))
  ) {
    return {
      valid: false,
      normalized,
      reason:
        'Nomor WhatsApp terdeteksi tidak valid / nomor contoh. Gunakan nomor WhatsApp asli dan aktif milik Anda.',
    };
  }

  return {
    valid: true,
    normalized,
  };
}


/**
 * Validates Admin credentials (`admin` / `admin 123` as requested by user, also accepting `admin123`).
 */
export function validateAdminCredentials(
  usernameInput: string,
  passwordInput: string
): boolean {
  const cleanUser = usernameInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();
  return (
    cleanUser === 'admin' &&
    (cleanPass === 'admin 123' || cleanPass === 'admin123')
  );
}

export interface ChapterFlashcardDeck {
  subjectId: string;
  subjectName: string;
  subjectShortCode: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  semester: 1 | 2;
  flashcards: Flashcard[];
  formulas: FormulaCard[];
  totalCards: number;
  masteredCount: number;
  learningCount: number;
  dueCount: number;
  masteryPercentage: number;
}

/**
 * Groups Flashcards & Formulas per Subject and per Chapter so students can study
 * Flashcards per Bab per Mata Pelajaran with clear mastery progress indicators.
 */
export function groupFlashcardsByChapterDeck(
  flashcards: Flashcard[],
  formulas: FormulaCard[],
  curriculum: CurriculumSubject[],
  filterOptions?: {
    subjectId?: string | 'ALL';
    semester?: 1 | 2 | 'ALL';
    searchQuery?: string;
    onlyWithContent?: boolean;
  },
  todayStr = getTodayDateString()
): ChapterFlashcardDeck[] {
  const subjectFilter = filterOptions?.subjectId ?? 'ALL';
  const semesterFilter = filterOptions?.semester ?? 'ALL';
  const query = (filterOptions?.searchQuery ?? '').trim().toLowerCase();
  const onlyWithContent = filterOptions?.onlyWithContent ?? true;

  const decks: ChapterFlashcardDeck[] = [];

  for (const subj of curriculum) {
    if (subjectFilter !== 'ALL' && subj.id !== subjectFilter) continue;

    const sortedChapters = [...subj.chapters].sort((a, b) =>
      a.semester !== b.semester ? a.semester - b.semester : a.number - b.number
    );

    for (const ch of sortedChapters) {
      if (semesterFilter !== 'ALL' && ch.semester !== semesterFilter) continue;

      const chCards = flashcards.filter(
        (fc) =>
          fc.subjectId === subj.id &&
          fc.chapterId === ch.id &&
          (!query ||
            fc.front.toLowerCase().includes(query) ||
            fc.back.toLowerCase().includes(query) ||
            ch.title.toLowerCase().includes(query) ||
            subj.name.toLowerCase().includes(query))
      );

      const chFormulas = formulas.filter(
        (fm) =>
          fm.subjectId === subj.id &&
          fm.chapterId === ch.id &&
          (!query ||
            fm.title.toLowerCase().includes(query) ||
            fm.formula.toLowerCase().includes(query) ||
            ch.title.toLowerCase().includes(query) ||
            subj.name.toLowerCase().includes(query))
      );

      if (onlyWithContent && chCards.length === 0 && chFormulas.length === 0) {
        continue;
      }

      const totalCards = chCards.length;
      const masteredCount = chCards.filter((c) => c.intervalDays >= 4).length;
      const learningCount = chCards.filter((c) => c.intervalDays === 1).length;
      const dueCount = chCards.filter((c) => isFlashcardDueToday(c, todayStr)).length;
      const masteryPercentage =
        totalCards === 0 ? 0 : Math.round((masteredCount / totalCards) * 100);

      decks.push({
        subjectId: subj.id,
        subjectName: subj.name,
        subjectShortCode: subj.shortCode,
        chapterId: ch.id,
        chapterNumber: ch.number,
        chapterTitle: ch.title,
        semester: ch.semester,
        flashcards: chCards,
        formulas: chFormulas,
        totalCards,
        masteredCount,
        learningCount,
        dueCount,
        masteryPercentage,
      });
    }
  }

  return decks;
}

export interface LoginLockoutEvaluation {
  isLocked: boolean;
  remainingLockSeconds: number;
  failedAttempts: number;
  lockUntilMs: number;
  maxAttempts: number;
}

/**
 * Evaluates brute-force login lockout status (locks for 180 seconds after 5 consecutive failed attempts).
 */
export function evaluateLoginLockout(
  failedAttempts: number,
  lockUntilMs: number,
  nowMs: number = Date.now(),
  maxAttempts: number = 5,
  lockDurationSeconds: number = 180
): LoginLockoutEvaluation {
  if (lockUntilMs > nowMs) {
    const remainingLockSeconds = Math.ceil((lockUntilMs - nowMs) / 1000);
    return {
      isLocked: true,
      remainingLockSeconds,
      failedAttempts,
      lockUntilMs,
      maxAttempts,
    };
  }

  // If previous lock expired, reset failedAttempts if it reached maxAttempts
  const activeAttempts =
    lockUntilMs > 0 && lockUntilMs <= nowMs && failedAttempts >= maxAttempts
      ? 0
      : failedAttempts;

  if (activeAttempts >= maxAttempts) {
    const newLockUntil = nowMs + lockDurationSeconds * 1000;
    return {
      isLocked: true,
      remainingLockSeconds: lockDurationSeconds,
      failedAttempts: activeAttempts,
      lockUntilMs: newLockUntil,
      maxAttempts,
    };
  }

  return {
    isLocked: false,
    remainingLockSeconds: 0,
    failedAttempts: activeAttempts,
    lockUntilMs: 0,
    maxAttempts,
  };
}

export interface OtpRateLimitEvaluation {
  allowed: boolean;
  cooldownRemainingSeconds: number;
  requestsInWindow: number;
  maxRequestsPerWindow: number;
  reason?: string;
}

/**
 * Anti-spam OTP rate limiter:
 * - Enforces a 60-second cooldown between consecutive OTP sends.
 * - Limits to max 4 OTP requests within a 15-minute rolling window.
 */
export function evaluateOtpRateLimit(
  requestTimestampsMs: number[],
  nowMs: number = Date.now(),
  cooldownSeconds: number = 60,
  windowMinutes: number = 15,
  maxRequestsPerWindow: number = 4
): OtpRateLimitEvaluation {
  const windowMs = windowMinutes * 60 * 1000;
  const recentRequests = requestTimestampsMs
    .filter((ts) => nowMs - ts < windowMs && ts <= nowMs)
    .sort((a, b) => b - a);

  if (recentRequests.length > 0) {
    const lastRequestMs = recentRequests[0];
    const elapsedSeconds = Math.floor((nowMs - lastRequestMs) / 1000);
    if (elapsedSeconds < cooldownSeconds) {
      const remaining = cooldownSeconds - elapsedSeconds;
      return {
        allowed: false,
        cooldownRemainingSeconds: remaining,
        requestsInWindow: recentRequests.length,
        maxRequestsPerWindow,
        reason: `Mohon tunggu ${remaining} detik sebelum meminta ulang kode OTP.`,
      };
    }
  }

  if (recentRequests.length >= maxRequestsPerWindow) {
    const oldestInWindow = recentRequests[recentRequests.length - 1];
    const unlockInSeconds = Math.max(
      1,
      Math.ceil((oldestInWindow + windowMs - nowMs) / 1000)
    );
    return {
      allowed: false,
      cooldownRemainingSeconds: unlockInSeconds,
      requestsInWindow: recentRequests.length,
      maxRequestsPerWindow,
      reason: `Batas anti-spam OTP tercapai (${maxRequestsPerWindow}x dalam ${windowMinutes} menit). Coba lagi dalam ${Math.ceil(unlockInSeconds / 60)} menit.`,
    };
  }

  return {
    allowed: true,
    cooldownRemainingSeconds: 0,
    requestsInWindow: recentRequests.length,
    maxRequestsPerWindow,
  };
}

/**
 * Checks whether an issued OTP code has expired (default 5 minutes TTL).
 */
export function isOtpExpired(
  issuedAtMs: number,
  nowMs: number = Date.now(),
  ttlMinutes: number = 5
): boolean {
  if (!issuedAtMs || issuedAtMs <= 0) return true;
  return nowMs - issuedAtMs > ttlMinutes * 60 * 1000;
}

/**
 * Computes a deterministic session integrity signature so client-side role/accountId tampering is detected.
 */
export function computeSessionIntegritySignature(
  accountId: string,
  role: string,
  loginAt: string
): string {
  const raw = `studyos9_hanif_2026::${accountId.trim()}::${role.trim()}::${loginAt.trim()}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `sig_${(hash >>> 0).toString(16)}`;
}





