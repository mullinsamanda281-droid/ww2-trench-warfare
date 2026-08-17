// tests/net-tests.js
// Headless test of the multiplayer relay using two real WebSocket clients.
import { WebSocket } from 'ws';
import { MSG } from '../src/net/protocol.js';

let passed = 0;
let failed = 0;
function assert(cond, name, detail) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

console.log('=== NETWORK TESTS ===\n');

const PORT = 8123;
let server;
let start;
try {
  ({ start } = await import('../server/index.js'));
  server = await start(PORT);
} catch (e) {
  console.log(`  FAIL  server boot: ${e.message}`);
  process.exit(1);
}

const url = `ws://localhost:${PORT}/ws`;

// Connect and wait for the WS 'open' event (handshake complete).
// The server sends a JOIN/hello immediately after connection, which lands
// in the client's onmessage queue; we resolve after 'open' so that message
// has arrived.
function connect() {
  const ws = new WebSocket(url);
  const queue = [];
  ws.on('message', (raw) => queue.push(JSON.parse(raw.toString())));
  return new Promise((resolve) => {
    ws.once('open', () => resolve({ ws, queue }));
    ws.once('error', () => resolve({ ws, queue, error: true }));
  });
}

// Client A joins first -> allied
const a = await connect();
const helloA = a.queue.find((m) => m.t === MSG.JOIN && m.hello);
assert(helloA && helloA.team === 'allied', 'first client gets allied team');
assert(helloA && helloA.peers === 0, 'first client has 0 peers');

// Client B joins -> axis
const b = await connect();
await new Promise((r) => setTimeout(r, 80));
const helloB = b.queue.find((m) => m.t === MSG.JOIN && m.hello);
assert(helloB && helloB.team === 'axis', 'second client gets axis team');
assert(helloB && helloB.peers === 1, 'second client has 1 peer');

// A sends a state snapshot -> B receives it
a.ws.send(JSON.stringify({ t: MSG.STATE, x: 1.5, y: -1.05, z: 22.5, yaw: 0.2, hp: 80, alive: true, team: 'allied' }));
await new Promise((r) => setTimeout(r, 80));
const relayed = b.queue.find((m) => m.t === MSG.STATE);
assert(relayed && relayed.t === MSG.STATE, 'state snapshot relayed to peer');
assert(relayed && Math.abs(relayed.x - 1.5) < 0.001 && Math.abs(relayed.z - 22.5) < 0.001, 'snapshot payload intact');

// B replies -> A receives it
b.ws.send(JSON.stringify({ t: MSG.STATE, x: -2, y: -1.05, z: -22.5, yaw: -0.1, hp: 100, alive: true, team: 'axis' }));
await new Promise((r) => setTimeout(r, 80));
const back = a.queue.find((m) => m.t === MSG.STATE);
assert(back && back.t === MSG.STATE, 'reply received by A');

// SHOT relays too
a.ws.send(JSON.stringify({ t: MSG.SHOT, x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: -1, weapon: 0 }));
await new Promise((r) => setTimeout(r, 80));
const shot = b.queue.find((m) => m.t === MSG.SHOT);
assert(shot && shot.t === MSG.SHOT, 'SHOT relayed to peer');

// A disconnects -> B receives LEAVE
a.ws.close();
await new Promise((r) => setTimeout(r, 1000));
const leave = b.queue.find((m) => m.t === MSG.LEAVE);
assert(leave && leave.id === helloA.myId, 'LEAVE relayed on disconnect', `leave.id=${leave ? leave.id : 'none'}, helloA.myId=${helloA.myId}`);

// A new client after A leaves should get allied again (join order preserved)
const c = await connect();
await new Promise((r) => setTimeout(r, 80));
const helloC = c.queue.find((m) => m.t === MSG.JOIN && m.hello);
assert(helloC && helloC.team === 'allied', 'next client after leave gets allied team');

// cleanup
b.ws.close();
c.ws.close();
server.close();

console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);