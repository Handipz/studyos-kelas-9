# StudyOS Kelas 9

Workspace belajar & produktivitas untuk pelajar Kelas 9 SMP: Rumus Lengkap, Active Recall Flashcards, Cornell Photo Notes, Kurikulum Tracker, dan Cloud Sync.

## Live

**https://handipz.github.io/studyos-kelas-9/**

Bisa dipasang sebagai aplikasi (PWA): buka di Chrome/Edge → menu → *Install app*.

## Jalankan lokal

**Prasyarat:** Node.js

```
npm install --legacy-peer-deps
npm run dev
```

Buka http://localhost:3000

## Struktur

| Bagian | Lokasi |
| --- | --- |
| Kode aplikasi | `src/` (React + TypeScript) |
| Kurikulum & flashcard | `src/data/defaultCurriculum.ts` |
| Database lokal (IndexedDB) | `src/db/StudyDatabase.ts` |
| Firebase / Cloud Sync | `src/firebase.ts`, `firebase-applet-config.json` |
| Aturan Firestore | `firestore.rules` |

## Deploy

Situs statis disajikan GitHub Pages dari branch **`gh-pages`** (bukan dari `main`). Source di `main`, hasil build di `gh-pages`.

Setelah mengubah kode, jalankan:

```
powershell -File scripts/deploy-pages.ps1
```

Script itu build ulang dengan `BASE_PATH=/studyos-kelas-9/`, lalu force-push isi `dist/` ke `gh-pages`. Pages otomatis rebuild ~1 menit.

`BASE_PATH` wajib diisi nama repo karena Pages menyajikan app dari sub-path. Untuk deploy di root domain (Vercel/Netlify) biarkan kosong / tidak diisi.

## Catatan Firebase

Firebase Auth (Google Sign-In) hanya mengizinkan domain terdaftar. Tambahkan `handipz.github.io` di **Firebase Console → Authentication → Settings → Authorized domains**, kalau tidak login Google akan gagal dengan `auth/unauthorized-domain`.

Tanpa login, aplikasi tetap jalan penuh secara offline memakai IndexedDB lokal.
