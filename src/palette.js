// ww2-trench-warfare / src/palette.js
// Global color palette - desaturated, grim, toy-like. No textures, solid colors only.

export const PALETTE = {
  // Ground & mud
  muddyBrown: 0x5C4A3A,
  darkMud: 0x3E3429,
  mudPuddle: 0x40382E,
  parapetSoil: 0x54402F,

  // Trench structure
  trenchGrey: 0x8A8A8A,
  woodPlank: 0x6B4F3A,
  woodDark: 0x4A3527,
  duckboard: 0x75553C,
  supportBeam: 0x5A4230,

  // Foliage / military
  oliveDrab: 0x4B5320,
  oliveDark: 0x3A3F22,
  sandbagTan: 0x6E6250,
  sandbagDark: 0x5C5142,
  helmGreen: 0x2F3517,
  helmGrey: 0x555A5E,

  // Structures
  steel: 0x7A7F85,
  steelDark: 0x565B60,
  concrete: 0x9A9A94,
  concreteDark: 0x7E7E78,

  // Environment
  water: 0x3A4A52,
  waterDark: 0x33404A,
  smoke: 0xB9B9B9,
  skyOvercast: 0x9AA0A6,
  fog: 0x8E949A,

  // Accents
  lanternGlow: 0xD8A03C,
  barrelMetal: 0x3A3D40,
  brass: 0x8C7A4A,
  mudDark: 0x2E2620,
  rainGrey: 0xC4C8CC,

  // Bots
  uniformAllied: 0x4B5320, // olive drab
  uniformAxis: 0x5A5C50,   // field grey
  skin: 0xB89B7A,
};

export const MATERIAL_PRESETS = {
  plastic: 0.9,  // specular-ish, matte plastic look
  matte: 1.0,    // fully matte
};

export function hexToRgb(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

export function withLuminance(hex, factor) {
  const [r, g, b] = hexToRgb(hex);
  const f = Math.max(0, Math.min(2, factor));
  return (Math.min(255, Math.round(r * f)) << 16) | (Math.min(255, Math.round(g * f)) << 8) | Math.min(255, Math.round(b * f));
}