// src/net/protocol.js
// Multiplayer wire protocol. The map is multiplayer-ready: this module defines
// message types, a transport interface (WebSocket) and a deterministic
// snapshot format. A dedicated relay server (not part of this repo) forwards
// messages between clients; the game simulation stays client-side with this
// protocol for position/state sync.
export const MSG = {
  JOIN: 0,        // { name, team }
  LEAVE: 1,       // { id }
  STATE: 2,       // { t, players: [{id, x, y, z, yaw, pitch, hp, team, weapon, alive}] }
  SHOT: 3,        // { id, x, y, z, dx, dy, dz, weapon }
  HIT: 4,         // { shooter, target, dmg }
  RESPAWN: 5,     // { id, x, z, team }
  CHAT: 6,        // { id, text }
  PING: 7,        // { t }
};

export const TEAM = { ALLIED: 'allied', AXIS: 'axis' };

export function encode(msg) {
  return JSON.stringify(msg);
}

export function decode(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Transport abstraction: WebSocket for real multiplayer.
export class NetClient {
  constructor(url, handlers) {
    this.handlers = handlers || {};
    this.ws = null;
    this.connected = false;
    this.url = url;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => {
        this.connected = true;
        if (this.handlers.onOpen) this.handlers.onOpen();
        this.send({ t: MSG.JOIN, name: 'soldier', team: TEAM.ALLIED });
      };
      this.ws.onmessage = (e) => {
        const msg = decode(e.data);
        if (msg && this.handlers.onMessage) this.handlers.onMessage(msg);
      };
      this.ws.onclose = () => {
        this.connected = false;
        if (this.handlers.onClose) this.handlers.onClose();
      };
    } catch {
      if (this.handlers.onError) this.handlers.onError();
    }
  }

  send(msg) {
    if (this.connected) this.ws.send(encode(msg));
  }

  updateState(playerState) {
    this.send({ t: MSG.STATE, ...playerState });
  }

  shoot(shot) {
    this.send({ t: MSG.SHOT, ...shot });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

// Deterministic player snapshot used by both local sim and network sync
export function makeSnapshot(player) {
  return {
    t: performance.now(),
    x: player.pos.x, y: player.pos.y, z: player.pos.z,
    yaw: player.yaw, pitch: player.pitch,
    hp: player.health, team: player.team, weapon: player.weaponIndex || 0,
    alive: player.alive,
  };
}