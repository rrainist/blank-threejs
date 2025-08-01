# Entity Creation Guidelines

This directory contains game entity classes that extend Three.js objects.

## Entity Design Pattern

All entities in this template follow a simple pattern:
1. Extend `THREE.Group` or `THREE.Object3D`
2. Create visual representation (meshes, sprites)
3. Add game-specific properties (health, speed, etc.)
4. Implement `update(deltaTime)` method
5. Set `userData.type` for identification

## Base Entity Structure

```typescript
export class Entity extends THREE.Group {
  // Game properties
  health: number
  speed: number
  
  // Visual components
  mesh: THREE.Mesh
  
  // State
  active: boolean = true
  
  constructor() {
    super()
    
    // Create visual representation
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.add(this.mesh)
    
    // Initialize properties
    this.health = 100
    this.speed = 5
    
    // Set identification
    this.userData.type = 'entity'
    this.name = 'Entity'
  }
  
  update(deltaTime: number): void {
    // Update logic here
  }
  
  takeDamage(amount: number): void {
    this.health -= amount
    if (this.health <= 0) {
      this.onDeath()
    }
  }
  
  onDeath(): void {
    // Death logic
    eventBus.emit('entity:death', { entity: this })
  }
}
```

## Poolable Entities

For entities that are frequently created/destroyed (bullets, particles, pickups), implement the Poolable interface:

```typescript
import { Poolable } from '../utils/ObjectPool'

export class Bullet extends THREE.Group implements Poolable {
  active = false
  
  reset(): void {
    // Reset all properties to initial state
    this.position.set(0, 0, 0)
    this.active = false
    this.visible = false
  }
  
  activate(position: THREE.Vector3): void {
    this.position.copy(position)
    this.active = true
    this.visible = true
  }
}
```

## Entity Categories

### Player (`Player.ts`)
- Capsule-shaped character with physics integration
- WASD movement with force-based physics
- Jump mechanics with ground detection
- Shooting with mouse aiming
- Melee attack capability
- Health system with damage/heal methods
- Emits events: `player:jump`, `player:shoot`, `player:attack`, `player:land`, `player:wallHit`

### Enemies (`Enemy.ts`)
- Three types: PATROL, SHOOTER, CHASER
- AI behaviors:
  - **PATROL**: Follows waypoints or moves randomly
  - **SHOOTER**: Stays at distance and shoots projectiles
  - **CHASER**: Actively pursues the player
- Target tracking and attack patterns
- State machine implementation
- Health system with visual feedback
- Configurable through `GameConstants`

### Collectibles (`Collectible.ts`)
- Floating, rotating items
- Configurable value and color
- Collection particle effects
- Object pooling support
- Emits `ITEM_COLLECT` event on collection

### Projectiles (`Bullet.ts`)
- Fast-moving projectiles with trail effect
- Limited lifetime (auto-cleanup)
- Object pooling for performance
- Damage dealing on impact
- Visual feedback (emissive material)

## Best Practices

1. **Keep It Simple**: Entities should focus on their core behavior
2. **Use Composition**: Add features through systems rather than inheritance
3. **Events Over Coupling**: Use EventBus for entity communication
4. **Pool Frequently**: Use ObjectPool for entities created often
5. **Visual Feedback**: Always provide visual feedback for state changes

## Current Entities Implementation

### Constants Configuration
All entity properties are centralized in `src/constants/GameConstants.ts`:
```typescript
export const PLAYER = {
  HEALTH: 100,
  MOVE_SPEED: 8,
  JUMP_SPEED: 12,
  ATTACK_DAMAGE: 25,
  ATTACK_RANGE: 2,
  CAPSULE_RADIUS: 0.5,
  CAPSULE_HEIGHT: 1
}

export const ENEMY = {
  COMMON: {
    HEALTH: 50,
    MOVE_SPEED: 3,
    ATTACK_DAMAGE: 10,
    DEATH_POINTS: 100
  },
  PATROL: { PATROL_RADIUS: 5 },
  SHOOTER: { SHOOT_RANGE: 15, FIRE_RATE: 2 },
  CHASER: { CHASE_RANGE: 10, CHASE_SPEED: 5 }
}
```

## Common Patterns

### Movement
```typescript
// Basic movement
this.position.x += this.velocity.x * deltaTime
this.position.z += this.velocity.z * deltaTime

// Force-based physics movement (used by Player)
if (this.rigidBody) {
  const force = new THREE.Vector3(
    horizontal * forceMultiplier,
    0,
    -vertical * forceMultiplier
  )
  this.physics.applyForce(this.rigidBody, force)
}
```

### Health System
```typescript
takeDamage(amount: number): void {
  this.health -= amount
  
  // Visual feedback
  this.flashRed()
  
  // Check death
  if (this.health <= 0) {
    eventBus.emit(GameEvents.ENTITY_DEATH, { entity: this })
  }
}

heal(amount: number): void {
  this.health = Math.min(this.maxHealth, this.health + amount)
  
  // Visual feedback
  this.flashGreen()
}
```

### State Management
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
    switch (this.state) {
      case EnemyState.IDLE:
        this.updateIdle(deltaTime)
        break
      case EnemyState.PATROL:
        this.updatePatrol(deltaTime)
        break
      // etc...
    }
  }
}
```

### Shooting Mechanics
```typescript
// Player shooting (mouse-aimed)
shoot(direction: THREE.Vector3): void {
  const shootOrigin = this.position.clone()
  shootOrigin.y = 1 // Center height
  
  eventBus.emit('player:shoot', {
    player: this,
    origin: shootOrigin,
    direction: direction.clone()
  })
}

// Bullet handling
const bullet = bulletPool.get()
if (bullet) {
  bullet.fire(origin, direction)
  scene.add(bullet)
}
```

### Collision Response
```typescript
// Using PhysicsSystem
const physics = PhysicsSystem.getInstance()
physics.onCollision(this.rigidBody, (collision) => {
  if (collision.bodyB.object.userData.type === 'player') {
    this.onPlayerCollision(collision.bodyB.object)
  }
})

// Manual distance checking (used for collectibles)
checkCollisions(): void {
  const distance = playerPos.distanceTo(collectible.position)
  if (distance < 1.5) { // Collection radius
    eventBus.emit(GameEvents.ITEM_COLLECT, {
      item: collectible,
      collector: player,
      value: collectible.value
    })
  }
}
```