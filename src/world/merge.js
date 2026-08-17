// src/world/merge.js
// Post-build optimization: merge static meshes that share a material into a
// single geometry (in world space), collapsing ~1000 draw calls down to one per
// material shade. The map is fully static, so this is safe.
import * as THREE from 'three';

function mergeGeometries(geometries) {
  // Flatten everything to non-indexed so flat shading stays per-face
  const geos = geometries.map((g) => (g.index ? g.toNonIndexed() : g));
  const attrs = ['position', 'normal', 'uv'];
  const counts = geos.map((g) => g.attributes.position.count);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const merged = new THREE.BufferGeometry();
  for (const attr of attrs) {
    const first = geos[0].attributes[attr];
    if (!first) continue;
    const array = new Float32Array(total * first.itemSize);
    let off = 0;
    for (const g of geos) {
      const a = g.attributes[attr];
      if (!a) continue;
      array.set(a.array, off);
      off += a.array.length;
    }
    merged.setAttribute(attr, new THREE.BufferAttribute(array, first.itemSize));
  }
  // Flat normals (non-indexed => no shared vertices => face-aligned normals)
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

// Returns a NEW root group containing merged world-space meshes.
export function mergeStaticGroups(root) {
  root.updateMatrixWorld(true);

  const groups = new Map(); // material -> [{ geo, castShadow }]
  root.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (!groups.has(o.material)) groups.set(o.material, []);
    groups.get(o.material).push({ geo, castShadow: o.castShadow });
  });

  const out = new THREE.Group();
  out.name = 'merged-map';
  let mergedCount = 0;
  let keptCount = 0;
  for (const [material, items] of groups) {
    if (items.length === 1) {
      const m = new THREE.Mesh(items[0].geo, material);
      m.castShadow = items[0].castShadow;
      out.add(m);
      keptCount++;
    } else {
      const merged = mergeGeometries(items.map((i) => i.geo));
      if (merged) {
        const m = new THREE.Mesh(merged, material);
        m.castShadow = items.some((i) => i.castShadow);
        out.add(m);
        mergedCount++;
      } else {
        for (const i of items) {
          const m = new THREE.Mesh(i.geo, material);
          m.castShadow = i.castShadow;
          out.add(m);
        }
      }
    }
  }

  out.userData.drawCalls = out.children.length;
  out.userData.mergedGroups = mergedCount;
  out.userData.keptGroups = keptCount;
  return out;
}