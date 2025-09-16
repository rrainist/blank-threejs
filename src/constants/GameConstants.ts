// Scene setup
export const SCENE = {
  AMBIENT_INTENSITY: 0.6,
  DIRECTIONAL_INTENSITY: 0.8,
  FOG_NEAR: 20,
  FOG_FAR: 100
} as const

// Level dimensions used when generating the arena
export const FIELD = {
  WIDTH: 50,
  HEIGHT: 50,
  GROUND_Y: 0
} as const

// Player tuning
export const PLAYER = {
  HEALTH: 100,
  MOVE_SPEED: 15,
  JUMP_SPEED: 15,
  FORCE_MULTIPLIER: 100,
  DAMAGE_FLASH_DURATION: 200,
  SHOOT_FLASH_DURATION: 100,
  COLOR: 0x00ff00,
  EMISSIVE_COLOR: 0x002200
} as const

// Enemy tuning
export const ENEMY = {
  HEALTH: 50,
  SPEED: 3,
  ATTACK_DAMAGE: 10,
  COLOR: 0xff0000,
  EMISSIVE_COLOR: 0x440000,
  FORCE_MULTIPLIER: 50,
  MOVE_UPDATE_INTERVAL: 0.2,
  REACHED_DISTANCE: 2,
  DAMAGE_FLASH_DURATION: 100
} as const

// Collectible animation defaults
export const COLLECTIBLE = {
  DEFAULT_VALUE: 10,
  DEFAULT_COLOR: 0xffff00,
  ROTATION_SPEED: 2,
  FLOAT_SPEED: 2,
  FLOAT_HEIGHT: 0.2
} as const
