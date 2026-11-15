"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "starting" | "live" | "error";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }, []);

  const start = useCallback(
    async (nextFacing?: "user" | "environment") => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError("Browser ini tidak mendukung kamera. Coba Chrome/Safari terbaru.");
        setStatus("error");
        return;
      }
      if (!window.isSecureContext) {
        setError("Kamera butuh HTTPS atau localhost.");
        setStatus("error");
        return;
      }

      const target = nextFacing ?? facing;
      setError(null);
      setStatus("starting");

      try {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: target },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = media;
        setStream(media);
        const video = videoRef.current;
        if (video) {
          video.srcObject = media;
          await video.play();
        }
        setStatus("live");
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        setError(
          name === "NotAllowedError"
            ? "Izin kamera ditolak. Aktifkan izin kamera di setelan browser."
            : name === "NotReadableError"
              ? "Kamera sedang dipakai aplikasi lain."
              : name === "NotFoundError"
                ? "Tidak ada kamera terdeteksi."
                : "Kamera gagal dibuka.",
        );
        setStatus("error");
      }
    },
    [facing],
  );

  const switchFacing = useCallback(async () => {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    await start(next);
  }, [facing, start]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { videoRef, stream, status, error, facing, start, stop, switchFacing };
}
