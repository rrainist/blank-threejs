# Babylon.js Starter Template

A batteries-included Babylon.js + TypeScript + Vite starter focused on true 3D gameplay: modular rendering, pluggable physics (Cannon-ready), structured input, HUD overlays, and hot module replacement. Use it as a foundation for volumetric scenes, third-person prototypes, or experimentation with Babylon's modern WebGL/WebGPU pipeline.

## 🚀 Quick Start

```bash
npm install
npm run dev    # launches Vite at http://localhost:5173

# Production build + smoke test
npm run build
npm run preview
```

## 🧩 What's Included

- **Babylon.js 7** core, GUI, loaders, and inspector prewired with tree-shakable imports.
- **Engine bootstrap** in `src/rendering/` that builds the canvas, scene, lights, camera rig, and render loop.
- **GameWorld scaffold** (`src/gameplay/GameWorld.ts`) prepared for swappable physics adapters and gameplay systems.
- **Subsystem shells** for physics, input intents, HUD overlays, and asset loading to keep concerns separated.
- **Utilities** (`src/utils/`) for structured logging, global events, and error handling.

## 📁 Project Layout

```
src/
├── assets/                # Asset manifest + asynchronous loading hooks
├── config/                # Global configuration (render, camera, physics)
├── gameplay/              # GameWorld + gameplay systems
├── input/                 # Input manager emitting gameplay intents
├── physics/               # Physics adapters (Cannon-ready abstraction)
├── rendering/             # Engine/scene/camera orchestration
├── ui/                    # HUD overlay wiring
├── utils/                 # Logger, EventBus, ErrorHandler, pooling helpers
└── main.ts                # Bootstrap with HMR-safe teardown
```

## 🕹️ Controls & Systems

- Input manager maps WASD/arrow keys, Space, and Shift to movement intents (ready for player controllers).
- HUD layer displays score/wave placeholders via the shared event bus.
- Render loop is decoupled from physics so you can introduce fixed-step simulation or networking sync.

## 🛠️ Extending the Template

- Plug in a real physics backend by implementing `PhysicsSystem` (a Cannon-es adapter ships next).
- Register assets in `src/assets/AssetManager.ts` to load GLB models, HDR environments, or textures.
- Add gameplay systems under `src/gameplay/` (collectibles, AI squads, procedural levels) and publish state through the event bus.
- Use `@babylonjs/inspector` during development by toggling it in the orchestrator or Scene Debug UI.

## ✅ Recommended Checks

- `npm run lint` — ESLint with Airbnb TypeScript preset.
- `npm run build` — type-check + production bundle.
- `npx jest` — placeholder for future unit coverage (NullEngine-friendly).

Licensed under MIT. Happy building! 🌌
