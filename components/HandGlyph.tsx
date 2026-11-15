import { cn } from "@/lib/utils";

/** 21 titik tangan (urutan sama dengan MediaPipe Hands). */
const POINTS: Array<[number, number]> = [
  [108, 224],
  [72, 208],
  [52, 190],
  [36, 174],
  [26, 158],
  [82, 166],
  [78, 136],
  [76, 114],
  [75, 94],
  [104, 160],
  [104, 126],
  [104, 100],
  [104, 78],
  [124, 165],
  [131, 134],
  [135, 111],
  [138, 91],
  [142, 176],
  [153, 152],
  [159, 134],
  [164, 118],
];

const LINKS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const TIPS = new Set([4, 8, 12, 16, 20]);

export function HandGlyph({
  className,
  pulse = false,
  dim = false,
}: {
  className?: string;
  pulse?: boolean;
  dim?: boolean;
}) {
  return (
    <svg viewBox="0 0 220 260" className={cn("overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id="hand-line" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7df3c5" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#9a8bff" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {LINKS.map(([a, b], i) => {
        const [x1, y1] = POINTS[a];
        const [x2, y2] = POINTS[b];
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="url(#hand-line)"
            strokeWidth={dim ? 1.1 : 1.7}
            strokeLinecap="round"
            opacity={dim ? 0.45 : 0.85}
          />
        );
      })}

      {POINTS.map(([x, y], i) => {
        const tip = TIPS.has(i);
        const isWrist = i === 0;
        return (
          <g key={i}>
            {pulse && (tip || isWrist) && (
              <circle cx={x} cy={y} r={tip ? 8 : 9} fill="#7df3c5" opacity="0.12">
                <animate
                  attributeName="r"
                  values={tip ? "6;11;6" : "7;12;7"}
                  dur="2.8s"
                  begin={`${i * 0.12}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.22;0.04;0.22"
                  dur="2.8s"
                  begin={`${i * 0.12}s`}
                  repeatCount="indefinite"
                />
              </circle>
            )}
            <circle
              cx={x}
              cy={y}
              r={isWrist ? 4.6 : tip ? 3.4 : 2.5}
              fill={isWrist ? "#9a8bff" : tip ? "#7df3c5" : "#e9e9f2"}
              opacity={dim ? 0.65 : 1}
            />
            {isWrist && (
              <circle cx={x} cy={y} r={8} fill="none" stroke="#9a8bff" strokeWidth="1" opacity="0.55" />
            )}
          </g>
        );
      })}
    </svg>
  );
}
