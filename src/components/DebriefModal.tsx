import React, { useState } from 'react';
import type { DesignEvaluation, MissionDesign, MissionOutcome, SimulationState } from '../engine/missionPhysics';
import { Award, CheckCircle2, XCircle, RotateCcw, Compass, Wrench, Maximize2 } from 'lucide-react';
import { WindowControls } from './WindowControls';

interface DebriefModalProps {
  design: MissionDesign;
  evaluation: DesignEvaluation;
  simState: SimulationState;
  outcome: MissionOutcome;
  onEditDesign: () => void;
  onReplaySim: () => void;
  onReturnTitle: () => void;
}

export const DebriefModal: React.FC<DebriefModalProps> = ({
  design,
  evaluation,
  simState,
  outcome,
  onEditDesign,
  onReplaySim,
  onReturnTitle,
}) => {
  const [minimized, setMinimized] = useState(false);
  const [closed, setClosed] = useState(false);

  const pillars = [
    { label: 'Science Return', value: outcome.breakdown.scienceReturn },
    { label: 'CML Margins', value: outcome.breakdown.cmlMargins },
    { label: 'Resource Efficiency', value: outcome.breakdown.resourceEfficiency },
    { label: 'Operational Survival', value: outcome.breakdown.operationalSurvival },
    { label: design.teamMode ? 'Team Coordination' : 'System Integration', value: outcome.breakdown.teamCoordination },
  ];

  if (closed) {
    return (
      <div className="fixed bottom-4 right-4 z-30 pointer-events-auto flex items-center gap-2 bg-[#0B111E]/95 border border-slate-700 rounded-xl px-3.5 py-2 shadow-2xl">
        <button
          type="button"
          onClick={() => setClosed(false)}
          className="text-xs font-medium text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Open Debrief ({outcome.grade} · {outcome.totalScore})
        </button>
        <button
          type="button"
          onClick={onEditDesign}
          className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-[11px] uppercase cursor-pointer"
        >
          Workbench
        </button>
      </div>
    );
  }

  if (minimized) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-[#0B111E]/95 border border-slate-700 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-3">
        <span className="font-display font-bold text-sm text-slate-100">{design.missionName}</span>
        <span className="font-mono-tabular text-xs font-bold text-cyan-300">
          Grade {outcome.grade} ({outcome.totalScore}/100)
        </span>
        <button
          type="button"
          onClick={onEditDesign}
          className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-[11px] uppercase cursor-pointer"
        >
          Re-Engineer
        </button>
        <WindowControls
          title="Post-Flight Debrief"
          minimized={true}
          onToggleMinimize={() => setMinimized(false)}
          onClose={() => setClosed(true)}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 bg-[#05080F]/85 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#0B111E] border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
        {/* Header & Grade + Window Controls */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase tracking-wider">
              {outcome.success ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> TMCO POST-FLIGHT REVIEW PASSED
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> MISSION REVIEW FAILED
                </span>
              )}
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-50">{design.missionName}</h2>
            <p className="text-xs text-slate-300">{outcome.headline}</p>
          </div>

          <div className="flex items-start gap-2.5 shrink-0">
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5">
              <div className="text-right font-mono-tabular">
                <div className="text-[10px] text-slate-400 uppercase">Score</div>
                <div className="text-xl font-bold text-slate-100">{outcome.totalScore}</div>
              </div>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center font-display text-3xl font-bold ${
                  outcome.grade === 'S'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                    : outcome.grade === 'A' || outcome.grade === 'B'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : outcome.grade === 'C'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {outcome.grade}
              </div>
            </div>
            <WindowControls
              title="Post-Flight Debrief"
              minimized={false}
              onToggleMinimize={() => setMinimized(true)}
              onClose={() => setClosed(true)}
            />
          </div>
        </div>

        {/* 5-Pillar Score Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pillars.map((p) => (
            <div key={p.label} className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-mono-tabular">
                <span className="text-slate-300">{p.label}</span>
                <span className="text-cyan-300 font-semibold">{p.value}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    p.value >= 75 ? 'bg-emerald-400' : p.value >= 50 ? 'bg-cyan-400' : 'bg-rose-400'
                  }`}
                  style={{ width: `${p.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Causal Systems Engineering Debrief */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
          <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-cyan-300">
            Causal Engineering Assessment ({Math.floor(simState.elapsedDays)} Days Flown)
          </div>
          <ul className="flex flex-col gap-1.5 text-xs text-slate-300 leading-relaxed">
            {outcome.causalSummary.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-cyan-400 font-mono-tabular">▸</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Real NASA Mission Analogue Comparison */}
        <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-xl p-4 flex items-start gap-3">
          <Award className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs">
            <div className="font-mono-tabular text-[11px] uppercase tracking-wider text-cyan-300">
              NASA Heritage Analogue: {outcome.nasaAnalogue.name}
            </div>
            <p className="text-slate-200 leading-relaxed">{outcome.nasaAnalogue.summary}</p>
            <p className="text-slate-400 text-[11px]">{outcome.nasaAnalogue.alignmentNote}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={onReturnTitle}
            className="px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            Change Program
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReplaySim}
              className="px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Re-Fly Mission
            </button>
            <button
              type="button"
              onClick={onEditDesign}
              className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              Re-Engineer Design
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
