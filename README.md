# VRM Character App

An Electron desktop app that displays a 3D VRM/VRoid character with chat and customization features.

## Features

- **3D Character Display**: Load and display VRM models (VRoid Studio 2 compatible)
- **Character Customization**: Swap hair and clothing via the customization panel
- **Chat Interface**: Talk to your character through a floating chat panel
- **Animations**: Play Mixamo animations retargeted to the VRM skeleton
- **Blendshape Expressions**: Character shows facial expressions (happy, sad, neutral) during chat

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
npm install
```

### Running

```bash
npm run dev
```

This starts the Electron app in development mode with hot reloading.

### Building

```bash
npm run build
```

Outputs are placed in the `release/` directory.

## Using Your Own Characters

### Loading a VRM Body

1. Click the 🎭 button (top-right) to open the customization panel
2. Click "Load Body" to select a `.vrm` file
3. The character will appear in the 3D viewport

### Adding Hair / Clothing

1. Open the customization panel (🎭 button)
2. Click "Load Hair" or "Load Clothing" to select `.vrm` files
3. The new part appears on the character immediately

### Adding Animations

1. Export animations from Mixamo as `.glb` (glTF format)
2. Place `.glb` files in your assets directory
3. The app will automatically discover and list available animations

### Mixamo to VRM Animation Retargeting

Mixamo animations use a different bone hierarchy than VRM models. The app handles this automatically via:

1. **Bone name mapping**: Mixamo bone names are mapped to VRM humanoid bone names
2. **Animation retargeting**: The animation clips are applied to the VRM skeleton

**Exporting from Mixamo:**
1. Upload your VRM model to Mixamo (or use a standard humanoid)
2. Choose and apply animations
3. Export as **glTF (.glb)** — not FBX
4. Place the `.glb` files in your assets directory

## Project Structure

```
VRMCharacter/
├── electron/
│   ├── main.ts              # Electron main process
│   └── preload.ts           # Preload script for IPC
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Root component
│   ├── index.css             # Global styles
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   ├── components/
│   │   ├── ChatPanel.tsx     # Chat UI overlay
│   │   └── AssetPicker.tsx   # Character customization
│   ├── scenes/
│   │   ├── CharacterScene.tsx # 3D canvas with lighting
│   │   └── Ground.tsx        # Ground plane
│   └── engine/
│       ├── vrm/
│       │   ├── CharacterModel.tsx  # VRM model loader
│       │   ├── AnimationPlayer.tsx # Animation playback
│       │   └── PartSwapper.ts      # Part swapping logic
│       └── chat/
│           └── MockResponder.ts    # Chat response system
├── vite.config.ts            # Vite + Electron config
├── package.json
├── tsconfig.json
└── index.html
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron |
| UI | React 19 + TypeScript |
| Build | Vite |
| 3D | Three.js + @react-three/fiber + @react-three/drei |
| VRM | @pixiv/three-vrm |
| Animations | Three.js AnimationMixer + GLTFLoader |

## Future Work

- [ ] LLM integration for character responses (OpenAI/Anthropic)
- [ ] Drag-to-reposition chat panel
- [ ] Asset directory scanning (auto-discover VRM files)
- [ ] More blendshape expressions
- [ ] Character idle behavior (looking around, blinking)
- [ ] Save/load character configuration
- [ ] Screenshot capture

## License

MIT
