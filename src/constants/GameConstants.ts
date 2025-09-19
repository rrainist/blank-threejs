export const SCENE = {
  AMBIENT_INTENSITY: 0.7,
  DIRECTIONAL_INTENSITY: 0.5,
  BACKGROUND: 0x1d2230
} as const

export const WORLD = {
  WIDTH: 4,
  HEIGHT: 4,
  TILE_SIZE: 2,
  TILE_HEIGHT: 0.2
} as const

export const BOARD = {
  FLOOR_COLOR: 0x304b63,
  RESONATOR_COLOR: 0xffc05b,
  MARKER_COLOR: 0x4db8ff
} as const

export const PING = {
  SOUND_KEY: 'ping',
  SOUND_URL: 'assets/sounds/ui/ping.wav',
  IMPULSE_STRENGTH: 3.5,
  EFFECT_COLOR: 0xfff0a6
} as const

export const ENEMY = {
  ORBIT_RADIUS: 3,
  ROTATION_SPEED: 0.6,
  HOVER_HEIGHT: 1.2
} as const

export const ORB = {
  RADIUS: 0.45,
  MASS: 0.6,
  BOUNCE: 0.65
} as const
