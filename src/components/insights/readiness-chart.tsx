import type { ReadinessSnapshot } from "@/lib/db/readiness-snapshots";

const W = 560;
const H = 160;
const PAD = { top: 16, right: 40, bottom: 26, left: 30 };

function fmt(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * Readiness over time - one series, so no legend: the card title names it.
 * X is real time (a month's gap looks like a month), Y is the fixed 0-100
 * scale every Work-ly score uses, so a climb from 54 to 71 looks as big as
 * it is. Each point carries a native tooltip; the list under the chart is
 * the table view.
 */
export function ReadinessChart({ snapshots }: { snapshots: ReadinessSnapshot[] }) {
  if (snapshots.length === 0) return null;
  const times = snapshots.map((s) => new Date(s.createdAt).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const span = Math.max(t1 - t0, 1);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (t: number) => (snapshots.length === 1 ? PAD.left + innerW / 2 : PAD.left + ((t - t0) / span) * innerW);
  const y = (v: number) => PAD.top + (1 - Math.max(0, Math.min(100, v)) / 100) * innerH;

  const points = snapshots.map((s, i) => ({ s, px: x(times[i]), py: y(s.readinessScore) }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(" ");
  const area =
    points.length > 1
      ? `${line} L${points[points.length - 1].px.toFixed(1)},${y(0).toFixed(1)} L${points[0].px.toFixed(1)},${y(0).toFixed(1)} Z`
      : "";
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Readiness from ${snapshots[0].readinessScore} to ${last.s.readinessScore} out of 100`}
      className="h-auto w-full overflow-visible text-primary"
    >
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} strokeDasharray={v === 0 ? undefined : "2 4"} />
          <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
            {v}
          </text>
        </g>
      ))}
      {area && <path d={area} className="fill-primary/10" />}
      {points.length > 1 && <path d={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
      {points.map((p, i) => (
        <g key={p.s.id}>
          <circle cx={p.px} cy={p.py} r={12} fill="transparent">
            <title>{`${fmt(p.s.createdAt)}: ${p.s.readinessScore}/100${p.s.source === "monthly" ? " (monthly re-check)" : ""}`}</title>
          </circle>
          <circle
            cx={p.px}
            cy={p.py}
            r={i === points.length - 1 ? 5 : 3.5}
            className={i === points.length - 1 ? "fill-primary stroke-card" : "fill-card"}
            stroke={i === points.length - 1 ? undefined : "currentColor"}
            strokeWidth={2}
            pointerEvents="none"
          />
        </g>
      ))}
      <text x={last.px + 9} y={last.py} dy="0.32em" className="fill-foreground text-[12px] font-semibold tabular-nums">
        {last.s.readinessScore}
      </text>
      <text x={points[0].px} y={H - 6} textAnchor={points.length === 1 ? "middle" : "start"} className="fill-muted-foreground text-[10px]">
        {fmt(points[0].s.createdAt)}
      </text>
      {points.length > 1 && (
        <text x={last.px} y={H - 6} textAnchor="end" className="fill-muted-foreground text-[10px]">
          {fmt(last.s.createdAt)}
        </text>
      )}
    </svg>
  );
}
