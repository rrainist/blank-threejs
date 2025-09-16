import { logger } from './Logger'

// Import types for proper typing
import type * as THREE from 'three'
import type { Player } from '../entities/Player'
import type { Enemy } from '../entities/Enemy'
import type { Collectible } from '../entities/Collectible'

export type EventCallback<T = unknown> = (data: T) => void

// Event payload interfaces for type safety
export interface GameEventMap {
  // Game state
  'game:over': { score: number; level: number }

  // Player events
  'player:death': { player: Player }
  'player:damage': { player: Player; amount: number }
  'player:jump': { player: Player; timestamp: number }
  'player:shoot': { player: Player; origin: THREE.Vector3; direction: THREE.Vector3 }
  'player:wallHit': { player: Player; point: THREE.Vector3; normal: THREE.Vector3 }

  // Enemy events
  'enemy:death': { enemy: Enemy; position: THREE.Vector3 }

  // Item events
  'item:collect': { item: Collectible; collector: Player; value: number }

  // Level events
  'level:complete': { level: number; score: number }
}

export class EventBus {
  private static instance: EventBus
  private events: Map<string, Set<EventCallback>> = new Map()

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  /**
   * Subscribe to an event with type safety
   */
  on<K extends keyof GameEventMap>(
    event: K,
    callback: (data: GameEventMap[K]) => void
  ): () => void
  on<T = unknown>(event: string, callback: EventCallback<T>): () => void
  on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }

    this.events.get(event)!.add(callback as EventCallback)

    // Return unsubscribe function
    return () => this.off(event, callback as EventCallback)
  }

  /**
   * Subscribe to an event (only once)
   */
  once<K extends keyof GameEventMap>(
    event: K,
    callback: (data: GameEventMap[K]) => void
  ): void
  once<T = unknown>(event: string, callback: EventCallback<T>): void
  once<T = unknown>(event: string, callback: EventCallback<T>): void {
    const wrapper = (data: unknown) => {
      callback(data as T)
      this.off(event, wrapper)
    }
    this.on(event, wrapper)
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.events.delete(event)
      }
    }
  }

  /**
   * Emit an event with type safety
   */
  emit<K extends keyof GameEventMap>(event: K, data: GameEventMap[K]): void
  emit<T = unknown>(event: string, data?: T): void
  emit<T = unknown>(event: string, data?: T): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          logger.error(`Error in event handler for "${event}":`, error)
        }
      })
    }
  }

  /**
   * Clear all event listeners
   */
  clear(): void {
    this.events.clear()
  }

  /**
   * Clear listeners for a specific event
   */
  clearEvent(event: string): void {
    this.events.delete(event)
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.size || 0
  }
}

// Keep enum for backward compatibility but map to event keys
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

// Export singleton instance
export const eventBus = EventBus.getInstance()