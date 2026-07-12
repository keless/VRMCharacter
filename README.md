# VRM Character App

An Electron desktop app that displays a 3D VRM/VRoid character with LLM-driven chat and customization features.

## Features

- **3D Character Display**: Load and display VRM models (VRoid Studio 2 compatible)
- **Character Customization**: Swap hair and clothing via the customization panel
- **LLM-Driven Chat**: Talk to your character through a floating chat panel powered by a local LLM
- **50+ Animations**: Play Mixamo animations retargeted to the VRM skeleton
- **Blendshape Expressions**: Character shows facial expressions (happy, sad, neutral) during chat
- **JSON Response Format**: LLM returns response text + animation suggestion + expression in a single JSON payload

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- (Optional) A local LLM server (vLLM, Ollama, LM Studio, etc.)

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

Outputs are placed in `dist/` (Vite bundle), `dist-electron/` (Electron bundle), and `release/` (packaged app).

## LLM Chat

The character's responses are driven by a local LLM. Configure the connection in `public/llm-config.json`:

```json
{
  "endpoint": "http://localhost:8000/v1/chat/completions",
  "model": "your-model-name",
  "contextSize": 5
}
```

The LLM receives a system prompt listing all available animations with descriptions, and must respond with JSON:

```json
{
  "text": "Hello there! *waves*",
  "animationId": "standing-greeting",
  "expression": "happy"
}
```

### Supported LLM Servers

Any server with an OpenAI-compatible `/v1/chat/completions` API works (vLLM, Ollama, LM Studio, etc.). The request uses `response_format: { type: "json_object" }` to enforce JSON output.

### Fallback Mode

If no LLM is configured or the request fails, the app falls back to a keyword-based mock responder that matches input against a response pool and suggests animations.

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

Built-in animations are loaded from `public/animations/index.json`. Each entry specifies an animation ID, display name, and file path.

**Mixamo animations** (`.fbx`):
1. Export from Mixamo as **glTF (.glb)**
2. Place `.glb` files in `public/animations/`
3. Add entries to `public/animations/index.json`

### Animation Retargeting

Mixamo animations use a different bone hierarchy than VRM models. The app handles this automatically:

1. **Bone name mapping**: Mixamo `mixamorig:*` bones → VRM humanoid bones
2. **Rotation rebaking**: Parent rest-world quaternion × rest-inverse for correct orientation
3. **Position scaling**: Hips height ratio between Mixamo asset and VRM model
4. **Coordinate flipping**: VRM 0.x models get Y/Z coordinate flip

## Project Structure

```
VRMCharacter/
├── electron/
│   ├── main.ts              # Electron main process
│   └── preload.ts           # Preload script for IPC
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Root component (state, file loading, chat)
│   ├── index.css             # Global styles
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   ├── components/
│   │   ├── ChatPanel.tsx     # Chat UI overlay
│   │   └── AssetPicker.tsx   # Character customization
│   ├── scenes/
│   │   ├── CharacterScene.tsx # 3D canvas with lighting
│   │   └── Ground.tsx        # Ground plane
│   ├── engine/
│   │   ├── vrm/
│   │   │   ├── CharacterModel.tsx   # VRM model loader
│   │   │   ├── AnimationPlayer.tsx  # Animation playback + crossfade
│   │   │   ├── AnimationController.ts  # Keyword → animation mapping
│   │   │   ├── AnimationRemapper.ts  # Mixamo → VRM retargeting
│   │   │   └── PartSwapper.ts       # Part category swapping
│   │   └── chat/
│   │       ├── LlmResponder.ts      # LLM responder interface
│   │       ├── MockLlmResponder.ts  # Keyword-based mock responder
│   │       ├── RealLlmResponder.ts  # OpenAI-compatible LLM adapter
│   │       └── MockResponder.ts     # Original response pool
│   └── lib/
│       └── logger.ts          # Categorized diagnostic logger
├── public/
│   ├── animations/            # Animation files + index.json
│   ├── llm-config.json        # LLM endpoint configuration
│   └── animation-descriptions.json  # Animation usage hints for LLM
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
| VRM | @pixiv/three-vrm v3 |
| Animations | @pixiv/three-vrm-animation + GLTFLoader + FBXLoader |
| LLM | OpenAI-compatible API (vLLM, Ollama, etc.) |

## Future Work

- [ ] Drag-to-reposition chat panel
- [ ] Asset directory scanning (auto-discover VRM files)
- [ ] More blendshape expressions
- [ ] Character idle behavior (looking around, blinking)
- [ ] Save/load character configuration
- [ ] Screenshot capture

## License

MIT
