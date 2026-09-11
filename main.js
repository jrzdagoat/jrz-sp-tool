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

function randomKey() {
  // JRZ-XXXX-XXXX-XXXX using an unambiguous charset (no 0/O/1/I).
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const group = () =>
    Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join("");
  return `JRZ-${group()}-${group()}-${group()}`;
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

ipcMain.handle("auth:generateKey", (_evt, owner) => {
  const data = loadKeys();
  let key;
  do {
    key = randomKey();
  } while (data.keys.some(k => k.key === key)); // avoid a freak collision

  data.keys.push({
    key,
    owner: (owner || "").trim() || "Unnamed",
    active: true,
    machineId: null
  });
  saveKeys(data);
  return { ok: true, key };
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
  if (save.canceled || !save.filePath) return { ok: false,
    