---
name: run-vrmcharacter
description: Build, run, and test the VRM Character Electron app. Use when asked to start vrmcharacter, build it, run its smoke test, or interact with the running app.
---

Electron desktop app displaying a 3D VRM/VRoid character with chat and animation. Driven via the smoke test script (headless build verification) or the Vite dev server + Electron (GUI, requires X11).

All paths below are relative to the repo root.

## Prerequisites

```bash
sudo apt-get update
sudo apt-get install -y xvfb libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xauth
```

Node.js 18+ and npm.

## Setup

```bash
npm install
```

## Build

```bash
npm run build
```

Produces `dist/` (renderer), `dist-electron/` (main + preload), and `release/` (AppImage).

## Run (agent path)

Run the smoke test to verify the build and all key modules:

```bash
node scripts/smoke-test.mjs
```

This checks:
- Build output files exist and are valid
- Source files contain expected logger integration
- AnimationController keyword mappings are present
- AnimationRemapper exports are correct
- Animation index is valid
- Electron main/preload IPC handlers exist

Expected output: `19 passed, 0 failed`.

To enable diagnostic logging during development:

```bash
VITE_DEBUG_LOGS=1 npm run dev
```

## Run (human path)

```bash
npm run dev    # → Vite dev server + Electron window opens. Ctrl-C to stop.
```

Requires a display server (X11/Wayland) — not usable headless.

## Test

Smoke test (no test framework configured):

```bash
node scripts/smoke-test.mjs
```

Animation retargeting test (loads VRM + FBX files, runs full retargeting pipeline):

```bash
npx tsx scripts/test-animations.ts [vrm-path]
```

## Gotchas

- **`npm run build` fails with `isBone` error** — `THREE.Object3D` doesn't have `isBone` on all versions. Fixed with a cast in AnimationPlayer.tsx line 300.
- **Vite dev server auto-launches Electron** via `vite-plugin-electron` — no separate Electron launch command needed.
- **Diagnostic logs are off by default** — enable with `VITE_DEBUG_LOGS=1` env var or `window.__DEBUG_LOGGING__ = true` at runtime. Categories: `App`, `AnimationPlayer`, `CharacterModel`, `AnimationRemapper`, `AnimationLoader`, `PartSwapper`, `ChatPanel`. `Global` (error handlers) always on.

## Troubleshooting

- **Build fails with TypeScript errors on `isBone`**: Cast the property access — `(obj as THREE.Object3D & { isBone?: boolean }).isBone`.
- **Electron won't start (missing libraries)**: Install `libgtk-3-0 libnss3 libxss1 libxtst6 libnotify4` via apt.
- **VRM auto-load not working**: Check `VITE_VRM_PATH` env var points to a valid `.vrm` file, or the app will try to restore from localStorage.
