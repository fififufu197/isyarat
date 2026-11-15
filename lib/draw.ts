import { FINGER_TIPS, HAND_CONNECTIONS } from "./features";
import type { Pt } from "./types";

/** Menggambar skeleton tangan. Koordinat mengikuti video apa adanya;
 *  pencerminan ditangani oleh CSS pada elemen video + canvas. */
export function drawHandSkeleton(ctx: CanvasRenderingContext2D, hand: Pt[]): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  if (!w || !h) return;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const [a, b] of HAND_CONNECTIONS) {
    const pa = hand[a];
    const pb = hand[b];
    if (!pa || !pb) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x * w, pa.y * h);
    ctx.lineTo(pb.x * w, pb.y * h);
    const isTip = FINGER_TIPS.includes(a) || FINGER_TIPS.includes(b);
    ctx.strokeStyle = isTip ? "#7df3c5" : "rgba(125, 243, 197, 0.55)";
    ctx.lineWidth = Math.max(1.5, w * 0.0032);
    ctx.stroke();
  }

  for (let i = 0; i < hand.length; i++) {
    const p = hand[i];
    if (!p) continue;
    const tip = FINGER_TIPS.includes(i);
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, tip ? Math.max(3.5, w * 0.007) : Math.max(2, w * 0.0045), 0, Math.PI * 2);
    ctx.fillStyle = tip ? "#7df3c5" : "#ffffff";
    ctx.globalAlpha = tip ? 1 : 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const wrist = hand[0];
  if (wrist) {
    ctx.beginPath();
    ctx.arc(wrist.x * w, wrist.y * h, Math.max(5, w * 0.011), 0, Math.PI * 2);
    ctx.strokeStyle = "#9a8bff";
    ctx.lineWidth = Math.max(1.5, w * 0.0025);
    ctx.stroke();
  }
}
