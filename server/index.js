// server/index.js
// Multiplayer relay: serves the static game AND forwards player snapshots
// between connected clients so the map plays as real 2-player (or N-player)
// Trench Warfare. Team assignment is by join order (allied, then axis).
// Game simulation stays client-side; the relay only relays.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { MSG, TEAM } from '../src/net/protocol.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.woff2': 'font/woff2',
};

// --- Matchmaking ---
const rooms = new Map(); // roomId -> Set<client>

function roomFor(client) {
  return rooms.get(client.roomId);
}

function assignRoomAndTeam(client) {
  // Find or create a room (max 8 players).
  let roomId = null;
  for (const [id, members] of rooms) {
    if (members.size < 8) { roomId = id; break; }
  }
  if (!roomId) {
    roomId = `room-${Math.random().toString(36).slice(2, 7)}`;
    const members = new Set();
    members.joinIndex = 0; // persistent counter for team assignment
    rooms.set(roomId, members);
  }
  const members = rooms.get(roomId);
  const team = members.joinIndex % 2 === 0 ? TEAM.ALLIED : TEAM.AXIS;
  client.roomId = roomId;
  client.team = team;
  members.joinIndex++;
  members.add(client);
  return { roomId, team };
}

function relayToPeers(sender, msg) {
  const members = roomFor(sender);
  if (!members) return;
  for (const c of members) {
    if (c !== sender && c.readyState === c.OPEN) {
      c.send(JSON.stringify({ ...msg, from: sender.id }));
    }
  }
}

export function start(port) {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    let filePath = path.normalize(path.join(root, urlPath));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(filePath).pipe(res);
    });
  });

  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const { roomId, team } = assignRoomAndTeam(ws);
    ws.id = `p${Math.random().toString(36).slice(2, 6)}`;
ws.send(JSON.stringify({
  t: MSG.JOIN, hello: true, room: roomId, team,
  peers: roomFor(ws).size - 1,
  myId: ws.id,
}));

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      switch (msg.t) {
        case MSG.STATE:
        case MSG.SHOT:
        case MSG.HIT:
        case MSG.CHAT:
        case MSG.RESPAWN:
        case MSG.LEAVE:
          relayToPeers(ws, msg);
          break;
        default:
          break;
      }
    });

    ws.on('close', () => {
      const members = roomFor(ws);
      if (members) {
        members.delete(ws);
        if (members.size === 0) rooms.delete(ws.roomId);
        else relayToPeers(ws, { t: MSG.LEAVE, id: ws.id });
      }
    });

    ws.on('error', () => {});
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`WW2 Trench Warfare (relay) at http://localhost:${port}  ws://localhost:${port}/ws`);
      resolve(server);
    });
  });
}

// Auto-start when run directly (npm run relay)
const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  start(process.env.PORT || 8080);
}