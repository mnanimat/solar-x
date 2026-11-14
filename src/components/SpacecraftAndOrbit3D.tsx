import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { CelestialBodyId } from '../engine/missionCatalog';
import type { DesignEvaluation, SimulationState } from '../engine/missionPhysics';
import type { FlightControlInput } from '../engine/flightControls';

export type ViewportCameraPreset = 'assembly' | 'orbit' | 'launch';

interface SpacecraftAndOrbit3DProps {
  mode: 'title' | 'workbench' | 'simulation';
  viewPreset: ViewportCameraPreset;
  explodedAmount: number; // 0..1 for CAD assembly inspection
  evaluation: DesignEvaluation;
  simState: SimulationState | null;
  flightInputRef?: React.MutableRefObject<FlightControlInput>;
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

function buildRocketStack(lvId: string): {
  rocket: THREE.Group;
  firstStage: THREE.Group;
  fairing: THREE.Group;
  flame: THREE.Mesh;
} {
  const rocket = new THREE.Group();
  const isHeavy = lvId === 'lv-sls' || lvId === 'lv-vulcan';
  const bodyRadius = isHeavy ? 0.52 : 0.34;

  const whiteMat = new THREE.MeshStandardMaterial({ color: '#E2E8F0', metalness: 0.25, roughness: 0.4 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: '#C2410C', metalness: 0.2, roughness: 0.55 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1E293B', metalness: 0.7, roughness: 0.35 });

  const firstStage = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyRadius, bodyRadius, 3.2, 20),
    lvId === 'lv-sls' ? orangeMat : whiteMat
  );
  core.position.y = -1.6;
  firstStage.add(core);

  if (isHeavy) {
    for (const sx of [-1, 1]) {
      const srb = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.7, 14), whiteMat);
      srb.position.set(sx * (bodyRadius + 0.22), -1.75, 0);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 14), whiteMat);
      cone.position.set(sx * (bodyRadius + 0.22), -0.18, 0);
      firstStage.add(srb, cone);
    }
  }
  const engineSkirt = new THREE.Mesh(new THREE.CylinderGeometry(bodyRadius * 0.9, bodyRadius * 1.05, 0.45, 16), darkMat);
  engineSkirt.position.y = -3.35;
  firstStage.add(engineSkirt);
  rocket.add(firstStage);

  const upperStage = new THREE.Mesh(new THREE.CylinderGeometry(bodyRadius * 0.95, bodyRadius * 0.95, 1.15, 20), darkMat);
  upperStage.position.y = 0.55;
  rocket.add(upperStage);

  const fairing = new THREE.Group();
  fairing.position.y = 1.65;
  const fairingCyl = new THREE.Mesh(new THREE.CylinderGeometry(bodyRadius * 1.04, bodyRadius * 1.04, 1.0, 20), whiteMat);
  const fairingNose = new THREE.Mesh(new THREE.ConeGeometry(bodyRadius * 1.04, 1.15, 20), whiteMat);
  fairingNose.position.y = 1.07;
  fairing.add(fairingCyl, fairingNose);
  rocket.add(fairing);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(bodyRadius * 0.85, 2.6, 16),
    new THREE.MeshBasicMaterial({
      color: '#F59E0B',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    })
  );
  flame.rotation.x = Math.PI;
  flame.position.y = -4.8;
  rocket.add(flame);

  return { rocket, firstStage, fairing, flame };
}

export const SpacecraftAndOrbit3D: React.FC<SpacecraftAndOrbit3DProps> = ({
  mode,
  viewPreset,
  explodedAmount,
  evaluation,
  simState,
  flightInputRef,
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

    const rimLight = new THREE.DirectionalLight('#38BDF8', isSoftwareGl ? 1.25 : 0.7);
    rimLight.position.set(-12, -4, -10);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight('#38BDF8', '#090D16', isSoftwareGl ? 0.95 : 0.6);
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

    // Orbit Ring
    const orbitGroup = new THREE.Group();
    worldGroup.add(orbitGroup);
    let orbitLine: THREE.LineLoop | null = null;
    let orbitRadius = 7.4;

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

    // Spacecraft & Launch Vehicle Containers
    const craftAnchor = new THREE.Group();
    scene.add(craftAnchor);

    let builtCraft = buildProceduralSpacecraft(propsRef.current.evaluation, solarTex);
    craftAnchor.add(builtCraft.root);

    let rocketStack = buildRocketStack(propsRef.current.evaluation.launchVehicle.id);
    rocketStack.rocket.visible = false;
    craftAnchor.add(rocketStack.rocket);

    let baseOrbitRadius = 7.4;

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
    };

    const rebuildSpacecraft = () => {
      craftAnchor.remove(builtCraft.root);
      builtCraft = buildProceduralSpacecraft(propsRef.current.evaluation, solarTex);
      craftAnchor.add(builtCraft.root);

      craftAnchor.remove(rocketStack.rocket);
      rocketStack = buildRocketStack(propsRef.current.evaluation.launchVehicle.id);
      rocketStack.rocket.visible = false;
      craftAnchor.add(rocketStack.rocket);
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

    const targetCamPos = new THREE.Vector3(5.2, 2.8, 6.2);
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    let lastPresetKey = '';

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
        previewTrajectory: curPreview,
      } = propsRef.current;
      const fi = curFlightRef?.current;

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
      orbitGroup.rotation.set(((curEval.orbit.inclinationDeg + incOffset) * Math.PI) / 180, 0, 0.25);

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
      const deployRatio =
        curMode === 'simulation' && curSim
          ? curSim.phase === 'launch'
            ? 0
            : curSim.phase === 'deployment'
              ? curSim.deployProgress
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

      // Positioning & Phase Animation
      if (curMode === 'title') {
        titleOrbitAngle += dt * 0.28;
        worldGroup.visible = true;
        worldGroup.position.set(1.2, -0.4, -2.5);
        const orbitPt = new THREE.Vector3(
          Math.cos(titleOrbitAngle) * orbitRadius,
          0,
          Math.sin(titleOrbitAngle) * orbitRadius
        ).applyEuler(orbitGroup.rotation);
        craftAnchor.position.copy(worldGroup.position).add(orbitPt);
        craftAnchor.scale.setScalar(0.65);
        craftAnchor.lookAt(worldGroup.position);
        rocketStack.rocket.visible = false;
        builtCraft.root.visible = true;
        beamMesh.visible = false;

        if (lastPresetKey !== 'title') {
          targetCamPos.set(-7.5, 3.2, 11.5);
          targetLookAt.set(0.6, 0, -1.2);
          camera.position.copy(targetCamPos);
          controls.target.copy(targetLookAt);
          lastPresetKey = 'title';
        }
      } else if (curMode === 'workbench' && curPreset === 'assembly') {
        worldGroup.visible = false;
        beamMesh.visible = false;
        rocketStack.rocket.visible = false;
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
        }
      } else if (curMode === 'workbench' && curPreset === 'orbit') {
        titleOrbitAngle += dt * 0.4;
        worldGroup.visible = true;
        worldGroup.position.set(0, 0, 0);
        const orbitPt = new THREE.Vector3(
          Math.cos(titleOrbitAngle) * orbitRadius,
          0,
          Math.sin(titleOrbitAngle) * orbitRadius
        ).applyEuler(orbitGroup.rotation);
        craftAnchor.position.copy(orbitPt);
        craftAnchor.scale.setScalar(0.58);
        craftAnchor.lookAt(0, 0, 0);
        rocketStack.rocket.visible = false;
        builtCraft.root.visible = true;
        beamMesh.visible = false;

        if (lastPresetKey !== 'workbench-orbit') {
          targetCamPos.set(0, 7.5, 16.5);
          targetLookAt.set(0, 0, 0);
          camera.position.copy(targetCamPos);
          controls.target.copy(targetLookAt);
          lastPresetKey = 'workbench-orbit';
        }
      } else if (curMode === 'simulation' && curSim) {
        worldGroup.visible = true;
        worldGroup.position.set(0, 0, 0);

        if (curSim.phase === 'launch') {
          const p = curSim.launchProgress;
          rocketStack.rocket.visible = true;
          builtCraft.root.visible = p > 0.78;
          rocketStack.firstStage.visible = p < 0.62;
          rocketStack.fairing.visible = p < 0.78;
          rocketStack.flame.scale.set(1, 0.85 + Math.sin(now * 0.04) * 0.25, 1);

          const ascentR = planetRadius + 0.4 + p * (orbitRadius - planetRadius - 0.4);
          const ascentAngle = p * 0.65;
          craftAnchor.position.set(
            Math.cos(ascentAngle) * ascentR,
            Math.sin(ascentAngle) * ascentR * 0.5,
            0
          );
          craftAnchor.scale.setScalar(0.65);
          craftAnchor.rotation.set(0, 0, -ascentAngle - Math.PI * 0.35);
          beamMesh.visible = false;

          if (lastPresetKey !== 'sim-launch') {
            targetCamPos.set(8.5, 3.2, 10.5);
            targetLookAt.copy(craftAnchor.position);
            camera.position.copy(targetCamPos);
            lastPresetKey = 'sim-launch';
          }
          controls.target.lerp(craftAnchor.position, 0.12);
        } else {
          rocketStack.rocket.visible = false;
          builtCraft.root.visible = true;

          const angle = curSim.orbitAngleRad;
          const orbitPt = new THREE.Vector3(
            Math.cos(angle) * orbitRadius,
            0,
            Math.sin(angle) * orbitRadius
          ).applyEuler(orbitGroup.rotation);

          craftAnchor.position.copy(orbitPt);
          craftAnchor.scale.setScalar(curPreset === 'assembly' ? 0.95 : 0.62);
          craftAnchor.lookAt(0, 0, 0);
          if (curSim.manualAttitudeActive) {
            craftAnchor.rotateX(curSim.craftPitchRad);
            craftAnchor.rotateY(curSim.craftYawRad);
            craftAnchor.rotateZ(curSim.craftRollRad);
          }

          // Ground pass beam cone pointing from craft toward planet center
          if (curSim.inGroundPass && curEval.orbit.targetBody === 'earth') {
            beamMesh.visible = true;
            beamMesh.position.copy(orbitPt).multiplyScalar(0.75);
            beamMesh.lookAt(0, 0, 0);
            beamMesh.rotateX(Math.PI / 2);
          } else {
            beamMesh.visible = false;
          }

          if (curPreset === 'assembly') {
            const camFollow = orbitPt.clone().add(new THREE.Vector3(3.2, 1.5, 3.6));
            camera.position.lerp(camFollow, 0.08);
            controls.target.lerp(orbitPt, 0.14);
            lastPresetKey = 'sim-chase';
          } else if (lastPresetKey !== 'sim-orbit') {
            targetCamPos.set(0, 7.2, 16.5);
            camera.position.copy(targetCamPos);
            controls.target.set(0, 0, 0);
            lastPresetKey = 'sim-orbit';
          }
        }
      }

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
      controls.dispose();
      solarTex.dispose();
      planetTex.dispose();
      planetGeo.dispose();
      planetMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      beamMesh.geometry.dispose();
      beamMat.dispose();
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
