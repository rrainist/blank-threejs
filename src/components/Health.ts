import { Component, GameObject } from '../entities/GameObject'

export interface HealthChangeEvent {
  current: number
  max: number
  damage: number
  source?: GameObject
}

type HealthChangeCallback = (event: HealthChangeEvent) => void

export class Health implements Component {
  enabled = true
  gameObject!: GameObject
  
  private currentHealth: number
  private maxHealth: number
  private invulnerable = false
  private invulnerabilityTimer = 0
  private invulnerabilityDuration = 0
  
  // Callbacks
  private onDamageCallbacks: HealthChangeCallback[] = []
  private onHealCallbacks: HealthChangeCallback[] = []
  private onDeathCallbacks: (() => void)[] = []

  constructor(maxHealth: number, startHealth?: number) {
    this.maxHealth = maxHealth
    this.currentHealth = startHealth ?? maxHealth
  }

  update(deltaTime: number): void {
    // Update invulnerability timer
    if (this.invulnerable && this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= deltaTime
      if (this.invulnerabilityTimer <= 0) {
        this.invulnerable = false
      }
    }
  }

  /**
   * Take damage
   */
  takeDamage(amount: number, source?: GameObject): void {
    if (this.invulnerable || this.currentHealth <= 0) return

    const actualDamage = Math.min(amount, this.currentHealth)
    this.currentHealth -= actualDamage

    const event: HealthChangeEvent = {
      current: this.currentHealth,
      max: this.maxHealth,
      damage: actualDamage,
      source
    }

    // Trigger damage callbacks
    this.onDamageCallbacks.forEach(callback => callback(event))

    // Check for death
    if (this.currentHealth <= 0) {
      this.onDeathCallbacks.forEach(callback => callback())
    }
  }

  /**
   * Heal
   */
  heal(amount: number): void {
    if (this.currentHealth <= 0) return

    const actualHeal = Math.min(amount, this.maxHealth - this.currentHealth)
    this.currentHealth += actualHeal

    const event: HealthChangeEvent = {
      current: this.currentHealth,
      max: this.maxHealth,
      damage: -actualHeal
    }

    // Trigger heal callbacks
    this.onHealCallbacks.forEach(callback => callback(event))
  }

  /**
   * Set health directly
   */
  setHealth(health: number): void {
    this.currentHealth = Math.max(0, Math.min(health, this.maxHealth))
  }

  /**
   * Set max health
   */
  setMaxHealth(maxHealth: number, healToMax = false): void {
    this.maxHealth = maxHealth
    if (healToMax) {
      this.currentHealth = maxHealth
    } else {
      this.currentHealth = Math.min(this.currentHealth, maxHealth)
    }
  }

  /**
   * Make temporarily invulnerable
   */
  setInvulnerable(duration: number): void {
    this.invulnerable = true
    this.invulnerabilityDuration = duration
    this.invulnerabilityTimer = duration
  }

  /**
   * Getters
   */
  getHealth(): number {
    return this.currentHealth
  }

  getMaxHealth(): number {
    return this.maxHealth
  }

  getHealthPercent(): number {
    return this.currentHealth / this.maxHealth
  }

  isAlive(): boolean {
    return this.currentHealth > 0
  }

  isDead(): boolean {
    return this.currentHealth <= 0
  }

  isInvulnerable(): boolean {
    return this.invulnerable
  }

  isFullHealth(): boolean {
    return this.currentHealth >= this.maxHealth
  }

  /**
   * Event listeners
   */
  onDamage(callback: HealthChangeCallback): void {
    this.onDamageCallbacks.push(callback)
  }

  onHeal(callback: HealthChangeCallback): void {
    this.onHealCallbacks.push(callback)
  }

  onDeath(callback: () => void): void {
    this.onDeathCallbacks.push(callback)
  }

  /**
   * Reset health to max
   */
  reset(): void {
    this.currentHealth = this.maxHealth
    this.invulnerable = false
    this.invulnerabilityTimer = 0
  }
}