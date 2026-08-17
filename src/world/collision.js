// src/world/collision.js
// Heightfield-style collision for the trench map. Matches the geometry built in
// trenches.js (constants imported from there).
//   terrainHeight(x,z) -> walkable surface top; blocked surfaces (walls) return
//                         BLOCKED (99) so the controller rejects movement.
//   rayHeight(x,z)     -> visible surface top for bullet tracing: a wall/parapet
//                         returns the height you must clear to shoot over it.
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

  // Walkable top for a trench band result
  const FLOOR = -TRENCH_DEPTH;
  const STEP_TOP = -TRENCH_DEPTH + FIRE_STEP_HEIGHT; // fire step surface (-1.05)
  const PARAPET_TOP = PARAPET_HEIGHT;                // berm top above ground (0.45)

  // classify returns { walk, ray }: walk is what the controller stands on
  // (BLOCKED for walls), ray is the visible surface top for bullet tracing.
  function classify(x, z) {
    if (Math.abs(x) > 72 || Math.abs(z) > 72) return { walk: BLOCKED, ray: 50 };

    for (const b of blockers) {
      if (Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2) return { walk: b.top, ray: b.top };
    }
    for (const p of platforms) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < p.r) return { walk: p.top, ray: p.top };
    }
    for (const r of rings) {
      const d = Math.hypot(x - r.x, z - r.z);
      if (d >= r.r && d < r.r + 0.6) return { walk: r.top, ray: r.top };
    }
    for (const p of posts) {
      if (Math.hypot(x - p.x, z - p.z) < 0.2) return { walk: BLOCKED, ray: 8 };
    }

    let best = null;
    for (const s of segs) {
      const pr = project(x, z, s);
      if (pr.d < PARA_MAX + 0.5 && (!best || pr.d < best.d)) best = { s, ...pr };
    }
    if (!best) return { walk: 0, ray: 0 };

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
      if (d < STEP_MIN + 0.39) return { walk: FLOOR, ray: FLOOR };
      if (d < STEP_MIN + 0.67) return { walk: FLOOR + 0.62, ray: FLOOR + 0.62 };
      if (d < STEP_MIN + 0.95) return { walk: FLOOR + 1.24, ray: FLOOR + 1.24 };
      if (d < STEP_MIN + 1.1) return { walk: FLOOR + 1.86, ray: FLOOR + 1.86 };
      if (d < 3.1) return { walk: 0.22, ray: 0.22 };
      return { walk: 0, ray: 0 };
    }

    // Rear gap staircase (concrete bunker entrance - ground-level walkway)
    if (inRearGap && !front && rearGapGround) {
      if (d < 0.25) return { walk: -1.9, ray: -1.9 };
      if (d < 0.55) return { walk: -1.3, ray: -1.3 };
      if (d < 0.85) return { walk: -0.7, ray: -0.7 };
      if (d < 1.25) return { walk: -0.1, ray: -0.1 };
      return { walk: 0, ray: 0 };
    }

    // Corridor floor
    if (d < STEP_MIN) return { walk: FLOOR, ray: FLOOR };

    // Fire step (front side only)
    if (front && d >= STEP_MIN && d < STEP_MAX) return { walk: STEP_TOP, ray: STEP_TOP };

    // Rear corridor half is also floor
    if (!front && d >= STEP_MIN && d < STEP_MAX) return { walk: FLOOR, ray: FLOOR };

    // Walls - blocked to walking, but bullets clear the top
    if (d >= STEP_MAX && d < WALL_MAX) {
      if (inRearGap && !front) return { walk: 0, ray: 0 }; // doorway gap through rear wall
      return { walk: BLOCKED, ray: 0 };
    }
    if (d >= WALL_MAX && d < PARA_MAX) {
      if (front) return { walk: BLOCKED, ray: PARAPET_TOP }; // sandbag berm top
      return { walk: 0, ray: 0 };
    }
    return { walk: 0, ray: 0 };
  }

  function terrainHeight(x, z) {
    return classify(x, z).walk;
  }

  function rayHeight(x, z) {
    return classify(x, z).ray;
  }

  return { terrainHeight, rayHeight, segments: segs };
}