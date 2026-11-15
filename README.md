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

Otomatis lewat GitHub Actions (`.github/workflows/deploy.yml`): setiap push ke `main`, runner build dengan `BASE_PATH=/<nama-repo>/` lalu mempublikasikan `dist/` ke GitHub Pages. Tidak ada branch hasil build; Pages di-set ke `build_type: workflow`.

```
git add -A
git commit -m "update"
git push
```

Selesai — Pages live ~1 menit setelah workflow hijau.

`BASE_PATH` wajib terisi nama repo karena Pages menyajikan app dari sub-path (`/studyos-kelas-9/`). Untuk deploy di root domain (Vercel/Netlify) biarkan kosong.

## Catatan Firebase

Firebase Auth (Google Sign-In) hanya mengizinkan domain terdaftar. Tambahkan `handipz.github.io` di **Firebase Console → Authentication → Settings → Authorized domains**, kalau tidak login Google akan gagal dengan `auth/unauthorized-domain`.

Tanpa login, aplikasi tetap jalan penuh secara offline memakai IndexedDB lokal.
