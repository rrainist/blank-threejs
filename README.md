# Three.js Game Development Template

An "advanced hello world" for Three.js game prototyping. This project boots straight into a small top-down arena demo so you can immediately tweak gameplay, swap assets, or rip pieces out for your own idea. It is intentionally verbose so both humans and LLMs can see the moving parts of a minimal game loop without wading through a full production stack.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the Vite dev server (opens http://localhost:5173)
npm run dev

# Build and preview production output
npm run build
npm run preview
```

## 🧱 What's Inside

- **Game.ts** — orchestrates scene setup, entity spawning, per-frame updates, and UI/audio hooks
- **Systems** — singletons for input, timing, physics (cannon-es), effects, simple audio playback, and camera control
- **Entities** — Player, Enemy, Bullet, and Collectible examples that demonstrate pooling, physics integration, and events
- **UI layer** — lightweight DOM HUD/pause menu wiring via `UIManager`
- **Utilities** — event bus, logging helper, object pool, configurable constants

Everything runs off `src/main.ts`, which prepares Three.js, hands control to the `Game` class, and registers hot-reload friendly cleanup.

## 🗂️ Project Layout

```
src/
├── main.ts          # Entry point: creates renderer/camera/scene and starts the loop
├── Game.ts          # Core game orchestration
├── Level.ts         # Builds demo geometry, lighting, and physics bodies
├── scene.ts         # Minimal scene factory
├── controls.ts      # Optional orbit-style mouse controls (unused in default demo)
├── constants/       # Gameplay/visual tuning knobs
├── entities/        # Player, Enemy, Bullet, Collectible implementations
├── systems/         # Input, time, physics, audio, UI, camera, effects, asset loading
└── utils/           # Logger, EventBus, ObjectPool, helpers
```

## 🕹️ Adapting the Template

- **Swap the demo**: Replace `Game.ts` with your own scene manager, or keep it and modify the entity spawning/logic sections.
- **Pick systems a la carte**: Import only the managers you need from `src/systems/`. Each is self-contained with minimal coupling.
- **Replace assets quickly**: Drop files in `assets/` and register them through `AssetLoader` or directly in your systems.
- **Extend safely**: `TimeManager`, `EventBus`, `ObjectPool`, and the constants modules provide common patterns without imposing an engine.

## 🛠️ Useful Scripts

- `npm run dev` — Launch Vite with hot module reload
- `npm run build` — Type-check with `tsc` and emit optimized assets
- `npm run preview` — Serve the built bundle for smoke testing
- `npm run lint` — ESLint with the Airbnb TypeScript preset

## 📄 License

MIT — use it commercially or privately.

Happy prototyping! 🎮
