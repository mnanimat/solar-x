import React, { useEffect, useRef, useState } from 'react';
import { DIFFICULTIES, SCENARIOS, type DifficultyId } from '../engine/missionCatalog';
import type { IntroTelemetry } from './SpacecraftAndOrbit3D';
import { getAscentTelemetry } from '../engine/launchTrajectory';
import { missionAudio } from '../audio/missionAudio';
import { WindowControls } from './WindowControls';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Rocket,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  User,
  Users,
} from 'lucide-react';

interface LaunchStageLandingProps {
  selectedScenarioId: string;
  selectedDifficultyId: DifficultyId;
  teamMode: boolean;
  introTelemetryRef: React.MutableRefObject<IntroTelemetry | null>;
  onSelectScenario: (id: string) => void;
  onSelectDifficulty: (id: DifficultyId) => void;
  onToggleTeamMode: (team: boolean) => void;
  onContinueToHome: () => void;
  onLaunchOptimalDirect: () => void;
}

type StarterStage = 'launching' | 'anomaly' | 'complete';

export const LaunchStageLanding: React.FC<LaunchStageLandingProps> = ({
  selectedScenarioId,
  selectedDifficultyId,
  teamMode,
  introTelemetryRef,
  onSelectScenario,
  onSelectDifficulty,
  onToggleTeamMode,
  onContinueToHome,
  onLaunchOptimalDirect,
}) => {
  const [stage, setStage] = useState<StarterStage>('launching');
  const [decisionNote, setDecisionNote] = useState<string>('');
  const [starterScore, setStarterScore] = useState<number>(96);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [panelClosed, setPanelClosed] = useState(false);

  const selectedScenario = SCENARIOS.find((s) => s.id === selectedScenarioId) ?? SCENARIOS[0];
  const targetAltKm = selectedScenario.id === 'helio-flare-scout' ? 600 : selectedScenario.id === 'lunar-gateway-relay' ? 1800 : 410;
  const targetBody = selectedScenario.targetBody;

  const [hudTelemetry, setHudTelemetry] = useState({
    phase: 'launch' as 'launch' | 'deployment' | 'operations',
    launchProgress: 0.02,
    deployProgress: 0,
    altitudeKm: 0,
    velocityKms: 0,
    inSpace: false,
    milestoneLabel: 'T+0 LIFTOFF · PAD CLEAR',
    stage1Separated: false,
    fairingSeparated: false,
    payloadSeparated: false,
  });

  const stageRef = useRef<StarterStage>('launching');
  stageRef.current = stage;
  const targetAltRef = useRef(targetAltKm);
  targetAltRef.current = targetAltKm;
  const targetBodyRef = useRef(targetBody);
  targetBodyRef.current = targetBody;

  const resetCycleFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();
    let hudAccum = 0;
    let opsElapsedAfterDeploy = 0;
    let state: IntroTelemetry = {
      phase: 'launch',
      launchProgress: 0.02,
      deployProgress: 0,
      orbitAngleRad: 0,
    };
    introTelemetryRef.current = { ...state };

    const resetCycle = () => {
      state = {
        phase: 'launch',
        launchProgress: 0.01,
        deployProgress: 0,
        orbitAngleRad: 0,
      };
      opsElapsedAfterDeploy = 0;
      introTelemetryRef.current = { ...state };
    };
    resetCycleFnRef.current = resetCycle;

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const curStage = stageRef.current;

      if (state.phase === 'launch') {
        state.launchProgress = Math.min(1, state.launchProgress + dt * 0.19);
        if (state.launchProgress >= 1) {
          state.phase = 'deployment';
          state.deployProgress = 0;
          state.orbitAngleRad = 0;
          if (curStage === 'launching') {
            missionAudio.playStageSep();
          }
        }
      } else if (state.phase === 'deployment') {
        state.deployProgress = Math.min(1, state.deployProgress + dt * 0.54);
        const orbitRate = 0.65 + 0.35 * state.deployProgress;
        state.orbitAngleRad = (state.orbitAngleRad + dt * 0.85 * orbitRate) % (Math.PI * 2);
        if (state.deployProgress >= 1) {
          state.phase = 'operations';
          opsElapsedAfterDeploy = 0;
        }
      } else {
        // Continuous uninterrupted orbital rotation after satellite release
        state.orbitAngleRad = (state.orbitAngleRad + dt * 0.85) % (Math.PI * 2);
        opsElapsedAfterDeploy += dt;
        if (curStage === 'launching' && opsElapsedAfterDeploy >= 1.1) {
          missionAudio.playAnomaly();
          setStage('anomaly');
          stageRef.current = 'anomaly';
        }
      }

      introTelemetryRef.current = { ...state };

      hudAccum += dt;
      if (hudAccum >= 0.07) {
        hudAccum = 0;
        const t = getAscentTelemetry(
          state.launchProgress,
          state.deployProgress,
          state.phase,
          targetAltRef.current,
          targetBodyRef.current
        );
        setHudTelemetry({
          phase: state.phase,
          launchProgress: state.launchProgress,
          deployProgress: state.deployProgress,
          altitudeKm: t.altitudeKm,
          velocityKms: t.velocityKms,
          inSpace: t.inSpace,
          milestoneLabel: t.milestoneLabel,
          stage1Separated: t.stage1Separated,
          fairingSeparated: t.fairingSeparated,
          payloadSeparated: t.payloadSeparated,
        });
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(rafId);
      introTelemetryRef.current = null;
    };
  }, [introTelemetryRef]);

  const replayLaunch = () => {
    missionAudio.playLaunchIgnition();
    resetCycleFnRef.current();
    setStage('launching');
    stageRef.current = 'launching';
    setDecisionNote('');
  };

  const handleChooseOptionAndLaunch = (scenarioId: string) => {
    onSelectScenario(scenarioId);
    replayLaunch();
  };

  const resolveOrbitChoice = (choice: 'power' | 'science') => {
    missionAudio.playSuccess();
    if (choice === 'power') {
      setStarterScore(96);
      setDecisionNote('Sun-angle solar wings locked · +24% Eclipse Power Reserve.');
    } else {
      setStarterScore(94);
      setDecisionNote('High-gain S-Band downlink locked · +22% Science Return.');
    }
    setStage('complete');
    stageRef.current = 'complete';
  };

  const quickDiffs = DIFFICULTIES.slice(0, 4);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-6">
      {/* Top Floating Brand + Direct Continue CTA */}
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="pointer-events-auto bg-[#0B111E]/95 border border-slate-700/80 rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 shadow-xl flex items-center gap-2">
          <Rocket className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="font-display font-bold text-xs sm:text-sm text-slate-50 tracking-tight whitespace-nowrap">
            Solar-X <span className="hidden sm:inline text-slate-400 font-normal">· Space Mission Architect</span>
          </div>
        </div>

        <button
          type="button"
          data-continue-home="true"
          onClick={() => {
            missionAudio.playSelect();
            onContinueToHome();
          }}
          className="pointer-events-auto px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5 shadow-xl cursor-pointer transition-colors whitespace-nowrap shrink-0"
        >
          <span className="hidden sm:inline">Continue to </span>Home &amp; Game
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom/Left Interactive Launch & Selected Options Window */}
      <div className="flex items-end justify-between gap-4">
        {panelClosed ? (
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPanelClosed(false)}
              className="px-3.5 py-2 rounded-xl bg-[#0B111E]/95 border border-slate-700 hover:border-cyan-400 text-slate-100 text-xs font-medium flex items-center gap-2 shadow-xl cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              Open Launch Options
            </button>
            <button
              type="button"
              onClick={onContinueToHome}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-xs uppercase flex items-center gap-1.5 shadow-xl cursor-pointer"
            >
              Home &amp; Full Game
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div
            className={`pointer-events-auto w-full mx-auto sm:mx-0 ${
              optionsExpanded ? 'max-w-[435px] p-4 gap-3' : 'max-w-[345px] p-3 gap-2'
            } bg-[#0B111E]/95 border border-slate-700/85 rounded-2xl shadow-2xl flex flex-col max-h-[82vh] overflow-y-auto transition-all`}
          >
            {/* Window Header with Minimize + Close */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="min-w-0">
                <div className="text-[10px] font-mono-tabular uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                  <span>{optionsExpanded ? 'Launch & Mission Options' : 'Live Launch'}</span>
                  <span className={hudTelemetry.inSpace ? 'text-emerald-400' : 'text-amber-300'}>
                    · {hudTelemetry.inSpace ? 'IN SPACE' : 'ATMOSPHERE'}
                  </span>
                </div>
                <div className="font-display font-bold text-sm text-slate-50 truncate">
                  {selectedScenario.title}
                </div>
              </div>

              <WindowControls
                title="Launch Sequence Window"
                minimized={panelMinimized}
                onToggleMinimize={() => setPanelMinimized((m) => !m)}
                onClose={() => setPanelClosed(true)}
              />
            </div>

            {panelMinimized ? (
              <div className="flex items-center justify-between gap-3 text-xs font-mono-tabular">
                <span className="text-cyan-300 truncate">{hudTelemetry.milestoneLabel}</span>
                <span className="text-slate-200 shrink-0">
                  {Math.round(hudTelemetry.altitudeKm)} km · {hudTelemetry.velocityKms.toFixed(1)} km/s
                </span>
              </div>
            ) : (
              <>
                {/* Compact Live Ascent Telemetry Strip */}
                <div className="flex items-center justify-between gap-2 font-mono-tabular text-[11px] bg-[#070A10] border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <div>
                    <span className="text-slate-500 mr-1">ALT</span>
                    <span className="text-slate-100 font-semibold">{Math.round(hudTelemetry.altitudeKm)} km</span>
                  </div>
                  <div>
                    <span className="text-slate-500 mr-1">VEL</span>
                    <span className="text-cyan-300 font-semibold">{hudTelemetry.velocityKms.toFixed(2)} km/s</span>
                  </div>
                  <div className="text-emerald-300 font-semibold truncate">
                    {hudTelemetry.payloadSeparated
                      ? 'Satellite Orbit'
                      : hudTelemetry.fairingSeparated
                        ? 'Fairing Split'
                        : hudTelemetry.stage1Separated
                          ? 'Stage 2 Burn'
                          : 'Stage 1'}
                  </div>
                  <button
                    type="button"
                    onClick={replayLaunch}
                    className="text-cyan-300 hover:text-cyan-200 flex items-center gap-0.5 cursor-pointer shrink-0"
                    title="Replay Rocket Launch"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>

                {/* Compact Selected Summary & Expand/Collapse Configuration Toggle */}
                <div className="flex items-center justify-between gap-2 bg-slate-900/70 border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <div className="text-[11px] text-slate-300 truncate">
                    <span className="text-cyan-300 font-semibold">{teamMode ? '4-Player' : 'Solo'}</span>
                    {' · '}
                    <span>{DIFFICULTIES.find((d) => d.id === selectedDifficultyId)?.name}</span>
                  </div>
                  <button
                    type="button"
                    data-toggle-options="true"
                    aria-expanded={optionsExpanded}
                    onClick={() => {
                      missionAudio.playSelect();
                      setOptionsExpanded((v) => !v);
                    }}
                    className="px-2 py-1 rounded bg-[#070A10] border border-slate-700 hover:border-cyan-400 text-cyan-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    {optionsExpanded ? 'Collapse' : 'Expand Options'}
                    {optionsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* Expandable Full Mission & Configuration Options */}
                {optionsExpanded && (
                  <div className="flex flex-col gap-2.5 pt-0.5 border-t border-slate-800/80">
                    {/* Ascent Milestones */}
                    <div className="grid grid-cols-4 gap-1 text-[10px] font-mono-tabular text-center">
                      {[
                        ['Liftoff', true],
                        ['Stage 1 Sep', hudTelemetry.stage1Separated],
                        ['Fairing Sep', hudTelemetry.fairingSeparated],
                        ['Sat Orbit', hudTelemetry.payloadSeparated],
                      ].map(([lbl, done]) => (
                        <div
                          key={String(lbl)}
                          className={`py-1 px-1 rounded border ${
                            done
                              ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-300'
                              : 'bg-slate-900 border-slate-800 text-slate-500'
                          }`}
                        >
                          {lbl}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                      <span>Mission Program (Click to Relaunch)</span>
                      <button
                        type="button"
                        onClick={replayLaunch}
                        className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Replay
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {SCENARIOS.slice(0, 3).map((s) => {
                        const active = s.id === selectedScenarioId;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleChooseOptionAndLaunch(s.id)}
                            className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                              active
                                ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                                : 'bg-[#070A10] border-slate-800 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            <div className="text-[11px] font-semibold leading-tight truncate">{s.title}</div>
                            <div className="font-mono-tabular text-[10px] text-cyan-300 mt-0.5">
                              {s.targetBody.toUpperCase()} · ${s.baseBudgetM}M
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Crew & Engineering Margin Options */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onToggleTeamMode(false)}
                          className={`px-2 py-1 rounded text-[11px] font-medium border flex items-center gap-1 cursor-pointer ${
                            !teamMode
                              ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <User className="w-3 h-3 text-cyan-400" />
                          Solo
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleTeamMode(true)}
                          className={`px-2 py-1 rounded text-[11px] font-medium border flex items-center gap-1 cursor-pointer ${
                            teamMode
                              ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Users className="w-3 h-3 text-emerald-400" />
                          4-Player
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {quickDiffs.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => onSelectDifficulty(d.id)}
                            className={`px-2 py-1 rounded text-[10px] font-mono-tabular border cursor-pointer ${
                              selectedDifficultyId === d.id
                                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {d.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Orbit Decision once Satellite is Released */}
                {stage === 'anomaly' && (
                  <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-2.5 flex flex-col gap-1.5">
                    <div className="text-[11px] font-semibold text-amber-300">
                      Satellite in Orbit! First Pass Action:
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        data-starter-choice="power"
                        onClick={() => resolveOrbitChoice('power')}
                        className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-400 hover:bg-cyan-500/25 text-left cursor-pointer"
                      >
                        <div className="text-[11px] font-bold text-slate-50">Sun-Angle Wings</div>
                        <div className="font-mono-tabular text-[10px] text-emerald-300">+18% Power</div>
                      </button>
                      <button
                        type="button"
                        data-starter-choice="science"
                        onClick={() => resolveOrbitChoice('science')}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-left cursor-pointer"
                      >
                        <div className="text-[11px] font-bold text-slate-50">Boost S-Band RF</div>
                        <div className="font-mono-tabular text-[10px] text-cyan-300">+22% Data</div>
                      </button>
                    </div>
                  </div>
                )}

                {stage === 'complete' && (
                  <div className="bg-emerald-950/45 border border-emerald-500/50 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ORBIT COMMISSIONED · GRADE S ({starterScore}/100)
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">{decisionNote}</div>
                    </div>
                  </div>
                )}

                {/* Primary Flow CTA: Enter Home & Complete Game */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    data-enter-home="true"
                    onClick={() => {
                      missionAudio.playSelect();
                      onContinueToHome();
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    Home &amp; Full Game
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={onLaunchOptimalDirect}
                    className="px-2.5 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/50 hover:bg-emerald-500/25 text-emerald-300 font-semibold text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title="Auto-Configure Optimal Spacecraft & Launch Full Mission"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-Setup
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
