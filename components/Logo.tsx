import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="Isyarat, beranda">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] transition-colors group-hover:border-accent/40">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path
            d="M7.5 19.5c-1.4-1.7-2-3.6-2-5.6V9.2a1.1 1.1 0 0 1 2.2 0v3.1"
            fill="none"
            stroke="#7df3c5"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M9.7 12.2V6.6a1.1 1.1 0 0 1 2.2 0v4.9M11.9 11.5V5.7a1.1 1.1 0 0 1 2.2 0v5.9M14.1 11.9V7.4a1.1 1.1 0 0 1 2.2 0v6"
            fill="none"
            stroke="#7df3c5"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M16.3 13.4v-2a1.1 1.1 0 0 1 2.2 0v4.2c0 2-1.1 3.9-2.9 4.9"
            fill="none"
            stroke="#9a8bff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="8.6" cy="9.2" r="0.9" fill="#7df3c5" />
        </svg>
      </span>
      {!compact && (
        <span className="flex items-baseline gap-1.5">
          <span className="text-[1.05rem] font-semibold tracking-tight text-ink">isyarat</span>
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[0.55rem] uppercase tracking-[0.14em] text-muted">
            beta
          </span>
        </span>
      )}
    </Link>
  );
}
