// Weapon sound mapping used by both the renderer (UI) and the exporter.
//
// This is the piece you edit to match your own soundpack / naming scheme.
// It does NOT touch or rebuild any encrypted .rpf game archive - it only
// decides, for a category the user drops one (or a few) sound file(s) onto:
//   1. which in-game weapons that category covers (by their public
//      WEAPON_* names, the same ones used in FiveM/GTA scripting natives)
//   2. how many differently-named output files to generate per weapon
//      (e.g. a "first shot" variant vs the normal loop, or a suppressed
//      variant), so a single dropped sound gets duplicated/renamed across
//      every name your downstream setup expects.
//
// Nothing here is secret or encrypted - WEAPON_* identifiers are just
// public scripting-API string names. Feel free to add/remove weapons or
// rename variants; the exporter just walks this table.

// Reusable weapon name lists.
const PISTOLS = [
  "WEAPON_PISTOL", "WEAPON_COMBATPISTOL", "WEAPON_PISTOL50", "WEAPON_SNSPISTOL",
  "WEAPON_HEAVYPISTOL", "WEAPON_VINTAGEPISTOL", "WEAPON_MARKSMANPISTOL",
  "WEAPON_REVOLVER", "WEAPON_DOUBLEACTION", "WEAPON_CERAMICPISTOL", "WEAPON_NAVYREVOLVER"
];
const SMGS = [
  "WEAPON_MICROSMG", "WEAPON_SMG", "WEAPON_SMG_MK2", "WEAPON_ASSAULTSMG",
  "WEAPON_COMBATPDW", "WEAPON_MACHINEPISTOL", "WEAPON_MINISMG"
];
const RIFLES = [
  "WEAPON_ASSAULTRIFLE", "WEAPON_ASSAULTRIFLE_MK2", "WEAPON_CARBINERIFLE",
  "WEAPON_CARBINERIFLE_MK2", "WEAPON_ADVANCEDRIFLE", "WEAPON_SPECIALCARBINE",
  "WEAPON_SPECIALCARBINE_MK2", "WEAPON_BULLPUPRIFLE", "WEAPON_BULLPUPRIFLE_MK2",
  "WEAPON_COMPACTRIFLE", "WEAPON_MILITARYRIFLE", "WEAPON_HEAVYRIFLE"
];
const SHOTGUNS = [
  "WEAPON_PUMPSHOTGUN", "WEAPON_PUMPSHOTGUN_MK2", "WEAPON_SAWNOFFSHOTGUN",
  "WEAPON_BULLPUPSHOTGUN", "WEAPON_ASSAULTSHOTGUN", "WEAPON_HEAVYSHOTGUN",
  "WEAPON_DBSHOTGUN", "WEAPON_MUSKET", "WEAPON_COMBATSHOTGUN"
];
const SNIPERS = [
  "WEAPON_SNIPERRIFLE", "WEAPON_HEAVYSNIPER", "WEAPON_HEAVYSNIPER_MK2", "WEAPON_MARKSMANRIFLE"
];
const MGS = [
  "WEAPON_MG", "WEAPON_COMBATMG", "WEAPON_COMBATMG_MK2", "WEAPON_GUSENBERG"
];
const HEAVY = [
  "WEAPON_RPG", "WEAPON_MINIGUN", "WEAPON_GRENADELAUNCHER", "WEAPON_GRENADELAUNCHER_SMOKE",
  "WEAPON_RAILGUN", "WEAPON_HOMINGLAUNCHER", "WEAPON_COMPACTLAUNCHER", "WEAPON_RAYMINIGUN"
];
// Weapons that commonly get a distinct suppressed-fire sound in packs -
// trim/extend this to whichever variants your soundpack actually covers.
const SUPPRESSED = [
  "WEAPON_COMBATPISTOL", "WEAPON_MICROSMG", "WEAPON_ASSAULTRIFLE",
  "WEAPON_CARBINERIFLE", "WEAPON_SPECIALCARBINE", "WEAPON_MARKSMANRIFLE"
];

// variants: the output-file suffixes generated PER WEAPON in the list.
// One dropped sound -> (weapons.length * variants.length) named files.
// e.g. combat pistol alone with 2 variants = 2 named sounds, as in your example.
module.exports = [
  { id: "headshot",  label: "Headshot",      desc: "Plays only on a headshot kill.",
    weapons: ["ANY"], variants: [""] },
  { id: "all",       label: "All weapons",   desc: "Fallback for any weapon not covered by a category below.",
    weapons: ["ANY"], variants: [""] },
  { id: "pistols",   label: "Pistols",       desc: `${PISTOLS.length} pistols x 2 variants (shot, first shot).`,
    weapons: PISTOLS, variants: ["shot", "shot_first"] },
  { id: "smgs",      label: "SMGs",          desc: `${SMGS.length} SMGs x 2 variants (shot, first shot).`,
    weapons: SMGS, variants: ["shot", "shot_first"] },
  { id: "rifles",    label: "Rifles",        desc: `${RIFLES.length} rifles x 2 variants (shot, first shot).`,
    weapons: RIFLES, variants: ["shot", "shot_first"] },
  { id: "shotguns",  label: "Shotguns",      desc: `${SHOTGUNS.length} shotguns x 2 variants (shot, first shot).`,
    weapons: SHOTGUNS, variants: ["shot", "shot_first"] },
  { id: "snipers",   label: "Snipers",       desc: `${SNIPERS.length} snipers x 2 variants (shot, tail).`,
    weapons: SNIPERS, variants: ["shot", "shot_tail"] },
  { id: "mgs",       label: "Machine guns",  desc: `${MGS.length} machine guns x 2 variants (shot, first shot).`,
    weapons: MGS, variants: ["shot", "shot_first"] },
  { id: "heavy",     label: "Heavy",         desc: `${HEAVY.length} heavy weapons x 1 variant.`,
    weapons: HEAVY, variants: ["shot"] },
  { id: "suppressed", label: "Suppressed",   desc: `${SUPPRESSED.length} suppressed variants x 1 - one sound renamed across all ${SUPPRESSED.length}.`,
    weapons: SUPPRESSED, variants: ["shot_suppressed"] },
  { id: "reload",    label: "Reload",        desc: "Magazines, bolts, chambering. No per-weapon split.",
    weapons: ["ANY"], variants: [""] },
  { id: "casings",   label: "Shell casings", desc: "Casings hitting the ground after a shot.",
    weapons: ["ANY"], variants: [""] },
  { id: "footsteps", label: "Footsteps",     desc: "Movement on average ground.",
    weapons: ["ANY"], variants: [""] }
];
