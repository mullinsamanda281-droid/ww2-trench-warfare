// src/soldier/soldier.js
// Blocky faceless soldiers (BattleBit-style). Simple AI: hold firing positions,
// peek over the parapet, fire bursts at the enemy line, take cover.
import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import { jittered } from '../geometry.js';
import { mat, chamferBox, lowPolyCylinder } from '../geometry.js';

const EYE = 1.5;
const raf = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (fn) => setTimeout(() => fn(), 16);

export class Soldier {
  constructor(scene, collision, opts) {
    this.scene = scene;
    this.collision = collision;
    this.team = opts.team;
    this.home = opts.home; // {x, z} - trench position
    this.role = opts.role || 'rifle'; // rifle | mg | patrol
    this.yaw = opts.yaw || 0;
    this.alive = true;
    this.respawnAt = 0;
    this.state = 'hold'; // hold | shoot | fall | dead
    this.shootTimer = 0;
    this.health = 100;
    this.burstLeft = 0;
    this.speed = 2.2;
    this.walkTarget = null;
    this.suppressed = false;
    this.suppressUntil = 0;
    this.duckAmount = 0;

    this.group = this.buildMesh();
    this.pos = new THREE.Vector3(this.home.x, 0, this.home.z);
    this.snapToGround();
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
    scene.add(this.group);
  }

  buildMesh() {
    const g = new THREE.Group();
    const uniform = this.team === 'allied' ? jittered(PALETTE.uniformAllied, 7) : jittered(PALETTE.uniformAxis, 8);
    const uni = mat(uniform);
    const uniDark = mat(jittered(uniform, 3));
    const skin = mat(PALETTE.skin);
    const helm = mat(this.team === 'allied' ? jittered(PALETTE.helmGreen, 4) : jittered(PALETTE.helmGrey, 5));

    // Legs
    const legGeo = new THREE.BoxGeometry(0.14, 0.6, 0.16);
    const legL = new THREE.Mesh(legGeo, uniDark);
    legL.position.set(-0.1, 0.3, 0);
    const legR = new THREE.Mesh(legGeo, uniDark);
    legR.position.set(0.1, 0.3, 0);
    g.add(legL, legR);
    // Boots
    const bootGeo = new THREE.BoxGeometry(0.15, 0.12, 0.28);
    const bootL = new THREE.Mesh(bootGeo, mat(PALETTE.mudDark));
    bootL.position.set(-0.1, 0.06, 0.05);
    const bootR = new THREE.Mesh(bootGeo, mat(PALETTE.mudDark));
    bootR.position.set(0.1, 0.06, 0.05);
    g.add(bootL, bootR);
    // Torso
    const torso = new THREE.Mesh(chamferBox(0.4, 0.5, 0.22, 0.03), uni);
    torso.position.set(0, 0.85, 0);
    g.add(torso);
    // Belt
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.24), mat(PALETTE.oliveDark));
    belt.position.set(0, 0.6, 0);
    g.add(belt);
    // Head (faceless)
    const head = new THREE.Mesh(chamferBox(0.2, 0.24, 0.2, 0.02), skin);
    head.position.set(0, 1.24, 0);
    g.add(head);
    // Helmet
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.55), helm);
    helmet.position.set(0, 1.35, 0);
    g.add(helmet);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.24), helm);
    brim.position.set(0, 1.28, 0);
    g.add(brim);
    // Arms + rifle
    const armGeo = new THREE.BoxGeometry(0.11, 0.46, 0.12);
    const armL = new THREE.Mesh(armGeo, uniDark);
    armL.position.set(-0.27, 0.9, 0.02);
    armL.rotation.z = 0.25;
    g.add(armL);
    this.armR = new THREE.Mesh(armGeo, uniDark);
    this.armR.position.set(0.27, 0.95, 0.02);
    this.armR.rotation.z = -0.35;
    g.add(this.armR);
    // Blocky rifle
    this.rifle = new THREE.Group();
    const wood = mat(PALETTE.woodDark);
    const steel = mat(PALETTE.steelDark);
    const rifleStock = new THREE.Mesh(chamferBox(0.06, 0.11, 0.5, 0.015), wood);
    rifleStock.position.set(0, 0, 0.15);
    this.rifle.add(rifleStock);
    const rifleBarrel = new THREE.Mesh(lowPolyCylinder(0.018, 0.018, 0.45, 5), steel);
    rifleBarrel.rotation.x = Math.PI / 2;
    rifleBarrel.position.set(0, 0.01, -0.28);
    this.rifle.add(rifleBarrel);
    const rifleAction = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.2), steel);
    rifleAction.position.set(0, 0.03, 0.1);
    this.rifle.add(rifleAction);
    this.rifle.position.set(0.28, 1.0, 0.12);
    this.rifle.rotation.y = Math.PI; // held pointing forward
    this.rifle.rotation.z = -0.1;
    g.add(this.rifle);

    g.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; }
    });
    return g;
  }

  snapToGround() {
    const h = this.collision.terrainHeight(this.pos.x, this.pos.z);
    this.pos.y = h === 99 ? 0 : h;
  }

  hit(damage, dir) {
    if (!this.alive) return;
    this.health -= damage;
    if (this.health <= 0) {
      this.die(dir);
      return;
    }
    // Take cover: duck below the parapet, re-peek later at a shifted spot
    this.suppressed = true;
    this.suppressUntil = performance.now() + 1400 + Math.random() * 900;
    this.state = 'hold';
    this.burstLeft = 0;
  }

  die(dir) {
    this.alive = false;
    this.respawnAt = performance.now() + 15000;
    this.state = 'fall';
    this.fallT = 0;
    this.fallDir = dir || new THREE.Vector3(1, 0, 0);
    this.poof();
    if (this.role === 'mg' && this.team === 'allied' && this.mgFire) this.mgFire.stop();
  }

  // Toy-like expanding dust puff (no gore)
  poof() {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 6, 4),
      mat(PALETTE.mudDark, { transparent: true, opacity: 0.65 })
    );
    puff.position.copy(this.group.position);
    puff.position.y += 0.7;
    this.scene.add(puff);
    const start = performance.now();
    const grow = () => {
      const t = (performance.now() - start) / 450;
      if (t >= 1) { this.scene.remove(puff); return; }
      const s = 1 + t * 2.2;
      puff.scale.set(s, s * 0.8, s);
      puff.material.opacity = 0.65 * (1 - t);
      raf(grow);
    };
    grow();
  }

  respawn() {
    this.alive = true;
    this.health = 100;
    this.state = 'hold';
    this.pos.set(this.home.x, 0, this.home.z);
    this.snapToGround();
    this.group.rotation.y = this.yaw;
    this.group.rotation.z = 0;
    this.group.position.copy(this.pos);
    this.group.visible = true;
  }

  update(dt, time, world) {
    if (!this.alive) {
      if (this.state === 'fall') {
        this.fallT += dt;
        this.group.rotation.x = Math.min(1.4, this.fallT * 2.2);
        this.group.rotation.z = Math.sin(this.fallT * 2) * 0.3;
        if (this.fallT > 2.5) {
          this.state = 'dead';
          this.group.visible = false;
        }
      }
      if (this.state === 'dead' && performance.now() > this.respawnAt) this.respawn();
      return;
    }

    // Simple peek-shoot behavior from firing positions
    this.shootTimer -= dt;
    const now = performance.now();
    if (this.suppressed && now >= this.suppressUntil) {
      // Re-peek at a slightly shifted firing spot
      this.suppressed = false;
      const shift = (Math.random() - 0.5) * 4;
      this.home.x = Math.max(-45, Math.min(45, this.home.x + shift));
      this.pos.x = this.home.x;
      this.snapToGround();
    }
    // While suppressed, stay below the parapet
    this.duckAmount += ((this.suppressed ? 1 : 0) - this.duckAmount) * Math.min(1, dt * 10);
    const duck = this.duckAmount * 0.55;

    if (!this.suppressed) {
    switch (this.state) {
      case 'hold':
        if (this.shootTimer <= 0) {
          this.state = 'shoot';
          this.shootTimer = 0.4 + Math.random() * 1.6;
          this.burstLeft = this.role === 'mg' ? 8 + Math.floor(Math.random() * 8) : 2 + Math.floor(Math.random() * 3);
        }
        break;
      case 'shoot':
        this.group.rotation.y = this.yaw + Math.sin(time * 2 + this.home.x) * 0.12;
        if (this.burstLeft > 0 && this.shootTimer <= 0.2) {
          this.burstLeft--;
          this.muzzleFlash(time);
          if (world && world.sound) world.sound.gunshot();
          this.fireShot(world);
          this.shootTimer = this.role === 'mg' ? 0.12 : 0.7;
          this.recoilPunch();
        }
        if (this.burstLeft <= 0 && this.shootTimer <= -0.4) {
          this.state = 'hold';
          this.shootTimer = 2 + Math.random() * 3;
        }
        break;
    }
    }

    // Occasional reposition along the trench (patrol role)
    if (this.role === 'patrol' && Math.random() < dt * 0.1) {
      this.walkTarget = this.home.x + (Math.random() - 0.5) * 14;
    }
    if (this.walkTarget !== null) {
      const dx = this.walkTarget - this.pos.x;
      if (Math.abs(dx) > 0.3) {
        this.pos.x += Math.sign(dx) * this.speed * dt;
        this.group.rotation.y = Math.sign(dx) > 0 ? -Math.PI / 2 : Math.PI / 2;
      } else {
        this.walkTarget = null;
      }
      this.snapToGround();
    }

    this.group.position.set(this.pos.x, this.pos.y, this.pos.z);
    // Walk bob + suppression duck (drops below the parapet when under fire)
    const bob = this.walkTarget !== null ? Math.abs(Math.sin(time * 8)) * 0.05 : Math.sin(time * 2 + this.home.x) * 0.01;
    this.group.position.y += bob - duck;
  }

  recoilPunch() {
    this.rifle.position.z = 0.28;
    this.armR.rotation.z = -0.5;
    setTimeout(() => {
      this.rifle.position.z = 0.12;
      this.armR.rotation.z = -0.35;
    }, 90);
  }

  muzzleFlash(time) {
    const flash = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.25),
      mat(PALETTE.lanternGlow, { emissive: PALETTE.lanternGlow, emissiveIntensity: 1.2, transparent: true, opacity: 0.9 })
    );
    const muzzle = new THREE.Vector3(0, 1.05, -0.75).applyMatrix4(this.group.matrixWorld);
    flash.position.copy(muzzle);
    flash.rotation.copy(this.group.rotation);
    this.scene.add(flash);
    setTimeout(() => this.scene.remove(flash), 60);
  }

  getMuzzle() {
    this.group.updateMatrixWorld(true);
    return new THREE.Vector3(0, 1.02, -0.72).applyMatrix4(this.group.matrixWorld);
  }

  getEye() {
    return new THREE.Vector3(0, EYE, 0).applyMatrix4(this.group.matrixWorld);
  }

  // Bot fire vs the local player: only hits when the target is exposed above
  // the parapet (or out in No Man's Land) and the bullet line is clear.
  fireShot(world) {
    if (!world || !world.player) return;
    const p = world.player;
    if (!p.alive || p.team === this.team) return;

    const eye = this.getEye();
    const target = new THREE.Vector3(p.pos.x, p.pos.y + p.eyeHeight, p.pos.z);
    if (!this.hasLineOfSight(world.collision, eye, target)) return;

    const dist = eye.distanceTo(target);
    // Hit chance: long-range falloff so medium distances remain viable.
    // Formula tuned to criteria: >=35% at 10m, >=25% at 20m, <=15% at 30m, <=5% at 40m.
    const hitChance = Math.max(0.05, 0.6 - dist * 0.015);
    if (Math.random() < hitChance) {
      // Damage falls off with distance so close-range remains deadliest.
      // Rifle: 32 at point-blank, 20 at 40m. MG: 9 at point-blank, 5 at 40m.
      const rifleDmg = Math.max(20, 32 - Math.floor(dist * 0.3));
      const mgDmg = Math.max(5, 9 - Math.floor(dist * 0.1));
      const dmg = this.role === 'mg' ? mgDmg : rifleDmg;
      world.damagePlayer(dmg, this);
    }
  }

  hasLineOfSight(collision, from, to) {
    const dir = to.clone().sub(from);
    const dist = dir.length();
    dir.normalize();
    const step = 0.7;
    for (let d = step; d < dist; d += step) {
      const px = from.x + dir.x * d;
      const py = from.y + dir.y * d;
      const pz = from.z + dir.z * d;
      if (py < collision.rayHeight(px, pz)) return false;
    }
    return true;
  }

  // World-space AABB for hitscan
  getAABB() {
    const p = this.group.position;
    return { min: new THREE.Vector3(p.x - 0.25, p.y, p.z - 0.25), max: new THREE.Vector3(p.x + 0.25, p.y + 1.5, p.z + 0.25) };
  }
}