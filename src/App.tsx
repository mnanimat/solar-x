import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DIFFICULTIES, SCENARIOS, type DifficultyId } from './engine/missionCatalog';
import {
  createDefaultDesign,
  createOptimalDesign,
  createSimulationState,
  evaluateMissionDesign,
  evaluateMissionOutcome,
  resetSpacecraftAttitude,
  resolveAnomalyChoice,
  stepSimulationTick,
  type AnomalyChoice,
  type MissionDesign,
  type SimulationState,
} from './engine/missionPhysics';
import {
  createEmptyFlightInput,
  detectControllerProfile,
  mergeFlightInputs,
  sampleGamepadState,
  type ControllerProfile,
  type FlightControlInput,
  type GamepadLike,
  type PreviousGamepadButtons,
} from './engine/flightControls';
import {
  SpacecraftAndOrbit3D,
  type IntroTelemetry,
  type ViewportCameraPreset,
} from './components/SpacecraftAndOrbit3D';
import { LaunchStageLanding } from './components/LaunchStageLanding';
import { PresentationPage } from './components/PresentationPage';
import { TitleScreen, type ArchivedMissionRun } from './components/TitleScreen';
import { DesignWorkbench } from './components/DesignWorkbench';
import { SimulationHUD } from './components/SimulationHUD';
import { DebriefModal } from './components/DebriefModal';
import { WindowControls } from './components/WindowControls';
import { missionAudio } from './audio/missionAudio';

type AppScreen = 'starter' | 'intro' | 'title' | 'workbench' | 'simulation';

const ARCHIVE_STORAGE_KEY = 'solarx_mission_archive_v1';

function loadArchive(): ArchivedMissionRun[] {
  try {
    const raw = window.localStorage.getItem(ARCHIVE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function clampVal(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function pickActiveGamepad(): GamepadLike | null {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
    return null;
  }
  const pads = Array.from(navigator.getGamepads() ?? []).filter(
    (g): g is Gamepad => Boolean(g && g.connected)
  );
  if (pads.length === 0) return null;
  const playstation = pads.find((g) => {
    const prof = detectControllerProfile(g.id);
    return prof === 'ps5-dualsense' || prof === 'ps4-dualshock';
  });
  return (playstation ?? pads[0]) as unknown as GamepadLike;
}

function triggerHapticPulse(gp: GamepadLike | null, weak: number, strong: number, duration: number) {
  try {
    gp?.vibrationActuator?.playEffect?.('dual-rumble', {
      duration,
      weakMagnitude: weak,
      strongMagnitude: strong,
    })?.catch?.(() => {});
  } catch {
    // Ignore browsers without dual-rumble support
  }
}

export default function App() {
  const autostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [screen, setScreen] = useState<AppScreen>(autostart ? 'workbench' : 'starter');
  const [design, setDesign] = useState<MissionDesign>(() =>
    createDefaultDesign('bionutrients-leo', 'beginner', false)
  );
  const [viewPreset, setViewPreset] = useState<ViewportCameraPreset>('assembly');
  const [explodedAmount, setExplodedAmount] = useState(0);
  const [muted, setMuted] = useState(false);

  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [simPaused, setSimPaused] = useState(false);
  const [pauseMinimized, setPauseMinimized] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [archive, setArchive] = useState<ArchivedMissionRun[]>(() => loadArchive());
  const archivedCurrentRunRef = useRef(false);

  // Flight & trajectory controls (keyboard, mouse, PS4 DualShock 4, PS5 DualSense)
  const [previewTrajectory, setPreviewTrajectory] = useState<{ altKm: number; incDeg: number }>({
    altKm: 0,
    incDeg: 0,
  });
  const [controllerProfile, setControllerProfile] = useState<ControllerProfile>('none');
  const [activeInputSource, setActiveInputSource] = useState<FlightControlInput['activeSource']>('idle');

  const flightInputRef = useRef<FlightControlInput>(createEmptyFlightInput());
  const introTelemetryRef = useRef<IntroTelemetry | null>(null);
  const heldKeysRef = useRef<Set<string>>(new Set());
  const mouseHoldRef = useRef<Partial<FlightControlInput>>({});
  const prevGamepadButtonsRef = useRef<PreviousGamepadButtons>({
    cross: false,
    circle: false,
    triangle: false,
    options: false,
    r3: false,
  });
  const lastProfileRef = useRef<ControllerProfile>('none');
  const lastSourceRef = useRef<FlightControlInput['activeSource']>('idle');
  const lastHapticMsRef = useRef<number>(0);

  const evaluation = useMemo(() => evaluateMissionDesign(design), [design]);

  const outcome = useMemo(() => {
    if (!simState || (simState.phase !== 'completed' && simState.phase !== 'failed')) return null;
    return evaluateMissionOutcome(design, evaluation, simState);
  }, [design, evaluation, simState]);

  // Synchronize body.dataset.state for deterministic accessibility & automation hooks
  useEffect(() => {
    if (screen === 'starter' || screen === 'intro' || screen === 'title') {
      document.body.dataset.state = 'title';
    } else if (screen === 'simulation' && outcome) {
      document.body.dataset.state = 'gameover';
    } else if (screen === 'simulation' && simPaused) {
      document.body.dataset.state = 'paused';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [screen, simPaused, outcome]);

  useEffect(() => {
    if (!simPaused) {
      setPauseMinimized(false);
    }
  }, [simPaused]);

  // Archive completed/failed run once
  useEffect(() => {
    if (!outcome || archivedCurrentRunRef.current) return;
    archivedCurrentRunRef.current = true;
    if (outcome.success) {
      missionAudio.playSuccess();
    } else {
      missionAudio.playFail();
    }
    const entry: ArchivedMissionRun = {
      id: `${Date.now()}`,
      dateIso: new Date().toISOString(),
      missionName: design.missionName,
      scenarioTitle: evaluation.scenario.title,
      difficultyName: evaluation.difficulty.name,
      teamMode: design.teamMode,
      grade: outcome.grade,
      score: outcome.totalScore,
      success: outcome.success,
    };
    setArchive((prev) => {
      const next = [entry, ...prev].slice(0, 12);
      try {
        window.localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  }, [outcome, design.missionName, design.teamMode, evaluation.scenario.title, evaluation.difficulty.name]);

  const handleSelectScenario = useCallback((scenarioId: string) => {
    missionAudio.playSelect();
    const sc = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
    setDesign((prev) => createDefaultDesign(scenarioId, sc.recommendedDifficulty, prev.teamMode));
    setPreviewTrajectory({ altKm: 0, incDeg: 0 });
  }, []);

  const handleSelectDifficulty = useCallback((difficultyId: DifficultyId) => {
    missionAudio.playSelect();
    setDesign((prev) => ({ ...prev, difficultyId }));
  }, []);

  const handleToggleTeamMode = useCallback((teamMode: boolean) => {
    missionAudio.playSelect();
    setDesign((prev) => ({ ...prev, teamMode }));
  }, []);

  const handleStartWorkbench = useCallback(() => {
    missionAudio.playSelect();
    setViewPreset('assembly');
    setScreen('workbench');
  }, []);

  const handleLaunchMission = useCallback(() => {
    if (!evaluation.canLaunch) {
      missionAudio.playWarn();
      return;
    }
    missionAudio.playLaunchIgnition();
    triggerHapticPulse(pickActiveGamepad(), 0.45, 0.75, 280);
    archivedCurrentRunRef.current = false;
    prevPhaseRef.current = 'launch';
    prevAnomalyIdRef.current = null;
    setSimPaused(false);
    setSimSpeed(1);
    setViewPreset('orbit');
    const initial = createSimulationState(evaluation);
    if (Math.abs(previewTrajectory.altKm) > 1 || Math.abs(previewTrajectory.incDeg) > 0.2) {
      initial.altitudeOffsetKm = previewTrajectory.altKm;
      initial.inclinationOffsetDeg = previewTrajectory.incDeg;
    }
    setSimState(initial);
    setScreen('simulation');
  }, [evaluation, previewTrajectory]);

  const handleApplyOptimalPreset = useCallback(() => {
    missionAudio.playSelect();
    setPreviewTrajectory({ altKm: 0, incDeg: 0 });
    setDesign((prev) => createOptimalDesign(prev.scenarioId, prev.difficultyId, prev.teamMode));
  }, []);

  const handleLaunchOptimalPreset = useCallback(() => {
    const optDesign = createOptimalDesign(design.scenarioId, design.difficultyId, design.teamMode);
    const optEval = evaluateMissionDesign(optDesign);
    setPreviewTrajectory({ altKm: 0, incDeg: 0 });
    setDesign(optDesign);

    if (!optEval.canLaunch) {
      missionAudio.playWarn();
      setScreen('workbench');
      return;
    }

    missionAudio.playLaunchIgnition();
    triggerHapticPulse(pickActiveGamepad(), 0.45, 0.75, 280);
    archivedCurrentRunRef.current = false;
    prevPhaseRef.current = 'launch';
    prevAnomalyIdRef.current = null;
    setSimPaused(false);
    setSimSpeed(1);
    setViewPreset('orbit');
    setSimState(createSimulationState(optEval));
    setScreen('simulation');
  }, [design.scenarioId, design.difficultyId, design.teamMode]);

  const handleResolveAnomaly = useCallback(
    (choice: AnomalyChoice) => {
      missionAudio.playSelect();
      setSimState((prev) => (prev ? resolveAnomalyChoice(prev, choice, evaluation) : prev));
    },
    [evaluation]
  );

  const handleResetAttitude = useCallback(() => {
    missionAudio.playSelect();
    setSimState((prev) => (prev ? resetSpacecraftAttitude(prev) : prev));
  }, []);

  const handleFlightHoldChange = useCallback((partial: Partial<FlightControlInput>) => {
    mouseHoldRef.current = partial;
  }, []);

  const handleTrajectoryDrag = useCallback(
    (altDeltaKm: number, incDeltaDeg: number) => {
      if (screen === 'workbench') {
        setPreviewTrajectory((prev) => ({
          altKm: clampVal(prev.altKm + altDeltaKm, -140, 650),
          incDeg: clampVal(prev.incDeg + incDeltaDeg, -35, 35),
        }));
      } else if (screen === 'simulation') {
        setSimState((prev) => {
          if (!prev || prev.phase !== 'operations' || prev.deltaVRemainingMs <= 0.2 || prev.activeAnomaly) {
            return prev;
          }
          const dvCost = Math.min(
            prev.deltaVRemainingMs,
            (Math.abs(altDeltaKm) / 14 + Math.abs(incDeltaDeg) / 2.2) * 1.15
          );
          if (dvCost <= 0.01) return prev;
          return {
            ...prev,
            deltaVRemainingMs: Math.max(0, prev.deltaVRemainingMs - dvCost),
            altitudeOffsetKm: clampVal(prev.altitudeOffsetKm + altDeltaKm, -140, 650),
            inclinationOffsetDeg: clampVal(prev.inclinationOffsetDeg + incDeltaDeg, -35, 35),
            activeThrusterDir:
              Math.abs(altDeltaKm) >= Math.abs(incDeltaDeg) * 4
                ? altDeltaKm >= 0
                  ? 'prograde'
                  : 'retrograde'
                : 'plane',
          };
        });
      }
    },
    [screen]
  );

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      missionAudio.setMuted(next);
      return next;
    });
  }, []);

  // Simulation + 60Hz Unified Input Loop (Keyboard + Mouse + PS4/PS5 DualShock/DualSense)
  const simRef = useRef({ screen, simState, design, evaluation, simPaused, simSpeed, outcome });
  simRef.current = { screen, simState, design, evaluation, simPaused, simSpeed, outcome };
  const prevPhaseRef = useRef<string | null>(null);
  const prevAnomalyIdRef = useRef<string | null>(null);

  useEffect(() => {
    let rafId = 0;
    let lastTick = performance.now();
    let accum = 0;

    const onGamepadChange = () => {
      const gp = pickActiveGamepad();
      const prof = gp ? detectControllerProfile(gp.id) : 'none';
      if (prof !== lastProfileRef.current) {
        lastProfileRef.current = prof;
        setControllerProfile(prof);
      }
    };
    window.addEventListener('gamepadconnected', onGamepadChange);
    window.addEventListener('gamepaddisconnected', onGamepadChange);

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTick) / 1000);
      lastTick = now;

      // 1. Sample Gamepad (PS4 DualShock 4 / PS5 DualSense) + Keyboard + Mouse holds at 60Hz without re-render
      const gp = pickActiveGamepad();
      const gpSample = sampleGamepadState(gp, prevGamepadButtonsRef.current);
      prevGamepadButtonsRef.current = gpSample.nextButtons;

      const merged = mergeFlightInputs(heldKeysRef.current, mouseHoldRef.current, gpSample);
      flightInputRef.current = merged;

      if (merged.controllerProfile !== lastProfileRef.current) {
        lastProfileRef.current = merged.controllerProfile;
        setControllerProfile(merged.controllerProfile);
      }
      if (merged.activeSource !== lastSourceRef.current) {
        lastSourceRef.current = merged.activeSource;
        setActiveInputSource(merged.activeSource);
      }

      // 2. Dispatch discrete PS4/PS5 edge-triggered buttons
      const {
        screen: curScreen,
        simState: curSim,
        design: curDes,
        evaluation: curEval,
        simPaused: paused,
        simSpeed: spd,
        outcome: curOutcome,
      } = simRef.current;

      if (merged.confirmPressed) {
        if (curScreen === 'title') {
          handleStartWorkbench();
        } else if (curScreen === 'simulation') {
          if (curSim?.activeAnomaly) {
            handleResolveAnomaly(curSim.activeAnomaly.choices[0]);
          } else if (curOutcome) {
            handleLaunchMission();
          } else if (paused) {
            setSimPaused(false);
          }
        }
      }
      if (merged.secondaryPressed && curScreen === 'simulation') {
        if (curSim?.activeAnomaly && curSim.activeAnomaly.choices[1]) {
          handleResolveAnomaly(curSim.activeAnomaly.choices[1]);
        } else if (!curOutcome) {
          setViewPreset((p) => (p === 'orbit' ? 'assembly' : 'orbit'));
        }
      }
      if (merged.toggleAutopilotPressed && curScreen === 'simulation' && curSim) {
        handleResetAttitude();
      }
      if (merged.togglePausePressed && curScreen === 'simulation' && !curOutcome) {
        setSimPaused((p) => !p);
      }
      if (merged.toggleCameraPressed && (curScreen === 'simulation' || curScreen === 'workbench')) {
        setViewPreset((p) => (p === 'orbit' ? 'assembly' : 'orbit'));
      }

      // Gentle dual-rumble haptic feedback when firing prograde/retrograde thrusters on PS4/PS5
      if (
        gp &&
        curScreen === 'simulation' &&
        curSim?.phase === 'operations' &&
        (merged.progradeThrust > 0.1 || merged.retrogradeThrust > 0.1) &&
        now - lastHapticMsRef.current > 260
      ) {
        lastHapticMsRef.current = now;
        const mag = Math.max(merged.progradeThrust, merged.retrogradeThrust);
        triggerHapticPulse(gp, 0.2 * mag, 0.35 * mag, 120);
      }

      // 3. Step orbital simulation at ~20 Hz when active
      if (curScreen === 'simulation') {
        accum += dt;
        if (accum >= 0.05) {
          const stepDt = accum;
          accum = 0;

          if (
            curSim &&
            !paused &&
            !curSim.activeAnomaly &&
            curSim.phase !== 'completed' &&
            curSim.phase !== 'failed'
          ) {
            const nextSim = stepSimulationTick(curSim, curDes, curEval, stepDt, spd, merged);

            if (prevPhaseRef.current === 'launch' && nextSim.phase === 'deployment') {
              missionAudio.playStageSep();
              triggerHapticPulse(gp, 0.5, 0.7, 220);
            }
            if (!prevAnomalyIdRef.current && nextSim.activeAnomaly) {
              missionAudio.playAnomaly();
              triggerHapticPulse(gp, 0.7, 0.4, 300);
            }
            prevPhaseRef.current = nextSim.phase;
            prevAnomalyIdRef.current = nextSim.activeAnomaly?.id ?? null;

            setSimState(nextSim);
          }
        }
      } else {
        accum = 0;
      }

      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('gamepadconnected', onGamepadChange);
      window.removeEventListener('gamepaddisconnected', onGamepadChange);
    };
  }, [handleLaunchMission, handleResetAttitude, handleResolveAnomaly, handleStartWorkbench]);

  // Keyboard listeners for flight control keys + global shortcuts
  useEffect(() => {
    const flightCodes = new Set([
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'KeyQ',
      'KeyE',
      'KeyR',
      'KeyX',
      'KeyF',
      'KeyI',
      'KeyK',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'Equal',
      'Minus',
      'BracketLeft',
      'BracketRight',
    ]);

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (flightCodes.has(e.code)) {
        heldKeysRef.current.add(e.code);
        if (e.code.startsWith('Arrow')) {
          e.preventDefault();
        }
      }

      if (screen === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleStartWorkbench();
      } else if (screen === 'simulation' && !outcome && (e.key === 'Escape' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setSimPaused((p) => !p);
      } else if (screen === 'simulation' && e.code === 'KeyN') {
        handleResetAttitude();
      } else if (e.key.toLowerCase() === 'm') {
        handleToggleMute();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(e.code);
    };

    const clearHeld = () => {
      heldKeysRef.current.clear();
      mouseHoldRef.current = {};
    };

    const onVisibility = () => {
      if (document.hidden) clearHeld();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHeld);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearHeld);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [screen, outcome, handleStartWorkbench, handleToggleMute, handleResetAttitude]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#060911] select-none">
      {/* Persistent 3D Procedural Viewport */}
      <SpacecraftAndOrbit3D
        mode={screen}
        viewPreset={viewPreset}
        explodedAmount={explodedAmount}
        evaluation={evaluation}
        simState={simState}
        flightInputRef={flightInputRef}
        introTelemetryRef={introTelemetryRef}
        previewTrajectory={screen === 'workbench' ? previewTrajectory : undefined}
        onTrajectoryDrag={handleTrajectoryDrag}
      />

      {screen === 'starter' && (
        <LaunchStageLanding
          selectedScenarioId={design.scenarioId}
          selectedDifficultyId={design.difficultyId}
          teamMode={design.teamMode}
          introTelemetryRef={introTelemetryRef}
          onSelectScenario={handleSelectScenario}
          onSelectDifficulty={handleSelectDifficulty}
          onToggleTeamMode={handleToggleTeamMode}
          onContinueToHome={() => setScreen('intro')}
          onLaunchOptimalDirect={handleLaunchOptimalPreset}
        />
      )}

      {screen === 'intro' && (
        <PresentationPage
          introTelemetryRef={introTelemetryRef}
          onStartMissionSetup={() => {
            missionAudio.playSelect();
            setScreen('title');
          }}
          onQuickWorkbench={handleStartWorkbench}
          onQuickLaunchOptimal={handleLaunchOptimalPreset}
          onReplayStarter={() => {
            missionAudio.playSelect();
            setScreen('starter');
          }}
        />
      )}

      {screen === 'title' && (
        <TitleScreen
          selectedScenarioId={design.scenarioId}
          selectedDifficultyId={design.difficultyId}
          teamMode={design.teamMode}
          archive={archive}
          onSelectScenario={handleSelectScenario}
          onSelectDifficulty={handleSelectDifficulty}
          onToggleTeamMode={handleToggleTeamMode}
          onStartMission={handleStartWorkbench}
          onOpenPresentation={() => {
            missionAudio.playSelect();
            setScreen('intro');
          }}
        />
      )}

      {screen === 'workbench' && (
        <DesignWorkbench
          design={design}
          evaluation={evaluation}
          viewPreset={viewPreset}
          explodedAmount={explodedAmount}
          muted={muted}
          previewTrajectory={previewTrajectory}
          controllerProfile={controllerProfile}
          onResetTrajectoryPreview={() => setPreviewTrajectory({ altKm: 0, incDeg: 0 })}
          onUpdateDesign={setDesign}
          onResetPreset={() => {
            missionAudio.playSelect();
            setPreviewTrajectory({ altKm: 0, incDeg: 0 });
            setDesign((prev) => createDefaultDesign(prev.scenarioId, prev.difficultyId, prev.teamMode));
          }}
          onApplyOptimalPreset={handleApplyOptimalPreset}
          onLaunchOptimalPreset={handleLaunchOptimalPreset}
          onChangeViewPreset={setViewPreset}
          onChangeExploded={setExplodedAmount}
          onToggleMute={handleToggleMute}
          onBackToTitle={() => setScreen('title')}
          onLaunchMission={handleLaunchMission}
        />
      )}

      {screen === 'simulation' && simState && (
        <SimulationHUD
          evaluation={evaluation}
          simState={simState}
          paused={simPaused}
          speedMultiplier={simSpeed}
          viewPreset={viewPreset}
          muted={muted}
          teamMode={design.teamMode}
          controllerProfile={controllerProfile}
          activeInputSource={activeInputSource}
          onFlightHoldChange={handleFlightHoldChange}
          onResetAttitude={handleResetAttitude}
          onTogglePause={() => setSimPaused((p) => !p)}
          onChangeSpeed={setSimSpeed}
          onChangeCamera={setViewPreset}
          onToggleMute={handleToggleMute}
          onResolveAnomaly={handleResolveAnomaly}
          onAbortToWorkbench={() => {
            setSimPaused(false);
            setViewPreset('assembly');
            setScreen('workbench');
          }}
        />
      )}

      {/* Simulation Pause Overlay (with Minimize & Close) */}
      {screen === 'simulation' && simPaused && !outcome &&
        (pauseMinimized ? (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 bg-[#0B111E]/95 border border-slate-700 rounded-xl px-4 py-2 shadow-2xl flex items-center gap-3">
            <span className="font-display font-bold text-xs text-slate-100 uppercase tracking-wide">
              Mission Paused (Day {Math.floor(simState?.elapsedDays ?? 0)})
            </span>
            <button
              type="button"
              onClick={() => setSimPaused(false)}
              className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-[11px] uppercase cursor-pointer"
            >
              Resume
            </button>
            <WindowControls
              title="Pause Dialog"
              minimized={true}
              onToggleMinimize={() => setPauseMinimized(false)}
              onClose={() => setSimPaused(false)}
            />
          </div>
        ) : (
        <div className="fixed inset-0 z-30 bg-[#05080F]/75 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0B111E] border border-slate-700 rounded-2xl p-6 text-center shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono-tabular text-xs uppercase tracking-widest text-cyan-400">
                {DIFFICULTIES.find((d) => d.id === design.difficultyId)?.name} Simulation
              </div>
              <WindowControls
                title="Pause Dialog"
                minimized={false}
                onToggleMinimize={() => setPauseMinimized(true)}
                onClose={() => setSimPaused(false)}
              />
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-50">Mission Paused</h2>
            <p className="text-xs text-slate-400">
              Telemetry holds at Day {Math.floor(simState?.elapsedDays ?? 0)}. Resume flight ops or return to
              Spacecraft Workbench.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setSimPaused(false)}
                className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-sm uppercase cursor-pointer"
              >
                Resume Flight
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimPaused(false);
                  setViewPreset('assembly');
                  setScreen('workbench');
                }}
                className="w-full py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-medium cursor-pointer"
              >
                Return to Workbench
              </button>
            </div>
          </div>
        </div>
        ))}

      {screen === 'simulation' && simState && outcome && (
        <DebriefModal
          design={design}
          evaluation={evaluation}
          simState={simState}
          outcome={outcome}
          onEditDesign={() => {
            setViewPreset('assembly');
            setScreen('workbench');
          }}
          onReplaySim={handleLaunchMission}
          onReturnTitle={() => setScreen('title')}
        />
      )}
    </div>
  );
}
