/**
 * StudyOS Kelas 9 — Global Production Error Boundary (Anti-Blank Screen)
 * Copyright (c) 2026 Hanif. All rights reserved.
 */
import React from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';

interface GlobalErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  GlobalErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Terjadi gangguan teknis pada halaman.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('StudyOS GlobalErrorBoundary caught error:', error, errorInfo);
  }

  handleSafeReload = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#090D16] p-4 text-[#0F172A] dark:text-[#F8FAFC]">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-2.5 text-[#D97706]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Pemulihan Sistem Otomatis — StudyOS Kelas 9
              </h1>
            </div>

            <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
              Aplikasi mendeteksi gangguan tampilan sementara. Seluruh catatan
              foto, tugas, dan progres belajar kamu tetap aman di database
              Cloud & perangkat.
            </p>

            {this.state.errorMessage && (
              <div className="p-2.5 rounded bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B] font-mono text-[11px] text-[#DC2626] break-words">
                {this.state.errorMessage}
              </div>
            )}

            <button
              type="button"
              onClick={this.handleSafeReload}
              className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Ulang Halaman dengan Aman</span>
            </button>

            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between text-[11px] font-mono text-[#475569] dark:text-[#94A3B8]">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>Data Aman</span>
              </span>
              <span>Copyright © 2026 Hanif</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
