"use client";

import { useEffect, useState } from "react";
import { History, RefreshCw, Trash2 } from "lucide-react";
import { clearHistory, readHistory } from "@/lib/storage";
import type { HistoryEntry } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function HistoryPanel() {
  const [items, setItems] = useState<HistoryEntry[]>([]);

  const refresh = () => setItems(readHistory());

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted" />
          <p className="text-sm font-medium">Riwayat lokal</p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={refresh}
            className="btn btn-ghost btn-sm btn-icon"
            aria-label="Muat ulang riwayat"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!items.length) return;
              if (!window.confirm("Hapus seluruh riwayat transkrip lokal?")) return;
              clearHistory();
              refresh();
            }}
            disabled={!items.length}
            className="btn btn-ghost btn-sm btn-icon"
            aria-label="Hapus riwayat"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-white/10 px-2.5 py-3 text-[0.7rem] leading-relaxed text-muted/60">
          Belum ada transkrip tersimpan. Tekan “Simpan” di studio atau upload video.
        </p>
      ) : (
        <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {items.slice(0, 8).map((item) => (
            <li key={item.id} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="chip !h-5 !px-1.5 !text-[0.52rem]">{item.source}</span>
                <span className="font-mono text-[0.56rem] text-muted/60">{formatDate(item.at)}</span>
              </div>
              <p className="mt-1 line-clamp-2 font-mono text-[0.7rem] leading-relaxed text-muted">
                {item.text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
