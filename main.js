const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const archiver = require("archiver");
const SLOTS = require("./src/slots-config");

let loginWin, mainWin;

// keys.json ships next to the app and is also copied into userData on first
// run so it can be edited/updated without touching the packaged app files.
const bundledKeysPath = path.join(__dirname, "keys.json");
const liveKeysPath = path.join(app.getPath("userData"), "keys.json");

function ensureKeysFile() {
  if (!fs.existsSync(liveKeysPath)) {
    fs.copyFileSync(bundledKeysPath, liveKeysPath);
  }
}

function loadKeys() {
  ensureKeysFile();
  return JSON.parse(fs.readFileSync(liveKeysPath, "utf-8"));
}

function saveKeys(data) {
  fs.writeFileSync(liveKeysPath, JSON.stringify(data, null, 2));
}

function machineId() {
  // Simple, non-invasive machine fingerprint (hostname + platform + arch hash).
  const raw = `${require("os").hostname()}|${process.platform}|${process.arch}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

function createLoginWindow() {
  loginWin = new BrowserWindow({
    width: 420,
    height: 560,
    resizable: false,
    frame: true,
    title: "jrz's Soundpack Tool",
    backgroundColor: "#0b0b0d",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  loginWin.setMenuBarVisibility(false);
  loginWin.loadFile(path.join(__dirname, "src", "login.html"));
}

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 1000,
    minHeight: 640,
    title: "jrz's Soundpack Tool",
    backgroundColor: "#0b0b0d",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWin.setMenuBarVisibility(false);
  mainWin.loadFile(path.join(__dirname, "src", "index.html"));
}

app.whenReady().then(createLoginWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---------- Auth ----------
ipcMain.handle("auth:check", (_evt, keyInput) => {
  const data = loadKeys();
  const key = data.keys.find(k => k.key.trim().toUpperCase() === String(keyInput).trim().toUpperCase());

  if (!key) return { ok: false, error: "That key doesn't exist." };
  if (!key.active) return { ok: false, error: "That key has been disabled." };

  const mid = machineId();
  if (data.lockToMachine) {
    if (key.machineId && key.machineId !== mid) {
      return { ok: false, error: "That key is already activated on another PC." };
    }
    if (!key.machineId) {
      key.machineId = mid;
      saveKeys(data);
    }
  }

  return { ok: true, owner: key.owner || "User" };
});

ipcMain.handle("auth:success", () => {
  createMainWindow();
  if (loginWin) loginWin.close();
});

// ---------- Slot config ----------
ipcMain.handle("slots:get", () => SLOTS);

// ---------- File picking ----------
ipcMain.handle("files:pick", async (_evt, { multi }) => {
  const res = await dialog.showOpenDialog(mainWin, {
    title: "Choose audio file(s)",
    filters: [{ name: "Audio", extensions: ["wav", "ogg", "mp3"] }],
    properties: multi ? ["openFile", "multiSelections"] : ["openFile"]
  });
  if (res.canceled) return [];
  return res.filePaths.map(p => ({ path: p, name: path.basename(p) }));
});

// ---------- Export ----------
// Builds a plain FiveM resource (fxmanifest + audio + a client-side trigger
// script) - NOT an encrypted GTA5 .rpf. See README in the export for why.
ipcMain.handle("export:build", async (_evt, { resourceName, assignments }) => {
  const save = await dialog.showSaveDialog(mainWin, {
    title: "Save sound pack",
    defaultPath: `${resourceName || "jrz_soundpack"}.zip`,
    filters: [{ name: "Zip archive", extensions: ["zip"] }]
  });
  if (save.canceled || !save.filePath) return { ok: false, canceled: true };

  const tmpRoot = fs.mkdtempSync(path.join(require("os").tmpdir(), "jrzpack-"));
  const resName = (resourceName || "jrz_soundpack").replace(/[^a-z0-9_\-]/gi, "_");
  const resDir = path.join(tmpRoot, resName);
  const soundsDir = path.join(resDir, "sounds");
  fs.mkdirSync(soundsDir, { recursive: true });

  const manifestLines = [];
  const clientTriggers = [];
  let fileCount = 0;

  for (const slot of SLOTS) {
    const files = assignments[slot.id] || [];
    if (!files.length) continue;

    const slotDir = path.join(soundsDir, slot.id);
    fs.mkdirSync(slotDir, { recursive: true });

    const copiedNames = [];
    files.forEach((f, i) => {
      const ext = path.extname(f.path) || ".wav";
      const destName = `${slot.id}_${i + 1}${ext}`;
      fs.copyFileSync(f.path, path.join(slotDir, destName));
      copiedNames.push(`sounds/${slot.id}/${destName}`);
      fileCount++;
    });

    manifestLines.push(`file 'sounds/${slot.id}/*'`);
    clientTriggers.push({ slot: slot.id, files: copiedNames });
  }

  const fxmanifest = `fx_version 'cerulean'
game 'gta5'

name '${resName}'
description 'Custom weapon sound pack - built with jrz\\'s Soundpack Tool'
author 'jrz'
version '1.0.0'

client_script 'client.lua'
ui_page 'nui/player.html'

files {
  'nui/player.html',
${manifestLines.map(l => "  '" + l.replace(/^file '/, "").replace(/'$/, "") + "',").join("\n")}
}
`;
  fs.writeFileSync(path.join(resDir, "fxmanifest.lua"), fxmanifest);

  const clientLua = `-- jrz's Soundpack Tool export
-- This resource does NOT modify the game's encrypted audio banks (.rpf).
-- Instead it plays your custom sounds through an invisible NUI overlay,
-- triggered client-side on weapon fire / reload / footsteps.
-- Tune the trigger conditions below for your server if needed.

local slotFiles = ${JSON.stringify(
    Object.fromEntries(clientTriggers.map(t => [t.slot, t.files])),
    null,
    2
  )}

local function playRandom(slot)
  local files = slotFiles[slot]
  if not files or #files == 0 then return end
  local pick = files[math.random(1, #files)]
  SendNUIMessage({ action = "play", src = pick })
end

CreateThread(function()
  local wasShooting, wasReloading = false, false
  while true do
    Wait(0)
    local ped = PlayerPedId()
    local shooting = IsPedShooting(ped)
    local reloading = IsPedReloading(ped)

    if shooting and not wasShooting then
      local weapon = GetSelectedPedWeapon(ped)
      local group = GetWeapontypeGroup(weapon)
      -- crude weapon-group -> slot mapping, adjust hashes as you like
      if slotFiles.pistols and group == GetHashKey('GROUP_PISTOL') then playRandom('pistols')
      elseif slotFiles.smgs and group == GetHashKey('GROUP_SMG') then playRandom('smgs')
      elseif slotFiles.rifles and group == GetHashKey('GROUP_RIFLE') then playRandom('rifles')
      elseif slotFiles.shotguns and group == GetHashKey('GROUP_SHOTGUN') then playRandom('shotguns')
      elseif slotFiles.snipers and group == GetHashKey('GROUP_SNIPER') then playRandom('snipers')
      elseif slotFiles.mgs and group == GetHashKey('GROUP_MG') then playRandom('mgs')
      elseif slotFiles.heavy and group == GetHashKey('GROUP_HEAVY') then playRandom('heavy')
      else playRandom('all') end
      playRandom('casings')
    end

    if reloading and not wasReloading then
      playRandom('reload')
    end

    wasShooting, wasReloading = shooting, reloading
  end
end)

CreateThread(function()
  local wasMoving = false
  while true do
    Wait(150)
    local ped = PlayerPedId()
    local moving = IsPedRunning(ped) or IsPedSprinting(ped) or IsPedWalking(ped)
    if moving and not wasMoving then playRandom('footsteps') end
    wasMoving = moving
  end
end)

-- Headshot: fires when YOU land a headshot kill on another ped.
AddEventHandler('gameEventTriggered', function(name, args)
  if name == 'CEventNetworkEntityDamage' then
    local victim, attacker, _, _, isDead, weapon, isHeadshot = args[1], args[2], args[3], args[4], args[5], args[6], args[7]
    if attacker == PlayerPedId() and isDead == 1 and isHeadshot == 1 then
      playRandom('headshot')
    end
  end
end)
`;
  fs.writeFileSync(path.join(resDir, "client.lua"), clientLua);

  fs.mkdirSync(path.join(resDir, "nui"), { recursive: true });
  fs.writeFileSync(
    path.join(resDir, "nui", "player.html"),
    `<!doctype html><html><body style="margin:0">
<script>
window.addEventListener('message', (e) => {
  if (e.data.action === 'play') {
    const a = new Audio(e.data.src);
    a.play().catch(()=>{});
  }
});
</script>
</body></html>`
  );

  fs.writeFileSync(
    path.join(resDir, "README.txt"),
    `${resName}
Built with jrz's Soundpack Tool

WHAT THIS IS
This is a plain FiveM resource folder (fxmanifest.lua + sounds + a client
script), not an encrypted GTA5 .rpf archive. Real .rpf archives are AES/NG
encrypted and can only be rebuilt using proprietary keys pulled from
GTA5.exe, which this tool intentionally does not do.

Instead, client.lua plays your sounds through a small invisible NUI overlay
whenever it detects you firing, reloading, moving, or landing a headshot
kill. This is the same trick most "custom gunshot sound" FiveM resources
use. Treat the trigger logic in client.lua as a starting point - test it on
your server and adjust the weapon-group mapping / trigger conditions as
needed.

INSTALL
1. Drop the '${resName}' folder into your server's resources directory.
2. Add "ensure ${resName}" to your server.cfg.
3. Restart the resource / server.

Files packed: ${fileCount}
`
  );

  const output = fs.createWriteStream(save.filePath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  await new Promise((resolve, reject) => {
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(resDir, resName);
    archive.finalize();
  });

  fs.rmSync(tmpRoot, { recursive: true, force: true });

  return { ok: true, path: save.filePath, fileCount };
});

ipcMain.handle("shell:showInFolder", (_evt, filePath) => {
  shell.showItemInFolder(filePath);
});
