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

### Player
- Handles input through InputManager
- Emits events for actions (jump, attack, shoot)
- Usually singleton in the game

### Enemies
- Different AI behaviors (patrol, chase, shoot)
- Target tracking
- State machines for complex behavior

### Collectibles
- Trigger collection on proximity
- Visual effects (floating, spinning)
- Value and scoring integration

### Projectiles
- Physics-based movement
- Collision detection
- Limited lifetime
- Object pooling for performance

## Best Practices

1. **Keep It Simple**: Entities should focus on their core behavior
2. **Use Composition**: Add features through systems rather than inheritance
3. **Events Over Coupling**: Use EventBus for entity communication
4. **Pool Frequently**: Use ObjectPool for entities created often
5. **Visual Feedback**: Always provide visual feedback for state changes

## Common Patterns

### Movement
```typescript
// Basic movement
this.position.x += this.velocity.x * deltaTime
this.position.z += this.velocity.z * deltaTime

// With physics
const physics = PhysicsSystem.getInstance()
const body = physics.createRigidBody(this)
physics.applyForce(body, moveForce)
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

### Collision Response
```typescript
// Using PhysicsSystem
const physics = PhysicsSystem.getInstance()
physics.onCollision(this.rigidBody, (collision) => {
  if (collision.bodyB.object.userData.type === 'player') {
    this.onPlayerCollision(collision.bodyB.object)
  }
})

// Manual checking
checkCollisions(): void {
  const player = this.scene.getObjectByName('Player')
  if (player) {
    const distance = this.position.distanceTo(player.position)
    if (distance < this.collisionRadius) {
      this.onPlayerCollision(player)
    }
  }
}
```