"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Check,
  Copy,
  Download,
  FlipHorizontal2,
  GraduationCap,
  Keyboard,
  Loader2,
  Radio,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  Wand2,
} from "lucide-react";
import { BroadcastOverlay } from "./BroadcastOverlay";
import { HandGlyph } from "./HandGlyph";
import { HoldRing } from "./HoldRing";
import { useProfile } from "@/hooks/useProfile";
import {
  SignEngine,
  type EngineConfig,
  type EngineMode,
  type EngineSource,
  type LandmarkerStatus,
} from "@/lib/engine";
import { LETTERS, QUICK_HELP, QUICK_LABELS, letterHint, WORDS } from "@/lib/lexicon";
import { addHistory, downloadText } from "@/lib/storage";
import { cloudEnabled, saveTranscriptToCloud } from "@/lib/supabase";
import type { EngineEvent, EngineFrame } from "@/lib/types";
import { cn, speak, stopSpeaking } from "@/lib/utils";

type CameraState = "idle" | "starting" | "live" | "error";

const EMPTY_FRAME: EngineFrame = {
  hands: 0,
  label: null,
  confidence: 0,
  hold: 0,
  fps: 0,
  locked: false,
};

export function StudioClient({ aiEnabled }: { aiEnabled: boolean }) {
  const { profile, mutate, ready } = useProfile();

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [aspect, setAspect] = useState(16 / 9);
  const [mirror, setMirror] = useState(true);

  const [engineStatus, setEngineStatus] = useState<LandmarkerStatus>("idle");
  const [engineError, setEngineError] = useState<string | null>(null);
  const [frame, setFrame] = useState<EngineFrame>(EMPTY_FRAME);

  const [mode, setMode] = useState<EngineMode>("letter");
  const [source, setSource] = useState<EngineSource>("quick");
  const [letterThreshold, setLetterThreshold] = useState(0.34);
  const [wordThreshold, setWordThreshold] = useState(1.1);

  const [text, setText] = useState("");
  const [lastEvent, setLastEvent] = useState<EngineEvent | null>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedHint, setSelectedHint] = useState("B");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const engineRef = useRef<SignEngine | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const eventTimer = useRef<number | null>(null);

  const letters = profile?.letters ?? [];
  const words = profile?.words ?? [];

  const notify = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3600);
  }, []);

  const handleEvent = useCallback((event: EngineEvent) => {
    setLastEvent(event);
    if (eventTimer.current) window.clearTimeout(eventTimer.current);
    eventTimer.current = window.setTimeout(() => setLastEvent(null), 2800);

    setText((previous) => {
      let addition = "";
      if (event.kind === "letter") {
        addition = event.label === "SPASI" ? " " : event.label;
      } else {
        addition = `${previous && !previous.endsWith(" ") ? " " : ""}${event.label}`;
      }
      return `${previous}${addition}`.slice(0, 1500);
    });
  }, []);

  const config: EngineConfig = useMemo(
    () => ({
      mode,
      source,
      letters: source === "trained" && mode === "letter" ? letters : [],
      words: mode === "word" ? words : [],
      letterThreshold,
      wordThreshold,
      mirror,
    }),
    [mode, source, letters, words, letterThreshold, wordThreshold, mirror],
  );

  const configRef = useRef(config);
  configRef.current = config;

  const stopCamera = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState("idle");
    setFrame(EMPTY_FRAME);
  }, []);

  const startCamera = useCallback(
    async (facing?: "user" | "environment") => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Browser ini tidak mendukung akses kamera. Coba Chrome, Edge, atau Safari terbaru.");
        setCameraState("error");
        return;
      }
      if (!window.isSecureContext) {
        setCameraError("Kamera hanya bisa diakses lewat HTTPS atau localhost.");
        setCameraState("error");
        return;
      }

      const target = facing ?? facingMode;
      setCameraError(null);
      setEngineError(null);
      setCameraState("starting");

      try {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: target },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (video.videoWidth && video.videoHeight) setAspect(video.videoWidth / video.videoHeight);
        setCameraState("live");
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        const message =
          name === "NotAllowedError"
            ? "Izin kamera ditolak. Aktifkan izin kamera untuk situs ini di setelan browser."
            : name === "NotFoundError"
              ? "Tidak ada kamera yang terdeteksi di perangkat ini."
              : name === "NotReadableError"
                ? "Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi."
                : "Kamera gagal dibuka. Coba lagi atau gunakan halaman upload video.";
        setCameraError(message);
        setCameraState("error");
      }
    },
    [facingMode],
  );

  // Buat / hentikan engine mengikuti status kamera.
  useEffect(() => {
    if (cameraState !== "live") return;
    const video = videoRef.current;
    if (!video) return;

    const engine = new SignEngine(video, canvasRef.current, configRef.current, {
      onFrame: setFrame,
      onEvent: handleEvent,
      onStatus: (status, message) => {
        setEngineStatus(status);
        if (status === "error") setEngineError(message ?? "Model gagal dimuat.");
      },
    });
    engineRef.current = engine;
    void engine.start();

    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, [cameraState, handleEvent]);

  useEffect(() => {
    engineRef.current?.updateConfig(config);
  }, [config]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
      if (eventTimer.current) window.clearTimeout(eventTimer.current);
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (mode === "word" && source === "quick") setSource("trained");
  }, [mode, source]);

  const switchCamera = async () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    await startCamera(next);
  };

  const displayLabel = frame.label ?? lastEvent?.label ?? null;
  const displayConfidence = frame.label ? frame.confidence : lastEvent?.confidence ?? 0;
  const cameraLive = cameraState === "live";
  const letterSamples = letters.length;
  const trainedReady = letterSamples >= 8;
  const wordsReady = words.length >= 2;
  const stream = streamRef.current;

  const copyText = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      notify("Transkrip disalin ke clipboard.");
    } catch {
      notify("Gagal menyalin. Blokir clipboard oleh browser?");
    }
  };

  const handleSave = async () => {
    const value = text.trim();
    if (!value) return;
    addHistory({ source: "kamera", text: value });
    if (cloudEnabled()) {
      const { error } = await saveTranscriptToCloud(value, "kamera");
      notify(error ? `Tersimpan lokal. Cloud gagal: ${error}` : "Tersimpan di riwayat lokal dan cloud.");
    } else {
      notify("Tersimpan di riwayat lokal perangkat ini.");
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
      if (!response.ok || !data.text) throw new Error(data.error || "Gagal merapikan teks.");
      setText(data.text);
      notify("Ejaan dirapikan jadi kalimat.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Gagal merapikan teks.");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="container-x pb-16 pt-8 sm:pt-10">
      {/* header */}
      <div className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-7 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-accent">
              <Camera className="h-3 w-3" />
              studio kamera
            </span>
            <span className="chip">SIBI · ejaan jari</span>
            <span className="chip">
              <span className="h-1.5 w-1.5 rounded-full bg-accent/70" />
              on-device
            </span>
          </div>
          <h1 className="mt-4 text-[clamp(1.9rem,4vw,2.9rem)] font-medium leading-[1.02] tracking-[-0.035em]">
            Tanganmu, jadi teks.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Tahan isyarat ±0,2 detik sampai cincin penuh, lalu huruf terkunci. Lepas dan ganti isyarat untuk
            menulis huruf berikutnya. Video tidak pernah dikirim ke server.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/latih" className="btn btn-ghost btn-sm">
            <GraduationCap className="h-4 w-4" />
            Latih profil
            {ready && letterSamples > 0 && (
              <span className="ml-1 rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[0.6rem]">
                {letterSamples}
              </span>
            )}
          </Link>
          <Link href="/panduan" className="btn btn-ghost btn-sm">
            Panduan
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        {/* ---------------- KIRI: kamera + kontrol ---------------- */}
        <div className="space-y-3">
          <div className="panel overflow-hidden">
            <div
              className="relative w-full overflow-hidden bg-black"
              style={{ aspectRatio: aspect }}
            >
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                className={cn("h-full w-full object-cover", mirror && "-scale-x-100")}
              />
              <canvas
                ref={canvasRef}
                className={cn(
                  "pointer-events-none absolute inset-0 h-full w-full",
                  mirror && "-scale-x-100",
                )}
                aria-hidden
              />

              {/* sudut bingkai */}
              <div className="pointer-events-none absolute inset-3 opacity-50" aria-hidden>
                {["left-0 top-0 border-l-2 border-t-2 rounded-tl-lg", "right-0 top-0 border-r-2 border-t-2 rounded-tr-lg", "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-lg", "right-0 bottom-0 border-r-2 border-b-2 rounded-br-lg"].map((pos) => (
                  <span key={pos} className={`absolute h-6 w-6 border-accent/40 ${pos}`} />
                ))}
              </div>

              {!cameraLive && (
                <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_30%,#12141c,#07080b_70%)]">
                  <div className="flex max-w-sm flex-col items-center px-6 text-center">
                    <HandGlyph className="h-24 w-auto opacity-25" dim />
                    <p className="mt-3 text-sm font-medium">
                      {cameraState === "starting"
                        ? "Membuka kamera…"
                        : cameraState === "error"
                          ? "Kamera tidak aktif"
                          : "Kamera belum dinyalakan"}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {cameraError ??
                        "Izinkan akses kamera. Semua pemrosesan terjadi di perangkatmu — tidak ada frame yang diunggah."}
                    </p>
                    <button
                      type="button"
                      onClick={() => void startCamera()}
                      className="btn btn-primary btn-sm mt-4"
                      disabled={cameraState === "starting"}
                    >
                      {cameraState === "starting" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Camera className="h-3.5 w-3.5" />
                      )}
                      {cameraState === "error" ? "Coba lagi" : "Nyalakan kamera"}
                    </button>
                    <Link href="/upload" className="mt-3 text-[0.72rem] text-muted underline-offset-4 hover:text-ink hover:underline">
                      atau analisis file video
                    </Link>
                  </div>
                </div>
              )}

              {cameraLive && (
                <>
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    <span className="chip">
                      <span className="h-1.5 w-1.5 animate-blink rounded-full bg-[#ff6b6b]" />
                      live
                    </span>
                    <span className="chip">{Math.round(frame.fps)} fps</span>
                    <span className="chip">{frame.hands} tangan</span>
                  </div>

                  {engineStatus === "loading" && (
                    <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Loader2 className="h-5 w-5 animate-spin text-accent" />
                        <p className="text-sm font-medium">Menyiapkan model tangan</p>
                        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
                          7,5 MB · sekali per sesi
                        </p>
                      </div>
                    </div>
                  )}

                  {engineStatus === "error" && (
                    <div className="absolute inset-x-3 top-14 rounded-xl border border-danger/30 bg-black/70 p-3 text-xs text-danger">
                      {engineError}
                    </div>
                  )}

                  {/* hasil besar */}
                  <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-md">
                      <div>
                        <p className="font-mono text-[0.52rem] uppercase tracking-[0.2em] text-accent/80">
                          {frame.locked ? "terkunci" : "terbaca"}
                        </p>
                        <p className="mt-0.5 min-w-12 font-mono text-4xl leading-none text-accent">
                          {displayLabel === "SPASI" ? "␣" : displayLabel || "–"}
                        </p>
                      </div>
                      <HoldRing progress={frame.hold} />
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 backdrop-blur">
                        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                          <span
                            className="block h-full rounded-full bg-accent transition-[width] duration-150"
                            style={{ width: `${Math.round(displayConfidence * 100)}%` }}
                          />
                        </span>
                        <span className="font-mono text-[0.6rem] text-muted">
                          {Math.round(displayConfidence * 100)}%
                        </span>
                      </div>
                      <span className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-white/45">
                        video tidak dikirim
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* kontrol */}
            <div className="space-y-3 border-t border-white/[0.07] p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                {cameraLive ? (
                  <button type="button" onClick={stopCamera} className="btn btn-ghost btn-sm">
                    <Square className="h-3.5 w-3.5" />
                    Hentikan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="btn btn-primary btn-sm"
                    disabled={cameraState === "starting"}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Nyalakan kamera
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void switchCamera()}
                  className="btn btn-ghost btn-sm"
                  disabled={cameraState === "starting"}
                >
                  <FlipHorizontal2 className="h-3.5 w-3.5" />
                  {facingMode === "user" ? "Depan" : "Belakang"}
                </button>

                <button
                  type="button"
                  onClick={() => setMirror((v) => !v)}
                  className={cn("btn btn-sm", mirror ? "btn-ghost border-accent/30 text-accent" : "btn-ghost")}
                  aria-pressed={mirror}
                >
                  <FlipHorizontal2 className="h-3.5 w-3.5" />
                  Cermin
                </button>

                <span className="ml-auto hidden items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted sm:flex">
                  <Keyboard className="h-3 w-3" />
                  tahan untuk kunci
                </span>
              </div>

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
                      title={!wordsReady ? "Rekam minimal 2 contoh kata di halaman Latih" : undefined}
                      className={cn(
                        "rounded-lg px-2 py-1.5 min-h-10 text-xs font-medium transition-colors sm:min-h-0 disabled:cursor-not-allowed disabled:opacity-40",
                        mode === "word" ? "bg-violet text-[#0b0716]" : "text-muted hover:text-ink",
                      )}
                    >
                      Kata {wordsReady ? "" : "· butuh data"}
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
                        "rounded-lg px-2 py-1.5 min-h-10 text-xs font-medium transition-colors sm:min-h-0 disabled:cursor-not-allowed disabled:opacity-40",
                        source === "quick" ? "bg-white/10 text-ink" : "text-muted hover:text-ink",
                      )}
                    >
                      Cepat
                    </button>
                    <button
                      type="button"
                      onClick={() => setSource("trained")}
                      disabled={mode === "letter" && !trainedReady}
                      title={
                        mode === "letter" && !trainedReady
                          ? "Butuh minimal 8 sampel huruf (sekitar 4 rekaman) di halaman Latih"
                          : undefined
                      }
                      className={cn(
                        "rounded-lg px-2 py-1.5 min-h-10 text-xs font-medium transition-colors sm:min-h-0 disabled:cursor-not-allowed disabled:opacity-40",
                        source === "trained" ? "bg-white/10 text-ink" : "text-muted hover:text-ink",
                      )}
                    >
                      Terlatih
                    </button>
                  </div>
                </div>
              </div>

              <details className="group rounded-xl border border-white/[0.07] bg-white/[0.015] px-3 py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-muted">
                  <span className="inline-flex items-center gap-2">
                    <Wand2 className="h-3.5 w-3.5" />
                    Sensitivitas & setelan
                  </span>
                  <span className="font-mono text-[0.6rem] text-muted/60 group-open:hidden">buka</span>
                  <span className="hidden font-mono text-[0.6rem] text-muted/60 group-open:inline">tutup</span>
                </summary>
                <div className="mt-3 space-y-4 pb-1">
                  <label className="block">
                    <span className="flex items-center justify-between text-[0.72rem] text-muted">
                      Toleransi huruf
                      <span className="font-mono text-[0.65rem] text-muted/70">
                        {letterThreshold.toFixed(2)}
                      </span>
                    </span>
                    <input
                      type="range"
                      className="slider mt-2"
                      min={0.18}
                      max={0.55}
                      step={0.01}
                      value={letterThreshold}
                      onChange={(e) => setLetterThreshold(Number(e.target.value))}
                    />
                    <span className="mt-1 block text-[0.66rem] leading-relaxed text-muted/60">
                      Naikkan kalau isyaratmu sering tidak terbaca; turunkan kalau sering salah tebak.
                    </span>
                  </label>
                  <label className="block">
                    <span className="flex items-center justify-between text-[0.72rem] text-muted">
                      Toleransi kata (DTW)
                      <span className="font-mono text-[0.65rem] text-muted/70">
                        {wordThreshold.toFixed(2)}
                      </span>
                    </span>
                    <input
                      type="range"
                      className="slider mt-2"
                      min={0.6}
                      max={1.8}
                      step={0.05}
                      value={wordThreshold}
                      onChange={(e) => setWordThreshold(Number(e.target.value))}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setLetterThreshold(0.34);
                      setWordThreshold(1.1);
                    }}
                    className="btn btn-ghost btn-sm w-full"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Kembali ke default
                  </button>
                </div>
              </details>
            </div>
          </div>

          {/* status + tips */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="panel p-4">
              <p className="label-mono">Status mesin</p>
              <div className="mt-2 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Model tangan</span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[0.66rem]">
                    {engineStatus === "ready" ? (
                      <><Check className="h-3 w-3 text-accent" /> siap</>
                    ) : engineStatus === "loading" ? (
                      <><Loader2 className="h-3 w-3 animate-spin text-warn" /> memuat</>
                    ) : engineStatus === "error" ? (
                      <><AlertTriangle className="h-3 w-3 text-danger" /> gagal</>
                    ) : (
                      <span className="text-muted/70">menunggu</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Sumber pengenalan</span>
                  <span className="font-mono text-[0.66rem]">
                    {mode === "word" ? "DTW kata" : source === "quick" ? "geometri" : "k-NN profil"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Contoh tersimpan</span>
                  <span className="font-mono text-[0.66rem]">
                    {letterSamples} huruf · {words.length} kata
                  </span>
                </div>
              </div>
            </div>

            <div className="panel p-4">
              <p className="label-mono">Supaya akurat</p>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
                <li>• Cahaya dari depan, bukan belakang.</li>
                <li>• Tangan utuh masuk frame, jarak ±50 cm.</li>
                <li>• Tahan bentuk 0,2 detik — jangan buru-buru.</li>
                <li>• Latar polos lebih stabil daripada ramai.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ---------------- KANAN: transkrip ---------------- */}
        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
              <div>
                <p className="text-sm font-medium">Transkrip</p>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted/60">
                  {text.length} karakter · bisa diedit
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setText((v) => `${v} `)}
                  className="btn btn-ghost btn-sm btn-icon"
                  title="Tambah spasi"
                  aria-label="Tambah spasi"
                >
                  <span className="font-mono text-xs">␣</span>
                </button>
                <button
                  type="button"
                  onClick={() => setText((v) => v.slice(0, -1))}
                  className="btn btn-ghost btn-sm btn-icon"
                  title="Hapus karakter terakhir"
                  aria-label="Hapus karakter terakhir"
                >
                  <span className="font-mono text-xs">⌫</span>
                </button>
                <button
                  type="button"
                  onClick={() => setText("")}
                  className="btn btn-ghost btn-sm btn-icon"
                  title="Bersihkan"
                  aria-label="Bersihkan transkrip"
                  disabled={!text}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value.slice(0, 1500))}
                placeholder="Isyarat yang terbaca akan muncul di sini…"
                spellCheck={false}
                className="min-h-[220px] w-full resize-y bg-transparent px-4 py-4 font-mono text-[1.05rem] leading-relaxed text-ink placeholder:text-muted/40 focus:outline-none"
              />
              {text && displayLabel && (
                <span className="pointer-events-none absolute bottom-3 right-3 rounded-md border border-accent/20 bg-black/50 px-2 py-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-accent/80">
                  +{displayLabel === "SPASI" ? "spasi" : displayLabel}
                </span>
              )}
            </div>

            <div className="space-y-2 border-t border-white/[0.07] p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button type="button" onClick={() => void copyText()} className="btn btn-ghost btn-sm" disabled={!text}>
                  <Copy className="h-3.5 w-3.5" />
                  Salin
                </button>
                <button
                  type="button"
                  onClick={() => downloadText("transkrip-isyarat.txt", text)}
                  className="btn btn-ghost btn-sm"
                  disabled={!text}
                >
                  <Download className="h-3.5 w-3.5" />
                  Unduh
                </button>
                <button
                  type="button"
                  onClick={() => speak(text)}
                  className="btn btn-ghost btn-sm"
                  disabled={!text}
                >
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
                title={!aiEnabled ? "Butuh OPENAI_API_KEY di environment (opsional)." : undefined}
                className="btn btn-ghost btn-sm w-full"
              >
                {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Rapikan jadi kalimat
                {!aiEnabled && <span className="ml-1 font-mono text-[0.58rem] text-muted/60">· butuh API key</span>}
              </button>
              {aiError && <p className="px-1 text-[0.68rem] leading-relaxed text-danger">{aiError}</p>}

              <button
                type="button"
                onClick={() => setShowBroadcast(true)}
                disabled={!cameraLive}
                className="btn btn-primary w-full"
              >
                <Radio className="h-4 w-4" />
                Mode siaran
              </button>
            </div>
          </div>

          {/* kamus cepat */}
          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Kamus cepat</p>
              <Link href="/latih" className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-accent/80 hover:text-accent">
                rekam profil →
              </Link>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {mode === "word"
                ? "Mode kata memakai contoh rekamanmu. Pilih kata di halaman latih untuk melihat panduannya."
                : "Klik huruf untuk melihat panduan bentuk tangan. Yang ditandai titik didukung mesin cepat."}
            </p>

            {mode === "letter" ? (
              <>
                <div className="mt-3 grid grid-cols-7 gap-1 sm:grid-cols-9">
                  {LETTERS.map((letter) => {
                    const quick = QUICK_LABELS.has(letter.label);
                    const count = letters.filter((sample) => sample.label === letter.label).length;
                    const active = selectedHint === letter.label;
                    return (
                      <button
                        key={letter.label}
                        type="button"
                        onClick={() => setSelectedHint(letter.label)}
                        className={cn(
                          "relative grid aspect-square place-items-center rounded-lg border font-mono text-xs transition-colors",
                          active
                            ? "border-accent/50 bg-accent/10 text-accent"
                            : quick
                              ? "border-white/10 bg-white/[0.045] text-ink hover:border-accent/30"
                              : "border-white/[0.06] bg-white/[0.015] text-muted hover:text-ink",
                        )}
                        title={quick ? "Didukung mesin cepat" : "Perlu profil terlatih"}
                      >
                        {letter.label}
                        {quick && (
                          <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-accent/80" />
                        )}
                        {count > 0 && (
                          <span className="absolute -bottom-1 -right-1 rounded-full border border-base bg-accent px-1 font-mono text-[0.5rem] leading-4 text-[#04140e]">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted/70">
                    {selectedHint} {QUICK_LABELS.has(selectedHint) ? "· mesin cepat" : "· butuh profil"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{letterHint(selectedHint)}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["SPASI", ...Object.keys(QUICK_HELP).filter((k) => k !== "SPASI")].map((key) => (
                    <span
                      key={key}
                      className="rounded-md border border-accent/20 bg-accent/[0.06] px-1.5 py-0.5 font-mono text-[0.58rem] text-accent/80"
                    >
                      {key}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-3 space-y-1.5">
                {WORDS.filter((word) => words.some((w) => w.label === word.label)).length === 0 ? (
                  <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3 text-xs leading-relaxed text-muted">
                    Belum ada kata yang direkam. Buka{" "}
                    <Link href="/latih" className="text-accent underline-offset-2 hover:underline">
                      Latih isyarat
                    </Link>{" "}
                    dan rekam minimal 2 contoh untuk satu kata.
                  </div>
                ) : (
                  WORDS.filter((word) => words.some((w) => w.label === word.label)).map((word) => (
                    <div
                      key={word.label}
                      className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5"
                    >
                      <span className="font-mono text-[0.72rem] text-ink">{word.label}</span>
                      <span className="font-mono text-[0.6rem] text-muted">
                        {words.filter((w) => w.label === word.label).length} contoh
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="panel border-dashed p-4">
            <p className="text-xs leading-relaxed text-muted">
              <span className="text-ink">Catatan jujur:</span> mesin cepat hanya mengenali 9 huruf + spasi
              yang bentuknya sangat berbeda. Untuk 26 huruf dan kosakata, rekam profilmu dulu — akurasi
              mengikuti konsistensi rekaman, bukan keajaiban model.
            </p>
          </div>
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

      {showBroadcast && (
        <BroadcastOverlay
          stream={stream}
          text={text}
          latest={lastEvent}
          onClose={() => setShowBroadcast(false)}
        />
      )}

      {cameraState === "error" && cameraError && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/[0.06] p-3 text-xs leading-relaxed text-danger">
          <CameraOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}
    </div>
  );
}
