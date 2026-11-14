export type DifficultyId = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'sandbox';

export type TeamRoleId = 'pi' | 'systems' | 'flight' | 'ops';

export type CelestialBodyId = 'earth' | 'moon' | 'mars' | 'europa';

export type ScienceDomain =
  | 'earth-bio'
  | 'heliophysics'
  | 'lunar-water'
  | 'mars-aeronomy'
  | 'ocean-worlds';

export interface DifficultyConfig {
  id: DifficultyId;
  name: string;
  tierLabel: string;
  budgetMultiplier: number;
  requiredMarginPct: number; // JPL CML 4 standard is 35% in Advanced/Expert
  requiredLinkMarginDb: number; // 6 dB proximity, 3 dB deep space
  anomalyRateMultiplier: number;
  strictCompliance: boolean; // Requires UL battery, TVAC/Vib/DITL, FCC/NOAA/ODAR
  description: string;
}

export interface TeamRoleConfig {
  id: TeamRoleId;
  title: string;
  shortTitle: string;
  accentHex: string;
  ownedTabs: ('cml1' | 'cml2' | 'cml3' | 'cml4')[];
  responsibility: string;
  signoffPrompt: string;
}

export interface MissionScenario {
  id: string;
  title: string;
  subtitle: string;
  domain: ScienceDomain;
  targetBody: CelestialBodyId;
  recommendedDifficulty: DifficultyId;
  baseBudgetM: number; // USD Millions
  minScienceScore: number;
  targetDurationDays: number;
  solarDistanceAu: number; // 1.0 AU Earth/Moon, 1.52 AU Mars, 5.2 AU Europa
  nasaAnalogueName: string;
  nasaAnalogueSummary: string;
  recommendedOrbitId: string;
  description: string;
  stmObjectives: string[];
}

export interface SpacecraftBus {
  id: string;
  name: string;
  classLabel: string;
  formFactor: '3u' | '6u' | '12u' | 'espa' | 'discovery' | 'flagship';
  dryStructureMassKg: number;
  maxBusMassKg: number; // Structural / dispenser ceiling
  maxPayloadSlots: number;
  basePowerDrawW: number;
  baseCostM: number;
  maxSolarAreaM2: number;
  radiationToleranceKrad: number;
  deltaVCapacityMs: number;
  dispenserEnvelope: 'ppod' | 'espa' | 'fairing';
  description: string;
}

export interface SolarArrayOption {
  id: string;
  name: string;
  massKg: number;
  areaM2: number;
  efficiencyPct: number; // ~28-32% triple-junction GaAs
  costM: number;
  deployable: boolean;
  minBusOrder: number; // 0=3U+, 1=6U+, 2=12U+, 3=ESPA+, 4=Discovery+
  description: string;
}

export interface BatteryOption {
  id: string;
  name: string;
  capacityWh: number;
  massKg: number;
  costM: number;
  maxDoDPct: number; // Safe depth of discharge per orbit
  ulListed: boolean; // CubeSat 101 safety compliance
  description: string;
}

export interface AdcsAvionicsOption {
  id: string;
  name: string;
  pointingArcsec: number;
  massKg: number;
  powerW: number;
  costM: number;
  radHardened: boolean;
  hasStarTracker: boolean;
  description: string;
}

export interface MaterialThermalOption {
  id: string;
  name: string;
  massKg: number;
  powerW: number; // Heaters/cryocooler draw
  costM: number;
  lowOutgassing: boolean; // Avoids TVAC bakeout penalty
  lowMeltingPointDemisable: boolean; // ODAR reentry casualty compliance
  thermalRangeC: string;
  description: string;
}

export interface ScienceInstrument {
  id: string;
  name: string;
  shortName: string;
  category: 'imaging' | 'spectrometer' | 'particles' | 'radar' | 'comms-tech' | 'bio';
  domainMatch: ScienceDomain[];
  slotsRequired: number;
  massKg: number;
  powerW: number;
  dataRateKbps: number; // Continuous/duty-cycled average generation
  requiredPointingArcsec: number;
  minSolarMinAu: number;
  maxSolarMaxAu: number;
  scienceValue: number;
  costM: number;
  protrusionMm: number; // CubeSat 101: >6.5mm needs custom dispenser / fairing
  requiresNoaaLicense: boolean;
  description: string;
}

export interface OrbitOption {
  id: string;
  name: string;
  targetBody: CelestialBodyId;
  altitudeKm: number;
  inclinationDeg: number;
  periodMin: number;
  eclipseFraction: number; // 0..0.42
  slantRangeKm: number; // Distance to Earth ground station
  requiredDeltaVMs: number; // Post-launch insertion / stationkeeping
  radiationDoseKradYr: number;
  naturalDecayYears: number; // >25 yrs triggers ODAR deorbit check in LEO
  scienceMultiplier: number;
  description: string;
}

export interface LaunchVehicle {
  id: string;
  name: string;
  provider: string;
  costM: number;
  maxMassLeoKg: number;
  maxMassSsoKg: number;
  maxMassDeepSpaceKg: number; // Lunar/Mars/Jovian C3 capability
  supportsFairing: boolean; // False = CubeSat deployer only (ppod)
  supportsEspa: boolean;
  reliabilityPct: number;
  description: string;
}

export interface CommsBandOption {
  id: string;
  name: string;
  band: 'UHF' | 'S-Band' | 'X-Band' | 'Ka-Band' | 'Optical';
  frequencyGhz: number;
  txPowerW: number;
  antennaGainDbi: number;
  massKg: number;
  powerW: number;
  costM: number;
  maxDataRateMbps: number;
  deepSpaceCapable: boolean;
  weatherPenaltyDb: number;
  description: string;
}

export interface GroundNetworkOption {
  id: string;
  name: string;
  gtDbK: number; // Antenna G/T figure of merit
  passesPerDay: number;
  avgPassDurationMin: number;
  costM: number;
  supportsDeepSpace: boolean;
  stationCoords: Array<{ name: string; lat: number; lon: number }>;
  description: string;
}

export interface VerificationSuite {
  ditlTested: boolean;
  vibrationTested: boolean;
  tvacTested: boolean;
  fccLicensed: boolean;
  noaaLicensed: boolean;
  odarFiled: boolean;
}

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: 'beginner',
    name: 'Explorer',
    tierLabel: 'Beginner',
    budgetMultiplier: 1.35,
    requiredMarginPct: 15,
    requiredLinkMarginDb: 3,
    anomalyRateMultiplier: 0.65,
    strictCompliance: false,
    description: 'Generous budget reserves and relaxed 15% engineering margins for learning coupled trade-offs.',
  },
  {
    id: 'intermediate',
    name: 'Discovery',
    tierLabel: 'Intermediate',
    budgetMultiplier: 1.1,
    requiredMarginPct: 25,
    requiredLinkMarginDb: 4.5,
    anomalyRateMultiplier: 1.0,
    strictCompliance: true,
    description: 'Standard university CubeSat & SmallSat margins (25%) with active regulatory and environmental checks.',
  },
  {
    id: 'advanced',
    name: 'New Frontiers',
    tierLabel: 'Advanced',
    budgetMultiplier: 1.0,
    requiredMarginPct: 35,
    requiredLinkMarginDb: 6,
    anomalyRateMultiplier: 1.3,
    strictCompliance: true,
    description: 'Full NASA JPL CML 4 discipline: 35% mass/power margins, strict 6 dB link margin, and frequent anomalies.',
  },
  {
    id: 'expert',
    name: 'Flagship',
    tierLabel: 'Expert',
    budgetMultiplier: 0.88,
    requiredMarginPct: 35,
    requiredLinkMarginDb: 6,
    anomalyRateMultiplier: 1.6,
    strictCompliance: true,
    description: 'Tight cost caps, harsh radiation environments, and zero forgiveness for unverified subsystems.',
  },
  {
    id: 'sandbox',
    name: 'Open Lab',
    tierLabel: 'Sandbox',
    budgetMultiplier: 4.0,
    requiredMarginPct: 0,
    requiredLinkMarginDb: 0,
    anomalyRateMultiplier: 0.5,
    strictCompliance: false,
    description: 'Unconstrained budget and experimental freedom to test extreme orbital and payload combinations.',
  },
];

export const TEAM_ROLES: TeamRoleConfig[] = [
  {
    id: 'pi',
    title: 'Principal Investigator',
    shortTitle: 'PI / Science',
    accentHex: '#38BDF8',
    ownedTabs: ['cml1', 'cml3'],
    responsibility: 'Owns Mission Objectives (CML 1) and Scientific Payload selection (CML 3) to exceed the science threshold.',
    signoffPrompt: 'Confirm Science Traceability Matrix (STM) and payload calibration requirements.',
  },
  {
    id: 'systems',
    title: 'Spacecraft Systems Engineer',
    shortTitle: 'Systems Eng',
    accentHex: '#F59E0B',
    ownedTabs: ['cml2'],
    responsibility: 'Balances Bus structure, Solar Power, Battery DoD, ADCS pointing, and CubeSat 101 materials (CML 2).',
    signoffPrompt: 'Verify Master Equipment List (MEL), mass/power margins, and thermal survival.',
  },
  {
    id: 'flight',
    title: 'Flight Dynamics & Launch Lead',
    shortTitle: 'Flight / LV',
    accentHex: '#10B981',
    ownedTabs: ['cml4'],
    responsibility: 'Selects Target Orbit, Launch Vehicle fairing/mass lift, and ODAR orbital decay compliance (CML 4).',
    signoffPrompt: 'Certify Launch Vehicle mass-to-orbit lift and 25-year orbital debris disposal.',
  },
  {
    id: 'ops',
    title: 'Mission Ops & Comms Lead',
    shortTitle: 'Ops / Comms',
    accentHex: '#A78BFA',
    ownedTabs: ['cml4'],
    responsibility: 'Closes RF/Optical Link Budget, Ground Station pass volume, and DITL/TVAC/FCC licensing (CML 4).',
    signoffPrompt: 'Approve downlink capacity, link margin (dB), and Day-in-the-Life (DITL) readiness.',
  },
];

export const SCENARIOS: MissionScenario[] = [
  {
    id: 'bionutrients-leo',
    title: 'BioNutrients Orbital Micro-Lab',
    subtitle: 'Earth LEO Biological & Spectral CubeSat',
    domain: 'earth-bio',
    targetBody: 'earth',
    recommendedDifficulty: 'beginner',
    baseBudgetM: 18,
    minScienceScore: 62,
    targetDurationDays: 180,
    solarDistanceAu: 1.0,
    nasaAnalogueName: 'NASA Ames BioNutrients / PharmaSat',
    nasaAnalogueSummary: 'Compact 3U–6U biological incubator CubeSat validating on-demand nutrient production and Earth biosignature telemetry in LEO.',
    recommendedOrbitId: 'iss-leo',
    description: 'Validate engineered yeast nutrient synthesis and high-resolution Earth coastal biosphere imaging within a tight CubeSat envelope.',
    stmObjectives: [
      'Measure optical growth density across 14 micro-fluidic chambers in microgravity.',
      'Downlink > 0.25 GB/day of multispectral & bio-telemetry packets.',
      'Maintain internal payload bay between 18°C and 28°C across orbital eclipses.',
    ],
  },
  {
    id: 'helio-sworm',
    title: 'Solar Flare & Magnetosphere Scout',
    subtitle: 'Sun-Synchronous Heliophysics Observatory',
    domain: 'heliophysics',
    targetBody: 'earth',
    recommendedDifficulty: 'intermediate',
    baseBudgetM: 42,
    minScienceScore: 72,
    targetDurationDays: 365,
    solarDistanceAu: 1.0,
    nasaAnalogueName: 'NASA MinXSS / Dellingr / PUNCH',
    nasaAnalogueSummary: 'High-inclination SmallSat measuring soft X-ray solar flares, upper-atmosphere drag, and geomagnetic storm coupling.',
    recommendedOrbitId: 'sso-600',
    description: 'Deploy solar X-ray spectrometry and precision magnetometry into Sun-Synchronous Orbit to forecast space weather impacts.',
    stmObjectives: [
      'Capture 0.5–12 keV solar flare spectra with < 30 arcsec pointing stability.',
      'Resolve geomagnetic field disturbances during polar oval passes.',
      'Survive South Atlantic Anomaly & polar radiation bursts for 1 full year.',
    ],
  },
  {
    id: 'lunar-trailblazer',
    title: 'Artemis Lunar Polar Ice Pathfinder',
    subtitle: 'Lunar NRHO Water & Volatiles Mapper',
    domain: 'lunar-water',
    targetBody: 'moon',
    recommendedDifficulty: 'advanced',
    baseBudgetM: 152,
    minScienceScore: 82,
    targetDurationDays: 365,
    solarDistanceAu: 1.0,
    nasaAnalogueName: 'NASA Lunar Trailblazer (SIMPLEx)',
    nasaAnalogueSummary: 'High-precision SmallSat mapping permanently shadowed lunar craters for water ice and thermal emission.',
    recommendedOrbitId: 'lunar-nrho',
    description: 'Bridge the 384,000 km Earth-Moon link gap to map water ice inside permanently shadowed south pole craters.',
    stmObjectives: [
      'Resolve OH/H2O absorption bands in permanently shadowed craters.',
      'Close deep-space telecom link margin over 384,400 km slant range.',
      'Execute lunar orbit insertion delta-v within propellant reserves.',
    ],
  },
  {
    id: 'mars-aeronomy',
    title: 'Ares Upper-Atmosphere Escapade',
    subtitle: 'Mars Orbit Magnetosphere & Dust Explorer',
    domain: 'mars-aeronomy',
    targetBody: 'mars',
    recommendedDifficulty: 'advanced',
    baseBudgetM: 310,
    minScienceScore: 88,
    targetDurationDays: 540,
    solarDistanceAu: 1.52,
    nasaAnalogueName: 'NASA MAVEN / ESCAPADE',
    nasaAnalogueSummary: 'Dual-instrument planetary orbiter studying solar wind stripping of the Martian upper atmosphere at 1.52 AU.',
    recommendedOrbitId: 'mars-science',
    description: 'At 1.52 AU, solar irradiance drops to 43% of Earth levels while communication lag and path loss climb dramatically.',
    stmObjectives: [
      'Quantify atmospheric ion escape rates across Martian seasons.',
      'Generate sufficient power at 1.52 AU despite 43% solar flux reduction.',
      'Transmit high-volume plasma & UV spectra to NASA Deep Space Network.',
    ],
  },
  {
    id: 'europa-cryo',
    title: 'Jovian Ice-Shell Reconnaissance',
    subtitle: 'Deep Space Europa Plume & Ocean Probe',
    domain: 'ocean-worlds',
    targetBody: 'europa',
    recommendedDifficulty: 'expert',
    baseBudgetM: 725,
    minScienceScore: 95,
    targetDurationDays: 730,
    solarDistanceAu: 5.2,
    nasaAnalogueName: 'NASA Europa Clipper',
    nasaAnalogueSummary: 'Radiation-hardened flagship-class deep space probe carrying ice-penetrating radar and mass spectrometry at 5.2 AU.',
    recommendedOrbitId: 'europa-elliptical',
    description: 'Survive Jupiter’s brutal radiation belts at 5.2 AU (only 3.7% Earth sunlight!) while probing Europa’s subsurface ocean.',
    stmObjectives: [
      'Sound Europa’s 15–25 km ice shell for liquid brine pockets with radar.',
      'Sample tenuous water-vapor plumes for organic biosignatures.',
      'Maintain > 150 krad radiation survivability and 5.2 AU power & telecom closure.',
    ],
  },
];

export const BUSES: SpacecraftBus[] = [
  {
    id: 'bus-3u',
    name: '3U CubeSat Chassis',
    classLabel: '3U CubeSat (10×10×34 cm)',
    formFactor: '3u',
    dryStructureMassKg: 1.4,
    maxBusMassKg: 4.5,
    maxPayloadSlots: 2,
    basePowerDrawW: 4,
    baseCostM: 1.2,
    maxSolarAreaM2: 0.25,
    radiationToleranceKrad: 15,
    deltaVCapacityMs: 45,
    dispenserEnvelope: 'ppod',
    description: 'Compact P-POD compatible aluminum frame. Low cost, strict 4.5 kg mass ceiling and tight internal volume.',
  },
  {
    id: 'bus-6u',
    name: '6U CubeSat Platform',
    classLabel: '6U CubeSat (10×20×34 cm)',
    formFactor: '6u',
    dryStructureMassKg: 3.1,
    maxBusMassKg: 12.0,
    maxPayloadSlots: 3,
    basePowerDrawW: 9,
    baseCostM: 3.4,
    maxSolarAreaM2: 0.75,
    radiationToleranceKrad: 30,
    deltaVCapacityMs: 140,
    dispenserEnvelope: 'ppod',
    description: 'Workhorse science CubeSat bus supporting dual deployable solar wings and cold-gas or electrospray thrusters.',
  },
  {
    id: 'bus-12u',
    name: '12U Deep-Space CubeSat',
    classLabel: '12U CubeSat (20×20×34 cm)',
    formFactor: '12u',
    dryStructureMassKg: 6.8,
    maxBusMassKg: 26.0,
    maxPayloadSlots: 4,
    basePowerDrawW: 18,
    baseCostM: 7.5,
    maxSolarAreaM2: 1.8,
    radiationToleranceKrad: 55,
    deltaVCapacityMs: 420,
    dispenserEnvelope: 'ppod',
    description: 'Expanded interplanetary CubeSat frame with green monopropellant propulsion and star-tracker mounts.',
  },
  {
    id: 'bus-espa',
    name: 'ESPA-Class SmallSat Bus',
    classLabel: 'ESPA SmallSat (180 kg)',
    formFactor: 'espa',
    dryStructureMassKg: 44,
    maxBusMassKg: 180,
    maxPayloadSlots: 5,
    basePowerDrawW: 48,
    baseCostM: 22,
    maxSolarAreaM2: 5.5,
    radiationToleranceKrad: 85,
    deltaVCapacityMs: 1150,
    dispenserEnvelope: 'espa',
    description: 'Hexagonal aluminum-honeycomb SmallSat bus capable of lunar injection and multi-instrument pointing.',
  },
  {
    id: 'bus-discovery',
    name: 'Discovery Planetary Bus',
    classLabel: 'Discovery Orbiter (650 kg)',
    formFactor: 'discovery',
    dryStructureMassKg: 155,
    maxBusMassKg: 650,
    maxPayloadSlots: 6,
    basePowerDrawW: 115,
    baseCostM: 68,
    maxSolarAreaM2: 18.0,
    radiationToleranceKrad: 130,
    deltaVCapacityMs: 2150,
    dispenserEnvelope: 'fairing',
    description: 'Bipropellant planetary orbiter structure with high-gain dish gimbal and redundant flight computers.',
  },
  {
    id: 'bus-flagship',
    name: 'Flagship Radiation-Vault Bus',
    classLabel: 'Flagship Vault (2,400 kg)',
    formFactor: 'flagship',
    dryStructureMassKg: 540,
    maxBusMassKg: 2400,
    maxPayloadSlots: 7,
    basePowerDrawW: 260,
    baseCostM: 185,
    maxSolarAreaM2: 96.0,
    radiationToleranceKrad: 260,
    deltaVCapacityMs: 3100,
    dispenserEnvelope: 'fairing',
    description: 'Titanium radiation-vault spacecraft engineered for Jovian mega-arrays and deep-space cryogenic science.',
  },
];

export const SOLAR_ARRAYS: SolarArrayOption[] = [
  {
    id: 'solar-body',
    name: 'Body-Mounted GaAs Panels',
    massKg: 0.45,
    areaM2: 0.14,
    efficiencyPct: 28,
    costM: 0.4,
    deployable: false,
    minBusOrder: 0,
    description: 'Zero deployment risk; flush-mounted solar cells generating modest power for LEO CubeSats.',
  },
  {
    id: 'solar-2wing',
    name: 'Dual Hinged Solar Wings',
    massKg: 1.4,
    areaM2: 0.55,
    efficiencyPct: 30,
    costM: 1.3,
    deployable: true,
    minBusOrder: 0,
    description: 'Spring-hinged deployable paddles quadrupling sunlit collection area.',
  },
  {
    id: 'solar-4wing',
    name: 'Quad Articulated Wings (1-Axis)',
    massKg: 4.8,
    areaM2: 1.75,
    efficiencyPct: 31,
    costM: 4.2,
    deployable: true,
    minBusOrder: 1,
    description: 'Sun-tracking articulated solar wings for high-duty payloads and 12U platforms.',
  },
  {
    id: 'solar-espa',
    name: 'High-Efficiency SmallSat Wings',
    massKg: 14.5,
    areaM2: 5.2,
    efficiencyPct: 32,
    costM: 11.0,
    deployable: true,
    minBusOrder: 3,
    description: 'Rigid carbon-composite array panels sized for lunar and inner-planetary power budgets.',
  },
  {
    id: 'solar-planetary',
    name: 'Planetary Deep-Space Wings',
    massKg: 42.0,
    areaM2: 17.5,
    efficiencyPct: 32,
    costM: 28.0,
    deployable: true,
    minBusOrder: 4,
    description: 'Low-intensity, low-temperature (LILT) solar cells tuned for Mars orbit at 1.52 AU.',
  },
  {
    id: 'solar-mega',
    name: 'Jovian Ultra-Span Mega-Arrays',
    massKg: 165.0,
    areaM2: 92.0,
    efficiencyPct: 33,
    costM: 64.0,
    deployable: true,
    minBusOrder: 5,
    description: 'Massive 30-meter-span Clipper-class LILT solar wings built to harvest 3.7% sunlight at 5.2 AU.',
  },
];

export const BATTERIES: BatteryOption[] = [
  {
    id: 'bat-custom-lipo',
    name: 'COTS Uncertified LiPo Pack',
    capacityWh: 38,
    massKg: 0.4,
    costM: 0.15,
    maxDoDPct: 40,
    ulListed: false,
    description: 'Cheap hobby-grade cells; fails strict CubeSat 101 UL-1642 safety and high-cycle thermal checks.',
  },
  {
    id: 'bat-ul-45',
    name: 'UL-Listed Li-Ion 45 Wh Pack',
    capacityWh: 45,
    massKg: 0.55,
    costM: 0.6,
    maxDoDPct: 35,
    ulListed: true,
    description: 'Flight-qualified 18650 space cells with independent overcharge/thermal protection.',
  },
  {
    id: 'bat-ul-180',
    name: 'High-Density 180 Wh Space Pack',
    capacityWh: 180,
    massKg: 1.6,
    costM: 1.9,
    maxDoDPct: 35,
    ulListed: true,
    description: 'Modular 6U/12U battery bank sustaining high-power spectrometers through 35-minute eclipses.',
  },
  {
    id: 'bat-espa-900',
    name: 'ESPA 900 Wh Redundant Bank',
    capacityWh: 900,
    massKg: 7.5,
    costM: 6.5,
    maxDoDPct: 30,
    ulListed: true,
    description: 'Dual-string lithium-ion storage rated for 15,000+ LEO/lunar eclipse cycles.',
  },
  {
    id: 'bat-deep-4200',
    name: 'Planetary 4.2 kWh Cryo-Shielded Bank',
    capacityWh: 4200,
    massKg: 32.0,
    costM: 19.0,
    maxDoDPct: 30,
    ulListed: true,
    description: 'Radiation-tolerant flagship battery array supporting radar bursts and deep-space eclipses.',
  },
];

export const ADCS_OPTIONS: AdcsAvionicsOption[] = [
  {
    id: 'adcs-magneto',
    name: 'Passive Magnetorquer + Sun Sensors',
    pointingArcsec: 3600, // ~1 degree
    massKg: 0.35,
    powerW: 1.5,
    costM: 0.5,
    radHardened: false,
    hasStarTracker: false,
    description: 'Coarse attitude stabilization (~1°); unsuitable for narrow-slit imagers or optical laser links.',
  },
  {
    id: 'adcs-rw-3axis',
    name: '3-Axis Reaction Wheels + IMU',
    pointingArcsec: 180, // 3 arcmin
    massKg: 1.1,
    powerW: 6.0,
    costM: 2.2,
    radHardened: false,
    hasStarTracker: false,
    description: 'Reliable 3-axis agility for small imagers and solar panel sun-pointing.',
  },
  {
    id: 'adcs-star-tracker',
    name: 'Precision Star Tracker + Micro-Wheels',
    pointingArcsec: 22,
    massKg: 2.4,
    powerW: 11.0,
    costM: 5.4,
    radHardened: true,
    hasStarTracker: true,
    description: 'Sub-arcminute optical star tracking with triple-voting radiation-tolerant flight processor.',
  },
  {
    id: 'adcs-deep-cmg',
    name: 'Dual Star Trackers + Rad-Hard Avionics',
    pointingArcsec: 8,
    massKg: 14.0,
    powerW: 32.0,
    costM: 22.0,
    radHardened: true,
    hasStarTracker: true,
    description: 'Deep-space autonomous navigation, Ka-band high-gain dish slewing, and fault-tolerant CPU.',
  },
];

export const THERMAL_MATERIAL_OPTIONS: MaterialThermalOption[] = [
  {
    id: 'mat-cots-alu',
    name: 'Standard 6061 Aluminum + Kapton',
    massKg: 0.5,
    powerW: 2.0,
    costM: 0.4,
    lowOutgassing: false,
    lowMeltingPointDemisable: true,
    thermalRangeC: '-20°C to +55°C',
    description: 'Low-cost structure with standard adhesives; requires extended TVAC bakeout to stop sensor fogging.',
  },
  {
    id: 'mat-nasa-clean',
    name: 'NASA Low-Outgassing MLI + Heaters',
    massKg: 1.6,
    powerW: 6.5,
    costM: 2.4,
    lowOutgassing: true,
    lowMeltingPointDemisable: true,
    thermalRangeC: '-40°C to +65°C',
    description: 'ASTM E595 low-outgassing coatings and demisable aluminum for zero optical contamination.',
  },
  {
    id: 'mat-titanium-vault',
    name: 'Titanium Radiation Vault + Loop Heat Pipe',
    massKg: 24.0,
    powerW: 28.0,
    costM: 18.0,
    lowOutgassing: true,
    lowMeltingPointDemisable: false,
    thermalRangeC: '-140°C to +85°C',
    description: 'Heavy high-melting-point shielding for deep space & Jovian radiation. Requires controlled disposal above LEO.',
  },
];

export const INSTRUMENTS: ScienceInstrument[] = [
  {
    id: 'inst-bionutrients',
    name: 'Micro-Fluidic BioNutrients Incubator',
    shortName: 'BioNutrients',
    category: 'bio',
    domainMatch: ['earth-bio'],
    slotsRequired: 1,
    massKg: 1.15,
    powerW: 7.5,
    dataRateKbps: 18,
    requiredPointingArcsec: 3600,
    minSolarMinAu: 0.8,
    maxSolarMaxAu: 1.6,
    scienceValue: 48,
    costM: 2.4,
    protrusionMm: 0,
    requiresNoaaLicense: false,
    description: 'Temperature-stabilized micro-reactor culturing edible nutrients with optical density spectrophotometry.',
  },
  {
    id: 'inst-multispec',
    name: 'Compact Earth Multispectral Imager',
    shortName: 'Earth Imager',
    category: 'imaging',
    domainMatch: ['earth-bio', 'lunar-water'],
    slotsRequired: 1,
    massKg: 1.35,
    powerW: 9.0,
    dataRateKbps: 420,
    requiredPointingArcsec: 180,
    minSolarMinAu: 0.7,
    maxSolarMaxAu: 2.0,
    scienceValue: 42,
    costM: 3.1,
    protrusionMm: 5.5,
    requiresNoaaLicense: true,
    description: 'Visible/NIR pushbroom telescope; triggers NOAA remote sensing licensing when imaging Earth.',
  },
  {
    id: 'inst-xray-solar',
    name: 'Soft X-Ray Solar Flare Spectrometer',
    shortName: 'Solar X-Ray',
    category: 'spectrometer',
    domainMatch: ['heliophysics'],
    slotsRequired: 1,
    massKg: 1.4,
    powerW: 8.5,
    dataRateKbps: 140,
    requiredPointingArcsec: 45,
    minSolarMinAu: 0.5,
    maxSolarMaxAu: 2.5,
    scienceValue: 46,
    costM: 5.2,
    protrusionMm: 4.0,
    requiresNoaaLicense: false,
    description: 'MinXSS-heritage silicon drift spectrometer resolving coronal heating and solar flare plasma.',
  },
  {
    id: 'inst-mag-boom',
    name: 'Deployable Fluxgate Magnetometer Boom',
    shortName: 'Magnetometer',
    category: 'particles',
    domainMatch: ['heliophysics', 'mars-aeronomy', 'ocean-worlds'],
    slotsRequired: 1,
    massKg: 2.1,
    powerW: 4.5,
    dataRateKbps: 65,
    requiredPointingArcsec: 600,
    minSolarMinAu: 0.5,
    maxSolarMaxAu: 6.0,
    scienceValue: 38,
    costM: 4.4,
    protrusionMm: 14.0,
    requiresNoaaLicense: false,
    description: 'Extends 1.5m outside spacecraft magnetic noise. 14 mm stowed protrusion exceeds standard 6.5 mm CubeSat rail envelope.',
  },
  {
    id: 'inst-ir-water',
    name: 'SWIR Lunar Volatiles & Thermal Mapper',
    shortName: 'H2O Mapper',
    category: 'spectrometer',
    domainMatch: ['lunar-water', 'earth-bio', 'mars-aeronomy'],
    slotsRequired: 2,
    massKg: 8.5,
    powerW: 28.0,
    dataRateKbps: 680,
    requiredPointingArcsec: 30,
    minSolarMinAu: 0.8,
    maxSolarMaxAu: 2.0,
    scienceValue: 56,
    costM: 18.0,
    protrusionMm: 22.0,
    requiresNoaaLicense: false,
    description: 'Cryo-cooled short-wave infrared imaging spectrometer hunting lunar water ice and mineral signatures.',
  },
  {
    id: 'inst-uv-aeronomy',
    name: 'Extreme-UV Atmospheric Escape Spectrograph',
    shortName: 'EUV Spectro',
    category: 'spectrometer',
    domainMatch: ['mars-aeronomy', 'heliophysics', 'ocean-worlds'],
    slotsRequired: 2,
    massKg: 14.0,
    powerW: 34.0,
    dataRateKbps: 540,
    requiredPointingArcsec: 25,
    minSolarMinAu: 0.8,
    maxSolarMaxAu: 6.0,
    scienceValue: 54,
    costM: 26.0,
    protrusionMm: 25.0,
    requiresNoaaLicense: false,
    description: 'Measures hydrogen/oxygen upper-atmosphere loss driven by solar wind sputtering.',
  },
  {
    id: 'inst-plasma-ion',
    name: 'Solar Wind & Ion Mass Analyzer',
    shortName: 'Ion Analyzer',
    category: 'particles',
    domainMatch: ['heliophysics', 'mars-aeronomy', 'lunar-water'],
    slotsRequired: 1,
    massKg: 6.5,
    powerW: 16.0,
    dataRateKbps: 220,
    requiredPointingArcsec: 300,
    minSolarMinAu: 0.5,
    maxSolarMaxAu: 6.0,
    scienceValue: 40,
    costM: 14.0,
    protrusionMm: 12.0,
    requiresNoaaLicense: false,
    description: 'Electrostatic analyzer capturing energetic ions escaping planetary magnetospheres.',
  },
  {
    id: 'inst-ice-radar',
    name: 'Deep Ice-Penetrating Sounder Radar',
    shortName: 'Ice Radar',
    category: 'radar',
    domainMatch: ['ocean-worlds', 'lunar-water'],
    slotsRequired: 2,
    massKg: 38.0,
    powerW: 85.0,
    dataRateKbps: 1100,
    requiredPointingArcsec: 120,
    minSolarMinAu: 0.8,
    maxSolarMaxAu: 6.0,
    scienceValue: 64,
    costM: 58.0,
    protrusionMm: 45.0,
    requiresNoaaLicense: false,
    description: 'Dual-frequency VHF/HF radar probing 25 km deep into Europa’s ice crust. Massive power & data demand!',
  },
  {
    id: 'inst-plume-ms',
    name: 'Cryo-Plume Neutral Mass Spectrometer',
    shortName: 'Plume MS',
    category: 'spectrometer',
    domainMatch: ['ocean-worlds', 'mars-aeronomy'],
    slotsRequired: 1,
    massKg: 19.0,
    powerW: 42.0,
    dataRateKbps: 310,
    requiredPointingArcsec: 180,
    minSolarMinAu: 0.8,
    maxSolarMaxAu: 6.0,
    scienceValue: 52,
    costM: 38.0,
    protrusionMm: 18.0,
    requiresNoaaLicense: false,
    description: 'Ultra-high-resolution time-of-flight mass spectrometer sniffing organic molecules in icy moon plumes.',
  },
];

export const ORBITS: OrbitOption[] = [
  {
    id: 'iss-leo',
    name: 'ISS Deployment LEO (410 km, 51.6°)',
    targetBody: 'earth',
    altitudeKm: 410,
    inclinationDeg: 51.6,
    periodMin: 92.8,
    eclipseFraction: 0.37,
    slantRangeKm: 1350,
    requiredDeltaVMs: 15,
    radiationDoseKradYr: 4.5,
    naturalDecayYears: 1.8,
    scienceMultiplier: 1.0,
    description: 'Rapid natural deorbit (<2 yrs), benign radiation, frequent passes, 37% orbital eclipse.',
  },
  {
    id: 'sso-600',
    name: 'Sun-Synchronous Polar (600 km, 97.8°)',
    targetBody: 'earth',
    altitudeKm: 600,
    inclinationDeg: 97.8,
    periodMin: 96.7,
    eclipseFraction: 0.31,
    slantRangeKm: 1850,
    requiredDeltaVMs: 35,
    radiationDoseKradYr: 14.0,
    naturalDecayYears: 14.5,
    scienceMultiplier: 1.15,
    description: 'Global polar coverage at constant local solar time. Safe <25-year ODAR decay.',
  },
  {
    id: 'leo-900',
    name: 'High LEO Debris Belt (950 km, 82°)',
    targetBody: 'earth',
    altitudeKm: 950,
    inclinationDeg: 82.0,
    periodMin: 104.1,
    eclipseFraction: 0.28,
    slantRangeKm: 2450,
    requiredDeltaVMs: 180,
    radiationDoseKradYr: 32.0,
    naturalDecayYears: 140.0,
    scienceMultiplier: 1.2,
    description: 'Long natural lifetime (>100 yrs!) violates 25-yr ODAR disposal unless spacecraft carries deorbit delta-v.',
  },
  {
    id: 'lunar-nrho',
    name: 'Lunar Near-Rectilinear Halo Orbit (NRHO)',
    targetBody: 'moon',
    altitudeKm: 3000,
    inclinationDeg: 88.0,
    periodMin: 9400,
    eclipseFraction: 0.08,
    slantRangeKm: 392000,
    requiredDeltaVMs: 780,
    radiationDoseKradYr: 38.0,
    naturalDecayYears: 999,
    scienceMultiplier: 1.25,
    description: 'Artemis Gateway orbit with uninterrupted South Pole views and 392,000 km deep-space RF link distance.',
  },
  {
    id: 'mars-science',
    name: 'Mars Elliptical Science Orbit (250×4500 km)',
    targetBody: 'mars',
    altitudeKm: 1400,
    inclinationDeg: 75.0,
    periodMin: 270,
    eclipseFraction: 0.24,
    slantRangeKm: 225000000, // 1.5 AU average comms distance
    requiredDeltaVMs: 1650,
    radiationDoseKradYr: 52.0,
    naturalDecayYears: 999,
    scienceMultiplier: 1.3,
    description: 'Sweeps from upper Martian thermosphere through solar wind bow shock. Requires 225M km DSN link.',
  },
  {
    id: 'europa-elliptical',
    name: 'Jovian Europa Tour (25–1800 km Flybys)',
    targetBody: 'europa',
    altitudeKm: 900,
    inclinationDeg: 65.0,
    periodMin: 1800,
    eclipseFraction: 0.14,
    slantRangeKm: 780000000, // 5.2 AU
    requiredDeltaVMs: 2400,
    radiationDoseKradYr: 115.0,
    naturalDecayYears: 999,
    scienceMultiplier: 1.4,
    description: 'Extreme 780M km comms path loss and intense Jovian radiation belts requiring a titanium vault.',
  },
];

export const LAUNCH_VEHICLES: LaunchVehicle[] = [
  {
    id: 'lv-electron',
    name: 'Electron SmallSat Launcher',
    provider: 'Rocket Lab',
    costM: 7.5,
    maxMassLeoKg: 300,
    maxMassSsoKg: 200,
    maxMassDeepSpaceKg: 28,
    supportsFairing: true,
    supportsEspa: true,
    reliabilityPct: 95,
    description: 'Dedicated precision small launch; fits CubeSats up to ESPA SmallSats or tiny lunar CubeSats.',
  },
  {
    id: 'lv-f9-rideshare',
    name: 'Falcon 9 Transporter Rideshare',
    provider: 'SpaceX',
    costM: 1.8,
    maxMassLeoKg: 200,
    maxMassSsoKg: 180,
    maxMassDeepSpaceKg: 0,
    supportsFairing: false, // Rideshare dispenser slots only unless dedicated
    supportsEspa: true,
    reliabilityPct: 99,
    description: 'Ultra-low-cost rideshare slot to LEO/SSO. Cannot deliver payloads to Lunar, Mars, or Deep Space.',
  },
  {
    id: 'lv-minotaur',
    name: 'Minotaur IV Heritage',
    provider: 'Northrop Grumman',
    costM: 38.0,
    maxMassLeoKg: 1730,
    maxMassSsoKg: 1150,
    maxMassDeepSpaceKg: 190,
    supportsFairing: true,
    supportsEspa: true,
    reliabilityPct: 96,
    description: 'High-thrust solid rocket suited for mid-size SmallSats and light lunar trajectories.',
  },
  {
    id: 'lv-f9-dedicated',
    name: 'Falcon 9 Dedicated',
    provider: 'SpaceX',
    costM: 69.0,
    maxMassLeoKg: 17500,
    maxMassSsoKg: 11500,
    maxMassDeepSpaceKg: 3800,
    supportsFairing: true,
    supportsEspa: true,
    reliabilityPct: 99,
    description: 'Workhorse medium-lift rocket capable of planetary orbiter injection at competitive cost.',
  },
  {
    id: 'lv-vulcan',
    name: 'Vulcan Centaur (VC4)',
    provider: 'ULA',
    costM: 128.0,
    maxMassLeoKg: 25800,
    maxMassSsoKg: 18000,
    maxMassDeepSpaceKg: 6200,
    supportsFairing: true,
    supportsEspa: true,
    reliabilityPct: 97,
    description: 'High-energy Centaur upper stage built for direct Mars and outer-planet C3 injection.',
  },
  {
    id: 'lv-sls',
    name: 'SLS Block 1 Heavy',
    provider: 'NASA',
    costM: 295.0,
    maxMassLeoKg: 95000,
    maxMassSsoKg: 62000,
    maxMassDeepSpaceKg: 27000,
    supportsFairing: true,
    supportsEspa: true,
    reliabilityPct: 98,
    description: 'Super-heavy deep space trajectory lift eliminating multi-year gravity-assist cruise delays.',
  },
];

export const COMMS_BANDS: CommsBandOption[] = [
  {
    id: 'comm-uhf',
    name: 'UHF Whip Transceiver (437 MHz)',
    band: 'UHF',
    frequencyGhz: 0.437,
    txPowerW: 2.0,
    antennaGainDbi: 2.1,
    massKg: 0.25,
    powerW: 6.5,
    costM: 0.35,
    maxDataRateMbps: 0.0384, // 38.4 kbps
    deepSpaceCapable: false,
    weatherPenaltyDb: 0.2,
    description: 'Simple amateur/university UHF radio. Very low path loss in LEO, but severely bandwidth-limited.',
  },
  {
    id: 'comm-sband',
    name: 'S-Band Patch Array (2.2 GHz)',
    band: 'S-Band',
    frequencyGhz: 2.2,
    txPowerW: 4.5,
    antennaGainDbi: 7.5,
    massKg: 0.65,
    powerW: 14.0,
    costM: 1.4,
    maxDataRateMbps: 4.0,
    deepSpaceCapable: false,
    weatherPenaltyDb: 0.6,
    description: 'Standard NASA Near Space Network S-Band telemetry & payload downlink up to 4 Mbps.',
  },
  {
    id: 'comm-xband',
    name: 'X-Band High-Gain Iris Transponder (8.4 GHz)',
    band: 'X-Band',
    frequencyGhz: 8.4,
    txPowerW: 32.0,
    antennaGainDbi: 36.5,
    massKg: 3.6,
    powerW: 38.0,
    costM: 7.2,
    maxDataRateMbps: 18.0,
    deepSpaceCapable: true,
    weatherPenaltyDb: 1.8,
    description: 'JPL Iris-class deep-space X-Band transponder with parabolic dish for lunar and Mars ranging.',
  },
  {
    id: 'comm-kaband',
    name: 'Ka-Band Gimbaled High-Gain Dish (32 GHz)',
    band: 'Ka-Band',
    frequencyGhz: 32.0,
    txPowerW: 55.0,
    antennaGainDbi: 51.5,
    massKg: 19.0,
    powerW: 78.0,
    costM: 24.0,
    maxDataRateMbps: 120.0,
    deepSpaceCapable: true,
    weatherPenaltyDb: 3.0,
    description: '3-meter-class parabolic HGA delivering multi-megabit science downlinks from Jupiter and Mars.',
  },
];

export const GROUND_NETWORKS: GroundNetworkOption[] = [
  {
    id: 'gs-uni-uhf',
    name: 'University UHF Cooperative',
    gtDbK: -14.0,
    passesPerDay: 3.5,
    avgPassDurationMin: 7.5,
    costM: 0.25,
    supportsDeepSpace: false,
    stationCoords: [
      { name: 'Boulder CO', lat: 40.0, lon: -105.3 },
      { name: 'Morehead KY', lat: 38.2, lon: -83.4 },
    ],
    description: 'Low-cost campus Yagi receivers for LEO UHF CubeSats only.',
  },
  {
    id: 'gs-commercial',
    name: 'Commercial GSaaS Global Mesh',
    gtDbK: 14.5,
    passesPerDay: 8.0,
    avgPassDurationMin: 9.0,
    costM: 2.2,
    supportsDeepSpace: false,
    stationCoords: [
      { name: 'Svalbard', lat: 78.2, lon: 15.4 },
      { name: 'Punta Arenas', lat: -53.1, lon: -70.9 },
      { name: 'Singapore', lat: 1.3, lon: 103.8 },
      { name: 'Alaska', lat: 64.8, lon: -147.7 },
    ],
    description: 'High-latitude commercial S/X-band dishes offering frequent polar passes.',
  },
  {
    id: 'gs-nsn',
    name: 'NASA Near Space Network (NSN)',
    gtDbK: 26.0,
    passesPerDay: 6.5,
    avgPassDurationMin: 14.0,
    costM: 6.5,
    supportsDeepSpace: true,
    stationCoords: [
      { name: 'White Sands NM', lat: 32.5, lon: -106.6 },
      { name: 'Wallops VA', lat: 37.9, lon: -75.5 },
      { name: 'McMurdo', lat: -77.8, lon: 166.7 },
      { name: 'Santiago', lat: -33.1, lon: -70.7 },
    ],
    description: 'NASA 18m–21m antennas supporting LEO, GEO, and Lunar NRHO missions.',
  },
  {
    id: 'gs-dsn',
    name: 'NASA Deep Space Network (DSN 70m)',
    gtDbK: 58.5,
    passesPerDay: 2.2,
    avgPassDurationMin: 240.0,
    costM: 22.0,
    supportsDeepSpace: true,
    stationCoords: [
      { name: 'Goldstone CA', lat: 35.4, lon: -116.9 },
      { name: 'Madrid', lat: 40.4, lon: -4.2 },
      { name: 'Canberra', lat: -35.4, lon: 149.0 },
    ],
    description: 'Three 120°-spaced 70-meter dishes providing continuous interplanetary coverage to Mars and Jupiter.',
  },
];
