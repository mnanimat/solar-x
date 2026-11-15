import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from './missionCatalog';
import {
  createDefaultDesign,
  createOptimalDesign,
  createSimulationState,
  evaluateMissionDesign,
  evaluateMissionOutcome,
  resolveAnomalyChoice,
  stepSimulationTick,
} from './missionPhysics';

describe('Solar-X Coupled Mission Physics & Simulation Engine', () => {
  it('all 5 scenario default presets are launch-ready and close mass, power, link, and budget', () => {
    for (const scenario of SCENARIOS) {
      const design = createDefaultDesign(scenario.id, scenario.recommendedDifficulty, false);
      const evalRes = evaluateMissionDesign(design);
      assert.equal(
        evalRes.canLaunch,
        true,
        `${scenario.id} should be launch-ready, blockers: ${evalRes.blockers.join(' | ')}`
      );
      assert.ok(evalRes.linkMarginDb > 0, `${scenario.id} link margin should be positive (${evalRes.linkMarginDb})`);
      assert.ok(evalRes.powerMarginPct > 0, `${scenario.id} power margin should be positive (${evalRes.powerMarginPct})`);
      assert.ok(evalRes.budgetMarginPct >= 0, `${scenario.id} should stay within budget`);
    }
  });

  it('couples heavier instruments -> bus/LV mass overload & budget overrun', () => {
    const design = createDefaultDesign('bionutrients-leo', 'advanced', false);
    design.busId = 'bus-3u';
    design.instrumentIds = ['inst-ice-radar']; // 38 kg instrument on 4.5 kg 3U CubeSat
    const evalRes = evaluateMissionDesign(design);
    assert.equal(evalRes.canLaunch, false);
    assert.ok(evalRes.blockers.some((b) => b.includes('structural ceiling')));
    assert.ok(evalRes.blockers.some((b) => b.includes('budget cap')));
  });

  it('enforces solar distance 1/r^2 attenuation at Europa (5.2 AU)', () => {
    const leo = evaluateMissionDesign(createDefaultDesign('bionutrients-leo', 'beginner'));
    const europa = evaluateMissionDesign(createDefaultDesign('europa-cryo', 'expert'));
    assert.ok(Math.abs(leo.solarIrradianceFactor - 1.0) < 0.01);
    assert.ok(europa.solarIrradianceFactor < 0.05, '5.2 AU solar flux must be <5% of 1 AU');
  });

  it('fails RF link budget when using UHF at Lunar/Mars distances', () => {
    const design = createDefaultDesign('lunar-trailblazer', 'intermediate');
    design.commsId = 'comm-uhf';
    design.groundNetworkId = 'gs-uni-uhf';
    const evalRes = evaluateMissionDesign(design);
    assert.equal(evalRes.canLaunch, false);
    assert.ok(evalRes.linkMarginDb < 0);
    assert.ok(evalRes.blockers.some((b) => b.includes('deep-space')));
  });

  it('enforces CubeSat 101 UL-1642 battery and FCC/NOAA licensing in strict difficulty', () => {
    const design = createDefaultDesign('bionutrients-leo', 'advanced');
    design.batteryId = 'bat-custom-lipo';
    design.verification.fccLicensed = false;
    design.verification.noaaLicensed = false;
    const evalRes = evaluateMissionDesign(design);
    assert.equal(evalRes.canLaunch, false);
    assert.ok(evalRes.blockers.some((b) => b.includes('UL-1642')));
    assert.ok(evalRes.blockers.some((b) => b.includes('FCC/NTIA')));
    assert.ok(evalRes.blockers.some((b) => b.includes('NOAA')));
  });

  it('progresses full simulation from launch -> deployment -> operations -> anomaly -> completion', () => {
    const design = createDefaultDesign('bionutrients-leo', 'beginner', true);
    design.roleSignoffs = { pi: true, systems: true, flight: true, ops: true };
    const evalRes = evaluateMissionDesign(design);
    let sim = createSimulationState(evalRes);
    assert.equal(sim.phase, 'launch');

    let guard = 0;
    let sawAnomaly = false;
    while (sim.phase !== 'completed' && sim.phase !== 'failed' && guard < 1000) {
      sim = stepSimulationTick(sim, design, evalRes, 0.25, 2);
      assert.ok(sim.subSatLonDeg >= -180 && sim.subSatLonDeg <= 180, `Invalid longitude ${sim.subSatLonDeg}`);
      assert.ok(sim.subSatLatDeg >= -90 && sim.subSatLatDeg <= 90, `Invalid latitude ${sim.subSatLatDeg}`);
      if (sim.activeAnomaly) {
        sawAnomaly = true;
        sim = resolveAnomalyChoice(sim, sim.activeAnomaly.choices[0], evalRes);
      }
      guard += 1;
    }

    assert.equal(sim.phase, 'completed');
    assert.equal(sawAnomaly, true);
    const outcome = evaluateMissionOutcome(design, evalRes, sim);
    assert.equal(outcome.success, true);
    assert.ok(['S', 'A', 'B'].includes(outcome.grade));
    assert.equal(outcome.breakdown.teamCoordination, 100);
  });

  it('applies manual attitude & orbital trajectory burns (altitude, inclination, delta-v)', () => {
    const design = createDefaultDesign('bionutrients-leo', 'beginner', false);
    const evalRes = evaluateMissionDesign(design);
    let sim = createSimulationState(evalRes);
    sim.phase = 'operations';
    const initialDv = sim.deltaVRemainingMs;

    sim = stepSimulationTick(sim, design, evalRes, 0.5, 1, {
      pitch: 1,
      yaw: 0.5,
      roll: -1,
      progradeThrust: 1,
      retrogradeThrust: 0,
      inclinationDelta: 1,
      cameraYaw: 0,
      cameraPitch: 0,
      cameraZoom: 0,
      togglePausePressed: false,
      toggleCameraPressed: false,
      confirmPressed: false,
      secondaryPressed: false,
      toggleAutopilotPressed: false,
      activeSource: 'ps5',
      controllerProfile: 'ps5-dualsense',
      controllerName: 'DualSense Wireless Controller',
    });

    assert.equal(sim.manualAttitudeActive, true);
    assert.ok(sim.craftPitchRad > 0.5);
    assert.ok(sim.craftYawRad > 0.2);
    assert.ok(sim.craftRollRad < -0.5);
    assert.ok(sim.altitudeOffsetKm > 20);
    assert.ok(sim.inclinationOffsetDeg > 5);
    assert.ok(sim.deltaVRemainingMs < initialDv);
    assert.equal(sim.activeThrusterDir, 'prograde');
  });

  it('createOptimalDesign configures launch-ready architectures across all scenarios and clears deployment smoothly', () => {
    for (const scenario of SCENARIOS) {
      const opt = createOptimalDesign(scenario.id, scenario.recommendedDifficulty, true);
      const evalOpt = evaluateMissionDesign(opt);
      assert.equal(
        evalOpt.canLaunch,
        true,
        `Optimal setup for ${scenario.id} failed: ${evalOpt.blockers.join(' | ')}`
      );
      assert.equal(opt.roleSignoffs.pi && opt.roleSignoffs.systems && opt.roleSignoffs.flight && opt.roleSignoffs.ops, true);
    }

    // Verify continuous orbital angle movement immediately upon entering deployment (no freeze/hitch)
    const bio = createOptimalDesign('bionutrients-leo', 'beginner', false);
    const evalBio = evaluateMissionDesign(bio);
    let sim = createSimulationState(evalBio);
    sim.phase = 'deployment';
    sim.deployProgress = 0.05;
    sim.orbitAngleRad = 0;
    sim = stepSimulationTick(sim, bio, evalBio, 0.25, 1);
    assert.ok(sim.orbitAngleRad > 0.1, 'Satellite must begin orbiting immediately during solar deployment');
  });
});
