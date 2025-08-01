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
- Separate volume controls for master, music, and SFX
- Mute functionality
- No Three.js AudioListener dependency

### AssetLoader
- Centralized loading for all asset types
- Progress tracking
- Caching system
- Support for textures, models (GLTF), sounds, and JSON

### SceneManager
- Scene transitions with fade effects
- Scene configuration and presets
- Automatic cleanup on scene changes
- Support for dynamic scene loading

### UIManager
- Screen management system
- Common UI elements (HUD, pause menu, game over)
- Responsive design support
- Event-driven UI updates

### ConfigurationManager
- Centralized settings management
- Support for graphics, audio, gameplay, and control settings
- Persistent storage
- Configuration presets
- Observable pattern for settings changes

### PhysicsSystem
- Simple physics simulation
- Sphere-based collision detection
- Force and impulse application
- Raycasting support
- Collision groups and masks
- Fixed timestep integration

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

// Get singleton instances
const gameManager = GameManager.getInstance()
const timeManager = TimeManager.getInstance()
const inputManager = InputManager.getInstance()
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

// Create rigid body
const body = physics.createRigidBody(mesh, {
  mass: 1,
  restitution: 0.7,
  collisionGroup: PhysicsSystem.COLLISION_GROUP.PLAYER
})

// Apply forces
physics.applyForce(body, new THREE.Vector3(0, 100, 0))

// Handle collisions
physics.onCollision(body, (collision) => {
  console.log('Hit!', collision.bodyB)
})
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

## Best Practices

1. **Initialize Early**: Set up systems in your main game initialization
2. **Use Events**: Prefer EventBus for system communication over direct coupling
3. **Clean Up**: Call dispose() methods when destroying objects
4. **Performance**: Use object pools for frequently created/destroyed objects
5. **Configuration**: Use ConfigurationManager for all user-adjustable settings