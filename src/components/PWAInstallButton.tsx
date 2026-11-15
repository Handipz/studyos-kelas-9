/**
 * StudyOS Kelas 9 — In-App PWA Install Prompt Button & iOS Guide Modal
 * Copyright (c) 2026 Hanif. All rights reserved.
 */
import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install Aplikasi</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuideModal(true)}
        className="min-h-[38px] inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#2563EB] transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
        <span className="hidden sm:inline">
          {isIOS ? 'Install di iOS' : 'Pasang Web App'}
        </span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Pasang StudyOS Kelas 9 di Layar Utama (PWA)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-[#475569] hover:text-[#0F172A] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
              {isIOS ? (
                <>
                  <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    Cara Install di iPhone / iPad (Safari):
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>
                      Ketuk tombol <strong>Bagikan (Share)</strong> di bilah
                      bawah browser Safari.
                    </li>
                    <li>
                      Gulir ke bawah lalu pilih{' '}
                      <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
                    </li>
                    <li>
                      Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas.
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    Cara Install di Android / Chrome / Edge Desktop:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>
                      Klik ikon <strong>Install App</strong> di sebelah kanan
                      kolom URL browser, atau buka menu titik tiga (⋮) di pojok
                      kanan atas.
                    </li>
                    <li>
                      Pilih{' '}
                      <strong>
                        Instal Aplikasi / Tambahkan ke Layar Utama
                      </strong>
                      .
                    </li>
                    <li>
                      Aplikasi akan berjalan mandiri (standalone) dan tetap bisa
                      dibuka saat offline!
                    </li>
                  </ol>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between text-[11px] font-mono text-[#475569] dark:text-[#94A3B8]">
              <span>Copyright © 2026 Hanif</span>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#2563EB] text-white font-sans font-bold text-xs"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
