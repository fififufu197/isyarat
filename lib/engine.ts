"use client";

import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { drawHandSkeleton } from "./draw";
import { featureVariants, handGeometry, quickClassify } from "./features";
import { classifySequence, classifyStatic, euclidean, resampleSequence } from "./knn";
import type {
  EngineEvent,
  EngineFrame,
  Pt,
  SequenceSample,
  StaticSample,
} from "./types";

let landmarkerPromise: Promise<HandLandmarker> | null = null;

export type LandmarkerStatus = "idle" | "loading" | "ready" | "error";

export function loadLandmarker(): Promise<HandLandmarker> {
  if (landmarkerPromise) return landmarkerPromise;

  const wasmPath = process.env.NEXT_PUBLIC_MEDIAPIPE_WASM || "/mediapipe/wasm";
  const modelPath = process.env.NEXT_PUBLIC_HAND_MODEL || "/models/hand_landmarker.task";

  landmarkerPromise = (async () => {
    const fileset = await FilesetResolver.forVisionTasks(wasmPath);
    const build = (delegate: "GPU" | "CPU") =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: modelPath, delegate },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
      });

    try {
      return await build("GPU");
    } catch {
      // Sebagian browser/GPU memblokir WebGL compute — jatuh ke CPU.
      return await build("CPU");
    }
  })().catch((err) => {
    landmarkerPromise = null;
    throw err;
  });

  return landmarkerPromise;
}

export type EngineMode = "letter" | "word";
export type EngineSource = "quick" | "trained";

export type EngineConfig = {
  mode: EngineMode;
  source: EngineSource;
  letters: StaticSample[];
  words: SequenceSample[];
  letterThreshold: number;
  wordThreshold: number;
  mirror: boolean;
};

export type EngineHandlers = {
  onFrame?: (frame: EngineFrame) => void;
  onEvent?: (event: EngineEvent) => void;
  onStatus?: (status: LandmarkerStatus, message?: string) => void;
};

const DETECT_INTERVAL = 32; // ~30 fps
const HOLD_FRAMES = 6;
const UNLOCK_FRAMES = 8;
const WORD_INTERVAL = 240;
const WORD_WINDOW = 22;
const WORD_FPS = 15;

function toPt(lm: NormalizedLandmark): Pt {
  return { x: lm.x, y: lm.y, z: lm.z ?? 0 };
}

function bboxArea(points: Pt[]): number {
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

export class SignEngine {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement | null;
  private config: EngineConfig;
  private handlers: EngineHandlers;

  private raf = 0;
  private running = false;
  private landmarker: HandLandmarker | null = null;
  private lastDetect = 0;
  private lastTs = 0;
  private fps = 0;
  private lastFrameAt = 0;

  // state huruf
  private holdLabel: string | null = null;
  private holdCount = 0;
  private lockedLabel: string | null = null;
  private lockedAway = 0;
  private missing = 0;

  // state kata
  private buffer: number[][] = [];
  private lastPush = 0;
  private lastWordCheck = 0;
  private wordCandidate: { label: string; hits: number } | null = null;
  private lastWordAt = 0;

  private lastState: EngineFrame = {
    hands: 0,
    label: null,
    confidence: 0,
    hold: 0,
    fps: 0,
    locked: false,
  };

  constructor(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement | null,
    config: EngineConfig,
    handlers: EngineHandlers = {},
  ) {
    this.video = video;
    this.canvas = canvas;
    this.config = config;
    this.handlers = handlers;
  }

  updateConfig(config: EngineConfig) {
    this.config = config;
    this.resetTemporal();
  }

  private resetTemporal() {
    this.holdLabel = null;
    this.holdCount = 0;
    this.lockedLabel = null;
    this.lockedAway = 0;
    this.buffer = [];
    this.wordCandidate = null;
  }

  async start() {
    if (this.running) return;
    this.running = true;
    this.handlers.onStatus?.("loading");

    try {
      this.landmarker = await loadLandmarker();
      this.handlers.onStatus?.("ready");
    } catch (err) {
      this.running = false;
      const message = err instanceof Error ? err.message : "Model gagal dimuat.";
      this.handlers.onStatus?.("error", message);
      return;
    }

    this.loop();
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.clearCanvas();
  }

  private clearCanvas() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext("2d");
    ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private loop = () => {
    if (!this.running) return;
    const now = performance.now();

    if (now - this.lastDetect >= DETECT_INTERVAL) {
      const dt = now - (this.lastDetect || now);
      this.lastDetect = now;
      if (dt > 0 && dt < 500) {
        const instant = 1000 / dt;
        this.fps = this.fps ? this.fps * 0.85 + instant * 0.15 : instant;
      }
      this.detect(now);
    }

    this.raf = requestAnimationFrame(this.loop);
  };

  private detect(now: number) {
    const video = this.video;
    if (!this.landmarker || video.readyState < 2 || !video.videoWidth) return;

    let result;
    try {
      this.lastTs = Math.max(this.lastTs + 1, Math.round(now));
      result = this.landmarker.detectForVideo(video, this.lastTs);
    } catch {
      return;
    }

    this.syncCanvasSize();

    const hands: Pt[][] = (result.landmarks ?? []).map((hand) => hand.map(toPt));
    if (this.canvas) {
      const ctx = this.canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (const hand of hands) drawHandSkeleton(ctx, hand);
      }
    }

    let label: string | null = null;
    let confidence = 0;
    let hold = 0;
    let locked = false;

    const primary = hands.slice().sort((a, b) => bboxArea(b) - bboxArea(a))[0];

    if (!primary) {
      this.missing += 1;
      if (this.missing > 6) this.resetTemporal();
      this.publish(0, null, 0, 0, false, now);
      return;
    }
    this.missing = 0;

    if (this.config.mode === "letter") {
      const prediction = this.predictLetter(primary);
      if (prediction) {
        label = prediction.label;
        confidence = prediction.confidence;
        if (this.holdLabel === prediction.label) {
          this.holdCount += 1;
        } else {
          this.holdLabel = prediction.label;
          this.holdCount = 1;
        }
        hold = Math.min(1, this.holdCount / HOLD_FRAMES);

        if (this.lockedLabel === prediction.label) {
          locked = true;
          hold = 1;
        } else if (this.lockedLabel) {
          this.lockedAway += 1;
          if (this.lockedAway > UNLOCK_FRAMES) this.lockedLabel = null;
        }

        if (this.holdCount >= HOLD_FRAMES && !locked) {
          this.lockedLabel = prediction.label;
          this.lockedAway = 0;
          locked = true;
          this.handlers.onEvent?.({
            label: prediction.label,
            confidence: prediction.confidence,
            kind: "letter",
            at: Date.now(),
          });
        }
      } else {
        this.holdLabel = null;
        this.holdCount = 0;
        if (this.lockedLabel) {
          this.lockedAway += 1;
          if (this.lockedAway > UNLOCK_FRAMES) this.lockedLabel = null;
        }
      }
    } else {
      const word = this.processWord(primary, now);
      if (word) {
        label = word.label;
        confidence = word.confidence;
        hold = 1;
      } else if (this.wordCandidate) {
        label = this.wordCandidate.label;
        confidence = 0.45;
        hold = Math.min(1, this.wordCandidate.hits / 2);
      }
    }

    this.publish(hands.length, label, confidence, hold, locked, now);
  }

  private predictLetter(hand: Pt[]): { label: string; confidence: number } | null {
    if (this.config.source === "quick") {
      return quickClassify(handGeometry(hand));
    }

    if (!this.config.letters.length) return null;
    const variants = featureVariants(hand);
    let best: { label: string; confidence: number } | null = null;
    for (const variant of variants) {
      const prediction = classifyStatic(this.config.letters, variant, {
        threshold: this.config.letterThreshold,
      });
      if (prediction && (!best || prediction.confidence > best.confidence)) {
        best = { label: prediction.label, confidence: prediction.confidence };
      }
    }
    return best;
  }

  private processWord(hand: Pt[], now: number): { label: string; confidence: number } | null {
    if (!this.config.words.length) return null;
    if (now - this.lastPush >= 1000 / WORD_FPS) {
      this.lastPush = now;
      this.buffer.push(featureVariants(hand)[0]);
      if (this.buffer.length > WORD_WINDOW) this.buffer.shift();
    }

    if (now - this.lastWordCheck < WORD_INTERVAL) return null;
    this.lastWordCheck = now;

    if (this.buffer.length < 10) return null;
    if (this.motionEnergy() < 0.014) return null;
    if (now - this.lastWordAt < 1200) return null;

    const frames = resampleSequence(this.buffer, 16);
    const prediction = classifySequence(this.config.words, frames, {
      threshold: this.config.wordThreshold,
    });

    if (!prediction) {
      this.wordCandidate = null;
      return null;
    }

    if (this.wordCandidate?.label === prediction.label) {
      this.wordCandidate.hits += 1;
    } else {
      this.wordCandidate = { label: prediction.label, hits: 1 };
    }

    if (this.wordCandidate.hits >= 2 && prediction.confidence > 0.35) {
      const label = prediction.label;
      this.wordCandidate = null;
      this.buffer = [];
      this.lastWordAt = now;
      this.handlers.onEvent?.({ label, confidence: prediction.confidence, kind: "word", at: now });
      return { label, confidence: prediction.confidence };
    }

    return null;
  }

  private motionEnergy(): number {
    let sum = 0;
    for (let i = 1; i < this.buffer.length; i++) {
      sum += euclidean(this.buffer[i], this.buffer[i - 1]);
    }
    return sum / Math.max(1, this.buffer.length - 1);
  }

  private publish(
    hands: number,
    label: string | null,
    confidence: number,
    hold: number,
    locked: boolean,
    now: number,
  ) {
    const state: EngineFrame = { hands, label, confidence, hold, fps: this.fps, locked };
    this.lastState = state;
    const changed = state.label !== this.lastFrameState?.label;
    if (changed || now - this.lastFrameAt > 90) {
      this.lastFrameAt = now;
      this.lastFrameState = state;
      this.handlers.onFrame?.(state);
    }
  }

  private lastFrameState: EngineFrame | null = null;

  private syncCanvasSize() {
    if (!this.canvas) return;
    const { videoWidth, videoHeight } = this.video;
    if (!videoWidth || !videoHeight) return;
    if (this.canvas.width !== videoWidth || this.canvas.height !== videoHeight) {
      this.canvas.width = videoWidth;
      this.canvas.height = videoHeight;
    }
  }

  getState(): EngineFrame {
    return this.lastState;
  }
}
