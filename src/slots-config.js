// Shared slot definitions used by both the renderer (UI) and the exporter.
// Derived from weapon-sound-map.js so the weapon list / named-sound counts
// only need to be edited in one place.
const WEAPON_MAP = require("./weapon-sound-map");

module.exports = WEAPON_MAP.map(cat => ({
  id: cat.id,
  label: cat.label,
  desc: cat.desc,
  multi: true,
  weapons: cat.weapons,
  variants: cat.variants
}));
