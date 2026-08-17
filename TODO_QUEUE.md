# WW2 Trench Warfare — TODO QUEUE

## PHASE 1 — FOUNDATION (COMPLETE)
- [x] Reset project for 3D low-poly direction (Three.js)
- [x] Art pipeline: palette, chamfered geometry, flat-shaded cached materials
- [x] Map arena: 150m, terrain, mud, craters, puddles
- [x] Modular zig-zag trench builder (floor, walls, parapet, firing step, duckboards, support beams)
- [x] No Man's Land: tank traps, barbed wire, dead trees
- [x] Strongpoints: MG positions, steel bunker, concrete entrance, mortar pit, ammo crates
- [x] Heightfield collision matching geometry (trench depth, steps, wall blocking, exits)
- [x] First-person controller (WASD, jump, crouch, sprint)
- [x] Blocky Kar98k / M1 Garand viewmodels with recoil/bob
- [x] Atmosphere: overcast lighting, fog, rain, smoke, artillery flashes
- [x] Synthesized audio: artillery, gunfire, bolt action, M1 ping
- [x] Bot soldiers with peek-shoot AI
- [x] Multiplayer wire protocol (net/protocol.js)
- [x] Test suite: 51 passing (map structural + player simulation)

## READY

ID: GAME-PERF-001
TITLE: Frustum culling + merged geometry for ground patches
CATEGORY: Performance
PRIORITY: HIGH
COMPLEXITY: MEDIUM
DEPENDENCIES: none
DESCRIPTION: ~1000 draw calls is fine on desktop but high for mobile. Merge
static low-value props (mud patches, puddles, duckboards, parapet) into
BufferGeometry groups, keep hero props separate.
ACCEPTANCE:
- [ ] Map draw calls reduced by 40%+
- [ ] Tri budget unchanged
- [ ] Tests still pass
STATUS: READY

ID: GAME-INPUT-001
TITLE: Touch/mobile fallback controls
CATEGORY: Accessibility
PRIORITY: MEDIUM
COMPLEXITY: MEDIUM
DEPENDENCIES: none
DESCRIPTION: Virtual joystick + look drag + fire/ADS buttons for mobile
browsers (map is optimized for mobile per spec).
ACCEPTANCE:
- [ ] Joystick moves, drag looks, buttons fire/reload
- [ ] Works in pointer events
STATUS: READY

ID: GAME-NET-001
TITLE: Local echo "net mode" with N relay server scaffold
CATEGORY: Multiplayer
PRIORITY: MEDIUM
COMPLEXITY: HIGH
DEPENDENCIES: none
DESCRIPTION: Ship a minimal WebSocket relay server (scripts/relay.js) so two
browsers can play on the map. Clients sync player snapshots via protocol.js.
ACCEPTANCE:
- [ ] Two clients connect and see each other's blocky soldiers
- [ ] Position/yaw/health sync at 20Hz
STATUS: READY

ID: GAME-CONTENT-002
TITLE: Axis mortar pit becomes functional (area barrage)
CATEGORY: Content
PRIORITY: MEDIUM
COMPLEXITY: MEDIUM
DEPENDENCIES: none
DESCRIPTION: The mortar is decorative. Periodically lob visual shells onto
NML/player trench with delayed audio + impact puff, rewarding the axis position.
ACCEPTANCE:
- [ ] Shell arcs from the pit onto NML on a timer
- [ ] Impact shows a burst + crater puff
- [ ] Player in blast radius takes damage (with warning)
STATUS: READY

ID: GAME-AI-002
TITLE: Bots peek/duck reaction + mg suppression on player
CATEGORY: AI
PRIORITY: MEDIUM
COMPLEXITY: MEDIUM
DEPENDENCIES: none
DESCRIPTION: When a bot takes fire it ducks below the parapet briefly then
repeeks at a new spot. MG bots suppress toward the last-known player position.
ACCEPTANCE:
- [ ] Bot crouches visually after being shot
- [ ] MG bursts aim near player
- [ ] No infinite LOS camping
STATUS: READY

ID: GAME-QA-001
TITLE: Automated browser smoke test (headless)
CATEGORY: QA
PRIORITY: MEDIUM
COMPLEXITY: HIGH
DEPENDENCIES: none
DESCRIPTION: Drive the real page in a headless browser (puppeteer/playwright):
assert no console errors, pointer lock engages, game loop advances frames.
ACCEPTANCE:
- [ ] Zero console errors on boot
- [ ] Frames advance after ENTER clicked
STATUS: READY

## IN PROGRESS
(none — cycle beginning)

## BLOCKED
(none)

## DONE
- PHASE 1 foundation complete (see above)
- [x] GAME-GAMEPLAY-001 MG bots man sandbag emplacements
- [x] GAME-GAMEPLAY-002 Bot fire damages exposed players (parapet LOS)
- [x] GAME-POLISH-001 Player damage/death/respawn loop (vignette + K.I.A.)
- [x] GAME-CONTENT-001 Enterable steel bunker + rear stair climb
- [x] GAME-AUDIO-001 Surface footsteps + bullet impact thud
- [x] GAME-POLISH-002 Bot death poof (toy-like)
- [x] GAME-POLISH-003 ADS sight alignment + FOV zoom

## NEXT CYCLE
Gameplay loop completion: bot-vs-player combat (GAMEPLAY-002), death/respawn
loop (POLISH-001), then content + performance passes.