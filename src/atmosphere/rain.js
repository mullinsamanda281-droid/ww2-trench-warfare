// src/atmosphere/rain.js
// Light rain particle system - low-poly Points, cheap on mobile.
import * as THREE from 'three';
import { PALETTE } from '../palette.js';

const COUNT = 1400;
const EXTENT = 46;
const FALL = 18;

export class Rain {
  constructor(scene) {
    this.positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * EXTENT * 2;
      this.positions[i * 3 + 1] = Math.random() * 16;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * EXTENT * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.material = new THREE.PointsMaterial({
      color: PALETTE.rainGrey,
      size: 0.07,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  update(dt, cameraPos) {
    const pos = this.positions;
    const wind = 0.7;
    for (let i = 0; i < COUNT; i++) {
      let y = pos[i * 3 + 1] - FALL * dt;
      if (y < 0) y = 16;
      pos[i * 3] += wind * dt;
      pos[i * 3 + 1] = y;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    // Follow camera horizontally, stay above ground
    this.points.position.x = cameraPos.x;
    this.points.position.z = cameraPos.z;
    this.points.position.y = Math.max(-2, cameraPos.y - 4);
  }
}