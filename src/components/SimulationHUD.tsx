import React, { useState } from 'react';
import type { AnomalyChoice, DesignEvaluation, SimulationState } from '../engine/missionPhysics';
import type { ControllerProfile, FlightControlInput } from '../engine/flightControls';
import { TEAM_ROLES } from '../engine/missionCatalog';
import type { ViewportCameraPreset } from './SpacecraftAndOrbit3D';
import { GroundTrack2D } from './GroundTrack2D';
import { getAscentTelemetry } from '../engine/launchTrajectory';
import {
  AlertTriangle,
  FastForward,
  Pause,
  Play,
  Rocket,
  RotateCcw,
  Volume2,
  VolumeX,
  Eye,
  Radio,
  BatteryCharging,
  Thermometer,
  Sparkles,
  HeartPulse,
  Gamepad2,
  Compass,
  Flame,
  X,
} from 'lucide-react';

interface SimulationHUDProps {
  evaluation: DesignEvaluation;
  simState: SimulationState;
  paused: boolean;
  speedMultiplier: number;
  viewPreset: ViewportCameraPreset;
  muted: boolean;
  teamMode: boolean;
  controllerProfile: ControllerProfile;
  activeInputSource: FlightControlInput['activeSource'];
  onFlightHoldChange: (partial: Partial<FlightControlInput>) => void;
  onResetAttitude: () => void;
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
  controllerProfile,
  activeInputSource,
  onFlightHoldChange,
  onResetAttitude,
  onTogglePause,
  onChangeSpeed,
  onChangeCamera,
  onToggleMute,
  onResolveAnomaly,
  onAbortToWorkbench,
}) => {
  const [showControlsModal, setShowControlsModal] = useState(false);

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

  const controllerLabel =
    controllerProfile === 'ps5-dualsense'
      ? 'PS5 DualSense'
      : controllerProfile === 'ps4-dualshock'
        ? 'PS4 DualShock 4'
        : controllerProfile === 'gamepad'
          ? 'Gamepad Ready'
          : 'Keyboard + Mouse';

  const inOps = simState.phase === 'operations';
  const showAscentStrip = simState.phase === 'launch' || simState.phase === 'deployment';
  const ascentTelem = showAscentStrip
    ? getAscentTelemetry(
        simState.launchProgress,
        simState.deployProgress,
        simState.phase,
        evaluation.orbit.altitudeKm,
        evaluation.orbit.targetBody
      )
    : null;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-4">
      <div className="flex flex-col gap-2">
        {/* Slim Top Telemetry Bar */}
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

      {/* Ascent Trajectory & Staging Milestone Strip (Launch -> Space -> Satellite Release) */}
      {ascentTelem && (
        <div className="pointer-events-auto mx-auto w-full max-w-3xl bg-[#0B111E]/95 border border-slate-700/80 rounded-xl px-4 py-2 shadow-xl flex flex-wrap items-center justify-between gap-3 font-mono-tabular text-xs">
          <div className="flex items-center gap-2.5">
            <Rocket className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                {evaluation.launchVehicle.name} Ascent Trajectory
              </div>
              <div className="font-semibold text-cyan-300">{ascentTelem.milestoneLabel}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <span className="text-slate-400 mr-1">ALT</span>
              <strong className="text-slate-100">{ascentTelem.altitudeKm.toFixed(0)} km</strong>
            </div>
            <div>
              <span className="text-slate-400 mr-1">VEL</span>
              <strong className="text-slate-100">{ascentTelem.velocityKms.toFixed(2)} km/s</strong>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold border ${
                ascentTelem.inSpace
                  ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                  : 'bg-amber-500/20 border-amber-400/60 text-amber-200'
              }`}
            >
              {ascentTelem.inSpace ? 'In Space (>100 km)' : 'Atmosphere'}
            </span>
          </div>

          <div className="w-full grid grid-cols-4 gap-1.5 text-[10px] uppercase">
            {[
              { label: '1. Surface Pad', done: simState.launchProgress > 0.08 || simState.phase !== 'launch' },
              { label: '2. MECO / Stg 1 Sep', done: ascentTelem.stage1Separated },
              { label: '3. Space Fairing Sep', done: ascentTelem.fairingSeparated },
              { label: '4. Satellite Deploy', done: ascentTelem.payloadSeparated },
            ].map((step) => (
              <div
                key={step.label}
                className={`px-2 py-1 rounded border text-center truncate ${
                  step.done
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                {step.label}
              </div>
            ))}
          </div>
        </div>
      )}
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

      {/* Controls Reference Modal (Keyboard, Mouse, PS4 DualShock 4, PS5 DualSense) */}
      {showControlsModal && (
        <div className="pointer-events-auto fixed inset-0 z-40 bg-[#05080F]/75 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#0B111E] border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-display font-bold text-base text-slate-50">
                    Spacecraft &amp; Trajectory Flight Controls
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Detected Input Profile: <span className="text-cyan-300 font-mono-tabular">{controllerLabel}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowControlsModal(false)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 cursor-pointer"
                aria-label="Close Controls Guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#070B13] border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5">
                <div className="font-mono-tabular text-[11px] uppercase tracking-wider text-cyan-300 font-semibold">
                  Keyboard
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span className="text-slate-400">Pitch / Yaw</span>
                  <span className="font-mono-tabular text-right whitespace-nowrap">W A S D / Arrows</span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span className="text-slate-400">Roll CCW / CW</span>
                  <span className="font-mono-tabular text-right whitespace-nowrap">Q / E</span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span className="text-slate-400">Prograde (+Alt)</span>
                  <span className="font-mono-tabular text-right whitespace-nowrap">Shift / R</span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span className="text-slate-400">Retrograde (-Alt)</span>
                  <span className="font-mono-tabular text-right whitespace-nowrap">Ctrl / X / F</span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span className="text-slate-400">Plane Inclination</span>
                  <span className="font-mono-tabular text-right whitespace-nowrap">I / K</span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span className="text-slate-400">Zoom / Pause</span>
                  <span className="font-mono-tabular text-right whitespace-nowrap">- = / P or Esc</span>
                </div>
              </div>

              <div className="bg-[#070B13] border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5">
                <div className="font-mono-tabular text-[11px] uppercase tracking-wider text-amber-300 font-semibold">
                  Mouse &amp; 3D Node
                </div>
                <div className="text-slate-300 leading-snug">
                  <span className="text-slate-100 font-medium">Drag Gold Orbit Node:</span> Directly pull the glowing node on the orbital ring to adjust altitude &amp; plane inclination.
                </div>
                <div className="text-slate-300 leading-snug">
                  <span className="text-slate-100 font-medium">Left-Drag Space:</span> Orbit 3D camera around Earth or spacecraft.
                </div>
                <div className="text-slate-300 leading-snug">
                  <span className="text-slate-100 font-medium">Scroll Wheel:</span> Smooth camera zoom in/out.
                </div>
                <div className="text-slate-300 leading-snug">
                  <span className="text-slate-100 font-medium">Hold HUD Buttons:</span> Hold +Alt / -Alt / ±Inc in the flight bar to fire RCS thrusters.
                </div>
              </div>

              <div className="bg-[#070B13] border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5">
                <div className="font-mono-tabular text-[11px] uppercase tracking-wider text-emerald-300 font-semibold">
                  PS4 DualShock &amp; PS5 DualSense
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span className="text-slate-400">Left Stick</span>
                  <span className="font-mono-tabular text-right whitespace-nowrap">Pitch / Yaw</span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span className="text-slate-400">Right Stick</span>
                  <span className="font-mono-tabular text-right whitespace-nowrap">Camera Orbit</span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span className="text-slate-400">R2 / L2</span>
                  <span className="font-mono-tabular text-right whitespace-nowrap">Pro / Retro Burn</span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span className="text-slate-400">L1 / R1</span>
                  <span className="font-mono-tabular text-right whitespace-nowrap">Roll CCW / CW</span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span className="text-slate-400">D-Pad Up/Down</span>
                  <span className="font-mono-tabular text-right whitespace-nowrap">Inclination ±</span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span className="text-slate-400">D-Pad L/R · R3</span>
                  <span className="font-mono-tabular text-right whitespace-nowrap">Zoom · View</span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span className="text-slate-400">Triangle · Options</span>
                  <span className="font-mono-tabular text-right whitespace-nowrap">Nadir · Pause</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compact Bottom Corner Panels + Center Flight & Trajectory Control Strip */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-2.5">
        <div className="pointer-events-auto w-full lg:w-76 bg-[#0B111E]/95 border border-slate-700/80 rounded-xl p-2.5 shadow-xl shrink-0">
          <GroundTrack2D
            orbit={evaluation.orbit}
            groundNetwork={evaluation.groundNetwork}
            subSatLatDeg={simState.subSatLatDeg}
            subSatLonDeg={simState.subSatLonDeg}
            inGroundPass={simState.inGroundPass}
            activeStationName={simState.activeStationName}
            elapsedDays={simState.elapsedDays}
            inclinationOffsetDeg={simState.inclinationOffsetDeg}
            compact
          />
          <div className="flex items-center justify-between text-[10px] font-mono-tabular text-slate-400 mt-1.5 px-0.5">
            <span>{simState.inEclipse ? 'ECLIPSE UMBRA' : 'SUNLIT ILLUMINATED'}</span>
            <span className={simState.inGroundPass ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
              {simState.inGroundPass ? `DOWNLINK: ${simState.activeStationName}` : 'WAITING AOS'}
            </span>
          </div>
        </div>

        {/* Center Flight & Trajectory Thruster Control Bar */}
        <div className="pointer-events-auto mx-auto w-full lg:w-auto max-w-xl bg-[#0B111E]/95 border border-slate-700/80 rounded-xl px-3 py-2 shadow-xl flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono-tabular">
            <div className="flex items-center gap-1.5">
              <Gamepad2
                className={`w-3.5 h-3.5 ${
                  controllerProfile !== 'none' ? 'text-emerald-400' : 'text-cyan-400'
                }`}
              />
              <span className="text-slate-200 font-semibold">{controllerLabel}</span>
              {activeInputSource !== 'idle' && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 uppercase">
                  {activeInputSource} active
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <span>
                Δv <strong className="text-amber-300">{Math.round(simState.deltaVRemainingMs)}</strong> m/s
              </span>
              <span>
                Alt{' '}
                <strong className="text-cyan-300">
                  {simState.altitudeOffsetKm >= 0 ? '+' : ''}
                  {Math.round(simState.altitudeOffsetKm)} km
                </strong>
              </span>
              <span>
                Inc{' '}
                <strong className="text-emerald-300">
                  {simState.inclinationOffsetDeg >= 0 ? '+' : ''}
                  {simState.inclinationOffsetDeg.toFixed(1)}°
                </strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                disabled={!inOps || simState.deltaVRemainingMs <= 0.2}
                onPointerDown={() => onFlightHoldChange({ retrogradeThrust: 1 })}
                onPointerUp={() => onFlightHoldChange({})}
                onPointerLeave={() => onFlightHoldChange({})}
                onPointerCancel={() => onFlightHoldChange({})}
                className="px-2 py-1 rounded text-[11px] font-mono-tabular bg-slate-900 border border-slate-700 hover:border-cyan-400 disabled:opacity-45 text-cyan-200 cursor-pointer flex items-center gap-1 select-none"
                title="Retrograde Burn (Ctrl / X / L2)"
              >
                <Flame className="w-3 h-3 text-cyan-400" />
                -Alt Retro
              </button>
              <button
                type="button"
                disabled={!inOps || simState.deltaVRemainingMs <= 0.2}
                onPointerDown={() => onFlightHoldChange({ progradeThrust: 1 })}
                onPointerUp={() => onFlightHoldChange({})}
                onPointerLeave={() => onFlightHoldChange({})}
                onPointerCancel={() => onFlightHoldChange({})}
                className="px-2 py-1 rounded text-[11px] font-mono-tabular bg-slate-900 border border-slate-700 hover:border-amber-400 disabled:opacity-45 text-amber-200 cursor-pointer flex items-center gap-1 select-none"
                title="Prograde Burn (Shift / R / R2)"
              >
                <Flame className="w-3 h-3 text-amber-400" />
                +Alt Pro
              </button>
              <button
                type="button"
                disabled={!inOps || simState.deltaVRemainingMs <= 0.2}
                onPointerDown={() => onFlightHoldChange({ inclinationDelta: 1 })}
                onPointerUp={() => onFlightHoldChange({})}
                onPointerLeave={() => onFlightHoldChange({})}
                onPointerCancel={() => onFlightHoldChange({})}
                className="px-2 py-1 rounded text-[11px] font-mono-tabular bg-slate-900 border border-slate-700 hover:border-emerald-400 disabled:opacity-45 text-emerald-200 cursor-pointer select-none"
                title="Normal Plane Burn +Inc (I / D-Pad Up)"
              >
                +Inc
              </button>
              <button
                type="button"
                disabled={!inOps || simState.deltaVRemainingMs <= 0.2}
                onPointerDown={() => onFlightHoldChange({ inclinationDelta: -1 })}
                onPointerUp={() => onFlightHoldChange({})}
                onPointerLeave={() => onFlightHoldChange({})}
                onPointerCancel={() => onFlightHoldChange({})}
                className="px-2 py-1 rounded text-[11px] font-mono-tabular bg-slate-900 border border-slate-700 hover:border-emerald-400 disabled:opacity-45 text-emerald-200 cursor-pointer select-none"
                title="Anti-Normal Plane Burn -Inc (K / D-Pad Down)"
              >
                -Inc
              </button>
              <button
                type="button"
                onClick={onResetAttitude}
                className={`px-2 py-1 rounded text-[11px] font-mono-tabular border cursor-pointer flex items-center gap-1 ${
                  simState.manualAttitudeActive
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
                title="Lock Attitude Back to Nadir (Triangle)"
              >
                <Compass className="w-3 h-3" />
                Nadir
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowControlsModal(true)}
              className="px-2.5 py-1 rounded text-[11px] font-mono-tabular bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-200 cursor-pointer flex items-center gap-1"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
              Controls
            </button>
          </div>
        </div>

        <div className="pointer-events-auto w-full lg:w-76 bg-[#0B111E]/95 border border-slate-700/80 rounded-xl p-2.5 shadow-xl shrink-0">
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
