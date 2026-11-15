"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Check,
  Download,
  FlipHorizontal2,
  GraduationCap,
  HelpCircle,
  Loader2,
  Play,
  RotateCcw,
  Save,
  Square,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { CloudPanel } from "./CloudPanel";
import { HistoryPanel } from "./HistoryPanel";
import { useCamera } from "@/hooks/useCamera";
import { useLandmarkStream } from "@/hooks/useLandmarkStream";
import { useProfile } from "@/hooks/useProfile";
import { featureVariants } from "@/lib/features";
import { euclidean, meanVector, resampleSequence } from "@/lib/knn";
import { LETTERS, QUICK_LABELS, WORDS, letterHint } from "@/lib/lexicon";
import { createEmptyProfile, downloadJson, sanitizeProfile } from "@/lib/storage";
import type { Pt } from "@/lib/types";
import { cn, clamp } from "@/lib/utils";

type CapturePhase = "idle" | "countdown" | "recording" | "review";

type Review = {
  kind: "letter" | "word";
  detected: number;
  expected: number;
  motion: number;
  quality: number;
  v0?: number[];
  v1?: number[];
  wordFrames?: Pt[][];
};

const LETTER_DURATION = 1700;
const WORD_DURATION = 2400;

function boundingArea(points: Pt[]): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
}

function averageMotion(vectors: number[][]): number {
  if (vectors.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < vectors.length; i++) sum += euclidean(vectors[i], vectors[i - 1]);
  return sum / (vectors.length - 1);
}

export function TrainClient() {
  const { profile, mutate, ready } = useProfile();
  const camera = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarks = useLandmarkStream(camera.videoRef, canvasRef, camera.status === "live");

  const [kind, setKind] = useState<"letter" | "word">("letter");
  const [label, setLabel] = useState("B");
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [countdown, setCountdown] = useState(3);
  const [recordProgress, setRecordProgress] = useState(0);
  const [review, setReview] = useState<Review | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState("");

  const captureAbort = useRef(false);
  const rafRef = useRef(0);
  const noticeTimer = useRef<number | null>(null);
  const kindRef = useRef(kind);
  const labelRef = useRef(label);
  kindRef.current = kind;
  labelRef.current = label;

  const letters = profile?.letters ?? [];
  const words = profile?.words ?? [];
  const letterClassCount = new Set(letters.map((sample) => sample.label)).size;

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  useEffect(() => {
    return () => {
      captureAbort.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  const notify = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3600);
  }, []);

  const selectedCount =
    kind === "letter"
      ? letters.filter((sample) => sample.label === label).length
      : words.filter((sample) => sample.label === label).length;

  const selectedHint =
    kind === "letter"
      ? letterHint(label)
      : WORDS.find((word) => word.label === label)?.hint ?? "Rekam gerakan utuh dari awal sampai akhir.";

  const selectClass = (nextKind: "letter" | "word", nextLabel: string) => {
    if (phase === "countdown" || phase === "recording") return;
    setKind(nextKind);
    setLabel(nextLabel);
    setReview(null);
    setPhase("idle");
    setRecordProgress(0);
  };

  const cancelCapture = () => {
    captureAbort.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPhase("idle");
    setRecordProgress(0);
    setReview(null);
  };

  const startCapture = async () => {
    if (camera.status !== "live") {
      notify("Nyalakan kamera terlebih dahulu.");
      return;
    }
    if (landmarks.status !== "ready") {
      notify("Model tangan masih dimuat. Tunggu sebentar.");
      return;
    }

    const captureKind = kindRef.current;
    const captureLabel = labelRef.current;
    const duration = captureKind === "word" ? WORD_DURATION : LETTER_DURATION;

    captureAbort.current = false;
    setReview(null);
    setRecordProgress(0);
    setPhase("countdown");

    for (let n = 3; n >= 1; n--) {
      if (captureAbort.current) return;
      setCountdown(n);
      await new Promise((resolve) => window.setTimeout(resolve, 650));
    }
    if (captureAbort.current) return;

    setPhase("recording");
    const started = performance.now();
    const vectors: Array<[number[], number[]]> = [];
    const frames: Pt[][] = [];
    const primaryVectors: number[][] = [];
    let lastSample = 0;
    let lastProgress = 0;

    await new Promise<void>((resolve) => {
      const tick = () => {
        if (captureAbort.current) {
          resolve();
          return;
        }
        const now = performance.now();
        const elapsed = now - started;
        if (elapsed >= duration) {
          resolve();
          return;
        }

        if (now - lastSample >= 60) {
          lastSample = now;
          const hands = landmarks.handsRef.current;
          const primary = hands.slice().sort((a, b) => boundingArea(b) - boundingArea(a))[0];
          if (primary) {
            const variants = featureVariantsSafe(primary);
            if (variants) {
              if (captureKind === "letter") {
                vectors.push(variants);
              } else {
                frames.push(primary);
                primaryVectors.push(variants[0]);
              }
            }
          }
        }

        if (now - lastProgress > 100) {
          lastProgress = now;
          setRecordProgress(Math.min(1, elapsed / duration));
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    });

    if (captureAbort.current) return;

    const expected = (duration / 1000) * (1000 / 60);
    const detected = captureKind === "letter" ? vectors.length : frames.length;
    const handRatio = clamp(detected / expected, 0, 1);
    const motion = captureKind === "word" ? averageMotion(primaryVectors) : 0;
    const quality =
      captureKind === "word"
        ? Math.round(handRatio * 55 + clamp(motion / 0.045, 0, 1) * 45)
        : Math.round(handRatio * 100);

    if (detected < 8) {
      setPhase("idle");
      setRecordProgress(0);
      notify("Terlalu sedikit frame dengan tangan. Pastikan tangan terlihat dan cahaya cukup.");
      return;
    }

    if (captureKind === "letter") {
      const v0 = meanVector(vectors.map((pair) => pair[0]));
      const v1 = meanVector(vectors.map((pair) => pair[1]));
      setReview({
        kind: "letter",
        detected,
        expected: Math.round(expected),
        motion,
        quality,
        v0,
        v1,
      });
    } else {
      setReview({
        kind: "word",
        detected,
        expected: Math.round(expected),
        motion,
        quality,
        wordFrames: frames,
      });
    }

    setPhase("review");
    setRecordProgress(1);
    notify(
      `Contoh ${captureKind === "letter" ? "huruf" : "kata"} "${captureLabel}" siap diperiksa.`,
    );
  };

  const saveReview = () => {
    if (!review || !profile) return;
    const now = Date.now();
    const targetLabel = labelRef.current;

    if (review.kind === "letter" && review.v0 && review.v1) {
      mutate((current) => ({
        ...current,
        letters: [
          ...current.letters,
          { id: crypto.randomUUID(), label: targetLabel, v: review.v0 as number[], createdAt: now },
          { id: crypto.randomUUID(), label: targetLabel, v: review.v1 as number[], createdAt: now + 1 },
        ],
      }));
    } else if (review.kind === "word" && review.wordFrames) {
      const frames = resampleSequence(review.wordFrames.map((frame) => featureVariantsSafe(frame)?.[0] ?? []), 18)
        .filter((frame) => frame.length === 42);
      if (frames.length < 4) {
        notify("Gerakan terlalu pendek / tidak valid. Rekam ulang.");
        return;
      }
      mutate((current) => ({
        ...current,
        words: [
          ...current.words,
          { id: crypto.randomUUID(), label: targetLabel, frames, createdAt: now },
        ],
      }));
    }

    setReview(null);
    setPhase("idle");
    setRecordProgress(0);
    notify(`Contoh "${targetLabel}" tersimpan. Ulangi 10–20 kali untuk akurasi lebih baik.`);
  };

  const deleteClass = () => {
    if (!profile) return;
    if (!selectedCount) return;
    if (!window.confirm(`Hapus semua contoh "${label}"?`)) return;
    mutate((current) =>
      kind === "letter"
        ? { ...current, letters: current.letters.filter((sample) => sample.label !== label) }
        : { ...current, words: current.words.filter((sample) => sample.label !== label) },
    );
    setReview(null);
    setPhase("idle");
    notify(`Semua contoh "${label}" dihapus.`);
  };

  const importProfile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = sanitizeProfile(JSON.parse(text));
      if (!parsed) throw new Error("Struktur file tidak dikenali.");
      if (!window.confirm("Ganti profil lokal dengan isi file ini?")) return;
      mutate(() => parsed);
      notify("Profil diimpor.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal mengimpor profil.");
    }
  };

  const busy = phase === "countdown" || phase === "recording";

  return (
    <div className="container-x pb-16 pt-8 sm:pt-10">
      <div className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-7 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-violet">
              <GraduationCap className="h-3 w-3" />
              latih profil
            </span>
            <span className="chip">tersimpan lokal</span>
            <span className="chip">tanpa training GPU</span>
          </div>
          <h1 className="mt-4 text-[clamp(1.9rem,4vw,2.9rem)] font-medium leading-[1.02] tracking-[-0.035em]">
            Bikin isyaratmu dikenali.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Rekam 10–20 contoh per huruf/kata. Aplikasi menyimpan template gerak di perangkatmu, lalu
            mencocokkannya saat live. Tidak ada model yang dilatih di cloud.
          </p>
        </div>
        <Link href="/studio" className="btn btn-ghost btn-sm self-start">
          <Camera className="h-4 w-4" />
          Uji di studio
        </Link>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* ---------------- KIRI: recorder ---------------- */}
        <div className="space-y-3">
          <div className="panel overflow-hidden">
            <div className="relative aspect-[4/3] bg-black">
              <video
                ref={camera.videoRef}
                muted
                playsInline
                autoPlay
                className="h-full w-full -scale-x-100 object-cover"
              />
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100"
                aria-hidden
              />

              <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                <span className={cn("chip", camera.status === "live" ? "chip-accent" : "")}>
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      camera.status === "live" ? "animate-blink bg-accent" : "bg-white/30",
                    )}
                  />
                  {camera.status === "live" ? "kamera aktif" : "kamera mati"}
                </span>
                <span className="chip">{landmarks.handCount} tangan</span>
                <span className="chip">21 titik</span>
              </div>

              {camera.status !== "live" && (
                <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_35%,#12141c,#07080b_70%)]">
                  <div className="flex max-w-sm flex-col items-center px-6 text-center">
                    {camera.status === "error" ? (
                      <CameraOff className="h-8 w-8 text-danger" />
                    ) : (
                      <Camera className="h-8 w-8 text-muted" />
                    )}
                    <p className="mt-3 text-sm font-medium">
                      {camera.status === "starting" ? "Membuka kamera…" : "Nyalakan kamera untuk merekam"}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {camera.error ?? "Posisikan tangan ±50 cm dari kamera, cahaya dari depan."}
                    </p>
                    <button
                      type="button"
                      onClick={() => void camera.start()}
                      disabled={camera.status === "starting"}
                      className="btn btn-primary btn-sm mt-4"
                    >
                      {camera.status === "starting" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Camera className="h-3.5 w-3.5" />
                      )}
                      Nyalakan kamera
                    </button>
                  </div>
                </div>
              )}

              {phase === "countdown" && (
                <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-sm">
                  <div className="relative grid place-items-center">
                    <span className="absolute h-24 w-24 animate-ping rounded-full border border-accent/40" />
                    <span className="font-mono text-6xl text-accent">{countdown}</span>
                  </div>
                  <p className="absolute bottom-8 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-accent/80">
                    siapkan bentuk “{label}”
                  </p>
                </div>
              )}

              {phase === "recording" && (
                <div className="absolute inset-x-3 bottom-3">
                  <div className="flex items-center justify-between rounded-lg border border-red-400/30 bg-black/60 px-3 py-2 backdrop-blur">
                    <span className="inline-flex items-center gap-2 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-red-300">
                      <span className="h-2 w-2 animate-blink rounded-full bg-red-400" />
                      merekam · {label}
                    </span>
                    <button
                      type="button"
                      onClick={cancelCapture}
                      className="inline-flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-white/70 hover:text-white"
                    >
                      <X className="h-3 w-3" /> batal
                    </button>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-red-400 transition-[width] duration-100"
                      style={{ width: `${Math.round(recordProgress * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {landmarks.status === "loading" && camera.status === "live" && (
                <div className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    <p className="font-mono text-[0.64rem] uppercase tracking-[0.14em] text-muted">
                      memuat model tangan
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-white/[0.07] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="label-mono">isyarat terpilih</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="font-mono text-2xl text-ink">{label}</p>
                    <span className="font-mono text-[0.62rem] text-muted/70">
                      {selectedCount} contoh
                    </span>
                    {kind === "letter" && QUICK_LABELS.has(label) && (
                      <span className="chip chip-accent !h-5 !px-1.5 !text-[0.52rem]">mesin cepat</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void camera.switchFacing()}
                    disabled={camera.status === "starting"}
                    className="btn btn-ghost btn-sm"
                  >
                    <FlipHorizontal2 className="h-3.5 w-3.5" />
                    {camera.facing === "user" ? "Depan" : "Belakang"}
                  </button>
                  {camera.status === "live" && (
                    <button type="button" onClick={camera.stop} className="btn btn-ghost btn-sm btn-icon" aria-label="Matikan kamera">
                      <Square className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {phase !== "review" ? (
                <button
                  type="button"
                  onClick={() => void startCapture()}
                  disabled={busy || camera.status !== "live" || landmarks.status !== "ready"}
                  className="btn btn-primary w-full"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                  {busy ? "Merekam…" : `Rekam contoh ${kind === "letter" ? "huruf" : "kata"}`}
                </button>
              ) : (
                <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">Periksa hasil rekaman</p>
                    <span
                      className={cn(
                        "font-mono text-[0.68rem]",
                        review && review.quality >= 70
                          ? "text-accent"
                          : review && review.quality >= 45
                            ? "text-warn"
                            : "text-danger",
                      )}
                    >
                      kualitas {review?.quality ?? 0}/100
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border border-white/[0.06] bg-black/20 px-2 py-1.5">
                      <p className="font-mono text-sm text-ink">
                        {review?.detected ?? 0}/{review?.expected ?? 0}
                      </p>
                      <p className="mt-0.5 text-[0.6rem] text-muted">frame tangan</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-black/20 px-2 py-1.5">
                      <p className="font-mono text-sm text-ink">
                        {(review?.motion ?? 0).toFixed(3)}
                      </p>
                      <p className="mt-0.5 text-[0.6rem] text-muted">energi gerak</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-black/20 px-2 py-1.5">
                      <p className="font-mono text-sm text-ink">{review?.kind === "word" ? "kata" : "huruf"}</p>
                      <p className="mt-0.5 text-[0.6rem] text-muted">mode</p>
                    </div>
                  </div>

                  <ul className="space-y-1 text-[0.7rem] text-muted">
                    <li className="flex items-center gap-2">
                      <Check className={cn("h-3 w-3", (review?.detected ?? 0) >= 8 ? "text-accent" : "text-warn")} />
                      Tangan terlihat di sebagian besar frame
                    </li>
                    <li className="flex items-center gap-2">
                      {review?.kind === "word" ? (
                        <Check className={cn("h-3 w-3", (review?.motion ?? 0) > 0.012 ? "text-accent" : "text-warn")} />
                      ) : (
                        <Check className="h-3 w-3 text-accent" />
                      )}
                      {review?.kind === "word" ? "Gerakan cukup jelas (bukan diam)" : "Bentuk tangan stabil"}
                    </li>
                  </ul>

                  <div className="flex gap-2">
                    <button type="button" onClick={saveReview} className="btn btn-primary btn-sm flex-1">
                      <Save className="h-3.5 w-3.5" />
                      Simpan contoh
                    </button>
                    <button type="button" onClick={cancelCapture} className="btn btn-ghost btn-sm">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Ulangi
                    </button>
                  </div>
                  {review && review.quality < 45 && (
                    <p className="flex items-start gap-1.5 text-[0.66rem] leading-relaxed text-warn">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      Kualitas rendah. Sebaiknya ulangi dengan pencahayaan lebih terang dan tangan lebih stabil.
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-[0.66rem] text-muted/70">
                <span className="inline-flex items-center gap-1.5">
                  <HelpCircle className="h-3 w-3" />
                  Rekam 10–20 contoh, variasi sedikit jarak & sudut.
                </span>
                <button
                  type="button"
                  onClick={deleteClass}
                  disabled={!selectedCount}
                  className="inline-flex items-center gap-1 text-muted hover:text-danger disabled:opacity-40"
                >
                  <Trash2 className="h-3 w-3" />
                  hapus label
                </button>
              </div>
            </div>
          </div>

          {/* pemilih kelas */}
          <div className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
                <button
                  type="button"
                  onClick={() => selectClass("letter", "B")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 min-h-10 text-xs font-medium transition-colors sm:min-h-0",
                    kind === "letter" ? "bg-white/10 text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  Huruf <span className="font-mono text-[0.62rem] text-muted/70">{letterClassCount}/26</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectClass("word", WORDS[0].label)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 min-h-10 text-xs font-medium transition-colors sm:min-h-0",
                    kind === "word" ? "bg-white/10 text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  Kata <span className="font-mono text-[0.62rem] text-muted/70">{words.length}</span>
                </button>
              </div>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted/60">
                {kind === "letter" ? "pilih huruf" : "pilih kata"}
              </p>
            </div>

            <div className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-accent/70">
                panduan bentuk
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{selectedHint}</p>
            </div>

            {kind === "letter" ? (
              <div className="mt-3 grid grid-cols-7 gap-1 sm:grid-cols-9">
                {LETTERS.map((letter) => {
                  const count = letters.filter((sample) => sample.label === letter.label).length;
                  const quick = QUICK_LABELS.has(letter.label);
                  return (
                    <button
                      key={letter.label}
                      type="button"
                      onClick={() => selectClass("letter", letter.label)}
                      className={cn(
                        "relative grid aspect-square place-items-center rounded-lg border font-mono text-xs transition-colors",
                        label === letter.label && kind === "letter"
                          ? "border-accent/50 bg-accent/10 text-accent"
                          : quick
                            ? "border-white/10 bg-white/[0.045] text-ink hover:border-accent/30"
                            : "border-white/[0.06] bg-white/[0.015] text-muted hover:text-ink",
                      )}
                      title={letter.hint}
                    >
                      {letter.label}
                      {quick && <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-accent/70" />}
                      {count > 0 && (
                        <span className="absolute -bottom-1 -right-1 rounded-full border border-base bg-accent px-1 font-mono text-[0.5rem] leading-4 text-[#04140e]">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 grid max-h-72 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
                {WORDS.map((word) => {
                  const count = words.filter((sample) => sample.label === word.label).length;
                  return (
                    <button
                      key={word.label}
                      type="button"
                      onClick={() => selectClass("word", word.label)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                        label === word.label && kind === "word"
                          ? "border-violet/45 bg-violet/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-white/15",
                      )}
                    >
                      <span className="truncate font-mono text-[0.66rem] text-ink">{word.label}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[0.56rem]",
                          count > 0 ? "bg-violet/15 text-violet" : "bg-white/[0.04] text-muted/50",
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="mt-3 flex items-start gap-1.5 text-[0.66rem] leading-relaxed text-muted/60">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
              Titik hijau = didukung mesin cepat bawaan. Huruf/kata lain tetap bisa dilatih dan dipakai di mode
              terlatih.
            </p>
          </div>
        </div>

        {/* ---------------- KANAN: profil + cloud ---------------- */}
        <div className="space-y-3">
          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Profil isyarat</p>
              <span className="chip">{ready ? "aktif" : "memuat"}</span>
            </div>

            <label className="mt-3 block">
              <span className="label-mono">nama profil</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => mutate((current) => ({ ...current, name: name.trim() || "Profil saya" }))}
                className="input mt-1.5 h-9 text-sm"
                maxLength={48}
                placeholder="Profil saya"
              />
            </label>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                [String(letters.length), "sampel huruf"],
                [String(letterClassCount), "huruf terisi"],
                [String(words.length), "sampel kata"],
              ].map(([value, caption]) => (
                <div key={caption} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2">
                  <p className="font-mono text-lg leading-none text-ink">{value}</p>
                  <p className="mt-1 text-[0.58rem] text-muted">{caption}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!profile) return;
                  downloadJson(
                    `isyarat-profil-${new Date().toISOString().slice(0, 10)}.json`,
                    profile,
                  );
                  notify("Profil diekspor sebagai JSON.");
                }}
                disabled={!profile}
                className="btn btn-ghost btn-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Ekspor
              </button>
              <label className="btn btn-ghost btn-sm cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                Impor
                <input
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importProfile(file);
                    event.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm("Hapus SEMUA contoh isyarat di perangkat ini?")) return;
                  mutate(() => createEmptyProfile(profile?.name || "Profil saya"));
                  notify("Semua contoh dihapus.");
                }}
                disabled={!letters.length && !words.length}
                className="btn btn-danger btn-sm col-span-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus semua data
              </button>
            </div>
          </div>

          <CloudPanel
            profile={profile}
            onPulled={(pulled) => {
              mutate(() => pulled);
              notify("Profil dari cloud dimuat.");
            }}
          />

          <div className="panel p-4">
            <p className="text-sm font-medium">Cara merekam yang baik</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
              <li>01 · Cahaya dari depan; hindari jendela di belakang tangan.</li>
              <li>02 · Tangan utuh masuk frame, jarak ±50 cm dari kamera.</li>
              <li>03 · Tahan bentuk 1,5 detik; jangan bergerak saat merekam huruf.</li>
              <li>04 · Untuk kata, gerakkan perlahan dan konsisten.</li>
              <li>05 · Rekam 10–20 contoh per label, variasi sudut sedikit.</li>
            </ul>
            <div className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5">
              <p className="flex items-start gap-2 text-[0.68rem] leading-relaxed text-muted">
                <Play className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                Setelah merekam, uji di studio. Kalau sering salah, tambah contoh untuk label yang bermasalah —
                jangan turunkan toleransi terus-menerus.
              </p>
            </div>
          </div>

          <HistoryPanel />
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className="animate-rise fixed bottom-5 left-1/2 z-[80] flex max-w-[92vw] -translate-x-1/2 items-center gap-2 rounded-full border border-accent/25 bg-[#0b1210]/95 px-4 py-2.5 text-xs text-accent shadow-2xl backdrop-blur"
        >
          <Check className="h-3.5 w-3.5 shrink-0" />
          {notice}
        </div>
      )}
    </div>
  );
}

/** Pembungkus aman: kadang landmark tidak lengkap saat tangan keluar frame. */
function featureVariantsSafe(hand: Pt[]): [number[], number[]] | null {
  if (hand.length < 21) return null;
  try {
    return featureVariants(hand);
  } catch {
    return null;
  }
}
