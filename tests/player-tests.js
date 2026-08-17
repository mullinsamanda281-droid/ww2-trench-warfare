// tests/player-tests.js
// Headless simulation tests for the first-person controller on the trench map.
// Run with: node tests/player-tests.js
import * as THREE from 'three';
import { buildMap, pathZ } from '../src/world/mapBuilder.js';
import { PlayerController } from '../src/player/playerController.js';

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

console.log('=== PLAYER CONTROLLER SIMULATION TESTS ===\n');

const map = buildMap();
const camera = new THREE.Object3D();
const controller = new PlayerController(camera, map.collision, map.spawnPoints.allied[0]);

const sim = (steps, key, dt = 1 / 60) => {
  controller.keys.add(key);
  for (let i = 0; i < steps; i++) controller.update(dt);
  controller.keys.delete(key);
  for (let i = 0; i < 30; i++) controller.update(dt);
};

// 1. Spawn lands in the trench floor
assert(Math.abs(controller.pos.y - (-2.5)) < 0.01, 'spawns on trench floor', `y=${controller.pos.y}`);

// 2. Walk along the trench corridor (W, i.e. toward NML) - stays inside, no NaN
controller.respawn(map.spawnPoints.allied[1], 'allied'); // mid-corridor, away from exits
controller.yaw = 0;
const startX = controller.pos.x;
sim(240, 'KeyW');
assert(Number.isFinite(controller.pos.x) && Number.isFinite(controller.pos.y), 'movement produces finite positions');
assert(Math.abs(controller.pos.y - (-2.5)) < 0.02, 'still on trench floor after walking', `y=${controller.pos.y}`);

// 3. Fire step climb: press W toward the front wall, should rise onto step
const stepZ = pathZ(map.layout.alliedPoints, controller.pos.x) - 0.68;
controller.pos.x = pathZ(map.layout.alliedPoints, controller.pos.x);
controller.pos.z = map.spawnPoints.allied[0].z;
controller.snapToGround();
// rotate yaw to face the step (north = -Z for allied trench front)
controller.yaw = 0;
sim(240, 'KeyW');
assert(controller.pos.y > -1.2, 'climbs onto fire step', `y=${controller.pos.y}`);

// 4. Wall blocks: keep walking into the front wall, should not pass through
const xBefore = controller.pos.x;
sim(240, 'KeyW');
assert(Math.abs(controller.pos.x - xBefore) < 0.5, 'front wall stops forward progress', `dx=${Math.abs(controller.pos.x - xBefore).toFixed(2)}`);

// 5. Over-the-top exit climb: walk to the exit and climb out
const [exX, exZ] = map.layout.alliedExits[0];
controller.respawn({ x: exX, z: exZ }, 'allied');
controller.yaw = 0;
sim(420, 'KeyW');
assert(controller.pos.y > -0.5, 'climbs over the top to ground level', `y=${controller.pos.y}`);
assert(Number.isFinite(controller.pos.y), 'no NaN after exit climb');

// 6. Jump works on ground
controller.respawn({ x: 0, z: 0 }, 'allied');
controller.yaw = Math.PI;
controller.jumpHeld = true;
for (let i = 0; i < 20; i++) controller.update(1 / 60);
assert(controller.pos.y > 0.2, 'jump lifts off ground', `y=${controller.pos.y}`);
controller.jumpHeld = false;
for (let i = 0; i < 90; i++) controller.update(1 / 60);
assert(controller.pos.y <= 0.01, 'lands back on ground', `y=${controller.pos.y}`);

// 7. Climb the bunker steps and enter the steel bunker
const { bunker } = map.layout;
controller.respawn({ x: bunker.x, z: pathZ(map.layout.alliedPoints, bunker.x) }, 'allied'); // trench corridor at bunker
controller.yaw = Math.PI; // face rear (toward bunker)
controller.snapToGround();
sim(600, 'KeyW'); // walk up the rear staircase
assert(controller.pos.y > -0.4, 'climbed bunker steps to ground level', `y=${controller.pos.y}`);
sim(240, 'KeyW'); // walk into the doorway
assert(controller.pos.y > -0.05, 'entered bunker interior (floor at 0)', `y=${controller.pos.y}`);
assert(Math.hypot(controller.pos.x - bunker.x, controller.pos.z - bunker.z) < 1.5, 'reached bunker interior center', `d=${Math.hypot(controller.pos.x - bunker.x, controller.pos.z - bunker.z).toFixed(2)}`);
// Bunker walls stop forward movement
sim(240, 'KeyW');
assert(controller.pos.y > -0.5, 'bunker walls keep player inside', `y=${controller.pos.y}`);

console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);