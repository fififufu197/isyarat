import Link from "next/link";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/[0.06]">
      <div className="container-x grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Kamera jadi jembatan. Isyarat mengubah ejaan jari SIBI dan kosakata isyarat menjadi teks —
            diproses sepenuhnya di perangkatmu.
          </p>
          <p className="mt-4 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted/70">
            v0.1 · on-device · tanpa upload
          </p>
        </div>

        <div>
          <p className="label-mono mb-3">Produk</p>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/studio" className="hover:text-ink">Studio kamera</Link></li>
            <li><Link href="/upload" className="hover:text-ink">Upload video</Link></li>
            <li><Link href="/latih" className="hover:text-ink">Latih profil isyarat</Link></li>
            <li><Link href="/panduan" className="hover:text-ink">Panduan & batasan</Link></li>
          </ul>
        </div>

        <div>
          <p className="label-mono mb-3">Catatan</p>
          <ul className="space-y-2 text-sm text-muted">
            <li>Bukan pengganti juru bahasa isyarat</li>
            <li>SIBI, bukan BISINDO penuh</li>
            <li>Video tidak keluar dari browser</li>
            <li>Butuh kamera & cahaya cukup</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-muted/80 sm:flex-row sm:items-center sm:justify-between">
          <p>Dibuat untuk komunitas Tuli. Akurasi bergantung pada kualitas rekamanmu.</p>
          <p className="font-mono tracking-wide">MediaPipe · Next.js · Supabase (opsional)</p>
        </div>
      </div>
    </footer>
  );
}
