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

ID: GAME-QA-001
TITLE: Automated browser smoke test (headless)
CATEGORY: QA
PRIORITY: MEDIUM
COMPLEXITY: HIGH
DESCRIPTION: Drive the real page in a headless browser (puppeteer/playwright):
assert no console errors, pointer lock engages, game loop advances frames.
ACCEPTANCE:
- [ ] Zero console errors on boot
- [ ] Frames advance after ENTER clicked
STATUS: BLOCKED
- No headless browser binary available in this environment; simulated playtesting (see Phase 50 loop) can substitute until a browser is installed.

ID: GAME-AUDIO-002
TITLE: Footstep material varieties (concrete, sand, metal)
CATEGORY: Audio
PRIORITY: MEDIUM
COMPLEXITY: LOW
DEPENDENCIES: sound.js step() existing surface detection
DESCRIPTION: The step() function currently supports wood/mud/water. Add concrete, sand,
and metal surfaces with distinct volume/character, and a generic impact sound for
unmapped surfaces. Extend main.js surfaceAt() to classify terrain types at the player's
feet.
ACCEPTANCE:
- [ ] Concrete: quieter than wood, muffled attack
- [ ] Sand: quieter, more hiss, granular texture
- [ ] Metal: louder, sharper attack, longer decay
- [ ] Unmapped surfaces fall back to a default impact sound
- [ ] Footstep volumes mix correctly with gunfire and ambient
STATUS: READY

ID: GAME-NET-002
TITLE: Relay chat between connected players
CATEGORY: Multiplayer
PRIORITY: MEDIUM
COMPLEXITY: MEDIUM
DEPENDENCIES: server/index.js relay infrastructure, protocol.js CHAT msg type
DESCRIPTION: Extend the 2-player relay so each player can type messages that appear
in the local HUD for the other player to read. Adds a CHAT message type, a minimal
on-screen text field, and relay logic. Designed for 2 players only; more players
would need a lobby system.
ACCEPTANCE:
- [ ] Player A types a message, Player B sees it in the HUD
- [ ] Messages are relayed via the existing WS relay
- [ ] Chat input dismisses after send, field clears
- [ ] Chat persists across rounds (until either player leaves)
STATUS: READY

ID: GAME-BAL-001
TITLE: Balance hit chance and damage falloff per range
CATEGORY: Gameplay
PRIORITY: MEDIUM
COMPLEXITY: LOW
DEPENDENCIES: soldier.js fireShot hit chance formula
DESCRIPTION: The current hit chance Math.max(0.1, 0.6 - dist*0.005) favors point-blank;
tweak the coefficient and add distance tiers so medium range (~20m) remains viable,
while point-blank has diminishing returns and falloff past 40m is severe.
ACCEPTANCE:
- [ ] Hit chance at 10m >= 35%
- [ ] Hit chance at 20m >= 25%
- [ ] Hit chance at 30m <= 15%
- [ ] Hit chance at 40m <= 5%
- [ ] Rifle damage 32 at point-blank, scaling down to 20 at 40m
- [ ] MG damage 9 at point-blank, scaling down to 5 at 40m
STATUS: DONE

ID: GAME-AI-003
TITLE: Mortar intelligently targets nearest player
CATEGORY: AI
PRIORITY: MEDIUM
COMPLEXITY: LOW
DEPENDENCIES: mortar.js pickTarget player check
DESCRIPTION: Currently the mortar targets completely random coords in NML. Make it
select the nearest living player within ~25m of the mortar pit each cycle, so the
barrage pressures players who are positioned forward and rewards holding the trench.
ACCEPTANCE:
- [ ] Mortar fire() selects player position instead of random coords when a player is alive and within 25m of the pit
- [ ] If multiple players, picks the one with smallest distance
- [ ] Falls back to random when no players are alive or all are beyond 25m
STATUS: DONE

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
STATUS: DONE

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
STATUS: DONE

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
STATUS: DONE

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
STATUS: DONE

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
STATUS: DONE

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