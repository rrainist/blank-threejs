import { GameObject } from '../entities/GameObject'

export abstract class Component {
  gameObject!: GameObject
  enabled: boolean = true
  private _started: boolean = false

  // Lifecycle methods (to be implemented by subclasses)
  start?(): void
  update?(deltaTime: number): void
  lateUpdate?(deltaTime: number): void
  fixedUpdate?(fixedDeltaTime: number): void
  onEnable?(): void
  onDisable?(): void
  destroy?(): void

  /**
   * Internal start method that ensures start is only called once
   */
  internalStart(): void {
    if (!this._started && this.start) {
      this.start()
      this._started = true
    }
  }
  
  /**
   * Enable/disable component with lifecycle callbacks
   */
  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return
    
    this.enabled = enabled
    
    if (enabled && this.onEnable) {
      this.onEnable()
    } else if (!enabled && this.onDisable) {
      this.onDisable()
    }
  }
  
  /**
   * Check if component has been started
   */
  isStarted(): boolean {
    return this._started
  }
  
  /**
   * Reset component state
   */
  reset(): void {
    this._started = false
  }
}