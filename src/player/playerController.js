// src/player/playerController.js
// First-person controller: WASD + mouse look, sprint, jump, crouch.
// Movement is resolved against the map heightfield (terrainHeight) so trenches,
// firing steps, ramps and walls all behave correctly.
import * as THREE from 'three';

export const PLAYER_EYE = 1.55;
export const PLAYER_CROUCH_EYE = 0.85;
export const PLAYER_RADIUS = 0.3;

export class PlayerController {
  constructor(camera, collision, spawn) {
    this.camera = camera;
    this.collision = collision;
    this.pos = new THREE.Vector3(spawn.x, 0, spawn.z);
    this.vel = new THREE.Vector3();
    this.yaw = 0; // faces -Z at spawn (toward NML for the allied trench)
    this.pitch = 0;
    this.onGround = false;
    this.crouching = false;
    this.sprinting = false;
    this.keys = new Set();
    this.jumpHeld = false;
    this.health = 100;
    this.team = 'allied';
    this.alive = true;
    this.moveSpeed = 5.2;
    this.sprintMul = 1.55;
    this.crouchMul = 0.45;

    this.camera.rotation.order = 'YXZ';
    this.applyLook(0, 0);
    this.snapToGround();
  }

  keyDown(code) {
    this.keys.add(code);
    if (code === 'Space') this.jumpHeld = true;
  }

  keyUp(code) {
    this.keys.delete(code);
    if (code === 'Space') this.jumpHeld = false;
  }

  applyLook(dx, dy) {
    this.yaw -= dx * 0.0022;
    this.pitch -= dy * 0.0022;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
  }

  respawn(spawn, team) {
    this.pos.set(spawn.x, 0, spawn.z);
    this.vel.set(0, 0, 0);
    this.health = 100;
    this.alive = true;
    this.team = team;
    this.snapToGround();
  }

  get eyeHeight() {
    return this.crouching ? PLAYER_CROUCH_EYE : PLAYER_EYE;
  }

  snapToGround() {
    const h = this.collision.terrainHeight(this.pos.x, this.pos.z);
    this.pos.y = h === 99 ? 0 : h;
    this.updateCamera();
  }

  updateCamera() {
    this.camera.position.set(this.pos.x, this.pos.y + this.eyeHeight, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  update(dt) {
    if (!this.alive) return;
    this.crouching = this.keys.has('ControlLeft') || this.keys.has('ControlRight');
    this.sprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    const speed = this.moveSpeed * (this.sprinting ? this.sprintMul : 1) * (this.crouching ? this.crouchMul : 1);
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const wish = new THREE.Vector3();
    if (this.keys.has('KeyW')) wish.add(forward);
    if (this.keys.has('KeyS')) wish.sub(forward);
    if (this.keys.has('KeyD')) wish.add(right);
    if (this.keys.has('KeyA')) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);

    // Horizontal accel with light friction
    this.vel.x += (wish.x - this.vel.x) * Math.min(1, dt * 10);
    this.vel.z += (wish.z - this.vel.z) * Math.min(1, dt * 10);

    // Gravity + jump
    if (this.onGround && this.jumpHeld) {
      this.vel.y = 4.6;
      this.onGround = false;
    }
    if (!this.onGround) {
      this.vel.y -= 11 * dt;
    }

    this.moveAxis(dt, 'x');
    this.moveAxis(dt, 'z');
    this.moveAxis(dt, 'y');

    this.updateCamera();
  }

  // Move along one axis, resolving against the heightfield with step-up support
  moveAxis(dt, axis) {
    if (axis === 'y') {
      const v = this.vel.y * dt;
      if (Math.abs(v) < 1e-6) return;
      const nextY = this.pos.y + v;
      const h = this.collision.terrainHeight(this.pos.x, this.pos.z);
      if (nextY <= h) {
        this.pos.y = h;
        this.onGround = true;
        this.vel.y = 0;
      } else {
        this.pos.y = nextY;
        this.onGround = false;
      }
      return;
    }

    const v = this.vel[axis] * dt;
    if (Math.abs(v) < 1e-6) return;
    const next = { ...this.pos };
    next[axis] += v;

    // Sample height at the player's corners
    const r = PLAYER_RADIUS;
    const samples = axis === 'x'
      ? [[next.x, this.pos.z - r * 0.7], [next.x, this.pos.z + r * 0.7], [next.x, this.pos.z]]
      : [[this.pos.x - r * 0.7, next.z], [this.pos.x + r * 0.7, next.z], [this.pos.x, next.z]];

    const hNow = this.collision.terrainHeight(this.pos.x, this.pos.z);
    let hNext = hNow;
    for (const [sx, sz] of samples) {
      const h = this.collision.terrainHeight(sx, sz);
      if (h < hNext) hNext = h;
    }

    const feet = this.pos.y;
    const stepClimb = 0.9;

    if (hNext === 99) {
      // Wall - blocked, cancel movement on this axis
      this.vel[axis] = 0;
      return;
    }

    if (hNext <= feet + stepClimb) {
      // Walkable: move, snap to ground level changes
      this.pos[axis] = next[axis];
      if (hNext > this.pos.y) this.pos.y = hNext;
      if (hNext < this.pos.y - 0.05) this.pos.y = hNext;
    } else {
      // Too tall a step - blocked
      this.vel[axis] = 0;
      return;
    }

    // Ground snap: detect walking off ledges (airborne) vs standing
    const hGround = this.collision.terrainHeight(this.pos.x, this.pos.z);
    if (hGround < 99) {
      const gap = this.pos.y - hGround;
      if (gap > 0.35) this.onGround = false;
      else if (gap >= -0.05) {
        this.pos.y = hGround;
        this.onGround = true;
      }
    }
  }
}