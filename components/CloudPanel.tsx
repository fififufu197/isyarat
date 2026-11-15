"use client";

import { useCallback, useEffect, useState } from "react";
import { Cloud, CloudOff, DownloadCloud, Loader2, LogOut, RefreshCw, UploadCloud } from "lucide-react";
import {
  cloudEnabled,
  getCurrentEmail,
  listCloudProfiles,
  pushProfileToCloud,
  signInWithEmail,
  signOutCloud,
  type CloudProfileRow,
} from "@/lib/supabase";
import { sanitizeProfile } from "@/lib/storage";
import type { Profile } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export function CloudPanel({
  profile,
  onPulled,
}: {
  profile: Profile | null;
  onPulled: (profile: Profile) => void;
}) {
  const configured = cloudEnabled();
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CloudProfileRow[]>([]);

  const loadUser = useCallback(async () => {
    if (!configured) return;
    setBusy("user");
    try {
      setUserEmail(await getCurrentEmail());
    } finally {
      setBusy(null);
    }
  }, [configured]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const refreshRows = useCallback(async () => {
    setBusy("rows");
    const result = await listCloudProfiles();
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRows(result.rows);
  }, []);

  useEffect(() => {
    if (userEmail) void refreshRows();
  }, [userEmail, refreshRows]);

  const sendLink = async () => {
    setError(null);
    setMessage(null);
    if (!email.includes("@")) {
      setError("Masukkan email yang valid.");
      return;
    }
    setBusy("login");
    const result = await signInWithEmail(email.trim());
    setBusy(null);
    if (result.error) setError(result.error);
    else setMessage("Tautan masuk dikirim. Cek inbox (dan folder spam).");
  };

  const push = async () => {
    if (!profile) return;
    setBusy("push");
    setError(null);
    setMessage(null);
    const result = await pushProfileToCloud(profile);
    setBusy(null);
    if (result.error) setError(result.error);
    else {
      setMessage("Profil tersimpan ke cloud.");
      void refreshRows();
    }
  };

  const pull = async (row: CloudProfileRow) => {
    const parsed = sanitizeProfile(row.data);
    if (!parsed) {
      setError("Isi profil di cloud tidak valid.");
      return;
    }
    if (!window.confirm(`Tarik profil "${row.name}" dan ganti data lokal saat ini?`)) return;
    onPulled(parsed);
    setMessage(`Profil "${row.name}" dimuat ke perangkat ini.`);
  };

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-violet">
            <Cloud className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Sinkron cloud</p>
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-muted/60">
              opsional · supabase
            </p>
          </div>
        </div>
        <span className={cn("chip", configured ? "chip-violet" : "")}>{configured ? "aktif" : "belum disetel"}</span>
      </div>

      {!configured ? (
        <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
          <p className="flex items-start gap-2">
            <CloudOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Tanpa Supabase, semua data tersimpan di localStorage perangkat ini. Untuk backup/antar-perangkat:
          </p>
          <ol className="ml-6 list-decimal space-y-1 text-muted/80">
            <li>Buat project gratis di supabase.com.</li>
            <li>Jalankan SQL di <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[0.65rem]">supabase/schema.sql</code>.</li>
            <li>
              Isi <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[0.65rem]">NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
              <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[0.65rem]">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> di Vercel.
            </li>
          </ol>
        </div>
      ) : userEmail ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
            <span className="truncate font-mono text-[0.68rem] text-muted">{userEmail}</span>
            <button
              type="button"
              onClick={async () => {
                await signOutCloud();
                setUserEmail(null);
                setRows([]);
              }}
              className="inline-flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted hover:text-danger"
            >
              <LogOut className="h-3 w-3" />
              keluar
            </button>
          </div>

          <button
            type="button"
            onClick={() => void push()}
            disabled={busy === "push" || !profile}
            className="btn btn-ghost btn-sm w-full"
          >
            {busy === "push" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
            Unggah profil ini ke cloud
          </button>

          <div className="flex items-center justify-between pt-1">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted/60">profil di cloud</p>
            <button
              type="button"
              onClick={() => void refreshRows()}
              className="inline-flex items-center gap-1 font-mono text-[0.58rem] text-muted hover:text-ink"
            >
              <RefreshCw className={cn("h-3 w-3", busy === "rows" && "animate-spin")} />
              muat ulang
            </button>
          </div>

          <div className="space-y-1.5">
            {rows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 px-2.5 py-2 text-[0.7rem] text-muted/60">
                Belum ada profil di cloud.
              </p>
            ) : (
              rows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[0.72rem] text-ink">{row.name}</p>
                    <p className="font-mono text-[0.56rem] text-muted/60">
                      {row.data?.letters?.length ?? 0} huruf · {row.data?.words?.length ?? 0} kata ·{" "}
                      {formatDate(new Date(row.updated_at).getTime())}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void pull(row)}
                    className="btn btn-ghost btn-sm shrink-0"
                  >
                    <DownloadCloud className="h-3 w-3" />
                    Tarik
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-xs leading-relaxed text-muted">
            Masuk dengan magic link (tanpa password). Profil isyarat & transkrip akan tersimpan ke akun Supabase-mu.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@contoh.com"
              className="input h-9 text-xs"
              autoComplete="email"
            />
            <button type="button" onClick={() => void sendLink()} disabled={busy === "login"} className="btn btn-ghost btn-sm shrink-0">
              {busy === "login" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Kirim tautan"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => void loadUser()}
            className="inline-flex items-center gap-1 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted/60 hover:text-ink"
          >
            <RefreshCw className={cn("h-3 w-3", busy === "user" && "animate-spin")} />
            sudah klik tautannya? muat status
          </button>
        </div>
      )}

      {(message || error) && (
        <p className={cn("mt-2 text-[0.68rem] leading-relaxed", error ? "text-danger" : "text-accent")}>
          {error ?? message}
        </p>
      )}
    </div>
  );
}
