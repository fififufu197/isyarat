"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { EngineEvent } from "@/lib/types";

export function BroadcastOverlay({
  stream,
  text,
  latest,
  onClose,
}: {
  stream: MediaStream | null;
  text: string;
  latest: EngineEvent | null;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => undefined);
    }
  }, [stream]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const visibleText = text.length > 220 ? text.slice(-220) : text;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#050507]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="chip chip-accent">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-[#ff6b6b]" />
            mode siaran
          </span>
          <span className="hidden font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted sm:inline">
            ESC untuk keluar
          </span>
        </div>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Keluar mode siaran">
          <X className="h-4 w-4" />
          Keluar
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-5 sm:px-8 sm:py-8 lg:flex-row">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black">
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className="h-full w-full -scale-x-100 object-contain"
          />
          <div className="absolute left-3 top-3">
            <span className="chip">
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-[#ff6b6b]" />
              kamera
            </span>
          </div>
          {latest && (
            <div
              key={latest.at}
              className="animate-rise absolute bottom-3 left-3 rounded-xl border border-accent/30 bg-black/60 px-4 py-2 backdrop-blur"
            >
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-accent/80">terbaca</p>
              <p className="font-mono text-3xl leading-none text-accent sm:text-4xl">{latest.label}</p>
            </div>
          )}
        </div>

        <div className="flex min-h-[32vh] w-full flex-col justify-end rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-8 lg:min-h-0 lg:w-[52%]">
          <p className="label-mono mb-3">transkrip langsung</p>
          <div className="max-h-full overflow-hidden">
            <p className="text-[clamp(2rem,5.2vw,5rem)] font-medium leading-[1.06] tracking-[-0.03em] text-ink">
              {visibleText || (
                <span className="text-muted/40">Menunggu isyarat…</span>
              )}
              <span className="ml-1 inline-block h-[0.9em] w-[3px] translate-y-[0.08em] animate-blink bg-accent align-middle" />
            </p>
          </div>
          <p className="mt-6 hidden text-xs leading-relaxed text-muted/70 sm:block">
            Teks ini diperbarui saat isyarat dikenali. Gunakan huruf besar dan jeda yang jelas agar mudah
            dibaca audiens.
          </p>
        </div>
      </div>
    </div>
  );
}
