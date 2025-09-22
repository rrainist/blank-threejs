# Phaser 4 Starter Template

A batteries-included Phaser 4 (RC4) + TypeScript + Vite starter that showcases Arcade and Matter physics, state-driven UI overlays, pooled projectiles, audio, shader-based backdrops, and hot module replacement. Use it as a modern baseline for action platformers, arena shooters, or prototypes that need Phaser's full feature set without rebuilding the scaffolding.

## 🚀 Quick Start

```bash
npm install
npm run dev    # launches Vite at http://localhost:5173

# Production build + smoke test
npm run build
npm run preview
```

## 🧩 What's Included

- **Phaser 4 RC4** wired through `src/config/gameConfig.ts` with both Arcade (player/enemies) and Matter (sandbox) physics enabled out of the box.
- **Scene flow** in `src/scenes/` with Boot → Preload → Main gameplay → UI overlay, all hot-reload safe.
- **Gameplay sample** in `MainScene` highlighting parallax backgrounds, shader planes, keyboard/pointer/gamepad controls, bullet pooling, and enemy AI patrols.
- **UI layer** in `UIScene` using the shared event bus for score, wave, health, pause, and audio toggle updates.
- **Audio + effects**: sound effects preloaded via `PreloadScene`, tweens for feedback, and shader/particle examples.
- **Utilities**: `utils/Logger` and `utils/EventBus` for structured logging and inter-scene communication.

## 📁 Project Layout

```
src/
├── config/
│   ├── gameConfig.ts    # central Phaser.Game configuration
│   └── sceneKeys.ts     # typed scene key constants
├── gameobjects/
│   ├── Bullet.ts        # pooled projectile with lifetime handling
│   ├── Collectible.ts   # floating pickup with idle tweens
│   ├── Enemy.ts         # patrol enemy with hit feedback
│   └── Player.ts        # double-jump player with keyboard, pointer, and gamepad input
├── scenes/
│   ├── BootScene.ts     # scale + registry init before asset loading
│   ├── PreloadScene.ts  # audio/data loading + procedural texture generation
│   ├── MainScene.ts     # core gameplay loop (Arcade + optional Matter sandbox)
│   └── UIScene.ts       # HUD, pause, and debug overlays
├── utils/
│   ├── EventBus.ts      # strongly-typed pub/sub helper
│   └── Logger.ts        # environment-aware console logger
└── main.ts              # Phaser bootstrap with HMR-safe teardown
```

## 🕹️ Controls & Systems

- Arrow keys / WASD to move, Space / Up / pointer tap / gamepad (A) to jump (double jump enabled).
- Pointer or gamepad (X) fires pooled bullets toward the cursor.
- `P` toggles pause (freezes physics/time), `Shift` toggles slow motion, `F1` shows Arcade physics debug, `[Toggle Audio]` in HUD mutes/unmutes.
- The far-right "playground" swaps to Matter physics, demonstrating mixed-mode setups.

## 🛠️ Extending the Template

- Drop new assets under `assets/` and enqueue them in `PreloadScene`.
- Add scenes to the `scene` array in `createGameConfig()` to expand the flow (e.g., menus, gameplay variants).
- Wire additional systems (data persistence, inventories, quests) through the event bus or Phaser plugins.
- Use Vite's module hot replacement to iterate quickly; `main.ts` already tears down the existing game instance on changes.

## ✅ Recommended Checks

- `npm run lint` — ESLint with Airbnb TypeScript preset.
- `npm run build` — ensures type-check + production build succeed before commits.

Licensed under MIT. Happy prototyping! 🎮
