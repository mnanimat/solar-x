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
  SCENARIOS,
  SOLAR_ARRAYS,
  THERMAL_MATERIAL_OPTIONS,
  type AdcsAvionicsOption,
  type BatteryOption,
  type CommsBandOption,
  type DifficultyConfig,
  type DifficultyId,
  type GroundNetworkOption,
  type LaunchVehicle,
  type MaterialThermalOption,
  type MissionScenario,
  type OrbitOption,
  type ScienceInstrument,
  type SolarArrayOption,
  type SpacecraftBus,
  type TeamRoleId,
  type VerificationSuite,
} from './missionCatalog';

export interface MissionDesign {
  missionName: string;
  scenarioId: string;
  difficultyId: DifficultyId;
  teamMode: boolean;
  activeRole: TeamRoleId;
  roleSignoffs: Record<TeamRoleId, boolean>;
  busId: string;
  solarId: string;
  batteryId: string;
  adcsId: string;
  materialId: string;
  instrumentIds: string[];
  orbitId: string;
  launchVehicleId: string;
  commsId: string;
  groundNetworkId: string;
  verification: VerificationSuite;
}

export interface DesignEvaluation {
  scenario: MissionScenario;
  difficulty: DifficultyConfig;
  bus: SpacecraftBus;
  solar: SolarArrayOption;
  battery: BatteryOption;
  adcs: AdcsAvionicsOption;
  material: MaterialThermalOption;
  instruments: ScienceInstrument[];
  orbit: OrbitOption;
  launchVehicle: LaunchVehicle;
  comms: CommsBandOption;
  groundNetwork: GroundNetworkOption;

  // Mass & Launch
  dryMassKg: number;
  lvCapacityKg: number;
  massMarginVsBusPct: number;
  massMarginVsLvPct: number;
  slotsUsed: number;
  slotsMax: number;
  maxProtrusionMm: number;

  // Power & Energy
  solarIrradianceFactor: number; // 1 / r^2
  peakSolarPowerW: number;
  orbitAvgPowerGenW: number;
  avgPowerDrawW: number;
  powerMarginPct: number;
  eclipseDurationMin: number;
  eclipseEnergyWh: number;
  batterySafeWh: number;
  batteryDoDPct: number;
  energyMarginPct: number;

  // Comms & Data
  freeSpacePathLossDb: number;
  linkMarginDb: number;
  effectiveDownlinkMbps: number;
  dailyDataGeneratedGb: number;
  dailyDataDownlinkGb: number;
  dataReturnRatio: number; // 0..1+

  // Cost & Budget
  hardwareCostM: number;
  launchCostM: number;
  groundCostM: number;
  verificationCostM: number;
  totalCostM: number;
  budgetCapM: number;
  budgetMarginPct: number;

  // Science & Survivability
  rawScienceScore: number;
  effectiveScienceScore: number;
  scienceTargetMet: boolean;
  pointingMatchedCount: number;
  annualRadiationKrad: number;
  effectiveRadToleranceKrad: number;
  radiationMarginPct: number;
  deltaVRequiredMs: number;
  deltaVAvailableMs: number;

  // CML Readiness (1..4)
  cmlScores: {
    cml1: number; // Objectives & STM
    cml2: number; // Spacecraft & Margins
    cml3: number; // Science Payload
    cml4: number; // Launch, Comms, Verification
  };

  // Diagnostics
  blockers: string[];
  warnings: string[];
  radarAxes: Array<{ label: string; score: number }>; // 0..100 for 2D Trade-Space Chart
  canLaunch: boolean;
}

export interface AnomalyChoice {
  id: string;
  label: string;
  summary: string;
  roleHint: TeamRoleId;
  powerDeltaPct: number;
  dataDeltaGb: number;
  scienceDelta: number;
  healthDeltaPct: number;
  thermalDeltaC: number;
  requiresStarTracker?: boolean;
  requiresRadHard?: boolean;
}

export interface ActiveAnomaly {
  id: string;
  title: string;
  severity: 'caution' | 'critical';
  description: string;
  choices: AnomalyChoice[];
}

export interface TelemetrySample {
  day: number;
  batterySocPct: number;
  powerNetW: number;
  bufferPct: number;
  sciencePct: number;
  tempC: number;
}

export interface SimulationState {
  phase: 'launch' | 'deployment' | 'operations' | 'completed' | 'failed';
  launchProgress: number; // 0..1 (ascent & staging)
  deployProgress: number; // 0..1 (solar/antenna deployment)
  elapsedDays: number;
  targetDays: number;
  orbitAngleRad: number;
  inEclipse: boolean;
  inGroundPass: boolean;
  activeStationName: string | null;
  batterySocPct: number;
  dataBufferGb: number;
  maxBufferGb: number;
  scienceProgressPct: number;
  cumulativeSciencePoints: number;
  spacecraftHealthPct: number;
  thermalC: number;
  radiationAccumulatedKrad: number;
  anomaliesTriggered: number;
  anomaliesResolved: number;
  activeAnomaly: ActiveAnomaly | null;
  eventLog: Array<{ day: number; type: 'info' | 'warn' | 'critical' | 'success'; text: string }>;
  telemetryHistory: TelemetrySample[];
  failureReason: string | null;
  subSatLatDeg: number;
  subSatLonDeg: number;
}

export interface MissionOutcome {
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  totalScore: number; // 0..100
  success: boolean;
  breakdown: {
    scienceReturn: number;
    resourceEfficiency: number;
    cmlMargins: number;
    operationalSurvival: number;
    teamCoordination: number;
  };
  headline: string;
  causalSummary: string[];
  nasaAnalogue: {
    name: string;
    summary: string;
    alignmentNote: string;
  };
}

export function createDefaultDesign(
  scenarioId = 'bionutrients-leo',
  difficultyId: DifficultyId = 'beginner',
  teamMode = false
): MissionDesign {
  const presets: Record<string, Partial<MissionDesign>> = {
    'bionutrients-leo': {
      missionName: 'Solar-X BioScout-1',
      busId: 'bus-6u',
      solarId: 'solar-2wing',
      batteryId: 'bat-ul-45',
      adcsId: 'adcs-rw-3axis',
      materialId: 'mat-nasa-clean',
      instrumentIds: ['inst-bionutrients', 'inst-multispec'],
      orbitId: 'iss-leo',
      launchVehicleId: 'lv-f9-rideshare',
      commsId: 'comm-sband',
      groundNetworkId: 'gs-commercial',
    },
    'helio-sworm': {
      missionName: 'Solar-X CoronaWatch',
      busId: 'bus-12u',
      solarId: 'solar-4wing',
      batteryId: 'bat-ul-180',
      adcsId: 'adcs-star-tracker',
      materialId: 'mat-nasa-clean',
      instrumentIds: ['inst-xray-solar', 'inst-mag-boom'],
      orbitId: 'sso-600',
      launchVehicleId: 'lv-electron',
      commsId: 'comm-sband',
      groundNetworkId: 'gs-commercial',
    },
    'lunar-trailblazer': {
      missionName: 'Solar-X Selene H2O',
      busId: 'bus-espa',
      solarId: 'solar-espa',
      batteryId: 'bat-espa-900',
      adcsId: 'adcs-star-tracker',
      materialId: 'mat-nasa-clean',
      instrumentIds: ['inst-ir-water', 'inst-plasma-ion'],
      orbitId: 'lunar-nrho',
      launchVehicleId: 'lv-minotaur',
      commsId: 'comm-xband',
      groundNetworkId: 'gs-nsn',
    },
    'mars-aeronomy': {
      missionName: 'Solar-X Ares Sky-1',
      busId: 'bus-discovery',
      solarId: 'solar-planetary',
      batteryId: 'bat-espa-900',
      adcsId: 'adcs-deep-cmg',
      materialId: 'mat-nasa-clean',
      instrumentIds: ['inst-uv-aeronomy', 'inst-mag-boom', 'inst-plasma-ion'],
      orbitId: 'mars-science',
      launchVehicleId: 'lv-f9-dedicated',
      commsId: 'comm-xband',
      groundNetworkId: 'gs-dsn',
    },
    'europa-cryo': {
      missionName: 'Solar-X CryoClipper',
      busId: 'bus-flagship',
      solarId: 'solar-mega',
      batteryId: 'bat-deep-4200',
      adcsId: 'adcs-deep-cmg',
      materialId: 'mat-titanium-vault',
      instrumentIds: ['inst-ice-radar', 'inst-plume-ms', 'inst-mag-boom'],
      orbitId: 'europa-elliptical',
      launchVehicleId: 'lv-vulcan',
      commsId: 'comm-kaband',
      groundNetworkId: 'gs-dsn',
    },
  };

  const p = presets[scenarioId] ?? presets['bionutrients-leo'];
  const needsNoaa = (p.instrumentIds ?? []).some(
    (id) => INSTRUMENTS.find((i) => i.id === id)?.requiresNoaaLicense
  );

  return {
    missionName: p.missionName ?? 'Solar-X Explorer',
    scenarioId,
    difficultyId,
    teamMode,
    activeRole: 'pi',
    roleSignoffs: {
      pi: false,
      systems: false,
      flight: false,
      ops: false,
    },
    busId: p.busId ?? 'bus-6u',
    solarId: p.solarId ?? 'solar-2wing',
    batteryId: p.batteryId ?? 'bat-ul-45',
    adcsId: p.adcsId ?? 'adcs-rw-3axis',
    materialId: p.materialId ?? 'mat-nasa-clean',
    instrumentIds: p.instrumentIds ?? ['inst-bionutrients'],
    orbitId: p.orbitId ?? 'iss-leo',
    launchVehicleId: p.launchVehicleId ?? 'lv-f9-rideshare',
    commsId: p.commsId ?? 'comm-sband',
    groundNetworkId: p.groundNetworkId ?? 'gs-commercial',
    verification: {
      ditlTested: true,
      vibrationTested: true,
      tvacTested: true,
      fccLicensed: true,
      noaaLicensed: needsNoaa,
      odarFiled: true,
    },
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function evaluateMissionDesign(design: MissionDesign): DesignEvaluation {
  const scenario = SCENARIOS.find((s) => s.id === design.scenarioId) ?? SCENARIOS[0];
  const difficulty = DIFFICULTIES.find((d) => d.id === design.difficultyId) ?? DIFFICULTIES[0];
  const bus = BUSES.find((b) => b.id === design.busId) ?? BUSES[0];
  const solar = SOLAR_ARRAYS.find((s) => s.id === design.solarId) ?? SOLAR_ARRAYS[0];
  const battery = BATTERIES.find((b) => b.id === design.batteryId) ?? BATTERIES[0];
  const adcs = ADCS_OPTIONS.find((a) => a.id === design.adcsId) ?? ADCS_OPTIONS[0];
  const material = THERMAL_MATERIAL_OPTIONS.find((m) => m.id === design.materialId) ?? THERMAL_MATERIAL_OPTIONS[0];
  const instruments = design.instrumentIds
    .map((id) => INSTRUMENTS.find((i) => i.id === id))
    .filter((i): i is ScienceInstrument => Boolean(i));
  const orbit = ORBITS.find((o) => o.id === design.orbitId) ?? ORBITS[0];
  const launchVehicle = LAUNCH_VEHICLES.find((l) => l.id === design.launchVehicleId) ?? LAUNCH_VEHICLES[0];
  const comms = COMMS_BANDS.find((c) => c.id === design.commsId) ?? COMMS_BANDS[0];
  const groundNetwork = GROUND_NETWORKS.find((g) => g.id === design.groundNetworkId) ?? GROUND_NETWORKS[0];

  const blockers: string[] = [];
  const warnings: string[] = [];

  // 1. Mass & Envelope Coupling
  const payloadMass = instruments.reduce((sum, i) => sum + i.massKg, 0);
  const dryMassKg =
    bus.dryStructureMassKg +
    solar.massKg +
    battery.massKg +
    adcs.massKg +
    material.massKg +
    comms.massKg +
    payloadMass;

  const lvCapacityKg =
    orbit.targetBody !== 'earth'
      ? launchVehicle.maxMassDeepSpaceKg
      : orbit.inclinationDeg >= 80
        ? launchVehicle.maxMassSsoKg
        : launchVehicle.maxMassLeoKg;

  const massMarginVsBusPct = ((bus.maxBusMassKg - dryMassKg) / bus.maxBusMassKg) * 100;
  const massMarginVsLvPct = lvCapacityKg > 0 ? ((lvCapacityKg - dryMassKg) / lvCapacityKg) * 100 : -100;
  const slotsUsed = instruments.reduce((sum, i) => sum + i.slotsRequired, 0);
  const slotsMax = bus.maxPayloadSlots;
  const maxProtrusionMm = instruments.reduce((m, i) => Math.max(m, i.protrusionMm), 0);

  if (dryMassKg > bus.maxBusMassKg) {
    blockers.push(
      `Spacecraft mass (${dryMassKg.toFixed(1)} kg) exceeds ${bus.name} structural ceiling (${bus.maxBusMassKg} kg).`
    );
  }
  if (lvCapacityKg <= 0) {
    blockers.push(
      `${launchVehicle.name} cannot reach ${orbit.targetBody.toUpperCase()} escape/transfer trajectories.`
    );
  } else if (dryMassKg > lvCapacityKg) {
    blockers.push(
      `Total mass (${dryMassKg.toFixed(1)} kg) exceeds ${launchVehicle.name} payload lift to target orbit (${lvCapacityKg} kg).`
    );
  }
  if (slotsUsed > slotsMax) {
    blockers.push(`Payload volume (${slotsUsed} slots) exceeds ${bus.name} capacity (${slotsMax} slots).`);
  }
  if (bus.dispenserEnvelope === 'fairing' && !launchVehicle.supportsFairing) {
    blockers.push(`${bus.name} requires a dedicated fairing; ${launchVehicle.name} is rideshare-dispenser only.`);
  }
  if (bus.dispenserEnvelope === 'ppod' && maxProtrusionMm > 6.5 && !launchVehicle.supportsFairing) {
    warnings.push(
      `Instrument protrusion (${maxProtrusionMm} mm) exceeds 6.5 mm P-POD rail limit; custom deployer adapter needed.`
    );
  }
  if (solar.areaM2 > bus.maxSolarAreaM2) {
    blockers.push(
      `${solar.name} (${solar.areaM2} m²) is mechanically too large for ${bus.name} (max ${bus.maxSolarAreaM2} m²).`
    );
  }

  // 2. Solar Irradiance (1/r^2), Power & Battery DoD Coupling
  const solarIrradianceFactor = 1 / (scenario.solarDistanceAu * scenario.solarDistanceAu);
  const solarConstantWPerM2 = 1361;
  const incidenceCosine = solar.deployable ? 0.88 : 0.62;
  const peakSolarPowerW =
    solarConstantWPerM2 * solarIrradianceFactor * solar.areaM2 * (solar.efficiencyPct / 100) * incidenceCosine;
  const orbitAvgPowerGenW = peakSolarPowerW * (1 - orbit.eclipseFraction);

  const payloadPowerW = instruments.reduce((sum, i) => sum + i.powerW, 0);
  // Duty cycle: high-power radars/comms operate partly pulsed over the orbit
  const avgPowerDrawW =
    bus.basePowerDrawW +
    adcs.powerW +
    material.powerW +
    comms.powerW * 0.35 +
    payloadPowerW * 0.72;

  const powerMarginPct = ((orbitAvgPowerGenW - avgPowerDrawW) / Math.max(1, orbitAvgPowerGenW)) * 100;

  const eclipseDurationMin = orbit.periodMin * orbit.eclipseFraction;
  // Cap effective eclipse calc at 90 min for eccentric deep-space orbits where heaters cycle
  const effectiveEclipseHrs = Math.min(eclipseDurationMin, 110) / 60;
  const eclipseLoadW = bus.basePowerDrawW + adcs.powerW + material.powerW + payloadPowerW * 0.45;
  const eclipseEnergyWh = eclipseLoadW * effectiveEclipseHrs;
  const batterySafeWh = battery.capacityWh * (battery.maxDoDPct / 100);
  const batteryDoDPct = (eclipseEnergyWh / Math.max(1, battery.capacityWh)) * 100;
  const energyMarginPct = ((batterySafeWh - eclipseEnergyWh) / Math.max(1, batterySafeWh)) * 100;

  if (orbitAvgPowerGenW < avgPowerDrawW * 0.92) {
    blockers.push(
      `Negative power balance (${orbitAvgPowerGenW.toFixed(1)} W gen vs ${avgPowerDrawW.toFixed(1)} W load at ${scenario.solarDistanceAu} AU).`
    );
  } else if (powerMarginPct < difficulty.requiredMarginPct) {
    warnings.push(
      `Power margin (${powerMarginPct.toFixed(0)}%) is below ${difficulty.name} target (${difficulty.requiredMarginPct}%).`
    );
  }

  if (eclipseEnergyWh > battery.capacityWh * 0.85) {
    blockers.push(
      `Eclipse energy demand (${eclipseEnergyWh.toFixed(0)} Wh) drains ${battery.name} (${battery.capacityWh} Wh) past brownout.`
    );
  } else if (batteryDoDPct > battery.maxDoDPct) {
    warnings.push(
      `Eclipse Depth-of-Discharge (${batteryDoDPct.toFixed(0)}%) exceeds ${battery.maxDoDPct}% cell longevity limit.`
    );
  }

  // 3. Telecom Link Budget (Friis Path Loss + Data Return Bottleneck)
  const distanceM = orbit.slantRangeKm * 1000;
  const freqHz = comms.frequencyGhz * 1e9;
  const freeSpacePathLossDb = 20 * Math.log10(distanceM) + 20 * Math.log10(freqHz) - 147.55;
  const eirpDbw = 10 * Math.log10(comms.txPowerW) + comms.antennaGainDbi;
  const cN0DbHz =
    eirpDbw -
    freeSpacePathLossDb -
    comms.weatherPenaltyDb -
    2.2 + // implementation & pointing loss
    groundNetwork.gtDbK +
    228.6;

  // Target operational science bitrate scales realistically with band and range
  const targetBps =
    orbit.targetBody === 'earth'
      ? Math.min(comms.maxDataRateMbps * 1e6, comms.band === 'UHF' ? 19200 : 1200000)
      : orbit.targetBody === 'moon'
        ? 250000
        : orbit.targetBody === 'mars'
          ? 32000
          : 12000;

  const requiredEbN0Db = comms.deepSpaceCapable ? 2.0 : 4.5;
  const requiredCN0DbHz = 10 * Math.log10(targetBps) + requiredEbN0Db;
  const linkMarginDb = cN0DbHz - requiredCN0DbHz;

  const maxSustainableBps = Math.pow(10, (cN0DbHz - requiredEbN0Db) / 10);
  const effectiveBps = linkMarginDb >= 0 ? Math.min(comms.maxDataRateMbps * 1e6, maxSustainableBps * 0.65) : 0;
  const effectiveDownlinkMbps = effectiveBps / 1e6;

  const totalInstrumentKbps = instruments.reduce((sum, i) => sum + i.dataRateKbps, 0);
  const dailyDataGeneratedGb = (totalInstrumentKbps * 1000 * 86400 * 0.22) / 8 / 1e9; // 22% sunlit science duty cycle
  const dailyContactSeconds = groundNetwork.passesPerDay * groundNetwork.avgPassDurationMin * 60;
  const dailyDataDownlinkGb = (effectiveBps * dailyContactSeconds) / 8 / 1e9;
  const dataReturnRatio = dailyDataGeneratedGb > 0 ? Math.min(1.5, dailyDataDownlinkGb / dailyDataGeneratedGb) : 1;

  if (orbit.targetBody !== 'earth' && !comms.deepSpaceCapable) {
    blockers.push(`${comms.band} radio cannot lock coherent deep-space ranging for ${orbit.targetBody.toUpperCase()}.`);
  }
  if (orbit.targetBody !== 'earth' && !groundNetwork.supportsDeepSpace) {
    blockers.push(`${groundNetwork.name} lacks large-aperture antennas for ${orbit.targetBody.toUpperCase()} distances.`);
  }
  if (linkMarginDb < 0) {
    blockers.push(
      `RF Link does not close (${linkMarginDb.toFixed(1)} dB margin at ${orbit.slantRangeKm.toLocaleString()} km). Upgrade band or Ground Network.`
    );
  } else if (linkMarginDb < difficulty.requiredLinkMarginDb) {
    warnings.push(
      `Link margin (${linkMarginDb.toFixed(1)} dB) is below ${difficulty.requiredLinkMarginDb} dB safety threshold.`
    );
  }
  if (dailyDataDownlinkGb < dailyDataGeneratedGb * 0.45 && instruments.length > 0) {
    warnings.push(
      `Data bottleneck: generating ${dailyDataGeneratedGb.toFixed(2)} GB/day but downlinking only ${dailyDataDownlinkGb.toFixed(2)} GB/day.`
    );
  }

  // 4. Delta-V, Orbit Match, Radiation & CubeSat 101 Verification Costs
  const deltaVRequiredMs = orbit.requiredDeltaVMs;
  const deltaVAvailableMs = bus.deltaVCapacityMs;
  if (orbit.targetBody !== scenario.targetBody) {
    blockers.push(
      `Target orbit (${orbit.name}) is around ${orbit.targetBody.toUpperCase()}, but scenario requires ${scenario.targetBody.toUpperCase()}.`
    );
  }
  if (deltaVAvailableMs < deltaVRequiredMs * 0.75) {
    blockers.push(
      `Bus propulsion Δv (${deltaVAvailableMs} m/s) cannot complete ${orbit.name} maneuvers (${deltaVRequiredMs} m/s required).`
    );
  } else if (deltaVAvailableMs < deltaVRequiredMs) {
    warnings.push(`Tight Δv margin (${deltaVAvailableMs} vs ${deltaVRequiredMs} m/s required).`);
  }

  const missionYears = scenario.targetDurationDays / 365;
  const annualRadiationKrad = orbit.radiationDoseKradYr;
  const totalRadiationKrad = annualRadiationKrad * missionYears;
  const effectiveRadToleranceKrad =
    bus.radiationToleranceKrad * (adcs.radHardened ? 1.45 : 0.85) * (material.id === 'mat-titanium-vault' ? 1.65 : 1.0);
  const radiationMarginPct = ((effectiveRadToleranceKrad - totalRadiationKrad) / Math.max(1, effectiveRadToleranceKrad)) * 100;

  if (totalRadiationKrad > effectiveRadToleranceKrad * 1.15) {
    blockers.push(
      `Total radiation dose (${totalRadiationKrad.toFixed(0)} krad) overwhelms spacecraft shielding (${effectiveRadToleranceKrad.toFixed(0)} krad).`
    );
  } else if (radiationMarginPct < 15) {
    warnings.push(`Low radiation tolerance margin (${radiationMarginPct.toFixed(0)}%) over ${scenario.targetDurationDays} days.`);
  }

  // CubeSat 101 Safety, Materials & Licensing
  const needsNoaa = instruments.some((i) => i.requiresNoaaLicense) && orbit.targetBody === 'earth';
  const odarViolation =
    orbit.targetBody === 'earth' &&
    orbit.naturalDecayYears > 25 &&
    deltaVAvailableMs < deltaVRequiredMs + 95;

  let penaltyCostM = 0;
  if (!material.lowOutgassing) {
    penaltyCostM += 0.6;
    warnings.push('Non-low-outgassing materials incur +$0.6M extended TVAC bakeout penalty.');
  }
  if (odarViolation) {
    warnings.push('Orbit exceeds 25-year ODAR debris rule without dedicated deorbit Δv.');
  }
  if (difficulty.strictCompliance) {
    if (!battery.ulListed) {
      blockers.push('CubeSat 101 safety failure: Uncertified COTS LiPo battery fails UL-1642 Launch Range Safety.');
    }
    if (!design.verification.ditlTested || !design.verification.vibrationTested || !design.verification.tvacTested) {
      warnings.push('Missing DITL, Vibration, or TVAC qualification increases anomaly probability.');
    }
    if (!design.verification.fccLicensed) {
      blockers.push('FCC/NTIA RF spectrum license is required prior to launch manifest.');
    }
    if (needsNoaa && !design.verification.noaaLicensed) {
      blockers.push('Earth-observing optical payload requires NOAA Commercial Remote Sensing license.');
    }
    if (!design.verification.odarFiled) {
      warnings.push('Orbital Debris Assessment Report (ODAR) not signed.');
    }
  }

  // 5. Budget & Cost Coupling
  const hardwareCostM =
    bus.baseCostM +
    solar.costM +
    battery.costM +
    adcs.costM +
    material.costM +
    comms.costM +
    instruments.reduce((sum, i) => sum + i.costM, 0);
  const launchCostM = launchVehicle.costM;
  const groundCostM = groundNetwork.costM * (scenario.targetDurationDays / 365);
  const verificationCostM =
    (design.verification.ditlTested ? 0.5 : 0) +
    (design.verification.vibrationTested ? 0.7 : 0) +
    (design.verification.tvacTested ? 0.9 : 0) +
    (design.verification.fccLicensed ? 0.2 : 0) +
    (design.verification.noaaLicensed ? 0.3 : 0) +
    (design.verification.odarFiled ? 0.2 : 0) +
    penaltyCostM;

  const totalCostM = hardwareCostM + launchCostM + groundCostM + verificationCostM;
  const budgetCapM = scenario.baseBudgetM * difficulty.budgetMultiplier;
  const budgetMarginPct = ((budgetCapM - totalCostM) / budgetCapM) * 100;

  if (totalCostM > budgetCapM) {
    blockers.push(
      `Total mission cost ($${totalCostM.toFixed(1)}M) exceeds ${difficulty.name} budget cap ($${budgetCapM.toFixed(1)}M).`
    );
  } else if (budgetMarginPct < 10) {
    warnings.push(`Cost reserve is tight (${budgetMarginPct.toFixed(1)}% remaining).`);
  }

  // 6. Science Return Score
  if (instruments.length === 0) {
    blockers.push('At least one scientific instrument is required to fulfill CML 1 Mission Objectives.');
  }

  let rawScienceScore = 0;
  let pointingMatchedCount = 0;
  for (const inst of instruments) {
    const domainBonus = inst.domainMatch.includes(scenario.domain) ? 1.0 : 0.45;
    const pointingFactor =
      adcs.pointingArcsec <= inst.requiredPointingArcsec
        ? 1.0
        : Math.max(0.45, inst.requiredPointingArcsec / adcs.pointingArcsec);
    if (adcs.pointingArcsec <= inst.requiredPointingArcsec) {
      pointingMatchedCount += 1;
    } else {
      warnings.push(
        `${inst.shortName} needs ${inst.requiredPointingArcsec}" pointing (ADCS provides ${adcs.pointingArcsec}").`
      );
    }
    rawScienceScore += inst.scienceValue * domainBonus * pointingFactor;
  }
  rawScienceScore *= orbit.scienceMultiplier;

  // Data bottleneck caps science returned to Earth
  const effectiveDataFactor = clamp(0.45 + 0.55 * Math.min(1, dataReturnRatio), 0.35, 1.05);
  const effectiveScienceScore = Math.round(clamp(rawScienceScore * effectiveDataFactor, 0, 125));
  const scienceTargetMet = effectiveScienceScore >= scenario.minScienceScore;
  if (!scienceTargetMet && instruments.length > 0) {
    warnings.push(
      `Projected science return (${effectiveScienceScore}) is below mission threshold (${scenario.minScienceScore}).`
    );
  }

  // 7. CML 1..4 Scores (0..100)
  const cml1 = instruments.length > 0 && orbit.targetBody === scenario.targetBody ? (scienceTargetMet ? 100 : 72) : 35;
  const cml2 = clamp(
    Math.round(
      (massMarginVsBusPct >= 0 ? 35 : 0) +
        (powerMarginPct >= difficulty.requiredMarginPct ? 35 : Math.max(0, powerMarginPct)) +
        (batteryDoDPct <= battery.maxDoDPct ? 30 : 10)
    ),
    0,
    100
  );
  const cml3 = clamp(
    Math.round(
      (instruments.length > 0 ? 40 : 0) +
        (pointingMatchedCount === instruments.length ? 30 : 15) +
        (scienceTargetMet ? 30 : 10)
    ),
    0,
    100
  );
  const cml4 = clamp(
    Math.round(
      (massMarginVsLvPct >= 0 ? 30 : 0) +
        (linkMarginDb >= difficulty.requiredLinkMarginDb ? 35 : linkMarginDb >= 0 ? 18 : 0) +
        (design.verification.ditlTested && design.verification.tvacTested && design.verification.fccLicensed ? 35 : 15)
    ),
    0,
    100
  );

  // Radar Axes (0..100)
  const radarAxes = [
    { label: 'Mass', score: clamp(Math.round(50 + Math.min(massMarginVsBusPct, massMarginVsLvPct) * 1.1), 5, 100) },
    { label: 'Power', score: clamp(Math.round(50 + powerMarginPct * 1.1), 5, 100) },
    { label: 'Comms', score: clamp(Math.round(45 + linkMarginDb * 4.5), 5, 100) },
    { label: 'Budget', score: clamp(Math.round(50 + budgetMarginPct * 1.6), 5, 100) },
    { label: 'Science', score: clamp(Math.round((effectiveScienceScore / Math.max(1, scenario.minScienceScore)) * 80), 5, 100) },
    { label: 'Safety', score: clamp(Math.round((cml2 + cml4) / 2 - (odarViolation ? 18 : 0)), 5, 100) },
  ];

  if (massMarginVsBusPct < difficulty.requiredMarginPct && massMarginVsBusPct >= 0) {
    warnings.push(
      `Bus mass margin (${massMarginVsBusPct.toFixed(0)}%) is below ${difficulty.name} CML 4 target (${difficulty.requiredMarginPct}%).`
    );
  }

  return {
    scenario,
    difficulty,
    bus,
    solar,
    battery,
    adcs,
    material,
    instruments,
    orbit,
    launchVehicle,
    comms,
    groundNetwork,
    dryMassKg,
    lvCapacityKg,
    massMarginVsBusPct,
    massMarginVsLvPct,
    slotsUsed,
    slotsMax,
    maxProtrusionMm,
    solarIrradianceFactor,
    peakSolarPowerW,
    orbitAvgPowerGenW,
    avgPowerDrawW,
    powerMarginPct,
    eclipseDurationMin,
    eclipseEnergyWh,
    batterySafeWh,
    batteryDoDPct,
    energyMarginPct,
    freeSpacePathLossDb,
    linkMarginDb,
    effectiveDownlinkMbps,
    dailyDataGeneratedGb,
    dailyDataDownlinkGb,
    dataReturnRatio,
    hardwareCostM,
    launchCostM,
    groundCostM,
    verificationCostM,
    totalCostM,
    budgetCapM,
    budgetMarginPct,
    rawScienceScore,
    effectiveScienceScore,
    scienceTargetMet,
    pointingMatchedCount,
    annualRadiationKrad,
    effectiveRadToleranceKrad,
    radiationMarginPct,
    deltaVRequiredMs,
    deltaVAvailableMs,
    cmlScores: { cml1, cml2, cml3, cml4 },
    blockers,
    warnings,
    radarAxes,
    canLaunch: blockers.length === 0,
  };
}

const ANOMALY_POOL: ActiveAnomaly[] = [
  {
    id: 'anom-cme',
    title: 'Coronal Mass Ejection (X-Class Solar Storm)',
    severity: 'critical',
    description:
      'High-energy solar proton flux spikes 4× above nominal, threatening single-event upsets in flight avionics and optical sensor noise.',
    choices: [
      {
        id: 'cme-safe-mode',
        label: 'Enter Sun-Safe Mode & Pause Instruments',
        summary: 'Protects payload & trims 40% power load, pausing science collection for one orbit cycle.',
        roleHint: 'systems',
        powerDeltaPct: 14,
        dataDeltaGb: -0.1,
        scienceDelta: -2.5,
        healthDeltaPct: -1,
        thermalDeltaC: 2,
      },
      {
        id: 'cme-rad-filter',
        label: 'Engage Triple-Voting Rad-Hard Scrubbing',
        summary: 'Maintains science operations if spacecraft carries rad-hard avionics; otherwise risks memory bit-flips.',
        roleHint: 'pi',
        powerDeltaPct: -6,
        dataDeltaGb: 0.05,
        scienceDelta: 4.5,
        healthDeltaPct: -8,
        thermalDeltaC: 4,
        requiresRadHard: true,
      },
    ],
  },
  {
    id: 'anom-rain-fade',
    title: 'Ground Station Storm Attenuation',
    severity: 'caution',
    description:
      'Heavy convective storm cell over primary downlink dish adds 5.5 dB rain fade, filling the onboard solid-state recorder.',
    choices: [
      {
        id: 'rain-compress',
        label: 'Switch to Lossless Burst Compression + Buffer',
        summary: 'Compresses science packets 35% and delays downlink until the next clear station pass.',
        roleHint: 'ops',
        powerDeltaPct: -4,
        dataDeltaGb: -0.35,
        scienceDelta: 1.5,
        healthDeltaPct: 0,
        thermalDeltaC: 1,
      },
      {
        id: 'rain-reroute',
        label: 'Handover to Alternate Ground Site + Boost TX',
        summary: 'Drives RF amplifier harder to close link immediately through margin.',
        roleHint: 'ops',
        powerDeltaPct: -12,
        dataDeltaGb: -0.8,
        scienceDelta: 3.5,
        healthDeltaPct: -2,
        thermalDeltaC: 5,
      },
    ],
  },
  {
    id: 'anom-attitude',
    title: 'Reaction Wheel Momentum Saturation',
    severity: 'caution',
    description:
      'Gravity-gradient & solar radiation torque saturated Wheel #2, introducing 180 arcsec jitter during science target lock.',
    choices: [
      {
        id: 'att-desat',
        label: 'Execute Magnetorquer / RCS Desaturation Burn',
        summary: 'Recovers crisp pointing accuracy with brief attitude slew pause.',
        roleHint: 'flight',
        powerDeltaPct: -8,
        dataDeltaGb: 0,
        scienceDelta: 3.0,
        healthDeltaPct: 0,
        thermalDeltaC: 1,
      },
      {
        id: 'att-startrack',
        label: 'Feed-Forward Star Tracker Autonomous Trim',
        summary: 'Zero science downtime when precision Star Tracker is installed; high drift otherwise.',
        roleHint: 'systems',
        powerDeltaPct: -3,
        dataDeltaGb: 0,
        scienceDelta: 5.5,
        healthDeltaPct: -4,
        thermalDeltaC: 2,
        requiresStarTracker: true,
      },
    ],
  },
  {
    id: 'anom-eclipse-cold',
    title: 'Extended Eclipse Thermal Cold Soak',
    severity: 'critical',
    description:
      'Payload bay temperature drops toward battery electrolyte lower limit during deep umbra transit.',
    choices: [
      {
        id: 'therm-heaters',
        label: 'Pulse Survival Heaters & Throttle Imagers',
        summary: 'Restores +11°C thermal margin using stored battery energy.',
        roleHint: 'systems',
        powerDeltaPct: -14,
        dataDeltaGb: 0,
        scienceDelta: -1.5,
        healthDeltaPct: 1,
        thermalDeltaC: 12,
      },
      {
        id: 'therm-duty',
        label: 'Run Instruments Warm for Waste Heat',
        summary: 'Keeps science flowing and generates +6°C internal waste heat, stressing battery DoD.',
        roleHint: 'pi',
        powerDeltaPct: -18,
        dataDeltaGb: 0.25,
        scienceDelta: 4.0,
        healthDeltaPct: -5,
        thermalDeltaC: 7,
      },
    ],
  },
];

export function createSimulationState(evaluation: DesignEvaluation): SimulationState {
  const maxBufferGb = Math.max(1.5, evaluation.dailyDataGeneratedGb * 2.5);
  return {
    phase: 'launch',
    launchProgress: 0,
    deployProgress: 0,
    elapsedDays: 0,
    targetDays: evaluation.scenario.targetDurationDays,
    orbitAngleRad: 0,
    inEclipse: false,
    inGroundPass: false,
    activeStationName: null,
    batterySocPct: 92,
    dataBufferGb: 0,
    maxBufferGb,
    scienceProgressPct: 0,
    cumulativeSciencePoints: 0,
    spacecraftHealthPct: 100,
    thermalC: 21,
    radiationAccumulatedKrad: 0,
    anomaliesTriggered: 0,
    anomaliesResolved: 0,
    activeAnomaly: null,
    eventLog: [
      {
        day: 0,
        type: 'info',
        text: `T-0 Ignition: ${evaluation.launchVehicle.name} liftoff carrying ${evaluation.bus.name}.`,
      },
    ],
    telemetryHistory: [
      {
        day: 0,
        batterySocPct: 92,
        powerNetW: evaluation.orbitAvgPowerGenW - evaluation.avgPowerDrawW,
        bufferPct: 0,
        sciencePct: 0,
        tempC: 21,
      },
    ],
    failureReason: null,
    subSatLatDeg: 28.5,
    subSatLonDeg: -80.6,
  };
}

export function stepSimulationTick(
  prev: SimulationState,
  design: MissionDesign,
  evaluation: DesignEvaluation,
  dtSeconds: number,
  speedMultiplier = 1
): SimulationState {
  if (prev.phase === 'completed' || prev.phase === 'failed' || prev.activeAnomaly) {
    return prev;
  }

  const next: SimulationState = {
    ...prev,
    eventLog: prev.eventLog,
    telemetryHistory: prev.telemetryHistory,
  };

  // Phase 1: Rocket Launch & Staging (takes ~4.5s at 1x)
  if (prev.phase === 'launch') {
    const launchProgress = Math.min(1, prev.launchProgress + dtSeconds * 0.24 * Math.min(speedMultiplier, 4));
    next.launchProgress = launchProgress;
    if (launchProgress >= 1) {
      next.phase = 'deployment';
      next.eventLog = [
        ...prev.eventLog.slice(-14),
        {
          day: 0,
          type: 'success',
          text: `SECO & Spacecraft Separation into ${evaluation.orbit.name}.`,
        },
      ];
    }
    return next;
  }

  // Phase 2: Solar Wing & Antenna Deployment (takes ~3s at 1x)
  if (prev.phase === 'deployment') {
    const deployProgress = Math.min(1, prev.deployProgress + dtSeconds * 0.35 * Math.min(speedMultiplier, 4));
    next.deployProgress = deployProgress;
    if (deployProgress >= 1) {
      next.phase = 'operations';
      next.eventLog = [
        ...prev.eventLog.slice(-14),
        {
          day: 1,
          type: 'success',
          text: `${evaluation.solar.name} & ${evaluation.comms.band} array locked. Science commissioning active.`,
        },
      ];
    }
    return next;
  }

  // Phase 3: Orbital Science & Telemetry Operations
  const daysPerSecond = Math.max(4, evaluation.scenario.targetDurationDays / 24) * speedMultiplier;
  const deltaDays = dtSeconds * daysPerSecond;
  const elapsedDays = Math.min(prev.targetDays, prev.elapsedDays + deltaDays);
  next.elapsedDays = elapsedDays;

  // Advance orbit angle visibly (~1.2 rad/s at 1x)
  const orbitAngleRad = (prev.orbitAngleRad + dtSeconds * 1.15 * Math.sqrt(speedMultiplier)) % (Math.PI * 2);
  next.orbitAngleRad = orbitAngleRad;

  // Sub-satellite Earth/Body ground track coordinates (Euclidean modulo to keep lon in [-180, 180])
  const incRad = (evaluation.orbit.inclinationDeg * Math.PI) / 180;
  const subSatLatDeg = (Math.asin(Math.sin(incRad) * Math.sin(orbitAngleRad)) * 180) / Math.PI;
  const nodalShift = elapsedDays * 22.5;
  const rawDeg = (orbitAngleRad * 180) / Math.PI - nodalShift + 180;
  const rawLon = ((((rawDeg % 360) + 360) % 360) - 180);
  next.subSatLonDeg = rawLon;
  next.subSatLatDeg = subSatLatDeg;

  // Eclipse check (back side of planet around angle PI)
  const eclipseHalfArc = Math.PI * evaluation.orbit.eclipseFraction;
  const inEclipse = Math.abs(orbitAngleRad - Math.PI) < eclipseHalfArc;
  next.inEclipse = inEclipse;

  // Ground station pass check
  const stations = evaluation.groundNetwork.stationCoords;
  let activeStationName: string | null = null;
  for (const st of stations) {
    const dLat = Math.abs(st.lat - subSatLatDeg);
    const dLon = Math.min(Math.abs(st.lon - rawLon), 360 - Math.abs(st.lon - rawLon));
    if (evaluation.orbit.targetBody !== 'earth' || (dLat < 24 && dLon < 28)) {
      activeStationName = st.name;
      break;
    }
  }
  next.inGroundPass = Boolean(activeStationName);
  next.activeStationName = activeStationName;

  // Battery SoC dynamics
  const netPowerW = inEclipse
    ? -(evaluation.avgPowerDrawW * 0.78)
    : evaluation.peakSolarPowerW * 0.9 - evaluation.avgPowerDrawW;
  const socStep = (netPowerW / Math.max(20, evaluation.battery.capacityWh)) * 12 * dtSeconds;
  let batterySocPct = clamp(prev.batterySocPct + socStep, 0, 100);
  if (evaluation.powerMarginPct >= 0 && !inEclipse) {
    batterySocPct = clamp(Math.max(batterySocPct, 65 + Math.min(25, evaluation.powerMarginPct * 0.4)), 0, 100);
  }
  next.batterySocPct = batterySocPct;

  // Data buffer & downlink (dailyDataDownlinkGb already incorporates daily pass contact time)
  const genGb = evaluation.dailyDataGeneratedGb * deltaDays;
  const downGb = evaluation.dailyDataDownlinkGb * deltaDays * (next.inGroundPass ? 1.5 : 0.85);
  const dataBufferGb = clamp(prev.dataBufferGb + genGb - downGb, 0, prev.maxBufferGb);
  next.dataBufferGb = dataBufferGb;

  // Thermal model
  const targetTempC = inEclipse
    ? evaluation.material.id === 'mat-cots-alu'
      ? 2
      : 11
    : 28;
  next.thermalC = prev.thermalC + (targetTempC - prev.thermalC) * clamp(dtSeconds * 1.5, 0, 1);

  // Radiation accumulation & health
  const radStep = (evaluation.annualRadiationKrad / 365) * deltaDays;
  next.radiationAccumulatedKrad = prev.radiationAccumulatedKrad + radStep;
  let healthDrain = 0;
  if (next.radiationAccumulatedKrad > evaluation.effectiveRadToleranceKrad) {
    healthDrain += deltaDays * 0.45;
  }
  if (batterySocPct < 15) {
    healthDrain += deltaDays * 0.6;
  }
  next.spacecraftHealthPct = clamp(prev.spacecraftHealthPct - healthDrain, 0, 100);

  // Science progression
  const bufferEfficiency = dataBufferGb >= prev.maxBufferGb * 0.96 ? 0.5 : 1.0;
  const healthFactor = next.spacecraftHealthPct / 100;
  const dayFraction = deltaDays / prev.targetDays;
  const scienceGain = evaluation.effectiveScienceScore * dayFraction * bufferEfficiency * healthFactor;
  next.cumulativeSciencePoints = prev.cumulativeSciencePoints + scienceGain;
  next.scienceProgressPct = clamp(
    (next.cumulativeSciencePoints / Math.max(1, evaluation.scenario.minScienceScore)) * 100,
    0,
    130
  );

  // Record telemetry chart points roughly every ~10% progress or >=6 days
  const lastSample = prev.telemetryHistory[prev.telemetryHistory.length - 1];
  if (!lastSample || elapsedDays - lastSample.day >= Math.max(5, prev.targetDays / 24)) {
    next.telemetryHistory = [
      ...prev.telemetryHistory.slice(-29),
      {
        day: Math.round(elapsedDays),
        batterySocPct: Math.round(batterySocPct),
        powerNetW: Math.round(netPowerW),
        bufferPct: Math.round((dataBufferGb / prev.maxBufferGb) * 100),
        sciencePct: Math.round(next.scienceProgressPct),
        tempC: Math.round(next.thermalC),
      },
    ];
  }

  // Trigger up to 2 deterministic-feeling anomalies over the mission based on difficulty & testing
  const unverifiedPenalty =
    (!design.verification.ditlTested ? 0.25 : 0) +
    (!design.verification.tvacTested ? 0.25 : 0) +
    (!design.verification.vibrationTested ? 0.2 : 0);
  const progressRatio = elapsedDays / prev.targetDays;
  const maxAnomalies = evaluation.difficulty.id === 'sandbox' ? 1 : evaluation.difficulty.id === 'beginner' ? 2 : 3;
  const triggerThreshold = (prev.anomaliesTriggered + 1) / (maxAnomalies + 1);

  if (
    prev.anomaliesTriggered < maxAnomalies &&
    progressRatio >= triggerThreshold &&
    prev.elapsedDays > 10 &&
    progressRatio < 0.92
  ) {
    const idx =
      (prev.anomaliesTriggered +
        Math.round(evaluation.totalCostM + evaluation.instruments.length + (unverifiedPenalty > 0 ? 1 : 0))) %
      ANOMALY_POOL.length;
    const chosen = ANOMALY_POOL[idx];
    next.activeAnomaly = chosen;
    next.anomaliesTriggered = prev.anomaliesTriggered + 1;
    next.eventLog = [
      ...prev.eventLog.slice(-14),
      {
        day: Math.round(elapsedDays),
        type: 'critical',
        text: `ANOMALY: ${chosen.title}`,
      },
    ];
    return next;
  }

  // Check Failure or Completion
  if (next.spacecraftHealthPct <= 0) {
    next.phase = 'failed';
    next.failureReason = 'Spacecraft bus suffered fatal radiation/power loss before completing mission duration.';
    next.eventLog = [
      ...prev.eventLog.slice(-14),
      { day: Math.round(elapsedDays), type: 'critical', text: next.failureReason },
    ];
  } else if (elapsedDays >= prev.targetDays) {
    next.phase = 'completed';
    next.eventLog = [
      ...prev.eventLog.slice(-14),
      {
        day: Math.round(elapsedDays),
        type: 'success',
        text: `End of Prime Mission (${prev.targetDays} days): ${next.cumulativeSciencePoints.toFixed(0)} Science Pts returned.`,
      },
    ];
  }

  return next;
}

export function resolveAnomalyChoice(
  prev: SimulationState,
  choice: AnomalyChoice,
  evaluation: DesignEvaluation
): SimulationState {
  let healthDelta = choice.healthDeltaPct;
  let scienceDelta = choice.scienceDelta;

  // Coupled subsystem check: Star tracker or Rad-hard choice succeeds better if actually built!
  if (choice.requiresStarTracker && !evaluation.adcs.hasStarTracker) {
    healthDelta -= 9;
    scienceDelta -= 4;
  }
  if (choice.requiresRadHard && !evaluation.adcs.radHardened) {
    healthDelta -= 11;
    scienceDelta -= 5;
  }

  const nextHealth = clamp(prev.spacecraftHealthPct + healthDelta, 0, 100);
  const nextSciencePts = Math.max(0, prev.cumulativeSciencePoints + scienceDelta);

  return {
    ...prev,
    batterySocPct: clamp(prev.batterySocPct + choice.powerDeltaPct, 5, 100),
    dataBufferGb: clamp(prev.dataBufferGb + choice.dataDeltaGb, 0, prev.maxBufferGb),
    cumulativeSciencePoints: nextSciencePts,
    scienceProgressPct: clamp((nextSciencePts / Math.max(1, evaluation.scenario.minScienceScore)) * 100, 0, 130),
    spacecraftHealthPct: nextHealth,
    thermalC: clamp(prev.thermalC + choice.thermalDeltaC, -40, 80),
    anomaliesResolved: prev.anomaliesResolved + 1,
    activeAnomaly: null,
    phase: nextHealth <= 0 ? 'failed' : prev.phase,
    failureReason: nextHealth <= 0 ? 'Anomaly response caused unrecoverable bus failure.' : prev.failureReason,
    eventLog: [
      ...prev.eventLog.slice(-14),
      {
        day: Math.round(prev.elapsedDays),
        type: healthDelta < -6 ? 'warn' : 'info',
        text: `Resolved via "${choice.label}" (Health ${healthDelta >= 0 ? '+' : ''}${healthDelta}%, Sci ${scienceDelta >= 0 ? '+' : ''}${scienceDelta.toFixed(1)}).`,
      },
    ],
  };
}

export function evaluateMissionOutcome(
  design: MissionDesign,
  evaluation: DesignEvaluation,
  sim: SimulationState
): MissionOutcome {
  const scienceRatio = sim.cumulativeSciencePoints / Math.max(1, evaluation.scenario.minScienceScore);
  const scienceReturn = Math.round(clamp(scienceRatio * 85, 0, 100));

  const budgetHeadroom = clamp(evaluation.budgetMarginPct, 0, 40);
  const resourceEfficiency = Math.round(clamp(58 + budgetHeadroom * 1.1 - (evaluation.dataReturnRatio < 0.7 ? 18 : 0), 10, 100));

  const cmlAvg =
    (evaluation.cmlScores.cml1 +
      evaluation.cmlScores.cml2 +
      evaluation.cmlScores.cml3 +
      evaluation.cmlScores.cml4) /
    4;
  const cmlMargins = Math.round(cmlAvg);

  const operationalSurvival = Math.round(
    sim.phase === 'failed'
      ? Math.min(35, sim.spacecraftHealthPct)
      : clamp(sim.spacecraftHealthPct * 0.75 + (sim.anomaliesResolved / Math.max(1, sim.anomaliesTriggered)) * 25, 0, 100)
  );

  const signoffCount = Object.values(design.roleSignoffs).filter(Boolean).length;
  const teamCoordination = design.teamMode
    ? Math.round(40 + signoffCount * 15)
    : Math.round(clamp((cmlAvg + operationalSurvival) / 2, 0, 100));

  const totalScore = Math.round(
    scienceReturn * 0.34 +
      cmlMargins * 0.22 +
      resourceEfficiency * 0.18 +
      operationalSurvival * 0.18 +
      teamCoordination * 0.08
  );

  const success = sim.phase === 'completed' && sim.cumulativeSciencePoints >= evaluation.scenario.minScienceScore * 0.85;

  const grade: MissionOutcome['grade'] = !success
    ? 'F'
    : totalScore >= 90
      ? 'S'
      : totalScore >= 80
        ? 'A'
        : totalScore >= 68
          ? 'B'
          : 'C';

  const causalSummary: string[] = [];
  if (sim.phase === 'failed') {
    causalSummary.push(sim.failureReason ?? 'Spacecraft did not survive full mission duration.');
  } else if (scienceReturn >= 85) {
    causalSummary.push(
      `Science threshold exceeded (${sim.cumulativeSciencePoints.toFixed(0)}/${evaluation.scenario.minScienceScore} pts) with ${evaluation.pointingMatchedCount}/${evaluation.instruments.length} instruments within ADCS pointing spec.`
    );
  } else {
    causalSummary.push(
      `Science return fell short (${sim.cumulativeSciencePoints.toFixed(0)}/${evaluation.scenario.minScienceScore} pts) due to payload selection, pointing drift, or downlink throttling.`
    );
  }

  causalSummary.push(
    `Coupled Margin Review: Mass margin ${evaluation.massMarginVsBusPct.toFixed(0)}% (bus) / ${evaluation.massMarginVsLvPct.toFixed(0)}% (LV), Power margin ${evaluation.powerMarginPct.toFixed(0)}%, Telecom link margin ${evaluation.linkMarginDb.toFixed(1)} dB.`
  );

  if (evaluation.dataReturnRatio < 0.8) {
    causalSummary.push(
      `Comms Bottleneck: Instruments produced ${evaluation.dailyDataGeneratedGb.toFixed(2)} GB/day while ${evaluation.comms.band} + ${evaluation.groundNetwork.name} cleared ${evaluation.dailyDataDownlinkGb.toFixed(2)} GB/day.`
    );
  } else {
    causalSummary.push(
      `Budget & Ground Ops: Closed $${evaluation.totalCostM.toFixed(1)}M vs $${evaluation.budgetCapM.toFixed(1)}M cap (${evaluation.budgetMarginPct.toFixed(1)}% reserve).`
    );
  }

  const headline =
    grade === 'S'
      ? 'Flagship-Grade TMCO Clearance — Exceptional Science & Margin Balance'
      : grade === 'A'
        ? 'Mission Accomplished — High Science Return & Nominal Subsystem Margins'
        : grade === 'B'
          ? 'Primary Science Achieved — Minor Margin or Downlink Trade-Offs Observed'
          : grade === 'C'
            ? 'Degraded Operations — Minimum Threshold Barely Met'
            : 'Mission Loss — Coupled Engineering Bottleneck Prevented Completion';

  return {
    grade,
    totalScore,
    success,
    breakdown: {
      scienceReturn,
      resourceEfficiency,
      cmlMargins,
      operationalSurvival,
      teamCoordination,
    },
    headline,
    causalSummary,
    nasaAnalogue: {
      name: evaluation.scenario.nasaAnalogueName,
      summary: evaluation.scenario.nasaAnalogueSummary,
      alignmentNote: `Your ${evaluation.bus.classLabel} architecture with ${evaluation.comms.band} comms parallels ${evaluation.scenario.nasaAnalogueName}.`,
    },
  };
}
