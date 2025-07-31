import { GameEventMap } from '../types/events'
import { logger } from './Logger'

export type EventCallback<T = unknown> = (data: T) => void

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
   * Subscribe to an event
   */
  on<K extends keyof GameEventMap>(event: K, callback: EventCallback<GameEventMap[K]>): () => void
  on<T = unknown>(event: string, callback: EventCallback<T>): () => void
  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    
    this.events.get(event)!.add(callback)
    
    // Return unsubscribe function
    return () => this.off(event, callback)
  }

  /**
   * Subscribe to an event (only once)
   */
  once<K extends keyof GameEventMap>(event: K, callback: EventCallback<GameEventMap[K]>): void
  once<T = unknown>(event: string, callback: EventCallback<T>): void
  once(event: string, callback: EventCallback): void {
    const wrapper = (data: unknown) => {
      callback(data)
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
   * Emit an event
   */
  emit<K extends keyof GameEventMap>(event: K, data: GameEventMap[K]): void
  emit<T = unknown>(event: string, data?: T): void
  emit(event: string, data?: unknown): void {
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

  /**
   * Get all event names
   */
  getEventNames(): string[] {
    return Array.from(this.events.keys())
  }
}

// Common game events
export enum GameEvents {
  // Game state
  GAME_START = 'game:start',
  GAME_PAUSE = 'game:pause',
  GAME_RESUME = 'game:resume',
  GAME_OVER = 'game:over',
  LEVEL_COMPLETE = 'level:complete',
  
  // Player events
  PLAYER_SPAWN = 'player:spawn',
  PLAYER_DEATH = 'player:death',
  PLAYER_DAMAGE = 'player:damage',
  PLAYER_HEAL = 'player:heal',
  PLAYER_SCORE = 'player:score',
  
  // Entity events
  ENTITY_SPAWN = 'entity:spawn',
  ENTITY_DESTROY = 'entity:destroy',
  ENTITY_COLLISION = 'entity:collision',
  
  // Enemy events
  ENEMY_SPAWN = 'enemy:spawn',
  ENEMY_DEATH = 'enemy:death',
  ENEMY_ATTACK = 'enemy:attack',
  ENEMY_SHOOT = 'enemy:shoot',
  
  // Combat events
  PROJECTILE_HIT = 'projectile:hit',
  
  // Item events
  ITEM_COLLECT = 'item:collect',
  ITEM_USE = 'item:use',
  
  // UI events
  UI_SHOW = 'ui:show',
  UI_HIDE = 'ui:hide',
  UI_UPDATE = 'ui:update',
  
  // Audio events
  AUDIO_PLAY = 'audio:play',
  AUDIO_STOP = 'audio:stop',
  AUDIO_VOLUME = 'audio:volume',
  
  // Save/Load events
  SAVE_GAME = 'save:game',
  LOAD_GAME = 'load:game',
  SAVE_SETTINGS = 'save:settings',
  LOAD_SETTINGS = 'load:settings'
}

// Export singleton instance for convenience
export const eventBus = EventBus.getInstance()