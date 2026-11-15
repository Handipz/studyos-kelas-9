/**
 * StudyOS Kelas 9 — Settings & Backup Database View
 * Copyright (c) 2026 Hanif. All rights reserved.
 */
import React, { useState } from 'react';
import {
  Download,
  Upload,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { FullDatabaseDump } from '../types/study';
import { getTodayDateString } from '../utils/studyLogic';

interface SettingsBackupViewProps {
  snapshot: FullDatabaseDump;
  onExportJson: () => Promise<FullDatabaseDump>;
  onImportJson: (dump: FullDatabaseDump) => Promise<void>;
  onResetDefault: () => Promise<void>;
}

export const SettingsBackupView: React.FC<SettingsBackupViewProps> = ({
  snapshot,
  onExportJson,
  onImportJson,
  onResetDefault,
}) => {
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleDownloadBackup = async () => {
    try {
      const fullDump = await onExportJson();
      const jsonString = JSON.stringify(fullDump, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `StudyOS_Kelas9_Backup_${getTodayDateString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusBanner({
        type: 'success',
        text: 'Seluruh database IndexedDB (termasuk foto catatan terkompresi) berhasil diekspor ke file .JSON!',
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal mengekspor data JSON.',
      });
    }
  };

  const handleFileImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as FullDatabaseDump;
      await onImportJson(parsed);
      setStatusBanner({
        type: 'success',
        text: 'Backup JSON berhasil dipulihkan ke IndexedDB! Seluruh modul telah diperbarui.',
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'File JSON tidak valid atau gagal dipulihkan.',
      });
    }
  };

  const handleReset = async () => {
    await onResetDefault();
    setConfirmReset(false);
    setStatusBanner({
      type: 'success',
      text: 'Database berhasil dikembalikan ke data awal Kurikulum Kelas 9 SMP.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <Database className="w-5 h-5 text-[#2563EB]" />
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Pengaturan Database IndexedDB & Full Backup / Restore (.JSON)
            </h2>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
              Seluruh data dan foto catatan disimpan di IndexedDB perangkat (bukan localStorage) agar bebas QuotaExceededError
            </p>
          </div>
        </div>

        {statusBanner && (
          <div
            className={`p-3.5 rounded-lg border flex items-center gap-2.5 text-xs font-semibold ${
              statusBanner.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-[#16A34A]'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-[#DC2626]'
            }`}
          >
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusBanner.text}</span>
          </div>
        )}

        {/* Object Store Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-xs text-[#475569] dark:text-[#94A3B8]">Store: curriculum</span>
            <p className="text-lg font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
              {snapshot.curriculum.length} Mapel
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-xs text-[#475569] dark:text-[#94A3B8]">Store: notes (Foto)</span>
            <p className="text-lg font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
              {snapshot.notes.length} Catatan
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-xs text-[#475569] dark:text-[#94A3B8]">Store: flashcards</span>
            <p className="text-lg font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
              {snapshot.flashcards.length} Kartu
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-xs text-[#475569] dark:text-[#94A3B8]">
              Store: tasks & mistakes
            </span>
            <p className="text-lg font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
              {snapshot.tasks.length} Tugas · {snapshot.mistakes.length} Log
            </p>
          </div>
        </div>

        {/* Export & Import Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="p-5 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] flex flex-col justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                1. Export All Data (.json)
              </h3>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                Unduh seluruh isi database (Tugas, Jadwal, Catatan Foto Cornell terkompresi, Flashcards, Rumus, Mistake Logbook, dan Nilai Rapor) ke dalam satu file JSON.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg"
            >
              <Download className="w-4 h-4" />
              <span>Export All Data (.json)</span>
            </button>
          </div>

          <div className="p-5 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] flex flex-col justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                2. Import / Restore Data (.json)
              </h3>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                Pulihkan atau pindahkan data belajar dari perangkat lain dengan mengunggah file cadangan `.json` StudyOS Kelas 9.
              </p>
            </div>
            <label className="cursor-pointer inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] rounded-lg">
              <Upload className="w-4 h-4 text-[#2563EB]" />
              <span>Pilih File Backup (.json)</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => handleFileImport(e.target.files?.[0])}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Reset Default Curriculum */}
        <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Reset ke Data Awal Kurikulum Kelas 9 SMP
            </h4>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
              Mengembalikan seluruh contoh catatan, rumus, flashcard, dan kurikulum bawaan Semester 1 & 2.
            </p>
          </div>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#DC2626] border border-rose-300 dark:border-rose-800 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Data Bawaan</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1.5 text-xs text-[#475569]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#DC2626] rounded-md"
              >
                Ya, Reset Sekarang
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
