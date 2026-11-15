/**
 * StudyOS Kelas 9 — Offline Mode & Network Reconnection Banner
 * Copyright (c) 2026 Hanif. All rights reserved.
 */
import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-[#D97706] px-3.5 py-2 text-xs font-bold text-white shadow-lg border border-amber-300"
    >
      <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
      <span>
        Mode Offline Aktif — Perubahan tersimpan di perangkat & otomatis
        sinkron ke Cloud saat internet kembali.
      </span>
    </div>
  );
};
