"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function cloudEnabled(): boolean {
  return Boolean(url && anonKey);
}

export function getSupabase(): SupabaseClient | null {
  if (!cloudEnabled()) return null;
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

export async function getCurrentEmail(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user?.email ?? null;
}

export async function signInWithEmail(email: string): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase belum dikonfigurasi." };
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/latih` },
  });
  return { error: error?.message ?? null };
}

export async function signOutCloud(): Promise<void> {
  await getSupabase()?.auth.signOut();
}

export type CloudProfileRow = {
  id: string;
  name: string;
  updated_at: string;
  data: Profile;
};

export async function pushProfileToCloud(profile: Profile): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase belum dikonfigurasi." };
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) return { error: "Masuk dulu untuk menyimpan ke cloud." };

  const { error } = await sb.from("sign_profiles").upsert(
    {
      user_id: user.id,
      name: profile.name || "Profil saya",
      data: profile,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,name" },
  );
  return { error: error?.message ?? null };
}

export async function listCloudProfiles(): Promise<{ rows: CloudProfileRow[]; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { rows: [], error: "Supabase belum dikonfigurasi." };
  const { data, error } = await sb
    .from("sign_profiles")
    .select("id, name, updated_at, data")
    .order("updated_at", { ascending: false });
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as CloudProfileRow[], error: null };
}

export async function saveTranscriptToCloud(
  text: string,
  source: "kamera" | "video" | "manual",
): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase belum dikonfigurasi." };
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return { error: "Masuk dulu untuk menyimpan transkrip." };
  const { error } = await sb.from("transcripts").insert({
    user_id: userData.user.id,
    text,
    source,
  });
  return { error: error?.message ?? null };
}
