# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Electron desktop app displaying a 3D VRM/VRoid character with chat and customization features. Built with React 19 + TypeScript, Three.js via React Three Fiber, and @pixiv/three-vrm for VRM model loading.

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Start Electron app in dev mode (with HMR)
npm run build            # Type-check, bundle, and package with electron-builder
npm run preview          # Preview the Vite production build in browser
```

TypeScript is configured with `skipLibCheck: false` and `types: ["vite/client"]` — the `vite/client` types are required for `import.meta.env` to resolve.

## Architecture

### Process Model

```
Electron Main (electron/main.ts)
  ├── BrowserWindow → loads Vite dev server URL or dist/index.html
  ├── IPC handlers (preload via contextBridge)
  └── Console capture: webContents.on('console-message') forwards renderer logs to stdout

Electron Renderer (React SPA via Vite HMR)
  ├── App.tsx — root component, manages all state
  ├── CharacterScene — R3F Canvas with lighting, ground, OrbitControls
  ├── AssetPicker — floating panel for body/hair/clothing file selection
  ├── ChatPanel — chat UI, calls MockResponder
  └── Engine layer:
        ├── vrm/CharacterModel.tsx — VRM loader (File or ArrayBuffer), breathing animation
        ├── vrm/AnimationPlayer.tsx — plays Mixamo .glb animations via AnimationMixer
        ├── vrm/PartSwapper.ts — singleton PartSwapper for managing part categories
        └── chat/MockResponder.ts — keyword-based mock chat responder
```

### Key Data Flows

**VRM Loading (file input):**
`App.handleFileChange` → creates `CharacterAsset` with `_file: File` → `CharacterScene` → `CharacterModel` → `loadVrmFrom(File)` → `FileReader` → `GLTFLoader.parse()` → `VRMLoaderPlugin` → model added to scene graph

**VRM Loading (programmatic):**
`VITE_VRM_PATH` env var → `App` useEffect → `window.electronAPI.loadVrmFromPath()` IPC → main process `readFileSync` → `Uint8Array` → `ArrayBuffer` → `CharacterModel` → `loadVrmFromBuffer()` → same GLTF parse path

**Chat Flow:**
`ChatPanel.handleSend` → `App.handleSendMessage` (user message) → `mockResponder.respond()` → `getMockResponse()` (keyword matching) → `App.handleCharacterResponse` (character message + optional animation/expression)

### State Management

All state lives in `App.tsx` as React hooks:
- `bodyAsset` / `hairAsset` / `clothingAsset` — `CharacterAsset | null`
- `bodyBuffer` — `ArrayBuffer | null` (programmatic load path)
- `messages` — `ChatMessage[]`
- `animations` / `currentAnimation` — animation state
- `debugInfo` / `appReady` — UI state

The `PartSwapper` singleton (`src/engine/vrm/PartSwapper.ts`) manages part categories with an observer pattern (`onPartChange`). Currently not actively used — parts are managed directly in App state.

### VRM Loading Details

`CharacterModel.tsx` supports two load paths:
1. **File-based**: `FileReader.readAsArrayBuffer()` → `GLTFLoader.parse()`
2. **Buffer-based**: Direct `ArrayBuffer` → `GLTFLoader.parse()`

Both use `loader.register()` to add `VRMLoaderPlugin`. The VRM instance is stored in `vrmRef` and accessed via `vrm.humanoid.getRawBoneNode()` for bone manipulation (three-vrm v3 API). A loading guard (`isLoadingRef`) prevents double loads from React Strict Mode.

### Three-vrm v3 API Notes

- `vrm.humanoid.getRawBoneNode(name)` returns `THREE.Object3D | null` (preferred over deprecated `getBoneNode`)
- `vrm.humanoid.getRawBone(name)` returns `VRMHumanBone { node: THREE.Object3D }`
- VRM bones are manipulated via their `THREE.Object3D` node (scale, rotation, position)

## IPC Interface

Renderer → Main via `contextBridge`:

```typescript
interface ElectronAPI {
  loadVrmFromPath: (filePath: string) => Promise<Uint8Array>
}
```

Main process handler: `ipcMain.handle('load-vrm-from-path', ...)` reads file with `readFileSync` and returns `Buffer` (which serializes as `Uint8Array` across the context bridge).

## Testing

The app has no test framework configured. For manual testing:
```bash
VITE_VRM_PATH='/path/to/model.vrm' npm run dev
```
This auto-loads the specified VRM on startup. Console output from both main and renderer processes is captured in the terminal.

A test script is available at `scripts/test-vrm.sh` that runs the app, loads a VRM, and reports console output with error detection.

## Build Output

- `dist/` — Vite production bundle (renderer)
- `dist-electron/` — Electron main + preload bundles
- `release/` — electron-builder packaged app (AppImage on Linux, NSIS on Windows)

## Important Implementation Details

- `CharacterAsset._file` stores the browser `File` object, cast as `unknown` in the type
- `vrmRef.current` is typed as `unknown` — accessed via `@ts-expect-error` cast to VRM interface
- The breathing animation uses `useFrame` with `state.clock.getElapsedTime()` to scale the chest bone
- Animations are loaded via `GLTFLoader.load()` (URL-based) and stored in a `loadedClipsRef` Map
- MockResponder uses keyword matching with random selection from matching response pools
