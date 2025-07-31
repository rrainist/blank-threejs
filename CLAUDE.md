# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with HMR on port 3000
- `npm run build` - TypeScript check and production build to `dist/`
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint with max 10 warnings allowed

### Testing
No test framework configured. Consider using Jest (already in devDependencies) with `ts-jest` for TypeScript support.

## Architecture

This is a game-ready Three.js TypeScript template with comprehensive systems for rapid game prototyping. It provides both a simple starter (`main.ts`) and a full game example (`main.game.ts`).

### Core Game Systems

#### Entity Component System (ECS)
- **EntityManager** (`src/systems/EntityManager.ts`): Manages all game objects, handles updates, and provides query methods
- **GameObject** (`src/entities/GameObject.ts`): Base class for all game entities with transform, components, and lifecycle methods
- **Components** (`src/components/`): Reusable behaviors like Health, Movement, and Collider

#### System Managers
- **GameManager** (`src/systems/GameManager.ts`): Game state machine (menu, playing, paused, game over), score/lives tracking, save/load functionality
- **TimeManager** (`src/systems/TimeManager.ts`): Delta time, timers, FPS tracking, time scaling, frame-independent calculations
- **InputManager** (`src/systems/InputManager.ts`): Unified input handling for keyboard, mouse, touch, and gamepad with action/axis mapping
- **AssetLoader** (`src/systems/AssetLoader.ts`): Centralized asset loading for textures, models (GLTF), sounds, and JSON with progress tracking
- **AudioManager** (`src/systems/AudioManager.ts`): 2D/3D sound playback, music with crossfade, volume controls, audio pooling

#### Utilities
- **EventBus** (`src/utils/EventBus.ts`): Decoupled communication between systems
- **ObjectPool** (`src/utils/ObjectPool.ts`): Memory-efficient object reuse for bullets, particles, etc.
- **Storage** (`src/systems/Storage.ts`): LocalStorage wrapper with versioning for save games and settings

### Game Implementation Example

The template includes a complete example game (`main.game.ts`) demonstrating:
- Player character with WASD movement and jumping
- Collectible items with scoring
- Health system with damage/death handling
- Camera following
- Debug UI with FPS and game state
- Input handling for pause, restart, and debug spawning

### Usage Patterns

#### Creating a New Entity
```typescript
class Enemy extends GameObject {
  constructor() {
    super('Enemy')
    
    // Create mesh
    this.mesh = new THREE.Mesh(geometry, material)
    
    // Add components
    this.addComponent('health', new Health(50))
    this.addComponent('movement', new Movement(3))
    this.addComponent('collider', new Collider(ColliderType.BOX))
  }
  
  update(deltaTime: number): void {
    super.update(deltaTime)
    // Custom update logic
  }
  
  clone(): Enemy {
    return new Enemy()
  }
}
```

#### Using Systems
```typescript
// Get system instances
const gameManager = GameManager.getInstance()
const inputManager = InputManager.getInstance()
const timeManager = TimeManager.getInstance()

// Use timers
timeManager.setTimeout(() => {
  console.log('Timer fired!')
}, 2) // 2 seconds

// Check input
if (inputManager.isActionPressed('fire')) {
  // Fire weapon
}

// Save game
gameManager.saveGame(0) // Save slot 0
```

### Key Technical Details
- Three.js v0.160+ with full TypeScript support
- Vite for fast development and optimized builds
- ES2020 target with modern JavaScript features
- Component-based entity architecture
- Event-driven communication
- Memory pooling for performance
- Save/load system with versioning
- Comprehensive input system with remapping support

### Development Tips
- Use `main.game.ts` as a reference for implementing game features
- Extend GameObject for new entity types
- Create reusable components for common behaviors
- Use the EventBus for loose coupling between systems
- Leverage ObjectPool for frequently created/destroyed objects
- TimeManager handles all timing needs (timers, delta time, lerping)