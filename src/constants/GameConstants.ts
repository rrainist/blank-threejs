// Physics Constants
export const PHYSICS = {
  GRAVITY: -30,
  FIXED_TIME_STEP: 1/60,
  MAX_SUB_STEPS: 3,
  DEFAULT_MASS: 1,
  DEFAULT_RESTITUTION: 0.3,
  DEFAULT_FRICTION: 0.5,
  DEFAULT_LINEAR_DAMPING: 0.1,
  DEFAULT_ANGULAR_DAMPING: 0.1,
  JUMP_FORCE: 10,
  MAX_VELOCITY: 20
} as const

// Camera Constants
export const CAMERA = {
  FOV: 75,
  NEAR_PLANE: 0.1,
  FAR_PLANE: 1000,
  ORTHO_FRUSTUM_SIZE: 20,
  DEFAULT_POSITION: { x: 5, y: 8, z: 10 }
} as const

// Renderer Constants
export const RENDERER = {
  ANTIALIAS: true,
  ALPHA: true,
  MAX_PIXEL_RATIO: 2,
  SHADOW_MAP_SIZE: 2048
} as const

// Game Constants
export const GAME = {
  DEFAULT_LIVES: 3,
  DEFAULT_HEALTH: 100,
  COLLECTION_RADIUS: 1.5,
  SPAWN_HEIGHT: 1,
  DEBUG_KEY: 'F1',
  PAUSE_KEY: 'p',
  SAVE_KEY: 'F5',
  LOAD_KEY: 'F9'
} as const

// Player Constants
export const PLAYER = {
  MOVE_SPEED: 15,
  JUMP_SPEED: 15,
  HEALTH: 100,
  ATTACK_DAMAGE: 20,
  ATTACK_RANGE: 2,
  ATTACK_COOLDOWN: 0.5,
  CAPSULE_RADIUS: 0.5,
  CAPSULE_HEIGHT: 1,
  COLOR: 0x00ff00,
  EMISSIVE_COLOR: 0x002200
} as const

// Enemy Constants
export const ENEMY = {
  SPEED: 3,
  HEALTH: 50,
  COLOR: 0xff0000,
  EMISSIVE_COLOR: 0x440000,
  ATTACK_DAMAGE: 10,
  ATTACK_COOLDOWN: 1,
  DETECTION_RANGE: 10,
  ATTACK_RANGE: 2,
  DEATH_POINTS: 100
} as const

// Collectible Constants
export const COLLECTIBLE = {
  DEFAULT_VALUE: 10,
  DEFAULT_COLOR: 0xffff00,
  ROTATION_SPEED: 2,
  FLOAT_SPEED: 2,
  FLOAT_HEIGHT: 0.2,
  PICKUP_RADIUS: 0.5
} as const

// UI Constants
export const UI = {
  TRANSITION_DURATION: 0.3,
  HUD_UPDATE_INTERVAL: 100,
  MENU_ANIMATION_SPEED: 0.5,
  BUTTON_HOVER_SCALE: 1.05,
  NOTIFICATION_DURATION: 3
} as const

// Audio Constants
export const AUDIO = {
  MASTER_VOLUME: 1,
  MUSIC_VOLUME: 0.7,
  SFX_VOLUME: 1,
  FADE_TIME: 1,
  POOL_SIZE: 5,
  REF_DISTANCE: 10,
  MAX_DISTANCE: 100,
  ROLLOFF_FACTOR: 1
} as const

// Scene Constants
export const SCENE = {
  FOG_NEAR: 20,
  FOG_FAR: 100,
  AMBIENT_INTENSITY: 0.6,
  DIRECTIONAL_INTENSITY: 0.8,
  TRANSITION_DURATION: 0.5,
  GROUND_SIZE: 50,
  WALL_HEIGHT: 10
} as const

// Field/Level Constants
export const FIELD = {
  WIDTH: 50,
  HEIGHT: 50,
  DEPTH: 50,
  MIN_X: -25,
  MAX_X: 25,
  MIN_Z: -25,
  MAX_Z: 25,
  GROUND_Y: 0
} as const

// Input Constants
export const INPUT = {
  MOUSE_SENSITIVITY: 0.01,
  GAMEPAD_DEADZONE: 0.15,
  DOUBLE_CLICK_TIME: 300,
  LONG_PRESS_TIME: 500,
  KEY_REPEAT_DELAY: 500,
  KEY_REPEAT_RATE: 50
} as const

// Layer Masks
export const LAYERS = {
  DEFAULT: 0,
  PLAYER: 1,
  ENEMY: 2,
  ENVIRONMENT: 3,
  PICKUP: 4,
  PROJECTILE: 5,
  UI: 6,
  TRIGGER: 7
} as const

// Collision Masks
export const COLLISION_MASKS = {
  PLAYER: (1 << LAYERS.ENEMY) | (1 << LAYERS.ENVIRONMENT) | (1 << LAYERS.PICKUP) | (1 << LAYERS.PROJECTILE),
  ENEMY: (1 << LAYERS.PLAYER) | (1 << LAYERS.ENVIRONMENT) | (1 << LAYERS.ENEMY),
  PROJECTILE: (1 << LAYERS.PLAYER) | (1 << LAYERS.ENVIRONMENT),
  PICKUP: (1 << LAYERS.PLAYER)
} as const

// Configuration constants (previously in ConfigurationManager)
export const CONFIG = {
  audio: {
    masterVolume: 1.0,
    sfxVolume: 1.0,
    musicVolume: 0.7
  },
  graphics: {
    shadowsEnabled: true,
    particlesEnabled: true,
    antialias: true
  },
  controls: {
    mouseSensitivity: 1.0,
    invertY: false
  }
} as const