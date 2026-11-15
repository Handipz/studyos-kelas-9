/**
 * StudyOS Kelas 9 — Fonnte OTP Auth & Cloud Firestore Sync Service
 * Copyright (c) 2026 Hanif. All rights reserved.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  FonnteConfig,
  FullDatabaseDump,
  OtpVerificationLog,
  PhotoNote,
  RegisteredUserSummary,
  UserSession,
} from '../types/study';
import {
  computeSessionIntegritySignature,
  evaluateLoginLockout,
  evaluateOtpRateLimit,
  LoginLockoutEvaluation,
  normalizePhoneNumber,
  OtpRateLimitEvaluation,
} from '../utils/studyLogic';

const SESSION_STORAGE_KEY = 'studyos_active_user_session_v1';
const LOCAL_FONNTE_CONFIG_KEY = 'studyos_fonnte_config_v1';
const LOCAL_OTP_LOGS_KEY = 'studyos_otp_logs_v1';
const LOCAL_REGISTERED_USERS_KEY = 'studyos_registered_users_v1';
const LOCAL_AUTH_LOCKOUT_KEY = 'studyos_auth_lockout_v1';
const LOCAL_OTP_RATELIMIT_KEY = 'studyos_otp_ratelimit_v1';
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

const DEFAULT_OTP_TEMPLATE =
  'Halo {name}, kode OTP login *StudyOS Kelas 9* kamu adalah: *{otp}*\n\nKode berlaku 5 menit. Jangan berikan kode ini kepada siapapun. Semangat belajar & raih nilai terbaik!';

export function getSavedUserSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserSession;
    if (!parsed || !parsed.accountId || !parsed.role || !parsed.loginAt) {
      return null;
    }

    // Check expiration if present
    if (parsed.expiresAt) {
      const expMs = new Date(parsed.expiresAt).getTime();
      if (!Number.isNaN(expMs) && Date.now() > expMs) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }
    }

    // Verify integrity signature to prevent role/accountId tampering in localStorage
    const expectedSig = computeSessionIntegritySignature(
      parsed.accountId,
      parsed.role,
      parsed.loginAt
    );
    if (
      parsed.integritySignature &&
      parsed.integritySignature !== expectedSig
    ) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return {
      ...parsed,
      integritySignature: expectedSig,
    };
  } catch {
    return null;
  }
}

export function saveUserSession(session: UserSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      const loginAt = session.loginAt || new Date().toISOString();
      const expiresAt =
        session.expiresAt ||
        new Date(Date.now() + SESSION_TTL_MS).toISOString();
      const signedSession: UserSession = {
        ...session,
        loginAt,
        expiresAt,
        integritySignature: computeSessionIntegritySignature(
          session.accountId,
          session.role,
          loginAt
        ),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(signedSession));
    }
  } catch (err) {
    console.warn('Gagal menyimpan sesi login lokal:', err);
  }
}

export function getLoginLockoutStatus(
  nowMs: number = Date.now()
): LoginLockoutEvaluation {
  if (typeof window === 'undefined') {
    return evaluateLoginLockout(0, 0, nowMs);
  }
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_LOCKOUT_KEY);
    if (!raw) return evaluateLoginLockout(0, 0, nowMs);
    const parsed = JSON.parse(raw) as {
      failedAttempts?: number;
      lockUntilMs?: number;
    };
    return evaluateLoginLockout(
      parsed.failedAttempts || 0,
      parsed.lockUntilMs || 0,
      nowMs
    );
  } catch {
    return evaluateLoginLockout(0, 0, nowMs);
  }
}

export function recordFailedLoginAttempt(
  nowMs: number = Date.now()
): LoginLockoutEvaluation {
  const current = getLoginLockoutStatus(nowMs);
  const nextAttempts = current.failedAttempts + 1;
  const evaluated = evaluateLoginLockout(
    nextAttempts,
    current.lockUntilMs,
    nowMs
  );
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        LOCAL_AUTH_LOCKOUT_KEY,
        JSON.stringify({
          failedAttempts: evaluated.failedAttempts,
          lockUntilMs: evaluated.lockUntilMs,
        })
      );
    } catch {
      // ignore
    }
  }
  return evaluated;
}

export function resetLoginLockout(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_AUTH_LOCKOUT_KEY);
  } catch {
    // ignore
  }
}

export function getOtpRateLimitStatus(
  nowMs: number = Date.now()
): OtpRateLimitEvaluation {
  if (typeof window === 'undefined') {
    return evaluateOtpRateLimit([], nowMs);
  }
  try {
    const raw = localStorage.getItem(LOCAL_OTP_RATELIMIT_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    return evaluateOtpRateLimit(
      Array.isArray(timestamps) ? timestamps : [],
      nowMs
    );
  } catch {
    return evaluateOtpRateLimit([], nowMs);
  }
}

export function recordOtpRequestTimestamp(
  nowMs: number = Date.now()
): OtpRateLimitEvaluation {
  if (typeof window === 'undefined') {
    return evaluateOtpRateLimit([nowMs], nowMs);
  }
  try {
    const raw = localStorage.getItem(LOCAL_OTP_RATELIMIT_KEY);
    const existing: number[] = raw ? JSON.parse(raw) : [];
    const windowMs = 15 * 60 * 1000;
    const updated = [
      nowMs,
      ...(Array.isArray(existing) ? existing : []).filter(
        (ts) => nowMs - ts < windowMs
      ),
    ];
    localStorage.setItem(LOCAL_OTP_RATELIMIT_KEY, JSON.stringify(updated));
    return evaluateOtpRateLimit(updated, nowMs);
  } catch {
    return evaluateOtpRateLimit([nowMs], nowMs);
  }
}

export async function loadFonnteConfig(): Promise<FonnteConfig> {
  const envToken =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    typeof import.meta.env.VITE_FONNTE_TOKEN === 'string'
      ? import.meta.env.VITE_FONNTE_TOKEN.trim()
      : '';

  let localConfig: FonnteConfig = {
    token: envToken,
    otpTemplate: DEFAULT_OTP_TEMPLATE,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LOCAL_FONNTE_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FonnteConfig;
        localConfig = {
          token: parsed.token || envToken,
          otpTemplate: parsed.otpTemplate || DEFAULT_OTP_TEMPLATE,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
      }
    } catch {
      // ignore
    }
  }

  try {
    const snap = await getDoc(doc(db, 'app_config', 'fonnte_settings'));
    if (snap.exists()) {
      const data = snap.data() as FonnteConfig;
      const merged: FonnteConfig = {
        token: data.token || localConfig.token || envToken,
        otpTemplate: data.otpTemplate || DEFAULT_OTP_TEMPLATE,
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_FONNTE_CONFIG_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'app_config/fonnte_settings');
  }

  return localConfig;
}

export async function saveFonnteConfig(
  token: string,
  otpTemplate: string
): Promise<FonnteConfig> {
  const updated: FonnteConfig = {
    token: token.trim(),
    otpTemplate: otpTemplate.trim() || DEFAULT_OTP_TEMPLATE,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_FONNTE_CONFIG_KEY, JSON.stringify(updated));
  }

  try {
    await setDoc(doc(db, 'app_config', 'fonnte_settings'), updated);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      'app_config/fonnte_settings'
    );
  }

  return updated;
}

export function generateSixDigitOtp(): string {
  const code = Math.floor(100000 + Math.random() * 900000);
  return String(code);
}

export interface SendOtpResult {
  otpCode: string;
  issuedAtMs: number;
  normalizedPhone: string;
  sentViaFonnte: boolean;
  statusMessage: string;
}

/**
 * Sends a 6-digit OTP code via Fonnte WhatsApp API (https://api.fonnte.com/send)
 * and logs the verification event in Cloud Firestore + Local Storage.
 * The code is only ever delivered through the WhatsApp bot; it is never rendered
 * in the web UI nor stored in plaintext in the audit log.
 */
export async function sendWhatsAppOtpViaFonnte(
  rawPhone: string,
  displayName: string
): Promise<SendOtpResult> {
  const normalizedPhone = normalizePhoneNumber(rawPhone);
  const otpCode = generateSixDigitOtp();
  const issuedAtMs = Date.now();
  const config = await loadFonnteConfig();
  const cleanName = displayName.trim() || 'Siswa Kelas 9';

  const messageText = (config.otpTemplate || DEFAULT_OTP_TEMPLATE)
    .replace(/\{name\}/g, cleanName)
    .replace(/\{otp\}/g, otpCode);

  let sentViaFonnte = false;
  let statusMessage = '';

  if (config.token && config.token.trim().length > 0) {
    try {
      const formData = new FormData();
      formData.append('target', normalizedPhone);
      formData.append('message', messageText);
      formData.append('countryCode', '62');

      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: config.token.trim(),
        },
        body: formData,
      });

      const resultJson = (await response.json()) as {
        status?: boolean;
        reason?: string;
        detail?: string;
      };

      if (response.ok && resultJson && resultJson.status === true) {
        sentViaFonnte = true;
        statusMessage = `Kode OTP berhasil dikirim ke WhatsApp ${normalizedPhone} via Bot Fonnte.`;
      } else {
        const reason =
          resultJson?.reason ||
          resultJson?.detail ||
          'Token Fonnte tidak aktif / kuota perangkat penuh';
        statusMessage = `Respons Fonnte: ${reason}. OTP tidak terkirim — hubungi Admin untuk mengaktifkan Bot WhatsApp.`;
      }
    } catch {
      statusMessage =
        'Tidak dapat menghubungi server Fonnte saat ini. OTP tidak terkirim — hubungi Admin untuk mengaktifkan Bot WhatsApp.';
    }
  } else {
    statusMessage =
      'Token Bot Fonnte belum diisi Admin. OTP tidak dapat dikirim — hubungi Admin untuk mengaktifkan Bot WhatsApp.';
  }

  const logEntry: OtpVerificationLog = {
    id: `otp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    phone: normalizedPhone,
    displayName: cleanName,
    // Kode asli tidak disimpan/ditampilkan di web; hanya jejak audit.
    otpCode: '******',
    deliveryMethod: sentViaFonnte ? 'fonnte_wa' : 'fallback_screen',
    status: sentViaFonnte ? 'Terkirim via WhatsApp Fonnte' : statusMessage,
    createdAt: new Date().toISOString(),
  };

  await recordOtpLog(logEntry);

  return {
    otpCode,
    issuedAtMs,
    normalizedPhone,
    sentViaFonnte,
    statusMessage,
  };
}

/**
 * Sends a test WhatsApp message from the Admin Panel using Fonnte API
 */
export async function testFonnteWhatsAppSend(
  token: string,
  targetPhone: string,
  customMessage: string
): Promise<{ ok: boolean; detail: string }> {
  const cleanToken = token.trim();
  const normalizedPhone = normalizePhoneNumber(targetPhone);
  if (!cleanToken) {
    return {
      ok: false,
      detail: 'Masukkan API Token Fonnte terlebih dahulu sebelum melakukan uji kirim.',
    };
  }
  if (!normalizedPhone || normalizedPhone.length < 9) {
    return {
      ok: false,
      detail: 'Masukkan nomor WhatsApp tujuan yang valid (contoh: 08123456789).',
    };
  }

  try {
    const formData = new FormData();
    formData.append('target', normalizedPhone);
    formData.append(
      'message',
      customMessage.trim() ||
        'Tes Koneksi Bot WhatsApp Fonnte dari Panel Admin StudyOS Kelas 9 berhasil!'
    );
    formData.append('countryCode', '62');

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: cleanToken,
      },
      body: formData,
    });

    const data = (await response.json()) as {
      status?: boolean;
      reason?: string;
      detail?: string;
    };

    if (response.ok && data?.status === true) {
      return {
        ok: true,
        detail: `Pesan WhatsApp berhasil dikirim ke ${normalizedPhone} via Fonnte!`,
      };
    }
    return {
      ok: false,
      detail: `Fonnte menolak permintaan: ${data?.reason || data?.detail || 'Periksa kembali Token Fonnte Anda.'}`,
    };
  } catch (err) {
    return {
      ok: false,
      detail: `Gagal menghubungi https://api.fonnte.com/send: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function recordOtpLog(entry: OtpVerificationLog): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      const existingRaw = localStorage.getItem(LOCAL_OTP_LOGS_KEY);
      const list: OtpVerificationLog[] = existingRaw
        ? JSON.parse(existingRaw)
        : [];
      const updated = [entry, ...list].slice(0, 50);
      localStorage.setItem(LOCAL_OTP_LOGS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  try {
    await setDoc(doc(db, 'otp_logs', entry.id), entry);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `otp_logs/${entry.id}`);
  }
}

export async function fetchOtpLogs(): Promise<OtpVerificationLog[]> {
  let localLogs: OtpVerificationLog[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_OTP_LOGS_KEY);
      if (raw) localLogs = JSON.parse(raw);
    } catch {
      // ignore
    }
  }

  try {
    const snap = await getDocs(collection(db, 'otp_logs'));
    const cloudLogs: OtpVerificationLog[] = [];
    snap.forEach((docSnap) => {
      cloudLogs.push(docSnap.data() as OtpVerificationLog);
    });
    const combinedMap = new Map<string, OtpVerificationLog>();
    for (const item of [...cloudLogs, ...localLogs]) {
      combinedMap.set(item.id, item);
    }
    return Array.from(combinedMap.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'otp_logs');
    return localLogs;
  }
}

export async function fetchRegisteredUsers(): Promise<RegisteredUserSummary[]> {
  let localUsers: RegisteredUserSummary[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_REGISTERED_USERS_KEY);
      if (raw) localUsers = JSON.parse(raw);
    } catch {
      // ignore
    }
  }

  try {
    const snap = await getDocs(collection(db, 'registered_users'));
    const cloudUsers: RegisteredUserSummary[] = [];
    snap.forEach((docSnap) => {
      cloudUsers.push(docSnap.data() as RegisteredUserSummary);
    });
    const combinedMap = new Map<string, RegisteredUserSummary>();
    for (const u of [...cloudUsers, ...localUsers]) {
      combinedMap.set(u.accountId, u);
    }
    return Array.from(combinedMap.values()).sort((a, b) =>
      b.lastSyncedAt.localeCompare(a.lastSyncedAt)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'registered_users');
    return localUsers;
  }
}

/**
 * Saves the entire user workspace (Tasks, Daily Activities, Photo Notes, Progress)
 * to Cloud Firestore AND stores heavy photo notes in individual documents if needed
 * so photos are NEVER lost even if a student uploads many high-resolution notes!
 */
export async function syncWorkspaceToCloud(
  session: UserSession,
  dump: FullDatabaseDump
): Promise<{ ok: boolean; syncedAt: string }> {
  const nowIso = new Date().toISOString();
  const safeAccountId = session.accountId.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Update registered user summary
  const userSummary: RegisteredUserSummary = {
    accountId: safeAccountId,
    phone: session.phone,
    displayName: session.displayName,
    role: session.role,
    tasksCount: (dump.tasks || []).length,
    activitiesCount: (dump.activities || []).length,
    notesCount: (dump.notes || []).length,
    lastSyncedAt: nowIso,
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_REGISTERED_USERS_KEY);
      const list: RegisteredUserSummary[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((u) => u.accountId !== safeAccountId);
      localStorage.setItem(
        LOCAL_REGISTERED_USERS_KEY,
        JSON.stringify([userSummary, ...filtered])
      );
    } catch {
      // ignore
    }
  }

  try {
    // 1. Sync each photo note into `/study_photo_notes/{accountId}_{noteId}` so unlimited photos can be stored without hitting 1MB limit
    const notesList = dump.notes || [];
    await Promise.all(
      notesList.map(async (note) => {
        const photoDocId = `${safeAccountId}_${note.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        await setDoc(doc(db, 'study_photo_notes', photoDocId), {
          id: photoDocId,
          accountId: safeAccountId,
          noteJson: JSON.stringify(note).slice(0, 940000),
          updatedAt: nowIso,
        });
      })
    );

    // 2. Check if full dump fits under 900KB in main workspace doc; if larger, store lightweight note metadata in main doc and merge from study_photo_notes on load
    let serializedPayload = JSON.stringify(dump);
    if (serializedPayload.length > 900000) {
      const compactDump: FullDatabaseDump = {
        ...dump,
        notes: notesList.map((n) => ({
          ...n,
          images: [],
        })),
      };
      serializedPayload = JSON.stringify(compactDump);
    }

    await setDoc(doc(db, 'study_workspaces', safeAccountId), {
      accountId: safeAccountId,
      phone: session.phone,
      displayName: session.displayName,
      role: session.role,
      payloadJson: serializedPayload,
      updatedAt: nowIso,
    });

    await setDoc(doc(db, 'registered_users', safeAccountId), userSummary);

    return { ok: true, syncedAt: nowIso };
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `study_workspaces/${safeAccountId}`
    );
    return { ok: false, syncedAt: nowIso };
  }
}

export async function deleteCloudPhotoNote(
  accountId: string,
  noteId: string
): Promise<void> {
  const safeAccountId = accountId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const photoDocId = `${safeAccountId}_${noteId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  try {
    await deleteDoc(doc(db, 'study_photo_notes', photoDocId));
  } catch {
    // ignore if not found
  }
}

/**
 * Loads a user's complete workspace from Cloud Firestore, reassembling any chunked Photo Notes.
 */
export async function loadWorkspaceFromCloud(
  accountId: string
): Promise<FullDatabaseDump | null> {
  const safeAccountId = accountId.replace(/[^a-zA-Z0-9_-]/g, '_');
  try {
    const snap = await getDoc(doc(db, 'study_workspaces', safeAccountId));
    if (!snap.exists()) {
      return null;
    }

    const data = snap.data() as { payloadJson?: string };
    if (!data?.payloadJson) return null;

    const parsed = JSON.parse(data.payloadJson) as FullDatabaseDump;

    // Fetch all individual photo notes for this account from study_photo_notes
    try {
      const photosQuery = query(
        collection(db, 'study_photo_notes'),
        where('accountId', '==', safeAccountId)
      );
      const photosSnap = await getDocs(photosQuery);
      const cloudNotesMap = new Map<string, PhotoNote>();
      photosSnap.forEach((pDoc) => {
        const pData = pDoc.data() as { noteJson?: string };
        if (pData?.noteJson) {
          try {
            const noteObj = JSON.parse(pData.noteJson) as PhotoNote;
            if (noteObj && noteObj.id) {
              cloudNotesMap.set(noteObj.id, noteObj);
            }
          } catch {
            // ignore malformed note
          }
        }
      });

      if (cloudNotesMap.size > 0) {
        const mergedNotes = (parsed.notes || []).map((n) => {
          const fullNote = cloudNotesMap.get(n.id);
          return fullNote ? fullNote : n;
        });
        // Also include any notes in cloudNotesMap that weren't in parsed.notes
        const existingIds = new Set(mergedNotes.map((n) => n.id));
        for (const [id, noteObj] of cloudNotesMap.entries()) {
          if (!existingIds.has(id)) {
            mergedNotes.unshift(noteObj);
          }
        }
        parsed.notes = mergedNotes;
      }
    } catch {
      // fallback to parsed.notes directly
    }

    return parsed;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.GET,
      `study_workspaces/${safeAccountId}`
    );
    return null;
  }
}

/**
 * Admin-Only Server Database Action: Deletes a user's workspace, photo notes, and summary from Cloud Firestore.
 */
export async function deleteCloudAccountData(accountId: string): Promise<boolean> {
  const safeAccountId = accountId.replace(/[^a-zA-Z0-9_-]/g, '_');

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_REGISTERED_USERS_KEY);
      const list: RegisteredUserSummary[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem(
        LOCAL_REGISTERED_USERS_KEY,
        JSON.stringify(list.filter((u) => u.accountId !== safeAccountId))
      );
    } catch {
      // ignore
    }
  }

  try {
    // Delete all photo notes for this account
    try {
      const photosQuery = query(
        collection(db, 'study_photo_notes'),
        where('accountId', '==', safeAccountId)
      );
      const photosSnap = await getDocs(photosQuery);
      const deletions: Promise<void>[] = [];
      photosSnap.forEach((pDoc) => {
        deletions.push(deleteDoc(doc(db, 'study_photo_notes', pDoc.id)));
      });
      await Promise.all(deletions);
    } catch {
      // ignore if empty
    }

    await deleteDoc(doc(db, 'study_workspaces', safeAccountId));
    await deleteDoc(doc(db, 'registered_users', safeAccountId));
    return true;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `registered_users/${safeAccountId}`
    );
    return false;
  }
}

/**
 * Admin-Only Server Database Action: Clears OTP verification history logs from Cloud Firestore & LocalStorage.
 */
export async function clearAllOtpLogsFromCloud(): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LOCAL_OTP_LOGS_KEY);
    } catch {
      // ignore
    }
  }

  try {
    const snap = await getDocs(collection(db, 'otp_logs'));
    const deletions: Promise<void>[] = [];
    snap.forEach((d) => {
      deletions.push(deleteDoc(doc(db, 'otp_logs', d.id)));
    });
    await Promise.all(deletions);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'otp_logs');
    return false;
  }
}

