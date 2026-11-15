/**
 * Copyright (c) 2026 Hanif. All rights reserved.
 * StudyOS Kelas 9 — Unified Single-Form Login Portal (Auto-Detect Phone OTP or Admin)
 * with Public Security Hardening (Brute-Force Lockout, Anti-Spam OTP Cooldown, 5-Min OTP Expiry).
 */

import React, { useEffect, useState } from 'react';
import {
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
  UserCheck,
  X,
  RefreshCw,
  Clock,
  BookOpen,
  Brain,
  CloudCheck,
} from 'lucide-react';
import { UserSession } from '../types/study';
import {
  isOtpExpired,
  isValidWhatsAppPhone,
  normalizePhoneNumber,
  validateAdminCredentials,
} from '../utils/studyLogic';
import {
  getLoginLockoutStatus,
  getOtpRateLimitStatus,
  recordFailedLoginAttempt,
  recordOtpRequestTimestamp,
  resetLoginLockout,
  sendWhatsAppOtpViaFonnte,
} from '../services/authAndCloudService';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthGateModalProps {
  isOpen: boolean;
  isMandatoryGate?: boolean;
  currentSession: UserSession | null;
  onClose?: () => void;
  onAuthenticated: (session: UserSession) => void;
  onLogout: () => void;
}

export const AuthGateModal: React.FC<AuthGateModalProps> = ({
  isOpen,
  isMandatoryGate = false,
  currentSession,
  onClose,
  onAuthenticated,
  onLogout,
}) => {
  // Unified single input for either Phone Number (08xx / 628xx) OR Admin username ('admin')
  const [identityInput, setIdentityInput] = useState(
    currentSession?.role === 'student' ? currentSession.phone : ''
  );
  const [studentName, setStudentName] = useState(
    currentSession?.role === 'student' ? currentSession.displayName : ''
  );
  const [adminPassword, setAdminPassword] = useState('');

  // OTP Verification State
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [otpIssuedAtMs, setOtpIssuedAtMs] = useState<number>(0);
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpStatusMsg, setOtpStatusMsg] = useState<string>('');
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Security Timers (1-second tick for lockout, OTP cooldown, and OTP expiry)
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const lockoutStatus = getLoginLockoutStatus(nowMs);
  const otpRateStatus = getOtpRateLimitStatus(nowMs);
  const otpExpired =
    otpStep === 'verify' && otpIssuedAtMs > 0
      ? isOtpExpired(otpIssuedAtMs, nowMs, 5)
      : false;
  const otpRemainingSeconds =
    otpStep === 'verify' && otpIssuedAtMs > 0
      ? Math.max(0, Math.ceil((otpIssuedAtMs + 5 * 60 * 1000 - nowMs) / 1000))
      : 0;

  // Automatically detect if the user typed 'admin'
  const isAdminDetected = identityInput.trim().toLowerCase() === 'admin';

  const requestNewOtpCode = async () => {
    setAuthError('');

    const currentLock = getLoginLockoutStatus(Date.now());
    if (currentLock.isLocked) {
      setAuthError(
        `Terlalu banyak percobaan gagal. Silakan tunggu ${currentLock.remainingLockSeconds} detik sebelum mencoba kembali.`
      );
      return;
    }

    const rateCheck = getOtpRateLimitStatus(Date.now());
    if (!rateCheck.allowed) {
      setAuthError(
        rateCheck.reason ||
          `Mohon tunggu ${rateCheck.cooldownRemainingSeconds} detik sebelum meminta kode OTP baru.`
      );
      return;
    }

    const phoneValidation = isValidWhatsAppPhone(identityInput);
    if (!phoneValidation.valid) {
      setAuthError(
        phoneValidation.reason ||
          'Masukkan Nomor WhatsApp aktif yang valid (diawali 08xx) atau ketik "admin" untuk masuk sebagai Administrator.'
      );
      return;
    }

    const normalized = phoneValidation.normalized;
    const cleanName = studentName.trim() || `Siswa ${normalized.slice(-4)}`;

    setIsSendingOtp(true);
    try {
      const result = await sendWhatsAppOtpViaFonnte(identityInput, cleanName);
      if (!result.sentViaFonnte) {
        setGeneratedOtp('');
        setOtpStep('request');
        setAuthError(
          result.statusMessage ||
            'Gagal mengirim OTP ke WhatsApp. Pastikan nomor WhatsApp Anda asli dan aktif.'
        );
        return;
      }

      recordOtpRequestTimestamp(Date.now());
      setGeneratedOtp(result.otpCode);
      setOtpIssuedAtMs(result.issuedAtMs);
      setOtpStatusMsg(result.statusMessage);
      setOtpStep('verify');
      setNowMs(Date.now());
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Gagal memproses permintaan OTP. Pastikan nomor WhatsApp Anda aktif.'
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handlePrimarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const currentLock = getLoginLockoutStatus(Date.now());
    if (currentLock.isLocked) {
      setAuthError(
        `Akses dikunci sementara karena batas percobaan gagal. Tunggu ${currentLock.remainingLockSeconds} detik.`
      );
      return;
    }

    // Branch 1: Admin Login ('admin' / 'admin 123')
    if (isAdminDetected) {
      if (!validateAdminCredentials(identityInput, adminPassword)) {
        const updatedLock = recordFailedLoginAttempt(Date.now());
        setNowMs(Date.now());
        if (updatedLock.isLocked) {
          setAuthError(
            `5x percobaan gagal! Login dikunci selama ${updatedLock.remainingLockSeconds} detik demi keamanan.`
          );
        } else {
          const remainingTries =
            updatedLock.maxAttempts - updatedLock.failedAttempts;
          setAuthError(
            `Password Admin tidak sesuai (Sisa percobaan: ${remainingTries}x). Gunakan username: admin dan password: admin 123`
          );
        }
        return;
      }

      resetLoginLockout();
      const adminSession: UserSession = {
        accountId: 'admin',
        role: 'admin',
        phone: 'admin',
        displayName: 'Administrator StudyOS (Hanif)',
        loginAt: new Date().toISOString(),
      };
      onAuthenticated(adminSession);
      return;
    }

    // Branch 2: Student Phone Number + Fonnte WhatsApp OTP
    await requestNewOtpCode();
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const currentLock = getLoginLockoutStatus(Date.now());
    if (currentLock.isLocked) {
      setAuthError(
        `Verifikasi dikunci sementara selama ${currentLock.remainingLockSeconds} detik karena batas salah input.`
      );
      return;
    }

    if (isOtpExpired(otpIssuedAtMs, Date.now(), 5)) {
      setAuthError(
        'Masa berlaku Kode OTP (5 menit) telah habis. Silakan klik tombol Kirim Ulang OTP.'
      );
      return;
    }

    if (!generatedOtp || enteredOtp.trim() !== generatedOtp.trim()) {
      const updatedLock = recordFailedLoginAttempt(Date.now());
      setNowMs(Date.now());
      if (updatedLock.isLocked) {
        setAuthError(
          `5x salah memasukkan OTP! Verifikasi dikunci selama ${updatedLock.remainingLockSeconds} detik.`
        );
      } else {
        const remainingTries =
          updatedLock.maxAttempts - updatedLock.failedAttempts;
        setAuthError(
          `Kode OTP tidak sesuai (Sisa percobaan: ${remainingTries}x). Periksa pesan WhatsApp dari Bot Fonnte di ponsel Anda.`
        );
      }
      return;
    }

    resetLoginLockout();
    const normalized = normalizePhoneNumber(identityInput);
    const cleanName = studentName.trim() || `Siswa ${normalized.slice(-4)}`;
    const newSession: UserSession = {
      accountId: normalized,
      role: 'student',
      phone: normalized,
      displayName: cleanName,
      loginAt: new Date().toISOString(),
    };
    onAuthenticated(newSession);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto ${
        isMandatoryGate
          ? 'bg-[#090D16] text-[#F8FAFC]'
          : 'bg-slate-950/75'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl shadow-2xl overflow-hidden my-auto">
        {/* Top Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-[#F8FAFC] dark:bg-[#090D16] border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[#2563EB] font-semibold block truncate">
              {isMandatoryGate
                ? 'GERBANG AKSES PUBLIK · WAJIB LOGIN OTP / ADMIN'
                : 'PORTAL LOGIN TUNGGAL · CLOUD SYNC & OTP FONNTE'}
            </span>
            <h2
              id="auth-modal-title"
              className="text-sm sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate"
            >
              StudyOS Kelas 9 SMP (Sem 1 & 2)
            </h2>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <PWAInstallButton />
            {!isMandatoryGate && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup Jendela Login"
                className="p-2 rounded-lg text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#E2E8F0]/50 dark:hover:bg-[#1E293B] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mandatory Gate Feature Highlights */}
        {isMandatoryGate && (
          <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-blue-50/70 dark:bg-blue-950/25 border-b border-blue-200/70 dark:border-blue-900/40 grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 text-[11px] text-[#0F172A] dark:text-[#F8FAFC]">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span className="truncate font-medium">26 Bab Rumus Lengkap</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
              <span className="truncate font-medium">Flashcard per Bab</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CloudCheck className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span className="truncate font-medium">Cloud & Offline PWA</span>
            </div>
          </div>
        )}

        {/* Active Session Banner if already logged in */}
        {currentSession && (
          <div className="px-4 sm:px-5 py-3 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-900/50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200">
              <UserCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
              <span>
                Aktif sebagai <strong>{currentSession.displayName}</strong> (
                <span className="font-mono">{currentSession.phone}</span>)
              </span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="px-2.5 py-1 rounded text-xs font-semibold bg-white dark:bg-[#111827] text-[#DC2626] border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 transition-colors"
            >
              Keluar / Ganti Akun
            </button>
          </div>
        )}

        {/* Unified Single Login Form Body */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
            {isMandatoryGate ? (
              <>
                Selamat datang di <strong>StudyOS Kelas 9</strong>. Masukkan{' '}
                <strong>Nomor WhatsApp Aktif (08xx)</strong> Anda untuk menerima
                kode OTP langsung di WhatsApp via Bot Fonnte, atau ketik{' '}
                <code className="font-mono font-bold text-[#2563EB]">admin</code>{' '}
                untuk akses Administrator.
              </>
            ) : (
              <>
                Masukkan <strong>Nomor WhatsApp Aktif (08xx)</strong> untuk
                menerima kode OTP di WhatsApp via Bot Fonnte, atau ketik{' '}
                <code className="font-mono font-bold text-[#2563EB]">admin</code>{' '}
                pada kolom yang sama untuk masuk sebagai Administrator.
              </>
            )}
          </div>

          {/* Lockout Banner */}
          {lockoutStatus.isLocked && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 flex items-center justify-between gap-2 text-xs text-[#DC2626] dark:text-rose-300 font-semibold">
              <span className="inline-flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Proteksi Keamanan Aktif (Batas Percobaan Gagal)</span>
              </span>
              <span className="font-mono px-2 py-0.5 rounded bg-white dark:bg-[#111827] border border-rose-300 dark:border-rose-700">
                Tunggu {lockoutStatus.remainingLockSeconds}d
              </span>
            </div>
          )}

          {authError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2 text-xs text-[#DC2626] dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {otpStep === 'request' ? (
            <form onSubmit={handlePrimarySubmit} className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                  <label
                    htmlFor="unified-identity-input"
                    className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]"
                  >
                    Nomor WhatsApp Aktif / Username
                  </label>
                  <span className="text-[11px] font-mono text-[#2563EB]">
                    {isAdminDetected
                      ? 'Mode Admin Terdeteksi'
                      : 'OTP via Bot WA Fonnte'}
                  </span>
                </div>
                <input
                  id="unified-identity-input"
                  type="text"
                  required
                  disabled={lockoutStatus.isLocked}
                  value={identityInput}
                  onChange={(e) => {
                    setIdentityInput(e.target.value);
                    setAuthError('');
                  }}
                  placeholder="Masukkan No WhatsApp aktif (08xx) atau ketik admin"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] disabled:opacity-60"
                />
              </div>

              {isAdminDetected ? (
                <div>
                  <label
                    htmlFor="admin-password-input"
                    className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5"
                  >
                    Password Admin
                  </label>
                  <input
                    id="admin-password-input"
                    type="password"
                    required
                    disabled={lockoutStatus.isLocked}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Masukkan password admin"
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] disabled:opacity-60"
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] font-mono text-[#475569] dark:text-[#94A3B8]">
                      Proteksi Brute-Force: Maks 5x percobaan
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="student-name-input"
                      className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]"
                    >
                      Nama Lengkap / Panggilan Siswa
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIdentityInput('admin');
                        setAuthError('');
                      }}
                      className="text-[11px] font-semibold text-[#2563EB] hover:underline"
                    >
                      Masuk sebagai Admin?
                    </button>
                  </div>
                  <input
                    id="student-name-input"
                    type="text"
                    disabled={lockoutStatus.isLocked}
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Masukkan nama kamu (opsional)"
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] disabled:opacity-60"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isSendingOtp ||
                  lockoutStatus.isLocked ||
                  (!isAdminDetected && !otpRateStatus.allowed)
                }
                className="w-full min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-bold bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 text-white flex items-center justify-center gap-2 transition-colors"
              >
                {lockoutStatus.isLocked ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      Terkunci Sementara ({lockoutStatus.remainingLockSeconds}d)
                    </span>
                  </>
                ) : isAdminDetected ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Masuk sebagai Admin</span>
                  </>
                ) : isSendingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengirim OTP ke WhatsApp via Bot Fonnte...</span>
                  </>
                ) : !otpRateStatus.allowed ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>
                      Tunggu Cooldown OTP ({otpRateStatus.cooldownRemainingSeconds}d)
                    </span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>Kirim Kode OTP ke WhatsApp</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3.5 rounded-lg border text-xs space-y-2 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                <p className="font-semibold">{otpStatusMsg}</p>
                <p className="text-[11px] opacity-90 pt-1 border-t border-emerald-200/80 dark:border-emerald-800/80">
                  Demi keamanan dan mencegah penggunaan nomor palsu, kode OTP
                  hanya dikirimkan ke aplikasi WhatsApp Anda melalui Bot Fonnte
                  dan tidak ditampilkan di layar web.
                </p>
                <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                  <span>
                    Status Masa Berlaku:{' '}
                    {otpExpired ? (
                      <strong className="text-[#DC2626]">Kedaluwarsa</strong>
                    ) : (
                      <strong>
                        Aktif ({Math.floor(otpRemainingSeconds / 60)}m{' '}
                        {otpRemainingSeconds % 60}d)
                      </strong>
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={isSendingOtp || !otpRateStatus.allowed}
                    onClick={requestNewOtpCode}
                    className="font-semibold text-[#2563EB] hover:underline disabled:opacity-50"
                  >
                    {!otpRateStatus.allowed
                      ? `Kirim Ulang (${otpRateStatus.cooldownRemainingSeconds}d)`
                      : 'Kirim Ulang OTP ke WA'}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="otp-code-input"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5"
                >
                  Masukkan 6 Digit Kode OTP
                </label>
                <input
                  id="otp-code-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  disabled={lockoutStatus.isLocked}
                  value={enteredOtp}
                  onChange={(e) =>
                    setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))
                  }
                  placeholder="6 digit kode OTP"
                  className="w-full min-h-[46px] px-4 py-2.5 text-center text-lg font-mono font-bold tracking-[0.3em] rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] disabled:opacity-60"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep('request');
                    setEnteredOtp('');
                    setAuthError('');
                  }}
                  className="min-h-[44px] px-4 py-2.5 rounded-lg text-xs font-semibold border border-[#E2E8F0] dark:border-[#1E293B] text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white transition-colors"
                >
                  Ubah Nomor HP
                </button>
                <button
                  type="submit"
                  disabled={lockoutStatus.isLocked || otpExpired}
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-bold bg-[#16A34A] hover:bg-emerald-700 disabled:opacity-60 text-white flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verifikasi OTP & Buka StudyOS</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Info with Copyright © Hanif */}
        <div className="px-5 py-3 bg-[#F8FAFC] dark:bg-[#090D16] border-t border-[#E2E8F0] dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#475569] dark:text-[#94A3B8]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Copyright © 2026 Hanif · StudyOS Kelas 9</span>
          </span>
          {!isMandatoryGate && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="font-semibold text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

