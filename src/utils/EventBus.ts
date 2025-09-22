import { logger } from './Logger'

export type EventCallback<T = unknown> = (data: T) => void

export interface TemplateEventMap {
  'game:start': void
  'game:pause': void
  'game:resume': void
  'game:over': { score: number; wave: number }
  'game:score': { score: number; delta: number }
  'game:wave': { wave: number }
  'player:health': { current: number; max: number }
  'player:ability': { name: string; cooldown: number }
  'audio:toggle': { muted: boolean }
}

type EventKey = keyof TemplateEventMap | (string & { __eventBrand?: never })

export class EventBus {
  private static instance: EventBus

  private events = new Map<EventKey, Set<EventCallback>>()

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  on<K extends keyof TemplateEventMap>(event: K, callback: EventCallback<TemplateEventMap[K]>): () => void
  on<T = unknown>(event: string, callback: EventCallback<T>): () => void
  on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }

    const callbacks = this.events.get(event)!
    callbacks.add(callback as EventCallback)

    return () => this.off(event, callback as EventCallback)
  }

  once<K extends keyof TemplateEventMap>(event: K, callback: EventCallback<TemplateEventMap[K]>): void
  once<T = unknown>(event: string, callback: EventCallback<T>): void
  once<T = unknown>(event: string, callback: EventCallback<T>): void {
    const onceWrapper: EventCallback = (data) => {
      try {
        callback(data as T)
      } finally {
        this.off(event, onceWrapper)
      }
    }

    this.on(event, onceWrapper)
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event)
    if (!callbacks) return

    callbacks.delete(callback)
    if (callbacks.size === 0) {
      this.events.delete(event)
    }
  }

  emit<K extends keyof TemplateEventMap>(event: K, data: TemplateEventMap[K]): void
  emit<T = unknown>(event: string, data?: T): void
  emit<T = unknown>(event: string, data?: T): void {
    const callbacks = this.events.get(event)
    if (!callbacks) return

    callbacks.forEach((callback) => {
      try {
        callback(data)
      } catch (error) {
        logger.error(`Error in event handler for "${event}"`, error)
      }
    })
  }

  clear(event?: string): void {
    if (event) {
      this.events.delete(event)
      return
    }

    this.events.clear()
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.size ?? 0
  }
}

export const eventBus = EventBus.getInstance()
