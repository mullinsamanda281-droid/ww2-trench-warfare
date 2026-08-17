// src/atmosphere/environment.js
// Overcast lighting, dense fog, soft shadows, drifting smoke haze.
import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import { mat } from '../geometry.js';

export function setupEnvironment(scene, renderer) {
  scene.background = new THREE.Color(PALETTE.fog);
  scene.fog = new THREE.FogExp2(PALETTE.fog, 0.011);

  // Overcast: strong ambient, weak directional (sun hidden behind clouds)
  const hemi = new THREE.HemisphereLight(0xB7BDC3, 0x4A443C, 0.95);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xC9CDD2, 0.7);
  sun.position.set(60, 90, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -85;
  sun.shadow.camera.right = 85;
  sun.shadow.camera.top = 85;
  sun.shadow.camera.bottom = -85;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  // Light smoke haze drifting over the killing ground
  const smoke = new THREE.Group();
  smoke.name = 'smoke-haze';
  const smokeMat = mat(PALETTE.smoke, { transparent: true, opacity: 0.07, depthWrite: false });
  const smokePuffs = [];
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(6 + i * 2, 2.5, 5 + i * 1.5), smokeMat);
    s.position.set(-40 + i * 11, 2 + (i % 3), -18 + (i % 5) * 9);
    s.rotation.y = i * 0.8;
    smoke.add(s);
    smokePuffs.push(s);
  }
  scene.add(smoke);

  return {
    sun,
    smokePuffs,
    update(dt, time) {
      // Slow drift
      for (let i = 0; i < smokePuffs.length; i++) {
        const s = smokePuffs[i];
        s.position.x += Math.sin(time * 0.05 + i * 2) * dt * 0.35;
        s.position.z += Math.cos(time * 0.04 + i * 3) * dt * 0.3;
      }
    },
  };
}

// Distant artillery flashes - subtle light pulses
export function createArtilleryFlashes(scene, sound) {
  const flash = new THREE.PointLight(0xFFE8C8, 0, 300, 1);
  flash.position.set(0, 30, -70);
  scene.add(flash);

  let nextAt = 2;
  return {
    update(dt, time) {
      nextAt -= dt;
      if (nextAt <= 0) {
        nextAt = 9 + Math.random() * 9;
        flash.intensity = 1.2 + Math.random() * 0.8;
        if (sound) sound.artillery();
      } else {
        flash.intensity *= 0.9;
      }
    },
  };
}