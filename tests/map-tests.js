// tests/map-tests.js
// Headless structural tests for the trench map. Run with: npm test
import { buildMap, pathZ, ALLIED_Z, AXIS_Z, NML_MIN, NML_MAX } from '../src/world/mapBuilder.js';
import { countTris, countMeshes } from '../src/geometry.js';
import { PALETTE } from '../src/palette.js';

let passed = 0;
let failed = 0;

function assert(cond, name, detail) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`);
  }
}

console.log('=== WW2 TRENCH MAP - STRUCTURAL TESTS ===\n');

const map = buildMap();
const { layout } = map;
const allied = layout.alliedPoints;
const axis = layout.axisPoints;

// --- 1. Triangle budget ---
const tris = countTris(map.root);
console.log(`\n[1] Tri budget: ${tris.toLocaleString()} tris, ${countMeshes(map.root)} meshes`);
assert(tris < 50000, 'map under 50k tris', `actual ${tris}`);
assert(tris > 1000, 'map has real geometry', `actual ${tris}`);

// --- 2. Map bounds ---
assert(ALLIED_Z - AXIS_Z === 45, 'trench lines 45m apart');
assert(Math.abs(NML_MAX - NML_MIN) === 40, 'No Man\'s Land is 40m wide');

// --- 3. Terrain heightfield sanity (positions derived from the zig-zag path) ---
const c = map.collision;
const pz = (pts, x) => pathZ(pts, x);
assert(c.terrainHeight(0, pz(allied, 0)) === -2.5, 'allied trench floor at -2.5');
assert(c.terrainHeight(0, pz(axis, 0)) === -2.5, 'axis trench floor at -2.5');
assert(c.terrainHeight(0, 0) === 0, 'NML center is flat ground');

// --- 4. Fire step (standing on it raises eye above parapet) ---
const stepZ = pz(allied, 0) - 0.68;
assert(c.terrainHeight(0, stepZ) === -1.05, 'fire step top at -1.05 (eye 0.5 > parapet 0.45)', `got ${c.terrainHeight(0, stepZ)}`);
// Rear corridor half is also floor
const rearZ = pz(allied, 0) + 0.68;
assert(c.terrainHeight(0, rearZ) === -2.5, 'rear corridor is floor at -2.5', `got ${c.terrainHeight(0, rearZ)}`);

// --- 5. Walls block ---
assert(c.terrainHeight(0, pz(allied, 0) - 1.3) === 99, 'front wall blocks movement');
assert(c.terrainHeight(0, pz(allied, 0) - 1.9) === 99, 'parapet blocks movement');
assert(c.terrainHeight(0, pz(allied, 0) + 1.3) === 99, 'rear wall blocks movement');

// --- 6. Exits are walkable ramps ---
for (const [exX, exZ] of layout.alliedExits) {
  assert(c.terrainHeight(exX, exZ) === -2.5, `exit ${exX} starts at floor level`);
  const mid = c.terrainHeight(exX, exZ - 1.2);
  assert(mid >= -2.5 && mid <= -0.2, `exit ${exX} mid-steps ascend`, `got ${mid}`);
  const lip = c.terrainHeight(exX, exZ - 2.2);
  assert(lip >= 0 && lip < 1, `exit ${exX} lip reaches ground level`, `got ${lip}`);
}

// --- 7. Spawn points are inside trenches ---
for (const [side, name] of [[map.spawnPoints.allied, 'allied'], [map.spawnPoints.axis, 'axis']]) {
  for (const s of side) {
    const h = c.terrainHeight(s.x, s.z);
    assert(h === -2.5, `${name} spawn (${Math.round(s.x)}, ${Math.round(s.z)}) inside trench`, `got ${h}`);
  }
}

// --- 8. Structure blockers ---
const { bunker, concrete, mortar } = layout;
// Enterable bunker: interior is walkable at ground level, walls block
assert(c.terrainHeight(bunker.x, bunker.z) === 0, 'steel bunker interior walkable', `got ${c.terrainHeight(bunker.x, bunker.z)}`);
assert(c.terrainHeight(bunker.x, bunker.z - 0.9) === 2.4, 'bunker front wall blocks', `got ${c.terrainHeight(bunker.x, bunker.z - 0.9)}`);
assert(c.terrainHeight(bunker.x - 1.15, bunker.z) === 2.4, 'bunker side wall blocks', `got ${c.terrainHeight(bunker.x - 1.15, bunker.z)}`);
assert(c.terrainHeight(bunker.x, bunker.z + 1.4) === 0, 'bunker rear doorway open to ground', `got ${c.terrainHeight(bunker.x, bunker.z + 1.4)}`);
const mortarBand = c.terrainHeight(mortar.x, mortar.z - 1.3);
assert(mortarBand === 1.0, 'mortar ring blocks', `got ${mortarBand}`);
assert(c.terrainHeight(concrete.x + 1.15, concrete.z) === 2.0, 'concrete pillar blocks');
assert(c.terrainHeight(concrete.x, concrete.z) !== 2.0, 'concrete entrance gap is walkable');

// Concrete entrance stairs ascend from the trench floor to the doorway
const stairLow = c.terrainHeight(concrete.x, concrete.z + 1.6);
const stairHigh = c.terrainHeight(concrete.x, concrete.z + 0.2);
assert(stairHigh > stairLow, 'concrete stairs ascend from floor to door', `low ${stairLow} high ${stairHigh}`);

// --- 9. No NaN / no degenerate geometry ---
let nanCount = 0;
let infCount = 0;
map.root.traverse((o) => {
  if (o.isMesh && o.geometry) {
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) nanCount++;
        else infCount++;
      }
    }
  }
});
assert(nanCount === 0, 'no NaN vertices', `found ${nanCount}`);
assert(infCount === 0, 'no Infinity vertices', `found ${infCount}`);

// --- 10. Bounding spheres are sane ---
let badSphere = 0;
map.root.traverse((o) => {
  if (o.isMesh && o.geometry) {
    o.geometry.computeBoundingSphere();
    if (!o.geometry.boundingSphere || !Number.isFinite(o.geometry.boundingSphere.radius) || o.geometry.boundingSphere.radius > 200) {
      badSphere++;
    }
  }
});
assert(badSphere === 0, 'all bounding spheres valid', `found ${badSphere}`);

// --- 11. Materials are flat-shaded lambert (matte plastic look) ---
let nonFlat = 0;
map.root.traverse((o) => {
  if (o.isMesh && o.material) {
    if (o.material.flatShading !== true) nonFlat++;
  }
});
assert(nonFlat === 0, 'all materials flat-shaded', `found ${nonFlat}`);

// --- 12. Palette compliance: every material color is from the palette
// (jittered variants are palette colors with small luminance shifts, so allow a tolerance)
const paletteRGB = Object.values(PALETTE).map((hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]);
const colorDistance = (c) => {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  let best = Infinity;
  for (const [pr, pg, pb] of paletteRGB) {
    best = Math.min(best, Math.hypot(r - pr, g - pg, b - pb));
  }
  return best;
};
let offPalette = 0;
map.root.traverse((o) => {
  if (o.isMesh && o.material) {
    const col = o.material.color.getHex();
    if (colorDistance(col) > 28) offPalette++;
  }
});
assert(offPalette === 0, 'all material colors within tolerance of palette', `found ${offPalette} off-palette`);

// --- 13. Zig-zag integrity: corridors connect end to end (skip entrance stairwell zones) ---
const gaps = [...layout.alliedRearGaps, ...layout.axisRearGaps];
const nearGap = (x, z) => gaps.some(([gx, gz]) => Math.hypot(x - gx, z - gz) < 1.5);
const walk = (pts) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    if (nearGap(mx, mz)) continue;
    if (c.terrainHeight(mx, mz) !== -2.5) return false;
  }
  return true;
};
assert(walk(allied), 'allied corridor continuous along path');
assert(walk(axis), 'axis corridor continuous along path');

// --- 14. Bullet ray tracing: parapet blocks low shots, allows over-the-top fire ---
// Allied trench at z=22.5 faces -Z (toward NML). Fire step at z=21.82 (step top -1.05).
// A soldier's eye on the step sits at ~0.5, which must clear the parapet berm top (0.45).
const stepPt = { x: 0, z: pz(allied, 0) - 0.68 };
const eyeOnStep = 0.5;
assert(c.rayHeight(stepPt.x, stepPt.z) === -1.05, 'fire step surface is -1.05', `got ${c.rayHeight(stepPt.x, stepPt.z)}`);
// Aim just above the parapet from the fire step toward the enemy line
const aimY = eyeOnStep + 0.02;
let clear = true;
for (let z = stepPt.z; z > -23; z -= 0.5) {
  if (c.rayHeight(stepPt.x, z) > aimY) { clear = false; break; }
}
assert(clear, 'fire-step eye line clears parapet across NML');

// A low shot (along the trench floor line, y=-1.0) must be stopped by the parapet
let blocked = false;
for (let z = stepPt.z; z > -23; z -= 0.5) {
  const h = c.rayHeight(stepPt.x, z);
  if (-1.0 < h) { blocked = true; break; }
}
assert(blocked, 'low shot is blocked by parapet');

// Soldier on the trench floor (eye -0.95) is hidden behind the parapet/wall
let visible = true;
for (let z = pz(allied, 0) - 0.3; z > -23; z -= 0.5) {
  if (c.rayHeight(stepPt.x, z) > -0.95) { visible = false; break; }
}
assert(!visible, 'floor-level eye line is hidden behind the parapet');

console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);