// src/player/weaponView.js
// Blocky first-person weapon models: Kar98k bolt-action + M1 Garand.
// Parented to the camera with bob/recoil animation. No textures - solid colors.
import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import { mat, chamferBox, lowPolyCylinder } from '../geometry.js';

export class WeaponView {
  constructor(camera) {
    this.camera = camera;
    this.root = new THREE.Group();
    this.root.name = 'weapon-view';
    camera.add(this.root);

    this.bobT = 0;
    this.recoil = 0;
    this.aiming = false;

    this.buildRifles();
    this.setWeapon(0);
    this.root.position.set(0.26, -0.24, -0.5);
  }

  buildRifles() {
    const wood = mat(PALETTE.woodDark);
    const woodLight = mat(PALETTE.woodPlank);
    const steel = mat(PALETTE.steelDark);
    const steelLight = mat(PALETTE.steel);

    const kar98 = new THREE.Group();
    // Stock
    const stock = new THREE.Mesh(chamferBox(0.07, 0.16, 0.62, 0.02), wood);
    stock.position.set(0, 0, 0.1);
    kar98.add(stock);
    // Forend
    const forend = new THREE.Mesh(chamferBox(0.06, 0.11, 0.34, 0.02), woodLight);
    forend.position.set(0, -0.01, -0.32);
    kar98.add(forend);
    // Barrel
    const barrel = new THREE.Mesh(lowPolyCylinder(0.022, 0.022, 0.52, 6), steel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.62);
    kar98.add(barrel);
    // Action/bolt
    const action = new THREE.Mesh(chamferBox(0.07, 0.09, 0.26, 0.015), steelLight);
    action.position.set(0, 0.04, 0.0);
    kar98.add(action);
    // Bolt handle
    const bolt = new THREE.Mesh(lowPolyCylinder(0.014, 0.014, 0.14, 5), steel);
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(0.045, 0.09, 0.06);
    kar98.add(bolt);
    const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 4, 3), steel);
    boltKnob.position.set(0.125, 0.09, 0.06);
    kar98.add(boltKnob);
    // Sights
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.02), steel);
    frontSight.position.set(0, 0.075, -0.42);
    kar98.add(frontSight);
    const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.05), steel);
    rearSight.position.set(0, 0.06, 0.22);
    kar98.add(rearSight);
    // Sling
    const sling = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.6), mat(PALETTE.oliveDark));
    sling.position.set(-0.045, -0.05, -0.05);
    sling.rotation.z = 0.06;
    kar98.add(sling);

    const m1 = new THREE.Group();
    // Stock
    const m1Stock = new THREE.Mesh(chamferBox(0.07, 0.15, 0.68, 0.02), woodLight);
    m1Stock.position.set(0, 0, 0.12);
    m1.add(m1Stock);
    // Forend + handguard
    const m1Forend = new THREE.Mesh(chamferBox(0.062, 0.1, 0.42, 0.02), wood);
    m1Forend.position.set(0, -0.01, -0.26);
    m1.add(m1Forend);
    const hg = new THREE.Mesh(chamferBox(0.05, 0.08, 0.3, 0.015), wood);
    hg.position.set(0, 0.015, -0.38);
    m1.add(hg);
    // Barrel
    const m1Barrel = new THREE.Mesh(lowPolyCylinder(0.024, 0.024, 0.55, 6), steel);
    m1Barrel.rotation.x = Math.PI / 2;
    m1Barrel.position.set(0, 0.02, -0.62);
    m1.add(m1Barrel);
    // Receiver + clip housing
    const rec = new THREE.Mesh(chamferBox(0.068, 0.1, 0.3, 0.015), steelLight);
    rec.position.set(0, 0.035, 0.02);
    m1.add(rec);
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.06), steel);
    clip.position.set(0, 0.085, 0.05);
    m1.add(clip);
    // Sights
    const m1Sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.02), steel);
    m1Sight.position.set(0, 0.075, -0.4);
    m1.add(m1Sight);
    // Front band
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.025), steel);
    band.position.set(0, -0.01, -0.34);
    m1.add(band);

    this.rifles = [
      { name: 'Kar98k', group: kar98, boltAction: true, magSize: 5, damage: 75 },
      { name: 'M1 Garand', group: m1, boltAction: false, magSize: 8, damage: 60 },
    ];
    for (const r of this.rifles) {
      this.root.add(r.group);
    }
  }

  setWeapon(index) {
    this.current = this.rifles[index];
    for (let i = 0; i < this.rifles.length; i++) {
      this.rifles[i].group.visible = i === index;
    }
  }

  fire() {
    this.recoil = Math.min(0.12, this.recoil + 0.06);
  }

  update(dt, moving, grounded) {
    // Idle sway
    this.bobT += dt * (moving ? 9 : 2.2);
    const bobX = moving && grounded ? Math.sin(this.bobT) * 0.008 : Math.sin(this.bobT * 0.5) * 0.003;
    const bobY = moving && grounded ? Math.abs(Math.cos(this.bobT)) * 0.012 : Math.sin(this.bobT * 0.5) * 0.004;

    // Recoil recovery
    this.recoil = Math.max(0, this.recoil - dt * 0.5);
    const recZ = this.recoil * 1.2;
    const recY = this.recoil * 1.8;

    const ads = this.aiming ? 0.35 : 1;
    this.root.position.x = 0.26 * ads + bobX;
    this.root.position.y = -0.24 * ads + bobY + recY;
    this.root.position.z = -0.5 * ads + recZ;
    this.root.rotation.set(0, 0, this.recoil * 0.6);
  }
}