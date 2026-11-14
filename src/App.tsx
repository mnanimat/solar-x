import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DIFFICULTIES, SCENARIOS, type DifficultyId } from './engine/missionCatalog';
import {
  createDefaultDesign,
  createSimulationState,
  evaluateMissionDesign,
  evaluateMissionOutcome,
  resolveAnomalyChoice,
  stepSimulationTick,
  type AnomalyChoice,
  type MissionDesign,
  type SimulationState,
} from './engine/missionPhysics';
import { SpacecraftAndOrbit3D, type ViewportCameraPreset } from './components/SpacecraftAndOrbit3D';
import { TitleScreen, type ArchivedMissionRun } from './components/TitleScreen';
import { DesignWorkbench } from './components/DesignWorkbench';
import { SimulationHUD } from './components/SimulationHUD';
import { DebriefModal } from './components/DebriefModal';
import { missionAudio } from './audio/missionAudio';

type AppScreen = 'title' | 'workbench' | 'simulation';

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

export default function App() {
  const autostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [screen, setScreen] = useState<AppScreen>(autostart ? 'workbench' : 'title');
  const [design, setDesign] = useState<MissionDesign>(() =>
    createDefaultDesign('bionutrients-leo', 'beginner', false)
  );
  const [viewPreset, setViewPreset] = useState<ViewportCameraPreset>('assembly');
  const [explodedAmount, setExplodedAmount] = useState(0);
  const [muted, setMuted] = useState(false);

  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [simPaused, setSimPaused] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [archive, setArchive] = useState<ArchivedMissionRun[]>(() => loadArchive());
  const archivedCurrentRunRef = useRef(false);

  const evaluation = useMemo(() => evaluateMissionDesign(design), [design]);

  const outcome = useMemo(() => {
    if (!simState || (simState.phase !== 'completed' && simState.phase !== 'failed')) return null;
    return evaluateMissionOutcome(design, evaluation, simState);
  }, [design, evaluation, simState]);

  // Synchronize body.dataset.state for deterministic accessibility & automation hooks
  useEffect(() => {
    if (screen === 'title') {
      document.body.dataset.state = 'title';
    } else if (screen === 'simulation' && outcome) {
      document.body.dataset.state = 'gameover';
    } else if (screen === 'simulation' && simPaused) {
      document.body.dataset.state = 'paused';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [screen, simPaused, outcome]);

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

  // Simulation stepping loop (decoupled from Three.js render loop, throttled ~20 Hz)
  const simRef = useRef({ simState, design, evaluation, simPaused, simSpeed });
  simRef.current = { simState, design, evaluation, simPaused, simSpeed };
  const prevPhaseRef = useRef<string | null>(null);
  const prevAnomalyIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (screen !== 'simulation') return;
    let rafId = 0;
    let lastTick = performance.now();
    let accum = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTick) / 1000);
      lastTick = now;
      accum += dt;

      if (accum >= 0.05) {
        const stepDt = accum;
        accum = 0;
        const { simState: curSim, design: curDes, evaluation: curEval, simPaused: paused, simSpeed: spd } =
          simRef.current;

        if (
          curSim &&
          !paused &&
          !curSim.activeAnomaly &&
          curSim.phase !== 'completed' &&
          curSim.phase !== 'failed'
        ) {
          const nextSim = stepSimulationTick(curSim, curDes, curEval, stepDt, spd);

          if (prevPhaseRef.current === 'launch' && nextSim.phase === 'deployment') {
            missionAudio.playStageSep();
          }
          if (!prevAnomalyIdRef.current && nextSim.activeAnomaly) {
            missionAudio.playAnomaly();
          }
          prevPhaseRef.current = nextSim.phase;
          prevAnomalyIdRef.current = nextSim.activeAnomaly?.id ?? null;

          setSimState(nextSim);
        }
      }
      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(rafId);
  }, [screen]);

  const handleSelectScenario = useCallback((scenarioId: string) => {
    missionAudio.playSelect();
    const sc = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
    setDesign((prev) => createDefaultDesign(scenarioId, sc.recommendedDifficulty, prev.teamMode));
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
    archivedCurrentRunRef.current = false;
    prevPhaseRef.current = 'launch';
    prevAnomalyIdRef.current = null;
    setSimPaused(false);
    setSimSpeed(1);
    setViewPreset('orbit');
    setSimState(createSimulationState(evaluation));
    setScreen('simulation');
  }, [evaluation]);

  const handleResolveAnomaly = useCallback(
    (choice: AnomalyChoice) => {
      missionAudio.playSelect();
      setSimState((prev) => (prev ? resolveAnomalyChoice(prev, choice, evaluation) : prev));
    },
    [evaluation]
  );

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      missionAudio.setMuted(next);
      return next;
    });
  }, []);

  // Keyboard shortcuts: Enter/Space on title, Esc/P pause in simulation, M mute
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (screen === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleStartWorkbench();
      } else if (screen === 'simulation' && !outcome && (e.key === 'Escape' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setSimPaused((p) => !p);
      } else if (e.key.toLowerCase() === 'm') {
        handleToggleMute();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, outcome, handleStartWorkbench, handleToggleMute]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#060911] select-none">
      {/* Persistent 3D Procedural Viewport */}
      <SpacecraftAndOrbit3D
        mode={screen}
        viewPreset={viewPreset}
        explodedAmount={explodedAmount}
        evaluation={evaluation}
        simState={simState}
      />

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
        />
      )}

      {screen === 'workbench' && (
        <DesignWorkbench
          design={design}
          evaluation={evaluation}
          viewPreset={viewPreset}
          explodedAmount={explodedAmount}
          muted={muted}
          onUpdateDesign={setDesign}
          onResetPreset={() => {
            missionAudio.playSelect();
            setDesign((prev) => createDefaultDesign(prev.scenarioId, prev.difficultyId, prev.teamMode));
          }}
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

      {/* Simulation Pause Overlay */}
      {screen === 'simulation' && simPaused && !outcome && (
        <div className="fixed inset-0 z-30 bg-[#05080F]/75 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0B111E] border border-slate-700 rounded-2xl p-6 text-center shadow-2xl flex flex-col gap-4">
            <div className="font-mono-tabular text-xs uppercase tracking-widest text-cyan-400">
              {DIFFICULTIES.find((d) => d.id === design.difficultyId)?.name} Simulation
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
      )}

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
