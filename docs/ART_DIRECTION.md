# ART DIRECTION — WW2 Trench Warfare

## Style

Blocky low-poly inspired by **BattleBit Remastered** (not Roblox). Simple
blocky characters with block hands, faceless. Voxel-like environment with flat
shading, no textures, solid colors with a matte plastic look. Low polygon
count, chamfered edges on hero props. Stylized but grim — war-torn, toy-like,
**no gore**.

## Palette

| Role | Color | Hex |
|------|-------|-----|
| Muddy brown (ground) | `#5C4A3A` | 0x5C4A3A |
| Trench grey (walls) | `#8A8A8A` | 0x8A8A8A |
| Olive drab (uniforms, crates) | `#4B5320` | 0x4B5320 |
| Dark mud | `#3E3429` | 0x3E3429 |
| Wood (planks, stocks) | `#6B4F3A` / `#4A3527` | — |
| Sandbags | `#6E6250` / `#5C5142` | — |
| Steel | `#7A7F85` / dark `#565B60` | — |
| Concrete | `#9A9A94` | — |
| Muddy water | `#3A4A52` | — |
| Lantern glow (emissive) | `#D8A03C` | — |

All desaturated. Repeated props (sandbags, planks, crates) get small
deterministic luminance jitter (4 quantized levels) to break banding while
keeping the material cache small.

## Materials

- `MeshLambertMaterial` + `flatShading: true` everywhere.
- `DoubleSide` so winding never shows holes.
- Materials cached by color+opts (no material explosion).
- Emissive only for lantern cores and muzzle flashes.

## Geometry

- Boxes, 6-sided cylinders, low-segment spheres. Chamfered boxes (20 tris) for
  hero props: rifles, ammo crates, bunkers, helmets.
- Triangle budget: **< 50k total**; current build ~14k.

## Rules

1. Solid colors only — never introduce textures for the map.
2. Keep everything faceless (helmets + heads, no faces).
3. No gore — hits drop a soldier, no blood.
4. Colors must stay within (or within tolerance of) the palette above.
5. Every map module must be headless-testable (buildable without WebGL).