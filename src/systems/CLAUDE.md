# Systems Architecture

This directory contains all the core game systems that manage different aspects of the game engine.

## System Design Principles

1. **Singleton Pattern**: Most systems use the singleton pattern for easy global access
2. **Initialization**: Systems that need scene/camera references use `initialize()` method
3. **Event-Driven**: Systems communicate through the EventBus for loose coupling
4. **Type Safety**: All systems are fully typed with TypeScript

## Core Systems

### GameManager
- Manages game state (menu, playing, paused, game over)
- Tracks score, lives, and level progression
- Handles save/load functionality
- State change events and transitions

### TimeManager
- Provides delta time and fixed timestep
- Manages timers and intervals
- Tracks FPS and performance metrics
- Supports time scaling for slow-motion effects

### InputManager
- Unified input handling for keyboard, mouse, touch, and gamepad
- Action/axis mapping system
- Support for multiple input methods per action
- Frame-perfect input detection (justPressed, justReleased)

### AudioManager
- Simple HTML5 audio playback
- 2D and 3D spatial audio support
- Separate volume controls for master, music, and SFX
- Mute functionality
- No Three.js AudioListener dependency

### AssetLoader
- Centralized loading for all asset types
- Progress tracking
- Caching system
- Support for textures, models (GLTF), sounds, and JSON

### CameraController
- Multiple camera modes: first-person, third-person, orbital, fixed, free
- Smooth camera following with damping
- Support for both orthographic and perspective cameras
- Collision detection to prevent camera clipping
- Mouse/touch controls for camera rotation
- Configurable settings (distance, angles, speed)

### SceneManager
- Scene transitions with fade effects
- Scene configuration and presets
- Automatic cleanup on scene changes
- Support for dynamic scene loading
- Scene state persistence

### UIManager
- Screen management system
- Common UI elements (HUD, pause menu, game over)
- Responsive design support
- Event-driven UI updates
- Debug UI with performance stats

### LevelManager
- JSON-based level loading system
- Spawn point management
- Dynamic object creation from level data
- Environment configuration (fog, lighting)
- Boundary checking
- Support for multiple object types (box, sphere, cylinder)

### ConfigurationManager
- Centralized settings management
- Support for graphics, audio, gameplay, and control settings
- Persistent storage
- Configuration presets
- Observable pattern for settings changes

### PhysicsSystem
- Simple physics simulation
- Multiple collision shapes: sphere, box, capsule
- Force and impulse application
- Raycasting support
- Collision groups and masks
- Fixed timestep integration
- Ground detection for jumping

### EffectsSystem
- Particle system with object pooling
- Screen effects (shake, flash, fade)
- Trail rendering
- Pre-built effects (explosion, sparkle, hit)
- Performance optimized

### Storage
- LocalStorage wrapper
- Versioned save data
- Import/export functionality
- Size tracking
- Convenience methods for common use cases

## Usage Examples

### Initialize Systems
```typescript
// Initialize systems that need scene/camera
const audioManager = AudioManager.initialize()
const sceneManager = SceneManager.initialize(scene, camera, renderer)
const effectsSystem = EffectsSystem.initialize(scene, camera, renderer)
const cameraController = CameraController.initialize(camera)
const levelManager = LevelManager.initialize(scene)
const uiManager = UIManager.initialize({ debugMode: false })

// Get singleton instances
const gameManager = GameManager.getInstance()
const timeManager = TimeManager.getInstance()
const inputManager = InputManager.getInstance()
const physicsSystem = PhysicsSystem.getInstance()
const configManager = ConfigurationManager.getInstance()
```

### Using Configuration
```typescript
const config = ConfigurationManager.getInstance()

// Get settings
const difficulty = config.get('gameplay', 'difficulty')
const graphics = config.get('graphics')

// Update settings
config.set('audio', 'masterVolume', 0.8)

// Subscribe to changes
const unsubscribe = config.subscribe('graphics', (newGraphics) => {
  // Update rendering based on new settings
})
```

### Physics Integration
```typescript
const physics = PhysicsSystem.getInstance()

// Create rigid body with different shapes
const body = physics.createRigidBody(mesh, {
  mass: 1,
  restitution: 0.7,
  shape: CollisionShape.CAPSULE,
  radius: 0.5,
  height: 1,
  collisionGroup: PhysicsSystem.COLLISION_GROUP.PLAYER,
  collisionMask: PhysicsSystem.COLLISION_GROUP.STATIC | 
                 PhysicsSystem.COLLISION_GROUP.ENEMY
})

// Apply forces
physics.applyForce(body, new THREE.Vector3(0, 100, 0))

// Check if grounded
const isGrounded = physics.isGrounded(body)

// Handle collisions
physics.onCollision(body, (collision) => {
  console.log('Hit!', collision.bodyB)
})
```

### Camera Usage
```typescript
const camera = CameraController.getInstance()

// Set camera mode
camera.setMode(CameraMode.THIRD_PERSON)
camera.setTarget(player)

// Switch camera type
camera.switchToOrthographic()
camera.switchToPerspective()

// Configure camera
camera.applyConfig({
  distance: 20,
  offset: new THREE.Vector3(0, 10, 15),
  enableDamping: true
})
```

### Level Loading
```typescript
const levelManager = LevelManager.getInstance()

// Load level from JSON
await levelManager.loadLevelFromFile('assets/levels/level1-city.json')

// Get spawn points
const playerSpawn = levelManager.getRandomSpawnPoint('player')
const enemySpawns = levelManager.getSpawnPoints('enemy')

// Check boundaries
if (levelManager.isInBounds(position)) {
  // Position is valid
}
```

### Effects Usage
```typescript
const effects = EffectsSystem.getInstance()

// Spawn explosion
effects.explosion(position, {
  color: 0xff0000,
  size: 2,
  force: 20
})

// Create trail
effects.startTrail(bullet, {
  color: 0xffff00,
  opacity: 0.8
})

// Screen shake
effects.screenShake('shake', 0.5, 1.0)
```

## System Integration Example

```typescript
// Complete initialization flow
async function initializeSystems() {
  // Core systems
  const timeManager = TimeManager.getInstance()
  const inputManager = InputManager.getInstance()
  const gameManager = GameManager.getInstance()
  const physicsSystem = PhysicsSystem.getInstance()
  
  // Systems requiring initialization
  const audioManager = AudioManager.initialize()
  const sceneManager = SceneManager.initialize(scene, camera, renderer)
  const cameraController = CameraController.initialize(camera)
  const levelManager = LevelManager.initialize(scene)
  const effectsSystem = EffectsSystem.initialize(scene, camera, renderer)
  const uiManager = UIManager.initialize({ debugMode: true })
  
  // Load assets
  const assetLoader = AssetLoader.getInstance()
  await assetLoader.loadSound('jump', 'assets/sounds/jump.wav')
  await assetLoader.loadTexture('player', 'assets/textures/player.png')
  
  // Setup scenes
  sceneManager.registerScene('level1', {
    name: 'level1',
    onLoad: async () => {
      await levelManager.loadLevelFromFile('assets/levels/level1-city.json')
    }
  })
  
  // Start game
  gameManager.changeState(GameState.PLAYING)
}
```

## Best Practices

1. **Initialize Early**: Set up systems in your main game initialization
2. **Use Events**: Prefer EventBus for system communication over direct coupling
3. **Clean Up**: Call dispose() methods when destroying objects
4. **Performance**: Use object pools for frequently created/destroyed objects
5. **Configuration**: Use ConfigurationManager for all user-adjustable settings
6. **Camera Setup**: Use orthographic camera for consistent 2D-style gameplay view
7. **Level Design**: Define all static geometry and spawn points in JSON level files
8. **Physics**: Use capsule colliders for characters, boxes for static geometry