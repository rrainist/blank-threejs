# Three.js Game Development Template

A comprehensive TypeScript template for building 3D games with Three.js. Features a complete game framework with physics, audio, input handling, and more - ready for rapid prototyping or production games.

## 🎮 What is This?

This is a **game-ready starter template** that provides all the boilerplate systems you need to build a 3D game:
- Complete game framework with 12+ integrated systems
- Full example game demonstrating all features
- TypeScript + Vite for modern development
- Designed to be completely replaced with YOUR game

Think of it as "Create React App" but for Three.js games - it gives you a solid foundation to build on.

## 🚀 Quick Start

```bash
# Clone the template
git clone [this-repo] my-awesome-game
cd my-awesome-game

# Install dependencies
npm install

# Start with simple demo
npm run dev

# Or start with full game example
npm run dev:game
```

## 🎯 Two Ways to Start

### 1. Simple Demo (`main.ts`)
A minimal rotating cube scene - perfect for starting from scratch.

### 2. Full Game Example (`main.game.ts`) 
A complete game with:
- Player character with WASD movement
- Enemy AI (patrol, chase, shoot behaviors)  
- Physics and collision detection
- Collectibles and scoring
- Multiple camera modes
- Sound effects and music
- Save/load system
- UI and menus

## 📦 Built-in Game Systems

### Core Systems
- **GameManager** - Game states, scoring, lives, save/load
- **InputManager** - Keyboard, mouse, gamepad, touch support
- **PhysicsSystem** - Collision detection, forces, raycasting
- **AudioManager** - 2D/3D sound, music, volume control
- **CameraController** - Multiple camera modes, smooth following
- **EffectsSystem** - Particles, screen shake, visual effects

### Utility Systems  
- **TimeManager** - Delta time, timers, slow motion
- **LevelManager** - JSON-based level loading
- **EventBus** - Decoupled communication
- **ObjectPool** - Efficient object reuse
- **Storage** - Save game persistence
- **UIManager** - Menus, HUD, responsive UI

## 🏗️ Project Structure

```
src/
├── main.ts              # Simple starter
├── main.game.ts         # Full game example
├── systems/             # Game framework systems
│   ├── GameManager.ts
│   ├── InputManager.ts
│   ├── PhysicsSystem.ts
│   └── ... (12+ systems)
├── entities/            # Game objects  
│   ├── Player.ts
│   ├── Enemy.ts
│   └── Collectible.ts
├── utils/               # Utilities
└── constants/           # Game constants
```

## 🎨 Build Your Own Game

**This template is meant to be modified!** Here's how:

### Option 1: Start Fresh
```typescript
// Replace main.ts with your game
import { GameManager } from './systems/GameManager'
import { InputManager } from './systems/InputManager'
// Use only what you need!
```

### Option 2: Modify the Example
- Change player from shooter to platformer character
- Replace enemies with racing opponents
- Turn collectibles into power-ups
- Make it YOUR game!

### Option 3: Mix and Match
- Keep the systems you like
- Delete what you don't need  
- Add your own custom systems

## 🔧 Key Features

- **Modern Stack**: Three.js 0.160+, TypeScript, Vite
- **Game-Ready**: Not just a rendering demo - full game systems
- **Flexible Architecture**: Direct Three.js approach, no framework lock-in
- **Performance**: Object pooling, frustum culling, LOD support
- **Developer Experience**: Hot reload, TypeScript intellisense
- **Production Ready**: Optimized builds, proper cleanup

## 📚 Documentation

See [CLAUDE.md](./CLAUDE.md) for comprehensive documentation on:
- How to use each system
- Common game patterns
- Performance tips
- Architecture examples

## 🎮 Example Game Controls

The included example game demonstrates the systems with:
- **WASD/Arrows** - Move player
- **Mouse** - Aim and shoot
- **Space** - Jump  
- **1/2/3** - Switch camera views
- **P** - Pause
- **R** - Restart

## 🚀 Building for Production

```bash
# Build optimized version
npm run build

# Preview production build
npm run preview  

# Deploy dist/ folder
```

## 💡 What Can You Build?

This template is perfect for:
- 3D platformers
- Top-down shooters
- Racing games
- Puzzle games
- Action RPGs
- Tower defense
- Any 3D game idea!

## 🤝 Philosophy

This template follows the philosophy of providing a **complete starting point** without being opinionated about your game design. We give you the tools; you create the experience.

## 📄 License

MIT License - Use this template for any project, commercial or personal!

---

**Ready to build your game? Delete this README and make it yours! 🎮**