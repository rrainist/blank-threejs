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

The template uses a direct Three.js approach where game entities extend THREE.Group or THREE.Object3D. This provides maximum flexibility and simplicity for rapid prototyping.

#### System Managers
- **GameManager** (`src/systems/GameManager.ts`): Game state machine (menu, playing, paused, game over), score/lives tracking, save/load functionality
- **TimeManager** (`src/systems/TimeManager.ts`): Delta time, timers, FPS tracking, time scaling, frame-independent calculations
- **InputManager** (`src/systems/InputManager.ts`): Unified input handling for keyboard, mouse, touch, and gamepad with action/axis mapping
- **AssetLoader** (`src/systems/AssetLoader.ts`): Centralized asset loading for textures, models (GLTF), sounds, and JSON with progress tracking
- **AudioManager** (`src/systems/AudioManager.ts`): Simple HTML5 audio playback for 2D sounds and music with volume controls
- **ConfigurationManager** (`src/systems/ConfigurationManager.ts`): Centralized game configuration for graphics, audio, gameplay, and controls settings
- **PhysicsSystem** (`src/systems/PhysicsSystem.ts`): Simple physics simulation with collision detection, forces, and raycasting
- **EffectsSystem** (`src/systems/EffectsSystem.ts`): Particle effects, screen effects (shake, flash), and trail rendering

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

#### Using the New Systems

##### ConfigurationManager
```typescript
const config = ConfigurationManager.getInstance()

// Get settings
const difficulty = config.get('gameplay', 'difficulty')
const shadows = config.get('graphics', 'shadows')

// Set settings
config.set('audio', 'masterVolume', 0.8)
config.set('graphics', 'quality', 'high')

// Apply graphics preset
config.applyGraphicsPreset('medium')

// Listen for changes
const unsubscribe = config.subscribe('graphics.shadows', (enabled) => {
  renderer.shadowMap.enabled = enabled
})
```

##### PhysicsSystem
```typescript
const physics = PhysicsSystem.getInstance()

// Create rigid body for entity
const body = physics.createRigidBody(entity, {
  mass: 1,
  restitution: 0.5,
  useGravity: true,
  collisionGroup: PhysicsSystem.COLLISION_GROUP.PLAYER
})

// Apply forces
physics.applyForce(body, new THREE.Vector3(0, 100, 0))
physics.applyImpulse(body, jumpImpulse)

// Collision detection
physics.onCollision(body, (collision) => {
  console.log('Hit!', collision.bodyB.object.name)
})

// Update physics each frame
physics.update(deltaTime)
```

##### EffectsSystem
```typescript
const effects = EffectsSystem.getInstance()

// Spawn explosion
effects.explosion(position, {
  color: 0xff6600,
  size: 2,
  count: 50
})

// Create sparkles
effects.sparkle(collectible.position, {
  color: 0x00ffff,
  count: 20
})

// Add trail to moving object
effects.startTrail(bullet, {
  color: 0xffff00,
  opacity: 0.6
})

// Screen effects
effects.screenShake(0.5, 1.0) // duration, intensity
effects.screenEffect('flash', 0.2, 0.8, { color: 0xffffff })

// Update effects each frame
effects.update(deltaTime)
```

#### Creating a New Entity
```typescript
class Enemy extends THREE.Group {
  health: number = 50
  speed: number = 3
  mesh: THREE.Mesh
  
  constructor() {
    super()
    
    // Create visual representation
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000 })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.castShadow = true
    this.add(this.mesh)
    
    // Set user data for identification
    this.userData.type = 'enemy'
  }
  
  update(deltaTime: number): void {
    // Update logic
    this.position.x += this.speed * deltaTime
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
- Direct Three.js entity architecture for simplicity
- Event-driven communication
- Memory pooling for performance
- Save/load system with versioning
- Comprehensive input system with remapping support

### Development Tips
- Use `main.game.ts` as a reference for implementing game features
- Extend THREE.Group or THREE.Object3D for new entity types
- Use composition and mixins for reusable behaviors
- Use the EventBus for loose coupling between systems
- Leverage ObjectPool for frequently created/destroyed objects
- TimeManager handles all timing needs (timers, delta time, lerping)