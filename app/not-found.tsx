import Link from "next/link";
import { ArrowLeft, Camera, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-muted">
        <SearchX className="h-6 w-6" />
      </span>
      <p className="mt-6 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-accent/80">404</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">Halaman ini tidak ada.</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        Mungkin tautannya salah, atau halaman sudah dipindahkan. Kembali ke studio dan lanjutkan dengan
        tanganmu.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn btn-ghost btn-sm">
          <ArrowLeft className="h-3.5 w-3.5" />
          Beranda
        </Link>
        <Link href="/studio" className="btn btn-primary btn-sm">
          <Camera className="h-3.5 w-3.5" />
          Buka studio
        </Link>
      </div>
    </div>
  );
}
