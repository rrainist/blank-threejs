# Entity Creation Guidelines

This directory contains game entity classes that extend Three.js objects.

## Entity Design Pattern

All entities follow a simple pattern:
1. Extend `THREE.Group`
2. Create visual representation (mesh)
3. Add basic properties (health, speed)
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
    this.health = Math.max(0, this.health - amount)
    // Visual feedback
    // Emit events if needed
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
- Capsule-shaped character with physics
- WASD movement (force-based)
- Space to jump (with ground detection)
- Left click to shoot
- Simple health system
- Emits events: `player:jump`, `player:shoot`, `player:wallHit`

### Enemy (`Enemy.ts`)
- Single enemy type (red box)
- Simple AI: move toward player when in range
- Attack when close enough
- Basic health system
- Visual feedback on damage

### Collectible (`Collectible.ts`)
- Floating, rotating items
- Value-based scoring
- Particle effect on collection
- Object pooling support
- Emits `ITEM_COLLECT` event

### Bullet (`Bullet.ts`)
- Fast projectiles
- Limited lifetime (3 seconds)
- Object pooling
- Damage on impact

## Best Practices

1. **Keep It Simple**: Entities should focus on their core behavior
2. **Use Composition**: Add features through systems rather than inheritance
3. **Events Over Coupling**: Use EventBus for entity communication
4. **Pool Frequently**: Use ObjectPool for entities created often
5. **Visual Feedback**: Always provide visual feedback for state changes

## Constants Configuration

All entity properties are in `src/constants/GameConstants.ts`:
```typescript
export const PLAYER = {
  HEALTH: 100,
  MOVE_SPEED: 8,
  JUMP_SPEED: 12,
  CAPSULE_RADIUS: 0.5,
  CAPSULE_HEIGHT: 1,
  COLOR: 0x00ff00,
  EMISSIVE_COLOR: 0x004400
}

export const ENEMY = {
  HEALTH: 50,
  SPEED: 3,
  ATTACK_DAMAGE: 10,
  ATTACK_RANGE: 2,
  DETECTION_RANGE: 15,
  COLOR: 0xff0000,
  EMISSIVE_COLOR: 0x440000
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
  this.health = Math.max(0, this.health - amount)
  
  // Visual feedback - flash color
  const material = this.mesh.material as THREE.MeshPhongMaterial
  const originalColor = material.color.getHex()
  material.color.setHex(0xffffff)
  setTimeout(() => material.color.setHex(originalColor), 100)
  
  // Check death
  if (this.health <= 0) {
    eventBus.emit(GameEvents.ENEMY_DEATH, { enemy: this })
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

### Collision Detection
```typescript
// Physics collision callbacks
physics.onCollision(this.rigidBody, (collision) => {
  const other = collision.bodyB.object
  if (other.userData.type === 'bullet') {
    this.takeDamage(10)
  }
})

// Distance-based collection
const distance = player.position.distanceTo(collectible.position)
if (distance < 1.5) {
  eventBus.emit(GameEvents.ITEM_COLLECT, {
    value: collectible.value
  })
}
```