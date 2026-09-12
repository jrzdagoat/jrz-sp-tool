# jrz's Soundpack Tool

An Electron desktop app: sign in with a license key, drag your custom weapon
sounds onto slots (Headshot, Pistols, SMGs, Rifles, Shotguns, Snipers,
Machine guns, Heavy, Suppressed, Reload, Shell casings, Footsteps...), then
export a ready-to-drop FiveM resource.

Works with any soundpack - you only fill in the slots you have audio for;
anything left empty is never generated and never touched. Weapon-specific
slots (pistols, smgs, rifles, shotguns, snipers, mgs, heavy, suppressed)
take the file(s) you drop and duplicate/rename them across every individual
weapon + variant in that category - e.g. one file dropped on "Suppressed"
becomes 6 separately-named files, one per suppressed weapon; one file on
"Pistols" becomes a `shot` + `shot_first` pair for each of the 11 pistols.
Edit `src/weapon-sound-map.js` to change which weapons/variants each slot
covers.

## Important: what "export" actually produces

Real GTA5 `.rpf` archives are AES/NG-encrypted, and rebuilding them requires
extracting Rockstar's proprietary keys out of `GTA5.exe` — that's DRM
circumvention, so this tool doesn't do it.

Instead, export produces a **plain FiveM resource** (`fxmanifest.lua` +
your audio files + a small `client.lua`) that plays your sounds through an
invisible NUI overlay when it detects weapon fire, reload, movement, or a
headshot kill. This is the same general technique most "custom gunshot
sound" FiveM resources use. Treat the trigger logic in the generated
`client.lua` as a starting point — test it on your server and tune the
weapon-group mapping / detection conditions as needed.

## Run it

```
npm install
npm start
```

## Add / manage license keys

Use `keygen.js` (no extra install needed — plain Node, same runtime the app
uses):

```
node keygen.js generate --owner "SomeCustomer" --plan 30         # 30-day key
node keygen.js generate --owner "SomeCustomer" --plan 60         # 60-day key
node keygen.js generate --owner "SomeCustomer" --plan 90         # 90-day key
node keygen.js generate --owner "SomeCustomer" --plan lifetime   # never expires
node keygen.js list                                              # every key + VALID/INVALID status
node keygen.js check JRZ-XXXX-XXXX-XXXX                           # valid/invalid + why
node keygen.js deactivate JRZ-XXXX-XXXX-XXXX                      # disable a key
node keygen.js activate JRZ-XXXX-XXXX-XXXX                        # re-enable it
node keygen.js delete JRZ-XXXX-XXXX-XXXX                          # remove it entirely
```

By default it reads/writes `keys.json` next to itself; pass `--file path`
to point at a different copy (e.g. the live one an already-installed app
is using, at `%APPDATA%/jrz's Soundpack Tool/keys.json` on Windows).

Keys look like:

```json
{
  "key": "JRZ-XXXX-XXXX-XXXX",
  "owner": "SomeCustomer",
  "active": true,
  "machineId": null,
  "createdAt": "2026-09-12T00:00:00.000Z",
  "plan": "30-day",
  "expiresAt": "2026-10-12T00:00:00.000Z"
}
```

- `active: false` disables a key without deleting it (same as `deactivate`).
- `expiresAt: null` = lifetime key, never expires.
- The app (`main.js` `auth:check`) now rejects a key if it's inactive OR
  past its `expiresAt`, in addition to the existing machine-lock check.
- `lockToMachine: true` ties a key to the first PC it's used on (simple
  hostname/platform fingerprint — not tamper-proof, just a basic single-seat
  lock).

This is a local, offline key list — good enough for gating your own tool
among friends/customers, but anyone with access to the installed app's
files can technically edit it. If you want real revocation/analytics later,
swap `auth:check` in `main.js` for a call to your own small backend.

## Build a distributable .exe

```
npm install
npm run dist
```

Output goes to `dist/`.

## Building via GitHub instead

A workflow at `.github/workflows/build.yml` builds the Windows `.exe` on
GitHub's own runners — useful if you don't want to build locally, or want a
build to happen automatically every time you tag a release.

- Push a tag like `v1.0.1` and it builds automatically and attaches the
  `.exe` to a GitHub Release.
- Or trigger it manually from the Actions tab (`workflow_dispatch`) and
  grab the `.exe` from the run's Artifacts.

**Before making the repo public**, know that the committed `keys.json`
only has the demo key in it — if you swap in real customer keys, keep the
repo private, or move real keys out of the committed file (e.g. add
`keys.json` to `.gitignore` and only ship it inside built releases, not in
source control).

## Project structure

```
main.js            Electron main process: auth, file dialogs, packaging
preload.js          Safe IPC bridge exposed to the renderer
keys.json            Default/starter license key list
src/slots-config.js  The list of sound slots (edit to add/remove categories)
src/login.html/js    Key-auth screen
src/index.html       Main board window
src/renderer.js      Board UI logic (drag & drop, export button)
src/styles.css        Shared dark theme
```
