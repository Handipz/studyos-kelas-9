<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# StudyOS Kelas 9

Workspace belajar & produktivitas untuk pelajar Kelas 9 SMP: Rumus Lengkap, Active Recall Flashcards, Cornell Photo Notes, Kurikulum Tracker, dan Cloud Sync.

## Live

https://hanifts.github.io/studyos-kelas-9/

## Jalankan lokal

**Prasyarat:** Node.js

1. Install dependencies: `npm install --legacy-peer-deps`
2. Jalankan: `npm run dev` (buka http://localhost:3000)

## Deploy

Build otomatis lewat GitHub Actions (`.github/workflows/deploy.yml`) setiap push ke `main`, lalu dipublikasikan ke GitHub Pages.

Build manual untuk GitHub Pages:

```
BASE_PATH=/studyos-kelas-9/ npm run build
```

`BASE_PATH` wajib diisi nama repo karena Pages menyajikan app dari sub-path. Untuk deploy di root domain (Vercel/Netlify) biarkan kosong.

**Catatan Firebase:** Firebase Auth (Google Sign-In) hanya mengizinkan domain yang terdaftar. Tambahkan `hanifts.github.io` di Firebase Console → Authentication → Settings → Authorized domains, kalau tidak login Google akan gagal (`auth/unauthorized-domain`).
