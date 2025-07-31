import * as THREE from 'three'
import { Component, GameObject } from '../entities/GameObject'
import { TimeManager } from '../systems/TimeManager'
import { ObjectPool, PoolableObject } from '../utils/ObjectPool'

export interface ParticleConfig {
  // Emission
  emissionRate: number // Particles per second
  maxParticles: number
  duration: number // Total emission duration (-1 for infinite)
  
  // Particle properties
  lifetime: { min: number; max: number }
  startSize: { min: number; max: number }
  endSize: { min: number; max: number }
  startColor: THREE.Color
  endColor: THREE.Color
  startOpacity: { min: number; max: number }
  endOpacity: { min: number; max: number }
  
  // Movement
  velocity: { min: THREE.Vector3; max: THREE.Vector3 }
  acceleration: THREE.Vector3
  gravity: number
  damping: number
  
  // Rotation
  startRotation: { min: number; max: number }
  rotationSpeed: { min: number; max: number }
  
  // Shape
  emitterShape: 'point' | 'box' | 'sphere' | 'cone'
  emitterSize: THREE.Vector3
  
  // Rendering
  texture?: THREE.Texture
  blending: THREE.Blending
  billboard: boolean
}

class Particle extends PoolableObject {
  position: THREE.Vector3
  velocity: THREE.Vector3
  rotation: number
  rotationSpeed: number
  size: number
  startSize: number
  endSize: number
  color: THREE.Color
  startColor: THREE.Color
  endColor: THREE.Color
  opacity: number
  startOpacity: number
  endOpacity: number
  lifetime: number
  age: number
  mesh?: THREE.Mesh
  
  constructor() {
    super()
    this.position = new THREE.Vector3()
    this.velocity = new THREE.Vector3()
    this.color = new THREE.Color()
    this.startColor = new THREE.Color()
    this.endColor = new THREE.Color()
    this.rotation = 0
    this.rotationSpeed = 0
    this.size = 1
    this.startSize = 1
    this.endSize = 1
    this.opacity = 1
    this.startOpacity = 1
    this.endOpacity = 1
    this.lifetime = 1
    this.age = 0
  }
  
  reset(): void {
    this.position.set(0, 0, 0)
    this.velocity.set(0, 0, 0)
    this.rotation = 0
    this.rotationSpeed = 0
    this.size = 1
    this.startSize = 1
    this.endSize = 1
    this.color.setHex(0xffffff)
    this.startColor.setHex(0xffffff)
    this.endColor.setHex(0xffffff)
    this.opacity = 1
    this.startOpacity = 1
    this.endOpacity = 1
    this.lifetime = 1
    this.age = 0
    this.active = false
  }
  
  update(deltaTime: number, gravity: number, damping: number, acceleration: THREE.Vector3): void {
    // Update age
    this.age += deltaTime
    
    // Apply physics
    this.velocity.add(acceleration.clone().multiplyScalar(deltaTime))
    this.velocity.y += gravity * deltaTime
    this.velocity.multiplyScalar(1 - damping * deltaTime)
    
    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime))
    
    // Update rotation
    this.rotation += this.rotationSpeed * deltaTime
    
    // Interpolate properties based on age
    const ageRatio = this.age / this.lifetime
    
    // Size
    this.size = THREE.MathUtils.lerp(this.startSize, this.endSize, ageRatio)
    
    // Color
    this.color.lerpColors(this.startColor, this.endColor, ageRatio)
    
    // Opacity
    this.opacity = THREE.MathUtils.lerp(this.startOpacity, this.endOpacity, ageRatio)
  }
  
  isAlive(): boolean {
    return this.age < this.lifetime
  }
}

export class ParticleSystem implements Component {
  enabled = true
  gameObject!: GameObject
  
  private config: ParticleConfig
  private particlePool: ObjectPool<Particle>
  private particles: Set<Particle> = new Set()
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private particleSystem?: THREE.Points
  private time: TimeManager
  
  // Emission state
  private emissionTimer = 0
  private totalTime = 0
  private isEmitting = true
  private burstMode = false
  
  // Buffers for updating particles
  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array
  private maxParticleCount: number
  
  constructor(config: Partial<ParticleConfig> = {}) {
    this.time = TimeManager.getInstance()
    
    // Default config
    this.config = {
      emissionRate: 10,
      maxParticles: 100,
      duration: -1,
      lifetime: { min: 1, max: 2 },
      startSize: { min: 0.1, max: 0.2 },
      endSize: { min: 0, max: 0 },
      startColor: new THREE.Color(0xffffff),
      endColor: new THREE.Color(0xffffff),
      startOpacity: { min: 1, max: 1 },
      endOpacity: { min: 0, max: 0 },
      velocity: {
        min: new THREE.Vector3(-1, 2, -1),
        max: new THREE.Vector3(1, 5, 1)
      },
      acceleration: new THREE.Vector3(0, 0, 0),
      gravity: -9.81,
      damping: 0.1,
      startRotation: { min: 0, max: Math.PI * 2 },
      rotationSpeed: { min: -1, max: 1 },
      emitterShape: 'point',
      emitterSize: new THREE.Vector3(1, 1, 1),
      blending: THREE.AdditiveBlending,
      billboard: true,
      ...config
    }
    
    this.maxParticleCount = this.config.maxParticles
    
    // Initialize particle pool
    this.particlePool = new ObjectPool(
      () => new Particle(),
      Math.min(20, this.config.maxParticles),
      this.config.maxParticles
    )
    
    // Create geometry with maximum particle count
    this.geometry = new THREE.BufferGeometry()
    this.positions = new Float32Array(this.maxParticleCount * 3)
    this.colors = new Float32Array(this.maxParticleCount * 3)
    this.sizes = new Float32Array(this.maxParticleCount)
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))
    
    // Create material
    this.material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      blending: this.config.blending,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true
    })
    
    if (this.config.texture) {
      this.material.map = this.config.texture
    }
  }
  
  start(): void {
    // Create particle system mesh
    this.particleSystem = new THREE.Points(this.geometry, this.material)
    
    // Add to scene
    if (this.gameObject.mesh instanceof THREE.Group) {
      this.gameObject.mesh.add(this.particleSystem)
    } else {
      // Create a group if mesh doesn't exist
      const group = new THREE.Group()
      if (this.gameObject.mesh) {
        group.add(this.gameObject.mesh)
      }
      group.add(this.particleSystem)
      this.gameObject.mesh = group
    }
  }
  
  update(deltaTime: number): void {
    if (!this.enabled) return
    
    // Update total time
    this.totalTime += deltaTime
    
    // Check emission duration
    if (this.config.duration > 0 && this.totalTime > this.config.duration) {
      this.isEmitting = false
    }
    
    // Emit new particles
    if (this.isEmitting && !this.burstMode) {
      this.emissionTimer += deltaTime
      const particlesToEmit = Math.floor(this.emissionTimer * this.config.emissionRate)
      
      if (particlesToEmit > 0) {
        this.emissionTimer -= particlesToEmit / this.config.emissionRate
        
        for (let i = 0; i < particlesToEmit; i++) {
          if (this.particles.size < this.config.maxParticles) {
            this.emitParticle()
          }
        }
      }
    }
    
    // Update existing particles
    let particleIndex = 0
    const toRemove: Particle[] = []
    
    this.particles.forEach(particle => {
      particle.update(
        deltaTime,
        this.config.gravity,
        this.config.damping,
        this.config.acceleration
      )
      
      if (!particle.isAlive()) {
        toRemove.push(particle)
      } else {
        // Update buffer data
        const i3 = particleIndex * 3
        
        // Position (world space)
        const worldPos = this.gameObject.position.clone().add(particle.position)
        this.positions[i3] = worldPos.x
        this.positions[i3 + 1] = worldPos.y
        this.positions[i3 + 2] = worldPos.z
        
        // Color
        this.colors[i3] = particle.color.r
        this.colors[i3 + 1] = particle.color.g
        this.colors[i3 + 2] = particle.color.b
        
        // Size
        this.sizes[particleIndex] = particle.size
        
        particleIndex++
      }
    })
    
    // Remove dead particles
    toRemove.forEach(particle => {
      this.particles.delete(particle)
      this.particlePool.release(particle)
    })
    
    // Clear remaining buffer data
    for (let i = particleIndex; i < this.maxParticleCount; i++) {
      const i3 = i * 3
      this.positions[i3] = 0
      this.positions[i3 + 1] = 0
      this.positions[i3 + 2] = 0
      this.sizes[i] = 0
    }
    
    // Update geometry
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
    
    // Update material opacity based on average particle opacity
    if (this.particles.size > 0) {
      let totalOpacity = 0
      this.particles.forEach(p => totalOpacity += p.opacity)
      this.material.opacity = totalOpacity / this.particles.size
    }
  }
  
  private emitParticle(): void {
    const particle = this.particlePool.get()
    
    // Initialize particle properties
    particle.lifetime = THREE.MathUtils.randFloat(
      this.config.lifetime.min,
      this.config.lifetime.max
    )
    
    particle.startSize = THREE.MathUtils.randFloat(
      this.config.startSize.min,
      this.config.startSize.max
    )
    
    particle.endSize = THREE.MathUtils.randFloat(
      this.config.endSize.min,
      this.config.endSize.max
    )
    
    particle.size = particle.startSize
    
    particle.startColor.copy(this.config.startColor)
    particle.endColor.copy(this.config.endColor)
    particle.color.copy(particle.startColor)
    
    particle.startOpacity = THREE.MathUtils.randFloat(
      this.config.startOpacity.min,
      this.config.startOpacity.max
    )
    
    particle.endOpacity = THREE.MathUtils.randFloat(
      this.config.endOpacity.min,
      this.config.endOpacity.max
    )
    
    particle.opacity = particle.startOpacity
    
    particle.rotation = THREE.MathUtils.randFloat(
      this.config.startRotation.min,
      this.config.startRotation.max
    )
    
    particle.rotationSpeed = THREE.MathUtils.randFloat(
      this.config.rotationSpeed.min,
      this.config.rotationSpeed.max
    )
    
    // Set initial position based on emitter shape
    this.setParticlePosition(particle)
    
    // Set initial velocity
    particle.velocity.x = THREE.MathUtils.randFloat(
      this.config.velocity.min.x,
      this.config.velocity.max.x
    )
    particle.velocity.y = THREE.MathUtils.randFloat(
      this.config.velocity.min.y,
      this.config.velocity.max.y
    )
    particle.velocity.z = THREE.MathUtils.randFloat(
      this.config.velocity.min.z,
      this.config.velocity.max.z
    )
    
    particle.age = 0
    
    this.particles.add(particle)
  }
  
  private setParticlePosition(particle: Particle): void {
    switch (this.config.emitterShape) {
      case 'point':
        particle.position.set(0, 0, 0)
        break
        
      case 'box':
        particle.position.set(
          THREE.MathUtils.randFloatSpread(this.config.emitterSize.x),
          THREE.MathUtils.randFloatSpread(this.config.emitterSize.y),
          THREE.MathUtils.randFloatSpread(this.config.emitterSize.z)
        )
        break
        
      case 'sphere': {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(1 - 2 * Math.random())
        const radius = Math.random() * this.config.emitterSize.x
        
        particle.position.set(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi)
        )
        break
      }
        
      case 'cone': {
        const angle = Math.random() * Math.PI * 2
        const distance = Math.random() * this.config.emitterSize.x
        const height = Math.random() * this.config.emitterSize.y
        
        particle.position.set(
          distance * Math.cos(angle),
          height,
          distance * Math.sin(angle)
        )
        break
      }
    }
  }
  
  emit(count: number = 1): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.size < this.config.maxParticles) {
        this.emitParticle()
      }
    }
  }
  
  burst(count: number): void {
    this.emit(count)
  }
  
  play(): void {
    this.isEmitting = true
    this.totalTime = 0
    this.emissionTimer = 0
  }
  
  stop(clear = false): void {
    this.isEmitting = false
    
    if (clear) {
      this.clear()
    }
  }
  
  clear(): void {
    this.particles.forEach(particle => {
      this.particlePool.release(particle)
    })
    this.particles.clear()
  }
  
  setConfig(config: Partial<ParticleConfig>): void {
    Object.assign(this.config, config)
  }
  
  destroy(): void {
    this.clear()
    
    if (this.particleSystem && this.gameObject.mesh instanceof THREE.Group) {
      this.gameObject.mesh.remove(this.particleSystem)
    }
    
    this.geometry.dispose()
    this.material.dispose()
  }
}

// Preset particle configurations
export const ParticlePresets = {
  sparkle: {
    emissionRate: 20,
    maxParticles: 50,
    duration: 0.5,
    lifetime: { min: 0.3, max: 0.6 },
    startSize: { min: 0.1, max: 0.2 },
    endSize: { min: 0, max: 0 },
    startColor: new THREE.Color(0xffff00),
    endColor: new THREE.Color(0xffffff),
    velocity: {
      min: new THREE.Vector3(-2, 1, -2),
      max: new THREE.Vector3(2, 4, 2)
    },
    gravity: -5,
    emitterShape: 'sphere' as const,
    emitterSize: new THREE.Vector3(0.5, 0.5, 0.5)
  },
  
  explosion: {
    emissionRate: 100,
    maxParticles: 100,
    duration: 0.1,
    lifetime: { min: 0.5, max: 1 },
    startSize: { min: 0.3, max: 0.5 },
    endSize: { min: 0, max: 0.1 },
    startColor: new THREE.Color(0xff4444),
    endColor: new THREE.Color(0xff8800),
    startOpacity: { min: 1, max: 1 },
    endOpacity: { min: 0, max: 0 },
    velocity: {
      min: new THREE.Vector3(-5, 0, -5),
      max: new THREE.Vector3(5, 10, 5)
    },
    gravity: -2,
    damping: 0.3,
    emitterShape: 'sphere' as const,
    emitterSize: new THREE.Vector3(0.1, 0.1, 0.1)
  },
  
  dust: {
    emissionRate: 10,
    maxParticles: 20,
    duration: 0.2,
    lifetime: { min: 0.5, max: 1 },
    startSize: { min: 0.1, max: 0.2 },
    endSize: { min: 0.2, max: 0.3 },
    startColor: new THREE.Color(0x888888),
    endColor: new THREE.Color(0x666666),
    startOpacity: { min: 0.6, max: 0.8 },
    endOpacity: { min: 0, max: 0 },
    velocity: {
      min: new THREE.Vector3(-0.5, 0, -0.5),
      max: new THREE.Vector3(0.5, 1, 0.5)
    },
    gravity: -1,
    damping: 0.5,
    emitterShape: 'box' as const,
    emitterSize: new THREE.Vector3(0.5, 0.1, 0.5)
  },
  
  slash: {
    emissionRate: 50,
    maxParticles: 30,
    duration: 0.1,
    lifetime: { min: 0.2, max: 0.3 },
    startSize: { min: 0.05, max: 0.1 },
    endSize: { min: 0, max: 0 },
    startColor: new THREE.Color(0x00ffff),
    endColor: new THREE.Color(0x0088ff),
    velocity: {
      min: new THREE.Vector3(-1, -0.5, -1),
      max: new THREE.Vector3(1, 0.5, 1)
    },
    gravity: 0,
    damping: 0.8,
    emitterShape: 'box' as const,
    emitterSize: new THREE.Vector3(1, 0.1, 0.1)
  }
}