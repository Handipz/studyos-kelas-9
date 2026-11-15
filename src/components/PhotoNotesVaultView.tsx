/**
 * StudyOS Kelas 9 — Cornell Photo Notes Vault View
 * Copyright (c) 2026 Hanif. All rights reserved.
 */
import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  X,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  FileImage,
  Move,
} from 'lucide-react';
import {
  CurriculumSubject,
  Flashcard,
  PhotoNote,
  SemesterNumber,
} from '../types/study';
import {
  compressImageViaCanvas,
  generateSyntheticNoteImage,
} from '../utils/canvasCompression';
import {
  getChaptersForSubjectAndSemester,
  getTodayDateString,
} from '../utils/studyLogic';

interface PhotoNotesVaultViewProps {
  curriculum: CurriculumSubject[];
  notes: PhotoNote[];
  onAddNote: (note: Omit<PhotoNote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateNote: (note: PhotoNote) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onQuickCreateFlashcard: (
    card: Omit<Flashcard, 'id' | 'dueDate' | 'intervalDays' | 'reviewCount' | 'lastReviewedAt'>
  ) => Promise<void>;
}

export const PhotoNotesVaultView: React.FC<PhotoNotesVaultViewProps> = ({
  curriculum,
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onQuickCreateFlashcard,
}) => {
  // Filter state (Dependent Dropdowns)
  const [filterSemester, setFilterSemester] = useState<'ALL' | SemesterNumber>('ALL');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('ALL');
  const [filterChapterId, setFilterChapterId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Note Drawer state (Dependent Dropdowns: Semester -> Mapel -> Bab)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formSemester, setFormSemester] = useState<SemesterNumber>(1);
  const [formSubjectId, setFormSubjectId] = useState<string>(curriculum[0]?.id || 'matematika');
  const [formChapterId, setFormChapterId] = useState<string>(
    curriculum[0]?.chapters[0]?.id || 'mtk-1-1'
  );
  const [formTitle, setFormTitle] = useState('');
  const [formKeyPoints, setFormKeyPoints] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [compressionStats, setCompressionStats] = useState<PhotoNote['compressionStats']>();
  const [isCompressing, setIsCompressing] = useState(false);
  const [formError, setFormError] = useState('');

  // Camera stream state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Lightbox & Quick-Create Flashcard state
  const [activeLightboxNote, setActiveLightboxNote] = useState<PhotoNote | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Quick Flashcard inside Lightbox
  const [quickFront, setQuickFront] = useState('');
  const [quickBack, setQuickBack] = useState('');
  const [quickSavedBanner, setQuickSavedBanner] = useState<string | null>(null);

  // Edit existing Cornell Note state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editKeyPoints, setEditKeyPoints] = useState('');
  const [editSummary, setEditSummary] = useState('');

  // Dependent chapters for Filter
  const filterAvailableChapters = useMemo(() => {
    if (filterSubjectId === 'ALL') return [];
    const subj = curriculum.find((s) => s.id === filterSubjectId);
    if (!subj) return [];
    if (filterSemester === 'ALL') return subj.chapters;
    return subj.chapters.filter((ch) => ch.semester === filterSemester);
  }, [curriculum, filterSubjectId, filterSemester]);

  // Dependent chapters for Create Form
  const formAvailableChapters = useMemo(
    () => getChaptersForSubjectAndSemester(curriculum, formSubjectId, formSemester),
    [curriculum, formSubjectId, formSemester]
  );

  const handleFormSemesterChange = (sem: SemesterNumber) => {
    setFormSemester(sem);
    const chaps = getChaptersForSubjectAndSemester(curriculum, formSubjectId, sem);
    setFormChapterId(chaps[0]?.id || '');
  };

  const handleFormSubjectChange = (subjId: string) => {
    setFormSubjectId(subjId);
    const chaps = getChaptersForSubjectAndSemester(curriculum, subjId, formSemester);
    setFormChapterId(chaps[0]?.id || '');
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsCompressing(true);
    setFormError('');
    try {
      const newCompressedUrls: string[] = [];
      let latestStats: PhotoNote['compressionStats'] | undefined;

      for (let i = 0; i < files.length; i++) {
        const res = await compressImageViaCanvas(files[i], 1400, 0.75);
        newCompressedUrls.push(res.dataUrl);
        latestStats = {
          originalKB: res.originalKB,
          compressedKB: res.compressedKB,
          width: res.width,
          height: res.height,
          format: res.format,
        };
      }
      setFormImages((prev) => [...prev, ...newCompressedUrls]);
      if (latestStats) setCompressionStats(latestStats);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal memproses foto.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleGenerateSampleCanvasPhoto = async () => {
    setIsCompressing(true);
    try {
      const subjName =
        curriculum.find((s) => s.id === formSubjectId)?.name || 'Matematika';
      const chapTitle =
        formAvailableChapters.find((c) => c.id === formChapterId)?.title ||
        'Catatan Bab';
      const rawUrl = generateSyntheticNoteImage({
        subjectBadge: `${subjName.toUpperCase()} SEM ${formSemester}`,
        title: formTitle.trim() || `Catatan: ${chapTitle}`,
        subtitle: `Lembar Catatan Cornell Digital · ${getTodayDateString()}`,
        formulas: [
          'Poin 1: Definisi & Konsep Dasar Bab',
          'Poin 2: Rumus Utama & Hubungan Antar Variabel',
          'Poin 3: Langkah Penyelesaian Soal Ujian Kelas 9',
          'Poin 4: Pengecekan Satuan SI & Tanda Aljabar',
        ],
        diagramType: formSubjectId === 'ipa' ? 'coulomb' : 'parabola',
      });
      const compressed = await compressImageViaCanvas(rawUrl, 1400, 0.75);
      setFormImages((prev) => [...prev, compressed.dataUrl]);
      setCompressionStats({
        originalKB: compressed.originalKB,
        compressedKB: compressed.compressedKB,
        width: compressed.width,
        height: compressed.height,
        format: compressed.format,
      });
    } finally {
      setIsCompressing(false);
    }
  };

  const startLiveCamera = async () => {
    setFormError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      mediaStreamRef.current = stream;
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      // Fallback: generate synthetic camera capture if hardware camera isn't attached
      await handleGenerateSampleCanvasPhoto();
    }
  };

  const stopLiveCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const captureFrameFromVideo = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1200;
    canvas.height = video.videoHeight || 900;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const compressed = await compressImageViaCanvas(rawDataUrl, 1400, 0.75);
      setFormImages((prev) => [...prev, compressed.dataUrl]);
      setCompressionStats({
        originalKB: compressed.originalKB,
        compressedKB: compressed.compressedKB,
        width: compressed.width,
        height: compressed.height,
        format: compressed.format,
      });
    }
    stopLiveCamera();
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Judul catatan wajib diisi.');
      return;
    }
    if (!formKeyPoints.trim() || !formSummary.trim()) {
      setFormError('Kolom Poin Kunci dan Kesimpulan Inti Cornell wajib diisi.');
      return;
    }

    let finalImages = formImages;
    let finalStats = compressionStats;
    if (finalImages.length === 0) {
      // Automatically generate a clean diagram sheet if the user didn't attach a file
      const subjName =
        curriculum.find((s) => s.id === formSubjectId)?.name || 'Matematika';
      const raw = generateSyntheticNoteImage({
        subjectBadge: `${subjName.toUpperCase()} SEM ${formSemester}`,
        title: formTitle.trim(),
        subtitle: `Catatan Cornell Kelas 9 · ${getTodayDateString()}`,
        formulas: formKeyPoints
          .split('\n')
          .filter(Boolean)
          .slice(0, 4),
        diagramType: 'parabola',
      });
      const comp = await compressImageViaCanvas(raw, 1400, 0.75);
      finalImages = [comp.dataUrl];
      finalStats = {
        originalKB: comp.originalKB,
        compressedKB: comp.compressedKB,
        width: comp.width,
        height: comp.height,
        format: comp.format,
      };
    }

    await onAddNote({
      semester: formSemester,
      subjectId: formSubjectId,
      chapterId: formChapterId || formAvailableChapters[0]?.id || '',
      title: formTitle.trim(),
      images: finalImages,
      keyPoints: formKeyPoints.trim(),
      summary: formSummary.trim(),
      compressionStats: finalStats,
    });

    setFormTitle('');
    setFormKeyPoints('');
    setFormSummary('');
    setFormImages([]);
    setCompressionStats(undefined);
    setFormError('');
    setShowCreateForm(false);
  };

  const openLightbox = (note: PhotoNote, imgIdx = 0) => {
    setActiveLightboxNote(note);
    setActiveImageIndex(imgIdx);
    setZoomScale(1);
    setRotationDeg(0);
    setPanOffset({ x: 0, y: 0 });
    setQuickFront('');
    setQuickBack('');
    setQuickSavedBanner(null);
  };

  const handleQuickCreateFlashcardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLightboxNote) return;
    if (!quickFront.trim() || !quickBack.trim()) return;

    await onQuickCreateFlashcard({
      semester: activeLightboxNote.semester,
      subjectId: activeLightboxNote.subjectId,
      chapterId: activeLightboxNote.chapterId,
      front: quickFront.trim(),
      back: quickBack.trim(),
      sourceNoteId: activeLightboxNote.id,
    });

    setQuickFront('');
    setQuickBack('');
    setQuickSavedBanner('Flashcard berhasil ditambahkan ke deck Bab ini!');
    setTimeout(() => setQuickSavedBanner(null), 3500);
  };

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (filterSemester !== 'ALL' && n.semester !== filterSemester) return false;
      if (filterSubjectId !== 'ALL' && n.subjectId !== filterSubjectId) return false;
      if (filterChapterId !== 'ALL' && n.chapterId !== filterChapterId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchKeys = n.keyPoints.toLowerCase().includes(q);
        const matchSum = n.summary.toLowerCase().includes(q);
        if (!matchTitle && !matchKeys && !matchSum) return false;
      }
      return true;
    });
  }, [notes, filterSemester, filterSubjectId, filterChapterId, searchQuery]);

  const getSubjectName = (subjectId: string) =>
    curriculum.find((s) => s.id === subjectId)?.name || subjectId;

  const getChapterTitle = (subjectId: string, chapterId: string) => {
    const subj = curriculum.find((s) => s.id === subjectId);
    const ch = subj?.chapters.find((c) => c.id === chapterId);
    return ch ? `Bab ${ch.number}: ${ch.title}` : 'Bab Umum';
  };

  const startEditingCornell = (note: PhotoNote) => {
    setEditingNoteId(note.id);
    setEditKeyPoints(note.keyPoints);
    setEditSummary(note.summary);
  };

  const saveEditedCornell = async (note: PhotoNote) => {
    await onUpdateNote({
      ...note,
      keyPoints: editKeyPoints.trim(),
      summary: editSummary.trim(),
      updatedAt: new Date().toISOString(),
    });
    setEditingNoteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Photo Notes Vault & Metode Catatan Cornell
            </h2>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
              Unggah foto buku catatan (otomatis dikompres ke maks 1400px WebP/JPEG 0.75 di IndexedDB) dan rangkum dengan metode Cornell
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Unggah / Buat Catatan Foto</span>
          </button>
        </div>

        {/* Dependent Dropdown Filter Bar */}
        <div className="mt-5 pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label
              htmlFor="vault-filter-sem"
              className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
            >
              1. Filter Semester
            </label>
            <select
              id="vault-filter-sem"
              value={filterSemester}
              onChange={(e) => {
                const val = e.target.value;
                setFilterSemester(val === 'ALL' ? 'ALL' : (Number(val) as SemesterNumber));
                setFilterChapterId('ALL');
              }}
              className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
            >
              <option value="ALL">Semua Semester (1 & 2)</option>
              <option value={1}>Semester 1 (Gasal)</option>
              <option value={2}>Semester 2 (Genap)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="vault-filter-subj"
              className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
            >
              2. Filter Mata Pelajaran
            </label>
            <select
              id="vault-filter-subj"
              value={filterSubjectId}
              onChange={(e) => {
                setFilterSubjectId(e.target.value);
                setFilterChapterId('ALL');
              }}
              className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
            >
              <option value="ALL">Semua Mata Pelajaran</option>
              {curriculum.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="vault-filter-chap"
              className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
            >
              3. Filter Bab (Otomatis Menyesuaikan)
            </label>
            <select
              id="vault-filter-chap"
              value={filterChapterId}
              onChange={(e) => setFilterChapterId(e.target.value)}
              disabled={filterSubjectId === 'ALL'}
              className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC] disabled:opacity-50"
            >
              <option value="ALL">
                {filterSubjectId === 'ALL' ? 'Pilih Mapel terlebih dahulu' : 'Semua Bab pada Mapel ini'}
              </option>
              {filterAvailableChapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  Sem {ch.semester} · Bab {ch.number}: {ch.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="vault-search-input"
              className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
            >
              Cari Kata Kunci Catatan
            </label>
            <input
              id="vault-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari rumus, poin kunci, rangkuman..."
              className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
            />
          </div>
        </div>
      </div>

      {/* Create New Photo Note & Cornell Form */}
      {showCreateForm && (
        <form
          onSubmit={handleSaveNote}
          className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-6 space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
            <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Entri Catatan Foto Baru + Ringkasan Cornell
            </h3>
            <button
              type="button"
              onClick={() => {
                stopLiveCamera();
                setShowCreateForm(false);
              }}
              className="text-xs text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
            >
              Tutup
            </button>
          </div>

          {formError && (
            <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-[#DC2626]">
              {formError}
            </div>
          )}

          {/* Step 1: Dependent Dropdown Classification */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="note-form-sem"
                className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
              >
                Pilih Semester (1 / 2)
              </label>
              <select
                id="note-form-sem"
                value={formSemester}
                onChange={(e) => handleFormSemesterChange(Number(e.target.value) as SemesterNumber)}
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
              >
                <option value={1}>Semester 1 (Gasal)</option>
                <option value={2}>Semester 2 (Genap)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="note-form-subj"
                className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
              >
                Pilih Mata Pelajaran
              </label>
              <select
                id="note-form-subj"
                value={formSubjectId}
                onChange={(e) => handleFormSubjectChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
              >
                {curriculum.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="note-form-chap"
                className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
              >
                Pilih Bab (Otomatis Menyesuaikan)
              </label>
              <select
                id="note-form-chap"
                value={formChapterId}
                onChange={(e) => setFormChapterId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
              >
                {formAvailableChapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    Bab {ch.number}: {ch.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="note-title-input"
              className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
            >
              Judul Lembar Catatan
            </label>
            <input
              id="note-title-input"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Contoh: Catatan Hukum Ohm & Rangkaian Seri-Paralel"
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
            />
          </div>

          {/* Step 2: Upload Multiple Photos or Direct Camera */}
          <div className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  Foto Buku Catatan (Auto-Compress Canvas &le; 1400px, Kualitas 0.75)
                </p>
                <p className="text-[11px] text-[#475569] dark:text-[#94A3B8]">
                  Bisa unggah banyak foto sekaligus atau gunakan kamera langsung
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-md whitespace-nowrap shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih Banyak Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFilesSelected(e.target.files)}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={startLiveCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] rounded-md whitespace-nowrap shrink-0"
                >
                  <Camera className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Kamera Langsung</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateSampleCanvasPhoto}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#475569] dark:text-[#94A3B8] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] hover:text-[#0F172A] dark:hover:text-white rounded-md whitespace-nowrap shrink-0"
                >
                  <FileImage className="w-3.5 h-3.5" />
                  <span>Generate Lembar Diagram</span>
                </button>
              </div>
            </div>

            {isCompressing && (
              <p className="text-xs font-mono text-[#2563EB]">
                Memproses & mengompres gambar melalui HTML5 Canvas...
              </p>
            )}

            {compressionStats && (
              <div className="flex items-center gap-2 text-xs font-mono text-[#16A34A]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Kompresi Canvas Selesai: {compressionStats.width}×{compressionStats.height}px ·{' '}
                  {compressionStats.format} (q=0.75) · Ukuran: {compressionStats.originalKB} KB →{' '}
                  {compressionStats.compressedKB} KB
                </span>
              </div>
            )}

            {isCameraOpen && (
              <div className="p-3 bg-black rounded-lg space-y-2">
                <video
                  ref={videoRef}
                  className="w-full max-h-72 object-contain rounded"
                  playsInline
                  muted
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={stopLiveCamera}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-slate-700 rounded"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={captureFrameFromVideo}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2563EB] rounded"
                  >
                    Ambil Foto & Kompres
                  </button>
                </div>
              </div>
            )}

            {formImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {formImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative group border border-[#E2E8F0] dark:border-[#1E293B] rounded-md overflow-hidden bg-white dark:bg-[#111827]"
                  >
                    <img
                      src={imgUrl}
                      alt={`Pratinjau foto catatan ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-28 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormImages((prev) => prev.filter((_, i) => i !== idx))
                      }
                      aria-label={`Hapus foto ${idx + 1}`}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/70 text-white rounded hover:bg-[#DC2626]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 3: Digital Cornell Note Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="cornell-keypoints-input"
                className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1"
              >
                Kolom Cornell 1: Poin Kunci / Pertanyaan Penting
              </label>
              <textarea
                id="cornell-keypoints-input"
                rows={4}
                value={formKeyPoints}
                onChange={(e) => setFormKeyPoints(e.target.value)}
                placeholder="Tulis daftar pertanyaan pemantik atau kata kunci penting dari foto catatan ini..."
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
              />
            </div>

            <div>
              <label
                htmlFor="cornell-summary-input"
                className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1"
              >
                Kolom Cornell 2: Kesimpulan Inti (Summary 3 Kalimat)
              </label>
              <textarea
                id="cornell-summary-input"
                rows={4}
                value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)}
                placeholder="Rangkum isi catatan dalam 3 kalimat inti dengan bahasamu sendiri agar benar-benar paham..."
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-xs font-medium text-[#475569] dark:text-[#94A3B8]"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-md"
            >
              Simpan ke IndexedDB & Update Kurikulum
            </button>
          </div>
        </form>
      )}

      {/* Vault Entries Grid */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-12 text-center space-y-3">
          <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
            Belum ada catatan foto yang cocok dengan filter ini.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] rounded-md"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Catatan Foto Pertama</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredNotes.map((note) => {
            const isEditing = editingNoteId === note.id;
            return (
              <article
                key={note.id}
                className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-6 space-y-5"
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      {note.title}
                    </h3>
                    {/* Unboxed metadata with · separators */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                      <span className="font-semibold text-[#2563EB]">
                        Semester {note.semester}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                        {getSubjectName(note.subjectId)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{getChapterTitle(note.subjectId, note.chapterId)}</span>
                      {note.compressionStats && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">
                            {note.compressionStats.width}×{note.compressionStats.height}px (
                            {note.compressionStats.compressedKB} KB)
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openLightbox(note, 0)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-md whitespace-nowrap shrink-0"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Buka Lightbox & Buat Flashcard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(note.id)}
                      aria-label={`Hapus catatan ${note.title}`}
                      className="p-1.5 text-[#475569] dark:text-[#94A3B8] hover:text-[#DC2626] rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Photo Thumbnail + Cornell 2-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Photo Column (4 cols) */}
                  <div className="lg:col-span-4 space-y-2">
                    {note.images.length > 0 ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => openLightbox(note, 0)}
                          className="w-full block relative group border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg overflow-hidden bg-[#F8FAFC] dark:bg-[#090D16] text-left"
                        >
                          <img
                            src={note.images[0]}
                            alt={note.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-48 object-cover group-hover:scale-[1.02] transition-transform duration-200"
                          />
                          <div className="px-3 py-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent absolute bottom-0 inset-x-0 flex items-center justify-between text-white text-xs">
                            <span>Klik untuk Zoom / Rotate / Buat Flashcard</span>
                            <span className="font-mono">{note.images.length} Foto</span>
                          </div>
                        </button>
                      </div>
                    ) : (
                      <div className="h-44 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-center text-xs text-[#475569]">
                        Tanpa lampiran foto
                      </div>
                    )}
                  </div>

                  {/* Cornell 2 Columns (8 cols) */}
                  <div className="lg:col-span-8 space-y-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Poin Kunci / Pertanyaan Penting
                          </label>
                          <textarea
                            rows={3}
                            value={editKeyPoints}
                            onChange={(e) => setEditKeyPoints(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Kesimpulan Inti (Summary 3 Kalimat)
                          </label>
                          <textarea
                            rows={3}
                            value={editSummary}
                            onChange={(e) => setEditSummary(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="px-3 py-1.5 text-xs text-[#475569]"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEditedCornell(note)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#16A34A] rounded"
                          >
                            Simpan Perubahan Cornell
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                              Poin Kunci / Pertanyaan Penting
                            </h4>
                            <button
                              type="button"
                              onClick={() => startEditingCornell(note)}
                              className="text-[11px] font-medium text-[#2563EB] hover:underline"
                            >
                              Edit
                            </button>
                          </div>
                          <p className="text-xs leading-relaxed text-[#475569] dark:text-[#94A3B8] whitespace-pre-line">
                            {note.keyPoints}
                          </p>
                        </div>

                        <div className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                              Kesimpulan Inti (Summary 3 Kalimat)
                            </h4>
                            <button
                              type="button"
                              onClick={() => startEditingCornell(note)}
                              className="text-[11px] font-medium text-[#2563EB] hover:underline"
                            >
                              Edit
                            </button>
                          </div>
                          <p className="text-xs leading-relaxed text-[#0F172A] dark:text-[#F8FAFC] whitespace-pre-line">
                            {note.summary}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Interactive Fullscreen Lightbox + Side-by-Side "Buat Flashcard dari Catatan Ini" */}
      {activeLightboxNote && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Lightbox Catatan ${activeLightboxNote.title}`}
          className="fixed inset-0 z-50 bg-black/85 flex flex-col lg:flex-row"
        >
          {/* Left/Main Interactive Photo Canvas Area */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            {/* Lightbox Control Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-[#090D16] border-b border-[#1E293B] text-white">
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate">{activeLightboxNote.title}</h3>
                <p className="text-xs text-[#94A3B8]">
                  {getSubjectName(activeLightboxNote.subjectId)} ·{' '}
                  {getChapterTitle(activeLightboxNote.subjectId, activeLightboxNote.chapterId)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                  aria-label="Zoom In Foto"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono bg-[#111827] border border-[#1E293B] rounded hover:border-[#2563EB]"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Zoom In</span>
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  aria-label="Zoom Out Foto"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono bg-[#111827] border border-[#1E293B] rounded hover:border-[#2563EB]"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                  <span>Zoom Out</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRotationDeg((r) => (r + 90) % 360)}
                  aria-label="Rotate 90 Derajat"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono bg-[#111827] border border-[#1E293B] rounded hover:border-[#2563EB]"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate 90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomScale(1);
                    setRotationDeg(0);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  className="px-2.5 py-1.5 text-xs font-mono bg-[#111827] border border-[#1E293B] rounded hover:border-[#2563EB]"
                >
                  Reset ({Math.round(zoomScale * 100)}%)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLightboxNote(null)}
                  aria-label="Tutup Lightbox"
                  className="p-1.5 bg-[#DC2626] text-white rounded hover:bg-rose-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Interactive Pan / Drag Viewport */}
            <div
              onMouseDown={(e) => {
                setIsPanning(true);
                panStartRef.current = {
                  x: e.clientX - panOffset.x,
                  y: e.clientY - panOffset.y,
                };
              }}
              onMouseMove={(e) => {
                if (!isPanning) return;
                setPanOffset({
                  x: e.clientX - panStartRef.current.x,
                  y: e.clientY - panStartRef.current.y,
                });
              }}
              onMouseUp={() => setIsPanning(false)}
              onMouseLeave={() => setIsPanning(false)}
              className="flex-1 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none p-4"
            >
              {activeLightboxNote.images[activeImageIndex] && (
                <img
                  src={activeLightboxNote.images[activeImageIndex]}
                  alt={activeLightboxNote.title}
                  referrerPolicy="no-referrer"
                  draggable={false}
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale}) rotate(${rotationDeg}deg)`,
                  }}
                  className="max-h-full max-w-full object-contain transition-transform duration-75"
                />
              )}
            </div>

            <div className="px-4 py-2 bg-[#090D16]/90 border-t border-[#1E293B] flex items-center justify-between text-xs text-[#94A3B8]">
              <span className="inline-flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5" />
                Geser (Drag) gambar untuk menggeser posisi · Skala:{' '}
                <strong className="font-mono text-white">{Math.round(zoomScale * 100)}%</strong> ·
                Rotasi: <strong className="font-mono text-white">{rotationDeg}°</strong>
              </span>
              {activeLightboxNote.images.length > 1 && (
                <div className="flex items-center gap-1">
                  {activeLightboxNote.images.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`px-2 py-0.5 rounded font-mono ${
                        activeImageIndex === idx
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-[#111827] text-[#94A3B8]'
                      }`}
                    >
                      Foto {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side Panel: "Buat Flashcard dari Catatan Ini" + Cornell Reference */}
          <aside className="w-full lg:w-96 bg-white dark:bg-[#111827] border-t lg:border-t-0 lg:border-l border-[#E2E8F0] dark:border-[#1E293B] p-5 overflow-y-auto flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                <Sparkles className="w-4 h-4 text-[#2563EB]" />
                <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Buat Flashcard dari Catatan Ini
                </h4>
              </div>

              <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                Baca foto catatan di samping, lalu ketik pertanyaan dan jawaban untuk langsung masuk ke deck{' '}
                <strong className="text-[#0F172A] dark:text-[#F8FAFC]">
                  {getChapterTitle(activeLightboxNote.subjectId, activeLightboxNote.chapterId)}
                </strong>
                .
              </p>

              {quickSavedBanner && (
                <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-[#16A34A]">
                  {quickSavedBanner}
                </div>
              )}

              <form onSubmit={handleQuickCreateFlashcardSubmit} className="space-y-3">
                <div>
                  <label
                    htmlFor="lightbox-fc-front"
                    className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1"
                  >
                    Bagian Depan (Pertanyaan / Konsep / Rumus)
                  </label>
                  <textarea
                    id="lightbox-fc-front"
                    rows={3}
                    value={quickFront}
                    onChange={(e) => setQuickFront(e.target.value)}
                    placeholder="Contoh: Apa syarat kurva fungsi kuadrat memotong sumbu-X di dua titik berbeda?"
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="lightbox-fc-back"
                    className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1"
                  >
                    Bagian Belakang (Jawaban / Penjelasan)
                  </label>
                  <textarea
                    id="lightbox-fc-back"
                    rows={3}
                    value={quickBack}
                    onChange={(e) => setQuickBack(e.target.value)}
                    placeholder="Contoh: Nilai Diskriminan harus positif (D = b² - 4ac > 0)."
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-md transition-colors"
                >
                  Simpan Flashcard ke Bab Ini
                </button>
              </form>

              {/* Cornell Notes Reference while inside Lightbox */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-3">
                <div>
                  <h5 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Poin Kunci Catatan Ini:
                  </h5>
                  <p className="text-xs text-[#475569] dark:text-[#94A3B8] whitespace-pre-line mt-1">
                    {activeLightboxNote.keyPoints}
                  </p>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Kesimpulan Cornell:
                  </h5>
                  <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC] whitespace-pre-line mt-1">
                    {activeLightboxNote.summary}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveLightboxNote(null)}
              className="w-full py-2 text-xs font-semibold text-[#475569] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md hover:text-[#0F172A] dark:hover:text-white"
            >
              Tutup Layar Penuh
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};
