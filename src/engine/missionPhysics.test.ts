import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from './missionCatalog';
import {
  createDefaultDesign,
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
});
