export function HoldRing({ progress, size = 46 }: { progress: number; size?: number }) {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = 19;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width={size} height={size} viewBox="0 0 46 46" aria-hidden className="shrink-0">
      <circle cx="23" cy="23" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
      <circle
        cx="23"
        cy="23"
        r={radius}
        fill="none"
        stroke="#7df3c5"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
        transform="rotate(-90 23 23)"
        style={{ transition: "stroke-dashoffset 90ms linear" }}
      />
      <circle cx="23" cy="23" r="2.4" fill={clamped >= 1 ? "#7df3c5" : "rgba(255,255,255,0.4)"} />
    </svg>
  );
}
