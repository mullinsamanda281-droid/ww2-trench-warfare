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

ID: GAME-GAMEPLAY-001
TITLE: Bots man the MG positions (aim + sustained bursts over parapet)
CATEGORY: AI
PRIORITY: HIGH
COMPLEXITY: MEDIUM
DEPENDENCIES: none
DESCRIPTION: MG-role bots currently stand on the fire step. Give them dedicated
home positions on the MG platforms, have them aim the MG toward NML, fire long
bursts, and break contact when targeted.
ACCEPTANCE:
- [ ] MG bots spawn on their platform
- [ ] MG visually aims at NML with sustained bursts
- [ ] MG bot takes cover (drops below parapet) after taking fire
TEST_PLAN: Verify bot positions; verify burst cadence; verify duck on hit.
STATUS: READY

ID: GAME-GAMEPLAY-002
TITLE: Enemy tracer fire can hit the player (peek is dangerous)
CATEGORY: Combat
PRIORITY: HIGH
COMPLEXITY: MEDIUM
DEPENDENCIES: GAME-GAMEPLAY-001
DESCRIPTION: Bot bullets currently fire visually but never damage the player.
Implement a bot hitscan: when a bot fires, raycast toward the player's eye;
if the ray crosses the enemy parapet or the player is exposed on the fire step,
apply damage.
ACCEPTANCE:
- [ ] Bot fire damages player when exposed (on fire step / in NML)
- [ ] Crouching on the fire step makes the player untargetable
- [ ] Damage feedback (screen flash, HUD HP drop)
TEST_PLAN: Stand on fire step vs floor; verify damage only when exposed.
STATUS: READY

ID: GAME-POLISH-001
TITLE: Player damage + death + respawn loop polish
CATEGORY: Gameplay
PRIORITY: HIGH
COMPLEXITY: LOW
DEPENDENCIES: GAME-GAMEPLAY-002
DESCRIPTION: Full health/damage/death cycle with clear feedback: hit flash,
death fade, respawn countdown, kill feed counter.
ACCEPTANCE:
- [ ] Hit flash and directional damage indicator
- [ ] Death → fade → respawn at team spawn
- [ ] Kill/death counters shown in HUD
STATUS: READY

ID: GAME-CONTENT-001
TITLE: Bunker interiors made enterable
CATEGORY: Content
PRIORITY: MEDIUM
COMPLEXITY: MEDIUM
DEPENDENCIES: none
DESCRIPTION: The steel bunker and concrete dugout are solid props. Add an
interior: open the doorway in collision, add an interior floor, ammo, lantern.
Gives players a covered MG/defense position.
ACCEPTANCE:
- [ ] Player can walk into the steel bunker and concrete dugout
- [ ] Interior has a firing slit view toward NML
- [ ] Ammo crate inside refills on interact
STATUS: READY

ID: GAME-AUDIO-001
TITLE: Footsteps + impact sounds for movement feedback
CATEGORY: Audio
PRIORITY: MEDIUM
COMPLEXITY: LOW
DEPENDENCIES: none
DESCRIPTION: Synthesized footstep ticks (wood planks vs mud vs water) based on
the surface under the player; bullet impact dust-puff + thud on terrain.
ACCEPTANCE:
- [ ] Footsteps on duckboard vs mud differ
- [ ] Bullet terrain impact has a thud
STATUS: READY

ID: GAME-PERF-001
TITLE: Frustum culling + merged geometry for ground patches
CATEGORY: Performance
PRIORITY: MEDIUM
COMPLEXITY: MEDIUM
DEPENDENCIES: none
DESCRIPTION: 990 draw calls is fine on desktop but high for mobile. Merge
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

ID: GAME-POLISH-002
TITLE: Death of bots: brief fade-out poof (toy-like)
CATEGORY: Polish
PRIORITY: LOW
COMPLEXITY: LOW
DEPENDENCIES: none
DESCRIPTION: Replace the current instant hide with a quick expanding dark puff +
fall-over animation, consistent with "no gore, toy-like" direction.
STATUS: READY

ID: GAME-POLISH-003
TITLE: Aim down sights (right-click) rifle alignment
CATEGORY: Polish
PRIORITY: LOW
COMPLEXITY: LOW
DEPENDENCIES: none
DESCRIPTION: weapon.aiming is wired but the rifle doesn't visually align to
the ironsight; add ADS transition + slight zoom (FOV 75 -> 55).
STATUS: READY

## IN PROGRESS
(none — cycle beginning)

## BLOCKED
(none)

## DONE
- PHASE 1 foundation complete (see above)

## NEXT CYCLE
Gameplay loop completion: bot-vs-player combat (GAMEPLAY-002), death/respawn
loop (POLISH-001), then content + performance passes.