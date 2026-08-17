// src/world/noMansLand.js
// No Man's Land hazards: X-shaped tank traps, barbed wire rolls, dead leafless trees.
import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import { jittered } from '../geometry.js';
import { mat, chamferBox, lowPolyCylinder } from '../geometry.js';

const addBox = (g, w, h, d, color, x, y, z, opts = {}) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y, z);
  if (opts.rx) mesh.rotation.x = opts.rx;
  if (opts.ry) mesh.rotation.y = opts.ry;
  if (opts.rz) mesh.rotation.z = opts.rz;
  g.add(mesh);
  return mesh;
};

// Czech hedgehog: 3 steel beams crossed at ~90 degrees
export function buildTankTrap() {
  const g = new THREE.Group();
  const beamMat = mat(jittered(PALETTE.steelDark, 5));
  const beam = (rx, ry) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.12, 0.12), beamMat);
    m.rotation.x = rx;
    m.rotation.y = ry;
    m.position.y = 1.0;
    g.add(m);
  };
  beam(0, 0);                      // vertical
  beam(Math.PI / 2, 0);            // horizontal along z... rotate to form X
  beam(Math.PI / 4, 0);
  // base feet
  addBox(g, 0.4, 0.4, 0.4, PALETTE.darkMud, 0.6, 0.2, 0.6);
  addBox(g, 0.4, 0.4, 0.4, PALETTE.darkMud, -0.6, 0.2, -0.6);
  return g;
}

// Barbed wire roll: short cylinder with cross rings
export function buildWireRoll() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    lowPolyCylinder(0.32, 0.32, 1.5, 6),
    mat(jittered(PALETTE.steel, 3))
  );
  m.rotation.z = Math.PI / 2;
  g.add(m);
  const ringMat = mat(PALETTE.steelDark);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      lowPolyCylinder(0.33, 0.33, 0.06, 6),
      ringMat
    );
    ring.rotation.z = Math.PI / 2;
    ring.position.x = -0.6 + i * 0.6;
    g.add(ring);
  }
  return g;
}

// Dead leafless tree: trunk + 2-3 branch boxes
export function buildDeadTree(seed) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.6, 0.34), mat(jittered(PALETTE.woodDark, seed)));
  trunk.position.y = 1.3;
  g.add(trunk);
  const branchMat = mat(jittered(PALETTE.woodDark, seed + 1));
  const branch = (len, ry, y, tilt) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.12), branchMat);
    b.position.y = y;
    b.rotation.y = ry;
    b.rotation.z = tilt;
    g.add(b);
  };
  branch(1.2, 0.6, 2.1, 0.5);
  branch(0.9, 2.2, 2.3, 0.7);
  branch(0.7, 3.9, 1.9, -0.4);
  branch(0.5, 1.4, 2.5, 0.9);
  return g;
}

export function buildNoMansLand(group, opts = {}) {
  const sub = new THREE.Group();
  sub.name = 'no-mans-land';

  const { minZ, maxZ } = opts;

  // Tank traps scattered across the killing ground
  const trapSpots = [[-38, 0], [-30, -6], [-22, 8], [-14, -12], [-4, 4], [6, -8], [16, 10], [26, -4], [36, 6], [44, -10]];
  for (const [x, z] of trapSpots) {
    if (z < minZ + 1 || z > maxZ - 1) continue;
    const t = buildTankTrap();
    t.position.set(x, 0, z);
    t.rotation.y = (x * 0.7) % Math.PI;
    sub.add(t);
  }

  // Barbed wire: two rows in front of each trench + scattered coils
  const wireSpots = [];
  for (let x = -54; x <= 54; x += 7) {
    wireSpots.push([x + 2, minZ + 4], [x, maxZ - 4]);
  }
  for (const [x, z] of wireSpots) {
    const w = buildWireRoll();
    w.position.set(x, 0.32, z);
    w.rotation.y = Math.random() * Math.PI;
    sub.add(w);
  }
  const coilSpots = [[-26, -2], [10, 5], [34, -12], [-8, 14]];
  for (const [x, z] of coilSpots) {
    const w = buildWireRoll();
    w.position.set(x, 0.32, z);
    w.rotation.y = Math.random() * Math.PI;
    sub.add(w);
  }

  // Dead trees
  const treeSpots = [[-44, -8], [-34, 10], [-10, -16], [8, 12], [30, -14], [48, 2], [52, 12]];
  for (let i = 0; i < treeSpots.length; i++) {
    const [x, z] = treeSpots[i];
    if (z < minZ + 1 || z > maxZ - 1) continue;
    const t = buildDeadTree(i);
    t.position.set(x, 0, z);
    t.rotation.y = i * 1.1;
    sub.add(t);
  }

  group.add(sub);
  return sub;
}