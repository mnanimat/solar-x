import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { CelestialBodyId } from '../engine/missionCatalog';
import type { DesignEvaluation, SimulationState } from '../engine/missionPhysics';
import type { FlightControlInput } from '../engine/flightControls';
import { buildAscentControlPoints } from '../engine/launchTrajectory';

export type ViewportCameraPreset = 'assembly' | 'orbit' | 'launch';

export interface IntroTelemetry {
  phase: 'launch' | 'deployment' | 'operations';
  launchProgress: number;
  deployProgress: number;
  orbitAngleRad: number;
}

interface SpacecraftAndOrbit3DProps {
  mode: 'starter' | 'intro' | 'title' | 'workbench' | 'simulation';
  viewPreset: ViewportCameraPreset;
  explodedAmount: number; // 0..1 for CAD assembly inspection
  evaluation: DesignEvaluation;
  simState: SimulationState | null;
  flightInputRef?: React.MutableRefObject<FlightControlInput>;
  introTelemetryRef?: React.MutableRefObject<IntroTelemetry | null>;
  previewTrajectory?: { altKm: number; incDeg: number };
  onTrajectoryDrag?: (altDeltaKm: number, incDeltaDeg: number) => void;
}

function createSolarCellTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0B1B3B';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    for (let x = 0; x <= 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y <= 256; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    // Subtle silver busbars
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
    ctx.lineWidth = 1;
    for (let x = 16; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createPlanetTexture(body: CelestialBodyId): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(512, 256);
    const data = img.data;
    // Deterministic multi-octave trigonometric value noise for realistic coastlines & terrain
    const fbm = (lon: number, lat: number, seed: number) => {
      const x = Math.cos(lat) * Math.cos(lon);
      const y = Math.sin(lat);
      const z = Math.cos(lat) * Math.sin(lon);
      const n1 = Math.sin(x * 2.7 + seed) * Math.cos(z * 2.4 - seed * 0.5) + Math.sin(y * 3.1 + x * 1.9);
      const n2 = 0.5 * Math.sin(x * 6.2 - z * 5.4 + seed * 1.7) * Math.cos(y * 5.8 + x * 3.3);
      const n3 = 0.25 * Math.cos(x * 13.5 + y * 11.2 - z * 9.8);
      return (n1 + n2 + n3) / 2.25;
    };

    for (let py = 0; py < 256; py++) {
      const lat = (0.5 - py / 256) * Math.PI;
      const absLat = Math.abs(lat) / (Math.PI / 2);
      for (let px = 0; px < 512; px++) {
        const lon = (px / 512) * Math.PI * 2 - Math.PI;
        const idx = (py * 512 + px) * 4;
        const h = fbm(lon, lat, body === 'earth' ? 1.4 : body === 'mars' ? 3.8 : 6.1);

        let r = 10;
        let g = 30;
        let b = 70;

        if (body === 'earth') {
          const cloud = fbm(lon * 1.4 + 0.6, lat * 1.2, 9.2);
          if (absLat > 0.84 + h * 0.06) {
            r = 226;
            g = 236;
            b = 245;
          } else if (h > 0.14) {
            // Land biome: lush green -> arid tan -> alpine
            const elev = Math.min(1, (h - 0.14) * 2.4);
            const arid = Math.max(0, 1 - Math.abs(absLat - 0.28) * 3.2);
            r = 34 + arid * 88 + elev * 45;
            g = 86 + arid * 42 + elev * 28;
            b = 52 + elev * 30;
          } else {
            // Deep ocean -> coastal shelf
            const shelf = Math.max(0, (h + 0.35) * 1.8);
            r = 8 + shelf * 14;
            g = 32 + shelf * 54;
            b = 78 + shelf * 62;
          }
          if (cloud > 0.28) {
            const cAlpha = Math.min(0.68, (cloud - 0.28) * 1.7);
            r = r * (1 - cAlpha) + 240 * cAlpha;
            g = g * (1 - cAlpha) + 245 * cAlpha;
            b = b * (1 - cAlpha) + 252 * cAlpha;
          }
        } else if (body === 'moon') {
          const maria = fbm(lon * 0.9, lat * 0.9, 4.1);
          const base = maria > 0.12 ? 96 : 148;
          const crater = Math.abs(Math.sin(lon * 18) * Math.cos(lat * 18));
          const shade = base + h * 26 - (crater > 0.92 ? 28 : 0);
          r = shade;
          g = shade + 2;
          b = shade + 6;
        } else if (body === 'mars') {
          if (absLat > 0.88 + h * 0.04) {
            r = 236;
            g = 228;
            b = 224;
          } else {
            const dust = Math.max(-1, Math.min(1, h * 1.6));
            r = 165 + dust * 42;
            g = 76 + dust * 28;
            b = 44 + dust * 18;
          }
        } else {
          // Europa ice shell with crisscrossing brownish lineae ridges
          const ridge = Math.abs(Math.sin(lon * 6 + lat * 4 + h * 3.5)) < 0.09 || Math.abs(Math.cos(lon * 4 - lat * 7)) < 0.07;
          if (ridge) {
            r = 148;
            g = 104;
            b = 84;
          } else {
            r = 198 + h * 28;
            g = 212 + h * 24;
            b = 228 + h * 18;
          }
        }

        data[idx] = Math.max(0, Math.min(255, r));
        data[idx + 1] = Math.max(0, Math.min(255, g));
        data[idx + 2] = Math.max(0, Math.min(255, b));
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRocketHullTexture(lvId: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const isOrangeTank = lvId === 'lv-sls';
    ctx.fillStyle = isOrangeTank ? '#C2410C' : '#E2E8F0';
    ctx.fillRect(0, 0, 256, 512);

    // Subtle tank weld seams & milled aluminum ribbing
    ctx.strokeStyle = isOrangeTank ? 'rgba(124, 45, 18, 0.45)' : 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 2;
    for (let y = 48; y < 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }

    // Cryogenic LOX frost band & telemetry stripe
    ctx.fillStyle = isOrangeTank ? '#9A3412' : '#0F172A';
    ctx.fillRect(0, 12, 256, 42);
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(0, 54, 256, 8);

    // Vertical black-and-white NASA roll pattern checkerboard near top of booster
    const cell = 16;
    for (let cx = 0; cx < 256; cx += cell) {
      ctx.fillStyle = (cx / cell) % 2 === 0 ? '#0F172A' : '#F8FAFC';
      ctx.fillRect(cx, 72, cell, 20);
    }

    // Vertical Solar-X telemetry stripe
    ctx.fillStyle = isOrangeTank ? '#F8FAFC' : '#0284C7';
    ctx.fillRect(114, 110, 28, 330);
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 462, 256, 50);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface BuiltSpacecraft {
  root: THREE.Group;
  leftWingPivot: THREE.Group | null;
  rightWingPivot: THREE.Group | null;
  explodedParts: Array<{ obj: THREE.Object3D; basePos: THREE.Vector3; explodeOffset: THREE.Vector3 }>;
  magBoomTip: THREE.Object3D | null;
  thrusterPlume: THREE.Mesh;
}

function buildProceduralSpacecraft(
  evalData: DesignEvaluation,
  solarTex: THREE.CanvasTexture
): BuiltSpacecraft {
  const root = new THREE.Group();
  const explodedParts: BuiltSpacecraft['explodedParts'] = [];

  const registerExplode = (obj: THREE.Object3D, explodeOffset: THREE.Vector3) => {
    explodedParts.push({
      obj,
      basePos: obj.position.clone(),
      explodeOffset,
    });
  };

  const form = evalData.bus.formFactor;
  const dims =
    form === '3u'
      ? { w: 0.55, h: 1.35, d: 0.55 }
      : form === '6u'
        ? { w: 0.95, h: 1.45, d: 0.58 }
        : form === '12u'
          ? { w: 1.05, h: 1.55, d: 1.05 }
          : form === 'espa'
            ? { w: 1.5, h: 1.75, d: 1.5 }
            : form === 'discovery'
              ? { w: 1.95, h: 2.15, d: 1.95 }
              : { w: 2.4, h: 2.6, d: 2.3 };

  const isGoldMli = evalData.material.id !== 'mat-cots-alu';
  const isTitanium = evalData.material.id === 'mat-titanium-vault';

  const frameMat = new THREE.MeshStandardMaterial({
    color: isTitanium ? '#64748B' : '#CBD5E1',
    metalness: 0.85,
    roughness: 0.28,
  });
  const mliMat = new THREE.MeshStandardMaterial({
    color: isGoldMli ? '#D97706' : '#94A3B8',
    metalness: 0.82,
    roughness: 0.24,
  });
  const darkTechMat = new THREE.MeshStandardMaterial({
    color: '#1E293B',
    metalness: 0.5,
    roughness: 0.45,
  });
  const solarMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    metalness: 0.35,
    roughness: 0.25,
    side: THREE.DoubleSide,
  });

  // 1. Core Chassis Bus
  const busGroup = new THREE.Group();
  if (form === 'espa' || form === 'discovery' || form === 'flagship') {
    const coreMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(dims.w * 0.48, dims.w * 0.52, dims.h, 8),
      mliMat
    );
    busGroup.add(coreMesh);
    const ringGeo = new THREE.TorusGeometry(dims.w * 0.52, 0.055, 8, 24);
    const topRing = new THREE.Mesh(ringGeo, frameMat);
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = dims.h * 0.48;
    const botRing = topRing.clone();
    botRing.position.y = -dims.h * 0.48;
    busGroup.add(topRing, botRing);
  } else {
    const coreMesh = new THREE.Mesh(new THREE.BoxGeometry(dims.w, dims.h, dims.d), mliMat);
    busGroup.add(coreMesh);
    // 4 CubeSat Corner Rails
    const railGeo = new THREE.BoxGeometry(0.06, dims.h + 0.08, 0.06);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const rail = new THREE.Mesh(railGeo, frameMat);
        rail.position.set(sx * (dims.w * 0.5), 0, sz * (dims.d * 0.5));
        busGroup.add(rail);
      }
    }
  }
  root.add(busGroup);

  // 2. Internal Battery & Avionics Module (slides forward in Exploded View)
  const avionicsGroup = new THREE.Group();
  const batBox = new THREE.Mesh(
    new THREE.BoxGeometry(dims.w * 0.62, dims.h * 0.26, dims.d * 0.62),
    new THREE.MeshStandardMaterial({
      color: evalData.battery.ulListed ? '#10B981' : '#EF4444',
      metalness: 0.4,
      roughness: 0.45,
    })
  );
  batBox.position.y = -dims.h * 0.14;
  const cpuBox = new THREE.Mesh(
    new THREE.BoxGeometry(dims.w * 0.58, dims.h * 0.2, dims.d * 0.58),
    new THREE.MeshStandardMaterial({ color: '#0284C7', metalness: 0.55, roughness: 0.35 })
  );
  cpuBox.position.y = dims.h * 0.14;
  avionicsGroup.add(batBox, cpuBox);
  root.add(avionicsGroup);
  registerExplode(avionicsGroup, new THREE.Vector3(0, 0, dims.d * 1.15));

  // 3. ADCS Star Tracker + Reaction Wheel Module
  const adcsGroup = new THREE.Group();
  adcsGroup.position.set(-dims.w * 0.32, dims.h * 0.32, dims.d * 0.45);
  const rwBlock = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.22), darkTechMat);
  adcsGroup.add(rwBlock);
  if (evalData.adcs.hasStarTracker) {
    const baffle = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 12, 1, true), frameMat);
    baffle.rotation.x = Math.PI * 0.35;
    baffle.position.set(0, 0.08, 0.14);
    adcsGroup.add(baffle);
  }
  root.add(adcsGroup);
  registerExplode(adcsGroup, new THREE.Vector3(-0.65, 0.35, 0.7));

  // 4. Aft Propulsion Bell & Propellant Tank
  const propGroup = new THREE.Group();
  propGroup.position.set(0, -dims.h * 0.56, 0);
  const tank = new THREE.Mesh(new THREE.SphereGeometry(dims.w * 0.22, 16, 12), frameMat);
  tank.position.y = 0.06;
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.22, 0.32, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.9, roughness: 0.2, side: THREE.DoubleSide })
  );
  nozzle.position.y = -0.16;
  propGroup.add(tank, nozzle);
  root.add(propGroup);
  registerExplode(propGroup, new THREE.Vector3(0, -0.85, 0));

  // 5. Communications Antenna Assembly (Top / +Y)
  const commsGroup = new THREE.Group();
  commsGroup.position.set(0, dims.h * 0.54, 0);
  if (evalData.comms.band === 'Ka-Band' || evalData.comms.band === 'X-Band') {
    const dishRadius = evalData.comms.band === 'Ka-Band' ? dims.w * 0.56 : dims.w * 0.36;
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(dishRadius, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.38),
      new THREE.MeshStandardMaterial({
        color: evalData.comms.band === 'Ka-Band' ? '#FBBF24' : '#E2E8F0',
        metalness: 0.78,
        roughness: 0.24,
        side: THREE.DoubleSide,
      })
    );
    dish.rotation.x = Math.PI;
    dish.position.y = dishRadius * 0.65 + 0.16;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.32, 8), frameMat);
    mast.position.y = 0.14;
    const feedHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.24, 8), darkTechMat);
    feedHorn.position.y = dish.position.y + 0.12;
    commsGroup.add(mast, dish, feedHorn);
  } else if (evalData.comms.band === 'S-Band') {
    const patch = new THREE.Mesh(
      new THREE.BoxGeometry(dims.w * 0.42, 0.06, dims.w * 0.42),
      new THREE.MeshStandardMaterial({ color: '#F59E0B', metalness: 0.6, roughness: 0.3 })
    );
    patch.position.y = 0.05;
    commsGroup.add(patch);
  } else {
    // UHF Whip Antennas
    for (const angle of [0.3, -0.3]) {
      const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.75, 6), frameMat);
      whip.position.set(angle * 0.5, 0.34, 0);
      whip.rotation.z = angle;
      commsGroup.add(whip);
    }
  }
  root.add(commsGroup);
  registerExplode(commsGroup, new THREE.Vector3(0, 0.95, 0));

  // 6. Deployable Solar Wings (+X / -X)
  let leftWingPivot: THREE.Group | null = null;
  let rightWingPivot: THREE.Group | null = null;

  if (evalData.solar.deployable) {
    const isMega = evalData.solar.id === 'solar-mega';
    const isPlanetary = evalData.solar.id === 'solar-planetary' || evalData.solar.id === 'solar-espa';
    const wingLen = isMega ? 4.4 : isPlanetary ? 2.6 : evalData.solar.id === 'solar-4wing' ? 1.85 : 1.35;
    const wingWidth = isMega ? 1.15 : isPlanetary ? 0.85 : 0.65;

    leftWingPivot = new THREE.Group();
    leftWingPivot.position.set(-dims.w * 0.52, 0, 0);
    const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(wingLen, wingWidth, 0.035), solarMat);
    leftPanel.position.x = -wingLen * 0.5 - 0.08;
    const leftStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, wingLen + 0.1, 6), frameMat);
    leftStrut.rotation.z = Math.PI / 2;
    leftStrut.position.x = -wingLen * 0.5 - 0.05;
    leftWingPivot.add(leftPanel, leftStrut);
    root.add(leftWingPivot);
    registerExplode(leftWingPivot, new THREE.Vector3(-0.9, 0, 0));

    rightWingPivot = new THREE.Group();
    rightWingPivot.position.set(dims.w * 0.52, 0, 0);
    const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(wingLen, wingWidth, 0.035), solarMat);
    rightPanel.position.x = wingLen * 0.5 + 0.08;
    const rightStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, wingLen + 0.1, 6), frameMat);
    rightStrut.rotation.z = Math.PI / 2;
    rightStrut.position.x = wingLen * 0.5 + 0.05;
    rightWingPivot.add(rightPanel, rightStrut);
    root.add(rightWingPivot);
    registerExplode(rightWingPivot, new THREE.Vector3(0.9, 0, 0));
  } else {
    // Body-mounted solar cells
    for (const sx of [-1, 1]) {
      const bodyPanel = new THREE.Mesh(new THREE.BoxGeometry(0.03, dims.h * 0.78, dims.d * 0.78), solarMat);
      bodyPanel.position.set(sx * (dims.w * 0.5 + 0.025), 0, 0);
      root.add(bodyPanel);
      registerExplode(bodyPanel, new THREE.Vector3(sx * 0.55, 0, 0));
    }
  }

  // 7. Science Instruments Payload Bay (-Z nadir face & booms)
  let magBoomTip: THREE.Object3D | null = null;
  evalData.instruments.forEach((inst, idx) => {
    const instGroup = new THREE.Group();
    const yOff = (idx - (evalData.instruments.length - 1) / 2) * (dims.h * 0.28);

    if (inst.id === 'inst-mag-boom') {
      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 1.85, 8), frameMat);
      boom.rotation.x = Math.PI / 2;
      boom.position.set(0, yOff, -dims.d * 0.5 - 0.92);
      const tip = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.11),
        new THREE.MeshStandardMaterial({ color: '#38BDF8', metalness: 0.7, roughness: 0.25 })
      );
      tip.position.set(0, yOff, -dims.d * 0.5 - 1.85);
      instGroup.add(boom, tip);
      magBoomTip = tip;
      registerExplode(instGroup, new THREE.Vector3(0, 0, -0.9));
    } else if (inst.category === 'radar') {
      const dipole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, dims.w * 2.2, 8),
        new THREE.MeshStandardMaterial({ color: '#38BDF8', metalness: 0.75, roughness: 0.25 })
      );
      dipole.rotation.z = Math.PI / 2;
      dipole.position.set(0, -dims.h * 0.2, -dims.d * 0.58);
      instGroup.add(dipole);
      registerExplode(instGroup, new THREE.Vector3(0, -0.35, -0.85));
    } else {
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(dims.w * 0.42, 0.24, 0.28),
        new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.7, roughness: 0.35 })
      );
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.13, 0.16, 16),
        new THREE.MeshStandardMaterial({
          color: inst.category === 'bio' ? '#10B981' : '#38BDF8',
          metalness: 0.4,
          roughness: 0.15,
          emissive: inst.category === 'bio' ? '#065F46' : '#0369A1',
          emissiveIntensity: 0.35,
        })
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.z = -0.15;
      instGroup.add(housing, lens);
      instGroup.position.set((idx % 2 === 0 ? 1 : -1) * dims.w * 0.18, yOff, -dims.d * 0.52);
      registerExplode(instGroup, new THREE.Vector3((idx % 2 === 0 ? 0.35 : -0.35), 0, -0.85));
    }
    root.add(instGroup);
  });

  // 8. RCS / Main Thruster Exhaust Plume (lights up during manual burns)
  const thrusterPlume = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.95, 12),
    new THREE.MeshBasicMaterial({
      color: '#F59E0B',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    })
  );
  thrusterPlume.rotation.x = Math.PI;
  thrusterPlume.position.set(0, -dims.h * 0.56 - 0.65, 0);
  thrusterPlume.visible = false;
  root.add(thrusterPlume);

  return { root, leftWingPivot, rightWingPivot, explodedParts, magBoomTip, thrusterPlume };
}

interface RocketStackRig {
  rocket: THREE.Group;
  firstStage: THREE.Group;
  upperStage: THREE.Group;
  fairingLeft: THREE.Group;
  fairingRight: THREE.Group;
  stage1Flame: THREE.Group;
  stage2Flame: THREE.Group;
  hullTex: THREE.CanvasTexture;
}

function buildRocketStack(lvId: string): RocketStackRig {
  const rocket = new THREE.Group();
  const isHeavy = lvId === 'lv-sls' || lvId === 'lv-vulcan';
  const bodyRadius = isHeavy ? 0.5 : 0.34;
  const hullTex = createRocketHullTexture(lvId);

  const hullMat = new THREE.MeshStandardMaterial({
    map: hullTex,
    metalness: lvId === 'lv-sls' ? 0.16 : 0.3,
    roughness: lvId === 'lv-sls' ? 0.62 : 0.36,
  });
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#F1F5F9', metalness: 0.25, roughness: 0.36 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1E293B', metalness: 0.72, roughness: 0.32 });
  const steelMat = new THREE.MeshStandardMaterial({ color: '#64748B', metalness: 0.88, roughness: 0.22 });
  const nozzleMat = new THREE.MeshStandardMaterial({
    color: '#475569',
    metalness: 0.9,
    roughness: 0.2,
    side: THREE.DoubleSide,
  });

  // 1. First Stage Booster Assembly
  const firstStage = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(bodyRadius, bodyRadius, 3.25, 24), hullMat);
  core.position.y = -1.65;
  firstStage.add(core);

  // Propellant feed line & cable raceway along core
  const raceway = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.05, 0.09), steelMat);
  raceway.position.set(0, -1.65, bodyRadius + 0.02);
  firstStage.add(raceway);

  // Carbon interstage collar
  const interstage = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyRadius * 1.01, bodyRadius * 1.01, 0.42, 24),
    darkMat
  );
  interstage.position.y = -0.02;
  firstStage.add(interstage);

  // 4 aerodynamic grid fins & lower stabilizing strakes
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.16), steelMat);
    fin.position.set(Math.cos(angle) * (bodyRadius + 0.1), -0.34, Math.sin(angle) * (bodyRadius + 0.1));
    fin.rotation.y = -angle;
    const strake = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.05), darkMat);
    strake.position.set(Math.cos(angle) * (bodyRadius + 0.08), -2.95, Math.sin(angle) * (bodyRadius + 0.08));
    strake.rotation.y = -angle;
    firstStage.add(fin, strake);
  }

  // Octaweb thrust skirt + clustered engine nozzle bells
  const engineSkirt = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyRadius * 0.94, bodyRadius * 1.08, 0.36, 20),
    darkMat
  );
  engineSkirt.position.y = -3.38;
  firstStage.add(engineSkirt);

  const mainNozzleGeo = new THREE.CylinderGeometry(0.06, 0.14, 0.32, 14, 1, true);
  const nozzleOffsets: Array<[number, number]> = isHeavy
    ? [
        [0, 0],
        [0.18, 0.1],
        [-0.18, 0.1],
        [0, -0.18],
      ]
    : [
        [0, 0],
        [0.12, 0],
        [-0.12, 0],
      ];
  for (const [nx, nz] of nozzleOffsets) {
    const bell = new THREE.Mesh(mainNozzleGeo, nozzleMat);
    bell.position.set(nx, -3.68, nz);
    firstStage.add(bell);
  }

  // Twin Solid Rocket Boosters for SLS / Vulcan heavy configurations
  if (isHeavy) {
    for (const sx of [-1, 1]) {
      const srbBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.75, 16), whiteMat);
      srbBody.position.set(sx * (bodyRadius + 0.24), -1.78, 0);
      const srbBand = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.16, 16), darkMat);
      srbBand.position.set(sx * (bodyRadius + 0.24), -0.75, 0);
      const srbCone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.48, 16), whiteMat);
      srbCone.position.set(sx * (bodyRadius + 0.24), -0.17, 0);
      const srbNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.16, 0.28, 14, 1, true), nozzleMat);
      srbNozzle.position.set(sx * (bodyRadius + 0.24), -3.28, 0);
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.08), steelMat);
      strut.position.set(sx * (bodyRadius + 0.12), -0.95, 0);
      firstStage.add(srbBody, srbBand, srbCone, srbNozzle, strut);
    }
  }

  // Stage 1 Dual-Layer Exhaust Plume
  const stage1Flame = new THREE.Group();
  stage1Flame.position.set(0, -3.82, 0);
  const outerPlume1 = new THREE.Mesh(
    new THREE.ConeGeometry(bodyRadius * 0.92, 2.9, 16),
    new THREE.MeshBasicMaterial({
      color: '#F97316',
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  outerPlume1.rotation.x = Math.PI;
  outerPlume1.position.y = -1.45;
  const innerCore1 = new THREE.Mesh(
    new THREE.ConeGeometry(bodyRadius * 0.42, 1.75, 14),
    new THREE.MeshBasicMaterial({
      color: '#FEF08A',
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  innerCore1.rotation.x = Math.PI;
  innerCore1.position.y = -0.88;
  stage1Flame.add(outerPlume1, innerCore1);
  firstStage.add(stage1Flame);
  rocket.add(firstStage);

  // 2. Cryogenic Upper Stage + Payload Attach Fitting (PAF)
  const upperStage = new THREE.Group();
  const stage2Tank = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyRadius * 0.95, bodyRadius * 0.95, 1.05, 22),
    darkMat
  );
  stage2Tank.position.y = 0.56;
  const avionicsBand = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyRadius * 0.97, bodyRadius * 0.97, 0.16, 22),
    whiteMat
  );
  avionicsBand.position.y = 1.08;
  const pafCone = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyRadius * 0.55, bodyRadius * 0.92, 0.24, 20),
    steelMat
  );
  pafCone.position.y = 1.24;
  const vacuumBell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, bodyRadius * 0.48, 0.46, 18, 1, true),
    nozzleMat
  );
  vacuumBell.position.y = -0.14;

  const stage2Flame = new THREE.Group();
  stage2Flame.position.set(0, -0.36, 0);
  stage2Flame.visible = false;
  const outerPlume2 = new THREE.Mesh(
    new THREE.ConeGeometry(bodyRadius * 0.68, 2.2, 16),
    new THREE.MeshBasicMaterial({
      color: '#38BDF8',
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  outerPlume2.rotation.x = Math.PI;
  outerPlume2.position.y = -1.1;
  const innerCore2 = new THREE.Mesh(
    new THREE.ConeGeometry(bodyRadius * 0.3, 1.2, 14),
    new THREE.MeshBasicMaterial({
      color: '#E0F2FE',
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  innerCore2.rotation.x = Math.PI;
  innerCore2.position.y = -0.6;
  stage2Flame.add(outerPlume2, innerCore2);

  upperStage.add(stage2Tank, avionicsBand, pafCone, vacuumBell, stage2Flame);
  rocket.add(upperStage);

  // 3. Split Payload Fairing Halves (peel open cleanly in space at Karman line)
  const buildFairingHalf = (startPhi: number) => {
    const half = new THREE.Group();
    half.position.y = 1.15;
    const cylHalf = new THREE.Mesh(
      new THREE.CylinderGeometry(bodyRadius * 1.06, bodyRadius * 1.06, 1.05, 18, 1, false, startPhi, Math.PI),
      whiteMat
    );
    cylHalf.position.y = 0.52;
    const noseHalf = new THREE.Mesh(
      new THREE.ConeGeometry(bodyRadius * 1.06, 1.18, 18, 1, false, startPhi, Math.PI),
      whiteMat
    );
    noseHalf.position.y = 1.63;
    const seamStripe = new THREE.Mesh(
      new THREE.CylinderGeometry(bodyRadius * 1.08, bodyRadius * 1.08, 0.1, 18, 1, false, startPhi, Math.PI),
      darkMat
    );
    seamStripe.position.y = 0.08;
    half.add(cylHalf, noseHalf, seamStripe);
    return half;
  };

  // thetaStart = Math.PI -> -X half; thetaStart = 0 -> +X half
  const fairingLeft = buildFairingHalf(Math.PI);
  const fairingRight = buildFairingHalf(0);
  rocket.add(fairingLeft, fairingRight);

  return {
    rocket,
    firstStage,
    upperStage,
    fairingLeft,
    fairingRight,
    stage1Flame,
    stage2Flame,
    hullTex,
  };
}

export const SpacecraftAndOrbit3D: React.FC<SpacecraftAndOrbit3DProps> = ({
  mode,
  viewPreset,
  explodedAmount,
  evaluation,
  simState,
  flightInputRef,
  introTelemetryRef,
  previewTrajectory,
  onTrajectoryDrag,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef({
    mode,
    viewPreset,
    explodedAmount,
    evaluation,
    simState,
    flightInputRef,
    introTelemetryRef,
    previewTrajectory,
    onTrajectoryDrag,
  });
  propsRef.current = {
    mode,
    viewPreset,
    explodedAmount,
    evaluation,
    simState,
    flightInputRef,
    introTelemetryRef,
    previewTrajectory,
    onTrajectoryDrag,
  };

  const rebuildSignature = [
    evaluation.bus.id,
    evaluation.solar.id,
    evaluation.battery.id,
    evaluation.adcs.id,
    evaluation.material.id,
    evaluation.comms.id,
    evaluation.instruments.map((i) => i.id).join(','),
    evaluation.launchVehicle.id,
  ].join('|');

  const orbitSignature = [
    evaluation.orbit.targetBody,
    evaluation.orbit.inclinationDeg,
    evaluation.orbit.altitudeKm,
  ].join('|');

  const sceneControlsRef = useRef<{
    rebuildSpacecraft?: () => void;
    rebuildOrbit?: () => void;
  }>({});

  useEffect(() => {
    sceneControlsRef.current.rebuildSpacecraft?.();
  }, [rebuildSignature]);

  useEffect(() => {
    sceneControlsRef.current.rebuildOrbit?.();
  }, [orbitSignature]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 1280;
    const height = container.clientHeight || 720;

    // Probe WebGL renderer string before instantiating WebGLRenderer so antialias is disabled on software GL
    let isSoftwareGl = false;
    try {
      const probeCanvas = document.createElement('canvas');
      const probeGl =
        probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (probeGl) {
        const debugInfo = probeGl.getExtension('WEBGL_debug_renderer_info');
        const rendererStr = debugInfo ? String(probeGl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : '';
        isSoftwareGl = /SwiftShader|llvmpipe|Software Rasterizer/i.test(rendererStr);
        probeGl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    } catch {
      isSoftwareGl = false;
    }

    const renderer = new THREE.WebGLRenderer({
      powerPreference: isSoftwareGl ? 'low-power' : 'high-performance',
      antialias: !isSoftwareGl,
    });

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#060911');

    const pmrem = isSoftwareGl ? null : new THREE.PMREMGenerator(renderer);
    const envRT = pmrem ? pmrem.fromScene(new RoomEnvironment(), 0.04) : null;
    if (envRT) {
      scene.environment = envRT.texture;
      scene.environmentIntensity = 0.65;
    }

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 400);
    camera.position.set(5.2, 2.8, 6.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 2.2;
    controls.maxDistance = 42;

    // Key solar light + cool space bounce + rim light for crisp metallic reflections
    const sunLight = new THREE.DirectionalLight('#FFF7ED', 2.85);
    sunLight.position.set(16, 8, 12);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight('#60A5FA', isSoftwareGl ? 1.35 : 0.95);
    rimLight.position.set(-12, -4, -10);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight('#7DD3FC', '#0F172A', isSoftwareGl ? 1.05 : 0.8);
    scene.add(hemiLight);

    // Starfield
    const starCount = 900;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 110 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: '#CBD5E1', size: 0.45, sizeAttenuation: true });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    const solarTex = createSolarCellTexture();

    // Planet & Orbit Group
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const planetRadius = 4.6;
    const planetGeo = new THREE.SphereGeometry(planetRadius, isSoftwareGl ? 32 : 52, isSoftwareGl ? 24 : 36);
    let planetTex = createPlanetTexture(propsRef.current.evaluation.orbit.targetBody);
    const planetMat = new THREE.MeshStandardMaterial({
      map: planetTex,
      roughness: 0.92,
      metalness: 0.04,
    });
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    worldGroup.add(planetMesh);

    const atmoGeo = new THREE.SphereGeometry(planetRadius * 1.035, 32, 24);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: '#38BDF8',
      transparent: true,
      opacity: 0.14,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    worldGroup.add(atmoMesh);

    // Orbit Ring, Ascent Trajectory Spline, Launch Pad & Karman Space-Exit Gate
    const orbitGroup = new THREE.Group();
    worldGroup.add(orbitGroup);
    let orbitLine: THREE.LineLoop | null = null;
    let plannedAscentLine: THREE.Line | null = null;
    let flownAscentLine: THREE.Line | null = null;
    let flownPosAttr: THREE.BufferAttribute | null = null;
    const MAX_FLOWN_POINTS = 92;
    let ascentCurve: THREE.CatmullRomCurve3 | null = null;
    let ascentSamplePoints: THREE.Vector3[] = [];
    let lastCurveOrbitRadius = -1;
    let orbitRadius = 7.4;

    // Launch Pad & Umbilical Clamp Towers (placed on planet surface at P0 of ascent trajectory)
    const launchPadGroup = new THREE.Group();
    const padDeck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.72, 0.18, 16),
      new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.75, roughness: 0.35 })
    );
    const padTowerMat = new THREE.MeshStandardMaterial({ color: '#94A3B8', metalness: 0.7, roughness: 0.35 });
    const towerLeft = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.95, 0.11), padTowerMat);
    towerLeft.position.set(-0.38, 0.48, 0);
    const towerRight = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.95, 0.11), padTowerMat);
    towerRight.position.set(0.38, 0.48, 0);
    const padBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      new THREE.MeshBasicMaterial({ color: '#F59E0B' })
    );
    padBeacon.position.set(0, 0.98, 0.25);
    const padSmokeMat = new THREE.MeshBasicMaterial({
      color: '#CBD5E1',
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const padSmoke = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.26, 10, 22), padSmokeMat);
    padSmoke.rotation.x = Math.PI / 2;
    padSmoke.position.y = 0.08;
    padSmoke.visible = false;
    launchPadGroup.add(padDeck, towerLeft, towerRight, padBeacon, padSmoke);
    orbitGroup.add(launchPadGroup);

    // Karman Line (Space Exit Gate) marker ring encircling the ascent path
    const karmanGate = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.04, 10, 28),
      new THREE.MeshBasicMaterial({ color: '#38BDF8', transparent: true, opacity: 0.85 })
    );
    orbitGroup.add(karmanGate);

    // Ground RF Downlink Cone Beam
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#10B981',
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const beamMesh = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.8, 12, 1, true), beamMat);
    beamMesh.visible = false;
    worldGroup.add(beamMesh);

    // Interactive Mouse-Draggable Trajectory Maneuver Node
    const maneuverHandle = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#FBBF24' })
    );
    const maneuverHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.46, 0.62, 24),
      new THREE.MeshBasicMaterial({ color: '#38BDF8', side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    maneuverHandle.add(maneuverHalo);
    maneuverHandle.visible = false;
    orbitGroup.add(maneuverHandle);

    // Separate Spacecraft Anchor & Rocket Anchor for clean SECO satellite separation
    const craftAnchor = new THREE.Group();
    scene.add(craftAnchor);

    const rocketAnchor = new THREE.Group();
    scene.add(rocketAnchor);

    let builtCraft = buildProceduralSpacecraft(propsRef.current.evaluation, solarTex);
    craftAnchor.add(builtCraft.root);

    let rocketStack = buildRocketStack(propsRef.current.evaluation.launchVehicle.id);
    rocketAnchor.visible = false;
    rocketAnchor.add(rocketStack.rocket);

    let baseOrbitRadius = 7.4;

    const rebuildAscentTrajectory = (targetOrbitR: number) => {
      if (Math.abs(targetOrbitR - lastCurveOrbitRadius) < 0.01 && ascentCurve) return;
      lastCurveOrbitRadius = targetOrbitR;

      const ctrlPts = buildAscentControlPoints(planetRadius, targetOrbitR).map(
        (p) => new THREE.Vector3(p.x, p.y, p.z)
      );
      ascentCurve = new THREE.CatmullRomCurve3(ctrlPts, false, 'centripetal', 0.45);
      ascentSamplePoints = ascentCurve.getPoints(90);

      if (plannedAscentLine) {
        orbitGroup.remove(plannedAscentLine);
        plannedAscentLine.geometry.dispose();
        (plannedAscentLine.material as THREE.Material).dispose();
      }
      const plannedGeo = new THREE.BufferGeometry().setFromPoints(ascentSamplePoints);
      const plannedMat = new THREE.LineDashedMaterial({
        color: '#F59E0B',
        dashSize: 0.34,
        gapSize: 0.2,
        transparent: true,
        opacity: 0.75,
      });
      plannedAscentLine = new THREE.Line(plannedGeo, plannedMat);
      plannedAscentLine.computeLineDistances();
      orbitGroup.add(plannedAscentLine);

      if (!flownAscentLine) {
        const flownPositions = new Float32Array(MAX_FLOWN_POINTS * 3);
        const flownGeo = new THREE.BufferGeometry();
        flownPosAttr = new THREE.BufferAttribute(flownPositions, 3);
        flownGeo.setAttribute('position', flownPosAttr);
        flownGeo.setDrawRange(0, 0);
        const flownMat = new THREE.LineBasicMaterial({
          color: '#38BDF8',
          transparent: true,
          opacity: 0.95,
        });
        flownAscentLine = new THREE.Line(flownGeo, flownMat);
        flownAscentLine.frustumCulled = false;
        flownAscentLine.visible = false;
        orbitGroup.add(flownAscentLine);
      }

      // Position Launchpad flush on surface along outward radial normal at P0
      const p0 = ctrlPts[0];
      const padNormal = p0.clone().normalize();
      launchPadGroup.position.copy(p0);
      launchPadGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), padNormal);

      // Position Karman Line Space Exit Gate at ~65% along ascent curve
      const karmanPos = ascentCurve.getPointAt(0.65);
      const karmanTan = ascentCurve.getTangentAt(0.65).normalize();
      karmanGate.position.copy(karmanPos);
      karmanGate.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), karmanTan);
    };

    const rebuildOrbit = () => {
      const ev = propsRef.current.evaluation;
      const body = ev.orbit.targetBody;
      planetTex.dispose();
      planetTex = createPlanetTexture(body);
      planetMat.map = planetTex;
      planetMat.needsUpdate = true;

      atmoMesh.visible = body === 'earth' || body === 'mars';
      atmoMat.color.set(body === 'mars' ? '#F97316' : '#38BDF8');

      baseOrbitRadius =
        body === 'earth'
          ? 6.6 + Math.min(2.6, ev.orbit.altitudeKm / 350)
          : body === 'moon'
            ? 8.5
            : 7.8;
      orbitRadius = baseOrbitRadius;

      if (orbitLine) {
        orbitGroup.remove(orbitLine);
        orbitLine.geometry.dispose();
        (orbitLine.material as THREE.Material).dispose();
      }
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * orbitRadius, 0, Math.sin(a) * orbitRadius));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineBasicMaterial({ color: '#38BDF8', transparent: true, opacity: 0.55 });
      orbitLine = new THREE.LineLoop(lineGeo, lineMat);
      orbitGroup.rotation.set((ev.orbit.inclinationDeg * Math.PI) / 180, 0, 0.25);
      orbitGroup.add(orbitLine);
      lastCurveOrbitRadius = -1;
      rebuildAscentTrajectory(orbitRadius);
    };

    const rebuildSpacecraft = () => {
      craftAnchor.remove(builtCraft.root);
      builtCraft = buildProceduralSpacecraft(propsRef.current.evaluation, solarTex);
      craftAnchor.add(builtCraft.root);

      rocketAnchor.remove(rocketStack.rocket);
      rocketStack.hullTex.dispose();
      rocketStack = buildRocketStack(propsRef.current.evaluation.launchVehicle.id);
      rocketAnchor.add(rocketStack.rocket);
    };

    sceneControlsRef.current = { rebuildOrbit, rebuildSpacecraft };
    rebuildOrbit();

    // Mouse Raycaster for dragging the 3D Orbital Trajectory Maneuver Node directly
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let draggingNode = false;
    let lastDragX = 0;
    let lastDragY = 0;

    const updateNdc = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!maneuverHandle.visible) return;
      updateNdc(e);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObject(maneuverHandle, true);
      if (hits.length > 0) {
        draggingNode = true;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
        controls.enabled = false;
        renderer.domElement.style.cursor = 'grabbing';
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (draggingNode) {
        const dx = e.clientX - lastDragX;
        const dy = e.clientY - lastDragY;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
        propsRef.current.onTrajectoryDrag?.(dx * 1.8, -dy * 0.22);
        return;
      }
      if (!maneuverHandle.visible) {
        renderer.domElement.style.cursor = 'grab';
        return;
      }
      updateNdc(e);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObject(maneuverHandle, true);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    const onPointerUp = () => {
      if (draggingNode) {
        draggingNode = false;
        controls.enabled = true;
        renderer.domElement.style.cursor = 'grab';
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      const w = container.clientWidth || 1280;
      const h = container.clientHeight || 720;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let rafId = 0;
    let timerId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let smoothExplode = 0;
    let smoothWingAngle = 0;
    let titleOrbitAngle = 0;
    let manualCadPitch = 0.15;
    let manualCadYaw = 0.4;
    let manualCadRoll = 0.06;
    const camSpherical = new THREE.Spherical();
    const camOffset = new THREE.Vector3();
    const radialClampVec = new THREE.Vector3();
    const scratchCurvePosLocal = new THREE.Vector3();
    const scratchCurveTanLocal = new THREE.Vector3();
    const scratchCurvePosWorld = new THREE.Vector3();
    const scratchCurveTanWorld = new THREE.Vector3();
    const scratchOrbitPt = new THREE.Vector3();
    const scratchNadirMat = new THREE.Matrix4();
    const scratchNadirQuat = new THREE.Quaternion();
    const scratchOutward = new THREE.Vector3();
    const scratchSideAxis = new THREE.Vector3();
    const scratchTangent = new THREE.Vector3();
    const scratchChaseCam = new THREE.Vector3();
    const scratchChaseLook = new THREE.Vector3();
    const scratchCamFwd = new THREE.Vector3();
    const scratchCamRight = new THREE.Vector3();
    const upY = new THREE.Vector3(0, 1, 0);

    const targetCamPos = new THREE.Vector3(5.2, 2.8, 6.2);
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    let lastPresetKey = '';
    let userAdjustedCamera = false;
    let orbitCamTransitionRemaining = 0;
    let lastStarterPhase: string = '';
    let lastStarterProgress = 0;

    const onControlsStart = () => {
      userAdjustedCamera = true;
      orbitCamTransitionRemaining = 0;
    };
    controls.addEventListener('start', onControlsStart);

    const updateFlownAscentTrail = (p: number) => {
      if (!flownAscentLine || !flownPosAttr || !ascentCurve || ascentSamplePoints.length < 2) return;
      flownAscentLine.visible = true;
      const sampleCount = Math.min(MAX_FLOWN_POINTS - 1, Math.max(1, Math.round(p * (ascentSamplePoints.length - 1)) + 1));
      const arr = flownPosAttr.array as Float32Array;
      for (let i = 0; i < sampleCount; i++) {
        const pt = ascentSamplePoints[i];
        arr[i * 3] = pt.x;
        arr[i * 3 + 1] = pt.y;
        arr[i * 3 + 2] = pt.z;
      }
      ascentCurve.getPointAt(p, scratchCurvePosLocal);
      arr[sampleCount * 3] = scratchCurvePosLocal.x;
      arr[sampleCount * 3 + 1] = scratchCurvePosLocal.y;
      arr[sampleCount * 3 + 2] = scratchCurvePosLocal.z;
      flownPosAttr.needsUpdate = true;
      flownAscentLine.geometry.setDrawRange(0, sampleCount + 1);
      (flownAscentLine.material as THREE.LineBasicMaterial).opacity = 0.95;
    };

    const renderRocketLaunchFrame = (
      pRaw: number,
      nowMs: number,
      rocketScale: number,
      craftLaunchScale: number,
      craftOrbitScale: number,
      worldCenter: THREE.Vector3
    ) => {
      if (!ascentCurve) return;
      const p = Math.max(0.001, Math.min(1, pRaw));
      updateFlownAscentTrail(p);

      const clampRetract = Math.min(1, p / 0.08);
      towerLeft.rotation.z = clampRetract * 0.42;
      towerRight.rotation.z = -clampRetract * 0.42;
      if (p < 0.2) {
        padSmoke.visible = true;
        const smokeT = p / 0.2;
        padSmoke.scale.setScalar(1 + smokeT * 2.8);
        padSmokeMat.opacity = Math.max(0, 0.55 * (1 - smokeT));
      } else {
        padSmoke.visible = false;
      }

      ascentCurve.getPointAt(p, scratchCurvePosLocal);
      ascentCurve.getTangentAt(p, scratchCurveTanLocal).normalize();
      scratchCurvePosWorld.copy(scratchCurvePosLocal).applyEuler(orbitGroup.rotation).add(worldCenter);
      scratchCurveTanWorld.copy(scratchCurveTanLocal).applyEuler(orbitGroup.rotation).normalize();

      rocketAnchor.visible = true;
      rocketAnchor.scale.setScalar(rocketScale);
      rocketAnchor.quaternion.setFromUnitVectors(upY, scratchCurveTanWorld);
      rocketAnchor.rotateY(p * 0.7);

      if (p < 0.9) {
        rocketAnchor.position.copy(scratchCurvePosWorld);
      } else {
        const sepSat = (p - 0.9) / 0.1;
        rocketAnchor.position.copy(scratchCurvePosWorld).addScaledVector(scratchCurveTanWorld, -(0.9 + sepSat * 2.4));
      }

      if (p < 0.56) {
        rocketStack.firstStage.visible = true;
        rocketStack.firstStage.position.set(0, 0, 0);
        rocketStack.firstStage.rotation.set(0, 0, 0);
        rocketStack.stage1Flame.visible = true;
        rocketStack.stage1Flame.scale.set(1, 0.85 + Math.sin(nowMs * 0.05) * 0.22, 1);
        rocketStack.stage2Flame.visible = false;
      } else {
        const sep1 = Math.min(1, (p - 0.56) / 0.24);
        rocketStack.firstStage.visible = p < 0.82;
        rocketStack.firstStage.position.set(-sep1 * 0.85, -sep1 * 5.2, sep1 * 0.45);
        rocketStack.firstStage.rotation.set(sep1 * 0.4, 0, sep1 * 1.15);
        rocketStack.stage1Flame.visible = false;

        rocketStack.stage2Flame.visible = p < 0.9;
        rocketStack.stage2Flame.scale.set(1, 0.82 + Math.cos(nowMs * 0.06) * 0.22, 1);
      }

      if (p < 0.72) {
        rocketStack.fairingLeft.visible = true;
        rocketStack.fairingRight.visible = true;
        rocketStack.fairingLeft.position.set(0, 1.15, 0);
        rocketStack.fairingLeft.rotation.set(0, 0, 0);
        rocketStack.fairingRight.position.set(0, 1.15, 0);
        rocketStack.fairingRight.rotation.set(0, 0, 0);
        builtCraft.root.visible = false;
      } else {
        const sepF = Math.min(1, (p - 0.72) / 0.18);
        const showFairing = p < 0.92;
        rocketStack.fairingLeft.visible = showFairing;
        rocketStack.fairingRight.visible = showFairing;
        rocketStack.fairingLeft.position.set(-sepF * 2.1, 1.15 - sepF * 1.6, 0);
        rocketStack.fairingLeft.rotation.set(0, 0, sepF * 1.25);
        rocketStack.fairingRight.position.set(sepF * 2.1, 1.15 - sepF * 1.6, 0);
        rocketStack.fairingRight.rotation.set(0, 0, -sepF * 1.25);

        builtCraft.root.visible = true;
        if (p < 0.9) {
          craftAnchor.position.copy(scratchCurvePosWorld).addScaledVector(scratchCurveTanWorld, 0.78);
          craftAnchor.quaternion.copy(rocketAnchor.quaternion);
          craftAnchor.scale.setScalar(craftLaunchScale);
        } else {
          const sepSat = (p - 0.9) / 0.1;
          // Smooth position handoff toward P5 orbit insertion + smooth quaternion slerp to nadir orientation
          craftAnchor.position
            .copy(scratchCurvePosWorld)
            .addScaledVector(scratchCurveTanWorld, 0.78 * (1 - sepSat));
          craftAnchor.scale.setScalar(THREE.MathUtils.lerp(craftLaunchScale, craftOrbitScale, sepSat));
          scratchNadirMat.lookAt(craftAnchor.position, worldCenter, upY);
          scratchNadirQuat.setFromRotationMatrix(scratchNadirMat);
          craftAnchor.quaternion.copy(rocketAnchor.quaternion).slerp(scratchNadirQuat, sepSat);
        }
      }
    };

    const renderDeployedOrbitFrame = (
      phase: 'deployment' | 'operations' | 'completed' | 'failed',
      deployProgress: number,
      orbitAngleRad: number,
      craftScale: number,
      worldCenter: THREE.Vector3
    ) => {
      padSmoke.visible = false;
      towerLeft.rotation.z = 0.42;
      towerRight.rotation.z = -0.42;
      const isDeploying = phase === 'deployment';
      if (isDeploying && deployProgress < 0.45 && ascentCurve) {
        const dT = deployProgress / 0.45;
        ascentCurve.getPointAt(1, scratchCurvePosLocal);
        ascentCurve.getTangentAt(1, scratchCurveTanLocal).normalize();
        scratchCurvePosWorld.copy(scratchCurvePosLocal).applyEuler(orbitGroup.rotation).add(worldCenter);
        scratchCurveTanWorld.copy(scratchCurveTanLocal).applyEuler(orbitGroup.rotation).normalize();

        rocketAnchor.visible = true;
        rocketStack.firstStage.visible = false;
        rocketStack.fairingLeft.visible = false;
        rocketStack.fairingRight.visible = false;
        rocketStack.stage2Flame.visible = false;
        rocketAnchor.position.copy(scratchCurvePosWorld).addScaledVector(scratchCurveTanWorld, -(3.3 + dT * 4.2));
        rocketAnchor.quaternion.setFromUnitVectors(upY, scratchCurveTanWorld);
      } else {
        rocketAnchor.visible = false;
      }

      if (flownAscentLine) {
        flownAscentLine.visible = isDeploying;
        if (isDeploying) {
          (flownAscentLine.material as THREE.LineBasicMaterial).opacity = Math.max(
            0.12,
            0.85 * (1 - deployProgress)
          );
        }
      }

      builtCraft.root.visible = true;
      scratchOrbitPt
        .set(Math.cos(orbitAngleRad) * orbitRadius, 0, Math.sin(orbitAngleRad) * orbitRadius)
        .applyEuler(orbitGroup.rotation);
      craftAnchor.position.copy(worldCenter).add(scratchOrbitPt);
      craftAnchor.scale.setScalar(craftScale);
      craftAnchor.lookAt(worldCenter);
    };

    const afterDraw = (fn: () => void) => {
      if (isSoftwareGl) {
        timerId = window.setTimeout(fn, 90);
      } else {
        rafId = window.requestAnimationFrame(fn);
      }
    };

    const tick = (nowInput?: number) => {
      if (disposed) return;
      const now = typeof nowInput === 'number' ? nowInput : performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const {
        mode: curMode,
        viewPreset: curPreset,
        explodedAmount: curExplode,
        simState: curSim,
        evaluation: curEval,
        flightInputRef: curFlightRef,
        introTelemetryRef: curIntroRef,
        previewTrajectory: curPreview,
      } = propsRef.current;
      const fi = curFlightRef?.current;
      const curIntro = curIntroRef?.current ?? null;

      planetMesh.rotation.y += dt * 0.045;
      stars.rotation.y += dt * 0.003;

      // Dynamic orbit radius & inclination from live maneuvers or workbench trajectory drag
      const altOffset = curMode === 'simulation' && curSim ? curSim.altitudeOffsetKm : curPreview?.altKm ?? 0;
      const incOffset = curMode === 'simulation' && curSim ? curSim.inclinationOffsetDeg : curPreview?.incDeg ?? 0;
      const radiusScale = Math.max(0.75, Math.min(1.65, 1 + altOffset / 600));
      orbitRadius = baseOrbitRadius * radiusScale;
      if (orbitLine) {
        orbitLine.scale.setScalar(radiusScale);
      }
      if (curMode === 'starter' || curMode === 'intro') {
        orbitGroup.rotation.set(0.55, -0.85, 0.14);
      } else {
        orbitGroup.rotation.set(((curEval.orbit.inclinationDeg + incOffset) * Math.PI) / 180, 0, 0.25);
      }
      rebuildAscentTrajectory(orbitRadius);

      // Update maneuver handle visibility & placement on the orbit
      const showHandle =
        (curMode === 'workbench' && curPreset === 'orbit') ||
        (curMode === 'simulation' && curSim?.phase === 'operations');
      maneuverHandle.visible = showHandle;
      if (showHandle) {
        const handleAngle = curMode === 'simulation' && curSim ? curSim.orbitAngleRad + 0.6 : 0.85;
        maneuverHandle.position.set(Math.cos(handleAngle) * orbitRadius, 0, Math.sin(handleAngle) * orbitRadius);
        maneuverHalo.lookAt(camera.position);
      }

      // Exploded CAD view interpolation
      const targetExplode = curMode === 'workbench' && curPreset === 'assembly' ? curExplode : 0;
      smoothExplode = THREE.MathUtils.damp(smoothExplode, targetExplode, 7, dt);
      for (const part of builtCraft.explodedParts) {
        part.obj.position.lerpVectors(
          part.basePos,
          part.basePos.clone().add(part.explodeOffset),
          smoothExplode
        );
      }

      // Solar wing fold during rocket ascent / deployment
      const activePhase =
        curMode === 'simulation' && curSim
          ? curSim
          : (curMode === 'starter' || curMode === 'intro') && curIntro
            ? curIntro
            : null;
      const deployRatio = activePhase
        ? activePhase.phase === 'launch'
          ? 0
          : activePhase.phase === 'deployment'
            ? activePhase.deployProgress
            : 1
        : 1;
      const targetFold = (1 - deployRatio) * (Math.PI * 0.46);
      smoothWingAngle = THREE.MathUtils.damp(smoothWingAngle, targetFold, 6, dt);
      if (builtCraft.leftWingPivot) builtCraft.leftWingPivot.rotation.z = -smoothWingAngle;
      if (builtCraft.rightWingPivot) builtCraft.rightWingPivot.rotation.z = smoothWingAngle;

      // Thruster plume glow during live orbital burns
      if (curMode === 'simulation' && curSim && curSim.activeThrusterDir !== 'none') {
        builtCraft.thrusterPlume.visible = true;
        const plumeMat = builtCraft.thrusterPlume.material as THREE.MeshBasicMaterial;
        plumeMat.color.set(
          curSim.activeThrusterDir === 'prograde'
            ? '#F59E0B'
            : curSim.activeThrusterDir === 'retrograde'
              ? '#38BDF8'
              : '#10B981'
        );
        builtCraft.thrusterPlume.scale.set(1, 0.75 + Math.sin(now * 0.05) * 0.3, 1);
      } else {
        builtCraft.thrusterPlume.visible = false;
      }

      // Trajectory markers visibility: show planned surface->space trajectory in Orbit View, Intro Launch, & Ascent/Deploy
      const showTrajectoryOverlay =
        (curMode === 'workbench' && curPreset === 'orbit') ||
        ((curMode === 'starter' || curMode === 'intro') && Boolean(curIntro)) ||
        (curMode === 'simulation' && (curSim?.phase === 'launch' || curSim?.phase === 'deployment'));
      launchPadGroup.visible = showTrajectoryOverlay;
      karmanGate.visible = showTrajectoryOverlay;
      if (plannedAscentLine) plannedAscentLine.visible = showTrajectoryOverlay;

      // Positioning & Phase Animation
      if (curMode === 'starter') {
        worldGroup.visible = true;
        worldGroup.position.set(0, 0, 0);
        beamMesh.visible = false;

        if (curIntro && ascentCurve) {
          if (curIntro.phase === 'launch') {
            renderRocketLaunchFrame(curIntro.launchProgress, now, 0.72, 0.58, 0.92, worldGroup.position);
          } else {
            renderDeployedOrbitFrame(
              curIntro.phase,
              curIntro.deployProgress,
              curIntro.orbitAngleRad,
              0.92,
              worldGroup.position
            );
          }

          // Detect Replay / mission preset reset -> snap/re-engage automatic tracking cleanly
          const replayedLaunch =
            curIntro.phase === 'launch' &&
            (lastStarterPhase !== 'launch' || curIntro.launchProgress < lastStarterProgress - 0.35);
          lastStarterPhase = curIntro.phase;
          lastStarterProgress = curIntro.launchProgress;

          // Target focus point: rocket during ascent -> deployed satellite upon release & orbit
          const focusObjPos =
            curIntro.phase === 'launch' && curIntro.launchProgress < 0.88
              ? scratchCurvePosWorld
              : craftAnchor.position;

          scratchOutward.copy(focusObjPos).sub(worldGroup.position).normalize();
          scratchSideAxis.set(0, 1, 0).applyEuler(orbitGroup.rotation).normalize();
          scratchTangent.crossVectors(scratchSideAxis, scratchOutward).normalize();

          const isLaunchPhase = curIntro.phase === 'launch';
          const outDist = isLaunchPhase ? 3.8 : 2.9;
          const sideDist = isLaunchPhase ? 2.35 : 1.8;
          const backDist = isLaunchPhase ? 3.3 : 2.5;

          scratchChaseCam
            .copy(focusObjPos)
            .addScaledVector(scratchOutward, outDist)
            .addScaledVector(scratchSideAxis, sideDist)
            .addScaledVector(scratchTangent, -backDist);

          scratchChaseLook.copy(focusObjPos).lerp(worldGroup.position, isLaunchPhase ? 0.08 : 0.04);

          // Shift framing slightly left in camera-space so rocket & satellite sit heroically in clear view above the compact panel
          scratchCamFwd.copy(scratchChaseLook).sub(scratchChaseCam).normalize();
          scratchCamRight.crossVectors(scratchCamFwd, upY);
          if (scratchCamRight.lengthSq() > 0.001) {
            scratchCamRight.normalize();
            const screenShift = isLaunchPhase ? -0.45 : -0.55;
            scratchChaseCam.addScaledVector(scratchCamRight, screenShift);
            scratchChaseLook.addScaledVector(scratchCamRight, screenShift);
          }

          if (lastPresetKey !== 'starter' || replayedLaunch) {
            camera.position.copy(scratchChaseCam);
            controls.target.copy(scratchChaseLook);
            lastPresetKey = 'starter';
            userAdjustedCamera = false;
            orbitCamTransitionRemaining = 0;
          } else if (!userAdjustedCamera) {
            const camDamp = isLaunchPhase ? 4.8 : 5.6;
            const lookDamp = isLaunchPhase ? 6.8 : 7.5;
            camera.position.x = THREE.MathUtils.damp(camera.position.x, scratchChaseCam.x, camDamp, dt);
            camera.position.y = THREE.MathUtils.damp(camera.position.y, scratchChaseCam.y, camDamp, dt);
            camera.position.z = THREE.MathUtils.damp(camera.position.z, scratchChaseCam.z, camDamp, dt);
            controls.target.x = THREE.MathUtils.damp(controls.target.x, scratchChaseLook.x, lookDamp, dt);
            controls.target.y = THREE.MathUtils.damp(controls.target.y, scratchChaseLook.y, lookDamp, dt);
            controls.target.z = THREE.MathUtils.damp(controls.target.z, scratchChaseLook.z, lookDamp, dt);
          }
        }
      } else if (curMode === 'intro') {
        worldGroup.visible = true;
        worldGroup.position.set(4.8, -0.25, -2.2);
        beamMesh.visible = false;

        if (curIntro && ascentCurve) {
          if (curIntro.phase === 'launch') {
            renderRocketLaunchFrame(curIntro.launchProgress, now, 0.56, 0.45, 0.65, worldGroup.position);
          } else {
            renderDeployedOrbitFrame(
              curIntro.phase,
              curIntro.deployProgress,
              curIntro.orbitAngleRad,
              0.65,
              worldGroup.position
            );
          }
        } else {
          titleOrbitAngle += dt * 0.28;
          scratchOrbitPt
            .set(Math.cos(titleOrbitAngle) * orbitRadius, 0, Math.sin(titleOrbitAngle) * orbitRadius)
            .applyEuler(orbitGroup.rotation);
          craftAnchor.position.copy(worldGroup.position).add(scratchOrbitPt);
          craftAnchor.scale.setScalar(0.65);
          craftAnchor.lookAt(worldGroup.position);
          rocketAnchor.visible = false;
          if (flownAscentLine) flownAscentLine.visible = false;
          padSmoke.visible = false;
          builtCraft.root.visible = true;
        }

        if (lastPresetKey !== 'intro') {
          targetCamPos.set(-2.2, 3.4, 17.5);
          targetLookAt.set(1.6, 0.0, -1.0);
          camera.position.copy(targetCamPos);
          controls.target.copy(targetLookAt);
          lastPresetKey = 'intro';
          userAdjustedCamera = false;
          orbitCamTransitionRemaining = 0;
        }
      } else if (curMode === 'title') {
        titleOrbitAngle += dt * 0.28;
        worldGroup.visible = true;
        worldGroup.position.set(1.2, -0.4, -2.5);
        scratchOrbitPt
          .set(Math.cos(titleOrbitAngle) * orbitRadius, 0, Math.sin(titleOrbitAngle) * orbitRadius)
          .applyEuler(orbitGroup.rotation);
        craftAnchor.position.copy(worldGroup.position).add(scratchOrbitPt);
        craftAnchor.scale.setScalar(0.65);
        craftAnchor.lookAt(worldGroup.position);
        rocketAnchor.visible = false;
        if (flownAscentLine) flownAscentLine.visible = false;
        padSmoke.visible = false;
        builtCraft.root.visible = true;
        beamMesh.visible = false;

        if (lastPresetKey !== 'title') {
          targetCamPos.set(-7.5, 3.2, 11.5);
          targetLookAt.set(0.6, 0, -1.2);
          camera.position.copy(targetCamPos);
          controls.target.copy(targetLookAt);
          lastPresetKey = 'title';
          userAdjustedCamera = false;
          orbitCamTransitionRemaining = 0;
        }
      } else if (curMode === 'workbench' && curPreset === 'assembly') {
        worldGroup.visible = false;
        beamMesh.visible = false;
        rocketAnchor.visible = false;
        if (flownAscentLine) flownAscentLine.visible = false;
        padSmoke.visible = false;
        builtCraft.root.visible = true;
        craftAnchor.position.set(0, 0, 0);
        craftAnchor.scale.setScalar(1.0);
        if (fi && (Math.abs(fi.pitch) > 0.02 || Math.abs(fi.yaw) > 0.02 || Math.abs(fi.roll) > 0.02)) {
          manualCadPitch = Math.max(-1.4, Math.min(1.4, manualCadPitch + fi.pitch * dt * 1.8));
          manualCadYaw += fi.yaw * dt * 2.0;
          manualCadRoll += fi.roll * dt * 2.0;
        } else {
          manualCadYaw += dt * 0.25;
        }
        craftAnchor.rotation.set(manualCadPitch, manualCadYaw, manualCadRoll);

        if (lastPresetKey !== 'workbench-assembly') {
          targetCamPos.set(4.5, 2.2, 5.4);
          targetLookAt.set(0, 0, 0);
          camera.position.copy(targetCamPos);
          controls.target.copy(targetLookAt);
          lastPresetKey = 'workbench-assembly';
          userAdjustedCamera = false;
          orbitCamTransitionRemaining = 0;
        }
      } else if (curMode === 'workbench' && curPreset === 'orbit') {
        titleOrbitAngle += dt * 0.4;
        worldGroup.visible = true;
        worldGroup.position.set(0, 0, 0);
        scratchOrbitPt
          .set(Math.cos(titleOrbitAngle) * orbitRadius, 0, Math.sin(titleOrbitAngle) * orbitRadius)
          .applyEuler(orbitGroup.rotation);
        craftAnchor.position.copy(scratchOrbitPt);
        craftAnchor.scale.setScalar(0.58);
        craftAnchor.lookAt(worldGroup.position);
        rocketAnchor.visible = false;
        if (flownAscentLine) flownAscentLine.visible = false;
        padSmoke.visible = false;
        towerLeft.rotation.z = 0;
        towerRight.rotation.z = 0;
        builtCraft.root.visible = true;
        beamMesh.visible = false;

        if (lastPresetKey !== 'workbench-orbit') {
          targetCamPos.set(1.5, 7.2, 16.2);
          targetLookAt.set(0, 0, 0);
          camera.position.copy(targetCamPos);
          controls.target.copy(targetLookAt);
          lastPresetKey = 'workbench-orbit';
          userAdjustedCamera = false;
          orbitCamTransitionRemaining = 0;
        }
      } else if (curMode === 'simulation' && curSim && ascentCurve) {
        worldGroup.visible = true;
        worldGroup.position.set(0, 0, 0);
        beamMesh.visible = false;

        if (curSim.phase === 'launch') {
          renderRocketLaunchFrame(curSim.launchProgress, now, 0.52, 0.42, 0.62, worldGroup.position);

          // Follow camera framing both the planet horizon/trajectory and ascending rocket
          if (lastPresetKey !== 'sim-launch') {
            targetCamPos.copy(scratchCurvePosWorld).add(new THREE.Vector3(3.4, 5.2, 10.2));
            camera.position.copy(targetCamPos);
            controls.target.copy(scratchCurvePosWorld);
            lastPresetKey = 'sim-launch';
            userAdjustedCamera = false;
            orbitCamTransitionRemaining = 0;
          } else if (!userAdjustedCamera) {
            const camFollow = scratchCurvePosWorld
              .clone()
              .multiplyScalar(0.55)
              .add(new THREE.Vector3(2.8, 5.8, 12.2));
            camera.position.lerp(camFollow, 0.035);
            const lookTarget = scratchCurvePosWorld.clone().lerp(worldGroup.position, 0.25);
            controls.target.lerp(lookTarget, 0.08);
          }
        } else {
          renderDeployedOrbitFrame(
            curSim.phase,
            curSim.deployProgress,
            curSim.orbitAngleRad,
            curPreset === 'assembly' ? 0.95 : 0.62,
            worldGroup.position
          );

          if (curSim.manualAttitudeActive) {
            craftAnchor.rotateX(curSim.craftPitchRad);
            craftAnchor.rotateY(curSim.craftYawRad);
            craftAnchor.rotateZ(curSim.craftRollRad);
          }

          // Ground pass beam cone pointing from craft toward planet center
          if (curSim.inGroundPass && curEval.orbit.targetBody === 'earth') {
            beamMesh.visible = true;
            beamMesh.position.copy(scratchOrbitPt).multiplyScalar(0.75);
            beamMesh.lookAt(worldGroup.position);
            beamMesh.rotateX(Math.PI / 2);
          } else {
            beamMesh.visible = false;
          }

          if (curPreset === 'assembly') {
            const camFollow = scratchOrbitPt.clone().add(new THREE.Vector3(3.2, 1.5, 3.6));
            camera.position.lerp(camFollow, 0.08);
            controls.target.lerp(scratchOrbitPt, 0.14);
            lastPresetKey = 'sim-chase';
            orbitCamTransitionRemaining = 0;
          } else {
            if (lastPresetKey !== 'sim-orbit') {
              if (lastPresetKey === 'sim-launch') {
                // Smooth damped pullback from SECO release point -> full orbital overview (no camera jump!)
                orbitCamTransitionRemaining = 1.8;
                userAdjustedCamera = false;
              } else {
                targetCamPos.set(0, 7.2, 16.5);
                camera.position.copy(targetCamPos);
                controls.target.set(0, 0, 0);
                orbitCamTransitionRemaining = 0;
              }
              lastPresetKey = 'sim-orbit';
            }

            if (orbitCamTransitionRemaining > 0 && !userAdjustedCamera) {
              orbitCamTransitionRemaining = Math.max(0, orbitCamTransitionRemaining - dt);
              camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 2.8, dt);
              camera.position.y = THREE.MathUtils.damp(camera.position.y, 7.2, 2.8, dt);
              camera.position.z = THREE.MathUtils.damp(camera.position.z, 16.5, 2.8, dt);
              controls.target.x = THREE.MathUtils.damp(controls.target.x, 0, 3.5, dt);
              controls.target.y = THREE.MathUtils.damp(controls.target.y, 0, 3.5, dt);
              controls.target.z = THREE.MathUtils.damp(controls.target.z, 0, 3.5, dt);
            }
          }
        }
      }

      // Dynamic minimum zoom distance so zooming never clips inside or fills screen with blurry globe surface
      const isChaseCam =
        (curMode === 'starter' && Boolean(curIntro)) ||
        (curMode === 'simulation' && curSim?.phase !== 'launch' && curPreset === 'assembly');
      controls.minDistance = !worldGroup.visible ? 2.2 : isChaseCam ? 2.4 : planetRadius + 6.2;

      // PS4/PS5 Right Stick & Keyboard camera orbit/zoom control
      if (fi && (Math.abs(fi.cameraYaw) > 0.02 || Math.abs(fi.cameraPitch) > 0.02 || Math.abs(fi.cameraZoom) > 0.02)) {
        camOffset.copy(camera.position).sub(controls.target);
        camSpherical.setFromVector3(camOffset);
        camSpherical.theta -= fi.cameraYaw * dt * 1.9;
        camSpherical.phi = Math.max(0.15, Math.min(Math.PI - 0.15, camSpherical.phi + fi.cameraPitch * dt * 1.5));
        camSpherical.radius = Math.max(
          controls.minDistance,
          Math.min(controls.maxDistance, camSpherical.radius * (1 - fi.cameraZoom * dt * 1.4))
        );
        camOffset.setFromSpherical(camSpherical);
        camera.position.copy(controls.target).add(camOffset);
      }

      controls.update();

      // Radial surface barrier clamp: keep camera safely outside the planet atmosphere at all times
      if (worldGroup.visible) {
        const minSurfaceDist = isChaseCam ? planetRadius + 1.8 : planetRadius + 5.6;
        radialClampVec.copy(camera.position).sub(worldGroup.position);
        const distSq = radialClampVec.lengthSq();
        if (distSq < minSurfaceDist * minSurfaceDist) {
          if (distSq < 0.0001) {
            radialClampVec.set(0, 0, minSurfaceDist);
          } else {
            radialClampVec.setLength(minSurfaceDist);
          }
          camera.position.copy(worldGroup.position).add(radialClampVec);
        }
      }

      renderer.render(scene, camera);
      afterDraw(tick);
    };

    if (isSoftwareGl) {
      tick(performance.now());
    } else {
      rafId = window.requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      controls.removeEventListener('start', onControlsStart);
      controls.dispose();
      solarTex.dispose();
      planetTex.dispose();
      rocketStack.hullTex.dispose();
      planetGeo.dispose();
      planetMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      beamMesh.geometry.dispose();
      beamMat.dispose();
      padDeck.geometry.dispose();
      (padDeck.material as THREE.Material).dispose();
      towerLeft.geometry.dispose();
      towerRight.geometry.dispose();
      padTowerMat.dispose();
      padBeacon.geometry.dispose();
      (padBeacon.material as THREE.Material).dispose();
      padSmoke.geometry.dispose();
      padSmokeMat.dispose();
      karmanGate.geometry.dispose();
      (karmanGate.material as THREE.Material).dispose();
      if (plannedAscentLine) {
        plannedAscentLine.geometry.dispose();
        (plannedAscentLine.material as THREE.Material).dispose();
      }
      if (flownAscentLine) {
        flownAscentLine.geometry.dispose();
        (flownAscentLine.material as THREE.Material).dispose();
      }
      maneuverHandle.geometry.dispose();
      (maneuverHandle.material as THREE.Material).dispose();
      maneuverHalo.geometry.dispose();
      (maneuverHalo.material as THREE.Material).dispose();
      envRT?.dispose();
      pmrem?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full relative" aria-label="3D Spacecraft and Orbit Viewport" />;
};
