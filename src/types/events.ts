import { GameState } from '../systems/GameManager'
import { Player } from '../entities/Player'
import { Enemy } from '../entities/Enemy'
import { Collectible } from '../entities/Collectible'
import * as THREE from 'three'

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
  source?: THREE.Object3D
}

export interface PlayerJumpEvent extends GameEvent {
  player: Player
}

export interface PlayerAttackEvent extends GameEvent {
  player: Player
  target: THREE.Object3D
  damage: number
}

// Enemy events
export interface EnemyAttackEvent extends GameEvent {
  enemy: Enemy
  target: THREE.Object3D
  damage: number
}

export interface EnemyShootEvent extends GameEvent {
  enemy: Enemy
  target: THREE.Object3D
  projectile: THREE.Object3D
}

export interface EnemyDeathEvent extends GameEvent {
  enemy: Enemy
  position: THREE.Vector3
}

// Item events
export interface ItemCollectEvent extends GameEvent {
  item: Collectible
  collector: Player
  value: number
}

// Collision events (simplified without Collider component)
export interface CollisionEvent extends GameEvent {
  objectA: THREE.Object3D
  objectB: THREE.Object3D
  contactPoint?: THREE.Vector3
  contactNormal?: THREE.Vector3
}

// Projectile events
export interface ProjectileHitEvent extends GameEvent {
  projectile: THREE.Object3D
  target: THREE.Object3D
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