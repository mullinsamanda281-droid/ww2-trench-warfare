// src/world/trenches.js
// Modular zig-zag trench line builder. Segments built in a local frame where
// +X = along the run, +Z = toward No Man's Land, Y = up.
import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import { jittered } from '../geometry.js';
import { mat } from '../geometry.js';

export const TRENCH_WIDTH = 2.6;
export const TRENCH_DEPTH = 2.5;
export const FIRE_STEP_HEIGHT = 1.45;
export const PARAPET_HEIGHT = 0.45;

const addBox = (group, w, h, d, color, x, y, z, opts = {}) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y, z);
  if (opts.rx) mesh.rotation.x = opts.rx;
  if (opts.ry) mesh.rotation.y = opts.ry;
  if (opts.rz) mesh.rotation.z = opts.rz;
  group.add(mesh);
  return mesh;
};

// Build a wall piece along local X from startX to endX (world-frame gap positions are
// converted by the caller into local coordinates before calling). baseY is the height
// of the box's bottom edge (default: trench floor, so walls rise to ground level).
const addWallPiece = (group, h, startX, endX, zPos, thickness, color, baseY = -TRENCH_DEPTH) => {
  if (endX - startX < 0.4) return;
  const len = endX - startX;
  addBox(group, len + thickness, h, thickness, color, (startX + endX) / 2, baseY + h / 2, zPos);
};

export function buildTrenchLine(opts) {
  const { points, facing, group, exits = [], rearGaps = [], side, isAllied } = opts;
  const sub = new THREE.Group();
  sub.name = `trench-${side}`;

  // Basis: local +Z maps to world facing direction (toward NML)
  for (let i = 0; i < points.length - 1; i++) {
    const A = points[i];
    const B = points[i + 1];
    const dx = B[0] - A[0];
    const dz = B[1] - A[1];
    const L = Math.hypot(dx, dz);
    const dir = new THREE.Vector3(dx / L, 0, dz / L);
    const front = new THREE.Vector3(0, 0, facing);
    const up = new THREE.Vector3(0, 1, 0);

    const seg = new THREE.Group();
    seg.name = `trench-segment-${i}`;
    const m = new THREE.Matrix4().makeBasis(dir, up, front);
    seg.quaternion.setFromRotationMatrix(m);
    seg.position.set((A[0] + B[0]) / 2, 0, (A[1] + B[1]) / 2);

    const halfL = L / 2;

    // Convert world positions to local X along the run
    const toLocalX = (wx, wz) => {
      const rel = new THREE.Vector3(wx - seg.position.x, 0, wz - seg.position.z);
      return rel.dot(dir);
    };

    // Floor (extend slightly past corners to seal seams)
    addBox(seg, TRENCH_WIDTH, 0.3, L + 0.8, jittered(PALETTE.darkMud, i + 1), 0, -TRENCH_DEPTH + 0.15, 0);

    // Rear wall (away from NML), split at rearGaps
    const rearGapLocs = rearGaps
      .map((g) => toLocalX(g[0], g[1]))
      .filter((x) => Math.abs(x) < halfL + 1)
      .sort((a, b) => a - b);
    let rearPieces = [[-halfL - 0.4, halfL + 0.4]];
    for (const gx of rearGapLocs) {
      const next = [];
      for (const [s, e] of rearPieces) {
        if (gx - 0.8 > s) next.push([s, gx - 0.8]);
        if (gx + 0.8 < e) next.push([gx + 0.8, e]);
      }
      rearPieces = next;
    }
    for (const [s, e] of rearPieces) {
      addWallPiece(seg, TRENCH_DEPTH, s, e, -(TRENCH_WIDTH / 2 - 0.15), 0.3, jittered(PALETTE.trenchGrey, i * 7 + 3));
    }

    // Front wall with parapet, split at exits
    const exitLocs = exits
      .map((e) => toLocalX(e[0], e[1]))
      .filter((x) => Math.abs(x) < halfL + 1)
      .sort((a, b) => a - b);
    let frontPieces = [[-halfL - 0.4, halfL + 0.4]];
    for (const gx of exitLocs) {
      const next = [];
      for (const [s, e] of frontPieces) {
        if (gx - 1.3 > s) next.push([s, gx - 1.3]);
        if (gx + 1.3 < e) next.push([gx + 1.3, e]);
      }
      frontPieces = next;
    }
    for (const [s, e] of frontPieces) {
      addWallPiece(seg, TRENCH_DEPTH, s, e, TRENCH_WIDTH / 2 - 0.15, 0.3, jittered(PALETTE.trenchGrey, i * 7 + 4));
    }

    // Parapet (sandbag mound on top of front wall), split at exits
    let parapetPieces = [[-halfL - 0.4, halfL + 0.4]];
    for (const gx of exitLocs) {
      const next = [];
      for (const [s, e] of parapetPieces) {
        if (gx - 1.2 > s) next.push([s, gx - 1.2]);
        if (gx + 1.2 < e) next.push([gx + 1.2, e]);
      }
      parapetPieces = next;
    }
    for (const [s, e] of parapetPieces) {
      // Parapet berm sits on top of the front wall (base at ground level 0),
      // so its top (0.45) hides a crouching soldier on the firing step below.
      addWallPiece(seg, PARAPET_HEIGHT, s, e, TRENCH_WIDTH / 2 + 0.28, 0.75, jittered(PALETTE.sandbagDark, i * 13 + 5), 0);
      addWallPiece(seg, PARAPET_HEIGHT - 0.18, s, e, TRENCH_WIDTH / 2 + 0.33, 0.75, jittered(PALETTE.sandbagTan, i * 13 + 6), 0);
    }

    // Firing step (front side, 1.45m above floor -> eye-level just clears parapet)
    addBox(seg, 0.55, FIRE_STEP_HEIGHT, L + 0.5, jittered(PALETTE.darkMud, i * 3 + 2), 0, -TRENCH_DEPTH + FIRE_STEP_HEIGHT / 2, TRENCH_WIDTH / 2 - 0.62);

    // Duckboard planks on floor
    const plankCount = Math.floor(L / 0.85);
    for (let p = 0; p < plankCount; p++) {
      const px = -halfL + 0.4 + p * 0.85;
      const isExitZone = exitLocs.some((gx) => Math.abs(px - gx) < 0.9);
      if (isExitZone) continue;
      addBox(seg, 0.34, 0.055, 1.4, jittered(PALETTE.duckboard, p + i * 31), px, -TRENCH_DEPTH + 0.03, (p % 2 === 0 ? 1 : -1) * 0.08, { ry: (p % 3) * 0.02 - 0.02 });
    }

    // Wooden support posts every ~3m + top beam on rear wall
    const postCount = Math.floor(L / 3);
    for (let p = 0; p <= postCount; p++) {
      const px = -halfL + 1.2 + p * 3;
      if (px > halfL - 0.5) break;
      addBox(seg, 0.11, TRENCH_DEPTH, 0.11, jittered(PALETTE.supportBeam, p * 17 + i), px, -TRENCH_DEPTH / 2, -(TRENCH_WIDTH / 2 - 0.42));
      addBox(seg, 0.11, 0.11, TRENCH_WIDTH - 0.5, jittered(PALETTE.supportBeam, p * 17 + i + 1), px, 0.05, 0);
    }

    // Over-the-top exits: sandbag steps ascending the front wall gap
    for (const gx of exitLocs) {
      addBox(seg, 0.7, 0.62, 0.42, jittered(PALETTE.sandbagTan, gx + 40), gx, -TRENCH_DEPTH + 0.31, TRENCH_WIDTH / 2 - 0.42);
      addBox(seg, 0.7, 0.62, 0.42, jittered(PALETTE.sandbagDark, gx + 41), gx, -TRENCH_DEPTH + 0.93, TRENCH_WIDTH / 2 - 0.3);
      addBox(seg, 0.7, 0.62, 0.42, jittered(PALETTE.sandbagTan, gx + 42), gx, -TRENCH_DEPTH + 1.55, TRENCH_WIDTH / 2 - 0.18);
      // exit lip outside the parapet
      addBox(seg, 1.7, 0.22, 0.7, jittered(PALETTE.sandbagDark, gx + 43), gx, 0.11, TRENCH_WIDTH / 2 + 0.95);
      // ladder leaning on rear wall
      const ladder = buildLadder(gx, -(TRENCH_WIDTH / 2 - 0.55), 0.3);
      seg.add(ladder);
    }

    sub.add(seg);
  }

  // Corner posts at every path point (seal wall seams at bends)
  for (const [px, pz] of points) {
    addBox(sub, 0.26, 3.1, 0.26, jittered(PALETTE.woodDark, px * 7 + 11), px, -1.45, pz - facing * 0.35, { ry: 0.4 });
  }

  // End caps: dead-end walls with sandbag top at both trench ends
  const first = points[0];
  const last = points[points.length - 1];
  const capEnds = [first, last];
  for (const [cx, cz] of capEnds) {
    addBox(sub, TRENCH_WIDTH + 0.7, TRENCH_DEPTH, 0.35, jittered(PALETTE.trenchGrey, cx * 3 + 9), cx, -TRENCH_DEPTH / 2, cz - facing * 0.1);
    addBox(sub, TRENCH_WIDTH + 0.7, 0.35, 0.7, jittered(PALETTE.sandbagDark, cx * 3 + 10), cx, 0.05, cz - facing * 0.1);
  }

  // Small ambient props along the trench
  addTrenchProps(sub, points, facing, isAllied);

  group.add(sub);
  return sub;
}

function buildLadder(x, z, tilt) {
  const g = new THREE.Group();
  addBox(g, 0.05, 0.06, 3.1, jittered(PALETTE.woodDark, x), -0.18, 1.35, 0, { rx: -tilt });
  addBox(g, 0.05, 0.06, 3.1, jittered(PALETTE.woodDark, x + 1), 0.18, 1.35, 0, { rx: -tilt });
  for (let r = 0; r < 7; r++) {
    addBox(g, 0.4, 0.05, 0.05, jittered(PALETTE.woodDark, r * 5 + x), 0, 0.45 + r * 0.42, 0, { rx: -tilt });
  }
  g.rotation.x = tilt;
  g.position.set(x, -TRENCH_DEPTH, z);
  return g;
}

function addTrenchProps(sub, points, facing, isAllied) {
  // Shovels stuck in mud
  const shovelSpots = points.length >= 5 ? [1, points.length - 2, Math.floor(points.length / 2)] : [0];
  for (const idx of shovelSpots) {
    const [x, z] = points[idx];
    const g = new THREE.Group();
    addBox(g, 0.07, 0.07, 1.1, PALETTE.woodPlank, 0, 0.55, 0, { rx: 0.12 });
    addBox(g, 0.16, 0.22, 0.05, PALETTE.steelDark, 0, -0.05, 0.06, { rx: 0.3 });
    g.position.set(x + 0.8, -TRENCH_DEPTH, z - facing * 0.5);
    g.rotation.y = idx * 0.9;
    sub.add(g);
  }

  // Helmets on parapet / duckboards
  const helmetSpots = [[0.4, 0.3], [0.7, -0.2], [0.2, -0.35]];
  let hc = 0;
  for (const [fx, fz] of helmetSpots) {
    const [x, z] = points[Math.min(points.length - 2, 2 + hc * 2)];
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      mat(jittered(isAllied ? PALETTE.helmGreen : PALETTE.helmGrey, hc + 1))
    );
    helm.position.set(x + fx * 3, -TRENCH_DEPTH + 0.16, z - facing * (1.3 + fz * 2));
    helm.rotation.z = 0.3 + hc * 0.2;
    sub.add(helm);
    hc++;
  }

  // Jerry cans near ends
  for (const [x, z] of [points[1], points[points.length - 2]]) {
    const can = new THREE.Group();
    addBox(can, 0.3, 0.45, 0.16, PALETTE.oliveDark, 0, 0.22, 0);
    addBox(can, 0.14, 0.12, 0.05, PALETTE.steelDark, 0, 0.5, 0);
    can.position.set(x - 0.9, -TRENCH_DEPTH, z - facing * 0.4);
    can.rotation.y = 0.5;
    sub.add(can);
  }
}

// Convert a zig-zag definition into world points
export function makeZigZag(startX, endX, centerZ, offset, spacing, shift = 0) {
  const points = [];
  let x = startX;
  let zOff = 1;
  while (x <= endX) {
    points.push([x + shift, centerZ + offset * zOff]);
    zOff = zOff === 1 ? -1 : 1;
    x += spacing;
  }
  return points;
}