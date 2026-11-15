"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  ClipboardCopy,
  Clock,
  Download,
  FileVideo,
  GraduationCap,
  Loader2,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { drawHandSkeleton } from "@/lib/draw";
import { loadLandmarker, type EngineMode, type EngineSource } from "@/lib/engine";
import { analyzeVideo, type OfflineResult } from "@/lib/offline";
import { addHistory, downloadText } from "@/lib/storage";
import { cloudEnabled, saveTranscriptToCloud } from "@/lib/supabase";
import type { Pt, TranscriptSegment } from "@/lib/types";
import { cn, formatTime, speak } from "@/lib/utils";

const MAX_FILE_MB = 150;
const MAX_ANALYZE_SECONDS = 180;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function UploadClient({ aiEnabled }: { aiEnabled: boolean }) {
  const { profile } = useProfile();

  const [url, setUrl] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [duration, setDuration] = useState(0);
  const [aspect, setAspect] = useState(16 / 9);

  const [mode, setMode] = useState<EngineMode>("letter");
  const [source, setSource] = useState<EngineSource>("quick");
  const [fps, setFps] = useState(8);
  const [initialisedSource, setInitialisedSource] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressTime, setProgressTime] = useState(0);

  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [text, setText] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const [analysedFrames, setAnalysedFrames] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [liveLabel, setLiveLabel] = useState<string | null>(null);

  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const letters = profile?.letters ?? [];
  const words = profile?.words ?? [];
  const readyToAnalyze = Boolean(url) && !analyzing && duration > 0;
  const wordsReady = words.length >= 2;

  const notify = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3600);
  }, []);

  useEffect(() => {
    if (!profile || initialisedSource) return;
    if (profile.letters.length >= 8) setSource("trained");
    setInitialisedSource(true);
  }, [profile, initialisedSource]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!url) return;
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [url]);

  const resetResults = () => {
    setSegments([]);
    setText("");
    setCancelled(false);
    setAnalysedFrames(0);
    setError(null);
    setProgress(0);
    setProgressTime(0);
    setLiveLabel(null);
    clearCanvas();
  };

  const acceptFile = (file: File) => {
    if (!file.type.startsWith("video/")) {
      setError("File ini bukan video. Pilih MP4, WebM, atau MOV.");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Ukuran file melebihi ${MAX_FILE_MB} MB. Potong dulu videonya.`);
      return;
    }
    resetResults();
    setFileInfo({ name: file.name, size: file.size });
    setDuration(0);
    setUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const drawFrame = (hands: Pt[][], label: string | null) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    if (video.videoWidth && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const hand of hands) drawHandSkeleton(ctx, hand);
    if (label) setLiveLabel(label);
  };

  const runAnalysis = async () => {
    const video = videoRef.current;
    if (!video || !url) return;

    if (mode === "word" && !wordsReady) {
      setError("Mode kata butuh minimal 2 contoh rekaman. Buka halaman Latih dulu.");
      return;
    }
    if (mode === "letter" && source === "trained" && letters.length < 8) {
      setError("Mode terlatih butuh minimal 8 sampel huruf (sekitar 4 rekaman). Buka halaman Latih dulu.");
      return;
    }

    resetResults();
    setAnalyzing(true);
    setPhase("Memuat model tangan…");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const landmarker = await loadLandmarker();
      setPhase("Menganalisis frame video…");
      video.pause();
      video.currentTime = 0;

      const result: OfflineResult = await analyzeVideo(
        video,
        landmarker,
        {
          mode,
          source,
          letters,
          words,
          letterThreshold: 0.34,
          wordThreshold: 1.1,
          fps,
          maxSeconds: MAX_ANALYZE_SECONDS,
        },
        {
          signal: controller.signal,
          onProgress: (ratio, time) => {
            setProgress(ratio);
            setProgressTime(time);
          },
          onFrame: drawFrame,
        },
      );

      setSegments(result.segments);
      setText(result.transcript);
      setCancelled(result.cancelled);
      setAnalysedFrames(result.analysedFrames);
      if (!result.segments.length) {
        setError(
          "Tidak ada isyarat yang dikenali. Pastikan tangan terlihat jelas, cahaya cukup, dan durasi tiap isyarat ±0,3 detik.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analisis gagal.");
    } finally {
      setAnalyzing(false);
      setPhase(null);
      setLiveLabel(null);
      abortRef.current = null;
      clearCanvas();
      video.pause();
    }
  };

  const cancelAnalysis = () => {
    abortRef.current?.abort();
  };

  const seekToSegment = (segment: TranscriptSegment) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, segment.start - 0.25);
    void video.play();
  };

  const copyText = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      notify("Transkrip disalin.");
    } catch {
      notify("Browser memblokir clipboard.");
    }
  };

  const handleSave = async () => {
    const value = text.trim();
    if (!value) return;
    addHistory({ source: "video", text: value });
    if (cloudEnabled()) {
      const { error: cloudError } = await saveTranscriptToCloud(value, "video");
      notify(cloudError ? `Tersimpan lokal. Cloud gagal: ${cloudError}` : "Tersimpan lokal & cloud.");
    } else {
      notify("Tersimpan di riwayat lokal.");
    }
  };

  const tidyWithAi = async () => {
    if (!text.trim()) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const response = await fetch("/api/rapikan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await response.json()) as { text?: string; error?: string };
      if (!response.ok || !data.text) throw new Error(data.error || "Gagal merapikan.");
      setText(data.text);
      notify("Ejaan dirapikan.");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Gagal merapikan.");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="container-x pb-16 pt-8 sm:pt-10">
      <div className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-7 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-violet">
              <Upload className="h-3 w-3" />
              analisis video
            </span>
            <span className="chip">offline · di browser</span>
            <span className="chip">maks {MAX_FILE_MB} MB</span>
          </div>
          <h1 className="mt-4 text-[clamp(1.9rem,4vw,2.9rem)] font-medium leading-[1.02] tracking-[-0.035em]">
            Video lama, transkrip baru.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Unggah rekaman isyarat, lalu biarkan aplikasi menelusuri frame-nya. Video tidak dikirim ke server —
            file tetap di perangkatmu dan diproses lewat canvas + MediaPipe.
          </p>
        </div>
        <Link href="/studio" className="btn btn-ghost btn-sm self-start">
          <Camera className="h-4 w-4" />
          Pakai kamera live
        </Link>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* video + kontrol */}
        <div className="space-y-3">
          <div className="panel overflow-hidden">
            <div
              className="relative w-full bg-black"
              style={{ aspectRatio: url ? aspect : 16 / 9 }}
            >
              {url ? (
                <>
                  <video
                    ref={videoRef}
                    src={url}
                    controls={!analyzing}
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 h-full w-full object-contain"
                    onLoadedMetadata={(event) => {
                      const video = event.currentTarget;
                      setDuration(video.duration || 0);
                      if (video.videoWidth && video.videoHeight) {
                        setAspect(video.videoWidth / video.videoHeight);
                      }
                      if (video.videoWidth) {
                        const canvas = canvasRef.current;
                        if (canvas) {
                          canvas.width = video.videoWidth;
                          canvas.height = video.videoHeight;
                        }
                      }
                    }}
                    onTimeUpdate={(event) => {
                      if (!analyzing) setProgressTime(event.currentTarget.currentTime);
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                    aria-hidden
                  />
                  {liveLabel && analyzing && (
                    <div className="pointer-events-none absolute right-3 top-3 rounded-xl border border-accent/30 bg-black/60 px-3 py-2 backdrop-blur">
                      <p className="font-mono text-[0.52rem] uppercase tracking-[0.18em] text-accent/80">terbaca</p>
                      <p className="font-mono text-2xl leading-none text-accent">
                        {liveLabel === "SPASI" ? "␣" : liveLabel}
                      </p>
                    </div>
                  )}
                  {!analyzing && !segments.length && (
                    <button
                      type="button"
                      onClick={() => {
                        setUrl((previous) => {
                          if (previous) URL.revokeObjectURL(previous);
                          return null;
                        });
                        setFileInfo(null);
                        resetResults();
                      }}
                      className="absolute right-3 top-3 btn btn-ghost btn-sm btn-icon bg-black/50"
                      aria-label="Ganti video"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {analyzing && (
                    <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/70 p-2 backdrop-blur">
                      <div className="flex items-center justify-between px-1 pb-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted">
                        <span>{phase ?? "memproses"}</span>
                        <span>
                          {formatTime(progressTime)} / {formatTime(Math.min(duration, MAX_ANALYZE_SECONDS))}
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-accent transition-[width] duration-150"
                          style={{ width: `${Math.round(progress * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <label
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    const file = event.dataTransfer.files?.[0];
                    if (file) acceptFile(file);
                  }}
                  className={cn(
                    "absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed m-3 rounded-2xl text-center transition-colors",
                    dragging ? "border-accent/60 bg-accent/[0.05]" : "border-white/10 hover:border-accent/30 hover:bg-white/[0.02]",
                  )}
                >
                  <input
                    type="file"
                    accept="video/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) acceptFile(file);
                      event.target.value = "";
                    }}
                  />
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-accent">
                    <FileVideo className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium">Tarik video ke sini, atau klik untuk memilih</span>
                  <span className="max-w-xs text-xs leading-relaxed text-muted">
                    MP4, WebM, atau MOV · maks {MAX_FILE_MB} MB · diproses lokal, tidak diunggah
                  </span>
                  <span className="chip mt-1">disarankan durasi &lt; 3 menit</span>
                </label>
              )}
            </div>

            <div className="space-y-3 border-t border-white/[0.07] p-3.5">
              {fileInfo && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
                  <p className="truncate font-mono text-[0.68rem] text-muted">{fileInfo.name}</p>
                  <p className="shrink-0 font-mono text-[0.62rem] text-muted/60">
                    {formatBytes(fileInfo.size)} · {formatTime(duration)}
                  </p>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setMode("letter")}
                      className={cn(
                        "rounded-lg px-2 py-1.5 min-h-10 text-xs font-medium transition-colors sm:min-h-0",
                        mode === "letter" ? "bg-accent text-[#04140e]" : "text-muted hover:text-ink",
                      )}
                    >
                      Huruf
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("word")}
                      disabled={!wordsReady}
                      title={!wordsReady ? "Butuh minimal 2 contoh kata" : undefined}
                      className={cn(
                        "rounded-lg px-2 py-1.5 min-h-10 text-xs font-medium transition-colors sm:min-h-0 disabled:opacity-40",
                        mode === "word" ? "bg-violet text-[#0b0716]" : "text-muted hover:text-ink",
                      )}
                    >
                      Kata
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setSource("quick")}
                      disabled={mode === "word"}
                      className={cn(
                        "rounded-lg px-2 py-1.5 min-h-10 text-xs font-medium transition-colors sm:min-h-0 disabled:opacity-40",
                        source === "quick" ? "bg-white/10 text-ink" : "text-muted hover:text-ink",
                      )}
                    >
                      Cepat
                    </button>
                    <button
                      type="button"
                      onClick={() => setSource("trained")}
                      disabled={mode === "letter" && letters.length < 8}
                      className={cn(
                        "rounded-lg px-2 py-1.5 min-h-10 text-xs font-medium transition-colors sm:min-h-0 disabled:opacity-40",
                        source === "trained" ? "bg-white/10 text-ink" : "text-muted hover:text-ink",
                      )}
                    >
                      Terlatih
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted">
                  Sampling
                  <select
                    value={fps}
                    onChange={(event) => setFps(Number(event.target.value))}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 font-mono text-[0.68rem] text-ink focus:outline-none"
                  >
                    <option value={6}>6 fps · cepat</option>
                    <option value={8}>8 fps · seimbang</option>
                    <option value={12}>12 fps · teliti</option>
                  </select>
                </label>

                <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted/60">
                  {mode === "letter" ? (source === "quick" ? "geometri" : `k-NN · ${letters.length} contoh`) : `DTW · ${words.length} contoh`}
                </span>

                <div className="ml-auto flex gap-2">
                  {analyzing ? (
                    <button type="button" onClick={cancelAnalysis} className="btn btn-danger btn-sm">
                      <Square className="h-3.5 w-3.5" />
                      Batalkan
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void runAnalysis()}
                      disabled={!readyToAnalyze}
                      className="btn btn-primary btn-sm"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Analisis video
                    </button>
                  )}
                </div>
              </div>

              {analyzing && (
                <div className="flex items-center gap-2 text-[0.7rem] text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                  Memproses {Math.round(progress * 100)}% · makin panjang video, makin lama (seek per frame).
                </div>
              )}

              {cancelled && (
                <p className="flex items-center gap-2 text-[0.7rem] text-warn">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Analisis dibatalkan. Hasil sebagian tetap ditampilkan di bawah.
                </p>
              )}
            </div>
          </div>

          {segments.length > 0 && (
            <div className="panel p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Timeline</p>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted/60">
                  {segments.length} segmen · {analysedFrames} frame
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {segments.map((segment, index) => (
                  <button
                    key={`${segment.start}-${index}`}
                    type="button"
                    onClick={() => seekToSegment(segment)}
                    className="group inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-left transition-colors hover:border-accent/30 hover:bg-accent/[0.06]"
                    title={`Lompat ke ${formatTime(segment.start)}`}
                  >
                    <span className="font-mono text-[0.58rem] text-muted/60">{formatTime(segment.start)}</span>
                    <span className="font-mono text-[0.7rem] text-ink">
                      {segment.label === "SPASI" ? "␣" : segment.label}
                    </span>
                    <span className="font-mono text-[0.55rem] text-accent/60">
                      {Math.round(segment.confidence * 100)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* hasil */}
        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <div>
                <p className="text-sm font-medium">Transkrip</p>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted/60">
                  {text.length} karakter · bisa diedit
                </p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => void copyText()} className="btn btn-ghost btn-sm btn-icon" disabled={!text} aria-label="Salin">
                  <ClipboardCopy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => downloadText("transkrip-video.txt", text)}
                  className="btn btn-ghost btn-sm btn-icon"
                  disabled={!text}
                  aria-label="Unduh"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetResults();
                    setText("");
                  }}
                  className="btn btn-ghost btn-sm btn-icon"
                  disabled={!text && !segments.length}
                  aria-label="Bersihkan"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <textarea
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, 3000))}
              placeholder="Hasil analisis akan muncul di sini…"
              spellCheck={false}
              className="min-h-[240px] w-full resize-y bg-transparent px-4 py-4 font-mono text-[1.05rem] leading-relaxed text-ink placeholder:text-muted/40 focus:outline-none"
            />

            <div className="space-y-2 border-t border-white/[0.07] p-3">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => speak(text)} className="btn btn-ghost btn-sm" disabled={!text}>
                  <Volume2 className="h-3.5 w-3.5" />
                  Bacakan
                </button>
                <button type="button" onClick={() => void handleSave()} className="btn btn-ghost btn-sm" disabled={!text}>
                  <Save className="h-3.5 w-3.5" />
                  Simpan
                </button>
              </div>
              <button
                type="button"
                onClick={() => void tidyWithAi()}
                disabled={!aiEnabled || aiBusy || !text.trim()}
                className="btn btn-ghost btn-sm w-full"
                title={!aiEnabled ? "Butuh OPENAI_API_KEY di environment (opsional)." : undefined}
              >
                {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Rapikan jadi kalimat
                {!aiEnabled && <span className="ml-1 font-mono text-[0.58rem] text-muted/60">· butuh API key</span>}
              </button>
              {aiError && <p className="px-1 text-[0.68rem] leading-relaxed text-danger">{aiError}</p>}
            </div>
          </div>

          {error && (
            <div className="panel flex gap-2 border-warn/20 bg-warn/[0.04] p-3 text-xs leading-relaxed text-warn">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Cara mendapat hasil terbaik</p>
              <Clock className="h-4 w-4 text-muted" />
            </div>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
              <li>• Video stabil, tangan tidak keluar frame.</li>
              <li>• Satu isyarat ditahan ±0,3 detik sebelum pindah.</li>
              <li>• Mode huruf butuh jeda antar huruf.</li>
              <li>• Mode kata butuh contoh rekaman yang cukup.</li>
            </ul>
            <Link href="/latih" className="btn btn-ghost btn-sm mt-3 w-full">
              <GraduationCap className="h-3.5 w-3.5" />
              Rekam profil isyarat
            </Link>
          </div>

          <div className="panel border-dashed p-4">
            <p className="text-xs leading-relaxed text-muted">
              <span className="text-ink">Kenapa seek per frame?</span> Supaya hasilnya bisa diulang dan tidak
              bergantung pada kecepatan pemutaran. Konsekuensinya: video 1 menit butuh ±20–40 detik untuk
              dianalisis di laptop biasa.
            </p>
          </div>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className="animate-rise fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent/25 bg-[#0b1210]/95 px-4 py-2.5 text-xs text-accent shadow-2xl backdrop-blur"
        >
          <Check className="h-3.5 w-3.5" />
          {notice}
        </div>
      )}

      {fileInfo && !segments.length && !analyzing && (
        <p className="mt-4 flex items-center gap-2 text-[0.7rem] text-muted/60">
          <Upload className="h-3 w-3" />
          File diproses sepenuhnya di browser. Tidak ada request video ke server.
        </p>
      )}
    </div>
  );
}
