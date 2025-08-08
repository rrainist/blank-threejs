# Systems Architecture

This directory contains the core game systems that manage different aspects of the game.

## System Design Principles

1. **Singleton Pattern**: All systems use the singleton pattern for easy global access
2. **Initialization**: Systems that need scene references use `initialize()` method
3. **Simple API**: Each system has a focused, easy-to-use interface

## Core Systems

### GameManager

Manages game state and progression.

**Features:**

- Game states (menu, playing, paused, game over)
- Score and lives tracking
- State change callbacks

**Usage:**

```typescript
const gameManager = GameManager.getInstance();

// Change state
gameManager.changeState(GameState.PLAYING);

// Score management
gameManager.addScore(100);
const score = gameManager.getScore();

// Lives management
gameManager.setLives(3);
gameManager.loseLife();

// State callbacks
gameManager.onStateChange((from, to) => {
  console.log(`State changed from ${from} to ${to}`);
});
```

### InputManager

Direct keyboard and mouse input handling.

**Features:**

- Key state checking (down, just pressed, just released)
- Mouse position and button states
- Movement vector helper

**Usage:**

```typescript
const input = InputManager.getInstance();

// Keyboard
if (input.isKeyDown("w")) player.moveForward();
if (input.isKeyJustPressed(" ")) player.jump();

// Mouse
if (input.isMouseButtonJustPressed(0)) player.shoot();
const mousePos = input.getMousePosition(); // Normalized -1 to 1

// Movement helper
const movement = input.getMovementVector(); // WASD/Arrows normalized
```

### CameraController

Simple third-person follow camera.

**Features:**

- Follow target
- Mouse rotation (right-click drag)
- Automatic resize handling

**Usage:**

```typescript
const camera = CameraController.initialize(orthographicCamera);

// Set target to follow
camera.setTarget(player);

// Camera updates automatically in update()
camera.update(deltaTime);
```

### PhysicsSystem

Cannon-es physics integration.

**Features:**

- Rigid body creation
- Collision detection
- Force application
- Ground detection

**Usage:**

```typescript
const physics = PhysicsSystem.getInstance();

// Create rigid body
const body = physics.createRigidBody(mesh, {
  shape: CollisionShape.BOX,
  mass: 1,
  collisionGroup: PhysicsSystem.COLLISION_GROUP.PLAYER,
});

// Apply forces
physics.applyForce(body, new THREE.Vector3(0, 100, 0));

// Check if grounded
const isGrounded = physics.isGrounded(body);

// Collision callbacks
physics.onCollision(body, (collision) => {
  console.log("Hit something!", collision.bodyB);
});
```

### EffectsSystem

Particle effects system.

**Features:**

- Particle spawning
- Pre-made effects (explosion, sparkle)
- Object pooling

**Usage:**

```typescript
const effects = EffectsSystem.initialize(scene);

// Spawn custom particles
effects.spawnParticles(position, 20, {
  color: 0xff0000,
  lifetime: 1,
  speed: 5,
});

// Pre-made effects
effects.explosion(position);
effects.sparkle(position, { color: 0xffff00 });
```

### AudioManager

Simple 2D audio playback.

**Features:**

- Sound loading and playback
- Volume control
- Mute functionality

**Usage:**

```typescript
const audio = AudioManager.initialize();

// Play sounds
audio.play2D("jump", { volume: 0.5 });

// Volume control
audio.setMasterVolume(0.8);
audio.toggleMute();
```

### AssetLoader

Basic texture and sound loading.

**Features:**

- Texture loading with caching
- Sound loading with caching
- Common texture generation

**Usage:**

```typescript
const assets = AssetLoader.getInstance();

// Load assets
await assets.loadTexture("player", "assets/textures/player.png");
await assets.loadSound("jump", "assets/sounds/jump.wav");

// Get cached assets
const texture = assets.getTexture("player");
const sound = assets.getSound("jump");
```

### TimeManager

Frame timing and delta time.

**Features:**

- Delta time calculation
- FPS tracking
- Timers and intervals

**Usage:**

```typescript
const time = TimeManager.getInstance();

// In game loop
time.update(performance.now());
const deltaTime = time.getDeltaTime();

// Timers
time.setTimeout(() => {
  console.log("2 seconds passed!");
}, 2);

// FPS
const fps = time.getFps();
```

### UIManager

Basic UI system for HUD and menus.

**Features:**

- Screen management
- HUD updates
- Pause menu

**Usage:**

```typescript
const ui = UIManager.initialize();

// Show screens
ui.showScreen("hud");
ui.showScreen("pause");

// Update HUD
ui.updateHUD({
  score: 100,
  lives: 3,
  health: 80,
});
```

## System Dependencies

```
TimeManager (no dependencies)
    ↓
InputManager (no dependencies)
    ↓
AssetLoader (no dependencies)
    ↓
AudioManager (uses AssetLoader)
    ↓
PhysicsSystem (no dependencies)
    ↓
GameManager (no dependencies)
    ↓
CameraController (needs camera)
    ↓
EffectsSystem (needs scene)
    ↓
UIManager (no dependencies)
```

## Best Practices

1. **Initialize Early**: Set up systems in main.ts or Game constructor
2. **Update Order**: Update systems in dependency order
3. **Clean Up**: Call dispose() when done
4. **Error Handling**: Systems log errors but don't crash

## Removed Systems

These systems were removed for simplicity:

- ConfigurationManager → Use constants directly
- SceneManager → Merged into GameManager
- LevelManager → Use Level.ts functions
- Storage → Removed save/load functionality
