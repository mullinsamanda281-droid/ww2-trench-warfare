// src/geometry.js
// Low-poly geometry helpers: chamfered boxes, flat-shaded materials, stats.
import * as THREE from 'three';
import { withLuminance } from './palette.js';

// Chamfered box geometry (low-poly bevel, 20 tris per box).
// 6 face quads + 8 corner triangles - watertight, flat-shaded friendly.
export function chamferBox(w, h, d, bevel = 0.04) {
  const gw = w / 2, gh = h / 2, gd = d / 2;
  const b = Math.min(bevel, gw, gh, gd);
  const positions = [];
  const normals = [];
  const indices = [];
  const p = (x, y, z) => [x, y, z];

  const addQuad = (a, b0, c, d0, n) => {
    const base = positions.length / 3;
    positions.push(...a, ...b0, ...c, ...d0);
    for (let i = 0; i < 4; i++) normals.push(...n);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  addQuad(p(gw, gh - b, gd - b), p(gw, gh - b, -gd + b), p(gw, -gh + b, -gd + b), p(gw, -gh + b, gd - b), [1, 0, 0]);
  addQuad(p(-gw, gh - b, -gd + b), p(-gw, gh - b, gd - b), p(-gw, -gh + b, gd - b), p(-gw, -gh + b, -gd + b), [-1, 0, 0]);
  addQuad(p(gw - b, gh, gd - b), p(-gw + b, gh, gd - b), p(-gw + b, gh, -gd + b), p(gw - b, gh, -gd + b), [0, 1, 0]);
  addQuad(p(gw - b, -gh, -gd + b), p(-gw + b, -gh, -gd + b), p(-gw + b, -gh, gd - b), p(gw - b, -gh, gd - b), [0, -1, 0]);
  addQuad(p(gw - b, gh - b, gd), p(gw - b, -gh + b, gd), p(-gw + b, -gh + b, gd), p(-gw + b, gh - b, gd), [0, 0, 1]);
  addQuad(p(-gw + b, gh - b, -gd), p(-gw + b, -gh + b, -gd), p(gw - b, -gh + b, -gd), p(gw - b, gh - b, -gd), [0, 0, -1]);

  const dirs = [
    [1, 1, 1], [-1, 1, 1], [1, 1, -1], [-1, 1, -1],
    [1, -1, 1], [-1, -1, 1], [1, -1, -1], [-1, -1, -1],
  ];
  for (const [sx, sy, sz] of dirs) {
    const cx = sx * gw, cy = sy * gh, cz = sz * gd;
    const a = [cx, sy * (gh - b), sz * (gd - b)];
    const b0 = [sx * (gw - b), cy, sz * (gd - b)];
    const c0 = [sx * (gw - b), sy * (gh - b), cz];
    const n = [sx, sy, sz].map((v) => v / Math.sqrt(3));
    const base = positions.length / 3;
    positions.push(...a, ...b0, ...c0);
    normals.push(...n, ...n, ...n);
    indices.push(base, base + 1, base + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

// Flat-shaded lambert material - plastic/matte look, cheap on mobile.
// DoubleSide by default so winding never creates visible holes.
// Cached by color+opts so repeated props reuse materials (critical for draw-call/memory).
const matCache = new Map();
export function mat(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({
      color,
      flatShading: true,
      side: THREE.DoubleSide,
      ...opts,
    });
    matCache.set(key, m);
  }
  return m;
}

// Deterministic tiny color jitter for repeated props (sandbags, planks, crates).
// Quantized to 4 levels so material cache stays small.
export function jittered(baseHex, seed) {
  const rnd = Math.sin(seed * 12.9898) * 43758.5453;
  const level = Math.round(Math.abs(rnd % 1) * 3) / 3;
  return withLuminance(baseHex, 0.92 + level * 0.16);
}

// Count triangles across an object hierarchy
export function countTris(root) {
  let count = 0;
  root.traverse((obj) => {
    if (obj.isMesh && obj.geometry) {
      const idx = obj.geometry.index;
      count += idx ? idx.count / 3 : obj.geometry.attributes.position.count / 3;
    }
  });
  return count;
}

export function countMeshes(root) {
  let count = 0;
  root.traverse((obj) => { if (obj.isMesh) count++; });
  return count;
}

// Cheap n-sided cylinder for barrels, tubes, mortar
export function lowPolyCylinder(rTop, rBottom, height, segments = 6) {
  return new THREE.CylinderGeometry(rTop, rBottom, height, segments, 1, false);
}