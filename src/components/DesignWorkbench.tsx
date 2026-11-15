import React, { useState } from 'react';
import {
  ADCS_OPTIONS,
  BATTERIES,
  BUSES,
  COMMS_BANDS,
  DIFFICULTIES,
  GROUND_NETWORKS,
  INSTRUMENTS,
  LAUNCH_VEHICLES,
  ORBITS,
  SOLAR_ARRAYS,
  TEAM_ROLES,
  THERMAL_MATERIAL_OPTIONS,
  type DifficultyId,
  type TeamRoleId,
} from '../engine/missionCatalog';
import type { DesignEvaluation, MissionDesign } from '../engine/missionPhysics';
import type { ControllerProfile } from '../engine/flightControls';
import type { ViewportCameraPreset } from './SpacecraftAndOrbit3D';
import { GroundTrack2D } from './GroundTrack2D';
import { TradeSpaceRadar2D } from './TradeSpaceRadar2D';
import { missionAudio } from '../audio/missionAudio';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Compass,
  Cpu,
  Layers,
  Maximize2,
  Microscope,
  Radio,
  Rocket,
  RotateCcw,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { WindowControls } from './WindowControls';

type CmlTab = 'cml1' | 'cml2' | 'cml3' | 'cml4';
type CenterMode = '3d-assembly' | '3d-orbit' | '2d-blueprint';

interface DesignWorkbenchProps {
  design: MissionDesign;
  evaluation: DesignEvaluation;
  viewPreset: ViewportCameraPreset;
  explodedAmount: number;
  muted: boolean;
  previewTrajectory?: { altKm: number; incDeg: number };
  controllerProfile?: ControllerProfile;
  onResetTrajectoryPreview?: () => void;
  onUpdateDesign: (updater: (prev: MissionDesign) => MissionDesign) => void;
  onResetPreset: () => void;
  onApplyOptimalPreset: () => void;
  onLaunchOptimalPreset: () => void;
  onChangeViewPreset: (preset: ViewportCameraPreset) => void;
  onChangeExploded: (val: number) => void;
  onToggleMute: () => void;
  onBackToTitle: () => void;
  onLaunchMission: () => void;
}

export const DesignWorkbench: React.FC<DesignWorkbenchProps> = ({
  design,
  evaluation,
  viewPreset,
  explodedAmount,
  muted,
  previewTrajectory = { altKm: 0, incDeg: 0 },
  controllerProfile = 'none',
  onResetTrajectoryPreview,
  onUpdateDesign,
  onResetPreset,
  onApplyOptimalPreset,
  onLaunchOptimalPreset,
  onChangeViewPreset,
  onChangeExploded,
  onToggleMute,
  onBackToTitle,
  onLaunchMission,
}) => {
  const [activeTab, setActiveTab] = useState<CmlTab>('cml1');
  const [centerMode, setCenterMode] = useState<CenterMode>(
    viewPreset === 'orbit' ? '3d-orbit' : '3d-assembly'
  );
  const [mobileMarginsOpen, setMobileMarginsOpen] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureMinimized, setFailureMinimized] = useState(false);
  const [designerMinimized, setDesignerMinimized] = useState(false);
  const [designerClosed, setDesignerClosed] = useState(false);
  const [telemetryMinimized, setTelemetryMinimized] = useState(false);
  const [telemetryClosed, setTelemetryClosed] = useState(false);
  const [blueprintMinimized, setBlueprintMinimized] = useState(false);

  const activeRoleCfg = TEAM_ROLES.find((r) => r.id === design.activeRole) ?? TEAM_ROLES[0];
  const signoffCount = Object.values(design.roleSignoffs).filter(Boolean).length;

  const handleCenterSwitch = (mode: CenterMode) => {
    missionAudio.playSelect();
    setCenterMode(mode);
    if (mode === '3d-assembly') onChangeViewPreset('assembly');
    if (mode === '3d-orbit') onChangeViewPreset('orbit');
  };

  const selectField = <K extends keyof MissionDesign>(key: K, value: MissionDesign[K]) => {
    missionAudio.playSelect();
    onUpdateDesign((prev) => ({ ...prev, [key]: value }));
  };

  const toggleInstrument = (instId: string) => {
    missionAudio.playSelect();
    onUpdateDesign((prev) => {
      const exists = prev.instrumentIds.includes(instId);
      const nextIds = exists
        ? prev.instrumentIds.filter((id) => id !== instId)
        : [...prev.instrumentIds, instId];
      return { ...prev, instrumentIds: nextIds };
    });
  };

  const toggleVerification = (key: keyof MissionDesign['verification']) => {
    missionAudio.playSelect();
    onUpdateDesign((prev) => ({
      ...prev,
      verification: {
        ...prev.verification,
        [key]: !prev.verification[key],
      },
    }));
  };

  const toggleRoleSignoff = (roleId: TeamRoleId) => {
    missionAudio.playSelect();
    onUpdateDesign((prev) => ({
      ...prev,
      roleSignoffs: {
        ...prev.roleSignoffs,
        [roleId]: !prev.roleSignoffs[roleId],
      },
    }));
  };

  const tabs: Array<{ id: CmlTab; label: string; icon: React.ReactNode }> = [
    { id: 'cml1', label: '1. Objectives', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'cml2', label: '2. Bus & Power', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'cml3', label: '3. Science', icon: <Microscope className="w-3.5 h-3.5" /> },
    { id: 'cml4', label: '4. Orbit & Ops', icon: <Radio className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col">
      {/* Top Workbench Header */}
      <header className="pointer-events-auto min-h-14 py-1.5 shrink-0 bg-[#0B111E]/95 border-b border-slate-800 px-3 sm:px-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-[210px]">
          <button
            type="button"
            onClick={onBackToTitle}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 cursor-pointer shrink-0"
            title="Return to Program Selection"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={design.missionName}
                onChange={(e) => selectField('missionName', e.target.value)}
                aria-label="Mission Name"
                className="bg-transparent font-display font-bold text-sm sm:text-base text-slate-50 border-b border-transparent focus:border-cyan-400 focus:outline-none truncate w-32 sm:w-52"
              />
              <span className="hidden sm:inline text-[10px] font-mono-tabular uppercase px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                {evaluation.difficulty.name}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {evaluation.scenario.title} · {evaluation.scenario.solarDistanceAu} AU
            </div>
          </div>
        </div>

        {/* 4-Player Team Role Switcher */}
        {design.teamMode && (
          <div className="hidden md:flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg p-1">
            {TEAM_ROLES.map((role) => {
              const active = design.activeRole === role.id;
              const signed = design.roleSignoffs[role.id];
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => selectField('activeRole', role.id)}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                    active ? 'bg-slate-800 text-slate-50' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: role.accentHex }} />
                  {role.shortTitle}
                  {signed && <Check className="w-3 h-3 text-emerald-400" />}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => toggleRoleSignoff(design.activeRole)}
              className={`ml-1 px-2 py-1 rounded text-[10px] font-mono-tabular uppercase cursor-pointer border ${
                design.roleSignoffs[design.activeRole]
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-cyan-400'
              }`}
            >
              {design.roleSignoffs[design.activeRole] ? 'Signed Off' : `Sign Off (${signoffCount}/4)`}
            </button>
          </div>
        )}

        {/* Right Launch & Utility Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMarginsOpen((v) => !v)}
            className="xl:hidden px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono-tabular text-slate-200 cursor-pointer"
          >
            Margins ({evaluation.blockers.length})
          </button>

          <button
            type="button"
            onClick={onApplyOptimalPreset}
            className="px-2.5 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/50 hover:bg-emerald-500/25 text-emerald-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Auto-configure optimal spacecraft, rocket & verification"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Auto-Setup</span>
          </button>

          <button
            type="button"
            onClick={onResetPreset}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 cursor-pointer"
            title="Reset to Baseline Architecture"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 cursor-pointer"
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (evaluation.canLaunch) {
                onLaunchMission();
              } else {
                missionAudio.playWarn();
                setFailureMinimized(false);
                setShowFailureModal(true);
              }
            }}
            className={`px-4 py-2 rounded-lg font-display font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2 transition-colors cursor-pointer ${
              evaluation.canLaunch
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                : 'bg-rose-950/90 hover:bg-rose-900 text-rose-200 border border-rose-500/70'
            }`}
          >
            {evaluation.canLaunch ? <Rocket className="w-4 h-4" /> : <AlertOctagon className="w-4 h-4 text-rose-400" />}
            {evaluation.canLaunch ? 'Launch Mission' : `Structural Alert (${evaluation.blockers.length})`}
          </button>
        </div>
      </header>

      {/* Main 3-Zone Workspace */}
      <div className="flex-1 min-h-0 flex relative">
        {/* Left CML 1–4 Design Rail (with Minimize & Close) */}
        {designerClosed ? (
          <div className="pointer-events-auto absolute top-3 left-3 z-20">
            <button
              type="button"
              onClick={() => setDesignerClosed(false)}
              className="px-3 py-1.5 rounded-lg bg-[#0B111E]/95 border border-slate-700 hover:border-cyan-400 text-slate-200 text-xs font-medium flex items-center gap-1.5 shadow-xl cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              Open CML Designer
            </button>
          </div>
        ) : (
          <aside
            className={`pointer-events-auto w-full sm:w-[390px] lg:w-[410px] shrink-0 bg-[#0B111E]/95 border-r border-slate-800 flex flex-col ${
              designerMinimized ? 'self-start border-b rounded-br-xl' : 'min-h-0'
            }`}
          >
            {/* Window Title Bar with Minimize & Close */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#060910] border-b border-slate-800">
              <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-wider text-cyan-300">
                <Cpu className="w-3.5 h-3.5" />
                <span>CML 1–4 Designer</span>
              </div>
              <WindowControls
                title="CML Designer"
                minimized={designerMinimized}
                onToggleMinimize={() => setDesignerMinimized((m) => !m)}
                onClose={() => setDesignerClosed(true)}
              />
            </div>

            {!designerMinimized && (
              <>
                {/* CML Tab Bar */}
                <div className="grid grid-cols-4 border-b border-slate-800 bg-[#070B13]">
            {tabs.map((t) => {
              const active = activeTab === t.id;
              const ownedByActiveRole = design.teamMode && activeRoleCfg.ownedTabs.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    missionAudio.playSelect();
                    setActiveTab(t.id);
                  }}
                  className={`py-2.5 px-1 text-[11px] font-medium flex flex-col items-center gap-1 border-b-2 cursor-pointer transition-colors ${
                    active
                      ? 'border-cyan-400 text-cyan-300 bg-slate-900/70'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {t.icon}
                    {ownedByActiveRole && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: activeRoleCfg.accentHex }}
                      />
                    )}
                  </div>
                  <span className="truncate max-w-full">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Role Guidance Banner in Team Mode */}
          {design.teamMode && (
            <div className="px-3.5 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between gap-2 text-[11px]">
              <div className="min-w-0">
                <span className="font-semibold" style={{ color: activeRoleCfg.accentHex }}>
                  {activeRoleCfg.title}:
                </span>{' '}
                <span className="text-slate-300">{activeRoleCfg.responsibility}</span>
              </div>
            </div>
          )}

          {/* Scrollable Tab Body */}
          <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-4">
            {activeTab === 'cml1' && (
              <>
                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-cyan-300">
                    CML 1 · Science Traceability Matrix (STM)
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{evaluation.scenario.description}</p>
                  <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex flex-col gap-1.5">
                    {evaluation.scenario.stmObjectives.map((obj, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-tabular uppercase tracking-wider text-slate-400">
                      Difficulty Tier
                    </span>
                    <span className="font-mono-tabular text-amber-300">
                      Target Margin ≥ {evaluation.difficulty.requiredMarginPct}%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {DIFFICULTIES.map((d) => {
                      const active = design.difficultyId === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => selectField('difficultyId', d.id as DifficultyId)}
                          className={`text-left px-3 py-2 rounded-lg border cursor-pointer flex items-center justify-between ${
                            active
                              ? 'bg-amber-500/15 border-amber-400 text-slate-100'
                              : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold">
                              {d.name} ({d.tierLabel})
                            </div>
                            <div className="text-[11px] text-slate-400">{d.description}</div>
                          </div>
                          <span className="font-mono-tabular text-xs text-amber-300 shrink-0 ml-2">
                            {Math.round(evaluation.scenario.baseBudgetM * d.budgetMultiplier)}M Cap
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="bg-slate-900/70 border border-slate-800 rounded-lg p-3 text-xs flex flex-col gap-1">
                  <div className="font-mono-tabular text-[11px] uppercase text-cyan-300">
                    NASA Heritage Analogue
                  </div>
                  <div className="font-semibold text-slate-100">{evaluation.scenario.nasaAnalogueName}</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {evaluation.scenario.nasaAnalogueSummary}
                  </p>
                </section>
              </>
            )}

            {activeTab === 'cml2' && (
              <>
                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-cyan-300">
                    Spacecraft Bus Structure &amp; Propulsion
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {BUSES.map((b) => {
                      const active = design.busId === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => selectField('busId', b.id)}
                          className={`text-left p-2.5 rounded-lg border cursor-pointer transition-colors ${
                            active
                              ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                              : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{b.name}</span>
                            <span className="font-mono-tabular text-cyan-300">${b.baseCostM}M</span>
                          </div>
                          <div className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                            Max {b.maxBusMassKg} kg · {b.maxPayloadSlots} slots · Δv {b.deltaVCapacityMs} m/s ·{' '}
                            {b.radiationToleranceKrad} krad
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-cyan-300">
                    Solar Array Wings ({evaluation.scenario.solarDistanceAu} AU Flux:{' '}
                    {(evaluation.solarIrradianceFactor * 100).toFixed(1)}%)
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {SOLAR_ARRAYS.map((s) => {
                      const active = design.solarId === s.id;
                      const oversized = s.areaM2 > evaluation.bus.maxSolarAreaM2;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => selectField('solarId', s.id)}
                          className={`text-left p-2.5 rounded-lg border cursor-pointer ${
                            active
                              ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                              : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{s.name}</span>
                            <span className="font-mono-tabular text-cyan-300">${s.costM}M</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                            <span>
                              {s.areaM2} m² · {s.massKg} kg · {s.efficiencyPct}% eff
                            </span>
                            {oversized && <span className="text-rose-400">Exceeds bus area</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-cyan-300">
                    Battery Energy Storage (Eclipse: {evaluation.eclipseDurationMin.toFixed(0)} min)
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {BATTERIES.map((bat) => {
                      const active = design.batteryId === bat.id;
                      return (
                        <button
                          key={bat.id}
                          type="button"
                          onClick={() => selectField('batteryId', bat.id)}
                          className={`text-left p-2.5 rounded-lg border cursor-pointer ${
                            active
                              ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                              : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{bat.name}</span>
                            <span className="font-mono-tabular text-cyan-300">${bat.costM}M</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                            <span>
                              {bat.capacityWh} Wh · {bat.massKg} kg
                            </span>
                            <span className={bat.ulListed ? 'text-emerald-400' : 'text-rose-400'}>
                              {bat.ulListed ? 'UL-1642 Flight Safe' : 'Non-UL COTS Risk'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-cyan-300">
                    ADCS Pointing &amp; Flight Avionics
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {ADCS_OPTIONS.map((a) => {
                      const active = design.adcsId === a.id;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => selectField('adcsId', a.id)}
                          className={`text-left p-2.5 rounded-lg border cursor-pointer ${
                            active
                              ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                              : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{a.name}</span>
                            <span className="font-mono-tabular text-cyan-300">${a.costM}M</span>
                          </div>
                          <div className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                            {a.pointingArcsec}&quot; pointing · {a.massKg} kg · {a.powerW} W ·{' '}
                            {a.radHardened ? 'Rad-Hard' : 'Standard CPU'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-cyan-300">
                    Materials, Outgassing &amp; Thermal Control
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {THERMAL_MATERIAL_OPTIONS.map((m) => {
                      const active = design.materialId === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => selectField('materialId', m.id)}
                          className={`text-left p-2.5 rounded-lg border cursor-pointer ${
                            active
                              ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                              : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{m.name}</span>
                            <span className="font-mono-tabular text-cyan-300">${m.costM}M</span>
                          </div>
                          <div className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                            {m.thermalRangeC} · {m.lowOutgassing ? 'Low Outgassing' : 'TVAC Bakeout Penalty'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </>
            )}

            {activeTab === 'cml3' && (
              <section className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs font-mono-tabular">
                  <span className="uppercase tracking-wider text-cyan-300">
                    Payload Bay ({evaluation.slotsUsed}/{evaluation.slotsMax} Slots)
                  </span>
                  <span
                    className={
                      evaluation.scienceTargetMet ? 'text-emerald-400 font-semibold' : 'text-amber-300 font-semibold'
                    }
                  >
                    {evaluation.effectiveScienceScore} / {evaluation.scenario.minScienceScore} Sci Pts
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {INSTRUMENTS.map((inst) => {
                    const selected = design.instrumentIds.includes(inst.id);
                    const matchesDomain = inst.domainMatch.includes(evaluation.scenario.domain);
                    const pointingOk = evaluation.adcs.pointingArcsec <= inst.requiredPointingArcsec;
                    return (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => toggleInstrument(inst.id)}
                        className={`text-left p-3 rounded-lg border cursor-pointer transition-colors ${
                          selected
                            ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                            : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-semibold flex items-center gap-1.5">
                              <span>{inst.name}</span>
                              {matchesDomain && (
                                <span className="text-[9px] font-mono-tabular uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                  Primary Match
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{inst.description}</p>
                          </div>
                          <div className="text-right font-mono-tabular text-xs shrink-0">
                            <div className="text-cyan-300">${inst.costM}M</div>
                            <div className="text-[10px] text-amber-300">+{inst.scienceValue} Sci</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono-tabular text-slate-400 mt-2 pt-1.5 border-t border-slate-800/80">
                          <span>{inst.slotsRequired} slot(s)</span>
                          <span>{inst.massKg} kg</span>
                          <span>{inst.powerW} W</span>
                          <span>{inst.dataRateKbps} kbps</span>
                          <span className={pointingOk ? 'text-slate-400' : 'text-amber-400'}>
                            Req ≤{inst.requiredPointingArcsec}&quot;
                          </span>
                          {inst.protrusionMm > 6.5 && <span className="text-amber-300">{inst.protrusionMm}mm prot.</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {activeTab === 'cml4' && (
              <>
                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-cyan-300">
                    Target Orbit &amp; Radiation Environment
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {ORBITS.map((o) => {
                      const active = design.orbitId === o.id;
                      const wrongBody = o.targetBody !== evaluation.scenario.targetBody;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => selectField('orbitId', o.id)}
                          className={`text-left p-2.5 rounded-lg border cursor-pointer ${
                            active
                              ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                              : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{o.name}</span>
                            {wrongBody ? (
                              <span className="text-[10px] font-mono-tabular text-rose-400">
                                Wrong Body ({o.targetBody.toUpperCase()})
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono-tabular text-emerald-400">
                                {o.scienceMultiplier}x Sci
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                            Δv {o.requiredDeltaVMs} m/s · {o.radiationDoseKradYr} krad/yr · Eclipse{' '}
                            {Math.round(o.eclipseFraction * 100)}% · Decay{' '}
                            {o.naturalDecayYears > 100 ? 'Stable' : `${o.naturalDecayYears}y`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-cyan-300">
                    Launch Vehicle (Spacecraft Mass: {evaluation.dryMassKg.toFixed(1)} kg)
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {LAUNCH_VEHICLES.map((lv) => {
                      const active = design.launchVehicleId === lv.id;
                      const cap =
                        evaluation.orbit.targetBody !== 'earth'
                          ? lv.maxMassDeepSpaceKg
                          : evaluation.orbit.inclinationDeg >= 80
                            ? lv.maxMassSsoKg
                            : lv.maxMassLeoKg;
                      const overloaded = evaluation.dryMassKg > cap;
                      return (
                        <button
                          key={lv.id}
                          type="button"
                          onClick={() => selectField('launchVehicleId', lv.id)}
                          className={`text-left p-2.5 rounded-lg border cursor-pointer ${
                            active
                              ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                              : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{lv.name}</span>
                            <span className="font-mono-tabular text-cyan-300">${lv.costM}M</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                            <span>
                              {lv.provider} · {lv.reliabilityPct}% rel.
                            </span>
                            <span className={overloaded ? 'text-rose-400' : 'text-emerald-400'}>
                              {cap <= 0 ? 'No Deep-Space Lift' : `Lift: ${cap} kg`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-cyan-300">
                    Communications Band &amp; Ground Network
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {COMMS_BANDS.map((c) => {
                      const active = design.commsId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectField('commsId', c.id)}
                          className={`text-left p-2.5 rounded-lg border cursor-pointer ${
                            active
                              ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                              : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{c.name}</span>
                            <span className="font-mono-tabular text-cyan-300">${c.costM}M</span>
                          </div>
                          <div className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                            {c.txPowerW} W · {c.antennaGainDbi} dBi · Max {c.maxDataRateMbps} Mbps
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-1.5 mt-1">
                    {GROUND_NETWORKS.map((g) => {
                      const active = design.groundNetworkId === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => selectField('groundNetworkId', g.id)}
                          className={`text-left p-2.5 rounded-lg border cursor-pointer ${
                            active
                              ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                              : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{g.name}</span>
                            <span className="font-mono-tabular text-cyan-300">${g.costM}M/yr</span>
                          </div>
                          <div className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                            G/T {g.gtDbK} dB/K · {g.passesPerDay} passes/day · {g.avgPassDurationMin} min
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-cyan-300">
                    CubeSat 101 Verification &amp; Licensing
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        ['ditlTested', 'DITL Sim ($0.5M)'],
                        ['vibrationTested', 'Vib Test ($0.7M)'],
                        ['tvacTested', 'TVAC Test ($0.9M)'],
                        ['fccLicensed', 'FCC RF ($0.2M)'],
                        ['noaaLicensed', 'NOAA Opt ($0.3M)'],
                        ['odarFiled', 'ODAR Debris ($0.2M)'],
                      ] as Array<[keyof MissionDesign['verification'], string]>
                    ).map(([k, label]) => {
                      const checked = design.verification[k];
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => toggleVerification(k)}
                          className={`px-2.5 py-2 rounded-lg border text-left text-[11px] font-mono-tabular flex items-center gap-2 cursor-pointer ${
                            checked
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                              : 'bg-slate-900/70 border-slate-800 text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                              checked ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-600'
                            }`}
                          >
                            {checked && <Check className="w-2.5 h-2.5" />}
                          </span>
                          <span className="truncate">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
          </div>
              </>
            )}
        </aside>
        )}

        {/* Center Unobstructed 3D / 2D Blueprint Viewport */}
        <main className="flex-1 min-w-0 relative flex flex-col justify-between p-3 pointer-events-none">
          {/* Top-Center View Mode & Exploded CAD Controls */}
          <div className="pointer-events-auto mx-auto flex flex-wrap items-center gap-2 bg-[#0B111E]/95 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-xl">
            {(
              [
                ['3d-assembly', '3D Spacecraft CAD'],
                ['3d-orbit', '3D Orbit View'],
                ['2d-blueprint', '2D Track & Link Sheet'],
              ] as Array<[CenterMode, string]>
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => handleCenterSwitch(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  centerMode === m
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}

            {centerMode === '3d-assembly' && (
              <div className="flex items-center gap-2 border-l border-slate-700 pl-3 ml-1">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-mono-tabular text-slate-300">Explode CAD</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={explodedAmount}
                  onChange={(e) => onChangeExploded(parseFloat(e.target.value))}
                  aria-label="Exploded CAD View"
                  className="w-20 accent-cyan-400 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* 2D Blueprint & Link Sheet Mode (when toggled, with Minimize & Close) */}
          {centerMode === '2d-blueprint' && (
            <div className="pointer-events-auto m-auto w-full max-w-2xl bg-[#0B111E]/95 border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4 max-h-[82vh] overflow-y-auto">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="text-xs font-mono-tabular uppercase tracking-wider text-cyan-300 font-semibold">
                  2D Ground Track &amp; Master Link Budget
                </div>
                <WindowControls
                  title="2D Track & Link Sheet"
                  minimized={blueprintMinimized}
                  onToggleMinimize={() => setBlueprintMinimized((m) => !m)}
                  onClose={() => handleCenterSwitch('3d-assembly')}
                />
              </div>

              {!blueprintMinimized && (
                <>
                  <GroundTrack2D
                    orbit={evaluation.orbit}
                    groundNetwork={evaluation.groundNetwork}
                    inclinationOffsetDeg={previewTrajectory.incDeg}
                  />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TradeSpaceRadar2D evaluation={evaluation} />

                {/* Master Equipment List & Friis Link Budget Table */}
                <div className="bg-[#070B13] border border-slate-800 rounded-lg p-3 flex flex-col gap-2 text-xs font-mono-tabular">
                  <div className="text-[11px] uppercase tracking-wider text-cyan-300">
                    Master Equipment List &amp; Link Budget
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Bus + Subsystems</span>
                    <span>{(evaluation.dryMassKg - evaluation.instruments.reduce((s, i) => s + i.massKg, 0)).toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Science Instruments ({evaluation.instruments.length})</span>
                    <span>{evaluation.instruments.reduce((s, i) => s + i.massKg, 0).toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between text-slate-100 font-semibold border-t border-slate-800 pt-1">
                    <span>Total Dry Mass / LV Lift</span>
                    <span>
                      {evaluation.dryMassKg.toFixed(1)} / {evaluation.lvCapacityKg} kg
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300 pt-2 border-t border-slate-800">
                    <span>Free-Space Path Loss</span>
                    <span>{evaluation.freeSpacePathLossDb.toFixed(1)} dB</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Net Link Margin</span>
                    <span className={evaluation.linkMarginDb >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {evaluation.linkMarginDb.toFixed(1)} dB
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Data Gen / Downlink</span>
                    <span>
                      {evaluation.dailyDataGeneratedGb.toFixed(2)} / {evaluation.dailyDataDownlinkGb.toFixed(2)} GB/d
                    </span>
                  </div>
                </div>
              </div>
                </>
              )}
            </div>
          )}

          {/* Bottom-Center 3D Interaction & Trajectory Preview Strip */}
          {centerMode !== '2d-blueprint' && (
            <div className="pointer-events-auto mx-auto flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono-tabular text-slate-300 bg-[#070A10]/85 px-3 py-1.5 rounded-full border border-slate-800/80 shadow-lg">
              {centerMode === '3d-orbit' ? (
                <>
                  <span className="text-amber-300">Drag gold node to test trajectory</span>
                  <span className="text-slate-500">·</span>
                  <span>
                    Alt{' '}
                    <strong className="text-cyan-300">
                      {previewTrajectory.altKm >= 0 ? '+' : ''}
                      {Math.round(previewTrajectory.altKm)} km
                    </strong>{' '}
                    · Inc{' '}
                    <strong className="text-emerald-300">
                      {previewTrajectory.incDeg >= 0 ? '+' : ''}
                      {previewTrajectory.incDeg.toFixed(1)}°
                    </strong>
                  </span>
                  {(Math.abs(previewTrajectory.altKm) > 1 || Math.abs(previewTrajectory.incDeg) > 0.2) &&
                    onResetTrajectoryPreview && (
                      <button
                        type="button"
                        onClick={onResetTrajectoryPreview}
                        className="ml-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-slate-700 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                </>
              ) : (
                <span>
                  WASD / Arrows / Q-E rotate craft · Drag to orbit · Scroll to zoom
                  {controllerProfile === 'ps5-dualsense'
                    ? ' · PS5 DualSense Ready'
                    : controllerProfile === 'ps4-dualshock'
                      ? ' · PS4 DualShock 4 Ready'
                      : controllerProfile === 'gamepad'
                        ? ' · Gamepad Ready'
                        : ''}
                </span>
              )}
            </div>
          )}
        </main>

        {/* Right Coupled Systems Telemetry & CML Readiness Rail (with Minimize & Close) */}
        {telemetryClosed ? (
          <div className="pointer-events-auto absolute top-3 right-3 z-20 hidden xl:block">
            <button
              type="button"
              onClick={() => setTelemetryClosed(false)}
              className="px-3 py-1.5 rounded-lg bg-[#0B111E]/95 border border-slate-700 hover:border-cyan-400 text-slate-200 text-xs font-medium flex items-center gap-1.5 shadow-xl cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              Open Telemetry
            </button>
          </div>
        ) : (
          <aside
            className={`pointer-events-auto ${
              mobileMarginsOpen ? 'flex fixed right-0 top-14 bottom-0 z-30 w-80' : 'hidden xl:flex w-[310px]'
            } shrink-0 bg-[#0B111E]/95 border-l border-slate-800 flex-col gap-3 p-3.5 ${
              telemetryMinimized ? 'self-start border-b rounded-bl-xl' : 'overflow-y-auto'
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono-tabular uppercase tracking-wider text-cyan-300">
                <Sliders className="w-3.5 h-3.5" />
                <span>Coupled Telemetry</span>
              </div>
              <WindowControls
                title="Coupled Telemetry"
                minimized={telemetryMinimized}
                onToggleMinimize={() => setTelemetryMinimized((m) => !m)}
                onClose={() => {
                  setMobileMarginsOpen(false);
                  setTelemetryClosed(true);
                }}
              />
            </div>

            {telemetryMinimized ? (
              <div className="flex items-center justify-between text-xs font-mono-tabular">
                <span className={evaluation.canLaunch ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                  {evaluation.canLaunch ? 'LAUNCH READY' : `${evaluation.blockers.length} BLOCKER(S)`}
                </span>
                <span className="text-slate-300">
                  {evaluation.dryMassKg.toFixed(1)}kg · ${evaluation.totalCostM.toFixed(1)}M
                </span>
              </div>
            ) : (
              <>
                <TradeSpaceRadar2D evaluation={evaluation} />

          {/* Coupled Resource Meters */}
          <div className="flex flex-col gap-2 bg-[#070B13] border border-slate-800 rounded-lg p-3 font-mono-tabular text-xs">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-cyan-300 mb-0.5">
              <Sliders className="w-3.5 h-3.5" />
              Coupled Resource Budgets
            </div>

            <MetricRow
              label="Budget"
              value={`$${evaluation.totalCostM.toFixed(1)}M / $${evaluation.budgetCapM.toFixed(1)}M`}
              ok={evaluation.budgetMarginPct >= 0}
              sub={`${evaluation.budgetMarginPct.toFixed(0)}% reserve`}
            />
            <MetricRow
              label="Mass vs LV"
              value={`${evaluation.dryMassKg.toFixed(1)} / ${evaluation.lvCapacityKg} kg`}
              ok={evaluation.massMarginVsBusPct >= 0 && evaluation.massMarginVsLvPct >= 0}
              sub={`Bus margin ${evaluation.massMarginVsBusPct.toFixed(0)}%`}
            />
            <MetricRow
              label="Orbit Power"
              value={`${evaluation.orbitAvgPowerGenW.toFixed(0)} W / ${evaluation.avgPowerDrawW.toFixed(0)} W`}
              ok={evaluation.powerMarginPct >= evaluation.difficulty.requiredMarginPct}
              warn={evaluation.powerMarginPct >= 0 && evaluation.powerMarginPct < evaluation.difficulty.requiredMarginPct}
              sub={`Margin ${evaluation.powerMarginPct.toFixed(0)}%`}
            />
            <MetricRow
              label="Eclipse DoD"
              value={`${evaluation.batteryDoDPct.toFixed(0)}% / ${evaluation.battery.maxDoDPct}%`}
              ok={evaluation.batteryDoDPct <= evaluation.battery.maxDoDPct}
              sub={`${evaluation.eclipseEnergyWh.toFixed(0)} Wh eclipse`}
            />
            <MetricRow
              label="RF Link"
              value={`${evaluation.linkMarginDb.toFixed(1)} dB`}
              ok={evaluation.linkMarginDb >= evaluation.difficulty.requiredLinkMarginDb}
              warn={evaluation.linkMarginDb >= 0 && evaluation.linkMarginDb < evaluation.difficulty.requiredLinkMarginDb}
              sub={`${evaluation.dailyDataDownlinkGb.toFixed(2)} GB/d cap`}
            />
            <MetricRow
              label="Science Est."
              value={`${evaluation.effectiveScienceScore} / ${evaluation.scenario.minScienceScore}`}
              ok={evaluation.scienceTargetMet}
              sub={`${evaluation.pointingMatchedCount}/${evaluation.instruments.length} ADCS match`}
            />
          </div>

          {/* CML 1-4 Readiness Strip */}
          <div className="bg-[#070B13] border border-slate-800 rounded-lg p-3 flex flex-col gap-1.5">
            <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
              NASA JPL CML 1–4 Readiness
            </div>
            <div className="grid grid-cols-4 gap-1.5 font-mono-tabular text-center">
              {(
                [
                  ['CML 1', evaluation.cmlScores.cml1],
                  ['CML 2', evaluation.cmlScores.cml2],
                  ['CML 3', evaluation.cmlScores.cml3],
                  ['CML 4', evaluation.cmlScores.cml4],
                ] as Array<[string, number]>
              ).map(([lbl, val]) => (
                <div key={lbl} className="bg-slate-900 border border-slate-800 rounded py-1.5">
                  <div className="text-[10px] text-slate-400">{lbl}</div>
                  <div className={`text-xs font-bold ${val >= 80 ? 'text-emerald-400' : val >= 55 ? 'text-amber-300' : 'text-rose-400'}`}>
                    {val}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blockers & Coupled Warnings */}
          <div className="flex flex-col gap-1.5">
            {evaluation.blockers.map((b, i) => (
              <div
                key={`blk-${i}`}
                className="bg-rose-950/50 border border-rose-500/50 rounded-lg p-2.5 text-[11px] text-rose-200 flex items-start gap-2"
              >
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{b}</span>
              </div>
            ))}
            {evaluation.warnings.map((w, i) => (
              <div
                key={`wrn-${i}`}
                className="bg-amber-950/40 border border-amber-500/40 rounded-lg p-2.5 text-[11px] text-amber-200 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
            {evaluation.canLaunch && evaluation.warnings.length === 0 && (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-lg p-2.5 text-[11px] text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>All coupled margins and CubeSat 101 compliance gates cleared for launch.</span>
              </div>
            )}
          </div>
              </>
            )}
        </aside>
        )}
      </div>

      {/* Structural Engineering & Launch Authorization Failure Alert Modal (with Minimize & Close) */}
      {showFailureModal &&
        (failureMinimized ? (
          <div className="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#0B111E]/95 border border-rose-500/80 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-3">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-xs font-semibold text-rose-100 whitespace-nowrap">
              Structural Alert ({evaluation.blockers.length} Blockers)
            </span>
            <button
              type="button"
              onClick={() => {
                onApplyOptimalPreset();
                setShowFailureModal(false);
              }}
              className="px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 text-[11px] font-semibold cursor-pointer"
            >
              Auto-Setup
            </button>
            <WindowControls
              title="Structural Alert"
              minimized={true}
              variant="rose"
              onToggleMinimize={() => setFailureMinimized(false)}
              onClose={() => setShowFailureModal(false)}
            />
          </div>
        ) : (
        <div
          className="pointer-events-auto fixed inset-0 z-50 bg-[#05080F]/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Structural Engineering & Launch Authorization Failure Alert"
        >
          <div className="w-full max-w-xl bg-[#0B111E] border border-rose-500/80 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-rose-400">
                    Launch Authorization Hold · CML 4 Gate
                  </div>
                  <h3 className="font-display font-bold text-lg text-slate-50">
                    Structural Engineering Failure Alert
                  </h3>
                </div>
              </div>
              <WindowControls
                title="Structural Alert"
                minimized={false}
                variant="rose"
                onToggleMinimize={() => setFailureMinimized(true)}
                onClose={() => setShowFailureModal(false)}
              />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Launch authorization was rejected by Flight Safety. Resolve the coupled resource and structural violations below before ignition:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-tabular">
              <div className="bg-[#070B13] border border-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-400">Mass vs LV</div>
                <div className={evaluation.dryMassKg > evaluation.lvCapacityKg ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {evaluation.dryMassKg.toFixed(1)} / {evaluation.lvCapacityKg} kg
                </div>
              </div>
              <div className="bg-[#070B13] border border-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-400">Budget Cap</div>
                <div className={evaluation.totalCostM > evaluation.budgetCapM ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  ${evaluation.totalCostM.toFixed(1)}M / ${evaluation.budgetCapM.toFixed(1)}M
                </div>
              </div>
              <div className="bg-[#070B13] border border-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-400">Power Margin</div>
                <div className={evaluation.powerMarginPct < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {evaluation.powerMarginPct.toFixed(0)}%
                </div>
              </div>
              <div className="bg-[#070B13] border border-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-400">RF Link</div>
                <div className={evaluation.linkMarginDb < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {evaluation.linkMarginDb.toFixed(1)} dB
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
              {evaluation.blockers.map((b, idx) => (
                <div
                  key={`modal-blk-${idx}`}
                  className="bg-rose-950/60 border border-rose-500/50 rounded-lg p-3 text-xs text-rose-100 flex items-start gap-2.5"
                >
                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{b}</span>
                </div>
              ))}
              {evaluation.warnings.map((w, idx) => (
                <div
                  key={`modal-wrn-${idx}`}
                  className="bg-amber-950/50 border border-amber-500/40 rounded-lg p-2.5 text-xs text-amber-200 flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onApplyOptimalPreset();
                    setShowFailureModal(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/60 hover:bg-emerald-500/30 text-xs font-semibold text-emerald-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-Setup Optimal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFailureModal(false);
                    onLaunchOptimalPreset();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-xs font-display font-bold uppercase text-slate-950 flex items-center gap-1.5 cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  Auto-Setup &amp; Launch
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('cml2');
                    setShowFailureModal(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs text-cyan-300 cursor-pointer"
                >
                  Bus &amp; Rocket
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('cml4');
                    setShowFailureModal(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs text-cyan-300 cursor-pointer"
                >
                  Orbit &amp; Comms
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowFailureModal(false)}
                className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-display font-bold text-xs uppercase cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        ))}
    </div>
  );
};

interface MetricRowProps {
  label: string;
  value: string;
  sub: string;
  ok: boolean;
  warn?: boolean;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, sub, ok, warn }) => (
  <div className="flex items-center justify-between border-b border-slate-800/70 pb-1.5 last:border-b-0 last:pb-0">
    <div>
      <div className="text-slate-300">{label}</div>
      <div className="text-[10px] text-slate-500">{sub}</div>
    </div>
    <div
      className={`text-right font-semibold ${
        ok ? 'text-emerald-400' : warn ? 'text-amber-300' : 'text-rose-400'
      }`}
    >
      {value}
    </div>
  </div>
);
