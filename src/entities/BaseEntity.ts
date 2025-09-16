import * as THREE from 'three'

/**
 * Base class for all game entities
 * Provides common functionality for health, damage, and updates
 */
export abstract class BaseEntity extends THREE.Group {
  // Core properties
  health: number = 100
  maxHealth: number = 100
  speed: number = 5

  // Visual representation
  mesh?: THREE.Mesh

  // Entity state
  isDead: boolean = false

  constructor(health: number = 100, speed: number = 5) {
    super()
    this.health = health
    this.maxHealth = health
    this.speed = speed
  }

  /**
   * Update the entity - must be implemented by subclasses
   */
  abstract update(deltaTime: number): void

  /**
   * Take damage with visual feedback
   */
  takeDamage(amount: number): void {
    if (this.isDead) return

    this.health = Math.max(0, this.health - amount)

    // Visual feedback if mesh exists
    if (this.mesh && this.mesh.material instanceof THREE.MeshPhongMaterial) {
      this.flashDamage()
    }

    // Check for death
    if (this.health <= 0 && !this.isDead) {
      this.isDead = true
      this.onDeath()
    }
  }

  /**
   * Flash damage effect
   */
  protected flashDamage(): void {
    if (!this.mesh || !(this.mesh.material instanceof THREE.MeshPhongMaterial)) return

    const material = this.mesh.material
    const originalColor = material.color.getHex()
    const originalEmissive = material.emissive.getHex()

    // Flash white/red
    material.color.setHex(0xffffff)
    material.emissive.setHex(0xff0000)
    material.emissiveIntensity = 0.5

    // Restore after delay
    setTimeout(() => {
      if (this.mesh && this.mesh.material instanceof THREE.MeshPhongMaterial) {
        this.mesh.material.color.setHex(originalColor)
        this.mesh.material.emissive.setHex(originalEmissive)
        this.mesh.material.emissiveIntensity = 0.1
      }
    }, 100)
  }

  /**
   * Called when entity dies - override for custom behavior
   */
  protected onDeath(): void {
    // Default: make invisible
    this.visible = false
  }

  /**
   * Heal the entity
   */
  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount)
  }

  /**
   * Reset entity to initial state
   */
  reset(): void {
    this.health = this.maxHealth
    this.isDead = false
    this.visible = true
    this.position.set(0, 0, 0)
    this.rotation.set(0, 0, 0)
    this.scale.set(1, 1, 1)
  }

  /**
   * Get normalized health (0-1)
   */
  getHealthPercent(): number {
    return this.health / this.maxHealth
  }

  /**
   * Check if entity is alive
   */
  isAlive(): boolean {
    return !this.isDead && this.health > 0
  }

  /**
   * Dispose of entity resources
   */
  dispose(): void {
    // Clean up mesh
    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose()
      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(m => m.dispose())
        } else {
          this.mesh.material.dispose()
        }
      }
    }

    // Remove from parent
    if (this.parent) {
      this.parent.remove(this)
    }
  }
}