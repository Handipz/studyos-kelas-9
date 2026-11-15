# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# StudyOS Kelas 9 — Workspace Belajar, Rumus & Active Recall SMP (Semester 1 & 2)

> **Dokumen Resmi Spesifikasi Produk & Arsitektur Teknis (End-to-End)**  
> **Versi Dokumen:** 3.0 (Production & Public Vercel Release)  
> **Status:** Released / Production-Ready  
> **Pemilik Produk & Hak Cipta:** **Copyright © 2026 Hanif. All rights reserved.**

---

## 1. Ringkasan Eksekutif (Executive Summary)

### 1.1 Latar Belakang & Masalah Utama
Siswa Kelas 9 SMP menghadapi beban akademik tertinggi di jenjang menengah pertama karena harus menguasai materi Semester 1 dan Semester 2 secara serentak untuk persiapan Ujian Sekolah, PTS, PAS, dan seleksi masuk SMA/SMK unggulan. Kendala utama yang sering dialami siswa meliputi:
1. **Catatan dan rumus tercecer** di berbagai buku tulis atau galeri foto HP tanpa struktur bab yang jelas.
2. **Metode belajar pasif** (hanya membaca ulang) yang kurang efektif dibanding metode ilmiah *Active Recall* dan *Spaced Repetition*.
3. **Sulit menghitung target nilai rapor** yang harus dicapai pada ujian berikutnya untuk mengamankan rata-rata nilai akhir.
4. **Kehilangan data belajar** ketika berganti perangkat atau saat koneksi internet tidak stabil.

### 1.2 Solusi: StudyOS Kelas 9
**StudyOS Kelas 9** adalah sistem operasi belajar (*EdTech Workspace*) berbasis Progressive Web App (PWA) yang dirancang khusus oleh **Hanif** untuk pelajar Kelas 9 SMP. Aplikasi ini menggabungkan:
- **Bank Rumus Terstruktur (26 Bab)** & **Flashcard Active Recall per Mapel & Bab** dengan algoritma *Spaced Repetition*.
- **4 Kalkulator Sains & Matematika Interaktif** (Persamaan Kuadrat, Bangun Ruang Sisi Lengkung, Hukum Coulomb, Hukum Ohm & Daya Listrik).
- **Vault Catatan Foto Metode Cornell** dengan kompresi otomatis HTML5 Canvas dan sinkronisasi dokumen terpecah (*chunked*) di Cloud Firestore.
- **Focus Studio & 9 Synthesizer Audio Penenang Offline** berbasis Web Audio API murni.
- **Hybrid Persistence (IndexedDB + Cloud Firestore)** serta **Autentikasi Tunggal OTP WhatsApp Fonnte** dengan proteksi keamanan publik tingkat produksi.

---

## 2. Target Pengguna & Matriks Peran (User Personas & RBAC)

| Peran (`UserRole`) | Identitas Login | Hak Akses & Fungsionalitas Utama |
| :--- | :--- | :--- |
| **Siswa (`student`)** | Nomor WhatsApp (`08xx` / `628xx`) via OTP Bot Fonnte | - Mengakses **Command Center** (Tugas, Agenda Harian, Jadwal Sekolah & Alert Mapel Besok).<br>- Mempelajari **Rumus & Flashcard Active Recall per Bab** serta mengunduh materi offline (PDF, HTML, MD, JSON).<br>- Menyimpan **Catatan Foto Cornell** & **Logbook Kesalahan Soal**.<br>- Melacak penguasaan bab di **Kurikulum Kelas 9**.<br>- Menggunakan **Timer Fokus + 9 Audio Penenang** & **Simulator Target Nilai Rapor**.<br>- Sinkronisasi otomatis ke Cloud per akun Nomor HP.<br>- *Tidak memiliki akses ke kontrol Database Server / Reset / Konfigurasi Bot.* |
| **Administrator (`admin`)** | Username: `admin`<br>Password: `admin 123` (atau `admin123`) | - Seluruh akses modul belajar.<br>- Mengakses **Panel Admin & Database Server (`AdminDashboardView`)**.<br>- Mengonfigurasi **API Token Fonnte** & template pesan OTP WhatsApp + fitur **Uji Kirim WA**.<br>- Memantau daftar pengguna terdaftar (`registered_users`) dan riwayat log OTP (`otp_logs`).<br>- **Kontrol Eksklusif Database Server**: Export Backup JSON, Import Restore JSON, Reset Database ke Default, Hapus Data Cloud Akun Siswa, dan Bersihkan Log OTP Cloud. |

---

## 3. Kebijakan Workspace Pengguna Baru (Zero-Dummy Default Policy)

Sesuai spesifikasi produk **Hanif**, setiap pengguna baru yang pertama kali login mendapatkan **Workspace Pribadi Bersih (Zero-Dummy Data)** dengan rincian:

| Koleksi Data | Status Awal Pengguna Baru | Keterangan |
| :--- | :--- | :--- |
| `tasks` (Tugas Sekolah) | **Kosong (`0` item)** | Tidak ada tugas dummy; diisi sendiri oleh siswa. |
| `activities` (Agenda Harian) | **Kosong (`0` item)** | Tidak ada agenda dummy; diisi sendiri oleh siswa. |
| `schedule` (Jadwal Sekolah) | **Kosong (`0` item)** | Diisi sesuai jadwal sekolah masing-masing siswa. |
| `notes` (Catatan Foto Cornell) | **Kosong (`0` item)** | Diisi saat siswa memotret buku catatan/papan tulis. |
| `mistakes` (Logbook Kesalahan) | **Kosong (`0` item)** | Diisi saat evaluasi hasil latihan/ujian. |
| `grades` (Rekap Nilai Rapor) | **Kosong (`0` item)** | Diisi sesuai nilai Tugas, UH, PTS, dan PAS siswa. |
| `studyLogs` (Riwayat Fokus) | **Kosong (`0` item)** | Tercatat otomatis saat menyelesaikan sesi Pomodoro/Deep Work. |
| `curriculum` (Peta Bab Kelas 9) | **Terisi 4 Mapel Inti (26 Bab)** | Matematika, Fisika, Biologi IPA, dan Bahasa Inggris (Status awal: `Belum Belajar`). |
| `formulas` (Bank Rumus Inti) | **Terisi 26 Tabel Rumus Bab** | Riset rumus lengkap, penurunan variabel, contoh soal, dan tips ujian. |
| `flashcards` (Kartu Active Recall) | **Terisi 25 Kartu Inti per Bab** | Kartu tanya-jawab konsep & rumus esensial siap latihan per bab. |

---

## 4. Arsitektur Sistem & Tech Stack

### 4.1 Frontend & Runtime Stack
- **Framework UI:** React 19 + TypeScript (Strict Mode) dengan bundler **Vite 6**.
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`) dengan dukungan penuh **Light Mode** dan **Dark Mode** (`dark` class di `document.documentElement`).
- **Tipografi:** `Plus Jakarta Sans` (UI & Akademik) dan `JetBrains Mono` (Rumus Matematika, Angka Kalkulator, Timer, & Kode OTP).
- **Audio Engine:** **Web Audio API Synthesizer** (`src/utils/audioSynth.ts`) — menghasilkan 9 suara penenang secara prosedural tanpa file MP3 eksternal (100% bebas masalah hak cipta & bekerja offline).
- **Image Compression Engine:** **HTML5 Canvas Compressor** (`src/utils/imageCompressor.ts`) — mengecilkan resolusi dan ukuran file foto catatan hingga ~80% dalam format WebP/JPEG sebelum disimpan ke IndexedDB & Firestore.

### 4.2 Hybrid Persistence Architecture (Offline-First + Cloud Sync)
1. **Penyimpanan Lokal Perangkat (`IndexedDB v3` — `src/db/StudyDatabase.ts`)**:
   - Database lokal di-scope per akun (`studyos_kelas9_v3_{accountId}`) sehingga data antar akun pada perangkat yang sama tidak saling bercampur.
   - Seluruh operasi baca/tulis terjadi secara instan (<10ms) di IndexedDB, menjamin aplikasi tetap berfungsi 100% meskipun tanpa sinyal internet.
2. **Penyimpanan Cloud (`Google Cloud Firestore` — `src/services/authAndCloudService.ts`)**:
   - Setiap perubahan data memicu sinkronisasi latar belakang ber-debounce (`600ms`) ke Cloud Firestore.
   - Dilengkapi pendeteksi jaringan (`window.addEventListener('online')`) yang otomatis menyinkronkan ulang data lokal ke Cloud begitu koneksi internet pulih.
   - **Strategi Chunking Catatan Foto (`study_photo_notes`)**: Untuk menghindari batas ukuran dokumen 1 MB pada Firestore, setiap catatan foto Cornell disimpan ke dokumen terpisah `/study_photo_notes/{accountId}_{noteId}` dan dirakit kembali secara otomatis saat pengguna login di perangkat baru.

---

## 5. Spesifikasi Fungsional per Modul (Functional Requirements)

### 5.1 Modul 1 — Gerbang Login Tunggal Wajib & Keamanan Publik (`AuthGateModal.tsx`)
- **Mandatory Login Gate**: Saat web publik dibuka dan belum ada sesi aktif (`userSession === null`), aplikasi mengunci tampilan pada portal login penuh tanpa tombol tutup hingga pengguna terverifikasi.
- **Kolom Input Tunggal Otomatis (`Auto-Detect Identity`)**:
  - Jika pengguna mengetik nomor telepon (`0812...` / `62812...`), sistem otomatis mengaktifkan **Mode OTP WhatsApp Siswa** dan menormalisasi nomor ke format internasional `628...`.
  - Jika pengguna mengetik `admin`, sistem otomatis menampilkan kolom **Password Admin**.
- **Integrasi Bot WhatsApp Fonnte (`https://api.fonnte.com/send`)**:
  - Mengirimkan kode OTP 6 digit ke nomor WhatsApp siswa menggunakan header `Authorization: <FONNTE_TOKEN>`.
  - Menyediakan **Fallback OTP Cerdas** di layar verifikasi apabila token Fonnte belum diisi atau kuota perangkat sedang penuh, sehingga siswa tetap dapat masuk kapan saja.
- **Sistem Keamanan Publik**:
  - **Brute-Force Lockout**: Maksimal **5 kali percobaan gagal** berturut-turut (baik salah password Admin maupun salah kode OTP). Pada kegagalan ke-5, sistem mengunci form selama **180 detik (3 menit)** dengan penghitung mundur *real-time*.
  - **Anti-Spam OTP Rate Limiter**: Cooldown **60 detik** antar pengiriman ulang OTP dan batas maksimal **4 permintaan OTP dalam jendela waktu 15 menit**.
  - **Masa Berlaku OTP (TTL)**: Setiap kode OTP kedaluwarsa otomatis setelah **5 menit (300 detik)**.
  - **Session Integrity Signature**: Setiap sesi yang disimpan di `localStorage` dilengkapi tanda tangan hash deterministik (`sig_...`) berbasis FNV-1a (`computeSessionIntegritySignature`) dan masa berlaku 14 hari untuk mencegah manipulasi role `student` menjadi `admin` lewat DevTools.

### 5.2 Modul 2 — Command Center (`CommandCenterView.tsx`)
- **Matriks Prioritas Tugas Sekolah**:
  - Mengurutkan tugas yang belum selesai berdasarkan bobot prioritas: `Urgent & Penting` → `Penting / Tidak Urgent` → `Cicil Santai`, diikuti tenggat waktu (`dueDate`) terdekat.
  - Menyediakan kategori `PR`, `Latihan Soal`, `Proyek`, dan `Hafalan`.
  - Saat tugas ditandai selesai (`completed: true`), sistem otomatis memperbarui tanggal terakhir dipelajari (`lastStudiedAt`) pada bab kurikulum terkait.
- **Agenda Kegiatan Harian (Non-PR)**:
  - Mengelola aktivitas harian siswa di luar PR sekolah: `Les / Bimbel & Belajar Mandiri`, `Ekstrakurikuler & Organisasi`, `Ibadah, Olahraga & Rutinitas`, serta `Acara Sekolah, Lomba & Pribadi`.
  - Diurutkan otomatis berdasarkan prioritas `Wajib Hari Ini` → `Rutin Harian` → `Fleksibel`.
- **Jadwal Sekolah & Peringatan Mapel Besok (`TomorrowAlertSummary`)**:
  - Mendeteksi hari sekolah besok secara otomatis (jika hari Sabtu/Minggu, otomatis melompat ke persiapan hari **Senin**).
  - Mencocokkan jadwal pelajaran besok dengan daftar PR/tugas yang belum selesai sehingga siswa mendapat peringatan dini.

### 5.3 Modul 3 — Active Recall, Bank Rumus, Kalkulator & Multi-Format Exporter (`ActiveRecallView.tsx`)
- **Desain Alur Fokus 3 Langkah**:
  1. **Langkah 1 — Pilih Mata Pelajaran**: Filter cepat ke Matematika, Fisika, Biologi IPA, atau Bahasa Inggris.
  2. **Langkah 2 — Pilih Paket Bab (`ChapterFlashcardDeck`)**: Menampilkan kartu bab lengkap dengan **Bar Progres Hafalan (%)**, jumlah kartu jatuh tempo hari ini (*Due Today*), jumlah kartu dikuasai (*Hafal*), dan jumlah tabel rumus pada bab tersebut.
  3. **Langkah 3 — Ruang Belajar Fokus per Bab**:
     - **Mode Uji Hafalan Fokus Bersih**: Menampilkan 1 kartu tanya-jawab berukuran besar dengan animasi balik kartu (*Flip Card*) dan 3 tombol evaluasi mandiri berbasis *Spaced Repetition*:
       - `Lupa` → Interval `0 hari` (diulang hari ini).
       - `Ragu-ragu` → Interval `+1 hari` (diulang besok).
       - `Hafal Lancar` → Interval `+4 hari` (diulang 4 hari lagi & dihitung sebagai *Mastered*).
     - **Mode Daftar Kartu & Tabel Rumus Bab**: Menampilkan daftar seluruh kartu flashcard dan tabel penurunan rumus pada bab terpilih secara berdampingan.
- **4 Kalkulator Sains & Matematika Interaktif**:
  1. **Kalkulator Persamaan & Fungsi Kuadrat**: Menghitung Diskriminan ($D = b^2 - 4ac$), sifat akar, akar-akar $x_1, x_2$, serta titik puncak parabola $(x_p, y_p)$.
  2. **Kalkulator Bangun Ruang Sisi Lengkung (Tabung, Kerucut, Bola)**: Otomatis memilih $\pi = \frac{22}{7}$ (jika jari-jari kelipatan 7) atau $\pi = 3{,}1416$, menghitung garis pelukis $s = \sqrt{r^2 + t^2}$, luas selimut, luas permukaan utuh, luas tanpa tutup, dan volume.
  3. **Kalkulator Hukum Coulomb Listrik Statis**: Menghitung gaya elektrostatis $F = k \frac{|q_1 \cdot q_2|}{r^2}$ dari satuan $\mu\text{C}$ dan $\text{cm}$ ke satuan SI ($\text{Newton}$) lengkap dengan notasi ilmiah.
  4. **Kalkulator Hukum Ohm, Daya & Energi Listrik**: Menghitung kuat arus ($I = V/R$), daya ($P = V \cdot I$), energi dalam $\text{Joule}$ ($W = P \cdot t$), dan tagihan energi dalam $\text{kWh}$.
- **Logbook Kesalahan Soal (`MistakeLog`)**:
  - Mencatat soal ujian/latihan yang salah dikerjakan beserta foto bukti pengerjaan, klasifikasi kesalahan (`Salah Rumus`, `Kurang Teliti`, `Salah Konsep`, `Lupa Langkah`), detail letak kesalahan, dan langkah solusi yang benar.
- **Pusat Unduhan Materi Belajar Offline (`studyDownloadGenerator.ts`)**:
  - **Cetak / Simpan PDF Cheat-Sheet**: Membuka tata letak cetak bersih siap simpan sebagai PDF.
  - **Download HTML Interaktif Mandiri (`.html`)**: File tunggal HTML offline lengkap dengan fitur pencarian rumus dan *flip-card* interaktif yang dapat dibuka di HP/laptop tanpa internet.
  - **Download Ringkasan Markdown (`.md`)**: Dokumentasi rumus & tanya-jawab terstruktur.
  - **Download Paket Data JSON (`.json`)**: Ekspor kartu dan rumus untuk pencadangan atau berbagi materi.
  - Seluruh file unduhan menyertakan atribusi resmi **`Copyright © 2026 Hanif`**.

### 5.4 Modul 4 — Vault Catatan Foto Metode Cornell (`PhotoNotesVaultView.tsx`)
- **Kompresi Gambar Otomatis**: Mengompresi foto buku catatan/papan tulis menggunakan HTML5 Canvas (`imageCompressor.ts`) dan menampilkan statistik penghematan memori (KB asli vs KB terkompresi).
- **Struktur Catatan Cornell**:
  - **Poin Kunci / Pertanyaan Penting** (Kolom Kiri Cornell).
  - **Galeri Foto Catatan** dengan fitur *Lightbox Zoom*.
  - **Kesimpulan Inti 3 Kalimat** (Kolom Bawah Cornell).
- **Integrasi Cepat ke Active Recall**: Tombol satu klik pada catatan Cornell untuk langsung mengubah poin penting catatan menjadi kartu Flashcard baru pada bab yang sama.

### 5.5 Modul 5 — Kurikulum Kelas 9 & Mastery Tracker (`CurriculumMasteryView.tsx`)
- **Cakupan Kurikulum Default (4 Mapel Inti — 26 Bab Semester 1 & 2)**:
  1. **Matematika (`MTK` — 6 Bab)**:
     - Sem 1: Bab 1 Perpangkatan & Bentuk Akar; Bab 2 Persamaan & Fungsi Kuadrat; Bab 3 Transformasi Geometri.
     - Sem 2: Bab 4 Kekongruenan & Kesebangunan; Bab 5 Bangun Ruang Sisi Lengkung (Tabung, Kerucut, Bola); Bab 6 Statistika & Peluang Empirik/Teoretik.
  2. **Fisika (`FIS` — 6 Bab)**:
     - Sem 1: Bab 1 Listrik Statis & Hukum Coulomb; Bab 2 Rangkaian Listrik Arus Searah (DC) & Hukum Ohm/Kirchhoff; Bab 3 Energi & Daya Listrik Rumah Tangga.
     - Sem 2: Bab 4 Kemagnetan & Gaya Lorentz; Bab 5 Induksi Elektromagnetik & Transformator; Bab 6 Tata Surya, Hukum Kepler & Fisika Bumi.
  3. **Biologi IPA (`BIO` — 7 Bab)**:
     - Sem 1: Bab 1 Sistem Reproduksi Manusia & Pembelahan Sel; Bab 2 Sistem Perkembangbiakan Tumbuhan & Hewan; Bab 3 Pewarisan Sifat (Genetika Hukum Mendel I & II); Bab 4 Bioteknologi Konvensional & Modern.
     - Sem 2: Bab 5 Partikel Penyusun Benda & Makhluk Hidup; Bab 6 Tanah & Keberlangsungan Kehidupan; Bab 7 Teknologi Ramah Lingkungan.
  4. **Bahasa Inggris (`ENG` — 7 Bab)**:
     - Sem 1: Bab 1 *Congratulations, Hopes & Wishes*; Bab 2 *Agreement, Purpose (in order to / so that) & Imperatives*; Bab 3 *Product Labels & Procedure Texts*; Bab 4 *Continuous Tenses & Present Perfect Tense*.
     - Sem 2: Bab 5 *Passive Voice (Kalimat Pasif)*; Bab 6 *Narrative Text (Fairy Tales & Folktales)*; Bab 7 *Report Text, Advertising & Song Appreciation*.
- **Indikator Recency Otomatis (`getChapterRecencyInfo`)**:
  - Memberi penanda warna otomatis berdasarkan kapan terakhir kali suatu bab dipelajari: `Dipelajari hari ini`, `1–4 hari lalu` (Hijau/Aman), `5–7 hari lalu` (Kuning/Perlu Review), atau `>7 hari lalu / Belum pernah disentuh` (Merah/Wajib Diulang).
- **Fleksibilitas Kurikulum**: Mendukung penambahan mata pelajaran baru maupun penambahan/penghapusan bab kustom.

### 5.6 Modul 6 — Focus Studio, Web Audio Synthesizer & Simulator Rapor (`FocusAndGradesView.tsx`)
- **Timer Fokus Belajar**:
  - Mode **Pomodoro (25 menit fokus / 5 menit istirahat)** dan **Deep Work (50 menit fokus / 10 menit istirahat)**.
  - Mencatat sesi belajar yang selesai ke dalam `studyLogs` dan memperbarui status *last studied* pada bab yang dipilih.
- **9 Suara Penenang Web Audio Offline (`src/utils/audioSynth.ts`)**:
  1. `Hujan Rintik Halus (Gentle Rain)` — Pink-filtered noise dengan modulasi rintik lembut.
  2. `Hujan Malam Teduh (Deep Night Rain)` — Low-pass warm rain dengan resonansi ruang teduh.
  3. `Ombak Pantai Tenang (Ocean Waves)` — Siklus LFO deburan ombak 0.12 Hz yang menenangkan napas.
  4. `Aliran Sungai Pegunungan (Mountain Stream)` — Dual-bandpass air mengalir jernih.
  5. `Angin Hutan Pinus (Forest Wind)` — Sweeping filter hembusan angin di sela pepohonan.
  6. `Brown Noise Dalam (Deep Focus)` — Reduksi frekuensi tinggi untuk memblokir kebisingan sekitar.
  7. `Pink Noise Seimbang (Balanced Calm)` — Spektrum frekuensi seimbang untuk membaca panjang.
  8. `Gelombang Alpha 10 Hz (Binaural Study)` — Nada murni 200 Hz (Kiri) & 210 Hz (Kanan) untuk merangsang fokus tenang gelombang Alpha.
  9. `Harmoni Piano & Pad Tenang (Ambient Chord)` — Akor ambient Fmaj7–Cmaj7 lembut dengan modulasi harmonik lambat.
- **Simulator Target Nilai Rapor (`calculateSubjectGradeSimulation`)**:
  - Menghitung rata-rata komponen nilai (`Tugas`, `UH`, `PTS`, `PAS`) dan mensimulasikan **skor minimum yang wajib diraih pada ujian berikutnya** ($N_{next} = \text{Target} \times (n + 1) - \sum N_i$) agar rata-rata rapor mencapai target.

### 5.7 Modul 7 — Panel Admin & Kontrol Database Server (`AdminDashboardView.tsx`)
- **Pembatasan Akses Ketat (Admin-Only)**: Hanya muncul di navigasi apabila `userSession.role === 'admin'`.
- **Manajemen Bot WhatsApp Fonnte**: Menyimpan API Token Fonnte dan template pesan OTP ke `/app_config/fonnte_settings` di Cloud Firestore serta menyediakan penguji pengiriman pesan WhatsApp langsung.
- **Monitoring Pengguna & Log OTP**: Menampilkan tabel seluruh siswa yang telah login beserta jumlah tugas, kegiatan, catatan foto, dan riwayat kode OTP yang diterbitkan.
- **Kontrol Eksklusif Database Server**:
  - Unduh Cadangan Penuh (`Export JSON`).
  - Pulihkan Cadangan (`Import JSON`).
  - Reset Workspace ke Default Kurikulum & Rumus.
  - Hapus Data Cloud Akun Siswa tertentu (`deleteCloudAccountData`).
  - Bersihkan seluruh Riwayat Log OTP di Cloud (`clearAllOtpLogsFromCloud`).

---

## 6. Skema Database (Cloud Firestore & IndexedDB)

### 6.1 Koleksi Cloud Firestore (`firestore.rules`)
Database Firestore ID: `ai-studio-studyoskelas9-02019100-8052-4685-b71e-71ac43d3582b`

1. **`/study_workspaces/{accountId}`**
   - `accountId` (`string`): Nomor HP ternormalisasi (`628...`) atau `'admin'`.
   - `phone` (`string`): Nomor telepon akun.
   - `displayName` (`string`): Nama siswa / administrator.
   - `role` (`'student' | 'admin'`).
   - `payloadJson` (`string`): Serialisasi JSON dari `FullDatabaseDump` (< 900 KB).
   - `updatedAt` (`string` ISO-8601).
2. **`/study_photo_notes/{photoDocId}`**
   - `id` (`string`): `{accountId}_{noteId}`.
   - `accountId` (`string`): ID akun pemilik catatan foto.
   - `noteJson` (`string`): Serialisasi JSON objek `PhotoNote` beserta array gambar terkompresi (< 940 KB per catatan).
   - `updatedAt` (`string` ISO-8601).
3. **`/registered_users/{accountId}`**
   - Ringkasan metrik pengguna (`accountId`, `phone`, `displayName`, `role`, `tasksCount`, `activitiesCount`, `notesCount`, `lastSyncedAt`) untuk dasbor pemantauan Admin.
4. **`/otp_logs/{logId}`**
   - Catatan audit pengiriman OTP (`id`, `phone`, `displayName`, `otpCode`, `deliveryMethod`: `'fonnte_wa' | 'fallback_screen'`, `status`, `createdAt`).
5. **`/app_config/fonnte_settings`**
   - Konfigurasi terpusat Bot WhatsApp Fonnte (`token`, `otpTemplate`, `updatedAt`).

### 6.2 Toko Objek IndexedDB Lokal (`StudyDatabase.ts`)
Setiap akun memiliki instance IndexedDB terisolasi (`studyos_kelas9_v3_{accountId}`) dengan 10 Object Stores:
`curriculum`, `tasks`, `activities`, `schedule`, `notes`, `flashcards`, `formulas`, `mistakes`, `grades`, dan `studyLogs`.

---

## 7. Spesifikasi Teknis Publik: PWA, Keamanan HTTP, & SEO

### 7.1 Progressive Web App (PWA) & Offline Capability
- Dikonfigurasi menggunakan `vite-plugin-pwa` di `vite.config.ts` dengan strategi `registerType: 'autoUpdate'`.
- **Web App Manifest (`/manifest.webmanifest`)**:
  - `name`: `"StudyOS Kelas 9 — Workspace Belajar SMP (© Hanif)"`
  - `short_name`: `"StudyOS 9"`
  - `display`: `"standalone"`, `orientation`: `"portrait"`
  - `theme_color`: `"#2563EB"`, `background_color`: `"#090D16"`
  - Menyertakan ikon lengkap `/icon.svg`, `/pwa-192x192.png`, `/pwa-512x512.png`, `/pwa-maskable-512x512.png`, dan `/apple-touch-icon.png`.
- **Komponen UI PWA**:
  - `PWAInstallButton.tsx`: Menangkap event `beforeinstallprompt` di Android/Desktop dan menampilkan modal panduan instalasi khusus untuk pengguna iOS Safari (*Bagikan → Tambah ke Layar Utama*).
  - `OfflineIndicator.tsx`: Menampilkan status mode offline secara real-time ketika perangkat kehilangan koneksi internet.

### 7.2 Konfigurasi Keamanan & Routing Vercel (`vercel.json`)
- **SPA Rewrite**: Seluruh rute diarahkan ke `/index.html` agar navigasi tidak menghasilkan error 404.
- **Security Headers**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(self), microphone=(), geolocation=()`
- **Cache Control Service Worker**: Memastikan `/sw.js` selalu mengambil versi terbaru (`max-age=0, must-revalidate`).

### 7.3 SEO, OpenGraph, & Schema.org Structured Data (`index.html`)
- Dilengkapi meta tag `description`, `author="Hanif"`, `copyright="Copyright (c) 2026 Hanif"`, OpenGraph (`og:title`, `og:description`, `og:image`, `og:locale="id_ID"`), Twitter Card (`summary_large_image`), serta JSON-LD `Schema.org` bertipe `EducationalApplication` / `WebApplication`.

---

## 8. Panduan Deployment ke Vercel & Pengujian Kualitas

### 8.1 Variabel Lingkungan (`.env.example`)
Saat melakukan deployment ke **Vercel**, tambahkan Environment Variable opsional berikut pada menu **Project Settings → Environment Variables**:
```env
VITE_FONNTE_TOKEN=masukkan_token_api_fonnte_anda_disini
```
*(Catatan: Token Fonnte juga dapat diatur atau diubah kapan saja secara langsung melalui **Panel Admin** di dalam web tanpa perlu melakukan build ulang).*

### 8.2 Perintah Build & Verifikasi Otomatis
- **Menjalankan Unit Test Suite (12 Pengujian Logika, Kalkulator, Kurikulum & Keamanan)**:
  ```bash
  npx tsx --test src/utils/studyLogic.test.ts
  ```
- **Pemeriksaan Tipe TypeScript (Lint)**:
  ```bash
  npm run lint
  ```
- **Build Produksi (Vite + Workbox Service Worker)**:
  ```bash
  npm run build
  ```

---

## 9. Ketentuan Hak Cipta (Copyright Notice)
Seluruh kode sumber, riset materi kurikulum & rumus, algoritma simulasi, desain antarmuka, serta dokumen ekspor belajar pada proyek **StudyOS Kelas 9** dilindungi di bawah atribusi resmi:

> **Copyright © 2026 Hanif. All rights reserved.**
