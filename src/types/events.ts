import { GameObject } from '../entities/GameObject'
import { GameState } from '../systems/GameManager'
import { Collider } from '../components/Collider'

// Base event interface
export interface GameEvent {
  timestamp?: number
}

// Game state events
export interface GameStateChangedEvent extends GameEvent {
  oldState: GameState
  newState: GameState
}

// Player events
export interface PlayerDamageEvent extends GameEvent {
  damage: number
  current: number
  max: number
  source?: GameObject
}

export interface PlayerJumpEvent extends GameEvent {
  player: GameObject
}

export interface PlayerAttackEvent extends GameEvent {
  player: GameObject
  target: GameObject
  damage: number
}

// Enemy events
export interface EnemyAttackEvent extends GameEvent {
  enemy: GameObject
  target: GameObject
  damage: number
}

export interface EnemyShootEvent extends GameEvent {
  enemy: GameObject
  target: GameObject
  projectile: GameObject
}

export interface EnemyDeathEvent extends GameEvent {
  enemy: GameObject
  position: THREE.Vector3
}

// Item events
export interface ItemCollectEvent extends GameEvent {
  item: GameObject
  collector: GameObject
  value: number
}

// Collision events
export interface CollisionEvent extends GameEvent {
  objectA: GameObject
  objectB: GameObject
  colliderA: Collider
  colliderB: Collider
  contactPoint?: THREE.Vector3
  contactNormal?: THREE.Vector3
}

// Projectile events
export interface ProjectileHitEvent extends GameEvent {
  projectile: GameObject
  target: GameObject
  damage: number
}

// UI events
export interface UIShowEvent extends GameEvent {
  screenId: string
}

export interface UIHideEvent extends GameEvent {
  screenId: string
}

export interface UIUpdateEvent extends GameEvent {
  screenId: string
  data: Record<string, unknown>
}

// Audio events
export interface AudioPlayEvent extends GameEvent {
  soundKey: string
  volume?: number
  loop?: boolean
  position?: THREE.Vector3
}

// Type mapping for events
export interface GameEventMap {
  'game:state:changed': GameStateChangedEvent
  'player:damage': PlayerDamageEvent
  'player:jump': PlayerJumpEvent
  'player:attack': PlayerAttackEvent
  'enemy:attack': EnemyAttackEvent
  'enemy:shoot': EnemyShootEvent
  'enemy:death': EnemyDeathEvent
  'item:collect': ItemCollectEvent
  'entity:collision': CollisionEvent
  'projectile:hit': ProjectileHitEvent
  'ui:show': UIShowEvent
  'ui:hide': UIHideEvent
  'ui:update': UIUpdateEvent
  'audio:play': AudioPlayEvent
}