# Three.js Game Development Template

A deliberately small "hello game" scaffold for Three.js + TypeScript. The default scene is a 4×4 tile playground: move a cube avatar, ping a glowing resonator, nudge a physics orb, and watch a single roaming sentinel. The goal is to show how input, UI, audio, effects, physics, and state management plug together without front-loading a full game design.

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

- **Game.ts** — wires the playground scene, moves the player on a tiny grid, and demonstrates one action (`F` to ping) that touches audio, effects, and physics
- **Systems** — singletons for input, timing, physics (cannon-es), particle effects, audio, and game-state toggling; the default scene exercises each of them once
- **Entities** — lightweight `Player` and `Enemy` meshes ready to swap or extend; extra examples remain in the folder for reference
- **UI layer** — compact overlay from `UIManager` that shows controls, status, and a short feed of recent actions
- **Utilities** — logging, event bus, and object pooling helpers that stay out of the way until you need them

`src/main.ts` handles renderer bootstrap and hot-reload cleanup, then hands control to the `Game` class.

## 🗂️ Project Layout

```
src/
├── main.ts          # Entry point: creates renderer/camera/scene and starts the loop
├── Game.ts          # Minimal gameplay loop and scene wiring
├── Level.ts         # Legacy hook kept for compatibility (clears old level meshes)
├── scene.ts         # Scene factory with background + fog
├── constants/       # Tunables for scene colors, board size, physics knobs
├── entities/        # Player, Enemy, Bullet, Collectible examples
├── systems/         # Input, time, physics, audio, UI, effects, asset loading
└── utils/           # Logger, EventBus, ObjectPool, helpers
```

Extended assets, sound packs, and unused level JSON files now live under `assets/examples/`. Copy or import them when you need more content; the base `assets/` folder only ships the one UI ping.

## 🕹️ Adapting the Template

- **Replace the playground**: swap out `Game.ts` with your scene manager, or keep the grid helpers and build new interactions.
- **Grow systems**: the singletons are already initialized—call deeper APIs (physics shapes, timers, pooled effects) as you expand.
- **Drop in assets**: add files under `assets/` and register them with `AudioManager`, `AssetLoader`, or your own loaders.
- **Keep iteration fast**: the structure favors hot reload, small experiments, and LLM co-development.

## 🛠️ Useful Scripts

- `npm run dev` — Launch Vite with hot module reload
- `npm run build` — Type-check with `tsc` and emit optimized assets
- `npm run preview` — Serve the built bundle for smoke testing
- `npm run lint` — ESLint with the Airbnb TypeScript preset

## 📄 License

MIT — use it commercially or privately.

Happy prototyping! 🎮
