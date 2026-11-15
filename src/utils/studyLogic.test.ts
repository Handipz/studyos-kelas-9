/**
 * StudyOS Kelas 9 — Unit Test Suite
 * Copyright (c) 2026 Hanif. All rights reserved.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysToDateString,
  buildTomorrowAlertData,
  calculateActivityProgress,
  calculateCoulombFormula,
  calculateCurvedSolidFormula,
  calculateOhmPowerFormula,
  calculateQuadraticFormula,
  calculateSubjectGradeSimulation,
  calculateTaskProgress,
  computeSessionIntegritySignature,
  evaluateFlashcardReview,
  evaluateLoginLockout,
  evaluateOtpRateLimit,
  getChapterRecencyInfo,
  groupFlashcardsByChapterDeck,
  groupFormulasByChapter,
  isOtpExpired,
  isValidWhatsAppPhone,
  normalizePhoneNumber,
  parseFormulaTextToSubItems,
  resolveSubFormulas,
  sortActivitiesByPriority,
  sortTasksByPriorityMatrix,
  validateAdminCredentials,
} from './studyLogic';
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
import {
  downloadInteractiveStudyHtml,
  downloadStudyJsonPack,
  downloadStudyMarkdown,
} from './studyDownloadGenerator';
import {
  ActivityItem,
  CurriculumSubject,
  Flashcard,
  FormulaCard,
  SubjectGradeRecord,
  TaskItem,
} from '../types/study';

test('evaluateFlashcardReview schedules Lupa (0d), Ragu-ragu (+1d), and Hafal (+4d) accurately', () => {
  const baseCard: Flashcard = {
    id: 'fc-1',
    semester: 1,
    subjectId: 'matematika',
    chapterId: 'mtk-1-2',
    front: 'Apa rumus diskriminan persamaan kuadrat?',
    back: 'D = b^2 - 4ac',
    dueDate: '2026-11-13',
    intervalDays: 0,
    reviewCount: 0,
    lastReviewedAt: null,
  };

  const afterLupa = evaluateFlashcardReview(baseCard, 'lupa', '2026-11-13');
  assert.equal(afterLupa.dueDate, '2026-11-13');
  assert.equal(afterLupa.intervalDays, 0);
  assert.equal(afterLupa.reviewCount, 1);

  const afterRagu = evaluateFlashcardReview(baseCard, 'ragu', '2026-11-13');
  assert.equal(afterRagu.dueDate, '2026-11-14');
  assert.equal(afterRagu.intervalDays, 1);

  const afterHafal = evaluateFlashcardReview(baseCard, 'hafal', '2026-11-13');
  assert.equal(afterHafal.dueDate, '2026-11-17');
  assert.equal(afterHafal.intervalDays, 4);
});

test('getChapterRecencyInfo flags chapters untouched for > 7 days as stale', () => {
  const now = new Date(2026, 10, 13, 12, 0, 0); // 2026-11-13
  const studiedToday = new Date(2026, 10, 13, 8, 0, 0).toISOString();
  const studied3DaysAgo = new Date(2026, 10, 10, 8, 0, 0).toISOString();
  const studied10DaysAgo = new Date(2026, 10, 3, 8, 0, 0).toISOString();

  assert.equal(getChapterRecencyInfo(studiedToday, now).level, 'recent');
  assert.equal(getChapterRecencyInfo(studied3DaysAgo, now).level, 'recent');
  const staleInfo = getChapterRecencyInfo(studied10DaysAgo, now);
  assert.equal(staleInfo.level, 'stale');
  assert.equal(staleInfo.daysAgo, 10);
  assert.equal(staleInfo.needsReview, true);
});

test('calculateTaskProgress and sortTasksByPriorityMatrix sort incomplete urgent tasks first', () => {
  const tasks: TaskItem[] = [
    {
      id: 't1',
      title: 'Cicil rangkuman PPKn',
      subjectId: 'ppkn',
      chapterId: 'ppkn-1-1',
      dueDate: '2026-11-16',
      category: 'Hafalan',
      priority: 'Cicil Santai',
      completed: false,
      createdAt: '2026-11-13',
    },
    {
      id: 't2',
      title: 'PR Grafik Fungsi Kuadrat Hal. 102',
      subjectId: 'matematika',
      chapterId: 'mtk-1-2',
      dueDate: '2026-11-14',
      category: 'PR',
      priority: 'Urgent & Penting',
      completed: false,
      createdAt: '2026-11-13',
    },
    {
      id: 't3',
      title: 'Latihan Listrik Statis',
      subjectId: 'ipa',
      chapterId: 'ipa-1-4',
      dueDate: '2026-11-13',
      category: 'Latihan Soal',
      priority: 'Urgent & Penting',
      completed: true,
      createdAt: '2026-11-12',
    },
  ];

  const sorted = sortTasksByPriorityMatrix(tasks);
  assert.equal(sorted[0].id, 't2');
  assert.equal(sorted[1].id, 't1');
  assert.equal(sorted[2].id, 't3'); // completed goes to bottom

  const progress = calculateTaskProgress(tasks);
  assert.equal(progress.total, 3);
  assert.equal(progress.completed, 1);
  assert.equal(progress.percentage, 33);
  assert.equal(progress.urgentPending, 1);
});

test('calculateSubjectGradeSimulation computes current average and required next exam score', () => {
  const record: SubjectGradeRecord = {
    id: 'matematika',
    subjectId: 'matematika',
    semester: 1,
    targetGrade: 90,
    assessments: [
      { id: 'a1', label: 'Tugas 1', type: 'Tugas', score: 86, date: '2026-10-01' },
      { id: 'a2', label: 'UH 1 Perpangkatan', type: 'UH', score: 88, date: '2026-10-15' },
      { id: 'a3', label: 'PTS Gasal', type: 'PTS', score: 90, date: '2026-11-01' },
    ],
  };

  // Current sum = 264, avg = 88.0. To reach average 90 after 4th exam: 90 * 4 - 264 = 96
  const sim = calculateSubjectGradeSimulation(record);
  assert.equal(sim.currentAverage, 88);
  assert.equal(sim.requiredNextScore, 96);
  assert.equal(sim.status, 'reachable');
});

test('buildTomorrowAlertData matches unfinished tasks with tomorrow schedule', () => {
  const friday = new Date(2026, 10, 13, 9, 0, 0); // Friday Nov 13, 2026 -> Tomorrow is Sabtu
  const schedule = [
    { id: 's1', day: 'Sabtu' as const, period: '07:00 - 08:20', subjectId: 'matematika' },
    { id: 's2', day: 'Sabtu' as const, period: '08:20 - 09:40', subjectId: 'ipa' },
  ];
  const tasks: TaskItem[] = [
    {
      id: 't1',
      title: 'PR Fungsi Kuadrat',
      subjectId: 'matematika',
      chapterId: 'mtk-1-2',
      dueDate: addDaysToDateString('2026-11-13', 1),
      category: 'PR',
      priority: 'Urgent & Penting',
      completed: false,
      createdAt: '2026-11-13',
    },
  ];
  const subjects = [
    { id: 'matematika', name: 'Matematika', shortCode: 'MTK', chapters: [] },
    { id: 'ipa', name: 'IPA', shortCode: 'IPA', chapters: [] },
  ];

  const alert = buildTomorrowAlertData(schedule, tasks, subjects, undefined, friday);
  assert.equal(alert.tomorrowDay, 'Sabtu');
  assert.equal(alert.totalPendingForTomorrow, 1);
  assert.equal(alert.items[0].pendingTasks.length, 1);
  assert.equal(alert.items[1].pendingTasks.length, 0);
});

test('groupFormulasByChapter filters by semester, subject, chapter, pinned, and search query', () => {
  const curriculum: CurriculumSubject[] = [
    {
      id: 'matematika',
      name: 'Matematika',
      shortCode: 'MTK',
      chapters: [
        { id: 'mtk-1-1', subjectId: 'matematika', semester: 1, number: 1, title: 'Perpangkatan', mastery: 'Siap Ujian', lastStudiedAt: null },
        { id: 'mtk-2-2', subjectId: 'matematika', semester: 2, number: 2, title: 'Bangun Ruang Sisi Lengkung', mastery: 'Paham', lastStudiedAt: null },
      ],
    },
  ];

  const formulas: FormulaCard[] = [
    {
      id: 'f1',
      semester: 1,
      subjectId: 'matematika',
      chapterId: 'mtk-1-1',
      title: 'Persegi & Persegi Panjang',
      formula: 'Mencari Luas : s × s\nMencari Keliling : s + s + s + s',
      subFormulas: [
        { target: 'Persegi — Mencari Luas (L)', expr: 's × s  (atau s²)' },
        { target: 'Persegi — Mencari Keliling (K)', expr: 's + s + s + s  (atau 4 × s)' },
      ],
      variables: 's: sisi persegi',
      example: 's=8 -> L=64',
      steps: 'Kalikan sisi',
      examTip: 'Jangan tertukar luas dan keliling',
      isPinned: false,
    },
    {
      id: 'f2',
      semester: 2,
      subjectId: 'matematika',
      chapterId: 'mtk-2-2',
      title: 'Rumus Kerucut',
      formula: 'V = 1/3 * pi * r^2 * t',
      variables: 'r: jari-jari, t: tinggi',
      example: 'r=7, t=24 -> s=25',
      steps: 'Cari s dengan Pythagoras',
      examTip: 'Ingat koefisien 1/3',
      isPinned: true,
    },
  ];

  const allGroups = groupFormulasByChapter(formulas, curriculum, {});
  assert.equal(allGroups.length, 2);
  assert.equal(allGroups[0].chapterTitle, 'Perpangkatan');
  assert.equal(allGroups[1].chapterTitle, 'Bangun Ruang Sisi Lengkung');

  const pinnedOnly = groupFormulasByChapter(formulas, curriculum, { pinnedOnly: true });
  assert.equal(pinnedOnly.length, 1);
  assert.equal(pinnedOnly[0].formulas[0].id, 'f2');

  const searchPythagoras = groupFormulasByChapter(formulas, curriculum, { searchQuery: 'pythagoras' });
  assert.equal(searchPythagoras.length, 1);
  assert.equal(searchPythagoras[0].chapterId, 'mtk-2-2');

  const searchKeliling = groupFormulasByChapter(formulas, curriculum, { searchQuery: 'mencari keliling' });
  assert.equal(searchKeliling.length, 1);
  assert.equal(searchKeliling[0].formulas[0].id, 'f1');
});

test('resolveSubFormulas and parseFormulaTextToSubItems parse target : expression lines cleanly', () => {
  const parsed = parseFormulaTextToSubItems(
    'Mencari Luas : s × s\nMencari Keliling : s + s + s + s'
  );
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].target, 'Mencari Luas');
  assert.equal(parsed[0].expr, 's × s');
  assert.equal(parsed[1].target, 'Mencari Keliling');
  assert.equal(parsed[1].expr, 's + s + s + s');

  const cardWithFallback: FormulaCard = {
    id: 'fc-test',
    semester: 1,
    subjectId: 'matematika',
    chapterId: 'mtk-1-1',
    title: 'Persegi',
    formula: 'Mencari Luas : s × s | Mencari Sisi : √L',
    variables: 's: sisi',
    example: 's=5 -> L=25',
    isPinned: false,
  };
  const resolved = resolveSubFormulas(cardWithFallback);
  assert.equal(resolved.length, 2);
  assert.equal(resolved[0].target, 'Mencari Luas');
  assert.equal(resolved[1].target, 'Mencari Sisi');
});

test('calculateActivityProgress and sortActivitiesByPriority sort daily non-homework activities properly', () => {
  const activities: ActivityItem[] = [
    {
      id: 'act-1',
      title: 'Olahraga Sore',
      category: 'Ibadah, Olahraga & Rutinitas',
      priority: 'Fleksibel',
      timeSlot: '16:30 - 17:15',
      date: '2026-11-13',
      locationOrNote: 'Halaman Rumah',
      completed: false,
      createdAt: '2026-11-13',
    },
    {
      id: 'act-2',
      title: 'Les Bimbel Matematika',
      category: 'Les / Bimbel & Belajar Mandiri',
      priority: 'Wajib Hari Ini',
      timeSlot: '15:30 - 17:00',
      date: '2026-11-13',
      locationOrNote: 'Ruang Bimbel',
      completed: false,
      createdAt: '2026-11-13',
    },
    {
      id: 'act-3',
      title: 'Ibadah Pagi',
      category: 'Ibadah, Olahraga & Rutinitas',
      priority: 'Wajib Hari Ini',
      timeSlot: '05:00 - 05:30',
      date: '2026-11-13',
      locationOrNote: 'Rumah',
      completed: true,
      createdAt: '2026-11-13',
    },
  ];

  const sorted = sortActivitiesByPriority(activities);
  assert.equal(sorted[0].id, 'act-2'); // Mandatory & incomplete first
  assert.equal(sorted[1].id, 'act-1'); // Flexible & incomplete second
  assert.equal(sorted[2].id, 'act-3'); // Completed at bottom

  const prog = calculateActivityProgress(activities);
  assert.equal(prog.total, 3);
  assert.equal(prog.completed, 1);
  assert.equal(prog.percentage, 33);
  assert.equal(prog.mandatoryPending, 1);
});

test('Interactive calculators compute Quadratic, Curved Solids, Coulomb, and Ohm/Power accurately', () => {
  // 1. Quadratic: x^2 - 5x + 6 = 0 -> D = 1, roots 3 and 2, vertex (2.5, -0.25)
  const quad = calculateQuadraticFormula(1, -5, 6);
  assert.equal(quad.valid, true);
  assert.equal(quad.discriminant, 1);
  assert.equal(quad.x1, 3);
  assert.equal(quad.x2, 2);
  assert.equal(quad.xp, 2.5);
  assert.equal(quad.yp, -0.25);

  // 2. Curved Solid: Cone r=7, t=24 -> s=25
  const cone = calculateCurvedSolidFormula('kerucut', 7, 24);
  assert.equal(cone.valid, true);
  assert.equal(cone.slantHeightS, 25);
  assert.equal(cone.curvedArea, 550); // 22/7 * 7 * 25 = 550
  assert.equal(cone.fullSurfaceArea, 704); // 22/7 * 7 * (7 + 25) = 704
  assert.equal(cone.volume, 1232); // 1/3 * 22/7 * 49 * 24 = 1232

  // 3. Coulomb: q1=4 uC, q2=6 uC, r=2 cm -> F = 9e9 * 24e-12 / 4e-4 = 540 N
  const coulomb = calculateCoulombFormula(4, 6, 2);
  assert.equal(coulomb.valid, true);
  assert.equal(coulomb.forceNewton, 540);

  // 4. Ohm & Power: V=220 V, R=110 Ohm, t=30 menit -> I=2 A, P=440 W, W=792000 J = 0.22 kWh
  const ohm = calculateOhmPowerFormula(220, 110, 30);
  assert.equal(ohm.valid, true);
  assert.equal(ohm.currentAmpere, 2);
  assert.equal(ohm.powerWatt, 440);
  assert.equal(ohm.energyJoule, 792000);
  assert.equal(ohm.energyKwh, 0.22);
});

test('normalizePhoneNumber and validateAdminCredentials handle student phones and admin / admin 123 login accurately', () => {
  assert.equal(normalizePhoneNumber('0812-3456-7890'), '6281234567890');
  assert.equal(normalizePhoneNumber('+62 812 9999 0000'), '6281299990000');
  assert.equal(normalizePhoneNumber('81311223344'), '6281311223344');

  assert.equal(validateAdminCredentials('admin', 'admin 123'), true);
  assert.equal(validateAdminCredentials('ADMIN', 'admin 123'), true);
  assert.equal(validateAdminCredentials('admin', 'admin123'), true);
  assert.equal(validateAdminCredentials('admin', 'wrongpass'), false);
  assert.equal(validateAdminCredentials('siswa', 'admin 123'), false);

  // Strict WhatsApp phone validation (rejects fake sequential/repeated numbers)
  assert.equal(isValidWhatsAppPhone('081234567890').valid, false);
  assert.equal(isValidWhatsAppPhone('081111111111').valid, false);
  assert.equal(isValidWhatsAppPhone('085156987311').valid, true);
});

test('New user default workspace is clean (zero dummy personal items) and pre-populated with deep Rumus & Active Recall + Copyright © Hanif', () => {
  assert.equal(getInitialTasks().length, 0);
  assert.equal(getInitialActivities().length, 0);
  assert.equal(getInitialPhotoNotes().length, 0);
  assert.equal(getInitialMistakes().length, 0);
  assert.equal(getInitialGrades().length, 0);
  assert.equal(getInitialSchedule().length, 0);
  assert.equal(getInitialStudyLogs().length, 0);

  const curriculum = getInitialCurriculum();
  const formulas = getInitialFormulas();
  const flashcards = getInitialFlashcards();

  assert.equal(curriculum.length, 4);
  assert.ok(formulas.length >= 25);
  assert.ok(flashcards.length >= 25);

  const htmlPack = downloadInteractiveStudyHtml(formulas, flashcards, curriculum, 'Semua Materi');
  const mdPack = downloadStudyMarkdown(formulas, flashcards, curriculum);
  const jsonPack = downloadStudyJsonPack(formulas, flashcards);

  assert.ok(htmlPack.includes('Copyright © 2026 Hanif'));
  assert.ok(mdPack.includes('Copyright © 2026 Hanif'));
  assert.ok(jsonPack.includes('Copyright © 2026 Hanif'));

  const decks = groupFlashcardsByChapterDeck(flashcards, formulas, curriculum, {
    subjectId: 'matematika',
  });
  assert.ok(decks.length >= 5);
  assert.equal(decks[0].subjectId, 'matematika');
  assert.ok(decks[0].totalCards >= 1);
  assert.ok(decks[0].formulas.length >= 1);
});

test('Public Vercel Security Hardening: brute-force lockout, OTP rate limiting, OTP expiry, and session integrity signature', () => {
  const now = 1_700_000_000_000;

  // 1. Brute-force lockout: unlocked at 4 attempts, locked for 180s at 5 attempts
  const attempt4 = evaluateLoginLockout(4, 0, now);
  assert.equal(attempt4.isLocked, false);

  const attempt5 = evaluateLoginLockout(5, 0, now);
  assert.equal(attempt5.isLocked, true);
  assert.equal(attempt5.remainingLockSeconds, 180);

  // After lock expires, resets cleanly
  const afterExpiry = evaluateLoginLockout(5, attempt5.lockUntilMs, now + 181_000);
  assert.equal(afterExpiry.isLocked, false);
  assert.equal(afterExpiry.failedAttempts, 0);

  // 2. OTP anti-spam rate limit: 60s cooldown + max 4 requests per 15m
  const firstOtp = evaluateOtpRateLimit([], now);
  assert.equal(firstOtp.allowed, true);

  const withinCooldown = evaluateOtpRateLimit([now - 20_000], now);
  assert.equal(withinCooldown.allowed, false);
  assert.equal(withinCooldown.cooldownRemainingSeconds, 40);

  const maxWindowReached = evaluateOtpRateLimit(
    [now - 70_000, now - 140_000, now - 210_000, now - 280_000],
    now
  );
  assert.equal(maxWindowReached.allowed, false);

  // 3. OTP 5-minute expiration
  assert.equal(isOtpExpired(now - 4 * 60 * 1000, now, 5), false);
  assert.equal(isOtpExpired(now - 6 * 60 * 1000, now, 5), true);

  // 4. Session integrity signature detects role tampering
  const studentSig = computeSessionIntegritySignature('6281234567890', 'student', '2026-11-15T10:00:00.000Z');
  const adminSig = computeSessionIntegritySignature('6281234567890', 'admin', '2026-11-15T10:00:00.000Z');
  assert.notEqual(studentSig, adminSig);
});




