// src/world/mapBuilder.js
// Assembles the full 150m arena: terrain, allied + axis trench lines,
// No Man's Land, strongpoints, props. Returns scene graph + stats + spawn points.
import * as THREE from 'three';
import { buildTerrain } from './terrain.js';
import { buildTrenchLine, makeZigZag } from './trenches.js';
import { buildNoMansLand } from './noMansLand.js';
import {
  buildMgPosition, buildSteelBunker, buildConcreteEntrance,
  buildMortarPit, buildAmmoCrate, buildLantern,
} from './structures.js';
import { createCollision } from './collision.js';
import { PALETTE } from '../palette.js';
import { jittered, mat } from '../geometry.js';

const addBox = (g, w, h, d, color, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
};

// Layout constants
export const ALLIED_Z = 22.5;   // allied trench centerline (south side, +Z)
export const AXIS_Z = -22.5;    // axis trench centerline (north side, -Z)
export const NML_MIN = -20;     // no man's land front edge (axis side)
export const NML_MAX = 20;      // no man's land front edge (allied side)

// Interpolate the z position on the zig-zag path at a given x
export function pathZ(points, x) {
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    if (x >= Math.min(ax, bx) - 0.01 && x <= Math.max(ax, bx) + 0.01) {
      const t = (x - ax) / (bx - ax);
      return az + t * (bz - az);
    }
  }
  return points[0][1];
}

export function buildMap() {
  const root = new THREE.Group();
  root.name = 'ww2-trench-map';

  // 1. Terrain + craters
  const terrain = buildTerrain(root);

  // 2. Allied trench line (zig-zag), facing -Z toward NML
  const alliedPoints = makeZigZag(-57, 57, ALLIED_Z, 3, 14);
  // Exits placed well inside segments (lx < halfL+1) so wall gaps get cut
  const alliedExits = [[-50, pathZ(alliedPoints, -50)], [20, pathZ(alliedPoints, 20)]];
  // Bunker rear gap: groundLevel staircase so the player can climb out to the
  // bunker. Placed at a segment-center x (lx < halfL+1) so the wall gets cut.
  const bunkerX = -36;
  const alliedRearGaps = [[bunkerX, pathZ(alliedPoints, bunkerX) + 1.2, true]];
  buildTrenchLine({
    points: alliedPoints, facing: -1, group: root,
    exits: alliedExits, rearGaps: alliedRearGaps,
    side: 'allied', isAllied: true,
  });

  // 3. Axis trench line (mirrored, slightly different stagger)
  const axisPoints = makeZigZag(-57, 57, AXIS_Z, 3, 14, -3);
  const axisExits = [[-24, pathZ(axisPoints, -24)], [46, pathZ(axisPoints, 46)]];
  const axisRearGaps = [[18, pathZ(axisPoints, 18) - 1.2, true]]; // concrete entrance: ground-level walkway
  buildTrenchLine({
    points: axisPoints, facing: 1, group: root,
    exits: axisExits, rearGaps: axisRearGaps,
    side: 'axis', isAllied: false,
  });

  // 4. No Man's Land
  buildNoMansLand(root, { minZ: NML_MIN + 1, maxZ: NML_MAX - 1 });

  // 5. Strongpoints - all positioned relative to the actual trench path
  const strongpoints = new THREE.Group();
  strongpoints.name = 'strongpoints';

  // Allied MG positions (2x) on parapet front
  const alliedMg = [[-32, pathZ(alliedPoints, -32) - 1.95], [30, pathZ(alliedPoints, 30) - 1.95]];
  for (const [mx, mz] of alliedMg) {
    const mg = buildMgPosition(-1);
    mg.position.set(mx, 0, mz);
    strongpoints.add(mg);
  }
  // Axis MG positions (2x)
  const axisMg = [[-30, pathZ(axisPoints, -30) + 1.95], [34, pathZ(axisPoints, 34) + 1.95]];
  for (const [mx, mz] of axisMg) {
    const mg = buildMgPosition(1);
    mg.position.set(mx, 0, mz);
    strongpoints.add(mg);
  }

  // Allied corrugated steel bunker - enterable, straddling the rear wall gap.
  // Front wall sits just past the trench rear wall; doorway faces the trench.
  const bunkerZ = pathZ(alliedPoints, bunkerX) + 2.7;
  const steel = buildSteelBunker(-1);
  steel.position.set(bunkerX, 0, bunkerZ);
  strongpoints.add(steel);

  // Sandbag steps ascending from the trench floor to the bunker doorway
  // (mirror the collision staircase bands: tops -1.9, -1.3, -0.7, -0.1)
  const stepZ0 = pathZ(alliedPoints, bunkerX) + 1.2; // rear gap center
  for (let i = 0; i < 4; i++) {
    const d = [0.1, 0.4, 0.7, 1.0][i];
    const top = [-1.9, -1.3, -0.7, -0.1][i];
    addBox(strongpoints, 1.5, 0.35, 0.5, jittered(PALETTE.sandbagDark, 60 + i), bunkerX, top - 0.175, stepZ0 + d - 1.2 + 0.1);
  }

  // Axis concrete bunker entrance (behind the axis rear wall, doorway faces the trench)
  const concX = 18;
  const concZ = pathZ(axisPoints, concX) - 1.6;
  const conc = buildConcreteEntrance(1);
  conc.position.set(concX, 0, concZ);
  strongpoints.add(conc);

  // Axis mortar pit (behind axis line)
  const mortarX = -8;
  const mortarZ = pathZ(axisPoints, mortarX) - 2.4;
  const mortar = buildMortarPit();
  mortar.position.set(mortarX, 0, mortarZ);
  strongpoints.add(mortar);

  // Ammo crates
  const crates = new THREE.Group();
  crates.name = 'ammo-crates';
  const crateSpots = [
    [alliedMg[0][0] + 0.9, alliedMg[0][1] + 0.8, 0.5],
    [alliedMg[1][0] - 0.9, alliedMg[1][1] + 0.9, 1.2],
    [bunkerX + 2.2, bunkerZ - 0.6, -0.4], // beside the bunker entrance
    [axisMg[0][0] + 0.9, axisMg[0][1] - 0.8, 0.8],
    [axisMg[1][0] - 0.9, axisMg[1][1] - 0.9, -0.6],
    [mortarX + 0.8, mortarZ + 1.8, 0.3],
    [-50, pathZ(alliedPoints, -50) + 0.8, 2.1],
    [52, pathZ(axisPoints, 52) - 0.9, 1.7],
  ];
  for (let i = 0; i < crateSpots.length; i++) {
    const [x, z, ry] = crateSpots[i];
    const c = buildAmmoCrate(i);
    c.position.set(x, 0.25, z);
    c.rotation.y = ry;
    crates.add(c);
  }
  strongpoints.add(crates);

  root.add(strongpoints);

  // Collision layout - must mirror the geometry above
  const collision = createCollision({
    lines: [
      { points: alliedPoints, facing: -1, exits: alliedExits, rearGaps: alliedRearGaps },
      { points: axisPoints, facing: 1, exits: axisExits, rearGaps: axisRearGaps },
    ],
    platforms: [
      ...alliedMg.map(([x, z]) => ({ x, z, r: 1.2, top: 0.35 })),
      ...axisMg.map(([x, z]) => ({ x, z, r: 1.2, top: 0.35 })),
      // Bunker interior floor (walkable, doorway on the rear wall)
      { x: bunkerX, z: bunkerZ, r: 1.05, top: 0 },
    ],
    rings: [
      { x: mortarX, z: mortarZ, r: 1.05, top: 1.0 },
    ],
    posts: [
      ...alliedPoints.map(([px, pz]) => ({ x: px, z: pz + 0.35 })),
      ...axisPoints.map(([px, pz]) => ({ x: px, z: pz - 0.35 })),
    ],
    blockers: [
      // Steel bunker hollow shell: front wall, rear wall flanking the doorway, side walls
      { x: bunkerX, z: bunkerZ - 0.9, w: 2.2, d: 0.3, top: 2.4 },
      { x: bunkerX - 0.75, z: bunkerZ + 0.9, w: 1.0, d: 0.3, top: 2.4 },
      { x: bunkerX + 0.75, z: bunkerZ + 0.9, w: 1.0, d: 0.3, top: 2.4 },
      { x: bunkerX - 1.15, z: bunkerZ, w: 0.3, d: 2.0, top: 2.4 },
      { x: bunkerX + 1.15, z: bunkerZ, w: 0.3, d: 2.0, top: 2.4 },
      { x: concX + 1.15, z: concZ, w: 0.7, d: 1.6, top: 2.0 },
      { x: concX - 1.15, z: concZ, w: 0.7, d: 1.6, top: 2.0 },
    ],
  });

  // Spawn points ON the trench path (inside corridors)
  const alliedSpawnXs = [-50, -18, 8, 40, -46, 24];
  const axisSpawnXs = [-48, -16, 12, 44, -24, 46];
  const spawnPoints = {
    allied: alliedSpawnXs.map((x) => ({ x, z: pathZ(alliedPoints, x) })),
    axis: axisSpawnXs.map((x) => ({ x, z: pathZ(axisPoints, x) })),
  };

  return {
    root,
    terrain,
    collision,
    stats: { terrain: 'see tests' },
    spawnPoints,
    layout: {
      alliedPoints, axisPoints, alliedExits, axisExits,
      alliedRearGaps, axisRearGaps, alliedMg, axisMg,
      bunker: { x: bunkerX, z: bunkerZ },
      concrete: { x: concX, z: concZ },
      mortar: { x: mortarX, z: mortarZ },
    },
  };
}