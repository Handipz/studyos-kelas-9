/**
 * StudyOS Kelas 9 — Curriculum Mastery View
 * Copyright (c) 2026 Hanif. All rights reserved.
 */
import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  CurriculumSubject,
  Flashcard,
  MasteryStatus,
  PhotoNote,
  SemesterNumber,
} from '../types/study';
import { getChapterRecencyInfo } from '../utils/studyLogic';

interface CurriculumMasteryViewProps {
  curriculum: CurriculumSubject[];
  notes: PhotoNote[];
  flashcards: Flashcard[];
  onUpdateChapterMastery: (
    subjectId: string,
    chapterId: string,
    mastery: MasteryStatus
  ) => Promise<void>;
  onMarkChapterStudiedToday: (subjectId: string, chapterId: string) => Promise<void>;
  onAddSubject: (name: string, shortCode: string, teacher: string) => Promise<void>;
  onAddChapter: (
    subjectId: string,
    semester: SemesterNumber,
    title: string
  ) => Promise<void>;
  onDeleteChapter: (subjectId: string, chapterId: string) => Promise<void>;
}

const MASTERY_OPTIONS: MasteryStatus[] = [
  'Belum Belajar',
  'Masih Bingung',
  'Paham',
  'Siap Ujian',
];

export const CurriculumMasteryView: React.FC<CurriculumMasteryViewProps> = ({
  curriculum,
  notes,
  flashcards,
  onUpdateChapterMastery,
  onMarkChapterStudiedToday,
  onAddSubject,
  onAddChapter,
  onDeleteChapter,
}) => {
  const [selectedSemester, setSelectedSemester] = useState<'ALL' | SemesterNumber>('ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);

  // Add Subject State
  const [subjName, setSubjName] = useState('');
  const [subjCode, setSubjCode] = useState('');
  const [subjTeacher, setSubjTeacher] = useState('');

  // Add Chapter State
  const [chapSubjId, setChapSubjId] = useState(curriculum[0]?.id || 'matematika');
  const [chapSemester, setChapSemester] = useState<SemesterNumber>(1);
  const [chapTitle, setChapTitle] = useState('');

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjName.trim()) return;
    await onAddSubject(
      subjName.trim(),
      subjCode.trim().toUpperCase() || subjName.slice(0, 3).toUpperCase(),
      subjTeacher.trim()
    );
    setSubjName('');
    setSubjCode('');
    setSubjTeacher('');
    setShowAddSubjectModal(false);
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapTitle.trim()) return;
    await onAddChapter(chapSubjId, chapSemester, chapTitle.trim());
    setChapTitle('');
    setShowAddChapterModal(false);
  };

  const masteryStats = useMemo(() => {
    let total = 0;
    let siapUjian = 0;
    let paham = 0;
    let bingung = 0;
    let staleCount = 0;

    for (const subj of curriculum) {
      for (const ch of subj.chapters) {
        total++;
        if (ch.mastery === 'Siap Ujian') siapUjian++;
        else if (ch.mastery === 'Paham') paham++;
        else if (ch.mastery === 'Masih Bingung') bingung++;

        const recency = getChapterRecencyInfo(ch.lastStudiedAt);
        if (recency.level === 'stale') staleCount++;
      }
    }
    return {
      total,
      siapUjian,
      paham,
      bingung,
      staleCount,
      masteryPercent: total > 0 ? Math.round(((siapUjian + paham) / total) * 100) : 0,
    };
  }, [curriculum]);

  const displayedSubjects = useMemo(() => {
    if (selectedSubjectId === 'ALL') return curriculum;
    return curriculum.filter((s) => s.id === selectedSubjectId);
  }, [curriculum, selectedSubjectId]);

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Peta Kurikulum Kelas 9 SMP & Spaced Review Tracker
            </h2>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
              Pantau penguasaan Bab Semester 1 & 2 serta indikator otomatis jika Bab sudah &gt; 7 hari tidak disentuh
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddSubjectModal((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] rounded-lg whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Mapel</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddChapterModal((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Bab Baru</span>
            </button>
          </div>
        </div>

        {/* Summary Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-xs text-[#475569] dark:text-[#94A3B8]">Penguasaan Total</span>
            <p className="text-xl font-bold font-mono tabular-nums text-[#2563EB] mt-1">
              {masteryStats.masteryPercent}% ({masteryStats.siapUjian + masteryStats.paham}/
              {masteryStats.total} Bab)
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-xs text-[#475569] dark:text-[#94A3B8]">Status Siap Ujian</span>
            <p className="text-xl font-bold font-mono tabular-nums text-[#16A34A] mt-1">
              {masteryStats.siapUjian} Bab
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-xs text-[#475569] dark:text-[#94A3B8]">Masih Bingung</span>
            <p className="text-xl font-bold font-mono tabular-nums text-[#D97706] mt-1">
              {masteryStats.bingung} Bab
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-xs text-[#475569] dark:text-[#94A3B8]">
              Lewat &gt; 7 Hari Belum Disentuh
            </span>
            <p className="text-xl font-bold font-mono tabular-nums text-[#DC2626] mt-1">
              {masteryStats.staleCount} Bab
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="flex items-center gap-1 p-1 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg">
            {(['ALL', 1, 2] as const).map((sem) => (
              <button
                key={String(sem)}
                type="button"
                onClick={() => setSelectedSemester(sem)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
                  selectedSemester === sem
                    ? 'bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B]'
                    : 'text-[#475569] dark:text-[#94A3B8]'
                }`}
              >
                {sem === 'ALL' ? 'Semester 1 & 2' : `Semester ${sem}`}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter Mata Pelajaran di Kurikulum"
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
          >
            <option value="ALL">Semua Mata Pelajaran ({curriculum.length} Mapel)</option>
            {curriculum.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Subject Form */}
      {showAddSubjectModal && (
        <form
          onSubmit={handleCreateSubject}
          className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium mb-1">Nama Mata Pelajaran</label>
            <input
              type="text"
              value={subjName}
              onChange={(e) => setSubjName(e.target.value)}
              placeholder="Contoh: Prakarya / Seni Budaya"
              className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Kode Singkat</label>
            <input
              type="text"
              value={subjCode}
              onChange={(e) => setSubjCode(e.target.value)}
              placeholder="SBK"
              className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Nama Guru (Opsional)</label>
            <input
              type="text"
              value={subjTeacher}
              onChange={(e) => setSubjTeacher(e.target.value)}
              placeholder="Bu Rina, S.Sn."
              className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] rounded-md"
          >
            Simpan Mapel Baru
          </button>
        </form>
      )}

      {/* Add Chapter Form */}
      {showAddChapterModal && (
        <form
          onSubmit={handleCreateChapter}
          className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium mb-1">Mata Pelajaran</label>
            <select
              value={chapSubjId}
              onChange={(e) => setChapSubjId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
            >
              {curriculum.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Semester</label>
            <select
              value={chapSemester}
              onChange={(e) => setChapSemester(Number(e.target.value) as SemesterNumber)}
              className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
            >
              <option value={1}>Semester 1</option>
              <option value={2}>Semester 2</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Judul Bab Baru</label>
            <input
              type="text"
              value={chapTitle}
              onChange={(e) => setChapTitle(e.target.value)}
              placeholder="Contoh: Latihan Pemantapan Ujian Sekolah"
              className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] rounded-md"
          >
            Simpan Bab
          </button>
        </form>
      )}

      {/* Subjects & Chapters List */}
      <div className="space-y-6">
        {displayedSubjects.map((subject) => {
          const chapters = subject.chapters.filter((ch) =>
            selectedSemester === 'ALL' ? true : ch.semester === selectedSemester
          );

          return (
            <section
              key={subject.id}
              className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-[#2563EB]" />
                  <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    {subject.name}
                  </h3>
                  <span className="text-xs font-mono text-[#475569] dark:text-[#94A3B8]">
                    ({subject.shortCode})
                  </span>
                </div>
                {subject.teacher && (
                  <span className="text-xs text-[#475569] dark:text-[#94A3B8]">
                    Pengampu: {subject.teacher}
                  </span>
                )}
              </div>

              <div className="mt-4 divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                {chapters.map((ch) => {
                  const recency = getChapterRecencyInfo(ch.lastStudiedAt);
                  const noteCount = notes.filter((n) => n.chapterId === ch.id).length;
                  const fcCount = flashcards.filter((f) => f.chapterId === ch.id).length;

                  const recencyColor =
                    recency.level === 'stale'
                      ? 'text-[#DC2626] font-semibold'
                      : recency.level === 'moderate'
                      ? 'text-[#D97706] font-semibold'
                      : recency.level === 'recent'
                      ? 'text-[#16A34A] font-medium'
                      : 'text-[#475569] dark:text-[#94A3B8]';

                  return (
                    <div
                      key={ch.id}
                      className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[#475569] dark:text-[#94A3B8]">
                            Sem {ch.semester} · Bab {ch.number}
                          </span>
                          <h4 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                            {ch.title}
                          </h4>
                        </div>

                        {/* Unboxed metadata with · separators + >7 days warning */}
                        <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
                          <span className={`inline-flex items-center gap-1 font-mono ${recencyColor}`}>
                            {recency.level === 'stale' ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" />
                            ) : recency.level === 'recent' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                            {recency.label}
                          </span>
                          <span aria-hidden="true" className="text-[#475569]">·</span>
                          <span className="font-mono text-[#475569] dark:text-[#94A3B8]">
                            {noteCount} Catatan Foto
                          </span>
                          <span aria-hidden="true" className="text-[#475569]">·</span>
                          <span className="font-mono text-[#475569] dark:text-[#94A3B8]">
                            {fcCount} Flashcard
                          </span>
                        </div>
                      </div>

                      {/* Controls: Mastery Selector + Touch Today */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <select
                          aria-label={`Status penguasaan ${ch.title}`}
                          value={ch.mastery}
                          onChange={(e) =>
                            onUpdateChapterMastery(
                              subject.id,
                              ch.id,
                              e.target.value as MasteryStatus
                            )
                          }
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${
                            ch.mastery === 'Siap Ujian'
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-[#16A34A] border-emerald-300 dark:border-emerald-800'
                              : ch.mastery === 'Paham'
                              ? 'bg-blue-50 dark:bg-blue-950/30 text-[#2563EB] border-blue-300 dark:border-blue-800'
                              : ch.mastery === 'Masih Bingung'
                              ? 'bg-amber-50 dark:bg-amber-950/30 text-[#D97706] border-amber-300 dark:border-amber-800'
                              : 'bg-[#F8FAFC] dark:bg-[#090D16] text-[#475569] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#1E293B]'
                          }`}
                        >
                          {MASTERY_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => onMarkChapterStudiedToday(subject.id, ch.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] rounded-md whitespace-nowrap shrink-0"
                        >
                          <RefreshCw className="w-3 h-3 text-[#2563EB]" />
                          <span>Sentuh Hari Ini</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteChapter(subject.id, ch.id)}
                          aria-label={`Hapus bab ${ch.title}`}
                          className="p-1.5 text-[#475569] hover:text-[#DC2626]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
