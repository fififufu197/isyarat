"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { drawHandSkeleton } from "@/lib/draw";
import { loadLandmarker, type LandmarkerStatus } from "@/lib/engine";
import type { Pt } from "@/lib/types";

/**
 * Loop deteksi landmark untuk kebutuhan perekaman dataset.
 * Tidak melakukan pengenalan — hanya menyediakan landmark terbaru.
 */
export function useLandmarkStream(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  active: boolean,
) {
  const [status, setStatus] = useState<LandmarkerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [handCount, setHandCount] = useState(0);
  const handsRef = useRef<Pt[][]>([]);
  const countRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setStatus("idle");
      setHandCount(0);
      return;
    }

    let cancelled = false;
    let raf = 0;
    let lastTs = 0;
    let lastDetect = 0;

    const run = async () => {
      setStatus("loading");
      setError(null);
      try {
        const landmarker = await loadLandmarker();
        if (cancelled) return;
        setStatus("ready");

        const tick = (now: number) => {
          if (cancelled) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;

          if (now - lastDetect >= 33 && video && video.readyState >= 2 && video.videoWidth) {
            lastDetect = now;
            try {
              lastTs = Math.max(lastTs + 1, Math.round(now));
              const result = landmarker.detectForVideo(video, lastTs);
              const hands = (result.landmarks ?? []).map((hand) =>
                hand.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0 })),
              );
              handsRef.current = hands;

              if (hands.length !== countRef.current) {
                countRef.current = hands.length;
                setHandCount(hands.length);
              }

              if (canvas) {
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                }
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  for (const hand of hands) drawHandSkeleton(ctx, hand);
                }
              }
            } catch {
              // frame sesekali gagal — abaikan
            }
          }

          raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Model gagal dimuat.");
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      handsRef.current = [];
      countRef.current = 0;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active, videoRef, canvasRef]);

  return { status, error, handCount, handsRef };
}
