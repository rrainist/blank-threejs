import * as THREE from 'three'
import { ObjectPool } from '../utils/ObjectPool'
import { logger } from '../utils/Logger'

interface Particle extends THREE.Sprite {
  velocity: THREE.Vector3
  lifetime: number
  age: number
  fadeRate: number
  scaleRate: number
  rotationSpeed: number
}

export class EffectsSystem {
  private static instance: EffectsSystem
  private scene: THREE.Scene
  
  // Particle system
  private particlePool: ObjectPool<Particle>
  private activeParticles: Set<Particle> = new Set()
  private particleTexture: THREE.Texture
  
  private constructor(scene: THREE.Scene) {
    this.scene = scene
    
    // Create default particle texture
    this.particleTexture = this.createParticleTexture()
    
    // Initialize particle pool
    this.particlePool = new ObjectPool<Particle>(
      () => this.createParticle(),
      50,  // Initial size
      200, // Max size
      (particle) => this.resetParticle(particle)
    )
    
    logger.info('EffectsSystem initialized')
  }
  
  static initialize(scene: THREE.Scene): EffectsSystem {
    if (!EffectsSystem.instance) {
      EffectsSystem.instance = new EffectsSystem(scene)
    }
    return EffectsSystem.instance
  }
  
  static getInstance(): EffectsSystem {
    if (!EffectsSystem.instance) {
      throw new Error('EffectsSystem not initialized. Call EffectsSystem.initialize() first.')
    }
    return EffectsSystem.instance
  }
  
  private createParticleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 32, 32)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }
  
  private createParticle(): Particle {
    const material = new THREE.SpriteMaterial({
      map: this.particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    const particle = new THREE.Sprite(material) as Particle
    particle.velocity = new THREE.Vector3()
    particle.lifetime = 1
    particle.age = 0
    particle.fadeRate = 1
    particle.scaleRate = 0
    particle.rotationSpeed = 0
    
    return particle
  }
  
  private resetParticle(particle: Particle): void {
    particle.position.set(0, 0, 0)
    particle.velocity.set(0, 0, 0)
    particle.scale.set(1, 1, 1)
    particle.material.opacity = 1
    particle.material.rotation = 0
    particle.lifetime = 1
    particle.age = 0
    particle.fadeRate = 1
    particle.scaleRate = 0
    particle.rotationSpeed = 0
    particle.visible = false
    
    if (particle.parent) {
      particle.parent.remove(particle)
    }
  }
  
  /**
   * Spawn particles at position
   */
  spawnParticles(
    position: THREE.Vector3,
    count: number = 10,
    options: {
      color?: number
      size?: number
      lifetime?: number
      speed?: number
      spread?: number
      gravity?: number
    } = {}
  ): void {
    const {
      color = 0xffffff,
      size = 0.5,
      lifetime = 1,
      speed = 5,
      spread = 1,
      gravity = -9.8
    } = options
    
    for (let i = 0; i < count; i++) {
      const particle = this.particlePool.get()
      if (!particle) break
      
      // Set position
      particle.position.copy(position)
      
      // Random velocity
      particle.velocity.set(
        (Math.random() - 0.5) * spread,
        Math.random() * speed,
        (Math.random() - 0.5) * spread
      )
      
      // Apply properties
      particle.scale.setScalar(size * (0.5 + Math.random() * 0.5))
      particle.material.color.setHex(color)
      particle.material.opacity = 1
      particle.lifetime = lifetime * (0.8 + Math.random() * 0.4)
      particle.age = 0
      particle.fadeRate = 1 / particle.lifetime
      particle.scaleRate = -0.5 / particle.lifetime
      particle.rotationSpeed = (Math.random() - 0.5) * 2
      particle.visible = true
      
      // Add gravity to velocity
      particle.userData.gravity = gravity
      
      // Add to scene and track
      this.scene.add(particle)
      this.activeParticles.add(particle)
    }
  }
  
  /**
   * Create an explosion effect
   */
  explosion(position: THREE.Vector3, options: {
    color?: number
    size?: number
    count?: number
  } = {}): void {
    const {
      color = 0xff6600,
      size = 1,
      count = 30
    } = options
    
    this.spawnParticles(position, count, {
      color,
      size,
      lifetime: 0.5,
      speed: 10,
      spread: 5,
      gravity: -5
    })
  }
  
  /**
   * Create a sparkle effect
   */
  sparkle(position: THREE.Vector3, options: {
    color?: number
    count?: number
  } = {}): void {
    const {
      color = 0xffff00,
      count = 10
    } = options
    
    this.spawnParticles(position, count, {
      color,
      size: 0.3,
      lifetime: 1,
      speed: 2,
      spread: 2,
      gravity: 0
    })
  }
  
  /**
   * Update particles
   */
  update(deltaTime: number): void {
    const particlesToRemove: Particle[] = []
    
    this.activeParticles.forEach(particle => {
      // Update age
      particle.age += deltaTime
      
      // Check lifetime
      if (particle.age >= particle.lifetime) {
        particlesToRemove.push(particle)
        return
      }
      
      // Update position
      particle.position.add(
        particle.velocity.clone().multiplyScalar(deltaTime)
      )
      
      // Apply gravity
      if (particle.userData.gravity) {
        particle.velocity.y += particle.userData.gravity * deltaTime
      }
      
      // Update opacity
      particle.material.opacity = Math.max(0, 1 - particle.age * particle.fadeRate)
      
      // Update scale
      const scale = particle.scale.x + particle.scaleRate * deltaTime
      particle.scale.setScalar(Math.max(0.01, scale))
      
      // Update rotation
      particle.material.rotation += particle.rotationSpeed * deltaTime
    })
    
    // Remove dead particles
    particlesToRemove.forEach(particle => {
      this.scene.remove(particle)
      this.activeParticles.delete(particle)
      this.particlePool.release(particle)
    })
  }
  
  /**
   * Clear all particles
   */
  clear(): void {
    this.activeParticles.forEach(particle => {
      this.scene.remove(particle)
      this.particlePool.release(particle)
    })
    this.activeParticles.clear()
  }
  
  /**
   * Get stats
   */
  getStats(): { activeParticles: number; poolSize: number } {
    return {
      activeParticles: this.activeParticles.size,
      poolSize: this.particlePool.getStats().totalCount
    }
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    this.clear()
    this.particleTexture.dispose()
    logger.info('EffectsSystem disposed')
  }
}