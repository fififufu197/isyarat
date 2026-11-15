# Isyarat

Isyarat mengubah ejaan jari **SIBI** (Sistem Isyarat Bahasa Indonesia) menjadi teks lewat kamera, langsung di browser. Ada dua cara pakai: **studio kamera real-time** dan **analisis file video**. Tidak ada video yang diunggah ke server — deteksi tangan berjalan on-device memakai MediaPipe Hand Landmarker.

> **Batasan penting:** ini bukan penerjemah bahasa isyarat penuh. Isyarat mengenali **ejaan jari (fingerspelling)** dan kosakata terbatas yang kamu rekam sendiri. SIBI/BISINDO adalah bahasa visual dengan tata bahasa sendiri; aplikasi ini alat bantu latihan dan aksesibilitas, bukan pengganti juru bahasa profesional.

## Fitur

- **Studio kamera** — deteksi 21 titik tangan per frame, klasifikasi huruf real-time, hold-to-lock, spasi, hapus, dan suara.
- **Upload video** — MP4/WebM/MOV (maks 150 MB, 180 detik pertama) dianalisis frame demi frame, hasilnya berupa segmen transkrip yang bisa diklik untuk melompat ke detik terkait.
- **Mesin cepat tanpa data latih** — 9 huruf yang bentuknya paling khas langsung dikenali: `A B D I L O V W Y` + spasi.
- **Mode terlatih** — rekam contoh sendiri untuk 26 huruf (k-NN) dan kata dinamis (DTW).
- **Latih profil** — perekam contoh dengan hitung mundur, indikator kualitas, impor/ekspor JSON.
- **Opsional: Supabase** — login magic link, simpan/muat profil isyarat antar perangkat.
- **Opsional: LLM** — tombol "Rapikan" menyusun ulang hasil ejaan menjadi kalimat wajar.
- **Riwayat lokal**, overlay siaran (teks besar untuk ditunjukkan ke lawan bicara), dan copy/unduh transkrip.
- Sepenuhnya **local-first**: tanpa Supabase dan tanpa API key, aplikasi tetap berfungsi.

## Mulai cepat

```bash
npm install     # sekaligus menjalankan postinstall: unduh model + salin WASM
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000), izinkan akses kamera, lalu tahan sebuah isyarat sampai cincin penuh.

Perintah lain:

```bash
npm run typecheck   # tsc --noEmit
npm run build       # build produksi
npm run start       # jalankan hasil build
```

Butuh Node.js 20+ dan koneksi internet saat `npm install` pertama (model ~7,5 MB diunduh ke `public/models`). Jika aset terhapus, jalankan `node scripts/setup-assets.mjs`.

### Kenapa kamera harus localhost/HTTPS?

`getUserMedia` hanya aktif di secure context. `localhost` dianggap aman; alamat IP LAN biasa tidak. Untuk mencoba dari HP, deploy ke Vercel atau pakai tunnel HTTPS.

## Cara kerja

```
video / kamera
      │
      ▼
MediaPipe HandLandmarker  → 21 landmark (x, y)
      │
      ▼
normalisasi fitur          → translasi, skala, rotasi → 42 dimensi
      │
      ├── mode cepat   → aturan geometri (sudut lipatan, jarak ujung jari)
      ├── huruf terlatih → k-NN kosinus + jarak Euclidean
      └── kata         → rata-rata vektor per frame + DTW (Dynamic Time Warping)
      │
      ▼
hold-to-lock → event huruf/kata → transkrip
```

- **`lib/features.ts`** — normalisasi landmark dan `quickClassify`, classifier aturan untuk huruf yang bentuknya tegas.
- **`lib/knn.ts`** — `classifyStatic` (k-NN berbobot jarak Euclidean), `dtwDistance`, dan `classifySequence`.
- **`lib/engine.ts`** — loop kamera, kontrol hold/lock, mode huruf/kata, penggambaran skeleton.
- **`lib/offline.ts`** — analisis video dengan `seek` per frame, penggabungan segmen, dan transkrip.
- **`public/mediapipe/wasm` + `public/models`** — aset runtime lokal supaya tidak bergantung CDN.

Model tidak pernah dilatih ulang di server. "Pelatihan" berarti menyimpan contoh vektor ke `localStorage` (`isyarat.profile.v1`), lalu membandingkan frame baru dengan contoh tersebut.

### Mode cepat vs terlatih

| | Cepat | Terlatih |
|---|---|---|
| Data | tidak perlu | minimal 8 sampel huruf (±4 rekaman) |
| Cakupan | 9 huruf + spasi | 26 huruf |
| Akurasi | cukup untuk bentuk khas | tergantung kualitas rekaman |
| Kata | — | minimal 2 contoh per kata |

Aplikasi jujur soal ini: huruf di luar daftar cepat akan tampil sebagai "belum dikenali" sampai kamu merekam profil.

## Melatih isyarat sendiri

1. Buka **/latih**, nyalakan kamera, pilih huruf.
2. Rekam 10–20 contoh per huruf dengan variasi sudut dan jarak secukupnya.
3. Jaga satu tangan terlihat penuh, cahaya merata, latar tidak ramai.
4. Untuk kata: pilih mode **Kata**, rekam gerakan utuh 2–4 detik, minimal 2 contoh (idealnya 4–6).
5. Ekspor profil sebagai backup. Profil tersimpan di browser ini saja kecuali kamu mengaktifkan Supabase.

Kualitas contoh lebih penting daripada jumlah. Rekaman yang semuanya identik membuat model rapuh terhadap perubahan sudut. Satu rekaman menyimpan dua sampel (orientasi asli dan cermin), jadi 4 rekaman sudah melewati ambang minimum 8 sampel.

## Halaman

| Rute | Isi |
|---|---|
| `/` | Landing: penjelasan, demo gerak, alur kerja |
| `/studio` | Kamera real-time, transkrip, overlay siaran, rapikan dengan LLM |
| `/upload` | Analisis file video + timeline segmen |
| `/latih` | Perekam dataset, kelola profil, ekspor/impor, sinkron cloud |
| `/panduan` | Panduan lengkap, bentuk tiap huruf, batasan |
| `/api/rapikan` | Route handler opsional untuk LLM |

## Supabase (opsional)

1. Buat project di [supabase.com](https://supabase.com).
2. Jalankan `supabase/schema.sql` di SQL Editor.
3. Salin `.env.example` menjadi `.env.local`, isi:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   Nama lama `NEXT_PUBLIC_SUPABASE_ANON_KEY` juga masih didukung, tetapi Supabase memensiunkan key `anon` akhir 2026.
4. Di **Authentication → URL Configuration**, tambahkan `http://localhost:3000/**` dan domain produksi ke Redirect URLs.
5. Login memakai magic link email. Profil dan transkrip dilindungi RLS: satu akun hanya bisa membaca datanya sendiri.

Yang disimpan hanya JSON profil dan teks transkrip yang kamu pilih untuk disimpan. Video tidak pernah dikirim.

## LLM opsional

Tombol **Rapikan** memanggil `/api/rapikan`, yang memakai API kompatibel OpenAI:

```bash
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1   # bisa diganti endpoint kompatibel
OPENAI_MODEL=gpt-4o-mini
```

Tanpa key, tombol nonaktif dan seluruh fitur lain tetap jalan. Kirim hanya teks transkrip — bukan video atau landmark. Prompt meminta model merapikan ejaan tanpa menambah fakta.

## Deploy ke Vercel

Panduan lengkap (GitHub, CLI, Supabase, redirect URL, troubleshooting, batas gratis): **[DEPLOY.md](./DEPLOY.md)**.

Ringkasan:

1. Push repo ke GitHub.
2. Import di Vercel. Framework terdeteksi otomatis (Next.js).
3. Tambahkan environment variable bila memakai Supabase/LLM (semua opsional).
4. Deploy. `postinstall` dan `prebuild` menyiapkan WASM + mengunduh model saat build.

Catatan:

- `public/mediapipe` dan `public/models` **di-gitignore** karena dibuat ulang oleh `postinstall`/`prebuild`. Jangan set `--ignore-scripts` saat install di CI.
- Aplikasi memakai Next.js 16 App Router. Halaman studio/upload membaca env saat request lewat `connection()`.
- Tidak ada database wajib, tidak ada server inference. Biaya hosting minimum.
- Vercel Hobby gratis hanya untuk proyek pribadi/non-komersial. Supabase Free pause setelah 1 minggu tanpa aktivitas.

## Privasi & performa

- Frame kamera dan file video diproses di memori browser; tidak ada request media ke server.
- Inference berjalan di WebAssembly + GPU/CPU browser. Di laptop modern biasanya 20–30 fps; di HP bisa lebih rendah.
- Model ~7,5 MB diunduh sekali per sesi (di-cache browser).
- `localStorage` menyimpan profil dan riwayat. Gunakan tombol hapus di `/latih` untuk membersihkan.

## Troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| "Kamera hanya bisa diakses lewat HTTPS atau localhost" | Buka via `localhost`, bukan IP LAN. Untuk HP, deploy/tunnel HTTPS. |
| Kamera hitam / error `NotReadableError` | Kamera dipakai aplikasi lain. Tutup Zoom/Meet lalu coba lagi. |
| Model gagal dimuat / 404 | Jalankan `node scripts/setup-assets.mjs`, pastikan `public/models/hand_landmarker.task` ada. |
| Semua huruf "belum dikenali" | Mode cepat hanya 9 huruf. Rekam profil di `/latih` untuk huruf lain. |
| Hasil kata kosong | Butuh minimal 2 contoh kata; rekam gerakan utuh, bukan posisi diam. |
| FPS rendah | Tutup tab berat, gunakan resolusi kamera lebih kecil, atau mode huruf (lebih ringan dari DTW). |
| Tombol Rapikan nonaktif | `OPENAI_API_KEY` belum diisi. Fitur ini opsional. |

## Struktur proyek

```
app/                 route App Router, metadata, API rapikan
components/          UI studio, upload, latih, overlay, panel cloud/riwayat
hooks/               kamera, loop landmark, profil localStorage
lib/                 engine, fitur, k-NN/DTW, offline, lexicon, storage, supabase
scripts/             setup aset MediaPipe (postinstall)
supabase/schema.sql  tabel + RLS opsional
public/              aset statis (model & WASM dibuat saat install)
```

## Lisensi & kredit

Kode aplikasi ini bebas kamu kembangkan. MediaPipe Hand Landmarker milik Google (Apache 2.0). Kosakata dan bentuk isyarat mengacu pada SIBI; verifikasi bentuk dengan sumber resmi atau komunitas Tuli sebelum dipakai untuk komunikasi nyata.
