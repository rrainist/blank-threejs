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
- **CameraController** (`src/systems/CameraController.ts`): Multiple camera modes (first-person, third-person, orbital), smooth following, orthographic/perspective switching
- **SceneManager** (`src/systems/SceneManager.ts`): Scene transitions, fade effects, scene configuration and presets, automatic cleanup
- **UIManager** (`src/systems/UIManager.ts`): Screen management, HUD, pause menu, responsive design, event-driven updates
- **LevelManager** (`src/systems/LevelManager.ts`): JSON-based level loading, spawn point management, level geometry creation

#### Utilities
- **EventBus** (`src/utils/EventBus.ts`): Decoupled communication between systems
- **ObjectPool** (`src/utils/ObjectPool.ts`): Memory-efficient object reuse for bullets, particles, etc.
- **Storage** (`src/systems/Storage.ts`): LocalStorage wrapper with versioning for save games and settings

### Game Implementation Example

The template includes a complete example game (`main.game.ts`) demonstrating:
- Player character with WASD movement and jumping
- Shooting mechanics with mouse aiming and bullet projectiles
- Multiple enemy types (patrol, shooter, chaser) with different AI behaviors
- Collectible items with scoring and level progression
- Health system with damage/death handling
- Multiple camera modes with smooth following
- Level loading from JSON files with spawn points
- Debug UI with FPS and game state
- Input handling for pause, restart, and debug spawning
- Sound effects using actual audio files
- Object pooling for bullets and collectibles

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

#### CameraController
```typescript
const cameraController = CameraController.getInstance()

// Set camera mode
cameraController.setMode(CameraMode.THIRD_PERSON)
cameraController.setMode(CameraMode.FIRST_PERSON)
cameraController.setMode(CameraMode.ORBITAL)

// Switch camera type
cameraController.switchToOrthographic()
cameraController.switchToPerspective()

// Set target to follow
cameraController.setTarget(player)

// Configure camera
cameraController.applyConfig({
  distance: 15,
  enableDamping: true,
  dampingFactor: 0.05
})
```

#### LevelManager
```typescript
const levelManager = LevelManager.getInstance()

// Load level from JSON file
await levelManager.loadLevelFromFile('assets/levels/level1-city.json')

// Get spawn points
const playerSpawn = levelManager.getRandomSpawnPoint('player')
const collectibleSpawns = levelManager.getSpawnPoints('collectible')

// Check boundaries
if (levelManager.isInBounds(position)) {
  // Position is within level boundaries
}
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

### Game Controls

#### Player Controls
- **WASD/Arrow Keys** - Move player
- **Space** - Jump
- **Left Click** - Shoot projectile at mouse cursor
- **F** - Melee attack
- **Right Mouse Button (hold)** - Rotate camera

#### Debug Controls
- **C** - Spawn debug collectible
- **R** - Restart game
- **P** - Pause/unpause
- **M** - Mute/unmute audio
- **F5** - Save game
- **F9** - Load game
- **1/2/3** - Switch camera modes (first-person/third-person/orbital)
- **4** - Switch to orthographic camera
- **5** - Switch to perspective camera

### Level System

The game uses JSON-based level files stored in `assets/levels/`. Each level defines:
- Environment settings (fog, lighting)
- Ground properties
- Static objects (walls, buildings, trees)
- Spawn points for player, enemies, and collectibles
- Level boundaries

Example level structure:
```json
{
  "name": "City Level",
  "environment": {
    "fogColor": "0xcccccc",
    "ambientLight": { "color": "0x606060", "intensity": 1.0 }
  },
  "objects": [
    {
      "type": "box",
      "position": [0, 5, 0],
      "size": [10, 10, 10],
      "color": "0x404040"
    }
  ],
  "spawnPoints": [
    { "type": "player", "position": [0, 1, 0] },
    { "type": "collectible", "position": [5, 1, 5] }
  ]
}
```

### Development Tips
- Use `main.game.ts` as a reference for implementing game features
- Extend THREE.Group or THREE.Object3D for new entity types
- Use composition and mixins for reusable behaviors
- Use the EventBus for loose coupling between systems
- Leverage ObjectPool for frequently created/destroyed objects
- TimeManager handles all timing needs (timers, delta time, lerping)
- Camera uses orthographic projection by default for consistent game view
- All collectibles and enemies are defined in level JSON files
- Physics system uses capsule colliders for characters