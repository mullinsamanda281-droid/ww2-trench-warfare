// tests/mortar-tests.js
// Headless tests for the axis mortar fire mission.
import * as THREE from 'three';
import { buildMap } from '../src/world/mapBuilder.js';
import { Mortar } from '../src/atmosphere/mortar.js';

let passed = 0;
let failed = 0;
function assert(cond, name, detail) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

console.log('=== MORTAR TESTS ===\n');

const map = buildMap();
const scene = new THREE.Scene();
const sound = { whistle() {}, explosion() {} };

let hits = 0;
const mortar = new Mortar(scene, map.collision, map.layout.mortar, sound, {
  onPlayerHit: () => hits++,
  active: false, // manual fire
});

// 1. Shells launch from the pit position
mortar.fire(map.layout, null);
assert(mortar.shells.length === 1, 'fire() schedules a shell');

// 2. All target coords stay in-bounds
for (let i = 0; i < 40; i++) {
  const t = mortar.pickTarget();
  assert(Math.abs(t.x) < 72 && Math.abs(t.z) < 72, 'target in bounds', `${t.x.toFixed(1)}, ${t.z.toFixed(1)}`);
}

// 3. Player inside the blast radius is damaged via callback
const player = { alive: true, pos: new THREE.Vector3(0, 0, 0) };
const oldHits = hits;
mortar.impact({ x: 1, z: 0 }, player); // inside 3.2 radius
assert(hits === oldHits + 1, 'player inside blast radius takes damage');

// 4. Player outside the radius is safe
mortar.impact({ x: 12, z: 12 }, player);
assert(hits === oldHits + 1, 'player outside blast radius unharmed');

// 5. Impact spawns a puff + flash in the scene
const meshCount = scene.children.length;
mortar.impact({ x: 5, z: 5 }, null);
assert(scene.children.length === meshCount + 2, 'impact spawns puff + flash');

// 6. Dead player not damaged
const dead = { alive: false, pos: new THREE.Vector3(1, 0, 0) };
mortar.impact({ x: 1, z: 0 }, dead);
assert(hits === oldHits + 1, 'dead player not damaged');

console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);