// src/world/terrain.js
// Ground plane, mud patches, muddy puddles, shell craters with water.
import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import { mat, jittered } from '../geometry.js';

export const MAP_SIZE = 150; // 150m x 150m arena

export function buildTerrain(scene) {
  const group = new THREE.Group();
  group.name = 'terrain';

  // Base ground slab - solid mud, slightly below y=0 so trench floors sit at -2.5
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(MAP_SIZE, 2, MAP_SIZE),
    mat(PALETTE.muddyBrown)
  );
  ground.position.y = -1;
  ground.name = 'ground';
  group.add(ground);

  // Surface cap - flat-shaded plane with subtle color variation patches
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, 16, 16),
    mat(PALETTE.muddyBrown)
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.001;
  surface.name = 'ground-surface';
  group.add(surface);

  // Scatter darker mud patches (flattened boxes at ground level)
  const patchMat = mat(PALETTE.darkMud);
  const rng = mulberry32(1337);
  for (let i = 0; i < 120; i++) {
    const x = (rng() - 0.5) * (MAP_SIZE - 6);
    const z = (rng() - 0.5) * (MAP_SIZE - 6);
    const w = 1.5 + rng() * 4;
    const d = 1.5 + rng() * 4;
    const patch = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), patchMat);
    patch.position.set(x, 0.03, z);
    patch.rotation.y = rng() * Math.PI;
    group.add(patch);
  }

  // Muddy puddles - shallow dark discs with slightly glossy water
  const puddleMat = mat(PALETTE.waterDark, { transparent: true, opacity: 0.75 });
  for (let i = 0; i < 40; i++) {
    const x = (rng() - 0.5) * (MAP_SIZE - 10);
    const z = (rng() - 0.5) * (MAP_SIZE - 10);
    const r = 0.4 + rng() * 1.2;
    const puddle = new THREE.Mesh(
      new THREE.CircleGeometry(r, 6),
      puddleMat
    );
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(x, 0.035, z);
    group.add(puddle);
  }

  // Shell craters with water - shallow bowl approximation: dark disc + rim + water disc
  const craterRims = [];
  const rimMat = mat(PALETTE.darkMud);
  const waterMat = mat(PALETTE.water, { transparent: true, opacity: 0.8 });
  const craterSpots = [
    [-12, 4], [-4, 8], [8, -6], [-18, -14], [14, 12], [-2, -2], [20, -18], [-24, 2],
    [6, 18], [-16, 16], [22, 4], [-8, -20],
  ];
  for (const [x, z] of craterSpots) {
    const r = 2.2 + rng() * 1.8;
    const rim = new THREE.Mesh(new THREE.BoxGeometry(r * 2.4, 0.18, r * 2.4), rimMat);
    rim.position.set(x, -0.02, z);
    group.add(rim);
    const water = new THREE.Mesh(new THREE.CircleGeometry(r * 0.75, 8), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, 0.02, z);
    group.add(water);
    craterRims.push({ x, z, r });
  }

  return { group, craterRims };
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}