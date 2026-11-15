import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { IntroTelemetry } from './SpacecraftAndOrbit3D';
import { getAscentTelemetry } from '../engine/launchTrajectory';
import { missionAudio } from '../audio/missionAudio';
import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  Code2,
  Compass,
  Cpu,
  ExternalLink,
  Gamepad2,
  Keyboard,
  Mouse,
  Play,
  Rocket,
  RotateCcw,
  Sliders,
  Sparkles,
  Users,
} from 'lucide-react';

interface PresentationPageProps {
  introTelemetryRef: React.MutableRefObject<IntroTelemetry | null>;
  onStartMissionSetup: () => void;
  onQuickWorkbench: () => void;
  onQuickLaunchOptimal?: () => void;
  onReplayStarter?: () => void;
}

type LoopStepId = 'target' | 'build' | 'validate' | 'launch';
type InputTabId = 'keyboard' | 'mouse' | 'controller';
type StarterStage = 'preview' | 'launching' | 'anomaly' | 'complete';

const LOOP_STEPS: Array<{
  id: LoopStepId;
  num: string;
  title: string;
  summary: string;
  factA: string;
  factB: string;
}> = [
  {
    id: 'target',
    num: '01.',
    title: 'Pick a NASA Mission',
    summary: 'Select an orbit from LEO Earth Labs to Europa deep space.',
    factA: 'Solar distance changes panel power by 1/r².',
    factB: 'Choose Explorer to Flagship engineering margins.',
  },
  {
    id: 'build',
    num: '02.',
    title: 'Assemble Spacecraft & Rocket',
    summary: 'Combine bus, solar wings, instruments, radio link, and launcher.',
    factA: 'Inspect your craft in live 3D or exploded CAD view.',
    factB: 'Every component adds mass, cost, watts, and data rate.',
  },
  {
    id: 'validate',
    num: '03.',
    title: 'Clear CML 4 Safety Gates',
    summary: 'Overloads trigger structural alerts before launch ignition.',
    factA: 'Heavy payloads demand bigger rockets and tighter budgets.',
    factB: 'Real-time radar checks Mass, Power, Comms, and Safety.',
  },
  {
    id: 'launch',
    num: '04.',
    title: 'Launch & Fly the Orbit',
    summary: 'Watch liftoff, staging, fairing split, and satellite release.',
    factA: 'Cross the 100 km Kármán line into orbital operations.',
    factB: 'Handle eclipses, solar flares, and orbital burns live.',
  },
];

export const PresentationPage: React.FC<PresentationPageProps> = ({
  introTelemetryRef,
  onStartMissionSetup,
  onQuickWorkbench,
  onQuickLaunchOptimal,
  onReplayStarter,
}) => {
  const [activeStep, setActiveStep] = useState<LoopStepId>('target');
  const [inputTab, setInputTab] = useState<InputTabId>('keyboard');

  // Playable Hero Starter Mission + Continuous Live 3D Rocket Launch Animation
  const [starterProfile, setStarterProfile] = useState<'bionutrients' | 'helio'>('bionutrients');
  const [starterStage, setStarterStage] = useState<StarterStage>('preview');
  const [starterScore, setStarterScore] = useState(96);
  const [starterSummary, setStarterSummary] = useState('');
  const [hudTelemetry, setHudTelemetry] = useState({
    phase: 'launch' as 'launch' | 'deployment' | 'operations',
    launchProgress: 0,
    deployProgress: 0,
    altitudeKm: 0,
    velocityKms: 0,
    inSpace: false,
    milestoneLabel: 'T+0 LIFTOFF · PAD CLEAR',
    stage1Separated: false,
    fairingSeparated: false,
    payloadSeparated: false,
  });
  const stageRef = useRef<StarterStage>('preview');
  stageRef.current = starterStage;
  const profileRef = useRef<'bionutrients' | 'helio'>('bionutrients');
  profileRef.current = starterProfile;

  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();
    let hudAccum = 0;
    let opsElapsedAfterDeploy = 0;
    let state: IntroTelemetry = {
      phase: 'launch',
      launchProgress: 0.04,
      deployProgress: 0,
      orbitAngleRad: 0,
    };
    introTelemetryRef.current = { ...state };

    const resetCycle = () => {
      state = {
        phase: 'launch',
        launchProgress: 0,
        deployProgress: 0,
        orbitAngleRad: 0,
      };
      opsElapsedAfterDeploy = 0;
      introTelemetryRef.current = { ...state };
    };

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const curStage = stageRef.current;

      if (state.phase === 'launch') {
        const rate = curStage === 'preview' ? 0.16 : 0.21;
        state.launchProgress = Math.min(1, state.launchProgress + dt * rate);
        if (state.launchProgress >= 1) {
          state.phase = 'deployment';
          state.deployProgress = 0;
          state.orbitAngleRad = 0;
          if (curStage === 'launching') {
            missionAudio.playStageSep();
          }
        }
      } else if (state.phase === 'deployment') {
        state.deployProgress = Math.min(1, state.deployProgress + dt * 0.52);
        const orbitRate = 0.65 + 0.35 * state.deployProgress;
        state.orbitAngleRad = (state.orbitAngleRad + dt * 0.85 * orbitRate) % (Math.PI * 2);
        if (state.deployProgress >= 1) {
          state.phase = 'operations';
          opsElapsedAfterDeploy = 0;
        }
      } else {
        state.orbitAngleRad = (state.orbitAngleRad + dt * 0.85) % (Math.PI * 2);
        opsElapsedAfterDeploy += dt;
        if (curStage === 'preview' && opsElapsedAfterDeploy >= 3.2) {
          resetCycle();
        } else if (curStage === 'launching' && opsElapsedAfterDeploy >= 1.1) {
          missionAudio.playAnomaly();
          setStarterStage('anomaly');
          stageRef.current = 'anomaly';
        }
      }

      introTelemetryRef.current = { ...state };

      hudAccum += dt;
      if (hudAccum >= 0.08) {
        hudAccum = 0;
        const targetAlt = profileRef.current === 'bionutrients' ? 410 : 600;
        const t = getAscentTelemetry(
          state.launchProgress,
          state.deployProgress,
          state.phase,
          targetAlt,
          'earth'
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

  const startStarterMission = () => {
    missionAudio.playLaunchIgnition();
    introTelemetryRef.current = {
      phase: 'launch',
      launchProgress: 0,
      deployProgress: 0,
      orbitAngleRad: 0,
    };
    setHudTelemetry({
      phase: 'launch',
      launchProgress: 0,
      deployProgress: 0,
      altitudeKm: 0,
      velocityKms: 0,
      inSpace: false,
      milestoneLabel: 'T+0 LIFTOFF · PAD CLEAR',
      stage1Separated: false,
      fairingSeparated: false,
      payloadSeparated: false,
    });
    setStarterStage('launching');
    stageRef.current = 'launching';
  };

  const resolveStarterAnomaly = (choice: 'power' | 'science') => {
    missionAudio.playSuccess();
    if (choice === 'power') {
      setStarterScore(96);
      setStarterSummary('Arrays sun-locked through orbital eclipse · +24% Power Reserve.');
    } else {
      setStarterScore(94);
      setStarterSummary('High-gain science downlink captured · +18% Bonus Data.');
    }
    setStarterStage('complete');
    stageRef.current = 'complete';
  };

  // Interactive Coupled Trade-Off Mini-Lab state
  const [payloadChoice, setPayloadChoice] = useState<'light' | 'heavy'>('light');
  const [rocketChoice, setRocketChoice] = useState<'small' | 'heavy'>('small');
  const [solarChoice, setSolarChoice] = useState<'body' | 'wings'>('wings');

  const labMetrics = useMemo(() => {
    const busMass = 4.5;
    const busCost = 3.5;
    const payload = payloadChoice === 'light'
      ? { mass: 2.2, power: 10, cost: 3.0, label: 'Bio-Lab' }
      : { mass: 18.0, power: 36, cost: 13.5, label: 'Cryo-Spectrometer' };

    const rocket = rocketChoice === 'small'
      ? { cap: 12, cost: 4.0, label: 'Small Rideshare' }
      : { cap: 150, cost: 12.0, label: 'Heavy Launcher' };

    const solar = solarChoice === 'body'
      ? { genW: 18, mass: 0.8, cost: 1.0, label: 'Body Panels' }
      : { genW: 72, mass: 2.4, cost: 3.5, label: 'Deployable Wings' };

    const totalMass = busMass + payload.mass + solar.mass;
    const totalDrawW = 14 + payload.power;
    const totalCost = busCost + payload.cost + rocket.cost + solar.cost;
    const budgetCap = 22.0;

    const massOk = totalMass <= rocket.cap;
    const powerOk = solar.genW >= totalDrawW * 1.15;
    const budgetOk = totalCost <= budgetCap;
    const ready = massOk && powerOk && budgetOk;

    let alertReason = 'All coupled margins pass flight safety.';
    if (!massOk) {
      alertReason = `Mass (${totalMass.toFixed(1)} kg) exceeds ${rocket.label} limit (${rocket.cap} kg) — upgrade rocket.`;
    } else if (!powerOk) {
      alertReason = `Solar output (${solar.genW} W) cannot sustain ${totalDrawW} W payload — switch to Deployable Wings.`;
    } else if (!budgetOk) {
      alertReason = `Cost ($${totalCost.toFixed(1)}M) exceeds $${budgetCap.toFixed(0)}M cap — balance payload and rocket.`;
    }

    return {
      totalMass,
      rocketCap: rocket.cap,
      solarGenW: solar.genW,
      totalDrawW,
      totalCost,
      budgetCap,
      massOk,
      powerOk,
      budgetOk,
      ready,
      alertReason,
    };
  }, [payloadChoice, rocketChoice, solarChoice]);

  const currentStep = LOOP_STEPS.find((s) => s.id === activeStep) ?? LOOP_STEPS[0];

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto scroll-smooth pointer-events-auto">
      {/* Zone 3-Part Sticky Header */}
      <header className="sticky top-0 z-30 bg-[#070A10]/95 border-b border-slate-800/80 px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        <a
          href="#overview"
          className="font-display font-bold text-lg tracking-tight text-slate-50 whitespace-nowrap shrink-0"
        >
          Solar-X
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <a href="#overview" className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0">
            Overview
          </a>
          <a href="#loop" className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0">
            Mission Loop
          </a>
          <a href="#lab" className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0">
            Trade-Off Lab
          </a>
          <a href="#controls" className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0">
            Flight Controls
          </a>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {onReplayStarter && (
            <button
              type="button"
              onClick={onReplayStarter}
              className="hidden sm:flex px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-200 font-medium text-xs items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <Rocket className="w-3.5 h-3.5 text-cyan-400" />
              Watch Launch
            </button>
          )}
          <button
            type="button"
            data-home-play="true"
            onClick={onStartMissionSetup}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            Play Full Game
          </button>
        </div>
      </header>

      {/* HERO SECTION: Live 3D Rocket Launch -> Space -> Satellite Release visible on the right */}
      <section
        id="overview"
        className="relative min-h-[calc(100vh-4rem)] flex items-center bg-gradient-to-r from-[#070A10] via-[#070A10]/80 via-48% to-transparent px-4 sm:px-8 py-10"
      >
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-cyan-300">
              <span>Solar-X</span>
              <span aria-hidden="true">·</span>
              <span>NASA Space Apps Challenge 13</span>
            </div>

            <h1 className="font-display font-bold text-3xl sm:text-5xl tracking-tight text-slate-50 leading-[1.06] text-balance max-w-xl">
              Design the Spacecraft. Launch the Mission.
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-lg leading-relaxed">
              Watch the rocket lift off from the surface, cross into space, deploy your satellite, and play the starter mission right here before entering full engineering control.
            </p>

            {/* Interactive Playable Starter Mission Card */}
            <div className="bg-[#0B111E]/95 border border-slate-700/90 rounded-xl p-4 flex flex-col gap-3 max-w-xl shadow-2xl">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 font-display font-bold text-sm text-slate-50">
                  <Rocket className="w-4 h-4 text-cyan-400" />
                  <span>
                    {starterStage === 'preview'
                      ? 'Starter Mission · Live Launch Preview'
                      : starterStage === 'launching'
                        ? 'Starter Mission · In-Flight Ascent'
                        : starterStage === 'anomaly'
                          ? 'In-Orbit Decision · Eclipse Alert'
                          : 'Starter Mission Complete'}
                  </span>
                </div>
                <span
                  className={`font-mono-tabular text-[11px] font-semibold ${
                    hudTelemetry.inSpace ? 'text-cyan-300' : 'text-amber-300'
                  }`}
                >
                  {hudTelemetry.inSpace ? 'IN SPACE' : 'ATMOSPHERE'}
                </span>
              </div>

              {/* Compact Telemetry Readout during Preview / Launching */}
              <div className="grid grid-cols-3 gap-2 font-mono-tabular text-xs bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2">
                <div>
                  <div className="text-[10px] text-slate-500">ALTITUDE</div>
                  <div className="text-slate-100 font-semibold">{Math.round(hudTelemetry.altitudeKm)} km</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">VELOCITY</div>
                  <div className="text-cyan-300 font-semibold">{hudTelemetry.velocityKms.toFixed(2)} km/s</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">STAGE</div>
                  <div className="text-emerald-300 font-semibold truncate">
                    {hudTelemetry.payloadSeparated
                      ? 'Satellite Orbit'
                      : hudTelemetry.fairingSeparated
                        ? 'Fairing Split'
                        : hudTelemetry.stage1Separated
                          ? 'Stage 2 Burn'
                          : 'Stage 1 Ascent'}
                  </div>
                </div>
              </div>

              {starterStage === 'preview' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStarterProfile('bionutrients')}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                        starterProfile === 'bionutrients'
                          ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                          : 'bg-[#070A10] border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-xs font-semibold">Bio-Lab CubeSat</div>
                      <div className="font-mono-tabular text-[11px] text-cyan-300">Falcon 9 · 410 km LEO</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStarterProfile('helio')}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                        starterProfile === 'helio'
                          ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                          : 'bg-[#070A10] border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-xs font-semibold">Solar Flare Scout</div>
                      <div className="font-mono-tabular text-[11px] text-amber-300">Electron · 600 km SSO</div>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      data-starter-play="true"
                      onClick={startStarterMission}
                      className="flex-1 min-w-[200px] px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Play Starter Mission
                    </button>

                    {onQuickLaunchOptimal && (
                      <button
                        type="button"
                        onClick={onQuickLaunchOptimal}
                        className="px-4 py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/50 hover:bg-emerald-500/25 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Auto-Setup &amp; Launch
                      </button>
                    )}
                  </div>
                </>
              )}

              {starterStage === 'launching' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-mono-tabular">
                    <span className="text-cyan-300 font-semibold">{hudTelemetry.milestoneLabel}</span>
                    <span className="text-slate-400">
                      {Math.round((hudTelemetry.phase === 'launch' ? hudTelemetry.launchProgress : 1) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-100"
                      style={{
                        width: `${Math.max(5, Math.round((hudTelemetry.phase === 'launch' ? hudTelemetry.launchProgress : 1) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono-tabular text-center pt-1">
                    {[
                      ['Liftoff', true],
                      ['Stage 1 Sep', hudTelemetry.stage1Separated],
                      ['Fairing Split', hudTelemetry.fairingSeparated],
                      ['Orbit Release', hudTelemetry.payloadSeparated],
                    ].map(([lbl, done]) => (
                      <div
                        key={String(lbl)}
                        className={`py-1 px-1.5 rounded border ${
                          done
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        {lbl}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {starterStage === 'anomaly' && (
                <div className="flex flex-col gap-2.5">
                  <div className="bg-amber-950/40 border border-amber-500/50 rounded-lg p-3 text-xs text-amber-100">
                    <div className="font-semibold text-amber-300 mb-1">
                      Orbital Eclipse Ahead · Battery Reserve at 42%
                    </div>
                    <p className="text-slate-300">
                      Your satellite separated cleanly into orbit! Choose how Flight Ops handles the first pass:
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      data-starter-choice="power"
                      onClick={() => resolveStarterAnomaly('power')}
                      className="p-2.5 rounded-lg bg-cyan-500/15 border border-cyan-400 hover:bg-cyan-500/25 text-left cursor-pointer transition-colors"
                    >
                      <div className="text-xs font-bold text-slate-50">Sun-Angle Solar Wings</div>
                      <div className="font-mono-tabular text-[11px] text-emerald-300">+18% Power Margin</div>
                    </button>
                    <button
                      type="button"
                      data-starter-choice="science"
                      onClick={() => resolveStarterAnomaly('science')}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-left cursor-pointer transition-colors"
                    >
                      <div className="text-xs font-bold text-slate-50">Boost S-Band Telemetry</div>
                      <div className="font-mono-tabular text-[11px] text-cyan-300">+22% Science Downlink</div>
                    </button>
                  </div>
                </div>
              )}

              {starterStage === 'complete' && (
                <div className="flex flex-col gap-3">
                  <div className="bg-emerald-950/45 border border-emerald-500/50 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        ORBIT COMMISSIONED · GRADE S ({starterScore}/100)
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">{starterSummary}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      data-start="true"
                      onClick={onStartMissionSetup}
                      className="flex-1 min-w-[210px] px-5 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Rocket className="w-4 h-4" />
                      Start Playing Full Game
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={startStarterMission}
                      className="px-3.5 py-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Replay
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onStartMissionSetup}
                className="px-4 py-2 rounded-lg bg-[#0B111E]/90 border border-slate-700 hover:border-cyan-400 text-slate-100 font-medium text-xs cursor-pointer transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                Full Mission Setup
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onQuickWorkbench}
                className="px-4 py-2 rounded-lg bg-[#0B111E]/90 border border-slate-700 hover:border-cyan-400 text-slate-100 font-medium text-xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                Open 3D Workbench
              </button>
            </div>
          </div>

          {/* Right column intentionally open so live 3D Rocket Liftoff, Karman Gate & Satellite Release remain unobstructed */}
          <div className="hidden lg:block lg:col-span-6" aria-hidden="true" />
        </div>
      </section>

      {/* SECTION 01: INTERACTIVE 4-STEP MISSION LOOP */}
      <section id="loop" className="bg-[#070A10] border-t border-slate-800/80 px-4 sm:px-8 py-16">
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-50 tracking-tight">
                01. How Every Mission Works
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Click any stage to preview the engineering flow.
              </p>
            </div>
            <button
              type="button"
              onClick={onStartMissionSetup}
              className="text-sm font-medium text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto whitespace-nowrap shrink-0"
            >
              Start Stage 01
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Step Selector List */}
            <div className="lg:col-span-5 flex flex-col gap-2">
              {LOOP_STEPS.map((step) => {
                const active = step.id === activeStep;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveStep(step.id)}
                    className={`text-left p-4 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 ${
                      active
                        ? 'bg-[#0B111E] border-cyan-400 text-slate-50'
                        : 'bg-[#090D16] border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className={`font-mono-tabular text-sm font-bold shrink-0 ${
                        active ? 'text-cyan-300' : 'text-slate-500'
                      }`}
                    >
                      {step.num}
                    </span>
                    <div className="min-w-0">
                      <div className="font-display font-semibold text-base text-slate-100">
                        {step.title}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 leading-snug">
                        {step.summary}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Interactive Stage Visual Blueprint */}
            <div className="lg:col-span-7 bg-[#0B111E] border border-slate-800 rounded-xl p-6 flex flex-col justify-between gap-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="font-display font-bold text-lg text-slate-50">
                  {currentStep.num} {currentStep.title}
                </div>
                <span className="font-mono-tabular text-xs text-cyan-300">
                  Interactive Stage Preview
                </span>
              </div>

              {/* Crisp Dynamic Vector Diagram */}
              <div className="bg-[#070A10] border border-slate-800/80 rounded-lg p-4 flex items-center justify-center min-h-[210px]">
                {activeStep === 'target' && (
                  <svg viewBox="0 0 520 180" className="w-full max-w-lg h-44" role="img" aria-label="Mission Target Distance Schematic">
                    <circle cx="65" cy="90" r="24" fill="#F59E0B" opacity="0.9" />
                    <text x="65" y="132" textAnchor="middle" fill="#FDE68A" fontSize="11" fontFamily="monospace">SUN</text>
                    <line x1="95" y1="90" x2="465" y2="90" stroke="#1E293B" strokeDasharray="4 4" strokeWidth="2" />
                    <circle cx="195" cy="90" r="14" fill="#0284C7" stroke="#38BDF8" strokeWidth="2" />
                    <text x="195" y="124" textAnchor="middle" fill="#E2E8F0" fontSize="11" fontFamily="monospace">Earth · 1.0 AU</text>
                    <text x="195" y="140" textAnchor="middle" fill="#38BDF8" fontSize="10" fontFamily="monospace">1361 W/m²</text>
                    <circle cx="315" cy="90" r="11" fill="#C2410C" stroke="#FB923C" strokeWidth="2" />
                    <text x="315" y="124" textAnchor="middle" fill="#E2E8F0" fontSize="11" fontFamily="monospace">Mars · 1.52 AU</text>
                    <text x="315" y="140" textAnchor="middle" fill="#FBBF24" fontSize="10" fontFamily="monospace">589 W/m²</text>
                    <circle cx="440" cy="90" r="13" fill="#CBD5E1" stroke="#38BDF8" strokeWidth="2" />
                    <text x="440" y="124" textAnchor="middle" fill="#E2E8F0" fontSize="11" fontFamily="monospace">Europa · 5.2 AU</text>
                    <text x="440" y="140" textAnchor="middle" fill="#F87171" fontSize="10" fontFamily="monospace">50 W/m²</text>
                  </svg>
                )}

                {activeStep === 'build' && (
                  <svg viewBox="0 0 520 180" className="w-full max-w-lg h-44" role="img" aria-label="Modular Spacecraft Assembly Diagram">
                    {/* Solar Wings */}
                    <rect x="60" y="72" width="120" height="36" rx="4" fill="#0B1B3B" stroke="#38BDF8" strokeWidth="2" />
                    <rect x="340" y="72" width="120" height="36" rx="4" fill="#0B1B3B" stroke="#38BDF8" strokeWidth="2" />
                    <line x1="180" y1="90" x2="215" y2="90" stroke="#94A3B8" strokeWidth="3" />
                    <line x1="305" y1="90" x2="340" y2="90" stroke="#94A3B8" strokeWidth="3" />
                    {/* Core Bus */}
                    <rect x="215" y="54" width="90" height="72" rx="6" fill="#D97706" stroke="#FDE68A" strokeWidth="2" />
                    <rect x="233" y="72" width="54" height="36" rx="3" fill="#1E293B" stroke="#10B981" strokeWidth="1.5" />
                    {/* Comms Dish Top */}
                    <path d="M 240 42 Q 260 22 280 42" fill="none" stroke="#FBBF24" strokeWidth="3" />
                    <line x1="260" y1="42" x2="260" y2="54" stroke="#CBD5E1" strokeWidth="2" />
                    {/* Labels */}
                    <text x="120" y="128" textAnchor="middle" fill="#38BDF8" fontSize="11" fontFamily="monospace">SOLAR WINGS</text>
                    <text x="260" y="146" textAnchor="middle" fill="#FDE68A" fontSize="11" fontFamily="monospace">BUS + PAYLOAD</text>
                    <text x="400" y="128" textAnchor="middle" fill="#38BDF8" fontSize="11" fontFamily="monospace">POWER GEN</text>
                  </svg>
                )}

                {activeStep === 'validate' && (
                  <svg viewBox="0 0 520 180" className="w-full max-w-lg h-44" role="img" aria-label="CML 4 Margin Gate Diagram">
                    {[
                      { x: 40, label: 'MASS', pct: 84, color: '#10B981', val: '10.9 / 200 kg' },
                      { x: 160, label: 'POWER', pct: 69, color: '#38BDF8', val: '+69% Margin' },
                      { x: 280, label: 'RF LINK', pct: 92, color: '#10B981', val: '+27.1 dB' },
                      { x: 400, label: 'BUDGET', pct: 78, color: '#F59E0B', val: '$22.5M / $24M' },
                    ].map((bar) => (
                      <g key={bar.label}>
                        <rect x={bar.x} y="30" width="84" height="100" rx="6" fill="#0F172A" stroke="#1E293B" />
                        <rect x={bar.x + 12} y={118 - bar.pct * 0.72} width="60" height={bar.pct * 0.72} rx="3" fill={bar.color} opacity="0.85" />
                        <text x={bar.x + 42} y="22" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="monospace">{bar.label}</text>
                        <text x={bar.x + 42} y="152" textAnchor="middle" fill="#E2E8F0" fontSize="10" fontFamily="monospace">{bar.val}</text>
                      </g>
                    ))}
                  </svg>
                )}

                {activeStep === 'launch' && (
                  <svg viewBox="0 0 520 180" className="w-full max-w-lg h-44" role="img" aria-label="Launch Trajectory Surface to Space Diagram">
                    {/* Planet Horizon */}
                    <circle cx="90" cy="215" r="140" fill="#0E3A5F" stroke="#38BDF8" strokeWidth="2" />
                    {/* Curved Ascent Path */}
                    <path d="M 110 78 Q 205 26 445 48" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="6 4" />
                    {/* Karman Line Marker */}
                    <ellipse cx="265" cy="41" rx="7" ry="18" fill="none" stroke="#38BDF8" strokeWidth="2.5" />
                    <text x="265" y="76" textAnchor="middle" fill="#38BDF8" fontSize="10" fontFamily="monospace">100 km SPACE</text>
                    {/* Rocket + Satellite */}
                    <text x="112" y="106" textAnchor="middle" fill="#FDE68A" fontSize="10" fontFamily="monospace">PAD</text>
                    <rect x="428" y="40" width="24" height="16" rx="2" fill="#D97706" stroke="#FDE68A" strokeWidth="1.5" />
                    <rect x="406" y="44" width="20" height="8" fill="#38BDF8" />
                    <rect x="454" y="44" width="20" height="8" fill="#38BDF8" />
                    <text x="440" y="76" textAnchor="middle" fill="#10B981" fontSize="10" fontFamily="monospace">SATELLITE DEPLOY</text>
                  </svg>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="bg-[#070A10] border border-slate-800 rounded-lg px-3.5 py-2.5 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{currentStep.factA}</span>
                </div>
                <div className="bg-[#070A10] border border-slate-800 rounded-lg px-3.5 py-2.5 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{currentStep.factB}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 02: INTERACTIVE COUPLED TRADE-OFF MINI-LAB */}
      <section id="lab" className="bg-[#080C14] border-t border-slate-800/80 px-4 sm:px-8 py-16">
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
          <div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-50 tracking-tight">
              02. Test Coupled Engineering Trade-Offs
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Every part changes everything else. Try a heavy instrument on a small rocket.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* 3 Interactive Hardware Switches */}
            <div className="lg:col-span-6 bg-[#0B111E] border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="text-xs font-mono-tabular uppercase tracking-wider text-slate-400">
                  1. Science Payload
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayloadChoice('light')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${
                      payloadChoice === 'light'
                        ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                        : 'bg-[#070A10] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-sm font-semibold">Bio-Incubator</div>
                    <div className="font-mono-tabular text-xs text-cyan-300 mt-0.5">2.2 kg · 10 W · $3M</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayloadChoice('heavy')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${
                      payloadChoice === 'heavy'
                        ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                        : 'bg-[#070A10] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-sm font-semibold">Cryo Spectrometer</div>
                    <div className="font-mono-tabular text-xs text-amber-300 mt-0.5">18.0 kg · 36 W · $13.5M</div>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="text-xs font-mono-tabular uppercase tracking-wider text-slate-400">
                  2. Launch Rocket
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRocketChoice('small')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${
                      rocketChoice === 'small'
                        ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                        : 'bg-[#070A10] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-sm font-semibold">Small Rideshare</div>
                    <div className="font-mono-tabular text-xs text-cyan-300 mt-0.5">12 kg max · $4M</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRocketChoice('heavy')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${
                      rocketChoice === 'heavy'
                        ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                        : 'bg-[#070A10] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-sm font-semibold">Heavy Launcher</div>
                    <div className="font-mono-tabular text-xs text-amber-300 mt-0.5">150 kg max · $12M</div>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="text-xs font-mono-tabular uppercase tracking-wider text-slate-400">
                  3. Solar Array
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSolarChoice('body')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${
                      solarChoice === 'body'
                        ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                        : 'bg-[#070A10] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-sm font-semibold">Body Panels</div>
                    <div className="font-mono-tabular text-xs text-cyan-300 mt-0.5">18 W · 0.8 kg · $1M</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSolarChoice('wings')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${
                      solarChoice === 'wings'
                        ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                        : 'bg-[#070A10] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-sm font-semibold">Deployable Wings</div>
                    <div className="font-mono-tabular text-xs text-emerald-300 mt-0.5">72 W · 2.4 kg · $3.5M</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Coupled Telemetry Verdict */}
            <div className="lg:col-span-6 bg-[#0B111E] border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 font-display font-bold text-base text-slate-50">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Live Telemetry Result
                </div>
                <span
                  className={`font-mono-tabular text-xs font-semibold ${
                    labMetrics.ready ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {labMetrics.ready ? '● READY FOR LAUNCH' : '✖ STRUCTURAL ALERT'}
                </span>
              </div>

              <div className="flex flex-col gap-4 font-mono-tabular text-xs">
                <MeterBar
                  label="Mass vs Rocket Limit"
                  value={`${labMetrics.totalMass.toFixed(1)} / ${labMetrics.rocketCap} kg`}
                  pct={Math.min(100, (labMetrics.totalMass / labMetrics.rocketCap) * 100)}
                  ok={labMetrics.massOk}
                />
                <MeterBar
                  label="Power Generation vs Load"
                  value={`${labMetrics.solarGenW} W / ${labMetrics.totalDrawW} W`}
                  pct={Math.min(100, (labMetrics.totalDrawW / Math.max(1, labMetrics.solarGenW)) * 100)}
                  ok={labMetrics.powerOk}
                />
                <MeterBar
                  label="Mission Budget Cap"
                  value={`$${labMetrics.totalCost.toFixed(1)}M / $${labMetrics.budgetCap.toFixed(0)}M`}
                  pct={Math.min(100, (labMetrics.totalCost / labMetrics.budgetCap) * 100)}
                  ok={labMetrics.budgetOk}
                />
              </div>

              <div
                className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                  labMetrics.ready
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/50 border-rose-500/50 text-rose-200'
                }`}
              >
                {labMetrics.ready ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{labMetrics.alertReason}</span>
              </div>

              <button
                type="button"
                onClick={onQuickWorkbench}
                className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                Build Your Full Spacecraft Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 03: FLIGHT CONTROLS & 4-PLAYER CREW */}
      <section id="controls" className="bg-[#070A10] border-t border-slate-800/80 px-4 sm:px-8 py-16">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Interactive Controls Switcher */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-50 tracking-tight">
              03. Fly With Anything
            </h2>
            <div className="flex items-center gap-1 p-1 bg-[#0B111E] border border-slate-800 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setInputTab('keyboard')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  inputTab === 'keyboard' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                Keyboard
              </button>
              <button
                type="button"
                onClick={() => setInputTab('mouse')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  inputTab === 'mouse' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Mouse className="w-3.5 h-3.5" />
                Mouse 3D
              </button>
              <button
                type="button"
                onClick={() => setInputTab('controller')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  inputTab === 'controller' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                PS4 / PS5
              </button>
            </div>

            <div className="bg-[#0B111E] border border-slate-800 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono-tabular text-xs">
              {inputTab === 'keyboard' && (
                <>
                  <ControlRow k="W A S D / Arrows" v="Spacecraft Pitch & Yaw" />
                  <ControlRow k="Q / E" v="Roll Attitude" />
                  <ControlRow k="Shift / Ctrl" v="Raise / Lower Orbit" />
                  <ControlRow k="I / K" v="Plane Inclination Burn" />
                </>
              )}
              {inputTab === 'mouse' && (
                <>
                  <ControlRow k="Drag Gold Orbit Node" v="Reshape Orbit Altitude & Tilt" />
                  <ControlRow k="Left-Drag Viewport" v="360° Camera Orbit" />
                  <ControlRow k="Scroll Wheel" v="Zoom In / Out" />
                  <ControlRow k="Hold HUD Thrusters" v="Live Prograde / Retro Burns" />
                </>
              )}
              {inputTab === 'controller' && (
                <>
                  <ControlRow k="Left Stick" v="Pitch & Yaw Attitude" />
                  <ControlRow k="Right Stick" v="3D Camera Orbit" />
                  <ControlRow k="R2 / L2 + Haptics" v="Prograde / Retrograde Burn" />
                  <ControlRow k="D-Pad + L1/R1" v="Inclination, Zoom & Roll" />
                </>
              )}
            </div>
          </div>

          {/* 4-Player Team Mode */}
          <div className="lg:col-span-5 bg-[#0B111E] border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 font-display font-bold text-lg text-slate-50">
              <Users className="w-5 h-5 text-emerald-400" />
              Solo or 4-Player Crew
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Play alone or split responsibilities across four NASA mission roles with sign-off gates before launch.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#070A10] border border-slate-800 rounded-lg p-2.5">
                <div className="font-semibold text-cyan-300">Principal Investigator</div>
                <div className="text-[11px] text-slate-400">Objectives &amp; Science</div>
              </div>
              <div className="bg-[#070A10] border border-slate-800 rounded-lg p-2.5">
                <div className="font-semibold text-amber-300">Systems Lead</div>
                <div className="text-[11px] text-slate-400">Bus, Power &amp; Rocket</div>
              </div>
              <div className="bg-[#070A10] border border-slate-800 rounded-lg p-2.5">
                <div className="font-semibold text-emerald-300">Flight Engineer</div>
                <div className="text-[11px] text-slate-400">ADCS &amp; Trajectory</div>
              </div>
              <div className="bg-[#070A10] border border-slate-800 rounded-lg p-2.5">
                <div className="font-semibold text-slate-200">Mission Ops</div>
                <div className="text-[11px] text-slate-400">RF Link &amp; Anomalies</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onStartMissionSetup}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-300 font-display font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              Choose Mission &amp; Crew Mode
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* QUIET FOOTER */}
      <footer className="bg-[#060910] border-t border-slate-800/80 px-4 sm:px-8 py-6">
        <div className="w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div>Solar-X Development Team · Space Mission Architect</div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-5">
            <a href="#overview" className="hover:text-slate-200 transition-colors">Overview</a>
            <button type="button" onClick={onStartMissionSetup} className="hover:text-slate-200 transition-colors cursor-pointer">
              Mission Setup
            </button>
            <button type="button" onClick={onQuickWorkbench} className="hover:text-cyan-300 transition-colors cursor-pointer">
              3D Workbench
            </button>
            <a
              href="https://github.com/mnanimat/solar-x"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#0B111E] border border-slate-700 hover:border-cyan-400 text-slate-100 hover:text-cyan-300 font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              GitHub Repository
              <ExternalLink className="w-3 h-3 opacity-75" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const MeterBar: React.FC<{ label: string; value: string; pct: number; ok: boolean }> = ({
  label,
  value,
  pct,
  ok,
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between">
      <span className="text-slate-300">{label}</span>
      <span className={ok ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>{value}</span>
    </div>
    <div className="h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
      <div
        className={`h-full transition-all duration-200 ${ok ? 'bg-cyan-400' : 'bg-rose-500'}`}
        style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
      />
    </div>
  </div>
);

const ControlRow: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div className="bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
    <span className="text-cyan-300 font-semibold whitespace-nowrap">{k}</span>
    <span className="text-slate-300 text-right">{v}</span>
  </div>
);
