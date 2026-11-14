import React from 'react';
import type { DesignEvaluation, TelemetrySample } from '../engine/missionPhysics';

interface TradeSpaceRadar2DProps {
  evaluation: DesignEvaluation;
  telemetry?: TelemetrySample[];
}

export const TradeSpaceRadar2D: React.FC<TradeSpaceRadar2DProps> = ({ evaluation, telemetry }) => {
  const size = 210;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 72;
  const axes = evaluation.radarAxes;
  const count = axes.length;

  const getPoint = (index: number, pct: number) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    const r = (pct / 100) * radius;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  };

  const polygonPoints = axes
    .map((ax, i) => {
      const pt = getPoint(i, ax.score);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  const hasBlockers = !evaluation.canLaunch;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-cyan-300/90 font-medium">
          Coupled Margin Trade-Space
        </span>
        <span
          className={`text-[11px] font-mono-tabular font-semibold ${
            hasBlockers ? 'text-rose-400' : 'text-emerald-400'
          }`}
        >
          {hasBlockers ? `${evaluation.blockers.length} BLOCKER(S)` : 'CML NOMINAL'}
        </span>
      </div>

      <div className="flex items-center justify-center bg-[#070B13] border border-slate-800/90 rounded-lg py-2">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-44 h-44" aria-label="2D Coupled Trade-Space Radar">
          {[25, 50, 75, 100].map((ring) => {
            const pts = axes
              .map((_, i) => {
                const p = getPoint(i, ring);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              })
              .join(' ');
            return (
              <polygon
                key={ring}
                points={pts}
                fill="none"
                stroke={ring === 50 ? '#334155' : '#1E293B'}
                strokeWidth={ring === 50 ? 1 : 0.7}
                strokeDasharray={ring === 50 ? '2 2' : undefined}
              />
            );
          })}

          {axes.map((ax, i) => {
            const outer = getPoint(i, 100);
            const labelPos = getPoint(i, 121);
            return (
              <g key={ax.label}>
                <line x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#1E293B" strokeWidth={0.9} />
                <text
                  x={labelPos.x}
                  y={labelPos.y + 3}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize={9}
                  fontFamily="monospace"
                >
                  {ax.label}
                </text>
              </g>
            );
          })}

          <polygon
            points={polygonPoints}
            fill={hasBlockers ? '#F43F5E' : '#38BDF8'}
            fillOpacity={0.22}
            stroke={hasBlockers ? '#FB7185' : '#38BDF8'}
            strokeWidth={1.8}
          />

          {axes.map((ax, i) => {
            const pt = getPoint(i, ax.score);
            return (
              <circle
                key={`dot-${ax.label}`}
                cx={pt.x}
                cy={pt.y}
                r={3}
                fill={ax.score < 35 ? '#FB7185' : '#38BDF8'}
              />
            );
          })}
        </svg>
      </div>

      {/* Live Telemetry Curve when in Simulation */}
      {telemetry && telemetry.length > 1 && (
        <div className="bg-[#070B13] border border-slate-800/90 rounded-lg p-2.5">
          <div className="flex items-center justify-between text-[10px] font-mono-tabular text-slate-400 mb-1.5">
            <span>POWER SOC &amp; SCIENCE CURVE</span>
            <span>
              <span className="text-emerald-400">■ Batt</span>{' '}
              <span className="text-cyan-400 ml-2">■ Sci</span>
            </span>
          </div>
          <svg viewBox="0 0 260 64" className="w-full h-14">
            <line x1={0} y1={32} x2={260} y2={32} stroke="#1E293B" strokeDasharray="3 3" />
            <polyline
              fill="none"
              stroke="#10B981"
              strokeWidth={1.5}
              points={telemetry
                .map((s, idx) => {
                  const x = (idx / Math.max(1, telemetry.length - 1)) * 260;
                  const y = 60 - (Math.min(100, s.batterySocPct) / 100) * 54;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(' ')}
            />
            <polyline
              fill="none"
              stroke="#38BDF8"
              strokeWidth={1.6}
              points={telemetry
                .map((s, idx) => {
                  const x = (idx / Math.max(1, telemetry.length - 1)) * 260;
                  const y = 60 - (Math.min(100, s.sciencePct) / 100) * 54;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(' ')}
            />
          </svg>
        </div>
      )}
    </div>
  );
};
