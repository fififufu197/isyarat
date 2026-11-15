# Deploy gratis ke Vercel

Panduan langkah demi langkah untuk menaruh Isyarat di internet dengan biaya **Rp0** (kecuali kamu mengaktifkan LLM). Ada dua jalur:

- **Jalur A — GitHub + dashboard Vercel** (disarankan): deploy otomatis setiap `git push`, cocok untuk jangka panjang.
- **Jalur B — Vercel CLI**: tanpa GitHub, cocok untuk uji cepat.

> **Penting:** Vercel Hobby gratis hanya untuk **proyek pribadi/non-komersial**. Jika nanti dipakai untuk produk berbayar, iklan, atau pekerjaan klien, Vercel mewajibkan Pro ($20/bulan). Supabase dan LLM punya ketentuan masing-masing.

---

## 0. Yang perlu disiapkan

- Node.js **20 atau lebih baru** (`node -v`)
- Git (`git --version`)
- Akun **GitHub** — gratis
- Akun **Vercel** — gratis, daftar dengan GitHub
- Akun **Supabase** — opsional, gratis
- Project ini sudah bisa `npm run build` di lokal

---

## 1. Uji build di lokal dulu

Jangan deploy sebelum build lokal bersih.

```bash
npm install
npm run build
npm run start
```

Buka `http://localhost:3000`:

- [ ] Landing page tampil
- [ ] `/studio` → kamera menyala → tulisan "Menyiapkan model tangan" hilang
- [ ] `/upload` bisa memilih video
- [ ] `/latih` bisa merekam contoh

`npm run build` otomatis menjalankan `prebuild` → `scripts/setup-assets.mjs`, yang:

1. menyalin WASM MediaPipe ke `public/mediapipe/wasm`
2. mengunduh model `hand_landmarker.task` (~7,5 MB) ke `public/models`

Kedua folder itu **di-gitignore** karena dibuat ulang saat install/build. Jangan heran kalau tidak muncul di GitHub.

Jika ingin memastikan aset ada:

```bash
ls -lh public/models/hand_landmarker.task
ls -lh public/mediapipe/wasm
```

---

## 2. Push project ke GitHub

Folder ini belum berupa repo Git. Jalankan di root project:

```bash
git init
git add .
git commit -m "Isyarat: penerjemah ejaan jari SIBI on-device"
git branch -M main
```

Lalu buat repo **kosong** di GitHub:

1. Buka <https://github.com/new>
2. Nama misalnya `isyarat`
3. **Jangan** centang "Add a README file", "Add .gitignore", atau license
4. Klik **Create repository**

Hubungkan dan push:

```bash
git remote add origin https://github.com/USERNAME/isyarat.git
git push -u origin main
```

Ganti `USERNAME` dengan username GitHub-mu.

Cek isi repo:

```bash
git ls-files | head
```

`public/models` dan `public/mediapipe` **tidak akan muncul** — itu normal. Vercel akan membuatnya saat build.

> Jika `git push` meminta login, gunakan Personal Access Token atau GitHub CLI (`gh auth login`). Password akun GitHub tidak bisa dipakai untuk push.

---

## 3. Import repo ke Vercel

1. Buka <https://vercel.com> dan login dengan GitHub.
2. Klik **Add New… → Project**.
3. Di daftar **Import Git Repository**, pilih repo `isyarat`.
   - Kalau repo tidak muncul: klik **Adjust GitHub App Permissions**, beri akses ke repo tersebut, lalu kembali.
4. Isi konfigurasi:

| Setting | Nilai |
|---|---|
| Framework Preset | **Next.js** (terdeteksi otomatis) |
| Root Directory | `./` |
| Build Command | biarkan default (`npm run build`) |
| Output Directory | biarkan default (`.next`) |
| Install Command | biarkan default (`npm install`) |
| Node.js Version | **22.x** atau **24.x** (jangan di bawah 20) |

5. Environment Variables: **kosongkan dulu** kalau belum memakai Supabase/LLM. Semua opsional.
6. Klik **Deploy**.

Build biasanya 1–3 menit. Di log build, cari baris seperti:

```
[setup] WASM MediaPipe siap di public/mediapipe/wasm
[setup] Model tersimpan (7.5 MB).
```

atau `[setup] Model hand_landmarker.task sudah ada.` Kalau baris ini tidak ada, aset mungkin tidak ikut ter-build (lihat Troubleshooting).

Setelah selesai, Vercel memberi URL seperti:

```
https://isyarat-abc123.vercel.app
```

Buka URL tersebut. HTTPS sudah otomatis, jadi kamera bisa diakses.

---

## 4. Verifikasi hasil deploy

Lakukan berurutan di URL produksi:

1. **Landing page** `/` tampil dan tidak ada layout rusak.
2. **`/panduan`** terbuka.
3. **`/studio`**
   - Klik **Nyalakan kamera**, izinkan akses kamera.
   - Tunggu overlay "Menyiapkan model tangan" hilang.
   - Angka **fps** naik di atas 0 dan label "live" muncul.
   - Coba isyarat cepat: `A B D I L O V W Y` atau telapak terbuka untuk spasi.
4. **`/latih`**
   - Rekam beberapa contoh huruf.
   - Refresh halaman — jumlah sampel harus tetap ada (tersimpan di `localStorage`).
5. **`/upload`**
   - Unggah video pendek berisi tangan.
   - Analisis berjalan sampai selesai dan menghasilkan segmen/transkrip.
6. **HP** — buka URL Vercel di HP, izinkan kamera, cek layout tidak melebar.

Kalau kamera diblokir, buka ikon gembok di address bar → izinkan Camera → reload.

---

## 5. Supabase (opsional)

Tanpa Supabase, aplikasi tetap berfungsi penuh secara lokal. Supabase hanya untuk login dan sinkronisasi profil antar perangkat.

### 5.1 Buat project

1. Buka <https://supabase.com/dashboard> → **New project**.
2. Pilih organization, beri nama `isyarat`.
3. **Region:** pilih yang terdekat, misalnya **Southeast Asia (Singapore)**.
4. Buat database password yang kuat (simpan di password manager).
5. Plan: **Free**. Tunggu provisioning 1–2 menit.

### 5.2 Jalankan schema

1. Buka **SQL Editor** → **New query**.
2. Salin seluruh isi `supabase/schema.sql` dari repo.
3. Klik **Run**.
4. Cek **Table Editor**: harus ada `sign_profiles` dan `transcripts`, keduanya dengan RLS aktif.

### 5.3 Ambil URL dan key

1. Buka **Settings → API Keys** (di UI baru; bukan lagi halaman "API" lama).
2. Salin **Project URL**, misalnya `https://abcdefgh.supabase.co`.
3. Salin **publishable key** yang berawalan `sb_publishable_...`.

> Key `anon` yang panjang (`eyJ...`) adalah format lama dan akan dipensiunkan Supabase akhir 2026. Aplikasi ini menerima keduanya, tetapi utamakan **publishable key**.
>
> **Jangan pernah** memakai **secret key** (`sb_secret_...`) atau `service_role` di aplikasi web. Key itu melewati RLS dan bisa membocorkan seluruh database.

### 5.4 Pasang environment variable di Vercel

**Project → Settings → Environment Variables**, tambahkan:

| Name | Value | Environment |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://abcdefgh.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Production, Preview, Development |

Jika project Supabase-mu masih memakai key lama, nama `NEXT_PUBLIC_SUPABASE_ANON_KEY` juga didukung.

Setelah menambah env:

1. Buka tab **Deployments**.
2. Klik `…` pada deployment terbaru → **Redeploy**.
3. Env baru hanya terpakai setelah redeploy.

### 5.5 Atur redirect URL auth

Login memakai **magic link** ke `${origin}/latih`, jadi Supabase harus mengizinkan domain Vercel.

1. Supabase → **Authentication → URL Configuration**.
2. **Site URL:** `https://isyarat-abc123.vercel.app`
3. **Redirect URLs**, tambahkan:
   ```
   https://isyarat-abc123.vercel.app/**
   http://localhost:3000/**
   https://*-USERNAME.vercel.app/**
   ```
   Baris ketiga untuk preview deployment. Ganti `USERNAME` dengan slug akun/tim Vercel-mu.
4. Simpan.

### 5.6 Uji login

1. Buka `/latih` di URL produksi.
2. Di panel cloud, masukkan email.
3. Cek inbox (dan folder spam) → klik magic link.
4. Kamu harus kembali ke `/latih` dalam keadaan login.
5. Coba **Push** profil, lalu **Pull** di browser lain dengan akun yang sama.

Catatan email gratis Supabase punya batas pengiriman yang ketat. Kalau email tidak masuk, tunggu beberapa menit, cek spam, atau konfigurasi SMTP sendiri di **Authentication → Emails**.

### 5.7 Uji isolasi data

Buat akun kedua (email lain), login, dan pastikan akun kedua **tidak melihat** profil/transkrip akun pertama. Ini membuktikan RLS bekerja.

---

## 6. LLM untuk tombol "Rapikan" (opsional, berbayar)

Fitur ini **tidak wajib** dan **tidak gratis** karena memanggil API model bahasa.

1. Buat API key di penyedia kompatibel OpenAI (mis. OpenAI, Groq, OpenRouter).
2. Vercel → **Settings → Environment Variables**:
   ```
   OPENAI_API_KEY=sk-...
   OPENAI_BASE_URL=https://api.openai.com/v1
   OPENAI_MODEL=gpt-4o-mini
   ```
3. `OPENAI_BASE_URL` dan `OPENAI_MODEL` boleh dikosongkan (ada default).
4. **Jangan** memberi prefix `NEXT_PUBLIC_` pada `OPENAI_API_KEY`. Prefix itu membuat key ikut terkirim ke browser.
5. Redeploy.

Kalau key kosong, tombol "Rapikan" nonaktif dan fitur lain tetap jalan. Untuk tetap gratis, biarkan kosong.

---

## 7. Update, preview, dan rollback

- **Update produksi:** `git push` ke branch `main` → Vercel deploy otomatis.
- **Preview:** buat branch/PR → Vercel memberi URL preview terpisah.
- **Ubah env:** edit di dashboard → **Redeploy**.
- **Rollback:** **Deployments** → pilih deployment lama → `…` → **Promote to Production**.
- **Custom domain:** **Settings → Domains** → tambahkan domain milikmu (SSL otomatis).

---

## 8. Jalur B — Vercel CLI (tanpa GitHub)

Cocok untuk uji cepat atau kalau tidak ingin repo GitHub.

```bash
npm i -g vercel
vercel login
```

Dari root project:

```bash
vercel          # deploy preview
vercel --prod   # deploy production
```

Saat pertama kali, jawab pertanyaannya:

- Set up and deploy? **Y**
- Which scope? pilih akunmu
- Link to existing project? **N**
- Project name: `isyarat`
- Directory: `./`
- Override settings? **N**

Env variables bisa ditambahkan lewat dashboard atau:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Lalu `vercel --prod` lagi.

Repo ini menyertakan `.vercelignore` agar CLI tidak mengunggah `.next`, `node_modules`, atau aset MediaPipe lokal (~37 MB). Aset tetap dibuat ulang oleh `prebuild` di server Vercel.

### Uji tanpa akun sama sekali

```bash
npx vercel@latest deploy --temporary
```

Perintah ini build di komputermu lalu memberi URL sementara + link klaim. URL akan kedaluwarsa jika tidak diklaim. Cocok untuk demo cepat, bukan untuk produksi.

> Vercel Drop (drag-and-drop di browser) hanya untuk situs statis, jadi **tidak cocok** untuk Next.js ini.

---

## 9. Batas gratis yang perlu diketahui

### Vercel Hobby

- Gratis untuk **pribadi/non-komersial**
- 100 GB bandwidth/bulan, 1 juta CDN request, 1 juta function invocation
- 4 CPU-jam, 360 GB-jam memori
- 100 deployment/hari, 1 build bersamaan, build maksimal 45 menit
- Upload file statis via CLI maksimal 100 MB
- Kalau limit terlampaui, situs bisa pause dan biasanya harus menunggu 30 hari

Aset MediaPipe ~37 MB ikut ter-deploy. Model 7,5 MB diunduh browser sekali per sesi, lalu di-cache. Untuk pemakaian pribadi, ini jauh di bawah limit.

### Supabase Free

- 2 project aktif, database 500 MB, egress 5 GB, storage 1 GB
- 50.000 MAU, API request tidak dibatasi
- **Project pause setelah 1 minggu aktivitas rendah**
- Bisa di-resume dari dashboard (data tetap ada, sampai 1 tahun)
- Untuk mencegah pause: beberapa request database per hari, atau upgrade ke Pro

### LLM

- Dibayar per token. Tidak ada kuota gratis permanen dari OpenAI.
- Jika ingin tetap Rp0, jangan isi `OPENAI_API_KEY`.

---

## 10. Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| Build gagal saat mengunduh model | Vercel tidak bisa akses `storage.googleapis.com`, atau jaringan build bermasalah | Redeploy. Kalau tetap gagal, commit aset secara paksa (lihat bawah) |
| `404` pada `/models/hand_landmarker.task` | `postinstall`/`prebuild` tidak berjalan | Pastikan Install Command `npm install` dan Build Command `npm run build`; cek log `[setup]`; redeploy |
| `404` pada `/mediapipe/wasm/...` | WASM tidak tersalin | Sama seperti di atas; jalankan `node scripts/setup-assets.mjs` lalu redeploy |
| Kamera tidak bisa dibuka | Izin browser / bukan HTTPS | Klik ikon gembok → izinkan Camera; pastikan membuka `https://...vercel.app`, bukan IP LAN |
| Model loading terus | Koneksi lambat / aset gagal | Cek Network tab untuk file `.task`; tunggu; redeploy jika 404 |
| fps 0 tapi kamera hidup | Model masih warm-up | Tunggu 2–5 detik; pastikan tangan terlihat |
| Semua huruf "belum dikenali" | Mode cepat hanya 9 huruf | Rekam profil di `/latih`, pilih mode **Terlatih** |
| "Supabase belum dikonfigurasi" | Env belum ada / belum redeploy | Tambahkan env, lalu **Redeploy** |
| Magic link kembali ke `localhost` | Site URL/Redirect URL salah | Set Site URL ke domain Vercel; tambahkan `https://domain/**` |
| `Invalid API key` | Memakai secret key atau key salah | Gunakan publishable key `sb_publishable_...` |
| Data cloud kosong | Belum login / schema belum dijalankan / RLS | Login, jalankan `schema.sql`, cek policy |
| `503 DEPLOYMENT_PAUSED` | Limit Hobby terlampaui | Tunggu periode reset atau upgrade Pro |
| Build kehabisan memori | Build jarang, biasanya bukan project ini | Redeploy; jika berulang, sederhanakan build |

### Fallback: commit aset MediaPipe

Kalau build Vercel terus gagal mengunduh model, paksa aset masuk repo:

```bash
git add -f public/mediapipe public/models
git commit -m "chore: commit aset MediaPipe untuk deploy"
git push
```

Ukurannya ~37 MB dan file terbesar jauh di bawah batas 100 MB GitHub. Ini membuat repo lebih besar, tetapi build tidak lagi bergantung pada unduhan saat deploy. Setelah itu, `postinstall` akan mendeteksi model sudah ada dan melewati unduhan.

---

## 11. Keamanan

- `NEXT_PUBLIC_*` **selalu** bisa dibaca browser. Hanya taruh URL dan publishable key di sana.
- `OPENAI_API_KEY` dan Supabase **secret key** tidak boleh memakai prefix `NEXT_PUBLIC_`.
- Jangan pernah commit `.env.local`.
- Video dan frame kamera tidak dikirim ke Vercel/Supabase; semua diproses di browser.
- Yang disimpan Supabase hanya JSON profil dan teks transkrip yang kamu pilih.
- Aktifkan RLS (sudah ada di `schema.sql`) dan uji dengan akun kedua.

---

## 12. Checklist deploy

**Wajib**
- [ ] `npm run build` sukses di lokal
- [ ] Repo GitHub berisi source (tanpa aset MediaPipe)
- [ ] Vercel deploy sukses
- [ ] Log build menunjukkan `[setup]`
- [ ] `/studio` kamera + model jalan
- [ ] `/latih` menyimpan sampel setelah refresh
- [ ] `/upload` menganalisis video
- [ ] Layout HP tidak melebar

**Opsional**
- [ ] Env Supabase terpasang + redeploy
- [ ] `schema.sql` dijalankan
- [ ] Site URL + Redirect URLs benar
- [ ] Magic link berhasil
- [ ] Akun kedua tidak bisa melihat data akun pertama
- [ ] `OPENAI_API_KEY` terpasang (hanya jika mau fitur Rapikan)
- [ ] Custom domain (jika punya)
