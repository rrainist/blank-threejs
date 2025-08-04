# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Getting Started - This is YOUR Game Now!

**IMPORTANT**: This template is a starting point, not a rigid framework. The example game (`main.game.ts`) is just a demonstration - you should completely replace it with your own game! Feel free to:
- Delete the entire example game and start fresh
- Modify or replace any systems that don't fit your needs  
- Add new systems and utilities as needed
- Change the architecture to match your game's requirements

Think of this as a "Hello World" for Three.js games - it shows you what's possible, but you're meant to build something entirely different on top of it.

## Commands

### Development
- `npm run dev` - Start development server (main.ts - simple rotating cube)
- `npm run dev:game` - Start with full game example (main.game.ts)
- `npm run build` - TypeScript check and production build to `dist/`
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Building Your Game

### Quick Start Options

1. **Start Fresh** (Recommended for new games):
   ```typescript
   // Replace main.ts with your game code
   // Use the systems you need, ignore the rest
   ```

2. **Modify the Example**:
   ```typescript
   // Edit main.game.ts to transform it into your game
   // Remove enemies, change player behavior, add new mechanics
   ```

3. **Mix and Match**:
   ```typescript
   // Cherry-pick systems you like
   // Write custom systems for unique features
   ```

## Available Systems

Here's what each system does and when to use it:

### Core Systems

#### GameManager
Handles game flow and state. Use it for:
- Game states (menu, playing, paused, game over)
- Score and lives tracking  
- Save/load game progress
- Level progression

```typescript
const gameManager = GameManager.getInstance()
gameManager.changeState(GameState.PLAYING)
gameManager.addScore(100)
if (gameManager.getLives() === 0) gameManager.gameOver()
```

#### TimeManager  
Manages all time-related operations. Use it for:
- Getting frame-independent delta time
- Creating timers and intervals
- Time scaling (slow motion effects)
- FPS monitoring

```typescript
const timeManager = TimeManager.getInstance()
const deltaTime = timeManager.getDeltaTime()
timeManager.setTimeout(() => spawnEnemy(), 2000) // 2 seconds
timeManager.setTimeScale(0.5) // Half speed
```

#### InputManager
Handles all player input. Use it for:
- Mapping keys/buttons to actions
- Supporting keyboard, mouse, gamepad, touch
- Checking input state (pressed, released, held)

```typescript
const input = InputManager.getInstance()
input.addAction('jump', { keys: ['Space'], gamepadButtons: [0] })
if (input.isActionJustPressed('jump')) player.jump()
const moveX = input.getAxis('horizontal') // -1 to 1
```

#### CameraController
Manages the game camera. Use it for:
- Different camera modes (first/third person, top-down)
- Smooth camera following
- Orthographic/perspective switching

```typescript
const camera = CameraController.getInstance()
camera.setTarget(player)
camera.setIsometricView() // Or setTopDownView(), setDefaultView()
camera.switchToOrthographic() // For 2D-style games
```

#### PhysicsSystem
Simple physics for games. Use it for:
- Collision detection between objects
- Gravity and forces
- Raycasting (line of sight, shooting)

```typescript
const physics = PhysicsSystem.getInstance()
const body = physics.createRigidBody(player, {
  shape: CollisionShape.CAPSULE,
  mass: 1,
  collisionGroup: PhysicsSystem.COLLISION_GROUP.PLAYER
})
physics.applyImpulse(body, jumpForce)
```

#### EffectsSystem
Visual effects and polish. Use it for:
- Particle effects (explosions, sparkles)
- Screen shake and flash
- Trail effects for projectiles

```typescript
const effects = EffectsSystem.getInstance()
effects.explosion(enemyPosition, { size: 2, count: 50 })
effects.screenShake(0.5, 1.0) // duration, intensity
effects.startTrail(bullet, { color: 0xffff00 })
```

#### AudioManager
Sound and music playback. Use it for:
- Playing sound effects
- Background music
- 3D positional audio
- Volume control

```typescript
const audio = AudioManager.getInstance()
audio.play2D('explosion', { volume: 0.5 })
audio.play3D('footstep', position, { volume: 0.3 })
audio.setMasterVolume(0.8)
```

#### LevelManager  
Level loading and management. Use it for:
- Loading levels from JSON files
- Spawn point management
- Creating level geometry
- Boundary checking

```typescript
const levels = LevelManager.getInstance()
await levels.loadLevelFromFile('assets/levels/level1.json')
const playerSpawn = levels.getSpawnPoint('player')
if (!levels.isInBounds(position)) player.die()
```

### Utility Systems

#### EventBus
Decoupled communication between systems:
```typescript
eventBus.on('player:died', () => gameManager.loseLife())
eventBus.emit('enemy:spawned', { position, type })
```

#### ObjectPool  
Efficient object reuse for bullets, particles, enemies:
```typescript
// Note: Requires arrow function for factory!
const bulletPool = new ObjectPool(
  () => new Bullet(),  // Factory function
  50,                  // Pool size
  100                  // Max size
)
const bullet = bulletPool.get()
// Use bullet...
bulletPool.release(bullet)
```

#### Storage
Save/load game data:
```typescript
const storage = Storage.getInstance()
storage.save('checkpoint', { level: 3, score: 1000 })
const data = storage.load('checkpoint')
```

## Creating Your Game

### Starting Fresh

```typescript
// main.ts - Your game entry point
import * as THREE from 'three'
import { GameManager, GameState } from './systems/GameManager'
import { InputManager } from './systems/InputManager'
import { CameraController } from './systems/CameraController'
// Import only the systems you need!

class MyGame {
  private scene: THREE.Scene
  private camera: THREE.Camera
  private renderer: THREE.WebGLRenderer
  
  constructor() {
    // Setup Three.js basics
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(75, ...)
    this.renderer = new THREE.WebGLRenderer()
    
    // Initialize systems you need
    const input = InputManager.getInstance()
    const gameManager = GameManager.getInstance()
    const cameraController = CameraController.initialize(this.camera)
    
    // Setup your game
    this.setupGame()
  }
  
  private setupGame(): void {
    // Your game-specific setup
    // Create player, enemies, levels, etc.
  }
}
```

### Common Game Patterns

#### Creating a Player Character
```typescript
class Player extends THREE.Group {
  private velocity = new THREE.Vector3()
  private health = 100
  
  constructor() {
    super()
    
    // Create visual mesh
    const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8)
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 })
    const mesh = new THREE.Mesh(geometry, material)
    this.add(mesh)
    
    // Add physics
    const physics = PhysicsSystem.getInstance()
    physics.createRigidBody(this, {
      shape: CollisionShape.CAPSULE,
      mass: 1,
      collisionGroup: PhysicsSystem.COLLISION_GROUP.PLAYER
    })
  }
  
  update(deltaTime: number): void {
    // Handle input
    const input = InputManager.getInstance()
    const moveX = input.getAxis('horizontal')
    const moveZ = input.getAxis('vertical')
    
    // Move player
    this.velocity.x = moveX * PLAYER_SPEED
    this.velocity.z = moveZ * PLAYER_SPEED
    
    // Apply movement
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime))
  }
}
```

#### Setting Up Game Loop
```typescript
private animate = (): void => {
  requestAnimationFrame(this.animate)
  
  // Update systems
  const deltaTime = this.timeManager.getDeltaTime()
  this.inputManager.update()
  
  // Update game logic only when playing
  if (this.gameManager.isInState(GameState.PLAYING)) {
    this.physicsSystem.update(deltaTime)
    this.player.update(deltaTime)
    this.enemies.forEach(enemy => enemy.update(deltaTime))
    this.effectsSystem.update(deltaTime)
    this.cameraController.update(deltaTime)
  }
  
  // Always update UI
  this.uiManager.update(deltaTime)
  
  // Render
  this.renderer.render(this.scene, this.camera)
}
```

#### Spawning Enemies with Object Pool
```typescript
// Setup enemy pool
this.enemyPool = new ObjectPool(
  () => new Enemy(),
  20,  // initial size
  50   // max size
)

// Spawn enemy
spawnEnemy(position: THREE.Vector3): void {
  const enemy = this.enemyPool.get()
  enemy.position.copy(position)
  enemy.reset() // Reset health, state, etc.
  this.scene.add(enemy)
  this.activeEnemies.push(enemy)
}

// Return to pool when dead
killEnemy(enemy: Enemy): void {
  this.scene.remove(enemy)
  this.enemyPool.release(enemy)
  this.activeEnemies = this.activeEnemies.filter(e => e !== enemy)
}
```

#### Implementing Game States
```typescript
// Listen for state changes
this.gameManager.onStateChange((from, to) => {
  switch(to) {
    case GameState.MENU:
      this.showMainMenu()
      break
    case GameState.PLAYING:
      this.startGameplay()
      break
    case GameState.PAUSED:
      this.showPauseMenu()
      break
    case GameState.GAME_OVER:
      this.showGameOver()
      break
  }
})

// Handle pause
if (input.isActionJustPressed('pause')) {
  this.gameManager.togglePause()
}
```

## Level Design

### JSON Level Format
Create levels in `assets/levels/` folder:

```json
{
  "name": "Desert Ruins",
  "environment": {
    "fogColor": "0xFFCC99",
    "fogNear": 10,
    "fogFar": 100,
    "ambientLight": {
      "color": "0x404040",
      "intensity": 0.8
    }
  },
  "ground": {
    "size": [100, 100],
    "color": "0xC19A6B"
  },
  "objects": [
    {
      "type": "box",
      "position": [0, 5, -20],
      "size": [10, 10, 2],
      "color": "0x8B7355",
      "castShadow": true
    }
  ],
  "spawnPoints": [
    { "type": "player", "position": [0, 1, 0] },
    { "type": "enemy", "position": [10, 1, -10] },
    { "type": "collectible", "position": [-5, 1, 5] }
  ]
}
```

### Loading and Using Levels
```typescript
// Load level
await levelManager.loadLevelFromFile('assets/levels/desert.json')

// Spawn player at designated point
const spawn = levelManager.getSpawnPoint('player')
player.position.copy(spawn.position)

// Spawn enemies at their points
levelManager.getSpawnPoints('enemy').forEach(spawn => {
  this.spawnEnemy(spawn.position)
})
```

## Advanced Patterns

### Custom Systems
Create your own systems following the singleton pattern:

```typescript
export class InventorySystem {
  private static instance: InventorySystem
  private items: Map<string, number> = new Map()
  
  static getInstance(): InventorySystem {
    if (!InventorySystem.instance) {
      InventorySystem.instance = new InventorySystem()
    }
    return InventorySystem.instance
  }
  
  addItem(itemId: string, count = 1): void {
    const current = this.items.get(itemId) || 0
    this.items.set(itemId, current + count)
    eventBus.emit('inventory:changed', { itemId, count: current + count })
  }
  
  dispose(): void {
    this.items.clear()
  }
}
```

### Performance Optimization

1. **Use Object Pools** for frequently created/destroyed objects:
   - Bullets, particles, enemies, collectibles
   
2. **Batch Operations** where possible:
   ```typescript
   // Update all enemies in one pass
   this.enemies.forEach(enemy => enemy.update(deltaTime))
   ```
   
3. **Level of Detail (LOD)**:
   ```typescript
   const lod = new THREE.LOD()
   lod.addLevel(highDetailMesh, 0)
   lod.addLevel(mediumDetailMesh, 50)
   lod.addLevel(lowDetailMesh, 100)
   ```

4. **Frustum Culling** is automatic in Three.js - just ensure:
   ```typescript
   mesh.frustumCulled = true // Default
   ```

## Game Architecture Tips

### Entity Component Pattern
While the template uses inheritance (extending THREE.Group), you can implement ECS if preferred:

```typescript
// Component
interface HealthComponent {
  current: number
  max: number
}

// Entity
class Entity {
  components: Map<string, any> = new Map()
  
  addComponent(name: string, component: any): void {
    this.components.set(name, component)
  }
  
  getComponent<T>(name: string): T {
    return this.components.get(name)
  }
}
```

### State Machines for AI
```typescript
enum EnemyState {
  IDLE,
  PATROL,
  CHASE,
  ATTACK
}

class Enemy extends THREE.Group {
  private state = EnemyState.IDLE
  
  update(deltaTime: number): void {
    switch(this.state) {
      case EnemyState.IDLE:
        this.checkForPlayer()
        break
      case EnemyState.PATROL:
        this.followPath()
        break
      case EnemyState.CHASE:
        this.chasePlayer()
        break
    }
  }
}
```

### Save System Integration
```typescript
// Define what to save
interface SaveData {
  playerPosition: number[]
  playerHealth: number
  currentLevel: string
  inventory: Record<string, number>
  gameTime: number
}

// Save game
const saveData: SaveData = {
  playerPosition: player.position.toArray(),
  playerHealth: player.health,
  currentLevel: 'level2',
  inventory: inventorySystem.getAll(),
  gameTime: timeManager.getElapsedTime()
}
storage.save('savegame', saveData)

// Load game
const data = storage.load('savegame') as SaveData
if (data) {
  player.position.fromArray(data.playerPosition)
  player.health = data.playerHealth
  await levelManager.loadLevelFromFile(data.currentLevel)
}
```

## Quick Reference

### System Initialization Order
```typescript
// 1. Core systems (no dependencies)
const timeManager = TimeManager.getInstance()
const inputManager = InputManager.getInstance()
const gameManager = GameManager.getInstance()
const storage = Storage.getInstance()
const config = ConfigurationManager.getInstance()

// 2. Systems that need initialization
const audioManager = AudioManager.initialize()
const physicsSystem = PhysicsSystem.getInstance()

// 3. Systems that need scene/camera/renderer
const cameraController = CameraController.initialize(camera)
const sceneManager = SceneManager.initialize(scene, camera, renderer)
const effectsSystem = EffectsSystem.initialize(scene, camera, renderer)
const levelManager = LevelManager.initialize(scene)
const uiManager = UIManager.initialize()
```

### Common Constants
```typescript
import { PHYSICS, PLAYER, ENEMY, FIELD, SCENE } from './constants/GameConstants'

// Use predefined constants
const jumpForce = PHYSICS.JUMP_FORCE
const fieldWidth = FIELD.WIDTH
const playerHealth = PLAYER.HEALTH
```

### Input Action Names (from example)
These are just examples - define your own!
- `'jump'` - Space key
- `'fire'` - Left mouse button  
- `'pause'` - Escape or P key
- `'horizontal'` - A/D or Arrow keys (axis: -1 to 1)
- `'vertical'` - W/S or Arrow keys (axis: -1 to 1)

### Remember
- This is YOUR game - delete anything you don't need
- The example game is just one way to do things
- Feel free to create your own systems and patterns
- Performance > Features - only use what you need
- Have fun and experiment!

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
