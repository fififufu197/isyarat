import type { Pt } from "./types";

export const WRIST = 0;
export const MIDDLE_MCP = 9;

/** Koneksi skeleton tangan (index landmark MediaPipe). */
export const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export const FINGER_TIPS = [4, 8, 12, 16, 20];

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angleAt(a: Pt, b: Pt, c: Pt): number {
  const ax = a.x - b.x;
  const ay = a.y - b.y;
  const cx = c.x - b.x;
  const cy = c.y - b.y;
  const na = Math.hypot(ax, ay);
  const nc = Math.hypot(cx, cy);
  if (na < 1e-6 || nc < 1e-6) return 0;
  const cos = Math.min(1, Math.max(-1, (ax * cx + ay * cy) / (na * nc)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Normalisasi landmark ke ruang kanonik:
 * 1. translasi ke pergelangan tangan
 * 2. skala berdasarkan jarak pergelangan -> pangkal jari tengah
 * 3. rotasi sehingga arah pergelangan -> jari tengah selalu menghadap atas
 *
 * Hasilnya 21 titik x (x, y) = 42 dimensi. Z sengaja dibuang karena paling
 * tidak stabil antar perangkat. Rotasi membuat pengguna bebas memegang tangan
 * di sudut mana pun.
 */
export function normalizeHand(landmarks: Pt[], mirror = false): Float32Array {
  const pts = landmarks.map((p) => ({ x: mirror ? -p.x : p.x, y: p.y }));
  const w = pts[WRIST] ?? { x: 0, y: 0 };

  let dx = (pts[MIDDLE_MCP]?.x ?? w.x) - w.x;
  let dy = (pts[MIDDLE_MCP]?.y ?? w.y - 1) - w.y;
  let scale = Math.hypot(dx, dy);

  if (!Number.isFinite(scale) || scale < 1e-5) {
    const spread = pts.reduce((m, p) => Math.max(m, Math.hypot(p.x - w.x, p.y - w.y)), 0);
    scale = spread || 1e-5;
    dx = 0;
    dy = -1;
  }

  const angle = Math.atan2(dy, dx);
  const rot = -(angle + Math.PI / 2);
  const c = Math.cos(rot);
  const s = Math.sin(rot);

  const out = new Float32Array(42);
  for (let i = 0; i < 21; i++) {
    const p = pts[i] ?? w;
    const x = (p.x - w.x) / scale;
    const y = (p.y - w.y) / scale;
    out[i * 2] = x * c - y * s;
    out[i * 2 + 1] = x * s + y * c;
  }
  return out;
}

/**
 * Dua varian fitur: tangan apa adanya dan versi cermin. Dataset menyimpan
 * keduanya supaya pengguna kidal dan normal sama-sama dikenali tanpa setelan.
 */
export function featureVariants(landmarks: Pt[]): [number[], number[]] {
  return [Array.from(normalizeHand(landmarks, false)), Array.from(normalizeHand(landmarks, true))];
}

export function toVector(landmarks: Pt[]): number[] {
  return Array.from(normalizeHand(landmarks, false));
}

export type HandGeometry = {
  /** true = jari lurus/terbuka, urutan: ibu jari, telunjuk, tengah, manis, kelingking */
  extended: boolean[];
  /** rasio 0..1 seberapa lurus tiap jari */
  curl: number[];
  scale: number;
  /** jarak ujung ibu jari ke pangkal telunjuk, ternormalisasi */
  thumbSpread: number;
  /** sudut antara telunjuk dan jari tengah (0..1, 1 = lebar) */
  spreadIndexMiddle: number;
  /** sudut ibu jari vs telunjuk (0..1, 1 = membuka lebar) */
  thumbIndexAngle: number;
  /** jarak ujung ibu jari ke ujung telunjuk, ternormalisasi */
  thumbIndexTip: number;
  /** jarak ujung ibu jari ke ujung jari tengah, ternormalisasi */
  thumbMiddleTip: number;
  /** rata-rata jarak ujung jari ke ujung ibu jari, ternormalisasi */
  tipsToThumb: number;
  /** sudut lipatan tiap jari (derajat) */
  pipAngle: number[];
};

const FINGERS = {
  thumb: { chain: [1, 2, 3, 4], pip: 3, tip: 4 },
  index: { chain: [5, 6, 7, 8], pip: 6, tip: 8 },
  middle: { chain: [9, 10, 11, 12], pip: 10, tip: 12 },
  ring: { chain: [13, 14, 15, 16], pip: 14, tip: 16 },
  pinky: { chain: [17, 18, 19, 20], pip: 18, tip: 20 },
} as const;

export function handGeometry(lm: Pt[]): HandGeometry {
  const w = lm[WRIST];
  const scale = Math.max(dist(w, lm[MIDDLE_MCP]), 1e-5);

  const pipAngle: number[] = [];
  const extended: boolean[] = [];
  const curl: number[] = [];

  (Object.keys(FINGERS) as Array<keyof typeof FINGERS>).forEach((name, i) => {
    const finger = FINGERS[name];
    const [mcpIdx] = finger.chain;
    const mcp = lm[mcpIdx];
    const pip = lm[finger.pip];
    const tip = lm[finger.tip];
    if (!mcp || !pip || !tip) {
      pipAngle.push(0);
      extended.push(false);
      curl.push(1);
      return;
    }

    if (name === "thumb") {
      const tipAway = dist(tip, lm[5]) / scale;
      const openness = angleAt(lm[1], mcp, tip) / 180;
      const e = tipAway > 0.92 && openness > 0.35;
      extended.push(e);
      pipAngle.push(openness * 180);
      curl.push(1 - Math.min(1, tipAway / 1.4));
      return;
    }

    const angle = angleAt(mcp, pip, tip);
    const straight = angle / 180;
    const reach = dist(w, tip) / Math.max(dist(w, pip), 1e-5);
    const e = angle > 150 && reach > 1.12;
    pipAngle.push(angle);
    extended.push(e);
    // kurva halus: 90 derajat = 1 (terlipat penuh), 175 derajat = 0
    curl.push(Math.min(1, Math.max(0, (175 - angle) / 85)));
  });

  const tipDist = (i: number) => dist(lm[4], lm[i]) / scale;
  const thumbIndexTip = tipDist(8);
  const thumbMiddleTip = tipDist(12);
  const tipsToThumb =
    (thumbIndexTip + thumbMiddleTip + tipDist(16) + tipDist(20)) / 4;

  const indexDir = {
    x: lm[8].x - lm[5].x,
    y: lm[8].y - lm[5].y,
  };
  const middleDir = {
    x: lm[12].x - lm[9].x,
    y: lm[12].y - lm[9].y,
  };
  const thumbDir = { x: lm[4].x - lm[2].x, y: lm[4].y - lm[2].y };
  const spreadIndexMiddle = angleBetween(indexDir, middleDir) / 45;
  const thumbIndexAngle = angleBetween(thumbDir, indexDir) / 60;

  return {
    extended,
    curl,
    scale,
    thumbSpread: dist(lm[4], lm[5]) / scale,
    spreadIndexMiddle: Math.min(1, spreadIndexMiddle),
    thumbIndexAngle: Math.min(1, thumbIndexAngle),
    thumbIndexTip,
    thumbMiddleTip,
    tipsToThumb,
    pipAngle,
  };
}

function angleBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const na = Math.hypot(a.x, a.y);
  const nb = Math.hypot(b.x, b.y);
  if (na < 1e-6 || nb < 1e-6) return 0;
  const cos = Math.min(1, Math.max(-1, (a.x * b.x + a.y * b.y) / (na * nb)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Mesin "cepat" berbasis aturan geometri. Tidak butuh data latih, langsung
 * jalan saat aplikasi dibuka. Hanya mencakup bentuk tangan yang paling
 * berbeda satu sama lain; sisanya perlu mode terlatih.
 */
export function quickClassify(geo: HandGeometry): { label: string; confidence: number } | null {
  const [thumb, index, middle, ring, pinky] = geo.extended;
  const fourExtended = index && middle && ring && pinky;
  const fourCurled = !index && !middle && !ring && !pinky;

  type Rule = {
    label: string;
    /** pola ekstensi wajib: [ibu jari, telunjuk, tengah, manis, kelingking] */
    pattern: boolean[];
    /** skor tambahan 0..1 */
    verify: () => number;
  };

  const rules: Rule[] = [
    {
      label: "SPASI",
      pattern: [true, true, true, true, true],
      verify: () => 0.7 + 0.3 * Math.min(1, geo.spreadIndexMiddle),
    },
    {
      label: "B",
      pattern: [false, true, true, true, true],
      verify: () => 0.7 + 0.3 * (1 - Math.min(1, geo.spreadIndexMiddle)),
    },
    {
      label: "V",
      pattern: [false, true, true, false, false],
      verify: () => 0.55 + 0.45 * Math.min(1, geo.spreadIndexMiddle),
    },
    {
      label: "W",
      pattern: [false, true, true, true, false],
      verify: () => 0.7 + 0.3 * Math.min(1, geo.spreadIndexMiddle),
    },
    {
      label: "L",
      pattern: [true, true, false, false, false],
      verify: () => 0.55 + 0.45 * Math.min(1, geo.thumbIndexAngle),
    },
    {
      label: "Y",
      pattern: [true, false, false, false, true],
      verify: () => (geo.thumbSpread > 1.1 ? 1 : 0.6),
    },
    {
      label: "I",
      pattern: [false, false, false, false, true],
      verify: () => (geo.curl[1] > 0.7 && geo.curl[2] > 0.7 ? 1 : 0.65),
    },
    {
      label: "D",
      pattern: [false, true, false, false, false],
      verify: () => (geo.thumbMiddleTip < 0.62 ? 1 : 0.5),
    },
    {
      label: "A",
      pattern: [false, false, false, false, false],
      verify: () => {
        const thumbAway = geo.thumbSpread > 0.88 && geo.tipsToThumb > 0.55;
        return thumbAway ? 1 : 0.4;
      },
    },
    {
      label: "O",
      pattern: [false, false, false, false, false],
      verify: () => (geo.tipsToThumb < 0.42 ? 1 : 0.35),
    },
  ];

  let best: { label: string; score: number } | null = null;
  let second = 0;

  for (const rule of rules) {
    let match = 0;
    for (let i = 0; i < 5; i++) if (rule.pattern[i] === geo.extended[i]) match++;
    if (match < 5) continue;
    const score = 0.78 + 0.22 * rule.verify();
    if (!best || score > best.score) {
      if (best) second = Math.max(second, best.score);
      best = { label: rule.label, score };
    } else {
      second = Math.max(second, score);
    }
  }

  if (!best) return null;
  if (best.score < 0.8) return null;
  if (best.score - second < 0.12) return null;

  return { label: best.label, confidence: Math.min(0.99, best.score) };
}
