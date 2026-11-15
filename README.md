# StudyOS Kelas 9

Workspace belajar & produktivitas untuk pelajar Kelas 9 SMP: Rumus Lengkap, Active Recall Flashcards, Cornell Photo Notes, Kurikulum Tracker, Cloud Sync, dan OTP WhatsApp via Bot Fonnte.

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
| Login OTP + Cloud Sync | `src/services/authAndCloudService.ts` |
| Firebase / Firestore | `src/firebase.ts`, `firebase-applet-config.json` |
| Aturan Firestore | `firestore.rules` |
| Spesifikasi produk | `PRD.md` |

## Deploy

Otomatis lewat GitHub Actions (`.github/workflows/deploy.yml`): setiap push ke `main`, runner build dengan `BASE_PATH=/<nama-repo>/` lalu mempublikasikan `dist/` ke GitHub Pages (mode `build_type: workflow`, tanpa branch hasil build).

```
git add -A
git commit -m "update"
git push
```

Selesai — live ~1 menit setelah workflow hijau.

`BASE_PATH` wajib terisi nama repo karena Pages menyajikan app dari sub-path (`/studyos-kelas-9/`). Untuk deploy di root domain (Vercel/Netlify) biarkan kosong.

## Catatan OTP

Kode OTP hanya dikirim ke WhatsApp lewat Bot Fonnte dan **tidak pernah ditampilkan di layar web**; log Firestore hanya menyimpan jejak audit (`******`), bukan kode asli. Token bot diatur di Panel Admin (login `admin`), dan wajib aktif — tanpa token tidak ada jalur login OTP.
