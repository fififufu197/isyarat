"use client";

import { useEffect, useState } from "react";
import { Activity, ScanLine, ShieldCheck } from "lucide-react";
import { HandGlyph } from "./HandGlyph";

const WORD = ["H", "A", "L", "O"];

export function HeroDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setStep((s) => (s > WORD.length + 1 ? 0 : s + 1));
    }, 1050);
    return () => window.clearInterval(id);
  }, []);

  const visible = Math.min(step, WORD.length);
  const activeIndex = Math.min(step, WORD.length - 1);
  const letter = WORD[activeIndex];
  const transcript = WORD.slice(0, visible).join("");
  const confidence = 0.88 + ((step * 3) % 9) / 100;

  return (
    <div className="relative">
      <div
        className="absolute -inset-6 rounded-[2.5rem] opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(55% 55% at 30% 25%, rgba(125,243,197,0.22), transparent 70%), radial-gradient(45% 45% at 75% 75%, rgba(154,139,255,0.18), transparent 70%)",
        }}
        aria-hidden
      />
      <div className="panel relative overflow-hidden p-3 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] sm:p-4">
        <div className="flex items-center justify-between px-1.5 pb-3">
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="ml-2 font-mono text-[0.62rem] tracking-[0.08em] text-muted/70">
              isyarat / studio
            </span>
          </div>
          <span className="chip chip-accent">
            <ShieldCheck className="h-3 w-3" />
            on-device
          </span>
        </div>

        <div
          className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 0%, #10141a 0%, #0a0c10 55%, #07080b 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)",
              backgroundSize: "34px 34px",
              maskImage: "radial-gradient(80% 80% at 50% 45%, #000 45%, transparent 100%)",
            }}
            aria-hidden
          />

          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span className="chip">
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-[#ff6b6b]" />
              live
            </span>
            <span className="chip">
              <Activity className="h-3 w-3 text-accent" />
              30 fps
            </span>
            <span className="chip hidden sm:inline-flex">21 titik</span>
          </div>

          <div className="absolute inset-0 grid place-items-center">
            <HandGlyph className="h-[74%] w-auto animate-floaty" pulse />
          </div>

          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-24 animate-scan"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(125,243,197,0.10) 60%, rgba(125,243,197,0.02) 100%)",
            }}
            aria-hidden
          />

          <div className="absolute bottom-3 left-3 flex items-end gap-3">
            <div className="rounded-xl border border-accent/25 bg-black/50 px-3 py-2 backdrop-blur-md">
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-accent/80">
                terbaca
              </p>
              <p className="mt-0.5 font-mono text-3xl font-medium leading-none text-accent">{letter}</p>
            </div>
            <div className="mb-1 hidden flex-col gap-1 sm:flex">
              <div className="flex items-center gap-2">
                <span className="h-1 w-20 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${Math.round(confidence * 100)}%` }}
                  />
                </span>
                <span className="font-mono text-[0.62rem] text-muted">
                  {Math.round(confidence * 100)}%
                </span>
              </div>
              <span className="inline-flex items-center gap-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted/70">
                <ScanLine className="h-3 w-3" /> menstabilkan…
              </span>
            </div>
          </div>

          <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: i === step % 5 ? "#7df3c5" : "rgba(255,255,255,0.16)",
                  transition: "background 300ms",
                }}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-white/10 bg-black/35 p-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted/70">transkrip</p>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted/50">
              {visible}/{WORD.length} huruf
            </p>
          </div>
          <p className="mt-1.5 min-h-8 font-mono text-2xl tracking-[0.28em] text-ink">
            {transcript}
            <span className="ml-0.5 inline-block h-5 w-[2px] translate-y-0.5 animate-blink bg-accent align-middle" />
          </p>
        </div>
      </div>

      <p className="mt-3 text-center font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted/50">
        pratinjau antarmuka · animasi, bukan kamera sungguhan
      </p>
    </div>
  );
}
