// src/main.js
// Game bootstrap: renderer, scene, map, player, weapons, bots, weather, loop.
import * as THREE from 'three';
import { buildMap } from './world/mapBuilder.js';
import { PlayerController } from './player/playerController.js';
import { WeaponView } from './player/weaponView.js';
import { Soldier } from './soldier/soldier.js';
import { Rain } from './atmosphere/rain.js';
import { setupEnvironment, createArtilleryFlashes } from './atmosphere/environment.js';
import { SoundSystem } from './atmosphere/sound.js';
import { NetClient, makeSnapshot, TEAM } from './net/protocol.js';
import { countTris } from './geometry.js';

const overlay = document.getElementById('overlay');
const hud = document.getElementById('hud');
const banner = document.getElementById('team-banner');
const crosshair = document.getElementById('crosshair');

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 300);

// --- Build the map ---
const map = buildMap();
scene.add(map.root);
const env = setupEnvironment(scene, renderer);

// --- Audio ---
const sound = new SoundSystem();
const artillery = createArtilleryFlashes(scene, sound);

// --- Player ---
let team = TEAM.ALLIED;
const player = new PlayerController(camera, map.collision, map.spawnPoints.allied[0]);
player.team = team;
banner.textContent = 'ALLIED · SOUTH TRENCH';
banner.style.color = '#A8B060';

// --- Weapon ---
const weapon = new WeaponView(camera);
let weaponIndex = 0;

// --- Bots ---
const bots = [];
const alliedHome = map.spawnPoints.allied;
const axisHome = map.spawnPoints.axis;
const botRoles = ['rifle', 'rifle', 'mg', 'patrol', 'rifle', 'mg'];
// Bots stand on the fire step (front side of the trench) so they peek over the parapet
for (let i = 0; i < 6; i++) {
  const home = alliedHome[i];
  const isMg = botRoles[i] === 'mg';
  bots.push(new Soldier(scene, map.collision, {
    team: TEAM.ALLIED,
    home: { x: home.x, z: home.z - 0.68 },
    role: isMg ? 'mg' : 'rifle',
    yaw: 0, // face -Z toward NML
  }));
}
for (let i = 0; i < 6; i++) {
  const home = axisHome[i];
  const isMg = botRoles[i] === 'mg';
  bots.push(new Soldier(scene, map.collision, {
    team: TEAM.AXIS,
    home: { x: home.x, z: home.z + 0.68 },
    role: isMg ? 'mg' : 'rifle',
    yaw: Math.PI, // face +Z toward NML
  }));
}

// --- Rain ---
const rain = new Rain(scene);

// --- Input ---
const pointerLocked = { locked: false };
document.getElementById('start-btn').addEventListener('click', () => {
  overlay.classList.add('hidden');
  renderer.domElement.requestPointerLock();
  sound.init();
  sound.resume();
});
document.addEventListener('pointerlockchange', () => {
  pointerLocked.locked = document.pointerLockElement === renderer.domElement;
  if (!pointerLocked.locked) {
    overlay.classList.remove('hidden');
  }
});
document.addEventListener('mousemove', (e) => {
  if (pointerLocked.locked) {
    player.applyLook(e.movementX, e.movementY);
  }
});
document.addEventListener('mousedown', (e) => {
  if (!pointerLocked.locked || !player.alive) return;
  if (e.button === 0) tryFire();
  if (e.button === 2) weapon.aiming = true;
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 2) weapon.aiming = false;
});
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') e.preventDefault();
  player.keyDown(e.code);
  if (e.code === 'Digit1') { weaponIndex = 0; weapon.setWeapon(0); player.weaponIndex = 0; }
  if (e.code === 'Digit2') { weaponIndex = 1; weapon.setWeapon(1); player.weaponIndex = 1; }
  if (e.code === 'KeyR') reload();
  if (e.code === 'KeyF') switchTeam();
  if (e.code === 'KeyK' && player.alive) killSelf();
});
document.addEventListener('keyup', (e) => player.keyUp(e.code));
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Combat ---
const weaponState = { ammo: [5, 8], reloading: [false, false] };
let reloadTimer = 0;

function tryFire() {
  const w = weapon.rifles[weaponIndex];
  if (weaponState.reloading[weaponIndex]) return;
  if (weaponState.ammo[weaponIndex] <= 0) { reload(); return; }
  weaponState.ammo[weaponIndex]--;
  weapon.fire();
  sound.gunshot();

  // Hitscan from camera center
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hit = castShot(ray);
  if (hit && hit.type === 'soldier' && hit.soldier.team !== player.team) {
    hit.soldier.hit(w.damage, ray.ray.direction);
    sound.hit();
  }
  spawnTracer(ray.ray.origin, ray.ray.origin.clone().add(ray.ray.direction.clone().multiplyScalar(hit ? hit.dist : 140)));

  if (weaponState.ammo[weaponIndex] <= 0) {
    if (w.name === 'M1 Garand') sound.garandPing();
    setTimeout(reload, 400);
  }
}

function castShot(ray) {
  // Check bots first
  let best = null;
  for (const b of bots) {
    if (!b.alive) continue;
    const aabb = b.getAABB();
    const box = new THREE.Box3(aabb.min, aabb.max);
    const hit = ray.ray.intersectBox(box, new THREE.Vector3());
    if (hit && (!best || hit.distanceTo(ray.ray.origin) < best.dist)) {
      best = { type: 'soldier', soldier: b, dist: hit.distanceTo(ray.ray.origin) };
    }
  }
  // March the ray against the terrain heightfield
  const origin = ray.ray.origin;
  const dir = ray.ray.direction;
  let dist = 0;
  const step = 0.8;
  let terrainDist = null;
  while (dist < 160) {
    dist += step;
    const px = origin.x + dir.x * dist;
    const py = origin.y + dir.y * dist;
    const pz = origin.z + dir.z * dist;
    const h = map.collision.terrainHeight(px, pz);
    if (py < h) { terrainDist = dist; break; }
  }
  if (terrainDist !== null && (!best || terrainDist < best.dist)) {
    return { type: 'terrain', dist: terrainDist };
  }
  return best;
}

function spawnTracer(from, to) {
  const mat = new THREE.LineBasicMaterial({ color: 0xD8C08A, transparent: true, opacity: 0.9 });
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  setTimeout(() => scene.remove(line), 90);
}

function reload() {
  const w = weapon.rifles[weaponIndex];
  if (weaponState.reloading[weaponIndex] || weaponState.ammo[weaponIndex] >= w.magSize) return;
  weaponState.reloading[weaponIndex] = true;
  sound.boltAction();
  setTimeout(() => {
    weaponState.ammo[weaponIndex] = w.magSize;
    weaponState.reloading[weaponIndex] = false;
  }, 1100);
}

function switchTeam() {
  team = team === TEAM.ALLIED ? TEAM.AXIS : TEAM.ALLIED;
  const spawns = team === TEAM.ALLIED ? map.spawnPoints.allied : map.spawnPoints.axis;
  player.respawn(spawns[0], team);
  banner.textContent = team === TEAM.ALLIED ? 'ALLIED · SOUTH TRENCH' : 'AXIS · NORTH TRENCH';
  banner.style.color = team === TEAM.ALLIED ? '#A8B060' : '#9AA0A6';
}

function killSelf() {
  player.alive = false;
  setTimeout(() => player.respawn(player.team === TEAM.ALLIED ? map.spawnPoints.allied[0] : map.spawnPoints.axis[0], player.team), 800);
}

// --- Net (optional; connect via ?server=ws://host:port) ---
const netUrl = new URLSearchParams(location.search).get('server');
let net = null;
if (netUrl) {
  net = new NetClient(netUrl, {});
  net.connect();
}

// --- Main loop ---
const clock = new THREE.Clock();
let fpsAccum = 0;
let fpsFrames = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  player.update(dt);
  weapon.update(dt, player.keys.size > 0, player.onGround);
  env.update(dt, t);
  artillery.update(dt, t);
  rain.update(dt, player.pos);

  for (const b of bots) b.update(dt, t, { sound });

  if (net) {
    net.updateState(makeSnapshot(player));
  }

  renderer.render(scene, camera);

  fpsAccum += dt;
  fpsFrames++;
  if (fpsAccum >= 0.5) {
    const fps = Math.round(fpsFrames / fpsAccum);
    const w = weapon.rifles[weaponIndex];
    hud.innerHTML = [
      `${fps} FPS · ${w.name}`,
      `AMMO ${weaponState.ammo[weaponIndex]}/${w.magSize}${weaponState.reloading[weaponIndex] ? ' (reloading)' : ''}`,
      `HP ${Math.round(player.health)} · ${player.team.toUpperCase()}`,
      `TRIS ${Math.round(countTris(map.root) / 1000)}k`,
    ].join('<br>');
    fpsAccum = 0;
    fpsFrames = 0;
  }
}

animate();