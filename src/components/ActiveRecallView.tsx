/**
 * StudyOS Kelas 9 — Active Recall Per Bab & Formula Bank View
 * Copyright (c) 2026 Hanif. All rights reserved.
 */
import React, { useMemo, useState } from 'react';
import {
  Brain,
  RotateCcw,
  Plus,
  Pin,
  Trash2,
  AlertOctagon,
  BookOpen,
  Search,
  Printer,
  Copy,
  Check,
  Calculator,
  FileText,
  Table2,
  AlertTriangle,
  ListChecks,
  Download,
  FileCode,
  FileJson,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  CurriculumSubject,
  Flashcard,
  FlashcardSelfEval,
  FormulaCard,
  MistakeLog,
  SemesterNumber,
} from '../types/study';
import {
  calculateCoulombFormula,
  calculateCurvedSolidFormula,
  calculateOhmPowerFormula,
  calculateQuadraticFormula,
  CurvedSolidType,
  getChaptersForSubjectAndSemester,
  groupFlashcardsByChapterDeck,
  groupFormulasByChapter,
  isFlashcardDueToday,
  parseFormulaTextToSubItems,
  resolveSubFormulas,
} from '../utils/studyLogic';
import {
  downloadInteractiveStudyHtml,
  downloadStudyJsonPack,
  downloadStudyMarkdown,
} from '../utils/studyDownloadGenerator';

interface ActiveRecallViewProps {
  curriculum: CurriculumSubject[];
  flashcards: Flashcard[];
  formulas: FormulaCard[];
  mistakes: MistakeLog[];
  onAddFlashcard: (
    card: Omit<
      Flashcard,
      'id' | 'dueDate' | 'intervalDays' | 'reviewCount' | 'lastReviewedAt'
    >
  ) => void;
  onReviewFlashcard: (card: Flashcard, evaluation: FlashcardSelfEval) => void;
  onDeleteFlashcard: (cardId: string) => void;
  onAddFormula: (formula: Omit<FormulaCard, 'id'>) => void;
  onTogglePinFormula: (formula: FormulaCard) => void;
  onDeleteFormula: (formulaId: string) => void;
  onAddMistake: (mistake: Omit<MistakeLog, 'id' | 'createdAt'>) => void;
  onDeleteMistake: (mistakeId: string) => void;
}

type RecallSubTab = 'flashcards' | 'formulas' | 'mistakes';
type FormulaViewMode = 'table' | 'calculator' | 'cheatsheet';

export const ActiveRecallView: React.FC<ActiveRecallViewProps> = ({
  curriculum,
  flashcards,
  formulas,
  mistakes,
  onAddFlashcard,
  onReviewFlashcard,
  onDeleteFlashcard,
  onAddFormula,
  onTogglePinFormula,
  onDeleteFormula,
  onAddMistake,
  onDeleteMistake,
}) => {
  const [subTab, setSubTab] = useState<RecallSubTab>('flashcards');

  // Unified Subject, Semester & Chapter Selection (shared between Flashcards & Formulas for seamless study!)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | 'ALL'>(
    'ALL'
  );
  const [selectedSemester, setSelectedSemester] = useState<
    SemesterNumber | 'ALL'
  >('ALL');
  const [selectedChapterId, setSelectedChapterId] = useState<string | 'ALL'>(
    'ALL'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Flashcard Focus Player state
  const [fcFilterMode, setFcFilterMode] = useState<'ALL' | 'DUE'>('ALL');
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [revealAllInList, setRevealAllInList] = useState<boolean>(false);
  const [showAddFcForm, setShowAddFcForm] = useState<boolean>(false);

  // New Flashcard Form
  const [newFcSem, setNewFcSem] = useState<SemesterNumber>(1);
  const [newFcSubj, setNewFcSubj] = useState<string>(
    curriculum[0]?.id || 'matematika'
  );
  const [newFcChap, setNewFcChap] = useState<string>(
    curriculum[0]?.chapters[0]?.id || 'mtk-1-1'
  );
  const [newFcFront, setNewFcFront] = useState<string>('');
  const [newFcBack, setNewFcBack] = useState<string>('');

  // Formula Bank Controls
  const [formulaViewMode, setFormulaViewMode] =
    useState<FormulaViewMode>('table');
  const [formulaPinnedOnly, setFormulaPinnedOnly] = useState<boolean>(false);
  const [copiedFormulaId, setCopiedFormulaId] = useState<string | null>(null);
  const [showAddFormulaForm, setShowAddFormulaForm] = useState<boolean>(false);

  // New Formula Form
  const [formSem, setFormSem] = useState<SemesterNumber>(1);
  const [formSubj, setFormSubj] = useState<string>(
    curriculum[0]?.id || 'matematika'
  );
  const [formChap, setFormChap] = useState<string>(
    curriculum[0]?.chapters[0]?.id || 'mtk-1-1'
  );
  const [formTitle, setFormTitle] = useState<string>('');
  const [formExpr, setFormExpr] = useState<string>('');
  const [formVars, setFormVars] = useState<string>('');
  const [formExample, setFormExample] = useState<string>('');
  const [formSteps, setFormSteps] = useState<string>('');
  const [formExamTip, setFormExamTip] = useState<string>('');

  // Interactive Calculator State
  const [quadA, setQuadA] = useState<number>(1);
  const [quadB, setQuadB] = useState<number>(-5);
  const [quadC, setQuadC] = useState<number>(6);

  const [solidShape, setSolidShape] = useState<CurvedSolidType>('kerucut');
  const [solidR, setSolidR] = useState<number>(7);
  const [solidT, setSolidT] = useState<number>(24);

  const [coulombQ1, setCoulombQ1] = useState<number>(4);
  const [coulombQ2, setCoulombQ2] = useState<number>(6);
  const [coulombR, setCoulombR] = useState<number>(2);

  const [ohmV, setOhmV] = useState<number>(220);
  const [ohmR, setOhmR] = useState<number>(110);
  const [ohmMinutes, setOhmMinutes] = useState<number>(30);

  // New Mistake Form
  const [showAddMistakeForm, setShowAddMistakeForm] = useState<boolean>(false);
  const [misSem, setMisSem] = useState<SemesterNumber>(1);
  const [misSubj, setMisSubj] = useState<string>(
    curriculum[0]?.id || 'matematika'
  );
  const [misChap, setMisChap] = useState<string>(
    curriculum[0]?.chapters[0]?.id || 'mtk-1-1'
  );
  const [misPrompt, setMisPrompt] = useState<string>('');
  const [misWrong, setMisWrong] = useState<string>('');
  const [misCorrect, setMisCorrect] = useState<string>('');
  const [misTakeaway, setMisTakeaway] = useState<string>('');

  // 1. Group Flashcards & Formulas into Chapter Decks per Subject
  const chapterDecks = useMemo(() => {
    return groupFlashcardsByChapterDeck(flashcards, formulas, curriculum, {
      subjectId: selectedSubjectId,
      semester: selectedSemester,
      searchQuery,
      onlyWithContent: true,
    });
  }, [
    flashcards,
    formulas,
    curriculum,
    selectedSubjectId,
    selectedSemester,
    searchQuery,
  ]);

  // Summary counts per Subject for the top Subject Selector Bar
  const subjectStats = useMemo(() => {
    return curriculum.map((subj) => {
      const subjCards = flashcards.filter((fc) => fc.subjectId === subj.id);
      const subjFormulas = formulas.filter((fm) => fm.subjectId === subj.id);
      const mastered = subjCards.filter((fc) => fc.intervalDays >= 4).length;
      return {
        id: subj.id,
        name: subj.name,
        shortCode: subj.shortCode,
        cardsCount: subjCards.length,
        formulasCount: subjFormulas.length,
        masteredCount: mastered,
      };
    });
  }, [curriculum, flashcards, formulas]);

  // Active cards for the Focus Card Player (filtered by Subject, Semester, Chapter, Search, and Due mode)
  const activeDeckCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return flashcards.filter((c) => {
      const matchSubj =
        selectedSubjectId === 'ALL' || c.subjectId === selectedSubjectId;
      const matchSem =
        selectedSemester === 'ALL' || c.semester === selectedSemester;
      const matchChap =
        selectedChapterId === 'ALL' || c.chapterId === selectedChapterId;
      const matchDue = fcFilterMode === 'ALL' || isFlashcardDueToday(c);
      const matchQuery =
        !q ||
        c.front.toLowerCase().includes(q) ||
        c.back.toLowerCase().includes(q);
      return matchSubj && matchSem && matchChap && matchDue && matchQuery;
    });
  }, [
    flashcards,
    selectedSubjectId,
    selectedSemester,
    selectedChapterId,
    fcFilterMode,
    searchQuery,
  ]);

  // Chapter Decks visible in the "Daftar Kartu Per Bab" section
  const visibleFlashcardDecks = useMemo(() => {
    if (selectedChapterId === 'ALL') return chapterDecks.filter((d) => d.totalCards > 0);
    return chapterDecks.filter(
      (d) => d.chapterId === selectedChapterId && d.totalCards > 0
    );
  }, [chapterDecks, selectedChapterId]);

  const activeCard =
    activeDeckCards.length > 0
      ? activeDeckCards[currentCardIndex % activeDeckCards.length]
      : null;

  // Grouped Formulas by Chapter (respecting unified Subject, Semester, Chapter & Search)
  const groupedFormulaChapters = useMemo(() => {
    return groupFormulasByChapter(formulas, curriculum, {
      semester: selectedSemester,
      subjectId: selectedSubjectId,
      chapterId: selectedChapterId,
      pinnedOnly: formulaPinnedOnly,
      searchQuery,
    });
  }, [
    formulas,
    curriculum,
    selectedSemester,
    selectedSubjectId,
    selectedChapterId,
    formulaPinnedOnly,
    searchQuery,
  ]);

  const totalFilteredFormulas = useMemo(
    () =>
      groupedFormulaChapters.reduce((sum, grp) => sum + grp.formulas.length, 0),
    [groupedFormulaChapters]
  );

  const filteredExportFormulas = useMemo(
    () => groupedFormulaChapters.flatMap((grp) => grp.formulas),
    [groupedFormulaChapters]
  );

  // Global stats
  const totalDueCards = useMemo(
    () => flashcards.filter((c) => isFlashcardDueToday(c)).length,
    [flashcards]
  );
  const totalMasteredCards = useMemo(
    () => flashcards.filter((c) => c.intervalDays >= 4).length,
    [flashcards]
  );

  const getSubjectName = (subjectId: string) =>
    curriculum.find((s) => s.id === subjectId)?.name || subjectId.toUpperCase();

  const getChapterLabel = (subjectId: string, chapterId: string) => {
    const subj = curriculum.find((s) => s.id === subjectId);
    const ch = subj?.chapters.find((c) => c.id === chapterId);
    return ch ? `Bab ${ch.number}: ${ch.title}` : chapterId;
  };

  const handleSelectSubject = (subjId: string | 'ALL') => {
    setSelectedSubjectId(subjId);
    setSelectedChapterId('ALL');
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  const handleSelectChapterDeck = (
    subjId: string,
    chapId: string,
    targetTab: 'flashcards' | 'formulas'
  ) => {
    setSelectedSubjectId(subjId);
    setSelectedChapterId(chapId);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setSubTab(targetTab);
  };

  const handleEval = (evalChoice: FlashcardSelfEval) => {
    if (!activeCard) return;
    onReviewFlashcard(activeCard, evalChoice);
    setIsFlipped(false);
    setCurrentCardIndex((idx) => idx + 1);
  };

  const handleCopyFormula = async (item: FormulaCard) => {
    const subItems = resolveSubFormulas(item);
    const formattedLines =
      subItems.length > 0
        ? subItems.map((sf) => `- ${sf.target} : ${sf.expr}`).join('\n')
        : item.formula;
    const textToCopy = `${item.title} :\n${formattedLines}\nKeterangan: ${item.variables}\nContoh: ${item.example}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      }
    } catch {
      // Fallback
    }
    setCopiedFormulaId(item.id);
    window.setTimeout(() => {
      setCopiedFormulaId((prev) => (prev === item.id ? null : prev));
    }, 1800);
  };

  const handlePrintFormulas = () => {
    setSubTab('formulas');
    setFormulaViewMode('cheatsheet');
    window.setTimeout(() => {
      window.print();
    }, 150);
  };

  // Interactive Calculator Outputs
  const quadCalcResult = useMemo(
    () => calculateQuadraticFormula(quadA, quadB, quadC),
    [quadA, quadB, quadC]
  );
  const solidCalcResult = useMemo(
    () => calculateCurvedSolidFormula(solidShape, solidR, solidT),
    [solidShape, solidR, solidT]
  );
  const coulombCalcResult = useMemo(
    () => calculateCoulombFormula(coulombQ1, coulombQ2, coulombR),
    [coulombQ1, coulombQ2, coulombR]
  );
  const ohmCalcResult = useMemo(
    () => calculateOhmPowerFormula(ohmV, ohmR, ohmMinutes),
    [ohmV, ohmR, ohmMinutes]
  );

  const fcAvailableChapters = getChaptersForSubjectAndSemester(
    curriculum,
    newFcSubj,
    newFcSem
  );
  const formulaAvailableChapters = getChaptersForSubjectAndSemester(
    curriculum,
    formSubj,
    formSem
  );
  const mistakeAvailableChapters = getChaptersForSubjectAndSemester(
    curriculum,
    misSubj,
    misSem
  );

  const handleCreateFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFcFront.trim() || !newFcBack.trim()) return;
    onAddFlashcard({
      semester: newFcSem,
      subjectId: newFcSubj,
      chapterId: newFcChap,
      front: newFcFront.trim(),
      back: newFcBack.trim(),
    });
    setNewFcFront('');
    setNewFcBack('');
    setShowAddFcForm(false);
  };

  const handleCreateFormula = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formExpr.trim()) return;
    const parsedSubFormulas = parseFormulaTextToSubItems(formExpr.trim());
    onAddFormula({
      semester: formSem,
      subjectId: formSubj,
      chapterId: formChap,
      title: formTitle.trim(),
      formula: formExpr.trim(),
      subFormulas: parsedSubFormulas.length > 0 ? parsedSubFormulas : undefined,
      variables: formVars.trim() || '-',
      example: formExample.trim() || '-',
      steps: formSteps.trim() || undefined,
      examTip: formExamTip.trim() || undefined,
      isPinned: true,
    });
    setFormTitle('');
    setFormExpr('');
    setFormVars('');
    setFormExample('');
    setFormSteps('');
    setFormExamTip('');
    setShowAddFormulaForm(false);
  };

  const handleCreateMistake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!misPrompt.trim() || !misCorrect.trim()) return;
    onAddMistake({
      semester: misSem,
      subjectId: misSubj,
      chapterId: misChap,
      questionTitle: misPrompt.trim(),
      imageDataUrl: '',
      errorType: 'Salah Rumus',
      errorDetail: misWrong.trim() || '-',
      correctSolution: misCorrect.trim(),
    });
    setMisPrompt('');
    setMisWrong('');
    setMisCorrect('');
    setMisTakeaway('');
    setShowAddMistakeForm(false);
  };

  const activeChapterDeckInfo = useMemo(() => {
    if (selectedChapterId === 'ALL') return null;
    return chapterDecks.find((d) => d.chapterId === selectedChapterId) || null;
  }, [chapterDecks, selectedChapterId]);

  return (
    <div className="space-y-6">
      {/* Top Header + Offline Download Bar */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 sm:gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-mono uppercase tracking-wider text-[#2563EB] font-semibold">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>ACTIVE RECALL PER BAB & KITAB RUMUS KELAS 9</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] mt-1">
              Belajar Cepat Per Mata Pelajaran & Per Bab
            </h2>
            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] mt-0.5">
              Pilih Mata Pelajaran lalu klik Paket Bab di bawah untuk langsung
              menghafal Flashcard atau membaca Tabel Rumus bab tersebut.
            </p>
          </div>

          {/* 3 Main Mode Tabs */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1 sm:gap-1.5 bg-[#F8FAFC] dark:bg-[#090D16] p-1 sm:p-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSubTab('flashcards')}
              className={`min-h-[40px] inline-flex items-center justify-center gap-1.5 px-2 sm:px-3.5 py-2 text-xs font-bold rounded-lg transition-colors truncate ${
                subTab === 'flashcards'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <Brain className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden truncate">Kartu ({flashcards.length})</span>
              <span className="hidden sm:inline">Flashcard Per Bab ({flashcards.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('formulas')}
              className={`min-h-[40px] inline-flex items-center justify-center gap-1.5 px-2 sm:px-3.5 py-2 text-xs font-bold rounded-lg transition-colors truncate ${
                subTab === 'formulas'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden truncate">Rumus ({formulas.length})</span>
              <span className="hidden sm:inline">Rumus Per Bab ({formulas.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('mistakes')}
              className={`min-h-[40px] inline-flex items-center justify-center gap-1.5 px-2 sm:px-3.5 py-2 text-xs font-bold rounded-lg transition-colors truncate ${
                subTab === 'mistakes'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden truncate">Log ({mistakes.length})</span>
              <span className="hidden sm:inline">Catatan Salah Soal ({mistakes.length})</span>
            </button>
          </div>
        </div>

        {/* Summary Progress Strip + Multi-Format Offline Download Bar */}
        <div className="pt-3.5 sm:pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] font-semibold border border-emerald-200 dark:border-emerald-800/70">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>
                Hafal: {totalMasteredCards}/{flashcards.length} Kartu
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-[#D97706] font-semibold border border-amber-200 dark:border-amber-800/70">
              <Brain className="w-3.5 h-3.5 shrink-0" />
              <span>Jatuh Tempo: {totalDueCards} Kartu</span>
            </span>
            <span className="text-[11px] font-mono text-[#475569] dark:text-[#94A3B8] hidden sm:inline">
              Copyright © 2026 Hanif
            </span>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto">
            <button
              type="button"
              onClick={() =>
                downloadInteractiveStudyHtml(
                  filteredExportFormulas.length > 0
                    ? filteredExportFormulas
                    : formulas,
                  activeDeckCards.length > 0 ? activeDeckCards : flashcards,
                  curriculum,
                  selectedSubjectId === 'ALL'
                    ? 'Semua Mapel Kelas 9 (Semester 1 & 2)'
                    : `Mapel ${getSubjectName(selectedSubjectId)}`
                )
              }
              className="min-h-[38px] inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors truncate"
            >
              <FileCode className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden truncate">Modul (.html)</span>
              <span className="hidden sm:inline">Download Modul Interaktif (.html)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                downloadStudyMarkdown(
                  filteredExportFormulas.length > 0
                    ? filteredExportFormulas
                    : formulas,
                  activeDeckCards.length > 0 ? activeDeckCards : flashcards,
                  curriculum
                )
              }
              className="min-h-[38px] inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-[#090D16] hover:border-[#2563EB] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg transition-colors truncate"
            >
              <Download className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
              <span className="sm:hidden truncate">Ringkasan (.md)</span>
              <span className="hidden sm:inline">Download Ringkasan (.md)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                downloadStudyJsonPack(
                  filteredExportFormulas.length > 0
                    ? filteredExportFormulas
                    : formulas,
                  activeDeckCards.length > 0 ? activeDeckCards : flashcards
                )
              }
              className="min-h-[38px] inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-[#090D16] hover:border-[#2563EB] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg transition-colors truncate"
            >
              <FileJson className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
              <span className="sm:hidden truncate">Paket (.json)</span>
              <span className="hidden sm:inline">Download Paket (.json)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintFormulas}
              className="min-h-[38px] inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-[#090D16] hover:border-[#2563EB] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg transition-colors truncate"
            >
              <Printer className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span className="truncate">Cetak / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* STEP 1 & STEP 2: PILIH MATA PELAJARAN -> PILIH PAKET BAB (Visible on Flashcards & Formulas tabs) */}
      {subTab !== 'mistakes' && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5 print:hidden">
          {/* Step 1: Subject Tabs + Semester Filter + Search */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
            <div className="w-full lg:w-auto">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#2563EB]">
                LANGKAH 1 · PILIH MATA PELAJARAN
              </span>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => handleSelectSubject('ALL')}
                  className={`col-span-2 sm:col-span-1 min-h-[40px] px-3 py-2 rounded-lg text-xs font-bold border transition-colors text-left sm:text-center flex items-center justify-between sm:justify-center gap-1.5 ${
                    selectedSubjectId === 'ALL'
                      ? 'bg-[#2563EB] text-white border-[#2563EB]'
                      : 'bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB]'
                  }`}
                >
                  <span>Semua Mapel</span>
                  <span className="font-mono text-[11px] opacity-90">
                    ({flashcards.length} Kartu · {formulas.length} Rumus)
                  </span>
                </button>
                {subjectStats.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSelectSubject(st.id)}
                    className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-bold border transition-colors text-left sm:text-center flex flex-col sm:flex-row sm:items-center justify-center ${
                      selectedSubjectId === st.id
                        ? 'bg-[#2563EB] text-white border-[#2563EB]'
                        : 'bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB]'
                    }`}
                  >
                    <span className="truncate">{st.name}</span>
                    <span
                      className={`sm:ml-1.5 font-mono text-[10px] sm:text-[11px] ${
                        selectedSubjectId === st.id
                          ? 'text-blue-100'
                          : 'text-[#475569] dark:text-[#94A3B8]'
                      }`}
                    >
                      ({st.cardsCount} Kartu · {st.formulasCount} Rumus)
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Semester & Search Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              <div className="grid grid-cols-3 sm:inline-flex rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] p-1 border border-[#E2E8F0] dark:border-[#1E293B]">
                {(['ALL', 1, 2] as const).map((semOpt) => (
                  <button
                    key={String(semOpt)}
                    type="button"
                    onClick={() => {
                      setSelectedSemester(semOpt);
                      setSelectedChapterId('ALL');
                      setCurrentCardIndex(0);
                    }}
                    className={`min-h-[34px] px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                      selectedSemester === semOpt
                        ? 'bg-[#2563EB] text-white'
                        : 'text-[#475569] dark:text-[#94A3B8]'
                    }`}
                  >
                    {semOpt === 'ALL' ? 'Sem 1 & 2' : `Sem ${semOpt}`}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 sm:min-w-[210px]">
                <Search className="w-3.5 h-3.5 text-[#475569] dark:text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentCardIndex(0);
                  }}
                  placeholder="Cari bab, rumus, atau soal..."
                  className="w-full min-h-[38px] pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Paket Kartu Per Bab (Chapter Deck Cards with Mastery Progress) */}
          <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#2563EB]" />
                <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  LANGKAH 2 · PILIH PAKET BAB ({chapterDecks.length} Bab
                  Tersedia)
                </span>
              </div>
              {selectedChapterId !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChapterId('ALL');
                    setCurrentCardIndex(0);
                    setIsFlipped(false);
                  }}
                  className="text-xs font-bold text-[#2563EB] hover:underline"
                >
                  Tampilkan Semua Bab Sekaligus →
                </button>
              )}
            </div>

            {chapterDecks.length === 0 ? (
              <div className="p-6 text-center rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] text-xs text-[#475569] dark:text-[#94A3B8]">
                Tidak ada bab yang cocok dengan kata kunci pencarian.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {chapterDecks.map((deck) => {
                  const isSelected = selectedChapterId === deck.chapterId;
                  return (
                    <div
                      key={deck.chapterId}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/30 border-[#2563EB] ring-1 ring-[#2563EB]'
                          : 'bg-[#F8FAFC] dark:bg-[#090D16] border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB]'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-white dark:bg-[#111827] text-[#2563EB] border border-[#E2E8F0] dark:border-[#1E293B]">
                            {deck.subjectShortCode} · Sem {deck.semester} · Bab{' '}
                            {deck.chapterNumber}
                          </span>
                          <span className="text-[11px] font-mono font-semibold text-[#16A34A]">
                            {deck.masteryPercentage}% Hafal
                          </span>
                        </div>

                        <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-snug">
                          {deck.chapterTitle}
                        </h3>

                        {/* Mastery Progress Bar */}
                        <div className="w-full h-1.5 bg-[#E2E8F0] dark:bg-[#1E293B] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#16A34A] transition-all"
                            style={{ width: `${deck.masteryPercentage}%` }}
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#475569] dark:text-[#94A3B8] font-mono pt-0.5">
                          <span>
                            {deck.totalCards} Flashcard ({deck.masteredCount}{' '}
                            Hafal)
                          </span>
                          <span>{deck.formulas.length} Tabel Rumus</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectChapterDeck(
                              deck.subjectId,
                              deck.chapterId,
                              'flashcards'
                            )
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${
                            isSelected && subTab === 'flashcards'
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB]'
                          }`}
                        >
                          <Brain className="w-3 h-3 text-[#2563EB] shrink-0" />
                          <span>Flashcard ({deck.totalCards})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleSelectChapterDeck(
                              deck.subjectId,
                              deck.chapterId,
                              'formulas'
                            )
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${
                            isSelected && subTab === 'formulas'
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB]'
                          }`}
                        >
                          <BookOpen className="w-3 h-3 text-[#16A34A] shrink-0" />
                          <span>Rumus ({deck.formulas.length})</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 1: FLASHCARDS PER BAB (CLEAN FOCUS CARD + PER-CHAPTER LIST) */}
      {subTab === 'flashcards' && (
        <div className="space-y-6">
          {/* Active Deck Action Bar */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#2563EB]">
                  RUANG LATIHAN FLASHCARD AKTIF
                </span>
                <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {activeChapterDeckInfo
                    ? `${activeChapterDeckInfo.subjectName} — Bab ${activeChapterDeckInfo.chapterNumber}: ${activeChapterDeckInfo.chapterTitle}`
                    : selectedSubjectId === 'ALL'
                    ? 'Semua Mata Pelajaran & Bab'
                    : `Semua Bab — ${getSubjectName(selectedSubjectId)}`}
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:inline-flex rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] p-1 border border-[#E2E8F0] dark:border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => {
                    setFcFilterMode('ALL');
                    setCurrentCardIndex(0);
                    setIsFlipped(false);
                  }}
                  className={`min-h-[34px] px-3 py-1 text-xs font-semibold rounded-md ${
                    fcFilterMode === 'ALL'
                      ? 'bg-[#2563EB] text-white'
                      : 'text-[#475569] dark:text-[#94A3B8]'
                  }`}
                >
                  Semua Kartu ({activeDeckCards.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFcFilterMode('DUE');
                    setCurrentCardIndex(0);
                    setIsFlipped(false);
                  }}
                  className={`min-h-[34px] px-3 py-1 text-xs font-semibold rounded-md ${
                    fcFilterMode === 'DUE'
                      ? 'bg-[#2563EB] text-white'
                      : 'text-[#475569] dark:text-[#94A3B8]'
                  }`}
                >
                  Perlu Diulang Saja
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddFcForm((v) => !v)}
              className="w-full sm:w-auto min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kartu Flashcard</span>
            </button>
          </div>

          {/* Add New Flashcard Form */}
          {showAddFcForm && (
            <form
              onSubmit={handleCreateFlashcard}
              className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-6 space-y-4"
            >
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Tambah Flashcard Baru ke Bab Tertentu
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1">
                    Semester
                  </label>
                  <select
                    value={newFcSem}
                    onChange={(e) => {
                      const sem = Number(e.target.value) as SemesterNumber;
                      setNewFcSem(sem);
                      const chaps = getChaptersForSubjectAndSemester(
                        curriculum,
                        newFcSubj,
                        sem
                      );
                      setNewFcChap(chaps[0]?.id || '');
                    }}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                  >
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1">
                    Mata Pelajaran
                  </label>
                  <select
                    value={newFcSubj}
                    onChange={(e) => {
                      const subj = e.target.value;
                      setNewFcSubj(subj);
                      const chaps = getChaptersForSubjectAndSemester(
                        curriculum,
                        subj,
                        newFcSem
                      );
                      setNewFcChap(chaps[0]?.id || '');
                    }}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
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
                    Bab
                  </label>
                  <select
                    value={newFcChap}
                    onChange={(e) => setNewFcChap(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                  >
                    {fcAvailableChapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        Bab {ch.number}: {ch.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1">
                    Pertanyaan Depan (Front)
                  </label>
                  <textarea
                    rows={3}
                    value={newFcFront}
                    onChange={(e) => setNewFcFront(e.target.value)}
                    placeholder="Contoh: Bagaimana bunyi Hukum Coulomb & satuan muatannya?"
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1">
                    Jawaban / Rumus Belakang (Back)
                  </label>
                  <textarea
                    rows={3}
                    value={newFcBack}
                    onChange={(e) => setNewFcBack(e.target.value)}
                    placeholder="Contoh: F = k * (q1 * q2) / r^2. Ingat ubah mikroCoulomb ke Coulomb!"
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFcForm(false)}
                  className="px-4 py-2 text-xs text-[#475569]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#2563EB] rounded-lg"
                >
                  Simpan Flashcard
                </button>
              </div>
            </form>
          )}

          {/* CLEAN FOCUS FLASHCARD PLAYER */}
          {activeCard ? (
            <div className="bg-white dark:bg-[#111827] border-2 border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-4 sm:p-8 max-w-3xl mx-auto space-y-5 sm:space-y-6">
              {/* Card Metadata Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 sm:pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] font-mono text-xs font-bold">
                    {getSubjectName(activeCard.subjectId)} · Sem{' '}
                    {activeCard.semester}
                  </span>
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    {getChapterLabel(
                      activeCard.subjectId,
                      activeCard.chapterId
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-[#2563EB]">
                    Kartu {(currentCardIndex % activeDeckCards.length) + 1} dari{' '}
                    {activeDeckCards.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteFlashcard(activeCard.id)}
                    aria-label="Hapus flashcard ini"
                    className="text-[#475569] hover:text-[#DC2626] p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Interactive Question / Answer Area */}
              <div
                onClick={() => setIsFlipped((f) => !f)}
                className="min-h-[180px] sm:min-h-[200px] p-4 sm:p-6 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] flex flex-col justify-center cursor-pointer select-none transition-colors hover:border-[#2563EB]"
              >
                <span
                  className={`text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-bold mb-2 ${
                    isFlipped ? 'text-[#16A34A]' : 'text-[#2563EB]'
                  }`}
                >
                  {isFlipped
                    ? 'JAWABAN & KUNCI KONSEP (KETUK UNTUK KEMBALI KE SOAL)'
                    : 'PERTANYAAN ACTIVE RECALL (KETUK KARTU UNTUK LIHAT JAWABAN)'}
                </span>

                {!isFlipped ? (
                  <p className="text-sm sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                    {activeCard.front}
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                      Soal: {activeCard.front}
                    </p>
                    <div className="p-3.5 sm:p-4 rounded-lg bg-white dark:bg-[#111827] border border-emerald-300 dark:border-emerald-800 text-xs sm:text-base font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                      {activeCard.back}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Controls: Prev/Next + Flip + 3 Self-Evaluation Buttons */}
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFlipped((f) => !f)}
                    className="col-span-2 sm:order-2 min-h-[42px] inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {isFlipped
                        ? 'Tutup Jawaban'
                        : 'Balik Kartu (Lihat Jawaban)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentCardIndex((idx) =>
                        idx === 0 ? activeDeckCards.length - 1 : idx - 1
                      );
                    }}
                    className="sm:order-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#2563EB]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Sebelumnya</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentCardIndex(
                        (idx) => (idx + 1) % activeDeckCards.length
                      );
                    }}
                    className="sm:order-3 min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#2563EB]"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Always-accessible Spaced Repetition Evaluation Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                  <button
                    type="button"
                    onClick={() => handleEval('lupa')}
                    className="min-h-[42px] py-2.5 px-4 text-xs font-bold rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/30 text-[#DC2626] hover:bg-[#DC2626] hover:text-white transition-colors"
                  >
                    Lupa · Ulangi Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEval('ragu')}
                    className="min-h-[42px] py-2.5 px-4 text-xs font-bold rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-[#D97706] hover:bg-[#D97706] hover:text-white transition-colors"
                  >
                    Ragu-ragu · Ulang Besok (+1 Hari)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEval('hafal')}
                    className="min-h-[42px] py-2.5 px-4 text-xs font-bold rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-[#16A34A] hover:bg-[#16A34A] hover:text-white transition-colors"
                  >
                    Sudah Hafal · Lanjut (+4 Hari)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-8 text-center space-y-2">
              <p className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Semua flashcard pada filter ini sudah selesai diulas!
              </p>
              <button
                type="button"
                onClick={() => setFcFilterMode('ALL')}
                className="px-4 py-2 text-xs font-bold text-white bg-[#2563EB] rounded-lg"
              >
                Tampilkan Semua Kartu Bab Ini
              </button>
            </div>
          )}

          {/* DAFTAR LENGKAP FLASHCARD PER BAB PER PELAJARAN */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Daftar Tanya-Jawab Flashcard Per Bab & Mata Pelajaran
                </h3>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                  Baca cepat seluruh pertanyaan dan jawaban yang dikelompokkan
                  rapi per bab.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRevealAllInList((r) => !r)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#2563EB]"
              >
                {revealAllInList ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>Sembunyikan Jawaban (Mode Tes Diri)</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Tampilkan Semua Jawaban</span>
                  </>
                )}
              </button>
            </div>

            {visibleFlashcardDecks.map((deck) => (
              <div
                key={`list-${deck.chapterId}`}
                className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl overflow-hidden"
              >
                <div className="px-5 py-3.5 bg-[#F8FAFC] dark:bg-[#090D16] border-b border-[#E2E8F0] dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#2563EB] uppercase">
                      {deck.subjectShortCode} · SEMESTER {deck.semester}
                    </span>
                    <span className="text-xs text-[#475569]">—</span>
                    <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      {deck.subjectName}: Bab {deck.chapterNumber} —{' '}
                      {deck.chapterTitle}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-[#16A34A] font-semibold">
                      {deck.masteredCount}/{deck.totalCards} Hafal (
                      {deck.masteryPercentage}%)
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                  {deck.flashcards.map((fc, idx) => {
                    const isMastered = fc.intervalDays >= 4;
                    return (
                      <div
                        key={fc.id}
                        className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 hover:bg-[#F8FAFC]/60 dark:hover:bg-[#090D16]/40"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-[#2563EB]">
                              #{idx + 1}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                              {fc.front}
                            </span>
                          </div>

                          {revealAllInList ? (
                            <div className="p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-mono text-[#0F172A] dark:text-[#F8FAFC]">
                              <span className="font-sans font-bold text-[#16A34A]">
                                Jawaban:{' '}
                              </span>
                              {fc.back}
                            </div>
                          ) : (
                            <p className="text-[11px] italic text-[#475569] dark:text-[#94A3B8]">
                              Klik &quot;Tampilkan Semua Jawaban&quot; di atas
                              atau klik kartu di ruang latihan untuk membuka
                              jawaban.
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-1 rounded text-[11px] font-mono font-semibold ${
                              isMastered
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A]'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-[#D97706]'
                            }`}
                          >
                            {isMastered ? 'Sudah Hafal' : 'Perlu Latihan'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onReviewFlashcard(fc, 'hafal')}
                            className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#16A34A] text-white hover:bg-emerald-700"
                          >
                            Tandai Hafal
                          </button>
                          <button
                            type="button"
                            onClick={() => onReviewFlashcard(fc, 'lupa')}
                            className="px-2.5 py-1 rounded text-[11px] font-bold border border-[#E2E8F0] dark:border-[#1E293B] text-[#475569] dark:text-[#94A3B8] hover:text-[#DC2626]"
                          >
                            Ulangi
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 2: STRUCTURED FORMULA BANK PER BAB & INTERACTIVE CALCULATOR */}
      {subTab === 'formulas' && (
        <div className="space-y-6">
          {/* Top Formula Mode Switcher */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="grid grid-cols-1 sm:flex items-center gap-1.5 bg-[#F8FAFC] dark:bg-[#090D16] p-1 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFormulaViewMode('table')}
                className={`min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  formulaViewMode === 'table'
                    ? 'bg-[#2563EB] text-white'
                    : 'text-[#475569] dark:text-[#94A3B8]'
                }`}
              >
                <Table2 className="w-3.5 h-3.5 shrink-0" />
                <span>Daftar & Tabel Rumus ({totalFilteredFormulas})</span>
              </button>
              <button
                type="button"
                onClick={() => setFormulaViewMode('calculator')}
                className={`min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  formulaViewMode === 'calculator'
                    ? 'bg-[#2563EB] text-white'
                    : 'text-[#475569] dark:text-[#94A3B8]'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 shrink-0" />
                <span>Kalkulator Rumus Cepat</span>
              </button>
              <button
                type="button"
                onClick={() => setFormulaViewMode('cheatsheet')}
                className={`min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  formulaViewMode === 'cheatsheet'
                    ? 'bg-[#2563EB] text-white'
                    : 'text-[#475569] dark:text-[#94A3B8]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>Cheat-Sheet 1 Halaman</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFormulaPinnedOnly((p) => !p)}
                className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                  formulaPinnedOnly
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'bg-[#F8FAFC] dark:bg-[#090D16] text-[#475569] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#1E293B]'
                }`}
              >
                <Pin className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {formulaPinnedOnly ? 'Hanya Di-Pin' : 'Filter Di-Pin'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddFormulaForm((v) => !v)}
                className="min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Tambah Rumus</span>
              </button>
            </div>
          </div>

          {/* Add Custom Formula Form */}
          {showAddFormulaForm && (
            <form
              onSubmit={handleCreateFormula}
              className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-6 space-y-4"
            >
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Tambah Kartu Rumus Baru (Format Baris-per-Baris: Apa yang Dicari
                : Rumus)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Semester
                  </label>
                  <select
                    value={formSem}
                    onChange={(e) => {
                      const sem = Number(e.target.value) as SemesterNumber;
                      setFormSem(sem);
                      const chaps = getChaptersForSubjectAndSemester(
                        curriculum,
                        formSubj,
                        sem
                      );
                      setFormChap(chaps[0]?.id || '');
                    }}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                  >
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Mata Pelajaran
                  </label>
                  <select
                    value={formSubj}
                    onChange={(e) => {
                      const subj = e.target.value;
                      setFormSubj(subj);
                      const chaps = getChaptersForSubjectAndSemester(
                        curriculum,
                        subj,
                        formSem
                      );
                      setFormChap(chaps[0]?.id || '');
                    }}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                  >
                    {curriculum.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Bab</label>
                  <select
                    value={formChap}
                    onChange={(e) => setFormChap(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                  >
                    {formulaAvailableChapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        Bab {ch.number}: {ch.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Nama Bangun / Topik Rumus
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Contoh: Persegi"
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Daftar Rumus Baris-per-Baris (Format: Apa yang Dicari :
                    Rumus)
                  </label>
                  <textarea
                    rows={3}
                    value={formExpr}
                    onChange={(e) => setFormExpr(e.target.value)}
                    placeholder={
                      'Mencari Luas : s × s\nMencari Keliling : s + s + s + s'
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Keterangan Variabel
                  </label>
                  <input
                    type="text"
                    value={formVars}
                    onChange={(e) => setFormVars(e.target.value)}
                    placeholder="s: panjang sisi persegi (cm/m)"
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Contoh Penerapan Cepat
                  </label>
                  <input
                    type="text"
                    value={formExample}
                    onChange={(e) => setFormExample(e.target.value)}
                    placeholder="Jika s = 8 cm -> Luas = 8 × 8 = 64 cm²"
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFormulaForm(false)}
                  className="px-4 py-2 text-xs text-[#475569]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#2563EB] rounded-lg"
                >
                  Simpan ke Bank Rumus
                </button>
              </div>
            </form>
          )}

          {/* VIEW MODE 1: STRUCTURED PER-CHAPTER CARDS (MOBILE) + TABLE (DESKTOP) */}
          {formulaViewMode === 'table' && (
            <div className="space-y-6">
              {groupedFormulaChapters.length === 0 ? (
                <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-8 sm:p-10 text-center space-y-2">
                  <p className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Tidak ada rumus yang cocok dengan filter ini.
                  </p>
                </div>
              ) : (
                groupedFormulaChapters.map((group) => (
                  <div
                    key={`${group.subjectId}-${group.chapterId}`}
                    className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl overflow-hidden"
                  >
                    <div className="px-4 sm:px-5 py-3.5 bg-[#F8FAFC] dark:bg-[#090D16] border-b border-[#E2E8F0] dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-[11px] sm:text-xs font-mono font-bold text-[#2563EB] uppercase">
                          SEMESTER {group.semester} · {group.subjectShortCode}
                        </span>
                        <span
                          className="text-xs text-[#475569] dark:text-[#94A3B8] hidden sm:inline"
                          aria-hidden="true"
                        >
                          —
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                          {group.subjectName}: Bab {group.chapterNumber} —{' '}
                          {group.chapterTitle}
                        </h4>
                      </div>
                      <span className="text-[11px] sm:text-xs font-mono text-[#475569] dark:text-[#94A3B8]">
                        {group.formulas.length} Topik Rumus
                      </span>
                    </div>

                    {/* MOBILE STACKED FORMULA CARDS (< 768px) — Zero horizontal overflow! */}
                    <div className="md:hidden divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                      {group.formulas.map((item) => {
                        const isCopied = copiedFormulaId === item.id;
                        const subItems = resolveSubFormulas(item);
                        return (
                          <div key={`mob-${item.id}`} className="p-4 space-y-3 text-xs">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                                  {item.title} :
                                </div>
                                <div className="text-[11px] text-[#475569] dark:text-[#94A3B8] font-mono mt-0.5">
                                  Sem {item.semester} · Bab {group.chapterNumber} · {subItems.length} Rumus
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleCopyFormula(item)}
                                  className="px-2.5 py-1.5 text-[11px] font-semibold rounded-md border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] inline-flex items-center gap-1"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3 h-3 text-[#16A34A]" />
                                      <span className="text-[#16A34A]">Disalin</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-[#2563EB]" />
                                      <span>Salin</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onTogglePinFormula(item)}
                                  className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md border inline-flex items-center gap-1 ${
                                    item.isPinned
                                      ? 'bg-[#2563EB] text-white border-[#2563EB]'
                                      : 'bg-[#F8FAFC] dark:bg-[#090D16] text-[#475569] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#1E293B]'
                                  }`}
                                >
                                  <Pin className="w-3 h-3" />
                                  <span>{item.isPinned ? 'Pinned' : 'Pin'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteFormula(item.id)}
                                  aria-label={`Hapus rumus ${item.title}`}
                                  className="p-1.5 text-[#475569] hover:text-[#DC2626]"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Sub-Formulas Box */}
                            <div className="rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                              {subItems.map((sf, idx) => (
                                <div
                                  key={`${item.id}-mobsf-${idx}`}
                                  className="px-3 py-2 flex flex-col gap-0.5"
                                >
                                  <span className="text-[11px] font-semibold text-[#475569] dark:text-[#94A3B8]">
                                    {sf.target} :
                                  </span>
                                  <span className="font-mono text-xs font-bold text-[#2563EB] dark:text-blue-400 break-words">
                                    {sf.expr}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Variables */}
                            <div className="text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                              <span className="font-semibold text-[#475569] dark:text-[#94A3B8]">
                                Variabel:{' '}
                              </span>
                              {item.variables}
                            </div>

                            {/* Steps */}
                            {item.steps && (
                              <div className="p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] text-[11px] text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                                <div className="flex items-center gap-1 font-bold text-[#2563EB] mb-0.5">
                                  <ListChecks className="w-3.5 h-3.5 shrink-0" />
                                  <span>Langkah Penyelesaian:</span>
                                </div>
                                <div>{item.steps}</div>
                              </div>
                            )}

                            {/* Example */}
                            {item.example && (
                              <div className="font-mono text-[11px] text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed bg-[#F8FAFC] dark:bg-[#090D16] p-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B]">
                                <span className="font-sans font-bold text-[#16A34A]">
                                  Contoh:{' '}
                                </span>
                                {item.example}
                              </div>
                            )}

                            {/* Exam Tip */}
                            {item.examTip && (
                              <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/70 text-[11px] text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                                <div className="flex items-center gap-1 font-bold text-[#D97706] mb-0.5">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span>Tips Jebakan Ujian:</span>
                                </div>
                                <div>{item.examTip}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* DESKTOP 5-COLUMN FORMULA TABLE (>= 768px) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] text-[11px] font-semibold text-[#475569] dark:text-[#94A3B8] bg-white dark:bg-[#111827]">
                            <th className="py-3 px-4 w-[16%]">
                              Topik / Bangun
                            </th>
                            <th className="py-3 px-4 w-[36%]">
                              Rincian Apa yang Dicari : Rumus
                            </th>
                            <th className="py-3 px-4 w-[21%]">
                              Variabel & Langkah Penyelesaian
                            </th>
                            <th className="py-3 px-4 w-[20%]">
                              Contoh Soal & Tips Jebakan Ujian
                            </th>
                            <th className="py-3 px-4 w-[7%] text-right">
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs">
                          {group.formulas.map((item) => {
                            const isCopied = copiedFormulaId === item.id;
                            const subItems = resolveSubFormulas(item);
                            return (
                              <tr
                                key={item.id}
                                className="hover:bg-[#F8FAFC]/80 dark:hover:bg-[#090D16]/50 transition-colors align-top"
                              >
                                <td className="py-4 px-4">
                                  <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-snug">
                                    {item.title} :
                                  </div>
                                  <div className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-1 font-mono">
                                    Sem {item.semester} · Bab{' '}
                                    {group.chapterNumber} · {subItems.length}{' '}
                                    Rumus
                                  </div>
                                </td>

                                <td className="py-4 px-4">
                                  <div className="rounded-md bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                                    {subItems.map((sf, idx) => (
                                      <div
                                        key={`${item.id}-sf-${idx}`}
                                        className="px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3"
                                      >
                                        <span className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                                          {sf.target} :
                                        </span>
                                        <span className="font-mono text-xs font-bold text-[#2563EB] dark:text-blue-400">
                                          {sf.expr}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyFormula(item)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] hover:border-[#2563EB] text-[#0F172A] dark:text-[#F8FAFC]"
                                    >
                                      {isCopied ? (
                                        <>
                                          <Check className="w-3 h-3 text-[#16A34A]" />
                                          <span className="text-[#16A34A]">
                                            Tersalin!
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3 text-[#2563EB]" />
                                          <span>Salin Semua Rumus</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </td>

                                <td className="py-4 px-4 space-y-2">
                                  <div className="text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                                    <span className="font-semibold text-[#475569] dark:text-[#94A3B8]">
                                      Variabel:{' '}
                                    </span>
                                    {item.variables}
                                  </div>
                                  {item.steps && (
                                    <div className="p-2.5 rounded bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] text-[11px] text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                                      <div className="flex items-center gap-1 font-bold text-[#2563EB] mb-0.5">
                                        <ListChecks className="w-3.5 h-3.5 shrink-0" />
                                        <span>Langkah Penyelesaian:</span>
                                      </div>
                                      <div>{item.steps}</div>
                                    </div>
                                  )}
                                </td>

                                <td className="py-4 px-4 space-y-2">
                                  {item.example && (
                                    <div className="font-mono text-[11px] text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed bg-[#F8FAFC] dark:bg-[#090D16] p-2 rounded border border-[#E2E8F0] dark:border-[#1E293B]">
                                      <span className="font-sans font-bold text-[#16A34A]">
                                        Contoh:{' '}
                                      </span>
                                      {item.example}
                                    </div>
                                  )}
                                  {item.examTip && (
                                    <div className="p-2.5 rounded bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/70 text-[11px] text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                                      <div className="flex items-center gap-1 font-bold text-[#D97706] mb-0.5">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        <span>Tips Jebakan Ujian:</span>
                                      </div>
                                      <div>{item.examTip}</div>
                                    </div>
                                  )}
                                </td>

                                <td className="py-4 px-4 text-right">
                                  <div className="inline-flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => onTogglePinFormula(item)}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors whitespace-nowrap ${
                                        item.isPinned
                                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                                          : 'bg-[#F8FAFC] dark:bg-[#090D16] text-[#475569] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#1E293B]'
                                      }`}
                                    >
                                      <Pin className="w-3 h-3" />
                                      <span>
                                        {item.isPinned ? 'Pinned' : 'Pin'}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteFormula(item.id)}
                                      className="p-1 text-[#475569] hover:text-[#DC2626]"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* VIEW MODE 2: INTERACTIVE QUICK FORMULA CALCULATOR */}
          {formulaViewMode === 'calculator' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
              {/* Calculator 1: Quadratic Equation */}
              <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-6 space-y-4">
                <div className="border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
                  <span className="text-[11px] font-mono font-bold text-[#2563EB]">
                    MATEMATIKA SEM 1 · BAB 2
                  </span>
                  <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
                    1. Kalkulator Persamaan & Fungsi Kuadrat (ax² + bx + c = 0)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs font-mono font-semibold mb-1">
                      Koefisien a
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={quadA}
                      onChange={(e) => setQuadA(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-semibold mb-1">
                      Koefisien b
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={quadB}
                      onChange={(e) => setQuadB(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-semibold mb-1">
                      Konstanta c
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={quadC}
                      onChange={(e) => setQuadC(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
                    />
                  </div>
                </div>
                <div className="p-3.5 sm:p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#475569] dark:text-[#94A3B8]">
                      Diskriminan (D = b² - 4ac):
                    </span>
                    <span className="font-bold text-[#2563EB]">
                      {quadCalcResult.discriminant}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#475569] dark:text-[#94A3B8]">
                      Akar x₁ dan x₂:
                    </span>
                    <span className="font-bold text-[#16A34A]">
                      {quadCalcResult.x1 !== null
                        ? `x₁ = ${quadCalcResult.x1} | x₂ = ${quadCalcResult.x2}`
                        : 'Imajiner (D < 0)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#475569] dark:text-[#94A3B8]">
                      Titik Puncak (xp, yp):
                    </span>
                    <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      ({quadCalcResult.xp}, {quadCalcResult.yp})
                    </span>
                  </div>
                </div>
              </div>

              {/* Calculator 2: Curved 3D Solids */}
              <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-6 space-y-4">
                <div className="border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
                  <span className="text-[11px] font-mono font-bold text-[#2563EB]">
                    MATEMATIKA SEM 2 · BAB 2
                  </span>
                  <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
                    2. Kalkulator Bangun Ruang Sisi Lengkung (Tabung, Kerucut,
                    Bola)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Bangun Ruang
                    </label>
                    <select
                      value={solidShape}
                      onChange={(e) =>
                        setSolidShape(e.target.value as CurvedSolidType)
                      }
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
                    >
                      <option value="tabung">Tabung</option>
                      <option value="kerucut">Kerucut</option>
                      <option value="bola">Bola</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-semibold mb-1">
                      Jari-jari r (cm)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min={0.1}
                      value={solidR}
                      onChange={(e) => setSolidR(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-semibold mb-1">
                      Tinggi t (cm)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      disabled={solidShape === 'bola'}
                      value={solidT}
                      onChange={(e) => setSolidT(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="p-3.5 sm:p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2 font-mono text-xs">
                  {solidShape === 'kerucut' && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#475569] dark:text-[#94A3B8]">
                        Garis Pelukis (s = √(r²+t²)):
                      </span>
                      <span className="font-bold text-[#2563EB]">
                        {solidCalcResult.slantHeightS} cm
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#475569] dark:text-[#94A3B8]">
                      Luas Selimut:
                    </span>
                    <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      {solidCalcResult.curvedArea} cm²
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#475569] dark:text-[#94A3B8]">
                      Luas Permukaan Utuh:
                    </span>
                    <span className="font-bold text-[#16A34A]">
                      {solidCalcResult.fullSurfaceArea} cm²
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#475569] dark:text-[#94A3B8]">
                      Volume (V):
                    </span>
                    <span className="font-bold text-[#2563EB]">
                      {solidCalcResult.volume} cm³
                    </span>
                  </div>
                </div>
              </div>

              {/* Calculator 3: Coulomb's Law */}
              <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-6 space-y-4">
                <div className="border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
                  <span className="text-[11px] font-mono font-bold text-[#2563EB]">
                    FISIKA IPA SEM 1 · BAB 4
                  </span>
                  <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
                    3. Kalkulator Hukum Coulomb Listrik Statis (F = k·q₁·q₂ /
                    r²)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs font-mono font-semibold mb-1">
                      Muatan q₁ (μC)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={coulombQ1}
                      onChange={(e) => setCoulombQ1(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-semibold mb-1">
                      Muatan q₂ (μC)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={coulombQ2}
                      onChange={(e) => setCoulombQ2(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-semibold mb-1">
                      Jarak r (cm)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min={0.1}
                      value={coulombR}
                      onChange={(e) => setCoulombR(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
                    />
                  </div>
                </div>
                <div className="p-3.5 sm:p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#475569] dark:text-[#94A3B8]">
                      Gaya Coulomb (F):
                    </span>
                    <span className="font-bold text-[#16A34A]">
                      {coulombCalcResult.forceNewton} Newton
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] text-[11px] text-[#475569] dark:text-[#94A3B8] break-words">
                    {coulombCalcResult.steps}
                  </div>
                </div>
              </div>

              {/* Calculator 4: Ohm's Law & Electrical Energy */}
              <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-6 space-y-4">
                <div className="border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
                  <span className="text-[11px] font-mono font-bold text-[#2563EB]">
                    FISIKA IPA SEM 1 · BAB 5
                  </span>
                  <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
                    4. Kalkulator Hukum Ohm, Daya (Watt), dan Energi Listrik
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs font-mono font-semibold mb-1">
                      Tegangan V (Volt)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={ohmV}
                      onChange={(e) => setOhmV(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-semibold mb-1">
                      Hambatan R (Ω)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min={0.1}
                      value={ohmR}
                      onChange={(e) => setOhmR(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-semibold mb-1">
                      Waktu Nyala (Menit)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min={1}
                      value={ohmMinutes}
                      onChange={(e) => setOhmMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
                    />
                  </div>
                </div>
                <div className="p-3.5 sm:p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#475569] dark:text-[#94A3B8]">
                      Kuat Arus (I = V / R):
                    </span>
                    <span className="font-bold text-[#2563EB]">
                      {ohmCalcResult.currentAmpere} Ampere
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#475569] dark:text-[#94A3B8]">
                      Daya Listrik (P = V · I):
                    </span>
                    <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      {ohmCalcResult.powerWatt} Watt
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#475569] dark:text-[#94A3B8]">
                      Energi Listrik (W = P · t):
                    </span>
                    <span className="font-bold text-[#16A34A]">
                      {ohmCalcResult.energyJoule.toLocaleString('id-ID')} J
                      ({ohmCalcResult.energyKwh} kWh)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 3: 1-PAGE COMPACT CHEAT-SHEET (PRINTABLE SUMMARY) */}
          {formulaViewMode === 'cheatsheet' && (
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-6 space-y-5 print:border-0 print:p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                <div>
                  <h4 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Lembar Cheat-Sheet Ringkas Kelas 9 SMP — Persiapan Ulangan &
                    Ujian Sekolah
                  </h4>
                  <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                    Format padat 2 kolom (Apa yang Dicari : Rumus) siap cetak ke
                    kertas A4 / simpan PDF.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-[#2563EB]">
                  Total: {totalFilteredFormulas} Topik Rumus
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedFormulaChapters.map((group) => (
                  <div
                    key={`cs-${group.subjectId}-${group.chapterId}`}
                    className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3 break-inside-avoid"
                  >
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                      <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        {group.subjectShortCode} Sem {group.semester} · Bab{' '}
                        {group.chapterNumber}: {group.chapterTitle}
                      </span>
                      <span className="text-[11px] font-mono text-[#2563EB]">
                        {group.formulas.length} topik
                      </span>
                    </div>

                    <div className="space-y-3">
                      {group.formulas.map((f) => {
                        const subItems = resolveSubFormulas(f);
                        return (
                          <div
                            key={`cs-item-${f.id}`}
                            className="text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                                {f.title} :
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyFormula(f)}
                                className="text-[10px] font-mono text-[#2563EB] hover:underline print:hidden"
                              >
                                {copiedFormulaId === f.id
                                  ? 'Tersalin!'
                                  : 'Salin'}
                              </button>
                            </div>
                            <div className="bg-white dark:bg-[#111827] rounded border border-[#E2E8F0] dark:border-[#1E293B] divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                              {subItems.map((sf, idx) => (
                                <div
                                  key={`cs-sf-${f.id}-${idx}`}
                                  className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]"
                                >
                                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                                    {sf.target} :
                                  </span>
                                  <span className="font-mono font-bold text-[#2563EB] dark:text-blue-400">
                                    {sf.expr}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {f.examTip && (
                              <div className="text-[11px] text-[#D97706]">
                                <span className="font-semibold">Jebakan:</span>{' '}
                                {f.examTip}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#475569] dark:text-[#94A3B8]">
                <span>
                  StudyOS Kelas 9 — Lembar Ringkasan Rumus & Active Recall
                </span>
                <span>Copyright © 2026 Hanif · All Rights Reserved</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: MISTAKE LOGBOOK (BUKU ANALISIS KESALAHAN SOAL) */}
      {subTab === 'mistakes' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <AlertOctagon className="w-5 h-5 text-[#DC2626]" />
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Mistake Logbook — Buku Analisis Kesalahan Soal Latihan &
                  Ulangan
                </h3>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                  Dokumentasikan letak kesalahan agar tidak terulang saat PTS,
                  PAS, maupun Ujian Sekolah
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddMistakeForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Kesalahan Soal Baru</span>
            </button>
          </div>

          {showAddMistakeForm && (
            <form
              onSubmit={handleCreateMistake}
              className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-6 space-y-4"
            >
              <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Dokumentasi Soal yang Salah Dikerjakan
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Semester
                  </label>
                  <select
                    value={misSem}
                    onChange={(e) =>
                      setMisSem(Number(e.target.value) as SemesterNumber)
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                  >
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Mata Pelajaran
                  </label>
                  <select
                    value={misSubj}
                    onChange={(e) => {
                      const subj = e.target.value;
                      setMisSubj(subj);
                      const chaps = getChaptersForSubjectAndSemester(
                        curriculum,
                        subj,
                        misSem
                      );
                      setMisChap(chaps[0]?.id || '');
                    }}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                  >
                    {curriculum.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Bab</label>
                  <select
                    value={misChap}
                    onChange={(e) => setMisChap(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                  >
                    {mistakeAvailableChapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        Bab {ch.number}: {ch.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Soal / Konteks Pertanyaan
                </label>
                <input
                  type="text"
                  value={misPrompt}
                  onChange={(e) => setMisPrompt(e.target.value)}
                  placeholder="Contoh: Menghitung gaya Coulomb saat jarak dijauhkan 2 kali semula..."
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#DC2626] mb-1">
                    Jawaban / Langkah yang Keliru
                  </label>
                  <textarea
                    rows={2}
                    value={misWrong}
                    onChange={(e) => setMisWrong(e.target.value)}
                    placeholder="Membagi gaya dengan 2 saja (bukan 2 kuadrat)"
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#16A34A] mb-1">
                    Penyelesaian yang Benar
                  </label>
                  <textarea
                    rows={2}
                    value={misCorrect}
                    onChange={(e) => setMisCorrect(e.target.value)}
                    placeholder="Karena berbanding terbalik dengan r^2, maka F2 = (1/2)^2 * F1 = 1/4 F1"
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2563EB] mb-1">
                  Pelajaran Penting (Key Takeaway)
                </label>
                <input
                  type="text"
                  value={misTakeaway}
                  onChange={(e) => setMisTakeaway(e.target.value)}
                  placeholder="Selalu kuadratkan perubahan rasio jarak r pada rumus Hukum Coulomb!"
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMistakeForm(false)}
                  className="px-4 py-2 text-xs text-[#475569]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#2563EB] rounded-lg"
                >
                  Simpan ke Logbook
                </button>
              </div>
            </form>
          )}

          {mistakes.length === 0 ? (
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-8 text-center text-xs text-[#475569] dark:text-[#94A3B8]">
              Belum ada catatan kesalahan soal. Klik{' '}
              <strong>Catat Kesalahan Soal Baru</strong> di atas untuk mulai
              mencatat evaluasi latihanmu.
            </div>
          ) : (
            <div className="space-y-4">
              {mistakes.map((m) => (
                <div
                  key={m.id}
                  className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-6 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-mono text-[#2563EB] font-semibold">
                        Sem {m.semester} · {getSubjectName(m.subjectId)} —{' '}
                        {getChapterLabel(m.subjectId, m.chapterId)}
                      </span>
                      <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-1">
                        Soal: {m.questionTitle}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteMistake(m.id)}
                      aria-label={`Hapus log kesalahan ${m.questionTitle}`}
                      className="p-1 text-[#475569] hover:text-[#DC2626]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border-l-4 border-[#DC2626]">
                      <div className="font-bold text-[#DC2626] mb-1">
                        Letak Kekeliruan ({m.errorType}):
                      </div>
                      <p className="text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                        {m.errorDetail}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border-l-4 border-[#16A34A]">
                      <div className="font-bold text-[#16A34A] mb-1">
                        Langkah Penyelesaian Benar:
                      </div>
                      <p className="text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed font-mono">
                        {m.correctSolution}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
