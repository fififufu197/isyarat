import type { Prediction, SequenceSample, StaticSample } from "./types";

/**
 * Pengenalan huruf/statis memakai k-NN dengan pembobotan jarak.
 *
 * Kenapa bukan neural network? Karena untuk puluhan contoh per kelas, k-NN pada
 * landmark ternormalisasi justru lebih jujur: bisa dilatih di browser dalam
 * milidetik, transparan, dan mudah dikoreksi. Kalau nanti dataset sudah besar
 * (ribuan contoh), tinggal ganti fungsi ini dengan model TFLite — antarmukanya
 * sudah dipisah.
 */

export function euclidean(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum / Math.max(1, n));
}

export function classifyStatic(
  samples: StaticSample[],
  vector: number[],
  options: { threshold?: number; k?: number } = {},
): Prediction | null {
  if (!samples.length) return null;
  const threshold = options.threshold ?? 0.34;
  const k = options.k ?? 7;

  const scored = samples
    .map((s) => ({ label: s.label, d: euclidean(s.v, vector) }))
    .sort((a, b) => a.d - b.d);

  const nearest = scored.slice(0, k);
  const best = scored[0];
  if (!best || best.d > threshold) return null;

  const votes = new Map<string, number>();
  for (const item of nearest) {
    if (item.d > threshold) continue;
    const weight = 1 / (item.d + 0.02);
    votes.set(item.label, (votes.get(item.label) ?? 0) + weight);
  }

  let topLabel = best.label;
  let topWeight = 0;
  let total = 0;
  for (const [label, weight] of votes) {
    total += weight;
    if (weight > topWeight) {
      topWeight = weight;
      topLabel = label;
    }
  }
  if (total <= 0) return null;

  const voteShare = topWeight / total;
  const distanceQuality = Math.max(0, Math.min(1, 1 - best.d / threshold));
  const confidence = 0.45 * voteShare + 0.55 * distanceQuality;

  return { label: topLabel, confidence, distance: best.d };
}

/** DTW untuk isyarat dinamis (kata) dengan jendela band agar tidak O(n^2) penuh. */
export function dtwDistance(a: number[][], b: number[][], band = 3): number {
  const n = a.length;
  const m = b.length;
  if (!n || !m) return Number.POSITIVE_INFINITY;

  const width = Math.max(band, Math.abs(n - m));
  const inf = Number.POSITIVE_INFINITY;
  const prev = new Float64Array(m + 1).fill(inf);
  const curr = new Float64Array(m + 1).fill(inf);
  prev[0] = 0;

  for (let i = 1; i <= n; i++) {
    curr.fill(inf);
    const lo = Math.max(1, i - width);
    const hi = Math.min(m, i + width);
    for (let j = lo; j <= hi; j++) {
      const cost = euclidean(a[i - 1], b[j - 1]);
      const best = Math.min(prev[j], curr[j - 1], prev[j - 1]);
      curr[j] = cost + (best === inf ? 0 : best);
    }
    prev.set(curr);
  }

  const total = prev[m];
  if (!Number.isFinite(total)) return Number.POSITIVE_INFINITY;
  return total / (n + m);
}

export function classifySequence(
  samples: SequenceSample[],
  frames: number[][],
  options: { threshold?: number; minMargin?: number } = {},
): Prediction | null {
  if (!samples.length || frames.length < 6) return null;
  const threshold = options.threshold ?? 1.15;
  const minMargin = options.minMargin ?? 0.12;

  let bestPerLabel = new Map<string, number>();
  for (const sample of samples) {
    if (sample.frames.length < 4) continue;
    const d = dtwDistance(frames, sample.frames);
    const current = bestPerLabel.get(sample.label);
    if (current === undefined || d < current) bestPerLabel.set(sample.label, d);
  }

  const ranked = [...bestPerLabel.entries()].sort((a, b) => a[1] - b[1]);
  if (!ranked.length) return null;

  const [label, distance] = ranked[0];
  if (distance > threshold) return null;

  if (ranked.length > 1) {
    const secondDistance = ranked[1][1];
    const margin = (secondDistance - distance) / Math.max(secondDistance, 1e-5);
    if (margin < minMargin) return null;
  }

  const confidence = Math.max(0, Math.min(1, 1 - distance / threshold));
  return { label, confidence, distance };
}

/** Rata-rata per-frame, dipakai untuk meringkas contoh statis hasil rekaman. */
export function meanVector(vectors: number[][]): number[] {
  if (!vectors.length) return [];
  const out = new Array(vectors[0].length).fill(0);
  for (const v of vectors) for (let i = 0; i < out.length; i++) out[i] += v[i] ?? 0;
  for (let i = 0; i < out.length; i++) out[i] /= vectors.length;
  return out;
}

/** Buang frame duplikat/berhenti supaya contoh kata lebih bersih. */
export function resampleSequence(frames: number[][], target = 18): number[][] {
  if (frames.length <= target) return frames;
  const out: number[][] = [];
  const step = (frames.length - 1) / (target - 1);
  for (let i = 0; i < target; i++) out.push(frames[Math.round(i * step)]);
  return out;
}
