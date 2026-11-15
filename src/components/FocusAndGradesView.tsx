/**
 * StudyOS Kelas 9 — Focus Timer & Grade Simulator View
 * Copyright (c) 2026 Hanif. All rights reserved.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle2,
  Calculator,
  Plus,
  Trash2,
  Clock,
  Target,
} from 'lucide-react';
import {
  CurriculumSubject,
  StudyLog,
  SubjectGradeRecord,
} from '../types/study';
import {
  AMBIENT_SOUNDS_CATALOG,
  ambientAudio,
  AmbientSoundType,
} from '../utils/audioSynth';
import {
  calculateSubjectGradeSimulation,
  getTodayDateString,
} from '../utils/studyLogic';

interface FocusAndGradesViewProps {
  curriculum: CurriculumSubject[];
  studyLogs: StudyLog[];
  grades: SubjectGradeRecord[];
  onLogStudySession: (
    subjectId: string,
    chapterId: string,
    mode: 'Pomodoro 25/5' | 'Deep Work 50/10',
    durationMinutes: number
  ) => Promise<void>;
  onUpdateTargetGrade: (subjectId: string, targetGrade: number) => Promise<void>;
  onAddGradeAssessment: (
    subjectId: string,
    type: 'Tugas' | 'UH' | 'PTS' | 'PAS',
    label: string,
    score: number
  ) => Promise<void>;
  onDeleteGradeAssessment: (subjectId: string, assessmentId: string) => Promise<void>;
}

export const FocusAndGradesView: React.FC<FocusAndGradesViewProps> = ({
  curriculum,
  studyLogs,
  grades,
  onLogStudySession,
  onUpdateTargetGrade,
  onAddGradeAssessment,
  onDeleteGradeAssessment,
}) => {
  // Timer State
  const [timerMode, setTimerMode] = useState<'Pomodoro 25/5' | 'Deep Work 50/10'>('Pomodoro 25/5');
  const [phase, setPhase] = useState<'FOCUS' | 'BREAK'>('FOCUS');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState(curriculum[0]?.id || 'matematika');
  const [selectedChapterId, setSelectedChapterId] = useState(
    curriculum[0]?.chapters[0]?.id || 'mtk-1-1'
  );
  const [sessionSavedMessage, setSessionSavedMessage] = useState<string | null>(null);

  // Web Audio Synthesizer State
  const [soundType, setSoundType] = useState<AmbientSoundType>('off');
  const [volume, setVolume] = useState(0.35);

  // Grade Tracker State
  const [gradeSubjectId, setGradeSubjectId] = useState<string>('matematika');
  const [newAssType, setNewAssType] = useState<'Tugas' | 'UH' | 'PTS' | 'PAS'>('UH');
  const [newAssLabel, setNewAssLabel] = useState('');
  const [newAssScore, setNewAssScore] = useState('92');

  const focusChapters = useMemo(() => {
    const subj = curriculum.find((s) => s.id === selectedSubjectId);
    return subj?.chapters || [];
  }, [curriculum, selectedSubjectId]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      ambientAudio.stop();
    };
  }, []);

  const switchTimerMode = (mode: 'Pomodoro 25/5' | 'Deep Work 50/10') => {
    setIsRunning(false);
    setTimerMode(mode);
    setPhase('FOCUS');
    setSecondsLeft(mode === 'Pomodoro 25/5' ? 25 * 60 : 50 * 60);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (phase === 'FOCUS') {
      setSecondsLeft(timerMode === 'Pomodoro 25/5' ? 25 * 60 : 50 * 60);
    } else {
      setSecondsLeft(timerMode === 'Pomodoro 25/5' ? 5 * 60 : 10 * 60);
    }
  };

  const handleCompleteFocusSession = async () => {
    setIsRunning(false);
    const durationMins = timerMode === 'Pomodoro 25/5' ? 25 : 50;
    await onLogStudySession(
      selectedSubjectId,
      selectedChapterId || focusChapters[0]?.id || '',
      timerMode,
      durationMins
    );
    setSessionSavedMessage(
      `Sesi ${timerMode} (${durationMins} menit) berhasil dicatat ke Jam Belajar & Kurikulum!`
    );
    setTimeout(() => setSessionSavedMessage(null), 4000);
    // Switch to break phase
    setPhase('BREAK');
    setSecondsLeft(timerMode === 'Pomodoro 25/5' ? 5 * 60 : 10 * 60);
  };

  const handleAmbientSoundChange = (nextType: AmbientSoundType) => {
    setSoundType(nextType);
    ambientAudio.start(nextType, volume);
  };

  const handleVolumeChange = (nextVol: number) => {
    setVolume(nextVol);
    ambientAudio.setVolume(nextVol);
  };

  const formattedTime = useMemo(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [secondsLeft]);

  const activeGradeRecord = useMemo((): SubjectGradeRecord => {
    const existing = grades.find((g) => g.subjectId === gradeSubjectId);
    if (existing) return existing;
    return {
      id: gradeSubjectId,
      subjectId: gradeSubjectId,
      semester: 1,
      targetGrade: 90,
      assessments: [],
    };
  }, [grades, gradeSubjectId]);

  const gradeSimulation = useMemo(
    () => calculateSubjectGradeSimulation(activeGradeRecord),
    [activeGradeRecord]
  );

  const handleAddAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericScore = Number(newAssScore);
    if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 100) return;
    const defaultLabel = `${newAssType} ${activeGradeRecord.assessments.length + 1} (${getTodayDateString()})`;
    await onAddGradeAssessment(
      gradeSubjectId,
      newAssType,
      newAssLabel.trim() || defaultLabel,
      numericScore
    );
    setNewAssLabel('');
  };

  const totalHoursBySubject = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of studyLogs) {
      map.set(log.subjectId, (map.get(log.subjectId) || 0) + log.durationMinutes);
    }
    return map;
  }, [studyLogs]);

  const getSubjectName = (subjectId: string) =>
    curriculum.find((s) => s.id === subjectId)?.name || subjectId;

  return (
    <div className="space-y-8">
      {/* Top Section: Focus Studio (Deep Work Timer + Web Audio API White Noise) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Deep Work & Pomodoro Timer */}
        <section className="lg:col-span-7 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Focus Studio — Deep Work & Pomodoro Timer
              </h2>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
                Terhubung langsung ke Mata Pelajaran & otomatis mencatat statistik Jam Belajar
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg">
              {(['Pomodoro 25/5', 'Deep Work 50/10'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchTimerMode(m)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
                    timerMode === m
                      ? 'bg-[#2563EB] text-white'
                      : 'text-[#475569] dark:text-[#94A3B8]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {sessionSavedMessage && (
            <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-[#16A34A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{sessionSavedMessage}</span>
            </div>
          )}

          {/* Subject & Chapter Binding */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="focus-subj-select"
                className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
              >
                Mata Pelajaran yang Sedang Dipelajari
              </label>
              <select
                id="focus-subj-select"
                value={selectedSubjectId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedSubjectId(id);
                  const subj = curriculum.find((s) => s.id === id);
                  setSelectedChapterId(subj?.chapters[0]?.id || '');
                }}
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
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
                htmlFor="focus-chap-select"
                className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1"
              >
                Bab Target Fokus
              </label>
              <select
                id="focus-chap-select"
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
              >
                {focusChapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    Sem {ch.semester} · Bab {ch.number}: {ch.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Digital Clock Readout */}
          <div className="py-8 px-6 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] text-center space-y-4">
            <div className="text-xs font-mono font-semibold text-[#2563EB]">
              {phase === 'FOCUS' ? 'SESI FOKUS BELAJAR' : 'SESI ISTIRAHAT OTAK'} · {timerMode}
            </div>

            <div
              data-testid="focus-timer-display"
              className="text-5xl sm:text-6xl font-bold font-mono tabular-nums tracking-tight text-[#0F172A] dark:text-[#F8FAFC]"
            >
              {formattedTime}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRunning((r) => !r)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg"
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isRunning ? 'Jeda Timer' : 'Mulai Fokus'}</span>
              </button>

              <button
                type="button"
                onClick={resetTimer}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleCompleteFocusSession}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Selesaikan & Catat Jam Belajar</span>
              </button>
            </div>
          </div>
        </section>

        {/* Right 5 Cols: Web Audio API Synthesizer + Study Hours Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <div className="flex items-center gap-2">
                {soundType === 'off' ? (
                  <VolumeX className="w-4 h-4 text-[#475569]" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#2563EB] animate-pulse" />
                )}
                <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Web Audio Suara Penenang & Fokus
                </h3>
              </div>
              <span className="text-xs font-mono text-[#16A34A]">
                9 Suara · 100% Offline
              </span>
            </div>

            <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
              Pilih suara penenang alami, derau fokus, atau frekuensi gelombang
              otak Alpha yang disintesis langsung oleh Web Audio API tanpa
              kuota internet.
            </p>

            {/* Active Sound Info Box */}
            {(() => {
              const activeMeta =
                AMBIENT_SOUNDS_CATALOG.find((s) => s.id === soundType) ||
                AMBIENT_SOUNDS_CATALOG[0];
              return (
                <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        {activeMeta.label}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#2563EB]">
                        {activeMeta.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-0.5">
                      {activeMeta.description}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-[#16A34A] whitespace-nowrap shrink-0">
                    {activeMeta.frequencyInfo}
                  </span>
                </div>
              );
            })()}

            {/* Soundscape Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
              {AMBIENT_SOUNDS_CATALOG.map((item) => {
                const isSelected = soundType === item.id;
                const isOffBtn = item.id === 'off';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAmbientSoundChange(item.id)}
                    className={`p-2.5 text-left rounded-lg border transition-colors flex flex-col justify-between ${
                      isSelected
                        ? isOffBtn
                          ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] border-transparent'
                          : 'bg-[#2563EB] text-white border-[#2563EB]'
                        : 'bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold leading-snug">
                        {item.label}
                      </span>
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-white/20 text-current'
                            : 'bg-white dark:bg-[#111827] text-[#475569] dark:text-[#94A3B8]'
                        }`}
                      >
                        {item.category === 'Suara Alam'
                          ? 'Alam'
                          : item.category === 'Noise Fokus'
                          ? 'Fokus'
                          : item.category === 'Relaksasi Otak'
                          ? 'Alpha/Zen'
                          : 'Off'}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] mt-1 line-clamp-1 ${
                        isSelected
                          ? 'opacity-90'
                          : 'text-[#475569] dark:text-[#94A3B8]'
                      }`}
                    >
                      {item.frequencyInfo}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label
                  htmlFor="synth-volume-slider"
                  className="font-medium text-[#475569] dark:text-[#94A3B8]"
                >
                  Intensitas / Volume Suara Penenang
                </label>
                <span className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <input
                id="synth-volume-slider"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full accent-[#2563EB]"
              />
            </div>
          </section>

          {/* Statistik Jam Belajar per Mapel */}
          <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-6 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <Clock className="w-4 h-4 text-[#16A34A]" />
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Rekap Durasi Belajar Tercatat
              </h3>
            </div>
            <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
              {Array.from(totalHoursBySubject.entries()).map(([subjId, mins]) => (
                <div key={subjId} className="py-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                    {getSubjectName(subjId)}
                  </span>
                  <span className="font-mono font-semibold text-[#2563EB]">
                    {mins} menit ({(mins / 60).toFixed(1)} jam)
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Section: Grade Tracker & Simulasi Target Rapor */}
      <section
        aria-label="Grade Tracker & Simulasi Target Rapor"
        className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-6 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <Calculator className="w-5 h-5 text-[#2563EB]" />
            <div>
              <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Grade Tracker & Kalkulator Simulasi Target Rapor
              </h2>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                Catat nilai Tugas, UH, PTS, & PAS per mata pelajaran dan hitung nilai minimal ujian berikutnya
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label htmlFor="grade-subject-select" className="sr-only">
                Pilih Mata Pelajaran
              </label>
              <select
                id="grade-subject-select"
                value={gradeSubjectId}
                onChange={(e) => setGradeSubjectId(e.target.value)}
                className="px-3.5 py-2 text-xs font-semibold bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md text-[#0F172A] dark:text-[#F8FAFC]"
              >
                {curriculum.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
              <Target className="w-4 h-4 text-[#2563EB]" />
              <label
                htmlFor="target-rapor-input"
                className="text-xs font-medium text-[#475569] dark:text-[#94A3B8]"
              >
                Target Rapor:
              </label>
              <input
                id="target-rapor-input"
                type="number"
                min={60}
                max={100}
                value={activeGradeRecord.targetGrade}
                onChange={(e) =>
                  onUpdateTargetGrade(gradeSubjectId, Number(e.target.value) || 90)
                }
                className="w-16 px-2 py-0.5 text-xs font-mono font-bold bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded text-[#2563EB]"
              />
            </div>
          </div>
        </div>

        {/* Simulation Output Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-xs text-[#475569] dark:text-[#94A3B8]">Rata-rata Saat Ini</span>
            <p
              data-testid="grade-current-average"
              className="text-2xl font-bold font-mono tabular-nums text-[#0F172A] dark:text-[#F8FAFC] mt-1"
            >
              {gradeSimulation.currentAverage}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-xs text-[#475569] dark:text-[#94A3B8]">Rata-rata Tugas & UH</span>
            <p className="text-lg font-bold font-mono tabular-nums text-[#0F172A] dark:text-[#F8FAFC] mt-1">
              Tgs: {gradeSimulation.tugasAvg ?? '-'} · UH: {gradeSimulation.uhAvg ?? '-'}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-xs text-[#475569] dark:text-[#94A3B8]">Nilai PTS & PAS</span>
            <p className="text-lg font-bold font-mono tabular-nums text-[#0F172A] dark:text-[#F8FAFC] mt-1">
              PTS: {gradeSimulation.ptsScore ?? '-'} · PAS: {gradeSimulation.pasScore ?? '-'}
            </p>
          </div>

          <div className="sm:col-span-2 p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#2563EB]">
                Minimal Nilai Ujian Berikutnya (Target {gradeSimulation.targetGrade})
              </span>
              <span
                data-testid="grade-required-next"
                className={`text-xl font-bold font-mono tabular-nums ${
                  gradeSimulation.status === 'achieved'
                    ? 'text-[#16A34A]'
                    : gradeSimulation.status === 'reachable'
                    ? 'text-[#2563EB]'
                    : 'text-[#D97706]'
                }`}
              >
                Min. {gradeSimulation.requiredNextScore}
              </span>
            </div>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
              {gradeSimulation.recommendationText}
            </p>
          </div>
        </div>

        {/* Add Assessment Form + Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleAddAssessmentSubmit}
            className="lg:col-span-4 p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3"
          >
            <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Input Nilai Baru ({getSubjectName(gradeSubjectId)})
            </h3>

            <div>
              <label htmlFor="ass-type-select" className="block text-xs font-medium mb-1">
                Jenis Komponen Nilai
              </label>
              <select
                id="ass-type-select"
                value={newAssType}
                onChange={(e) =>
                  setNewAssType(e.target.value as 'Tugas' | 'UH' | 'PTS' | 'PAS')
                }
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
              >
                <option value="Tugas">Tugas Harian / PR</option>
                <option value="UH">UH (Ulangan Harian)</option>
                <option value="PTS">PTS (Penilaian Tengah Semester)</option>
                <option value="PAS">PAS (Penilaian Akhir Semester)</option>
              </select>
            </div>

            <div>
              <label htmlFor="ass-label-input" className="block text-xs font-medium mb-1">
                Keterangan Nilai
              </label>
              <input
                id="ass-label-input"
                type="text"
                value={newAssLabel}
                onChange={(e) => setNewAssLabel(e.target.value)}
                placeholder="Contoh: UH 2 Transformasi Geometri"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
              />
            </div>

            <div>
              <label htmlFor="ass-score-input" className="block text-xs font-medium mb-1">
                Nilai (0 – 100)
              </label>
              <input
                id="ass-score-input"
                type="number"
                min={0}
                max={100}
                value={newAssScore}
                onChange={(e) => setNewAssScore(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Nilai & Hitung Ulang</span>
            </button>
          </form>

          {/* Assessments Table */}
          <div className="lg:col-span-8 overflow-x-auto border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#090D16] text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                  <th className="py-2.5 px-4">Komponen</th>
                  <th className="py-2.5 px-4">Keterangan Penilaian</th>
                  <th className="py-2.5 px-4">Tanggal</th>
                  <th className="py-2.5 px-4 text-right">Nilai</th>
                  <th className="py-2.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs">
                {activeGradeRecord.assessments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#475569] dark:text-[#94A3B8]">
                      Belum ada nilai tercatat untuk mata pelajaran ini.
                    </td>
                  </tr>
                ) : (
                  activeGradeRecord.assessments.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F8FAFC]/60 dark:hover:bg-[#090D16]/40">
                      <td className="py-2.5 px-4 font-semibold text-[#2563EB]">{item.type}</td>
                      <td className="py-2.5 px-4 font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                        {item.label}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[#475569] dark:text-[#94A3B8]">
                        {item.date}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        {item.score}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteGradeAssessment(gradeSubjectId, item.id)}
                          aria-label={`Hapus nilai ${item.label}`}
                          className="text-[#475569] hover:text-[#DC2626] p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
