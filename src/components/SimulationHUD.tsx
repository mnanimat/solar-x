import React from 'react';
import type { AnomalyChoice, DesignEvaluation, SimulationState } from '../engine/missionPhysics';
import { TEAM_ROLES } from '../engine/missionCatalog';
import type { ViewportCameraPreset } from './SpacecraftAndOrbit3D';
import { GroundTrack2D } from './GroundTrack2D';
import {
  AlertTriangle,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Eye,
  Radio,
  BatteryCharging,
  Thermometer,
  Sparkles,
  HeartPulse,
} from 'lucide-react';

interface SimulationHUDProps {
  evaluation: DesignEvaluation;
  simState: SimulationState;
  paused: boolean;
  speedMultiplier: number;
  viewPreset: ViewportCameraPreset;
  muted: boolean;
  teamMode: boolean;
  onTogglePause: () => void;
  onChangeSpeed: (s: number) => void;
  onChangeCamera: (preset: ViewportCameraPreset) => void;
  onToggleMute: () => void;
  onResolveAnomaly: (choice: AnomalyChoice) => void;
  onAbortToWorkbench: () => void;
}

export const SimulationHUD: React.FC<SimulationHUDProps> = ({
  evaluation,
  simState,
  paused,
  speedMultiplier,
  viewPreset,
  muted,
  teamMode,
  onTogglePause,
  onChangeSpeed,
  onChangeCamera,
  onToggleMute,
  onResolveAnomaly,
  onAbortToWorkbench,
}) => {
  const phaseLabel =
    simState.phase === 'launch'
      ? `ASCENT (${Math.round(simState.launchProgress * 100)}%)`
      : simState.phase === 'deployment'
        ? `DEPLOYING ARRAYS (${Math.round(simState.deployProgress * 100)}%)`
        : simState.phase === 'operations'
          ? 'ORBITAL SCIENCE OPS'
          : simState.phase === 'completed'
            ? 'PRIME MISSION COMPLETE'
            : 'MISSION LOST';

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-4">
      {/* Slim Top Telemetry Bar (leaves >=85% viewport unobstructed) */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 bg-[#0B111E]/95 border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-xl">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-cyan-400">
              {phaseLabel}
            </div>
            <div className="font-display font-bold text-sm text-slate-100">
              DAY {Math.floor(simState.elapsedDays)} / {simState.targetDays}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 border-l border-slate-800 pl-4 font-mono-tabular text-xs">
            <div className="flex items-center gap-1.5">
              <BatteryCharging className={`w-3.5 h-3.5 ${simState.batterySocPct < 30 ? 'text-rose-400' : 'text-emerald-400'}`} />
              <span className="text-slate-400">Batt</span>
              <span className="text-slate-100 font-semibold">{Math.round(simState.batterySocPct)}%</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Radio className={`w-3.5 h-3.5 ${simState.inGroundPass ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="text-slate-400">Buf</span>
              <span className="text-slate-100 font-semibold">
                {simState.dataBufferGb.toFixed(2)}/{simState.maxBufferGb.toFixed(1)} GB
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Science</span>
              <span className="text-cyan-300 font-semibold">
                {simState.cumulativeSciencePoints.toFixed(0)} / {evaluation.scenario.minScienceScore}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <HeartPulse className={`w-3.5 h-3.5 ${simState.spacecraftHealthPct < 60 ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span className="text-slate-400">Health</span>
              <span className="text-slate-100 font-semibold">{Math.round(simState.spacecraftHealthPct)}%</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-slate-100 font-semibold">{Math.round(simState.thermalC)}°C</span>
            </div>
          </div>
        </div>

        {/* Sim Controls */}
        <div className="flex items-center gap-1.5">
          {[1, 5, 20].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => onChangeSpeed(spd)}
              className={`px-2 py-1 rounded text-[11px] font-mono-tabular cursor-pointer border ${
                speedMultiplier === spd
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <FastForward className="w-3 h-3 inline mr-0.5" />
              {spd}x
            </button>
          ))}

          <button
            type="button"
            onClick={() => onChangeCamera(viewPreset === 'orbit' ? 'assembly' : 'orbit')}
            className="px-2.5 py-1 rounded text-[11px] font-mono-tabular bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 cursor-pointer flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            {viewPreset === 'orbit' ? 'Chase Craft' : 'Orbit View'}
          </button>

          <button
            type="button"
            onClick={onTogglePause}
            className="px-2.5 py-1 rounded text-[11px] font-mono-tabular bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-100 cursor-pointer flex items-center gap-1"
          >
            {paused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
            {paused ? 'Resume' : 'Pause'}
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="p-1.5 rounded bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 cursor-pointer"
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onAbortToWorkbench}
            className="px-2.5 py-1 rounded text-[11px] font-medium bg-slate-900 border border-slate-700 hover:border-rose-500/60 text-slate-300 hover:text-rose-200 cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Workbench
          </button>
        </div>
      </div>

      {/* Center Anomaly Tactical Decision Drawer (only when activeAnomaly triggers) */}
      {simState.activeAnomaly && (
        <div className="pointer-events-auto mx-auto my-auto w-full max-w-lg bg-[#0B111E]/95 border border-amber-500/80 rounded-xl p-5 shadow-2xl flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-amber-400">
                  In-Flight Anomaly · Day {Math.floor(simState.elapsedDays)}
                </div>
                <h3 className="font-display font-bold text-base text-slate-50">
                  {simState.activeAnomaly.title}
                </h3>
              </div>
            </div>
            <span
              className={`text-[10px] font-mono-tabular uppercase px-2 py-0.5 rounded ${
                simState.activeAnomaly.severity === 'critical'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {simState.activeAnomaly.severity}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{simState.activeAnomaly.description}</p>

          <div className="flex flex-col gap-2">
            {simState.activeAnomaly.choices.map((choice) => {
              const role = TEAM_ROLES.find((r) => r.id === choice.roleHint);
              const missingHardware =
                (choice.requiresStarTracker && !evaluation.adcs.hasStarTracker) ||
                (choice.requiresRadHard && !evaluation.adcs.radHardened);

              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => onResolveAnomaly(choice)}
                  className="text-left p-3 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-cyan-400 transition-colors cursor-pointer flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100">{choice.label}</span>
                    {teamMode && role && (
                      <span
                        className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-slate-800"
                        style={{ color: role.accentHex }}
                      >
                        {role.shortTitle}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">{choice.summary}</p>
                  {missingHardware && (
                    <span className="text-[10px] font-mono-tabular text-rose-400">
                      Warning: Required hardware ({choice.requiresStarTracker ? 'Star Tracker' : 'Rad-Hard CPU'}) not installed — risky!
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Compact Bottom Corner Panels (2D Ground Track + Event Log) */}
      <div className="flex flex-col sm:flex-row items-end justify-between gap-3">
        <div className="pointer-events-auto w-full sm:w-80 bg-[#0B111E]/95 border border-slate-700/80 rounded-xl p-2.5 shadow-xl">
          <GroundTrack2D
            orbit={evaluation.orbit}
            groundNetwork={evaluation.groundNetwork}
            subSatLatDeg={simState.subSatLatDeg}
            subSatLonDeg={simState.subSatLonDeg}
            inGroundPass={simState.inGroundPass}
            activeStationName={simState.activeStationName}
            elapsedDays={simState.elapsedDays}
            compact
          />
          <div className="flex items-center justify-between text-[10px] font-mono-tabular text-slate-400 mt-1.5 px-0.5">
            <span>{simState.inEclipse ? 'ECLIPSE UMBRA' : 'SUNLIT ILLUMINATED'}</span>
            <span className={simState.inGroundPass ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
              {simState.inGroundPass ? `DOWNLINK: ${simState.activeStationName}` : 'WAITING AOS'}
            </span>
          </div>
        </div>

        <div className="pointer-events-auto w-full sm:w-80 bg-[#0B111E]/95 border border-slate-700/80 rounded-xl p-2.5 shadow-xl">
          <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1.5">
            Flight Ops Event Feed
          </div>
          <div className="flex flex-col gap-1 max-h-28 overflow-y-auto text-[11px] font-mono-tabular">
            {simState.eventLog.slice(-4).reverse().map((ev, idx) => (
              <div
                key={`${ev.day}-${idx}`}
                className={`leading-snug ${
                  ev.type === 'critical'
                    ? 'text-rose-300'
                    : ev.type === 'warn'
                      ? 'text-amber-300'
                      : ev.type === 'success'
                        ? 'text-emerald-300'
                        : 'text-slate-300'
                }`}
              >
                <span className="text-slate-500 mr-1.5">[D{ev.day}]</span>
                {ev.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
