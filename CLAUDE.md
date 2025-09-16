# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Getting Started - This is YOUR Game Now!

**IMPORTANT**: This template is a starting point, not a rigid framework. Feel free to:
- Delete anything and start fresh
- Modify or replace any systems that don't fit your needs
- Add new systems and utilities as needed
- Change the architecture to match your game's requirements

Think of this as a minimal foundation for Three.js games - it shows you the basics, but you're meant to build something entirely different on top of it.

## 🎮 Quick Game Templates

### Top-Down Shooter
```typescript
// In Game.ts constructor or setup
this.cameraController.setOffset(new THREE.Vector3(0, 20, 10))
this.cameraController.setLookAtOffset(new THREE.Vector3(0, 0, -5))

// Use EntityFactory for waves
const enemies = EntityFactory.createEnemyWave(spawnPoint, waveNumber)
enemies.forEach(enemy => this.scene.add(enemy))
```

### Platformer
```typescript
// Adjust camera for side view
this.camera.position.set(0, 5, 20)
this.camera.lookAt(0, 0, 0)

// Disable camera follow on X axis
this.cameraController.setTarget(null)

// Add platforms as static bodies
const platform = new THREE.Mesh(
  new THREE.BoxGeometry(10, 1, 3),
  new THREE.MeshPhongMaterial({ color: 0x808080 })
)
this.scene.add(platform)
this.physicsSystem.createRigidBody(platform, {
  shape: CollisionShape.BOX,
  mass: 0, // Static
  collisionGroup: PhysicsSystem.COLLISION_GROUP.STATIC
})
```

### Endless Runner
```typescript
// Move world instead of player
class EndlessRunner extends Game {
  worldSpeed = 10

  update(deltaTime: number): void {
    // Move world backward
    this.scene.traverse((object) => {
      if (object.userData.levelObject) {
        object.position.z += this.worldSpeed * deltaTime

        // Recycle objects that go behind camera
        if (object.position.z > 30) {
          object.position.z -= 60
        }
      }
    })
  }
}
```

### Tower Defense
```typescript
// Create path for enemies
const path = [
  new THREE.Vector3(-20, 0, 0),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, -20),
  new THREE.Vector3(20, 0, -20)
]

// Enemy follows path
enemy.userData.pathIndex = 0
enemy.userData.path = path

// In enemy update
const target = enemy.userData.path[enemy.userData.pathIndex]
const direction = new THREE.Vector3().subVectors(target, enemy.position)
if (direction.length() < 1) {
  enemy.userData.pathIndex++
}
```

### Arena Fighter
```typescript
// Use EntityFactory for formations
const formation = EntityFactory.createEnemyFormation(
  new THREE.Vector3(0, 1, 0),
  8,  // count
  15, // radius
  'fast'
)

// Add power-ups
const powerups = EntityFactory.createCollectibleScatter(
  new THREE.Vector3(0, 1, 0),
  5,   // count
  20,  // radius
  50,  // minValue
  100  // maxValue
)
```

## Commands

### Development
- `npm run dev` - Start development server
- `npm run build` - TypeScript check and production build to `dist/`
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── main.ts          # Entry point - initializes Three.js and Game
├── Game.ts          # Main game class - handles game logic
├── Level.ts         # Level creation and layout
├── scene.ts         # Basic Three.js scene setup
├── constants/       # Game constants and configuration
├── entities/        # Game entities (Player, Enemy, etc.)
├── systems/         # Core systems (physics, input, etc.)
└── utils/           # Utility classes and helpers
```

## Simplified Architecture

This template has been simplified to focus on the essentials:

### Core Systems

#### GameManager
Simple game state management:
- Game states (menu, playing, paused, game over)
- Score and lives tracking
- State change callbacks

```typescript
const gameManager = GameManager.getInstance()
gameManager.changeState(GameState.PLAYING)
gameManager.addScore(100)
```

#### InputManager  
Direct keyboard and mouse input:
- No complex action mapping
- Simple key state checking
- Mouse position and clicks

```typescript
const input = InputManager.getInstance()
if (input.isKeyDown('w')) player.moveForward()
if (input.isMouseButtonJustPressed(0)) player.shoot()
const movement = input.getMovementVector() // WASD normalized
```

#### CameraController
Single follow camera with mouse rotation:
- Third-person view only
- Right-click drag to rotate
- No collision detection

```typescript
const camera = CameraController.getInstance()
camera.setTarget(player)
```

#### PhysicsSystem
Cannon-es physics (kept for good game feel):
- Simple collision detection
- Gravity and forces
- Ground detection for jumping

```typescript
const physics = PhysicsSystem.getInstance()
const body = physics.createRigidBody(player, {
  shape: CollisionShape.CAPSULE,
  mass: 1
})
```

#### EffectsSystem
Particle effects only:
- Spawn particles at positions
- Pre-made explosion and sparkle effects
- Object pooled for performance

```typescript
const effects = EffectsSystem.getInstance()
effects.explosion(position, { color: 0xff0000 })
effects.sparkle(collectible.position)
```

#### AudioManager
Simple 2D audio playback:
- Load and play sounds
- Master volume control
- Mute functionality

```typescript
const audio = AudioManager.getInstance()
audio.play2D('jump', { volume: 0.5 })
```

### Game Structure

#### main.ts
- Initializes Three.js (scene, camera, renderer)
- Creates Game instance
- Handles animation loop and resize

#### Game.ts
- Main game logic
- Entity management
- Collision detection
- Level loading

#### Level.ts
- Creates level geometry programmatically
- No JSON loading - all in code
- Two example levels (city and forest themed)

### Entities

#### Player
- Simple capsule shape
- WASD movement
- Space to jump
- Click to shoot

#### Enemy
- Single enemy type
- Follows player when in range
- Simple AI behavior

#### Collectible
- Floating, rotating items
- Gives points when collected
- Object pooled

#### Bullet
- Simple projectile
- Object pooled
- Damages enemies on hit

## Creating Your Game

### Starting Fresh

1. **Keep What You Need**: This template provides basics - keep only what helps
2. **Delete Freely**: Remove any systems or entities you don't need
3. **Build Your Vision**: Add your own game-specific features

### New Helper Classes

#### BaseEntity
All entities can now extend `BaseEntity` for common functionality:
```typescript
import { BaseEntity } from './entities/BaseEntity'

export class MyEntity extends BaseEntity {
  constructor() {
    super(100, 5) // health, speed

    // Create visual
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 })
    this.mesh = new THREE.Mesh(geometry, material)
    this.add(this.mesh)
  }

  update(deltaTime: number): void {
    // Custom update logic
  }
}
```

#### EntityFactory
Quickly spawn entities without knowing all the details:
```typescript
import { EntityFactory } from './entities/EntityFactory'

// Create different enemy types
const basicEnemy = EntityFactory.createEnemy('basic')
const fastEnemy = EntityFactory.createEnemy('fast')
const tankEnemy = EntityFactory.createEnemy('tank')

// Create collectibles
const coin = EntityFactory.createCollectible(10, undefined, 'coin')
const gem = EntityFactory.createCollectible(50, undefined, 'gem')

// Create formations
const enemies = EntityFactory.createEnemyFormation(center, 6, 10)
const items = EntityFactory.createCollectibleGrid(center, 3, 3, 2)
```

#### Typed Events
Events now have full TypeScript support:
```typescript
// Type-safe event listening
eventBus.on('player:damage', (data) => {
  // data is typed as { player: Player; amount: number }
  console.log(`Player took ${data.amount} damage`)
})

// Type-safe event emission
eventBus.emit('item:collect', {
  item: collectible,
  collector: player,
  value: 100
})

### Common Patterns

#### Creating a New Entity
```typescript
export class MyEntity extends THREE.Group {
  constructor() {
    super()
    
    // Create mesh
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 })
    this.mesh = new THREE.Mesh(geometry, material)
    this.add(this.mesh)
    
    // Set user data
    this.userData.type = 'myEntity'
  }
  
  update(deltaTime: number): void {
    // Update logic
    this.rotation.y += deltaTime
  }
}
```

#### Adding Physics
```typescript
const physics = PhysicsSystem.getInstance()
physics.createRigidBody(entity, {
  shape: CollisionShape.BOX,
  mass: 1,
  collisionGroup: PhysicsSystem.COLLISION_GROUP.DEFAULT
})
```

#### Handling Input
```typescript
const input = InputManager.getInstance()

// In update loop
if (input.isKeyDown('Space')) {
  // Jump
}

const movement = input.getMovementVector()
player.move(movement.x, movement.y)
```

## Tips for Success

1. **Start Simple**: Get basic gameplay working first
2. **Iterate Quickly**: Test often, refine constantly
3. **Use the Console**: `logger.info()` is your friend
4. **Profile Performance**: Keep an eye on FPS
5. **Have Fun**: This is your game - make it awesome!

## What Was Removed

To keep things simple, we removed:
- Multiple camera modes and switching
- Complex input action/axis mapping system
- Configuration management system
- Scene management system
- JSON level loading
- Save/load functionality
- Multiple enemy types
- Gamepad support
- Complex health/damage systems

You can always add these back if your game needs them!

## Quick Reference

### Essential Imports
```typescript
import * as THREE from 'three'
import { GameManager, GameState } from './systems/GameManager'
import { InputManager } from './systems/InputManager'
import { PhysicsSystem } from './systems/PhysicsSystem'
import { EffectsSystem } from './systems/EffectsSystem'
import { AudioManager } from './systems/AudioManager'
import { eventBus, GameEvents } from './utils/EventBus'
import { logger } from './utils/Logger'
```

### Common Events
- `GameEvents.PLAYER_DEATH`
- `GameEvents.PLAYER_DAMAGE`
- `GameEvents.ENEMY_DEATH`
- `GameEvents.ITEM_COLLECT`
- `GameEvents.GAME_OVER`

### Input Keys
- WASD or Arrow Keys - Movement
- Space - Jump
- Left Click - Shoot
- Right Click + Drag - Rotate camera
- P - Pause
- M - Mute

Remember: This is just a starting point. The best game is the one you create!