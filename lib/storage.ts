"use client";

import type { HistoryEntry, Profile } from "./types";

const PROFILE_KEY = "isyarat.profile.v1";
const HISTORY_KEY = "isyarat.history.v1";
const MAX_HISTORY = 24;

export function createEmptyProfile(name = "Profil saya"): Profile {
  const now = Date.now();
  return {
    version: 1,
    name,
    createdAt: now,
    updatedAt: now,
    letters: [],
    words: [],
  };
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((n) => typeof n === "number" && Number.isFinite(n));
}

/** Validasi longgar: menerima file ekspor lama / hasil edit manual tanpa meledak. */
export function sanitizeProfile(input: unknown): Profile | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const base = createEmptyProfile(typeof raw.name === "string" ? raw.name : "Profil impor");

  const letters = Array.isArray(raw.letters)
    ? raw.letters
        .map((item, i) => {
          if (!item || typeof item !== "object") return null;
          const s = item as Record<string, unknown>;
          if (typeof s.label !== "string" || !s.label.trim()) return null;
          if (!isNumberArray(s.v) || s.v.length < 42) return null;
          return {
            id: typeof s.id === "string" ? s.id : `imp-${i}-${Date.now()}`,
            label: s.label.trim().toUpperCase(),
            v: s.v.slice(0, 42),
            createdAt: typeof s.createdAt === "number" ? s.createdAt : Date.now(),
          };
        })
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
    : [];

  const words = Array.isArray(raw.words)
    ? raw.words
        .map((item, i) => {
          if (!item || typeof item !== "object") return null;
          const s = item as Record<string, unknown>;
          if (typeof s.label !== "string" || !s.label.trim()) return null;
          if (!Array.isArray(s.frames)) return null;
          const frames = s.frames.filter(isNumberArray).map((f) => f.slice(0, 42));
          if (frames.length < 4) return null;
          return {
            id: typeof s.id === "string" ? s.id : `imw-${i}-${Date.now()}`,
            label: s.label.trim().toUpperCase(),
            frames,
            createdAt: typeof s.createdAt === "number" ? s.createdAt : Date.now(),
          };
        })
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
    : [];

  return {
    ...base,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : base.name,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : base.createdAt,
    updatedAt: Date.now(),
    letters,
    words,
  };
}

export function readProfile(): Profile {
  if (typeof window === "undefined") return createEmptyProfile();
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return createEmptyProfile();
    const parsed = sanitizeProfile(JSON.parse(raw));
    return parsed ?? createEmptyProfile();
  } catch {
    return createEmptyProfile();
  }
}

export function writeProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, updatedAt: Date.now() }));
  } catch {
    // localStorage penuh / diblokir — biarkan sesi tetap jalan di memori.
  }
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_KEY);
}

export function readHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is HistoryEntry => {
        if (!item || typeof item !== "object") return false;
        const h = item as Record<string, unknown>;
        return typeof h.id === "string" && typeof h.text === "string" && typeof h.at === "number";
      })
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

export function addHistory(entry: Omit<HistoryEntry, "id" | "at">): HistoryEntry[] {
  const next: HistoryEntry[] = [
    { ...entry, id: crypto.randomUUID(), at: Date.now() },
    ...readHistory(),
  ].slice(0, MAX_HISTORY);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* diabaikan */
  }
  return next;
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(HISTORY_KEY);
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
