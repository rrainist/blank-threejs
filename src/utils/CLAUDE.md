# Utility Classes

This directory contains reusable utility classes and helper functions.

## Core Utilities

### EventBus
A type-safe event system for decoupled communication between game systems.

```typescript
// Define events
const GameEvents = {
  PLAYER_JUMP: 'player:jump',
  ITEM_COLLECT: 'item:collect',
  ENEMY_DEATH: 'enemy:death'
} as const

// Emit events
eventBus.emit(GameEvents.PLAYER_JUMP, { 
  player: playerRef, 
  height: 10 
})

// Listen for events
const unsubscribe = eventBus.on(GameEvents.ITEM_COLLECT, (event) => {
  console.log(`Collected: ${event.item.name}`)
})

// Clean up
unsubscribe()
```

### ObjectPool
Generic object pooling system for performance optimization.

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
bullet.fire(origin, direction)

// Return to pool
bulletPool.release(bullet)

// Check pool stats
const stats = bulletPool.getStats()
console.log(`Pool utilization: ${stats.utilization * 100}%`)
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

### Type-Safe Events
```typescript
// Define event types
interface GameEventMap {
  'player:jump': { player: Player; height: number }
  'item:collect': { item: Item; collector: Player }
  'level:complete': { level: number; score: number }
}

// Create typed event bus
class TypedEventBus<T extends Record<string, any>> {
  emit<K extends keyof T>(event: K, data: T[K]): void
  on<K extends keyof T>(event: K, handler: (data: T[K]) => void): () => void
}

const gameEvents = new TypedEventBus<GameEventMap>()
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

## Best Practices

1. **Use Pools**: Always pool frequently created objects
2. **Clean Up Events**: Store and call unsubscribe functions
3. **Handle Errors**: Use ErrorHandler for robust error management
4. **Log Wisely**: Use appropriate log levels and structured data
5. **Profile Performance**: Monitor critical paths with timing
6. **Type Everything**: Leverage TypeScript for type safety
7. **Document Utils**: Add JSDoc comments for complex utilities