// src/world/collision.js
// Heightfield-style collision for the trench map. Matches the geometry built in
// trenches.js (constants imported from there). terrainHeight(x,z) returns the
// walkable surface top; blocked surfaces (walls) return 99 so the controller
// rejects movement into them.
import { TRENCH_WIDTH, TRENCH_DEPTH, FIRE_STEP_HEIGHT, PARAPET_HEIGHT } from './trenches.js';

const HALF = TRENCH_WIDTH / 2; // 1.3 - trench half-width
const STEP_MIN = 0.4;          // fire step inner edge
const STEP_MAX = 1.0;          // fire step outer edge (wall inner face)
const WALL_MAX = 1.4;          // front/rear wall outer face
const PARA_MAX = 2.1;          // parapet outer face
const BLOCKED = 99;

// layout: { lines: [{points, facing, exits, rearGaps: [{x, z, groundLevel}]}],
//           platforms, rings, blockers, posts }
export function createCollision(layout) {
  const { lines, platforms = [], rings = [], blockers = [], posts = [] } = layout;

  const segs = [];
  for (const line of lines) {
    const { points, facing } = line;
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az] = points[i];
      const [bx, bz] = points[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      segs.push({ ax, az, bx, bz, len, dx: (bx - ax) / len, dz: (bz - az) / len, line });
    }
  }

  const project = (x, z, s) => {
    const t = ((x - s.ax) * s.dx + (z - s.az) * s.dz) / s.len;
    const c = Math.max(0, Math.min(1, t));
    const cx = s.ax + c * s.dx * s.len;
    const cz = s.az + c * s.dz * s.len;
    return { d: Math.hypot(x - cx, z - cz), cx, cz, lx: (x - s.ax) * s.dx + (z - s.az) * s.dz };
  };

  const localX = (x, z, s) => (x - s.ax) * s.dx + (z - s.az) * s.dz;
  const facingOffset = (x, z, s) => (z - project(x, z, s).cz) * s.line.facing;

  function terrainHeight(x, z) {
    if (Math.abs(x) > 72 || Math.abs(z) > 72) return BLOCKED;

    for (const b of blockers) {
      if (Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2) return b.top;
    }
    for (const p of platforms) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < p.r) return p.top;
    }
    for (const r of rings) {
      const d = Math.hypot(x - r.x, z - r.z);
      if (d >= r.r && d < r.r + 0.6) return r.top;
    }
    for (const p of posts) {
      if (Math.hypot(x - p.x, z - p.z) < 0.2) return BLOCKED;
    }

    let best = null;
    for (const s of segs) {
      const pr = project(x, z, s);
      if (pr.d < PARA_MAX + 0.5 && (!best || pr.d < best.d)) best = { s, ...pr };
    }
    if (!best) return 0;

    const { s, d, lx } = best;
    const front = facingOffset(x, z, s) > 0;
    const line = s.line;

    const exitLocs = line.exits.map(([ex, ez]) => localX(ex, ez, s)).filter((g) => Math.abs(g) < s.len / 2 + 1);
    // Exit window is wider than the visual gap because diagonal segments make a
    // straight-outward walk drift in local-X; keeps the breach traversable.
    const inExit = exitLocs.some((g) => Math.abs(lx - g) < 1.4);
    const rearGapLocs = line.rearGaps
      .map(([ex, ez, gl]) => ({ lx: localX(ex, ez, s), ground: gl === true }))
      .filter((g) => Math.abs(g.lx) < s.len / 2 + 1);
    const inRearGap = rearGapLocs.some((g) => Math.abs(lx - g.lx) < 0.8);
    const rearGapGround = rearGapLocs.some((g) => Math.abs(lx - g.lx) < 0.8 && g.ground);

    if (inExit && front) {
      // Sandbag stairs over the parapet
      if (d < STEP_MIN + 0.39) return -TRENCH_DEPTH;
      if (d < STEP_MIN + 0.67) return -TRENCH_DEPTH + 0.62;
      if (d < STEP_MIN + 0.95) return -TRENCH_DEPTH + 1.24;
      if (d < STEP_MIN + 1.1) return -TRENCH_DEPTH + 1.86;
      if (d < 3.1) return 0.22;
      return 0;
    }

    // Rear gap staircase (concrete bunker entrance - ground-level walkway)
    // Steps at d=0.1(top -1.9), 0.4(-1.3), 0.7(-0.7), 1.0(-0.1), then ground 0
    if (inRearGap && !front && rearGapGround) {
      if (d < 0.25) return -1.9;
      if (d < 0.55) return -1.3;
      if (d < 0.85) return -0.7;
      if (d < 1.25) return -0.1;
      return 0;
    }

    // Corridor floor
    if (d < STEP_MIN) return -TRENCH_DEPTH;

    // Fire step (front side only)
    if (front && d >= STEP_MIN && d < STEP_MAX) {
      return -TRENCH_DEPTH + FIRE_STEP_HEIGHT;
    }

    // Rear corridor half is also floor
    if (!front && d >= STEP_MIN && d < STEP_MAX) return -TRENCH_DEPTH;

    // Walls - blocked
    if (d >= STEP_MAX && d < WALL_MAX) {
      if (inRearGap && !front) return 0; // doorway gap through rear wall
      return BLOCKED;
    }
    if (d >= WALL_MAX && d < PARA_MAX) {
      if (front) return BLOCKED; // parapet mound
      return 0;
    }
    return 0;
  }

  return { terrainHeight, segments: segs };
}