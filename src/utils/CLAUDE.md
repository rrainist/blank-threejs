# Utility Classes

This directory contains reusable utility classes and helper functions.

## Core Utilities

### EventBus
Simple event system for decoupled communication between game systems.

```typescript
// Events defined in EventBus.ts
export enum GameEvents {
  // Game state
  GAME_OVER = 'game:over',
  
  // Player events
  PLAYER_DEATH = 'player:death',
  PLAYER_DAMAGE = 'player:damage',
  
  // Enemy events
  ENEMY_DEATH = 'enemy:death',
  
  // Item events
  ITEM_COLLECT = 'item:collect',
  
  // Level events
  LEVEL_COMPLETE = 'level:complete'
}

// Emit events
eventBus.emit(GameEvents.PLAYER_DAMAGE)
eventBus.emit(GameEvents.ITEM_COLLECT, { itemType: 'coin', value: 10 })

// Listen for events
const unsubscribe = eventBus.on(GameEvents.ITEM_COLLECT, (data) => {
  console.log('Collected item:', data)
})

// Clean up
unsubscribe()
```

### ObjectPool
Generic object pooling system for performance optimization. Used extensively for bullets and collectibles.

```typescript
// Create a pool
const bulletPool = new ObjectPool<Bullet>(
  () => new Bullet(),           // Factory function
  20,                           // Initial size
  100,                          // Max size
  (bullet) => bullet.reset()    // Reset function
)

// Get object from pool
const bullet = bulletPool.get()
if (bullet) {
  bullet.fire(origin, direction)
  scene.add(bullet)
}

// Return to pool
bulletPool.release(bullet)

// Iterate over active objects
bulletPool.forEach(bullet => {
  if (bullet.active) {
    bullet.update(deltaTime)
  }
})

// Check pool stats
const stats = bulletPool.getStats()
console.log(`Active: ${stats.activeCount}/${stats.totalCount} (${Math.round(stats.utilization * 100)}%)`)

// Filter active objects
const activeBullets = bulletPool.filter(bullet => bullet.active)
```

### Logger
Structured logging with different levels and optional file/line info.

```typescript
// Log at different levels
logger.debug('Debug info', { data: someObject })
logger.info('Game started')
logger.warn('Low memory', { available: memoryMB })
logger.error('Failed to load asset', error)

// Set log level
Logger.setLevel('warn') // Only warn and error will show

// Conditional logging
if (logger.isEnabled('debug')) {
  // Expensive debug operation
}
```

### ErrorHandler
Centralized error handling with recovery strategies.

```typescript
// Set up global handler
ErrorHandler.initialize({
  onError: (error, context) => {
    // Log to external service
    analyticsService.logError(error, context)
  },
  enableRecovery: true
})

// Handle specific errors
ErrorHandler.handle(error, {
  context: 'asset-loading',
  severity: 'warning',
  metadata: { assetUrl: url }
})

// Wrap risky operations
const result = ErrorHandler.try(
  () => riskyOperation(),
  'Failed to perform risky operation'
)
```

### Resize Handler
Responsive canvas and camera management.

```typescript
// Set up resize handling
window.addEventListener('resize', () => {
  handleResize(camera, renderer)
})

// The handler automatically:
// - Updates renderer size
// - Adjusts camera aspect ratio
// - Maintains pixel ratio for sharp rendering
// - Works with both perspective and orthographic cameras
```

## Utility Patterns

### Event Usage
```typescript
// Simple event emission
eventBus.emit(GameEvents.PLAYER_DAMAGE)
eventBus.emit(GameEvents.ITEM_COLLECT, { value: 100 })

// Listen and cleanup
const unsubscribe = eventBus.on(GameEvents.ENEMY_DEATH, (data) => {
  gameManager.addScore(100)
})

// Clean up when done
unsubscribe()
```

### Performance Monitoring
```typescript
// Time critical operations
const timer = performance.now()
expensiveOperation()
const elapsed = performance.now() - timer

if (elapsed > 16) { // More than one frame
  logger.warn(`Operation took ${elapsed}ms`)
}

// Use TimeManager for game time
const timeManager = TimeManager.getInstance()
const gameTime = timeManager.getElapsedTime()
```

### Resource Cleanup
```typescript
class ResourceManager {
  private resources: Array<{ dispose: () => void }> = []
  
  add<T extends { dispose: () => void }>(resource: T): T {
    this.resources.push(resource)
    return resource
  }
  
  dispose(): void {
    this.resources.forEach(r => r.dispose())
    this.resources = []
  }
}

// Usage
const resources = new ResourceManager()
const texture = resources.add(new THREE.TextureLoader().load('...'))
const geometry = resources.add(new THREE.BoxGeometry())

// Clean up everything at once
resources.dispose()
```

### Debugging Helpers
```typescript
// Conditional debug rendering
if (DEBUG_MODE) {
  const helper = new THREE.BoxHelper(mesh, 0xff0000)
  scene.add(helper)
}

// Performance markers
if (logger.isEnabled('debug')) {
  performance.mark('physics-start')
  updatePhysics()
  performance.mark('physics-end')
  performance.measure('physics', 'physics-start', 'physics-end')
}

// Object inspection
function debugObject(obj: THREE.Object3D): void {
  console.group(obj.name || 'Object')
  console.log('Position:', obj.position.toArray())
  console.log('Rotation:', obj.rotation.toArray())
  console.log('Scale:', obj.scale.toArray())
  console.log('Children:', obj.children.length)
  console.log('User Data:', obj.userData)
  console.groupEnd()
}
```

## Current Event Types

Events are defined in `src/utils/EventBus.ts`:
- `GAME_OVER` - Game has ended
- `PLAYER_DEATH` - Player died
- `PLAYER_DAMAGE` - Player took damage
- `ENEMY_DEATH` - Enemy defeated
- `ITEM_COLLECT` - Item collected
- `LEVEL_COMPLETE` - Level finished

## Best Practices

1. **Use Pools**: Always pool frequently created objects (bullets, particles, collectibles)
2. **Clean Up Events**: Store and call unsubscribe functions
3. **Handle Errors**: Use ErrorHandler for robust error management
4. **Log Wisely**: Use appropriate log levels and structured data
5. **Profile Performance**: Monitor critical paths with timing
6. **Type Everything**: Leverage TypeScript for type safety
7. **Document Utils**: Add JSDoc comments for complex utilities
8. **Event Naming**: Use colon-separated naming for events (e.g., 'player:jump')
9. **Pool Reset**: Always implement proper reset logic for pooled objects