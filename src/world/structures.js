// src/world/structures.js
// Bunkers, MG positions, mortar pit, ammo crates - the functional strongpoints.
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

// Sandbag emplacement: platform + 3-sided sandbag ring, gap facing No Man's Land
export function buildMgPosition(facing) {
  const g = new THREE.Group();
  // Platform
  addBox(g, 2.4, 0.35, 1.9, jittered(PALETTE.darkMud, 21), 0, 0.17, 0);
  // Sandbag ring (3 sides), gap at front (facing direction)
  const bagMat = mat(jittered(PALETTE.sandbagTan, 22));
  const bagDark = mat(jittered(PALETTE.sandbagDark, 23));
  const bag = (w, h, d, x, z, ry = 0) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Math.random() > 0.5 ? bagMat : bagDark);
    b.position.set(x, 0.55, z);
    b.rotation.y = ry;
    g.add(b);
  };
  // rear wall (facing = -1 means NML is -Z, so rear is +Z)
  bag(2.6, 0.5, 0.42, 0, -facing * 0.95);
  bag(0.42, 0.5, 1.9, -1.15, 0);
  bag(0.42, 0.5, 1.9, 1.15, 0);
  // extra loose bags
  bag(0.5, 0.4, 0.5, -0.5, -facing * 0.9, 0.4);
  bag(0.5, 0.4, 0.5, 0.7, -facing * 0.95, -0.3);

  // MG-42-ish blocky tripod machine gun
  const mg = new THREE.Group();
  addBox(mg, 0.14, 0.14, 0.9, PALETTE.steelDark, 0, 0.42, 0.05);
  addBox(mg, 0.18, 0.16, 0.5, PALETTE.steel, 0, 0.36, -0.25);
  addBox(mg, 0.06, 0.06, 0.4, PALETTE.steelDark, 0, 0.28, 0.1);
  // tripod legs
  const legMat = mat(PALETTE.steelDark);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), legMat);
    leg.position.set(side * 0.22, 0.25, -0.2);
    leg.rotation.z = side * 0.5;
    mg.add(leg);
  }
  const backLeg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), legMat);
  backLeg.position.set(0, 0.22, -0.42);
  backLeg.rotation.x = -0.6;
  mg.add(backLeg);
  mg.position.set(0, 0.35, facing * 0.35);
  mg.rotation.y = facing === 1 ? 0 : Math.PI;
  g.add(mg);

  return g;
}

// Allied corrugated steel bunker - hollow interior, half-sunk into the trench
// line. Doorway faces the trench (rear), firing slit faces NML (front).
// Local frame: +Z = toward the trench, -Z = toward No Man's Land.
export function buildSteelBunker(facing) {
  const g = new THREE.Group();
  const steelMat = mat(PALETTE.steel);
  const steelDarkMat = mat(PALETTE.steelDark);

  const W = 2.4;  // interior width (x)
  const D = 1.8;  // interior depth (z)
  const H = 2.2;  // wall height
  const hw = W / 2;
  const hd = D / 2;

  // Interior floor (top at y=0)
  addBox(g, W, 0.2, D, PALETTE.darkMud, 0, -0.1, 0);

  // Front wall (faces NML) with high firing slit: lower + upper bands
  addBox(g, W, 1.1, 0.25, PALETTE.steel, 0, 0.55, -hd);
  addBox(g, W, 0.85, 0.25, PALETTE.steel, 0, 1.9, -hd);
  // slit side jambs (visual depth)
  addBox(g, 0.2, 0.45, 0.25, PALETTE.steelDark, -hw / 2 + 0.3, 1.32, -hd + 0.06);
  addBox(g, 0.2, 0.45, 0.25, PALETTE.steelDark, hw / 2 - 0.3, 1.32, -hd + 0.06);

  // Rear wall (faces trench) with a 1.0m doorway gap
  const doorW = 1.0;
  const sideW = (W - doorW) / 2; // 0.7
  addBox(g, sideW, H, 0.25, PALETTE.steel, -(doorW / 2 + sideW / 2), H / 2, hd);
  addBox(g, sideW, H, 0.25, PALETTE.steel, doorW / 2 + sideW / 2, H / 2, hd);
  // Lintel above the door
  addBox(g, doorW, 0.5, 0.3, PALETTE.steelDark, 0, H - 0.25, hd);

  // Side walls
  addBox(g, 0.25, H, D, PALETTE.steel, -hw, H / 2, 0);
  addBox(g, 0.25, H, D, PALETTE.steel, hw, H / 2, 0);

  // Roof
  addBox(g, W + 0.5, 0.2, D + 0.5, PALETTE.steelDark, 0, H + 0.1, 0);

  // Corrugation bands on the exterior front
  for (let i = 0; i < 3; i++) {
    addBox(g, W, 0.06, 0.26, PALETTE.steelDark, 0, 0.5 + i * 0.5, -hd - 0.04);
  }

  // Interior props: bench + ammo crate in the corner
  const bench = new THREE.Mesh(chamferBox(0.8, 0.5, 0.4, 0.02), mat(PALETTE.woodDark));
  bench.position.set(hw - 0.55, 0.25, -hd + 0.35);
  g.add(bench);
  const crate = buildAmmoCrate(9);
  crate.position.set(-hw + 0.5, 0.25, -hd + 0.45);
  crate.rotation.y = -0.5;
  g.add(crate);

  // Dirt mound on top (half-buried look)
  const dirt = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 2.4), mat(jittered(PALETTE.darkMud, 30)));
  dirt.position.set(0.3, H + 0.32, 0);
  dirt.rotation.z = 0.08;
  g.add(dirt);

  return g;
}

// Axis concrete bunker entrance - archway frame + steps rising from the trench floor
// trenchDir: direction toward the trench line (+1/-1 in Z)
export function buildConcreteEntrance(trenchDir) {
  const g = new THREE.Group();
  const conc = mat(PALETTE.concrete);
  // Rear frame block (outer side, away from trench)
  addBox(g, 2.8, 2.4, 0.7, PALETTE.concrete, 0, 0.9, -trenchDir * 0.7);
  // Side pillars flanking the doorway
  const pillar = (x) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, 0.9), conc);
    p.position.set(x, 0.5, 0);
    g.add(p);
  };
  pillar(-1.05);
  pillar(1.05);
  // Lintel
  addBox(g, 2.6, 0.45, 0.9, PALETTE.concrete, 0, 1.55, 0);
  // Dark doorway opening
  addBox(g, 1.3, 1.9, 0.2, PALETTE.mudDark, 0, 0.7, -trenchDir * 0.05);
  // Steps ascending from the trench floor toward the doorway (top -1.9 near floor, -0.1 at door)
  for (let i = 0; i < 4; i++) {
    addBox(g, 2.0, 0.35, 0.5, PALETTE.concreteDark, 0, -0.275 - 0.6 * i, trenchDir * (0.6 + 0.3 * i));
  }
  // Sandbags flanking the entrance
  addBox(g, 0.9, 0.6, 0.8, jittered(PALETTE.sandbagDark, 31), -1.9, 0.3, -trenchDir * 0.4);
  addBox(g, 0.9, 0.6, 0.8, jittered(PALETTE.sandbagTan, 32), 1.9, 0.3, -trenchDir * 0.4);
  return g;
}

// Axis mortar pit: octagonal sandbag ring + mortar tube + shells
export function buildMortarPit() {
  const g = new THREE.Group();
  // Ring of sandbags (8 segments)
  const bagMat = mat(jittered(PALETTE.sandbagDark, 41));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bag = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.55), bagMat);
    bag.position.set(Math.cos(a) * 1.35, 0.27, Math.sin(a) * 1.35);
    bag.rotation.y = a + Math.PI / 8;
    g.add(bag);
  }
  // Second layer staggered
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    const bag = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.55), mat(jittered(PALETTE.sandbagTan, 42)));
    bag.position.set(Math.cos(a) * 1.3, 0.78, Math.sin(a) * 1.3);
    bag.rotation.y = a;
    g.add(bag);
  }
  // Floor disc
  const floor = new THREE.Mesh(lowPolyCylinder(1.15, 1.15, 0.15, 8), mat(PALETTE.darkMud));
  floor.position.y = 0.03;
  g.add(floor);
  // Mortar tube
  const tube = new THREE.Mesh(lowPolyCylinder(0.12, 0.15, 1.4, 6), mat(PALETTE.steelDark));
  tube.position.set(0, 0.8, 0);
  tube.rotation.x = -0.35;
  g.add(tube);
  // Baseplate
  const base = new THREE.Mesh(lowPolyCylinder(0.3, 0.34, 0.08, 6), mat(PALETTE.steel));
  base.position.y = 0.12;
  g.add(base);
  // Bipod
  const legMat = mat(PALETTE.steelDark);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.05), legMat);
    leg.position.set(side * 0.3, 0.35, 0.3);
    leg.rotation.z = -side * 0.4;
    g.add(leg);
  }
  // Shells on the ground
  for (let i = 0; i < 3; i++) {
    const shell = new THREE.Mesh(lowPolyCylinder(0.07, 0.07, 0.5, 6), mat(PALETTE.steel));
    shell.position.set(0.5 + i * 0.35, 0.25, 1.6);
    shell.rotation.x = Math.PI / 2;
    shell.rotation.z = 0.5;
    g.add(shell);
  }
  return g;
}

// Ammo crate: wooden box with metal banding
export function buildAmmoCrate(seed = 1) {
  const g = new THREE.Group();
  const crate = new THREE.Mesh(chamferBox(0.7, 0.5, 0.7, 0.03), mat(jittered(PALETTE.woodPlank, seed)));
  g.add(crate);
  const bandMat = mat(PALETTE.steelDark);
  const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.52, 0.08), bandMat);
  g.add(band1);
  const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.72), bandMat);
  g.add(band2);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.72), mat(jittered(PALETTE.woodDark, seed + 1)));
  lid.position.y = 0.28;
  g.add(lid);
  return g;
}

// Gas lantern hanging point / stand
export function buildLantern(seed) {
  const g = new THREE.Group();
  addBox(g, 0.14, 0.22, 0.14, PALETTE.steelDark, 0, 0, 0);
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.12, 0.1),
    mat(PALETTE.lanternGlow, { emissive: PALETTE.lanternGlow, emissiveIntensity: 0.9 })
  );
  glow.position.y = -0.02;
  g.add(glow);
  addBox(g, 0.05, 0.5, 0.05, PALETTE.steelDark, 0, 0.28, 0);
  return g;
}