import React, { useState } from 'react';
import {
  DIFFICULTIES,
  SCENARIOS,
  TEAM_ROLES,
  type DifficultyId,
} from '../engine/missionCatalog';
import { Rocket, Users, User, Trophy, ChevronRight, ShieldAlert } from 'lucide-react';

export interface ArchivedMissionRun {
  id: string;
  dateIso: string;
  missionName: string;
  scenarioTitle: string;
  difficultyName: string;
  teamMode: boolean;
  grade: string;
  score: number;
  success: boolean;
}

interface TitleScreenProps {
  selectedScenarioId: string;
  selectedDifficultyId: DifficultyId;
  teamMode: boolean;
  archive: ArchivedMissionRun[];
  onSelectScenario: (id: string) => void;
  onSelectDifficulty: (id: DifficultyId) => void;
  onToggleTeamMode: (team: boolean) => void;
  onStartMission: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedScenarioId,
  selectedDifficultyId,
  teamMode,
  archive,
  onSelectScenario,
  onSelectDifficulty,
  onToggleTeamMode,
  onStartMission,
}) => {
  const [showArchive, setShowArchive] = useState(false);
  const scenario = SCENARIOS.find((s) => s.id === selectedScenarioId) ?? SCENARIOS[0];
  const difficulty = DIFFICULTIES.find((d) => d.id === selectedDifficultyId) ?? DIFFICULTIES[0];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex items-center justify-start p-4 sm:p-8">
      <div className="pointer-events-auto w-full max-w-[470px] bg-[#0B111E]/95 border border-slate-700/80 rounded-xl p-5 shadow-2xl flex flex-col gap-3.5 max-h-[95vh] overflow-y-auto">
        {/* Developer Lockup & Game Title */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-cyan-400">
            <span>SOLAR-X DEVELOPMENT TEAM</span>
            <span className="text-slate-400">CML 1–4 SIMULATOR</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 leading-none">
            SPACE MISSION ARCHITECT
          </h1>
          <p className="text-xs text-slate-300 leading-snug mt-0.5">
            Design, balance, and fly real NASA-grounded space missions with coupled mass, power, RF link, orbit, and budget physics.
          </p>
        </div>

        {/* Scenario Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
            Select Mission Program
          </label>
          <div className="grid grid-cols-1 gap-1">
            {SCENARIOS.map((s) => {
              const active = s.id === selectedScenarioId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectScenario(s.id)}
                  className={`text-left px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                    active
                      ? 'bg-cyan-500/15 border-cyan-400 text-slate-50'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{s.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">{s.subtitle}</div>
                  </div>
                  <div className="text-right shrink-0 font-mono-tabular text-[11px] text-cyan-300">
                    <span>${s.baseBudgetM}M</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">{s.solarDistanceAu} AU</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
              Engineering Rigor (Difficulty)
            </label>
            <span className="text-[10px] font-mono-tabular text-amber-300">
              {difficulty.requiredMarginPct}% Margin · {difficulty.requiredLinkMarginDb} dB Link
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {DIFFICULTIES.map((d) => {
              const active = d.id === selectedDifficultyId;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onSelectDifficulty(d.id)}
                  className={`px-1 py-1.5 rounded-md border text-center cursor-pointer transition-colors ${
                    active
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-semibold leading-tight">{d.name}</div>
                  <div className="text-[9px] font-mono-tabular opacity-80">{d.tierLabel}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Solo vs 4-Player Team Mode */}
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onToggleTeamMode(false)}
              className={`px-2.5 py-2 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                !teamMode
                  ? 'bg-cyan-500/15 border-cyan-400 text-slate-100'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-600'
              }`}
            >
              <User className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-semibold">Solo Architect</div>
                <div className="text-[10px] text-slate-400">Full CML 1–4 control</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onToggleTeamMode(true)}
              className={`px-2.5 py-2 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                teamMode
                  ? 'bg-cyan-500/15 border-cyan-400 text-slate-100'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-600'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-semibold">4-Player Team</div>
                <div className="text-[10px] text-slate-400">PI · Sys · Flight · Ops</div>
              </div>
            </button>
          </div>
          {teamMode && (
            <div className="grid grid-cols-4 gap-1 text-[10px] font-mono-tabular text-slate-300 bg-slate-900/80 border border-slate-800 rounded-md p-1.5">
              {TEAM_ROLES.map((r) => (
                <div key={r.id} className="truncate text-center">
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: r.accentHex }} />
                  {r.shortTitle}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scenario Quick Brief */}
        <div className="bg-slate-900/75 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 flex flex-col gap-0.5">
          <div className="flex items-center justify-between font-mono-tabular text-[10px] text-slate-400">
            <span>ANALOGUE: {scenario.nasaAnalogueName}</span>
            <span>{scenario.targetDurationDays} DAYS</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">{scenario.description}</p>
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-start="true"
            onClick={onStartMission}
            className="flex-1 py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Rocket className="w-4 h-4" />
            Enter Mission Workbench
            <ChevronRight className="w-4 h-4" />
          </button>

          {archive.length > 0 && (
            <button
              type="button"
              onClick={() => setShowArchive((v) => !v)}
              className="py-2.5 px-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              title="Mission Archive"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="font-mono-tabular">{archive.length}</span>
            </button>
          )}
        </div>

        {showArchive && archive.length > 0 && (
          <div className="border-t border-slate-800 pt-2 flex flex-col gap-1 max-h-32 overflow-y-auto">
            <div className="text-[10px] font-mono-tabular uppercase text-slate-400">Recent Flight Log</div>
            {archive.slice(0, 5).map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between text-xs bg-slate-900/80 border border-slate-800 rounded px-2.5 py-1"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-200 truncate">{run.missionName}</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {run.scenarioTitle} · {run.difficultyName}
                  </div>
                </div>
                <div className="font-mono-tabular text-right shrink-0 ml-2">
                  <span className={run.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {run.grade} ({run.score})
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] font-mono-tabular text-slate-500">
          <span>PRESS ENTER OR SPACE TO START</span>
          <span className="flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> NASA CML 1–4 &amp; CUBESAT 101
          </span>
        </div>
      </div>
    </div>
  );
};
