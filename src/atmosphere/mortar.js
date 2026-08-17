// src/atmosphere/mortar.js
// Axis mortar pit fire mission: periodically lobs a visible shell into
// No Man's Land with a whistle, arc, impact burst + damage radius.
import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import { mat } from '../geometry.js';

const raf = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (fn) => setTimeout(() => fn(), 16);

const IMPACT_RADIUS = 3.2;
const DAMAGE = 70;

export class Mortar {
  constructor(scene, collision, pos, sound, opts = {}) {
    this.scene = scene;
    this.collision = collision;
    this.pos = pos; // {x, z} pit location
    this.sound = sound;
    this.onPlayerHit = opts.onPlayerHit || (() => {});
    this.minInterval = opts.minInterval || 7;
    this.maxInterval = opts.maxInterval || 14;
    this.active = opts.active !== false;
    this.nextFire = performance.now() + 2000 + Math.random() * 3000;
    this.shells = [];

    // shell mesh (shared)
    this.shellGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.6, 6);
    this.shellMat = mat(PALETTE.steelDark);
  }

  // Pick a target: mostly No Man's Land, occasionally toward the allied front
  pickTarget() {
    if (Math.random() < 0.2) {
      // deeper on the allied half / near the allied fire step
      return { x: -36 + Math.random() * 72, z: 6 + Math.random() * 12, onTrench: true };
    }
    return { x: -38 + Math.random() * 76, z: -12 + Math.random() * 24, onTrench: false };
  }

  fire(layout, player) {
    const target = this.pickTarget();
    const from = new THREE.Vector3(this.pos.x, 0.8, this.pos.z);
    const to = new THREE.Vector3(target.x, 0, target.z);
    const start = performance.now();
    const dur = 2200;
    if (this.sound && this.sound.whistle) this.sound.whistle();
    this.shells.push({ from, to, start, dur, target });
  }

  update(dt, layout, player) {
    const now = performance.now();
    if (this.active && now >= this.nextFire) {
      this.fire(layout, player);
      this.nextFire = now + this.minInterval + Math.random() * (this.maxInterval - this.minInterval);
    }

    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      const t = (now - s.start) / s.dur;
      if (t >= 1) {
        this.impact(s.target, player);
        this.shells.splice(i, 1);
        continue;
      }
      // Parabolic arc
      const p = new THREE.Vector3().lerpVectors(s.from, s.to, t);
      p.y += 14 * 4 * t * (1 - t);
      if (!s.mesh) {
        s.mesh = new THREE.Mesh(this.shellGeo, this.shellMat);
        this.scene.add(s.mesh);
      }
      s.mesh.position.copy(p);
      s.mesh.rotation.z = Math.PI / 2;
      s.mesh.rotation.y = -t * 8;
    }
  }

  impact(target, player) {
    // Burst puff + flash
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 6, 4),
      mat(PALETTE.mudDark, { transparent: true, opacity: 0.8 })
    );
    puff.position.set(target.x, 0.3, target.z);
    this.scene.add(puff);
    const start = performance.now();
    const grow = () => {
      const t = (performance.now() - start) / 500;
      if (t >= 1) { this.scene.remove(puff); return; }
      const s = 1 + t * 3;
      puff.scale.set(s, s * 0.7, s);
      puff.material.opacity = 0.8 * (1 - t);
      raf(grow);
    };
    grow();

    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 6, 4),
      mat(PALETTE.lanternGlow, { emissive: PALETTE.lanternGlow, emissiveIntensity: 1.4, transparent: true, opacity: 0.9 })
    );
    flash.position.set(target.x, 0.5, target.z);
    this.scene.add(flash);
    setTimeout(() => this.scene.remove(flash), 80);

    if (this.sound && this.sound.explosion) this.sound.explosion();

    // Damage the player inside the blast radius
    if (player && player.alive) {
      const d = Math.hypot(player.pos.x - target.x, player.pos.z - target.z);
      if (d < IMPACT_RADIUS) {
        this.onPlayerHit(DAMAGE);
      }
    }
  }
}