import type { ReactNode } from "react";

/** Circular progress ring with content in the middle (level number, percentage, ...). */
export default function LevelRing({
  pct,
  size = 56,
  stroke = 5,
  color = "var(--xp)",
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="level-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="level-ring-bg" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, Math.max(0, pct)) / 100)}
          className="level-ring-fg"
        />
      </svg>
      <span>{children}</span>
    </div>
  );
}
