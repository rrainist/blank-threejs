import * as THREE from 'three'
import { Bullet } from '../entities/Bullet'
import { logger } from '../utils/Logger'

export class BulletPool {
  private static instance: BulletPool
  private pool: Bullet[] = []
  private activeCount: number = 0
  private maxSize: number = 20
  
  private constructor() {
    this.initializePool()
  }
  
  static getInstance(): BulletPool {
    if (!BulletPool.instance) {
      BulletPool.instance = new BulletPool()
    }
    return BulletPool.instance
  }
  
  private initializePool(): void {
    for (let i = 0; i < this.maxSize; i++) {
      const bullet = new Bullet()
      bullet.visible = false
      bullet.active = false
      this.pool.push(bullet)
    }
    logger.info(`BulletPool initialized with ${this.maxSize} bullets`)
  }
  
  /**
   * Get a bullet from the pool
   */
  get(): Bullet | null {
    // Find inactive bullet
    for (const bullet of this.pool) {
      if (!bullet.active) {
        bullet.reset()
        this.activeCount++
        return bullet
      }
    }
    
    // Pool exhausted
    logger.warn('BulletPool exhausted')
    return null
  }
  
  /**
   * Return a bullet to the pool
   */
  release(bullet: Bullet): void {
    if (bullet.active) {
      bullet.deactivate()
      this.activeCount--
    }
  }
  
  /**
   * Update all active bullets
   */
  updateAll(deltaTime: number): void {
    for (const bullet of this.pool) {
      if (bullet.active) {
        bullet.update(deltaTime)
        
        // Auto-release if bullet has deactivated itself
        if (!bullet.active) {
          this.activeCount--
        }
      }
    }
  }
  
  /**
   * Get all active bullets
   */
  getActiveBullets(): Bullet[] {
    return this.pool.filter(bullet => bullet.active)
  }
  
  /**
   * Release all bullets
   */
  releaseAll(): void {
    for (const bullet of this.pool) {
      if (bullet.active) {
        bullet.deactivate()
      }
    }
    this.activeCount = 0
  }
  
  /**
   * Get pool statistics
   */
  getStats(): { totalCount: number; activeCount: number; utilization: number } {
    return {
      totalCount: this.maxSize,
      activeCount: this.activeCount,
      utilization: this.activeCount / this.maxSize
    }
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    for (const bullet of this.pool) {
      bullet.dispose()
    }
    this.pool = []
    this.activeCount = 0
  }
}