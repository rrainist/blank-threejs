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
   * Emit an event
   */
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

// Essential game events only
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