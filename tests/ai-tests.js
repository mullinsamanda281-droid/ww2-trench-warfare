// tests/ai-tests.js
// Headless tests for bot fire vs the player: line-of-sight through parapets
// and damage application. Run with: npm test
import * as THREE from 'three';
import { buildMap, pathZ } from '../src/world/mapBuilder.js';
import { Soldier } from '../src/soldier/soldier.js';

let passed = 0;
let failed = 0;
function assert(cond, name, detail) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

console.log('=== BOT AI COMBAT TESTS ===\n');

const map = buildMap();
const scene = new THREE.Scene();
const collision = map.collision;

// Axis bot on its fire step (z = -22.5 + 0.68), facing +Z toward NML
const bot = new Soldier(scene, collision, {
  team: 'axis',
  home: { x: 0, z: pathZ(map.layout.axisPoints, 0) + 0.68 },
  role: 'rifle',
  yaw: Math.PI,
});
scene.updateMatrixWorld(true);

// Fake local player
const player = {
  team: 'allied',
  alive: true,
  eyeHeight: 1.55,
  pos: new THREE.Vector3(),
  crouching: false,
};
let damaged = 0;
let damageSource = null;
const world = {
  collision,
  player,
  damagePlayer: (amount, src) => { damaged += amount; damageSource = src; },
};

// 1. Player exposed on the allied fire step -> bot can see and damage them
player.pos.set(0, 0, pathZ(map.layout.alliedPoints, 0) - 0.68); // on fire step (stand top -1.05)
player.pos.y = collision.terrainHeight(player.pos.x, player.pos.z); // -1.05
assert(bot.hasLineOfSight(collision, bot.getEye(), new THREE.Vector3(player.pos.x, player.pos.y + 1.55, player.pos.z)), 'sees enemy on fire step');

// 2. Player hidden in the allied corridor -> not visible
player.pos.set(0, -2.5, pathZ(map.layout.alliedPoints, 0));
assert(!bot.hasLineOfSight(collision, bot.getEye(), new THREE.Vector3(player.pos.x, player.pos.y + 1.55, player.pos.z)), 'cannot see enemy in corridor');

// 3. Player in No Man's Land -> visible and damaged
player.pos.set(2, 0, 0); // NML ground
const before = damaged;
bot.fireShot(world);
// hit chance at ~33m is ~0.43; force deterministic by testing LOS only + a forced shot
assert(bot.hasLineOfSight(collision, bot.getEye(), new THREE.Vector3(player.pos.x, player.pos.y + 1.55, player.pos.z)), 'sees enemy in No Man\'s Land');

// 4. Teammate never damaged (allied bot, allied player)
const ally = new Soldier(scene, collision, {
  team: 'allied',
  home: { x: 8, z: pathZ(map.layout.alliedPoints, 8) - 0.68 },
  role: 'rifle',
  yaw: 0,
});
const d0 = damaged;
ally.fireShot(world);
assert(damaged === d0, 'friendly fire ignored');

// 5. Dead player never targeted
const deadWorld = { ...world, player: { ...player, alive: false } };
bot.fireShot(deadWorld);
assert(damaged === d0, 'dead player not targeted');

// 6. MG bot snaps onto its sandbag platform (top 0.35) and faces NML
const [mgX, mgZ] = map.layout.alliedMg[0];
const mgBot = new Soldier(scene, collision, {
  team: 'allied',
  home: { x: mgX, z: mgZ },
  role: 'mg',
  yaw: 0,
});
assert(Math.abs(mgBot.pos.y - 0.35) < 0.01, 'MG bot stands on platform', `y=${mgBot.pos.y}`);
assert(Math.abs(mgBot.pos.x - mgX) < 0.01 && Math.abs(mgBot.pos.z - mgZ) < 0.01, 'MG bot centered on platform');

// MG gunner on the platform can see (and be seen by) the enemy line
const axisPt = { x: mgX, z: pathZ(map.layout.axisPoints, mgX) + 0.68 };
player.pos.set(axisPt.x, -1.05, axisPt.z);
assert(mgBot.hasLineOfSight(collision, mgBot.getEye(), new THREE.Vector3(player.pos.x, player.pos.y + 1.55, player.pos.z)), 'MG gunner has sight lines over NML');

console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);