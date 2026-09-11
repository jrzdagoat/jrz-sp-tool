// Shared slot definitions used by both the renderer (UI) and the exporter (main process).
// Each slot = one drop target the user assigns one or more audio files to.
module.exports = [
  { id: "headshot",   label: "Headshot",     desc: "Plays only on a headshot.",                 multi: true  },
  { id: "all",        label: "All weapons",  desc: "One sound for every gun (fallback if a category below is empty).", multi: true },
  { id: "pistols",    label: "Pistols",      desc: "Pistol, Combat, .50, PDW, Rubber.",          multi: true  },
  { id: "smgs",       label: "SMGs",         desc: "Micro SMG and SMG.",                         multi: true  },
  { id: "rifles",     label: "Rifles",       desc: "Assault Rifle, Carbine and the rest of the rifle family.", multi: true },
  { id: "shotguns",   label: "Shotguns",     desc: "Pump and Bullpup.",                          multi: true  },
  { id: "snipers",    label: "Snipers",      desc: "Sniper and Heavy Sniper.",                   multi: true  },
  { id: "mgs",        label: "Machine guns", desc: "Combat MG, MG, Vers, GC.",                   multi: true  },
  { id: "heavy",      label: "Heavy",        desc: "RPG, Minigun, Launcher, Railgun, Tank.",     multi: true  },
  { id: "reload",     label: "Reload",       desc: "Magazines, bolts and chambering. No unique gun sound.", multi: true },
  { id: "casings",    label: "Shell casings",desc: "The clank after a shot - casings hitting the ground.", multi: true },
  { id: "footsteps",  label: "Footsteps",    desc: "Your footsteps and movement on average ground.", multi: true }
];
