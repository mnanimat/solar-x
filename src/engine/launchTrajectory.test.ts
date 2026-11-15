import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAscentControlPoints, getAscentTelemetry } from './launchTrajectory';

describe('Launch Ascent Trajectory & Staging Milestones', () => {
  it('tracks atmospheric liftoff through Stage 1 sep, Karman line exit, fairing jettison, and satellite release', () => {
    const tPad = getAscentTelemetry(0.05, 0, 'launch', 550, 'earth');
    assert.equal(tPad.milestoneId, 'pad-ignition');
    assert.equal(tPad.inSpace, false);
    assert.equal(tPad.stage1Separated, false);
    assert.equal(tPad.fairingSeparated, false);
    assert.equal(tPad.payloadSeparated, false);
    assert.ok(tPad.altitudeKm < 30);

    const tMeco = getAscentTelemetry(0.60, 0, 'launch', 550, 'earth');
    assert.equal(tMeco.milestoneId, 'meco-stage-sep');
    assert.equal(tMeco.stage1Separated, true);
    assert.equal(tMeco.fairingSeparated, false);

    const tSpaceFairing = getAscentTelemetry(0.78, 0, 'launch', 550, 'earth');
    assert.equal(tSpaceFairing.milestoneId, 'karman-fairing-sep');
    assert.equal(tSpaceFairing.inSpace, true);
    assert.ok(tSpaceFairing.altitudeKm >= 100);
    assert.equal(tSpaceFairing.fairingSeparated, true);
    assert.equal(tSpaceFairing.payloadSeparated, false);

    const tRelease = getAscentTelemetry(0.94, 0, 'launch', 550, 'earth');
    assert.equal(tRelease.milestoneId, 'seco-orbit-insert');
    assert.equal(tRelease.payloadSeparated, true);

    const tDeploy = getAscentTelemetry(1, 0.9, 'deployment', 550, 'earth');
    assert.equal(tDeploy.milestoneId, 'payload-deploy');
    assert.equal(tDeploy.inSpace, true);
    assert.equal(tDeploy.payloadSeparated, true);
    assert.equal(tDeploy.altitudeKm, 550);
  });

  it('builds continuous orbital-plane ascent control points starting on planet surface and terminating at orbital insertion', () => {
    const planetRadius = 4.6;
    const orbitRadius = 8.2;
    const pts = buildAscentControlPoints(planetRadius, orbitRadius);

    assert.equal(pts.length, 6);

    const p0 = pts[0];
    const pLast = pts[pts.length - 1];
    const startDist = Math.hypot(p0.x, p0.y, p0.z);
    assert.ok(Math.abs(startDist - planetRadius) < 1e-6, 'Must begin flush on planet surface');

    assert.equal(pLast.x, orbitRadius);
    assert.equal(pLast.y, 0);
    assert.equal(pLast.z, 0);

    // Radii must increase monotonically outward from the planet to orbit
    let prevR = 0;
    for (const pt of pts) {
      const r = Math.hypot(pt.x, pt.y, pt.z);
      assert.ok(r >= prevR - 1e-6);
      prevR = r;
    }
  });
});
