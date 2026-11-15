/**
 * StudyOS Kelas 9 — Admin & Server Database Control Panel View
 * Copyright (c) 2026 Hanif. All rights reserved.
 */
import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Send,
  KeyRound,
  Users,
  History,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cloud,
  Smartphone,
  BookOpen,
  Database,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  CurriculumSubject,
  FonnteConfig,
  FullDatabaseDump,
  OtpVerificationLog,
  RegisteredUserSummary,
} from '../types/study';
import {
  clearAllOtpLogsFromCloud,
  deleteCloudAccountData,
  fetchOtpLogs,
  fetchRegisteredUsers,
  loadFonnteConfig,
  saveFonnteConfig,
  testFonnteWhatsAppSend,
} from '../services/authAndCloudService';

interface AdminDashboardViewProps {
  curriculum: CurriculumSubject[];
  snapshot: FullDatabaseDump;
  onNavigateCurriculum: () => void;
  onExportJson: () => Promise<FullDatabaseDump>;
  onImportJson: (dump: FullDatabaseDump) => Promise<void>;
  onResetDefault: () => Promise<void>;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  curriculum,
  snapshot,
  onNavigateCurriculum,
  onExportJson,
  onImportJson,
  onResetDefault,
}) => {
  const [fonnteConfig, setFonnteConfig] = useState<FonnteConfig>({
    token: '',
    otpTemplate:
      'Halo {name}, kode OTP login *StudyOS Kelas 9* kamu adalah: *{otp}*\n\nJangan berikan kode ini kepada siapapun. Semangat belajar & raih nilai terbaik!',
    updatedAt: '',
  });
  const [saveBanner, setSaveBanner] = useState<string>('');
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Test WhatsApp send state
  const [testPhone, setTestPhone] = useState<string>('');
  const [testMessage, setTestMessage] = useState<string>(
    'Halo! Ini pesan uji coba Bot WhatsApp Fonnte dari Panel Admin StudyOS Kelas 9.'
  );
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    detail: string;
  } | null>(null);
  const [isTestingWa, setIsTestingWa] = useState<boolean>(false);

  // Registered Users & OTP Logs
  const [users, setUsers] = useState<RegisteredUserSummary[]>([]);
  const [otpLogs, setOtpLogs] = useState<OtpVerificationLog[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Server Database & Backup/Restore/Reset state (Admin Only)
  const [dbActionStatus, setDbActionStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmResetWorkspace, setConfirmResetWorkspace] =
    useState<boolean>(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(
    null
  );

  const loadAllAdminData = async () => {
    setIsLoadingData(true);
    try {
      const [cfg, usrList, logList] = await Promise.all([
        loadFonnteConfig(),
        fetchRegisteredUsers(),
        fetchOtpLogs(),
      ]);
      setFonnteConfig(cfg);
      setUsers(usrList);
      setOtpLogs(logList);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const handleSaveFonnte = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setSaveBanner('');
    try {
      const updated = await saveFonnteConfig(
        fonnteConfig.token,
        fonnteConfig.otpTemplate
      );
      setFonnteConfig(updated);
      setSaveBanner(
        'Konfigurasi Token Fonnte & Template OTP berhasil disimpan ke Server Cloud Firestore!'
      );
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingWa(true);
    setTestResult(null);
    try {
      const res = await testFonnteWhatsAppSend(
        fonnteConfig.token,
        testPhone,
        testMessage
      );
      setTestResult(res);
    } finally {
      setIsTestingWa(false);
    }
  };

  const handleDeleteUserFromServer = async (user: RegisteredUserSummary) => {
    setDeletingAccountId(user.accountId);
    setDbActionStatus(null);
    try {
      const ok = await deleteCloudAccountData(user.accountId);
      if (ok) {
        setUsers((prev) =>
          prev.filter((u) => u.accountId !== user.accountId)
        );
        setDbActionStatus({
          type: 'success',
          text: `Data server & foto untuk akun ${user.displayName} (${user.phone}) berhasil dihapus dari Cloud Firestore.`,
        });
      }
    } finally {
      setDeletingAccountId(null);
    }
  };

  const handleClearOtpLogs = async () => {
    setDbActionStatus(null);
    const ok = await clearAllOtpLogsFromCloud();
    if (ok) {
      setOtpLogs([]);
      setDbActionStatus({
        type: 'success',
        text: 'Seluruh riwayat log OTP berhasil dibersihkan dari database server.',
      });
    }
  };

  const handleDownloadBackupJson = async () => {
    try {
      const dump = await onExportJson();
      const jsonStr = JSON.stringify(
        {
          copyright: 'Copyright © 2026 Hanif — StudyOS Kelas 9 Server Backup',
          ...dump,
        },
        null,
        2
      );
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studyos-server-backup-hanif-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDbActionStatus({
        type: 'success',
        text: 'Snapshot Database Server (.json) berhasil diunduh oleh Admin.',
      });
    } catch {
      setDbActionStatus({
        type: 'error',
        text: 'Gagal mengekspor file JSON cadangan database.',
      });
    }
  };

  const handleUploadRestoreJson = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as FullDatabaseDump;
      if (!parsed.curriculum || !Array.isArray(parsed.curriculum)) {
        throw new Error('Format file JSON tidak valid');
      }
      await onImportJson(parsed);
      setDbActionStatus({
        type: 'success',
        text: 'Database berhasil dipulihkan (restore) oleh Admin dan disinkronkan ke server!',
      });
    } catch {
      setDbActionStatus({
        type: 'error',
        text: 'File cadangan tidak valid. Pastikan memilih file .json dari StudyOS Kelas 9.',
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleAdminResetDatabase = async () => {
    await onResetDefault();
    setConfirmResetWorkspace(false);
    setDbActionStatus({
      type: 'success',
      text: 'Database berhasil di-reset oleh Admin ke setelan bersih (hanya Kurikulum, Rumus & Active Recall default).',
    });
  };

  const totalChapters = curriculum.reduce(
    (acc, s) => acc + s.chapters.length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Admin Header Banner */}
      <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#2563EB] font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>
                PUSAT KONTROL DATABASE SERVER & ADMIN (HANYA ADMIN)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-1">
              Kontrol Database Server, Bot Fonnte & Pengguna
            </h1>
            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] mt-1">
              Seluruh pengaturan database server Cloud Firestore, backup/restore
              JSON, reset data sistem, dan gateway WhatsApp OTP dikontrol penuh
              hanya oleh Admin.
            </p>
          </div>
          <button
            type="button"
            onClick={loadAllAdminData}
            disabled={isLoadingData}
            className="min-h-[42px] px-4 py-2 rounded-lg text-xs font-bold border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#2563EB] flex items-center justify-center gap-2 transition-colors shrink-0"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`}
            />
            <span>Segarkan Database Server</span>
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="flex items-center justify-between text-xs text-[#475569] dark:text-[#94A3B8]">
              <span>Status Bot WA Fonnte</span>
              <KeyRound className="w-4 h-4 text-[#2563EB]" />
            </div>
            <p className="text-base font-bold font-mono mt-1.5 text-[#0F172A] dark:text-[#F8FAFC]">
              {fonnteConfig.token.trim()
                ? 'Token Fonnte Aktif'
                : 'Mode OTP Cadangan'}
            </p>
            <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-0.5">
              Endpoint: https://api.fonnte.com/send
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="flex items-center justify-between text-xs text-[#475569] dark:text-[#94A3B8]">
              <span>Database Akun Server Cloud</span>
              <Users className="w-4 h-4 text-[#16A34A]" />
            </div>
            <p className="text-base font-bold font-mono mt-1.5 text-[#0F172A] dark:text-[#F8FAFC]">
              {users.length} Akun Tersimpan
            </p>
            <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-0.5">
              Kontrol eksklusif oleh Admin
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="flex items-center justify-between text-xs text-[#475569] dark:text-[#94A3B8]">
              <span>Materi Server & Log OTP</span>
              <BookOpen className="w-4 h-4 text-[#D97706]" />
            </div>
            <p className="text-base font-bold font-mono mt-1.5 text-[#0F172A] dark:text-[#F8FAFC]">
              {curriculum.length} Mapel · {totalChapters} Bab ·{' '}
              {snapshot.formulas.length} Rumus · {snapshot.flashcards.length}{' '}
              Kartu
            </p>
            <button
              type="button"
              onClick={onNavigateCurriculum}
              className="text-[11px] font-semibold text-[#2563EB] hover:underline mt-0.5 inline-block"
            >
              Kelola Mapel & Bab Kurikulum →
            </button>
          </div>
        </div>
      </section>

      {dbActionStatus && (
        <div
          role="status"
          className={`p-4 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
            dbActionStatus.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          {dbActionStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
          )}
          <span>{dbActionStatus.text}</span>
        </div>
      )}

      {/* ADMIN-ONLY SERVER DATABASE BACKUP, RESTORE & RESET SECTION */}
      <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#2563EB]" />
              <span>
                Kontrol Database Server, Backup, Restore & Reset (Khusus Admin)
              </span>
            </h2>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
              Menu ini telah disembunyikan dari siswa dan hanya dapat diakses
              oleh Admin untuk mengontrol penuh isi database.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#2563EB]">
            Firestore + IndexedDB Engine v3
          </span>
        </div>

        {/* Live Database Record Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="text-[#475569] dark:text-[#94A3B8]">
              Rumus Terstruktur
            </div>
            <div className="text-base font-bold font-mono mt-1 text-[#0F172A] dark:text-[#F8FAFC]">
              {snapshot.formulas.length} Tabel
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="text-[#475569] dark:text-[#94A3B8]">
              Kartu Active Recall
            </div>
            <div className="text-base font-bold font-mono mt-1 text-[#0F172A] dark:text-[#F8FAFC]">
              {snapshot.flashcards.length} Kartu
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="text-[#475569] dark:text-[#94A3B8]">
              Catatan Foto Cornell
            </div>
            <div className="text-base font-bold font-mono mt-1 text-[#0F172A] dark:text-[#F8FAFC]">
              {snapshot.notes.length} Catatan
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="text-[#475569] dark:text-[#94A3B8]">
              Tugas & Kegiatan
            </div>
            <div className="text-base font-bold font-mono mt-1 text-[#0F172A] dark:text-[#F8FAFC]">
              {snapshot.tasks.length + (snapshot.activities || []).length} Item
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="text-[#475569] dark:text-[#94A3B8]">
              Akun Pengguna Cloud
            </div>
            <div className="text-base font-bold font-mono mt-1 text-[#16A34A]">
              {users.length} Akun
            </div>
          </div>
        </div>

        {/* 3 Admin Database Control Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                1. Ekspor Snapshot Database (.json)
              </h3>
              <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-1">
                Unduh cadangan penuh seluruh kurikulum, rumus, flashcard, foto,
                dan progres ke file JSON.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackupJson}
              className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Database (.json)</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                2. Impor / Restore Database (.json)
              </h3>
              <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-1">
                Pulihkan data database dari file JSON cadangan Admin dan
                sinkronkan ke Cloud server.
              </p>
            </div>
            <label className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] rounded-lg cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Pilih File Restore (.json)</span>
              <input
                type="file"
                accept="application/json"
                onChange={handleUploadRestoreJson}
                className="hidden"
              />
            </label>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                3. Reset Database ke Default Bersih
              </h3>
              <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-1">
                Kosongkan data tugas/foto dan kembalikan ke paket Rumus &
                Active Recall bawaan.
              </p>
            </div>
            {!confirmResetWorkspace ? (
              <button
                type="button"
                onClick={() => setConfirmResetWorkspace(true)}
                className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-[#DC2626] bg-white dark:bg-[#111827] border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Database Sistem</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAdminResetDatabase}
                  className="flex-1 min-h-[38px] px-3 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-rose-700 rounded-lg"
                >
                  Ya, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetWorkspace(false)}
                  className="px-3 py-2 text-xs font-semibold text-[#475569] dark:text-[#94A3B8]"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Grid: Fonnte Bot Configuration + Live WhatsApp Test */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fonnte Token & OTP Message Template */}
        <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#2563EB]" />
              <span>Pengaturan API Token Bot WhatsApp Fonnte</span>
            </h2>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
              Masukkan Device Token dari dashboard{' '}
              <span className="font-mono">md.fonnte.com</span> agar kode OTP
              dikirim langsung ke WhatsApp siswa saat login.
            </p>
          </div>

          {saveBanner && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2 text-xs text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
              <span>{saveBanner}</span>
            </div>
          )}

          <form onSubmit={handleSaveFonnte} className="space-y-4">
            <div>
              <label
                htmlFor="fonnte-token-input"
                className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5"
              >
                Fonnte API Device Token (Header Authorization)
              </label>
              <input
                id="fonnte-token-input"
                type="text"
                value={fonnteConfig.token}
                onChange={(e) =>
                  setFonnteConfig((prev) => ({
                    ...prev,
                    token: e.target.value,
                  }))
                }
                placeholder="Masukkan Token Fonnte Anda (atau kosongkan untuk mode OTP Cadangan)"
                className="w-full min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-mono rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label
                htmlFor="fonnte-template-input"
                className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5"
              >
                Template Pesan OTP WhatsApp (Gunakan {'{name}'} dan {'{otp}'})
              </label>
              <textarea
                id="fonnte-template-input"
                rows={3}
                value={fonnteConfig.otpTemplate}
                onChange={(e) =>
                  setFonnteConfig((prev) => ({
                    ...prev,
                    otpTemplate: e.target.value,
                  }))
                }
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingConfig}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold bg-[#2563EB] hover:bg-blue-700 text-white transition-colors"
            >
              {isSavingConfig
                ? 'Menyimpan ke Server Cloud...'
                : 'Simpan Konfigurasi Fonnte'}
            </button>
          </form>
        </section>

        {/* Test Fonnte WhatsApp Delivery */}
        <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#16A34A]" />
              <span>Uji Kirim Pesan WhatsApp (Test Bot Fonnte)</span>
            </h2>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
              Pastikan perangkat WhatsApp Fonnte Anda terhubung dengan mengirim
              pesan tes langsung ke nomor HP Anda.
            </p>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2 text-xs ${
                testResult.ok
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-[#DC2626] dark:text-rose-300'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{testResult.detail}</span>
            </div>
          )}

          <form onSubmit={handleTestWhatsApp} className="space-y-4">
            <div>
              <label
                htmlFor="test-wa-phone"
                className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5"
              >
                Nomor WhatsApp Tujuan Tes
              </label>
              <input
                id="test-wa-phone"
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-mono rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label
                htmlFor="test-wa-msg"
                className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5"
              >
                Isi Pesan Uji Coba
              </label>
              <textarea
                id="test-wa-msg"
                rows={3}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <button
              type="submit"
              disabled={isTestingWa}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold bg-[#16A34A] hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>
                {isTestingWa
                  ? 'Mengirim via API Fonnte...'
                  : 'Kirim Pesan Tes WhatsApp'}
              </span>
            </button>
          </form>
        </section>
      </div>

      {/* Registered Users & Server Database Management Table */}
      <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#2563EB]" />
              <span>
                Tabel Data Pengguna di Database Server Cloud (Kontrol Admin)
              </span>
            </h2>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
              Admin dapat memantau atau menghapus/reset data server milik akun
              pengguna tertentu secara langsung dari Cloud Firestore.
            </p>
          </div>
          <span className="text-xs font-mono text-[#2563EB] font-semibold">
            Total: {users.length} Akun di Server
          </span>
        </div>

        <div className="overflow-x-auto border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] dark:bg-[#090D16] border-b border-[#E2E8F0] dark:border-[#1E293B] text-[#475569] dark:text-[#94A3B8]">
                <th className="py-2.5 px-3 font-semibold">Nama Pengguna</th>
                <th className="py-2.5 px-3 font-semibold">No HP / ID Akun</th>
                <th className="py-2.5 px-3 font-semibold">Peran</th>
                <th className="py-2.5 px-3 font-semibold">Tugas & Kegiatan</th>
                <th className="py-2.5 px-3 font-semibold">Foto Tersimpan</th>
                <th className="py-2.5 px-3 font-semibold">
                  Sinkronisasi Terakhir
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Kontrol Server Admin
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-6 text-center text-[#475569] dark:text-[#94A3B8]"
                  >
                    Belum ada pengguna yang tercatat di Server Cloud.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.accountId}
                    className="hover:bg-[#F8FAFC] dark:hover:bg-[#090D16]/60"
                  >
                    <td className="py-2.5 px-3 font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {u.displayName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#2563EB]">
                      {u.phone}
                    </td>
                    <td className="py-2.5 px-3 uppercase font-mono text-[11px]">
                      {u.role}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {u.tasksCount} Tugas · {u.activitiesCount} Kegiatan
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#16A34A]">
                      {u.notesCount} Foto Catatan
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#475569] dark:text-[#94A3B8]">
                      {new Date(u.lastSyncedAt).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        disabled={deletingAccountId === u.accountId}
                        onClick={() => handleDeleteUserFromServer(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-[#DC2626] border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>
                          {deletingAccountId === u.accountId
                            ? 'Menghapus...'
                            : 'Hapus dari Server'}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* OTP Verification Audit Logs */}
      <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <History className="w-4 h-4 text-[#D97706]" />
              <span>Riwayat Log Pengiriman OTP WhatsApp</span>
            </h2>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
              Pantau kode OTP yang diminta siswa beserta status pengiriman Bot
              Fonnte.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#475569] dark:text-[#94A3B8]">
              {otpLogs.length} log tercatat
            </span>
            {otpLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearOtpLogs}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-[#DC2626] border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Bersihkan Log Server</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] dark:bg-[#090D16] border-b border-[#E2E8F0] dark:border-[#1E293B] text-[#475569] dark:text-[#94A3B8]">
                <th className="py-2.5 px-3 font-semibold">Waktu</th>
                <th className="py-2.5 px-3 font-semibold">Nama Siswa</th>
                <th className="py-2.5 px-3 font-semibold">Nomor WhatsApp</th>
                <th className="py-2.5 px-3 font-semibold">Kode OTP</th>
                <th className="py-2.5 px-3 font-semibold">Metode</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
              {otpLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-[#475569] dark:text-[#94A3B8]"
                  >
                    Belum ada riwayat permintaan OTP.
                  </td>
                </tr>
              ) : (
                otpLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[#F8FAFC] dark:hover:bg-[#090D16]/60"
                  >
                    <td className="py-2.5 px-3 font-mono text-[#475569] dark:text-[#94A3B8]">
                      {new Date(log.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {log.displayName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#2563EB]">
                      {log.phone}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
                      {log.otpCode}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {log.deliveryMethod === 'fonnte_wa'
                        ? 'Fonnte WhatsApp'
                        : 'OTP Cadangan'}
                    </td>
                    <td className="py-2.5 px-3 text-[#475569] dark:text-[#94A3B8]">
                      {log.status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Vercel Deployment & Server Security Info Card */}
      <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Cloud className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs text-[#475569] dark:text-[#94A3B8]">
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Kontrol Penuh Server Database oleh Admin — Copyright © 2026 Hanif
            </h3>
            <p>
              Seluruh kontrol database server (Backup JSON, Restore Database,
              Reset Sistem, Pengelolaan Data Siswa di Cloud Firestore, dan Token
              Bot Fonnte) hanya dapat diakses melalui akun{' '}
              <code className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">
                admin
              </code>
              . Pengguna siswa tetap tersinkronisasi secara otomatis di latar
              belakang tanpa bisa mengubah konfigurasi database server.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
