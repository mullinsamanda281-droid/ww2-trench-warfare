# WW2 Trench Warfare — Low-Poly Multiplayer Map

A small-scale, low-poly WW2 trench warfare map — blocky, BattleBit-inspired,
voxel-like, no textures, just flat-shaded colors. Built for 8–12 players in a
single focused 150m arena: two opposing zig-zag trench lines separated by 40
meters of No Man's Land.

## Run it

```bash
npm install
npm start        # serves at http://localhost:8080
```

Then open http://localhost:8080, click **ENTER THE TRENCHES**.

## Controls

| Key | Action |
|-----|--------|
| W A S D | Move |
| Mouse | Look (pointer-locked) |
| Space | Jump |
| Ctrl | Crouch |
| Shift | Sprint |
| LMB | Fire |
| R | Reload |
| 1 / 2 | Kar98k / M1 Garand |
| F | Switch team / spawn side |
| K | Respawn |
| Esc | Release mouse |

## Map

- **150m × 150m** arena, one front line.
- **Allied trench (south)** — zig-zag with duckboards, support beams every 3m,
  2× sandbag MG positions, a corrugated-steel half-sunk bunker, ammo crates.
- **Axis trench (north)** — mirrored but asymmetric: concrete bunker entrance
  with steps, mortar pit, MG positions.
- **No Man's Land** — 40m of open ground: shell craters with water, Czech
  hedgehog tank traps, barbed wire rolls, dead trees, muddy puddles.
- **Verticality** — trenches are 2.5m deep; you can only see out from the
  firing step. Sandbag stairs ("over the top") breach the parapet at two points
  per side.

## Art style

- Blocky characters with block hands, faceless. Voxel-like environment.
- Flat shading, solid colors only (matte plastic look), no PBR textures.
- Palette: muddy brown `#5C4A3A`, trench grey `#8A8A8A`, olive drab `#4B5320`.
- Under 14k triangles total (budget 50k).

## Atmosphere

Overcast lighting, dense fog, light rain, soft shadows, drifting smoke haze,
distant artillery thumps (synthesized WebAudio — no audio files).

## Multiplayer

The map is multiplayer-ready: `src/net/protocol.js` defines the wire protocol
(message types, snapshot format, transport). Start with `?server=ws://host:port`
to connect a client to a relay server. Local play uses 12 bot soldiers.

## Tests

```bash
npm test
```

- `tests/map-tests.js` — structural: tri budget, collision heightfield,
  corridor integrity, palette compliance, geometry validity.
- `tests/player-tests.js` — headless controller simulation: spawn, movement,
  fire step climbing, wall blocking, over-the-top exit, jumping.

## Structure

```
src/
  palette.js            color palette
  geometry.js           chamfered boxes, flat-shaded cached materials, stats
  world/
    mapBuilder.js       arena assembly + collision layout
    terrain.js          ground, mud patches, puddles, shell craters
    trenches.js         modular zig-zag trench builder (walls, steps, parapet)
    collision.js        heightfield collision matching the geometry
    noMansLand.js       tank traps, barbed wire, dead trees
    structures.js       bunkers, MG positions, mortar pit, ammo crates
    geometry-*          shared geometry helpers
  player/
    playerController.js first-person movement (heightfield-resolved)
    weaponView.js       blocky Kar98k / M1 Garand viewmodels
  soldier/soldier.js    blocky bot soldiers with peek-shoot AI
  atmosphere/           lighting, fog, smoke, rain, synthesized audio
  net/protocol.js       multiplayer wire protocol + snapshot format
```