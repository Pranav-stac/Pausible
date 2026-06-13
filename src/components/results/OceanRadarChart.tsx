"use client";

import type { TraitKey } from "@/lib/scoring/persona-types";
import { TRAIT_LABELS } from "@/lib/scoring/persona-types";

const TRAIT_ORDER: TraitKey[] = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
];

type Props = {
  userScores: Record<TraitKey, number>;
  centroidScores: Record<TraitKey, number>;
  size?: number;
  accent?: string;
};

function polarPoint(cx: number, cy: number, r: number, angleRad: number) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function seriesPath(
  cx: number,
  cy: number,
  maxR: number,
  scores: Record<TraitKey, number>,
  n: number,
): string {
  const points = TRAIT_ORDER.map((trait, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = ((scores[trait] ?? 1) / 7) * maxR;
    return polarPoint(cx, cy, r, angle);
  });
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
}

export function OceanRadarChart({ userScores, centroidScores, size = 220, accent = "#2563eb" }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;
  const n = TRAIT_ORDER.length;

  const gridLevels = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={TRAIT_ORDER.map((_, i) => {
              const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
              const r = (level / 7) * maxR;
              const p = polarPoint(cx, cy, r, angle);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        ))}
        {TRAIT_ORDER.map((_, i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
          const p = polarPoint(cx, cy, maxR, angle);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth={1} />;
        })}
        <path
          d={seriesPath(cx, cy, maxR, centroidScores, n)}
          fill={`${accent}22`}
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <path
          d={seriesPath(cx, cy, maxR, userScores, n)}
          fill={`${accent}33`}
          stroke={accent}
          strokeWidth={2}
        />
        {TRAIT_ORDER.map((trait, i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
          const p = polarPoint(cx, cy, maxR + 14, angle);
          const short = TRAIT_LABELS[trait].split(" ")[0];
          return (
            <text
              key={trait}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-500 text-[9px] font-semibold"
            >
              {short}
            </text>
          );
        })}
      </svg>
      <div className="flex gap-4 text-[10px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ backgroundColor: accent }} />
          You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded border border-dashed border-slate-400" />
          Profile pattern
        </span>
      </div>
    </div>
  );
}
