"use client";

import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { featureVariants, handGeometry, quickClassify } from "./features";
import { classifySequence, classifyStatic, resampleSequence } from "./knn";
import type {
  EngineMode,
  EngineSource,
} from "./engine";
import type { Pt, SequenceSample, StaticSample, TranscriptSegment } from "./types";

export type OfflineConfig = {
  mode: EngineMode;
  source: EngineSource;
  letters: StaticSample[];
  words: SequenceSample[];
  letterThreshold: number;
  wordThreshold: number;
  fps: number;
  maxSeconds: number;
};

export type OfflineResult = {
  segments: TranscriptSegment[];
  transcript: string;
  analysedFrames: number;
  cancelled: boolean;
  duration: number;
};

export type OfflineCallbacks = {
  onProgress?: (ratio: number, time: number) => void;
  onFrame?: (hands: Pt[][], label: string | null) => void;
  signal?: AbortSignal;
};

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    try {
      video.currentTime = time;
    } catch {
      done();
      return;
    }
    window.setTimeout(done, 1500);
  });
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

function motionEnergy(buffer: number[][]): number {
  if (buffer.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < buffer.length; i++) {
    const a = buffer[i];
    const b = buffer[i - 1];
    let d = 0;
    for (let j = 0; j < Math.min(a.length, b.length); j++) d += (a[j] - b[j]) ** 2;
    sum += Math.sqrt(d / Math.max(1, a.length));
  }
  return sum / (buffer.length - 1);
}

/**
 * Menganalisis file video secara offline: video di-seek per frame, landmark
 * dihitung, lalu hasilnya dirangkai menjadi segmen teks.
 */
export async function analyzeVideo(
  video: HTMLVideoElement,
  landmarker: HandLandmarker,
  config: OfflineConfig,
  callbacks: OfflineCallbacks = {},
): Promise<OfflineResult> {
  const duration = Math.min(
    Number.isFinite(video.duration) ? video.duration : 0,
    Math.max(1, config.maxSeconds),
  );
  const fps = Math.max(2, Math.min(15, config.fps));
  const step = 1 / fps;
  const segments: TranscriptSegment[] = [];

  let analysedFrames = 0;
  let cancelled = false;

  let holdLabel: string | null = null;
  let holdCount = 0;
  let holdStart = 0;
  let lockLabel: string | null = null;
  let lockAway = 0;

  let wordBuffer: number[][] = [];
  let lastWordEnd = -10;
  let wordCandidateLabel: string | null = null;
  let wordCandidateHits = 0;

  video.pause();

  for (let index = 0; index * step < duration; index++) {
    if (callbacks.signal?.aborted) {
      cancelled = true;
      break;
    }

    const time = Math.min(index * step, Math.max(0, duration - 0.02));
    await seekTo(video, time);

    let result;
    try {
      result = landmarker.detectForVideo(video, Math.max(1, Math.round(time * 1000)));
    } catch {
      continue;
    }
    analysedFrames += 1;

    const hands: Pt[][] = (result.landmarks ?? []).map((hand) =>
      hand.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0 })),
    );
    const primary = hands.slice().sort((a, b) => bboxArea(b) - bboxArea(a))[0];
    let frameLabel: string | null = null;

    if (primary) {
      if (config.mode === "letter") {
        let prediction: { label: string; confidence: number } | null = null;
        if (config.source === "quick") {
          prediction = quickClassify(handGeometry(primary));
        } else if (config.letters.length) {
          for (const variant of featureVariants(primary)) {
            const p = classifyStatic(config.letters, variant, { threshold: config.letterThreshold });
            if (p && (!prediction || p.confidence > prediction.confidence)) {
              prediction = { label: p.label, confidence: p.confidence };
            }
          }
        }

        if (prediction) {
          frameLabel = prediction.label;
          if (holdLabel === prediction.label) {
            holdCount += 1;
          } else {
            holdLabel = prediction.label;
            holdCount = 1;
            holdStart = time;
          }

          if (lockLabel === prediction.label) {
            lockAway = 0;
          } else if (lockLabel) {
            lockAway += 1;
            if (lockAway > 1) lockLabel = null;
          }

          if (holdCount >= 3 && lockLabel !== prediction.label) {
            lockLabel = prediction.label;
            lockAway = 0;
            const previous = segments[segments.length - 1];
            if (previous && previous.label === prediction.label && time - previous.end <= step * 1.5) {
              previous.end = time;
              previous.confidence = Math.max(previous.confidence, prediction.confidence);
            } else if (segments.length < 800) {
              segments.push({
                start: holdStart,
                end: time,
                label: prediction.label,
                confidence: prediction.confidence,
              });
            }
          }
        } else {
          holdLabel = null;
          holdCount = 0;
          if (lockLabel) {
            lockAway += 1;
            if (lockAway > 3) lockLabel = null;
          }
        }
      } else {
        // mode kata
        const variant = featureVariants(primary)[0];
        wordBuffer.push(variant);
        if (wordBuffer.length > 18) wordBuffer.shift();

        if (
          wordBuffer.length >= 10 &&
          motionEnergy(wordBuffer) > 0.012 &&
          time - lastWordEnd > 1.1 &&
          config.words.length > 0
        ) {
          const frames = resampleSequence(wordBuffer, 16);
          const prediction = classifySequence(config.words, frames, {
            threshold: config.wordThreshold,
          });

          if (prediction) {
            frameLabel = prediction.label;
            if (wordCandidateLabel === prediction.label) {
              wordCandidateHits += 1;
            } else {
              wordCandidateLabel = prediction.label;
              wordCandidateHits = 1;
            }

            if (wordCandidateHits >= 2) {
              const start = Math.max(0, time - (wordBuffer.length - 1) * step);
              const previous = segments[segments.length - 1];
              if (previous && previous.label === prediction.label && start - previous.end < 1.2) {
                previous.end = time;
              } else if (segments.length < 400) {
                segments.push({
                  start,
                  end: time,
                  label: prediction.label,
                  confidence: prediction.confidence,
                });
              }
              lastWordEnd = time;
              wordCandidateLabel = null;
              wordCandidateHits = 0;
              wordBuffer = [];
            }
          } else {
            wordCandidateLabel = null;
            wordCandidateHits = 0;
          }
        }
      }
    } else {
      holdLabel = null;
      holdCount = 0;
      if (lockLabel) {
        lockAway += 1;
        if (lockAway > 3) lockLabel = null;
      }
    }

    callbacks.onFrame?.(hands, frameLabel);
    callbacks.onProgress?.(Math.min(1, (index + 1) * step / duration), time);
  }

  video.pause();

  const transcript =
    config.mode === "word"
      ? segments.map((s) => s.label).join(" ")
      : segments
          .map((s) => (s.label === "SPASI" ? " " : s.label))
          .join("")
          .replace(/\s+/g, " ")
          .trim();

  return { segments, transcript, analysedFrames, cancelled, duration };
}
