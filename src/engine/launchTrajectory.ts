import type { CelestialBodyId } from './missionCatalog';

export type AscentMilestoneId =
  | 'pad-ignition'
  | 'gravity-turn'
  | 'meco-stage-sep'
  | 'karman-fairing-sep'
  | 'seco-orbit-insert'
  | 'payload-deploy';

export interface AscentTelemetry {
  milestoneId: AscentMilestoneId;
  milestoneLabel: string;
  altitudeKm: number;
  velocityKms: number;
  inSpace: boolean;
  stage1Separated: boolean;
  fairingSeparated: boolean;
  payloadSeparated: boolean;
}

export interface TrajectoryPoint3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Computes physically grounded rocket ascent altitude, velocity, and staging
 * milestones from surface liftoff (0 km) through the Karman Line (100 km)
 * into target orbit insertion and satellite release.
 */
export function getAscentTelemetry(
  launchProgress: number,
  deployProgress: number,
  phase: 'launch' | 'deployment' | 'operations' | 'completed' | 'failed',
  targetAltitudeKm: number,
  targetBody: CelestialBodyId
): AscentTelemetry {
  const p = Math.max(0, Math.min(1, launchProgress));
  const insertionAltKm = Math.max(220, Math.min(2400, targetAltitudeKm));
  const insertionVelKms = targetBody === 'earth' ? 7.68 : 10.85;

  if (phase !== 'launch') {
    const deployed = phase !== 'deployment' || deployProgress >= 0.85;
    return {
      milestoneId: 'payload-deploy',
      milestoneLabel: deployed
        ? 'SPACECRAFT SEPARATED · ARRAYS LOCKED'
        : 'SATELLITE EJECTED · DEPLOYING SOLAR WINGS',
      altitudeKm: insertionAltKm,
      velocityKms: insertionVelKms,
      inSpace: true,
      stage1Separated: true,
      fairingSeparated: true,
      payloadSeparated: true,
    };
  }

  // Nonlinear climb: slower vertical tower clear, rapid acceleration through upper atmosphere
  const altitudeCurve = Math.pow(p, 1.38);
  const altitudeKm = altitudeCurve * insertionAltKm;
  const velocityKms = Math.pow(p, 1.18) * insertionVelKms;
  const inSpace = altitudeKm >= 100 || p >= 0.66;

  let milestoneId: AscentMilestoneId = 'pad-ignition';
  let milestoneLabel = 'T+0 LIFTOFF · PAD CLEAR';

  if (p >= 0.88) {
    milestoneId = 'seco-orbit-insert';
    milestoneLabel = 'SECO · SATELLITE RELEASE';
  } else if (p >= 0.72) {
    milestoneId = 'karman-fairing-sep';
    milestoneLabel = 'SPACE · FAIRING JETTISON';
  } else if (p >= 0.56) {
    milestoneId = 'meco-stage-sep';
    milestoneLabel = 'MECO · STAGE 1 SEPARATION';
  } else if (p >= 0.14) {
    milestoneId = 'gravity-turn';
    milestoneLabel = 'MAX-Q · GRAVITY TURN';
  }

  return {
    milestoneId,
    milestoneLabel,
    altitudeKm,
    velocityKms,
    inSpace,
    stage1Separated: p >= 0.56,
    fairingSeparated: p >= 0.72,
    payloadSeparated: p >= 0.90,
  };
}

/**
 * Generates control points inside the tilted orbital XZ plane from the planet
 * surface launchpad (startAngleRad) smoothly up through the atmosphere and
 * tangentially onto the orbital ring at angle = 0 (x = orbitRadius, z = 0).
 */
export function buildAscentControlPoints(
  planetRadius: number,
  orbitRadius: number,
  startAngleRad = -0.95
): TrajectoryPoint3D[] {
  const safeOrbitR = Math.max(planetRadius + 1.4, orbitRadius);
  const span = safeOrbitR - planetRadius;

  const cos0 = Math.cos(startAngleRad);
  const sin0 = Math.sin(startAngleRad);

  const cos1 = Math.cos(startAngleRad * 0.82);
  const sin1 = Math.sin(startAngleRad * 0.82);
  const r1 = planetRadius + span * 0.28;

  const cos2 = Math.cos(startAngleRad * 0.52);
  const sin2 = Math.sin(startAngleRad * 0.52);
  const r2 = planetRadius + span * 0.66;

  const cos3 = Math.cos(startAngleRad * 0.22);
  const sin3 = Math.sin(startAngleRad * 0.22);
  const r3 = planetRadius + span * 0.94;

  return [
    // P0: Surface Launchpad
    { x: cos0 * planetRadius, y: 0, z: sin0 * planetRadius },
    // P1: Vertical Pad Clear
    { x: cos0 * (planetRadius + Math.min(0.45, span * 0.14)), y: 0, z: sin0 * (planetRadius + Math.min(0.45, span * 0.14)) },
    // P2: Max-Q Gravity Turn exiting lower atmosphere
    { x: cos1 * r1, y: 0, z: sin1 * r1 },
    // P3: Stage 1 Sep / Karman Line Space Climb
    { x: cos2 * r2, y: 0, z: sin2 * r2 },
    // P4: Upper Stage Tangential Burn approaching orbit
    { x: cos3 * r3, y: 0, z: sin3 * r3 },
    // P5: Exact Orbital Insertion Point (orbitAngleRad = 0)
    { x: safeOrbitR, y: 0, z: 0 },
  ];
}
