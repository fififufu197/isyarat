import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Camera,
  Check,
  CloudOff,
  Cpu,
  GraduationCap,
  Hand,
  Layers,
  Radio,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { HeroDemo } from "@/components/HeroDemo";

const STEPS = [
  {
    n: "01",
    title: "Tangan dilacak",
    body: "Kamera membaca 21 titik tangan per frame. Tidak ada video yang dikirim keluar — semuanya diproses di browser.",
    detail: "MediaPipe HandLandmarker · WASM/WebGL",
    icon: ScanLine,
  },
  {
    n: "02",
    title: "Dicocokkan dengan profilmu",
    body: "Bentuk tangan dinormalisasi (posisi, skala, rotasi), lalu dibandingkan dengan contoh isyarat yang kamu rekam sendiri.",
    detail: "k-NN untuk huruf · DTW untuk kata",
    icon: Layers,
  },
  {
    n: "03",
    title: "Keluar jadi teks",
    body: "Huruf dan kata tersusun otomatis, bisa disalin, diunduh, dibacakan, atau tampil besar sebagai subtitle siaran.",
    detail: "Teks · suara · mode siaran",
    icon: Sparkles,
  },
];

const FEATURES = [
  {
    icon: Camera,
    title: "Studio live",
    body: "Kamera jadi keyboard. Eja huruf satu per satu, atau ucapkan kata dengan gerakan. Ada indikator tahan, keyakinan, dan FPS.",
  },
  {
    icon: Upload,
    title: "Analisis video",
    body: "Punya rekaman? Unggah, lalu telusuri timeline hasilnya. Cocok untuk mengecek ulang atau membuat transkrip konten.",
  },
  {
    icon: GraduationCap,
    title: "Latih isyaratmu",
    body: "Rekam 10–20 contoh per isyarat. Semakin konsisten rekamanmu, semakin tinggi akurasinya. Semua tersimpan lokal.",
  },
  {
    icon: Radio,
    title: "Mode siaran",
    body: "Tampilan layar penuh dengan teks besar — pas untuk live, presentasi, atau dipasang di samping kamera.",
  },
];

const LIMITS = [
  "Kalimat isyarat bebas (SIBI/BISINDO penuh) belum bisa. Ini butuh dataset besar dan model sekuensial khusus.",
  "Ekspresi wajah, gerak mulut, dan tata ruang belum dibaca — padahal itu bagian penting dari bahasa isyarat.",
  "Akurasi turun kalau cahaya redup, tangan keluar frame, atau latar belakang ramai.",
  "Bukan pengganti juru bahasa isyarat profesional, apalagi untuk situasi medis atau hukum.",
];

export default function HomePage() {
  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden">
        <div className="container-x grid items-center gap-12 pb-10 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-20 lg:pt-24">
          <div className="animate-rise">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip chip-accent">
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent" />
                SIBI · real-time
              </span>
              <span className="chip">
                <CloudOff className="h-3 w-3" />
                tanpa upload video
              </span>
            </div>

            <h1 className="mt-6 text-[clamp(2.7rem,6vw,4.6rem)] font-medium leading-[0.95] tracking-[-0.045em]">
              Bahasa isyarat,
              <br />
              akhirnya{" "}
              <span className="font-serif italic tracking-[-0.02em] text-accent">terbaca</span>.
            </h1>

            <p className="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-muted">
              Kamu menonton host isyarat di live, tapi tidak paham. Isyarat mengubah kamera jadi teks —
              ejaan jari SIBI dan kosakata dasar, dikenali langsung di perangkatmu dalam hitungan milidetik.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/studio" className="btn btn-primary">
                Coba studio
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#cara-kerja" className="btn btn-ghost">
                <BookOpen className="h-4 w-4" />
                Lihat cara kerja
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {["Tanpa akun", "Tanpa GPU cloud", "Video tetap di browser"].map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-accent" />
                  {item}
                </li>
              ))}
            </ul>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-3 border-t border-white/[0.07] pt-6">
              {[
                ["21", "titik tangan / frame"],
                ["26", "huruf SIBI"],
                ["0", "byte video terkirim"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-mono text-2xl tracking-tight text-ink">{value}</dt>
                  <dd className="mt-1 text-[0.72rem] leading-snug text-muted/80">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="animate-rise [animation-delay:120ms]">
            <HeroDemo />
          </div>
        </div>

        <div className="container-x">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-white/[0.06] py-4">
            <span className="label-mono">Dibangun di atas</span>
            {["MediaPipe", "Next.js", "Supabase", "WebAssembly"].map((name) => (
              <span key={name} className="font-mono text-[0.72rem] tracking-wide text-muted/80">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- MASALAH ---------------- */}
      <section className="py-16 sm:py-24">
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div>
              <p className="label-mono">Masalahnya</p>
              <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.6rem)] font-medium leading-[1.05] tracking-[-0.03em]">
                Host isyarat di layar.
                <br />
                <span className="text-muted">Penonton menebak.</span>
              </h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
                Konten berbahasa isyarat tumbuh cepat, tapi teksnya jarang ada. Solusi yang ada biasanya
                menuntut video diunggah ke cloud, mahal, dan tidak real-time.
              </p>
              <Link
                href="/panduan"
                className="mt-6 inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80"
              >
                Baca batasan lengkap
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="panel p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-400/10 text-red-300">
                    <X className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-medium">Cara lama</p>
                </div>
                <ul className="mt-4 space-y-3 text-sm text-muted">
                  <li className="flex gap-2.5">
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-300/70" />
                    Video diunggah ke layanan AI berbayar
                  </li>
                  <li className="flex gap-2.5">
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-300/70" />
                    Hasil datang setelah 10–60 detik
                  </li>
                  <li className="flex gap-2.5">
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-300/70" />
                    Privasi tidak jelas, biaya per menit
                  </li>
                  <li className="flex gap-2.5">
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-300/70" />
                    Model umum hanya menebak-nebak
                  </li>
                </ul>
              </div>

              <div className="panel border-accent/20 bg-accent/[0.035] p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent">
                    <Zap className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-medium">Cara Isyarat</p>
                </div>
                <ul className="mt-4 space-y-3 text-sm text-muted">
                  <li className="flex gap-2.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    21 titik tangan dibaca di browser
                  </li>
                  <li className="flex gap-2.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    Hasil muncul saat isyarat ditahan
                  </li>
                  <li className="flex gap-2.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    Profil isyaratmu sendiri, tersimpan lokal
                  </li>
                  <li className="flex gap-2.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    Gratis untuk hosting statis di Vercel
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- CARA KERJA ---------------- */}
      <section id="cara-kerja" className="scroll-mt-20 border-y border-white/[0.06] bg-white/[0.012] py-16 sm:py-24">
        <div className="container-x">
          <div className="max-w-2xl">
            <p className="label-mono">Cara kerja</p>
            <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.6rem)] font-medium leading-[1.05] tracking-[-0.03em]">
              Tiga langkah. Tidak ada video yang dikirim.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Yang bekerja bukan model raksasa yang menebak arti. Ini pipeline geometri: landmark tangan
              dinormalisasi, lalu dicocokkan dengan contoh yang kamu rekam.
            </p>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {STEPS.map((step) => (
              <article key={step.n} className="panel panel-hover p-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs tracking-[0.2em] text-accent/80">{step.n}</span>
                  <step.icon className="h-4 w-4 text-muted" />
                </div>
                <h3 className="mt-5 text-lg font-medium tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                <p className="mt-5 border-t border-white/[0.07] pt-3 font-mono text-[0.64rem] uppercase tracking-[0.1em] text-muted/70">
                  {step.detail}
                </p>
              </article>
            ))}
          </div>

          <div className="panel mt-3 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet/10 text-violet">
                <Cpu className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">Kenapa tidak pakai GPT-4o / Gemini vision?</p>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
                  Karena model umum tidak dilatih menerjemahkan bahasa isyarat — mereka akan menghalusinasi.
                  LLM hanya dipakai (opsional) untuk merapikan hasil ejaan jadi kalimat yang enak dibaca.
                </p>
              </div>
            </div>
            <span className="chip shrink-0">opsional · butuh API key</span>
          </div>
        </div>
      </section>

      {/* ---------------- MODE ---------------- */}
      <section className="py-16 sm:py-24">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="label-mono">Dua mode</p>
              <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.6rem)] font-medium leading-[1.05] tracking-[-0.03em]">
                Mulai dari huruf. Naik ke kata.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              Mode huruf langsung jalan tanpa data latih. Mode kata butuh beberapa contoh rekamanmu — dan
              itu memang batas jujur dari teknologi ini.
            </p>
          </div>

          <div className="mt-10 grid gap-3 lg:grid-cols-2">
            <article className="panel overflow-hidden">
              <div className="border-b border-white/[0.07] p-6">
                <div className="flex items-center justify-between">
                  <span className="chip chip-accent">mode huruf</span>
                  <span className="font-mono text-[0.66rem] text-muted/70">langsung jalan</span>
                </div>
                <h3 className="mt-5 text-xl font-medium tracking-tight">Ejaan jari (fingerspelling)</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Tahan bentuk tangan ±0,2 detik, huruf muncul. Ada 9 huruf yang dikenali oleh mesin cepat
                  bawaan; 26 huruf penuh setelah kamu rekam profil.
                </p>
              </div>
              <div className="grid grid-cols-6 gap-1.5 p-4 sm:grid-cols-9">
                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
                  <span
                    key={letter}
                    className="grid aspect-square place-items-center rounded-lg border border-white/[0.07] bg-white/[0.025] font-mono text-xs text-muted"
                  >
                    {letter}
                  </span>
                ))}
              </div>
            </article>

            <article className="panel overflow-hidden">
              <div className="border-b border-white/[0.07] p-6">
                <div className="flex items-center justify-between">
                  <span className="chip chip-violet">mode kata</span>
                  <span className="font-mono text-[0.66rem] text-muted/70">butuh rekaman</span>
                </div>
                <h3 className="mt-5 text-xl font-medium tracking-tight">Isyarat dinamis</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Gerakan dibandingkan dengan contoh memakai Dynamic Time Warping — tahan variasi tempo.
                  Rekam 10–20 kali per kata, lalu uji di studio.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 p-4">
                {["HALO", "TERIMA KASIH", "MAAF", "TOLONG", "YA", "TIDAK", "NAMA", "APA"].map((word) => (
                  <span
                    key={word}
                    className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5 font-mono text-[0.66rem] tracking-wide text-muted"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ---------------- FITUR ---------------- */}
      <section className="border-y border-white/[0.06] bg-white/[0.012] py-16 sm:py-24">
        <div className="container-x">
          <div className="max-w-2xl">
            <p className="label-mono">Yang bisa kamu lakukan</p>
            <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.6rem)] font-medium leading-[1.05] tracking-[-0.03em]">
              Satu app, dari kamera sampai subtitle.
            </h2>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="panel panel-hover flex gap-4 p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-accent">
                  <feature.icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-[0.98rem] font-medium tracking-tight">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.body}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="panel mt-3 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">Privasi bukan fitur tambahan.</p>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
                  Frame kamera tidak pernah meninggalkan browser. Supabase (opsional) hanya menyimpan profil
                  isyarat dan transkrip yang kamu tekan simpan — bukan video.
                </p>
              </div>
            </div>
            <Link href="/panduan" className="btn btn-ghost btn-sm shrink-0">
              Detail privasi
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- BATASAN ---------------- */}
      <section className="py-16 sm:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="label-mono">Kejujuran teknis</p>
            <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.6rem)] font-medium leading-[1.05] tracking-[-0.03em]">
              Ini bukan juru bahasa isyarat ajaib.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
              Dan itu disengaja. Lebih baik membangun alat kecil yang benar-benar bekerja, daripada demo yang
              terlihat pintar tapi salah arti. Berikut batasannya — tertulis, bukan disembunyikan.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="chip"><Hand className="h-3 w-3" /> SIBI</span>
              <span className="chip"><Activity className="h-3 w-3" /> ±30 fps</span>
              <span className="chip"><ScanLine className="h-3 w-3" /> 1–2 tangan</span>
            </div>
          </div>

          <ul className="space-y-2">
            {LIMITS.map((limit, i) => (
              <li key={i} className="panel flex gap-4 p-4">
                <span className="font-mono text-[0.66rem] text-accent/70">0{i + 1}</span>
                <p className="text-sm leading-relaxed text-muted">{limit}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="pb-4">
        <div className="container-x">
          <div className="relative overflow-hidden rounded-[2rem] border border-accent/20 bg-accent/[0.04] px-6 py-12 sm:px-12 sm:py-16">
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-60 blur-3xl"
              style={{ background: "rgba(125,243,197,0.18)" }}
              aria-hidden
            />
            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-xl">
                <p className="chip chip-accent">
                  <Sparkles className="h-3 w-3" />
                  2 menit untuk mulai
                </p>
                <h2 className="mt-5 text-[clamp(1.9rem,4vw,3rem)] font-medium leading-[1.02] tracking-[-0.035em]">
                  Coba dengan tanganmu sendiri.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Buka studio, izinkan kamera, dan tahan huruf B. Kalau belum terbaca, rekam profil isyaratmu
                  di halaman latih — akurasi mengikuti bentuk tanganmu, bukan bentuk tangan orang lain.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Link href="/studio" className="btn btn-primary">
                  <Camera className="h-4 w-4" />
                  Buka studio
                </Link>
                <Link href="/latih" className="btn btn-ghost">
                  <GraduationCap className="h-4 w-4" />
                  Latih dulu
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
