#!/usr/bin/env node
// Standalone license key manager for jrz's Soundpack Tool.
// Reads/writes the same keys.json format main.js uses - run this on your
// own machine to mint keys for customers, not something the app itself needs.
//
// Usage:
//   node keygen.js generate --owner "SomeCustomer" --plan 30        (30-day key)
//   node keygen.js generate --owner "SomeCustomer" --plan 60        (60-day key)
//   node keygen.js generate --owner "SomeCustomer" --plan 90        (90-day key)
//   node keygen.js generate --owner "SomeCustomer" --plan lifetime  (never expires)
//   node keygen.js list                                             (list every key + status)
//   node keygen.js check JRZ-XXXX-XXXX-XXXX                         (valid / invalid + why)
//   node keygen.js deactivate JRZ-XXXX-XXXX-XXXX
//   node keygen.js activate JRZ-XXXX-XXXX-XXXX
//   node keygen.js delete JRZ-XXXX-XXXX-XXXX
//
// Add --file path/to/keys.json to point at a specific file (defaults to
// ./keys.json next to this script). Same file main.js's loadKeys() reads,
// so keys you generate here show up for the app immediately - just make
// sure you're editing the *live* copy the running app actually uses
// (on Windows that's %APPDATA%/jrz's Soundpack Tool/keys.json once the app
// has run once and copied its own keys.json there), not just the bundled
// starter file, if you want changes to apply to an already-installed app.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PLAN_DAYS = { 30: 30, 60: 60, 90: 90 };

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const positional = [];
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith("--")) {
      const name = a.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[name] = next;
        i++;
      } else {
        flags[name] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { cmd, positional, flags };
}

function keysPath(flags) {
  return path.resolve(flags.file || path.join(__dirname, "keys.json"));
}

function loadKeys(flags) {
  const file = keysPath(flags);
  if (!fs.existsSync(file)) {
    const fresh = { lockToMachine: true, keys: [] };
    fs.writeFileSync(file, JSON.stringify(fresh, null, 2));
    return fresh;
  }
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function saveKeys(flags, data) {
  fs.writeFileSync(keysPath(flags), JSON.stringify(data, null, 2));
}

function randomKey() {
  const block = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `JRZ-${block()}-${block()}-${block()}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function statusOf(key) {
  if (!key.active) return { valid: false, reason: "disabled" };
  if (key.expiresAt) {
    const exp = new Date(key.expiresAt);
    if (Date.now() > exp.getTime()) {
      return { valid: false, reason: `expired ${exp.toLocaleDateString()}` };
    }
    return { valid: true, reason: `expires ${exp.toLocaleDateString()}` };
  }
  return { valid: true, reason: "lifetime" };
}

function findKey(data, keyStr) {
  return data.keys.find(k => k.key.trim().toUpperCase() === String(keyStr).trim().toUpperCase());
}

function cmdGenerate(flags) {
  const plan = String(flags.plan || "").toLowerCase();
  if (!plan || (!PLAN_DAYS[plan] && plan !== "lifetime")) {
    console.error("Pass --plan 30, --plan 60, --plan 90, or --plan lifetime");
    process.exit(1);
  }
  const data = loadKeys(flags);
  const key = flags.key ? String(flags.key).toUpperCase() : randomKey();
  if (findKey(data, key)) {
    console.error(`Key ${key} already exists.`);
    process.exit(1);
  }
  const now = new Date();
  const entry = {
    key,
    owner: flags.owner || "Unnamed",
    active: true,
    machineId: null,
    createdAt: now.toISOString(),
    plan: plan === "lifetime" ? "lifetime" : `${plan}-day`,
    expiresAt: plan === "lifetime" ? null : addDays(now, PLAN_DAYS[plan]).toISOString()
  };
  data.keys.push(entry);
  saveKeys(flags, data);
  console.log(`Generated ${entry.plan} key for ${entry.owner}:`);
  console.log(`  ${entry.key}`);
  console.log(entry.expiresAt ? `  expires ${new Date(entry.expiresAt).toLocaleDateString()}` : "  never expires");
}

function cmdList(flags) {
  const data = loadKeys(flags);
  if (!data.keys.length) {
    console.log("No keys yet.");
    return;
  }
  for (const k of data.keys) {
    const s = statusOf(k);
    console.log(
      `${k.key}  ${(k.owner || "").padEnd(16)}  ${(k.plan || "?").padEnd(10)}  ` +
      `${s.valid ? "VALID" : "INVALID"} (${s.reason})` +
      `${k.machineId ? "  [activated]" : ""}`
    );
  }
}

function cmdCheck(flags, positional) {
  const key = positional[0];
  if (!key) { console.error("Usage: node keygen.js check <KEY>"); process.exit(1); }
  const data = loadKeys(flags);
  const found = findKey(data, key);
  if (!found) { console.log(`${key}: does not exist`); return; }
  const s = statusOf(found);
  console.log(`${found.key}  owner=${found.owner}  plan=${found.plan}  ${s.valid ? "VALID" : "INVALID"} (${s.reason})`);
}

function setActive(flags, positional, active) {
  const key = positional[0];
  if (!key) { console.error(`Usage: node keygen.js ${active ? "activate" : "deactivate"} <KEY>`); process.exit(1); }
  const data = loadKeys(flags);
  const found = findKey(data, key);
  if (!found) { console.error(`Key ${key} not found.`); process.exit(1); }
  found.active = active;
  saveKeys(flags, data);
  console.log(`${found.key} is now ${active ? "ACTIVE" : "DISABLED"}.`);
}

function cmdDelete(flags, positional) {
  const key = positional[0];
  if (!key) { console.error("Usage: node keygen.js delete <KEY>"); process.exit(1); }
  const data = loadKeys(flags);
  const before = data.keys.length;
  data.keys = data.keys.filter(k => k.key.trim().toUpperCase() !== String(key).trim().toUpperCase());
  if (data.keys.length === before) { console.error(`Key ${key} not found.`); process.exit(1); }
  saveKeys(flags, data);
  console.log(`Deleted ${key}.`);
}

function main() {
  const { cmd, positional, flags } = parseArgs(process.argv.slice(2));
  switch (cmd) {
    case "generate": return cmdGenerate(flags);
    case "list": return cmdList(flags);
    case "check": return cmdCheck(flags, positional);
    case "activate": return setActive(flags, positional, true);
    case "deactivate": return setActive(flags, positional, false);
    case "delete": return cmdDelete(flags, positional);
    default:
      console.log(`jrz keygen - manage license keys for jrz's Soundpack Tool

  node keygen.js generate --owner "Name" --plan 30|60|90|lifetime
  node keygen.js list
  node keygen.js check <KEY>
  node keygen.js activate <KEY>
  node keygen.js deactivate <KEY>
  node keygen.js delete <KEY>

Add --file path/to/keys.json to target a specific file (default: ./keys.json).`);
  }
}

main();
