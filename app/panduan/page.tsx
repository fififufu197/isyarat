import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowUpRight,
  BookOpen,
  Camera,
  Check,
  Cloud,
  Cpu,
  Database,
  GraduationCap,
  Hand,
  Info,
  Lock,
  Rocket,
  ScanLine,
  ShieldCheck,
  Upload,
  Users,
  X,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Panduan & batasan",
  description:
    "Cara memakai Isyarat, bahasa isyarat yang didukung, batasan teknis, privasi, dan cara deploy sendiri.",
};

const TOC = [
  { id: "mulai", label: "Mulai cepat" },
  { id: "dukungan", label: "Yang didukung" },
  { id: "akurasi", label: "Akurasi" },
  { id: "privasi", label: "Privasi" },
  { id: "deploy", label: "Deploy sendiri" },
  { id: "etika", label: "Etika" },
  { id: "faq", label: "FAQ" },
];

const FAQ = [
  {
    q: "Apakah ini bisa menerjemahkan kalimat isyarat bebas?",
    a: "Belum. Aplikasi ini menerjemahkan ejaan jari (fingerspelling) dan kosakata/gerakan yang kamu rekam sendiri. Kalimat bebas BISINDO/SIBI butuh model sekuensial yang dilatih dengan dataset besar, ekspresi wajah, dan konteks tata ruang.",
  },
  {
    q: "Kenapa harus merekam profil sendiri?",
    a: "Bentuk tangan, ukuran tangan, kamera, dan sudut pengambilan berbeda-beda. Mencocokkan dengan contohmu sendiri jauh lebih akurat daripada memakai model generik yang dilatih dari orang lain.",
  },
  {
    q: "Apakah video saya diunggah?",
    a: "Tidak. Frame kamera diproses di browser memakai WebAssembly/WebGL. Untuk upload file, video dibaca lewat elemen <video> lokal dan tidak pernah dikirim ke server. Supabase (opsional) hanya menyimpan profil isyarat dan transkrip yang kamu tekan simpan.",
  },
  {
    q: "Apakah butuh GPU atau biaya API?",
    a: "Tidak untuk fitur inti. MediaPipe berjalan di CPU/GPU perangkat. LLM untuk merapikan kalimat bersifat opsional dan hanya aktif jika kamu mengisi OPENAI_API_KEY.",
  },
  {
    q: "Bisa dipakai di HP?",
    a: "Bisa, tapi kamera depan di HP sering memberi gambar vertikal dengan field of view sempit. Untuk pengalaman terbaik, pakai laptop dengan kamera 720p dan cahaya ruangan yang cukup.",
  },
  {
    q: "Apakah SIBI dan BISINDO sama?",
    a: "Tidak. SIBI adalah sistem isyarat baku yang banyak dipakai di SLB, sementara BISINDO adalah bahasa isyarat natural komunitas Tuli dengan variasi daerah. Alphabets keduanya mirip, tetapi kosakata dan tata bahasanya berbeda. Versi ini dirancang untuk ejaan jari ala SIBI.",
  },
];

export default function PanduanPage() {
  return (
    <div className="container-x pb-16 pt-10">
      <div className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">
            <BookOpen className="h-3 w-3" />
            panduan
          </span>
          <span className="chip chip-warn">baca batasannya</span>
        </div>
        <h1 className="mt-5 text-[clamp(2.1rem,4.6vw,3.4rem)] font-medium leading-[1.02] tracking-[-0.04em]">
          Panduan, batasan, dan cara pakai yang jujur.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Isyarat adalah alat bantu, bukan penerjemah ajaib. Halaman ini menjelaskan apa yang benar-benar
          bekerja, apa yang belum, dan bagaimana data kamu diperlakukan.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1">
            <p className="label-mono mb-3">Di halaman ini</p>
            {TOC.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-white/[0.04] hover:text-ink"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="text-[0.7rem] leading-relaxed text-muted">
                Butuh langsung mencoba? Kamera + 9 huruf sudah jalan tanpa data latih.
              </p>
              <Link href="/studio" className="btn btn-primary btn-sm mt-2 w-full">
                <Camera className="h-3.5 w-3.5" />
                Buka studio
              </Link>
            </div>
          </nav>
        </aside>

        <div className="min-w-0 space-y-4">
          {/* mulai */}
          <section id="mulai" className="panel scroll-mt-24 p-6">
            <h2 className="text-xl font-medium tracking-tight">Mulai cepat (2 menit)</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: Camera,
                  title: "1. Studio",
                  body: "Nyalakan kamera, pilih mode Huruf, tahan bentuk B sampai cincin penuh.",
                },
                {
                  icon: GraduationCap,
                  title: "2. Latih",
                  body: "Rekam 10–20 contoh per huruf. Semakin konsisten, semakin akurat.",
                },
                {
                  icon: Upload,
                  title: "3. Upload",
                  body: "Punya video? Unggah dan telusuri timeline transkripnya.",
                },
              ].map((step) => (
                <div key={step.title} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <step.icon className="h-4 w-4 text-accent" />
                  <p className="mt-3 text-sm font-medium">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{step.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-accent/20 bg-accent/[0.04] p-4">
              <p className="text-xs leading-relaxed text-muted">
                <span className="text-ink">Penting:</span> huruf terkunci setelah ditahan. Untuk menulis huruf
                yang sama dua kali, ganti ke isyarat lain sebentar, lalu kembali. Ini mencegah satu huruf
                terulang terus saat tangan berhenti di posisi yang sama.
              </p>
            </div>
          </section>

          {/* dukungan */}
          <section id="dukungan" className="panel scroll-mt-24 p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-medium tracking-tight">Yang didukung — dan tidak</h2>
              <span className="chip chip-accent">SIBI</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-accent/20 bg-accent/[0.03] p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Check className="h-4 w-4 text-accent" /> Bekerja
                </p>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
                  <li>• Ejaan jari 1 tangan (26 huruf SIBI)</li>
                  <li>• 9 huruf + spasi lewat mesin cepat tanpa data latih</li>
                  <li>• Kosakata/gerakan statis & dinamis yang kamu rekam</li>
                  <li>• Deteksi 1–2 tangan, 21 landmark per tangan</li>
                  <li>• Analisis file video, transkrip, unduh, bacakan</li>
                  <li>• Mode siaran layar penuh</li>
                </ul>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <X className="h-4 w-4 text-red-300" /> Belum
                </p>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
                  <li>• Kalimat isyarat bebas & tata bahasa BISINDO</li>
                  <li>• Ekspresi wajah, gerak mulut, arah pandang</li>
                  <li>• Isyarat dua tangan yang saling bergantung</li>
                  <li>• Isyarat yang butuh ruang/lokasi tubuh</li>
                  <li>• Penerjemahan dua arah (teks → isyarat)</li>
                  <li>• Pengganti juru bahasa isyarat profesional</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <Hand className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
              <p className="text-xs leading-relaxed text-muted">
                {`Bentuk tangan yang dipakai sebagai acuan adalah bentuk umum alfabet manual. Variasi antar-penutur itu normal — itulah alasan aplikasi ini mengutamakan profil pribadi dibanding satu model global.`}
              </p>
            </div>
          </section>

          {/* akurasi */}
          <section id="akurasi" className="panel scroll-mt-24 p-6">
            <h2 className="text-xl font-medium tracking-tight">Apa yang memengaruhi akurasi</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                ["Cahaya", "Depan lebih baik. Backlight membuat tangan jadi silhouette."],
                ["Jarak", "±50 cm; tangan utuh masuk frame."],
                ["Latar", "Polos lebih stabil daripada ramai/bergerak."],
                ["Konsistensi", "Rekam dengan sudut & jarak serupa saat dipakai."],
                ["Jumlah contoh", "10–20 per label; lebih banyak lebih tahan variasi."],
                ["Hardware", "Laptop 720p+ lebih stabil daripada kamera HP vertikal."],
              ].map(([title, body]) => (
                <div key={title} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                  <p className="text-xs font-medium">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-warn/20 bg-warn/[0.04] p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
              <p className="text-xs leading-relaxed text-muted">
                Ada dua slider sensitivitas di studio. Naikkan toleransi kalau isyaratmu sering tidak terbaca;
                turunkan kalau sering salah tebak. Solusi terbaik tetap menambah contoh yang benar, bukan
                menggeser toleransi terus-menerus.
              </p>
            </div>
          </section>

          {/* privasi */}
          <section id="privasi" className="panel scroll-mt-24 p-6">
            <h2 className="flex items-center gap-2 text-xl font-medium tracking-tight">
              <Lock className="h-5 w-5 text-accent" /> Privasi & data
            </h2>
            <div className="mt-4 space-y-2">
              {[
                ["Video & kamera", "Diproses di browser. Tidak ada frame yang dikirim ke server, tidak ada rekaman yang disimpan otomatis."],
                ["Profil isyarat", "Tersimpan di localStorage perangkat. Kamu bisa ekspor/impor JSON dan menghapusnya kapan saja."],
                ["Supabase (opsional)", "Hanya untuk login, backup profil, dan transkrip yang kamu tekan simpan. Row Level Security membatasi akses per akun."],
                ["Tanpa analytics", "Tidak ada tracker pihak ketiga, tidak ada cookie iklan."],
                ["Model", "File MediaPipe (WASM + model tangan) disajikan sebagai aset statis dari domainmu sendiri."],
              ].map(([title, body]) => (
                <div key={title} className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent/80" />
                  <div>
                    <p className="text-xs font-medium">{title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* deploy */}
          <section id="deploy" className="panel scroll-mt-24 p-6">
            <h2 className="flex items-center gap-2 text-xl font-medium tracking-tight">
              <Rocket className="h-5 w-5 text-violet" /> Deploy sendiri (Vercel + Supabase)
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Aplikasi ini memang dirancang untuk hosting gratis. Tidak ada server inference, tidak ada GPU.
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/[0.07] bg-black/30 p-4">
                <p className="label-mono">1 · lokal</p>
                <pre className="mt-2 overflow-x-auto font-mono text-[0.72rem] leading-relaxed text-muted">
                  <code>{`npm install       # sekaligus menyiapkan WASM + model\nnpm run dev       # buka http://localhost:3000`}</code>
                </pre>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-black/30 p-4">
                <p className="label-mono">2 · supabase (opsional)</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Buat project gratis, lalu jalankan SQL di{" "}
                  <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[0.66rem]">
                    supabase/schema.sql
                  </code>{" "}
                  lewat SQL Editor. Salin URL + anon key ke environment.
                </p>
                <pre className="mt-2 overflow-x-auto font-mono text-[0.72rem] leading-relaxed text-muted">
                  <code>{`NEXT_PUBLIC_SUPABASE_URL=...\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...`}</code>
                </pre>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-black/30 p-4">
                <p className="label-mono">3 · vercel</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Import repo, biarkan build default (<code className="font-mono text-[0.66rem]">next build</code>).
                  Tambahkan environment yang sama. Deploy. Selesai.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                { icon: Cpu, title: "Tanpa GPU", body: "Inference di perangkat pengguna." },
                { icon: Database, title: "Tanpa DB wajib", body: "Mode lokal tetap penuh." },
                { icon: Cloud, title: "Opsional cloud", body: "Backup profil & transkrip." },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                  <item.icon className="h-4 w-4 text-accent/80" />
                  <p className="mt-2 text-xs font-medium">{item.title}</p>
                  <p className="mt-0.5 text-[0.7rem] leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* etika */}
          <section id="etika" className="panel scroll-mt-24 p-6">
            <h2 className="flex items-center gap-2 text-xl font-medium tracking-tight">
              <Users className="h-5 w-5 text-warn" /> Etika pemakaian
            </h2>
            <ul className="mt-4 space-y-2 text-xs leading-relaxed text-muted">
              <li>• Minta izin sebelum merekam orang lain, termasuk untuk dataset profil.</li>
              <li>• Jangan gunakan hasil transkrip sebagai satu-satunya sumber dalam situasi medis, hukum, atau darurat.</li>
              <li>• Untuk acara publik, tetap sediakan juru bahasa isyarat profesional — teknologi ini pendamping, bukan pengganti.</li>
              <li>• Ingat bahwa bahasa isyarat punya budaya dan tata bahasa sendiri; ejaan jari bukan bahasa isyarat penuh.</li>
              <li>• Jangan mengklaim akurasi 100%. Selalu beri ruang koreksi bagi pengguna Tuli.</li>
            </ul>
          </section>

          {/* faq */}
          <section id="faq" className="panel scroll-mt-24 p-6">
            <h2 className="text-xl font-medium tracking-tight">FAQ</h2>
            <div className="mt-4 divide-y divide-white/[0.06]">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm text-ink">
                    {item.q}
                    <span className="font-mono text-muted transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 pr-6 text-xs leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="panel flex flex-col items-start justify-between gap-4 border-accent/20 bg-accent/[0.03] p-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium">Sudah paham batasannya? Saatnya mencoba.</p>
              <p className="mt-1 text-xs text-muted">
                Mulai dari mode cepat, lalu latih profilmu untuk akurasi yang lebih baik.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/studio" className="btn btn-primary btn-sm">
                <Camera className="h-3.5 w-3.5" />
                Studio
              </Link>
              <Link href="/latih" className="btn btn-ghost btn-sm">
                <GraduationCap className="h-3.5 w-3.5" />
                Latih
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between text-[0.68rem] text-muted/60">
            <span className="inline-flex items-center gap-1.5">
              <ScanLine className="h-3 w-3" />
              Terakhir diperbarui: versi 0.1
            </span>
            <Link href="/upload" className="inline-flex items-center gap-1 hover:text-ink">
              Coba upload video
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
