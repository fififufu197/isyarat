export type Pt = { x: number; y: number; z: number };

export type Handedness = "Left" | "Right";

export type DetectedHand = {
  landmarks: Pt[];
  handedness: Handedness;
  score: number;
};

/** Satu contoh isyarat statis (huruf). `v` adalah vektor fitur 42 dimensi. */
export type StaticSample = {
  id: string;
  label: string;
  v: number[];
  createdAt: number;
};

/** Satu contoh isyarat dinamis (kata): rangkaian frame fitur. */
export type SequenceSample = {
  id: string;
  label: string;
  frames: number[][];
  createdAt: number;
};

export type Profile = {
  version: 1;
  name: string;
  createdAt: number;
  updatedAt: number;
  letters: StaticSample[];
  words: SequenceSample[];
};

export type Prediction = {
  label: string;
  confidence: number;
  distance: number;
};

export type EngineEvent = {
  label: string;
  confidence: number;
  kind: "letter" | "word";
  at: number;
};

export type EngineFrame = {
  hands: number;
  label: string | null;
  confidence: number;
  hold: number;
  fps: number;
  locked: boolean;
};

export type HistoryEntry = {
  id: string;
  source: "kamera" | "video" | "manual";
  text: string;
  at: number;
};

export type TranscriptSegment = {
  start: number;
  end: number;
  label: string;
  confidence: number;
};
