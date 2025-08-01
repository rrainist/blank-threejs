import * as THREE from 'three'
import { ObjectPool } from '../utils/ObjectPool'
import { TimeManager } from './TimeManager'
import { logger } from '../utils/Logger'

export interface ParticleOptions {
  count?: number
  lifetime?: number
  size?: number
  sizeVariation?: number
  color?: THREE.Color | number
  colorVariation?: number
  velocity?: THREE.Vector3
  velocityVariation?: THREE.Vector3
  acceleration?: THREE.Vector3
  rotation?: number
  rotationSpeed?: number
  opacity?: number
  fadeIn?: number
  fadeOut?: number
  texture?: THREE.Texture | null
  blending?: THREE.Blending
}

export interface ScreenEffect {
  type: 'shake' | 'flash' | 'fade' | 'chromatic' | 'blur'
  duration: number
  intensity: number
  color?: THREE.Color
  easing?: (t: number) => number
}

class Particle extends THREE.Sprite {
  velocity = new THREE.Vector3()
  acceleration = new THREE.Vector3()
  lifetime = 1
  age = 0
  rotationSpeed = 0
  fadeIn = 0
  fadeOut = 0.3
  startOpacity = 1
  startScale = 1
  active = false
  
  reset(): void {
    this.velocity.set(0, 0, 0)
    this.acceleration.set(0, 0, 0)
    this.lifetime = 1
    this.age = 0
    this.rotationSpeed = 0
    this.fadeIn = 0
    this.fadeOut = 0.3
    this.startOpacity = 1
    this.startScale = 1
    this.scale.set(1, 1, 1)
    this.material.opacity = 1
    this.material.rotation = 0
    this.visible = false
    this.active = false
  }
}

class Trail extends THREE.Mesh {
  points: THREE.Vector3[] = []
  maxPoints = 20
  active = false
  
  constructor() {
    const geometry = new THREE.BufferGeometry()
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    })
    super(geometry, material)
  }
  
  reset(): void {
    this.points = []
    this.visible = false
    this.active = false
    this.updateGeometry()
  }
  
  addPoint(point: THREE.Vector3): void {
    this.points.push(point.clone())
    if (this.points.length > this.maxPoints) {
      this.points.shift()
    }
    this.updateGeometry()
  }
  
  updateGeometry(): void {
    if (this.points.length < 2) {
      this.visible = false
      return
    }
    
    this.visible = true
    const vertices: number[] = []
    const indices: number[] = []
    
    // Create a ribbon mesh from the points
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i]
      const width = (1 - i / this.points.length) * 0.5 // Taper
      
      // Create two vertices for each point (left and right)
      vertices.push(point.x - width, point.y, point.z)
      vertices.push(point.x + width, point.y, point.z)
      
      // Create triangles
      if (i > 0) {
        const base = i * 2
        indices.push(base - 2, base - 1, base)
        indices.push(base - 1, base + 1, base)
      }
    }
    
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    this.geometry.setIndex(indices)
    this.geometry.computeVertexNormals()
  }
}

export class EffectsSystem {
  private static instance: EffectsSystem
  private scene: THREE.Scene
  private camera: THREE.Camera
  private renderer: THREE.WebGLRenderer
  private timeManager: TimeManager
  
  // Particle system
  private particlePool: ObjectPool<Particle>
  private activeParticles: Set<Particle> = new Set()
  private defaultParticleTexture: THREE.Texture
  
  // Trail system
  private trailPool: ObjectPool<Trail>
  private activeTrails: Map<THREE.Object3D, Trail> = new Map()
  
  // Screen effects
  private activeScreenEffects: ScreenEffect[] = []
  private screenShakeData = { x: 0, y: 0, intensity: 0 }
  private originalCameraPosition = new THREE.Vector3()
  private screenFlashMesh?: THREE.Mesh
  
  private constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.timeManager = TimeManager.getInstance()
    
    // Create default particle texture
    this.defaultParticleTexture = this.createDefaultParticleTexture()
    
    // Initialize particle pool
    this.particlePool = new ObjectPool<Particle>(
      () => this.createParticle(),
      100, // Initial size
      500, // Max size
      (particle) => particle.reset()
    )
    
    // Initialize trail pool
    this.trailPool = new ObjectPool<Trail>(
      () => new Trail(),
      10,
      50,
      (trail) => trail.reset()
    )
    
    // Store original camera position
    this.originalCameraPosition.copy(camera.position)
    
    // Create screen flash mesh
    this.createScreenFlashMesh()
    
    logger.info('EffectsSystem initialized')
  }
  
  static initialize(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): EffectsSystem {
    if (!EffectsSystem.instance) {
      EffectsSystem.instance = new EffectsSystem(scene, camera, renderer)
    }
    return EffectsSystem.instance
  }
  
  static getInstance(): EffectsSystem {
    if (!EffectsSystem.instance) {
      throw new Error('EffectsSystem not initialized. Call EffectsSystem.initialize() first.')
    }
    return EffectsSystem.instance
  }
  
  /**
   * Spawn particles at a position
   */
  spawnParticles(position: THREE.Vector3, options: ParticleOptions = {}): void {
    const count = options.count || 10
    
    for (let i = 0; i < count; i++) {
      const particle = this.particlePool.get()
      if (!particle) break
      
      // Set position
      particle.position.copy(position)
      
      // Set size
      const baseSize = options.size || 1
      const sizeVariation = options.sizeVariation || 0.2
      const size = baseSize + (Math.random() - 0.5) * sizeVariation * baseSize
      particle.scale.set(size, size, 1)
      particle.startScale = size
      
      // Set color
      if (options.color !== undefined) {
        const color = options.color instanceof THREE.Color ? options.color : new THREE.Color(options.color)
        if (options.colorVariation) {
          const h = color.getHSL({ h: 0, s: 0, l: 0 }).h
          const s = color.getHSL({ h: 0, s: 0, l: 0 }).s
          const l = color.getHSL({ h: 0, s: 0, l: 0 }).l
          const variation = options.colorVariation
          particle.material.color.setHSL(
            h + (Math.random() - 0.5) * variation,
            s,
            l + (Math.random() - 0.5) * variation
          )
        } else {
          particle.material.color.copy(color)
        }
      }
      
      // Set velocity
      if (options.velocity) {
        particle.velocity.copy(options.velocity)
        if (options.velocityVariation) {
          particle.velocity.x += (Math.random() - 0.5) * options.velocityVariation.x
          particle.velocity.y += (Math.random() - 0.5) * options.velocityVariation.y
          particle.velocity.z += (Math.random() - 0.5) * options.velocityVariation.z
        }
      } else {
        // Random velocity
        const speed = 5
        particle.velocity.set(
          (Math.random() - 0.5) * speed,
          Math.random() * speed,
          (Math.random() - 0.5) * speed
        )
      }
      
      // Set acceleration
      if (options.acceleration) {
        particle.acceleration.copy(options.acceleration)
      }
      
      // Set rotation
      if (options.rotation !== undefined) {
        particle.material.rotation = options.rotation
      }
      particle.rotationSpeed = options.rotationSpeed || 0
      
      // Set lifetime and fading
      particle.lifetime = options.lifetime || 1
      particle.age = 0
      particle.fadeIn = options.fadeIn || 0
      particle.fadeOut = options.fadeOut || 0.3
      particle.startOpacity = options.opacity || 1
      particle.material.opacity = particle.fadeIn > 0 ? 0 : particle.startOpacity
      
      // Set texture
      if (options.texture !== undefined) {
        particle.material.map = options.texture
      }
      
      // Set blending
      if (options.blending !== undefined) {
        particle.material.blending = options.blending
      }
      
      // Activate and add to scene
      particle.visible = true
      particle.active = true
      this.activeParticles.add(particle)
      this.scene.add(particle)
    }
  }
  
  /**
   * Create explosion effect
   */
  explosion(position: THREE.Vector3, options: {
    color?: THREE.Color | number
    size?: number
    count?: number
    force?: number
  } = {}): void {
    // Main explosion particles
    this.spawnParticles(position, {
      count: options.count || 30,
      size: options.size || 0.5,
      sizeVariation: 0.5,
      color: options.color || 0xff6600,
      colorVariation: 0.2,
      velocity: new THREE.Vector3(0, 0, 0),
      velocityVariation: new THREE.Vector3(options.force || 10, options.force || 10, options.force || 10),
      acceleration: new THREE.Vector3(0, -5, 0),
      lifetime: 0.8,
      fadeOut: 0.3,
      blending: THREE.AdditiveBlending
    })
    
    // Smoke particles
    this.spawnParticles(position, {
      count: 20,
      size: (options.size || 0.5) * 2,
      sizeVariation: 0.3,
      color: 0x333333,
      velocity: new THREE.Vector3(0, 2, 0),
      velocityVariation: new THREE.Vector3(3, 2, 3),
      lifetime: 1.5,
      fadeOut: 0.5,
      opacity: 0.6
    })
    
    // Screen shake
    this.screenEffect('shake', 0.3, 0.5)
  }
  
  /**
   * Create magic/sparkle effect
   */
  sparkle(position: THREE.Vector3, options: {
    color?: THREE.Color | number
    count?: number
    spread?: number
  } = {}): void {
    this.spawnParticles(position, {
      count: options.count || 20,
      size: 0.3,
      sizeVariation: 0.5,
      color: options.color || 0x00ffff,
      colorVariation: 0.3,
      velocity: new THREE.Vector3(0, 2, 0),
      velocityVariation: new THREE.Vector3(options.spread || 2, 3, options.spread || 2),
      acceleration: new THREE.Vector3(0, -1, 0),
      lifetime: 1,
      fadeIn: 0.1,
      fadeOut: 0.3,
      rotationSpeed: Math.PI,
      blending: THREE.AdditiveBlending
    })
  }
  
  /**
   * Create hit effect
   */
  hit(position: THREE.Vector3, normal: THREE.Vector3, options: {
    color?: THREE.Color | number
    size?: number
  } = {}): void {
    // Calculate spread direction based on normal
    const spreadDir = normal.clone().multiplyScalar(5)
    
    this.spawnParticles(position, {
      count: 15,
      size: options.size || 0.3,
      sizeVariation: 0.3,
      color: options.color || 0xffff00,
      velocity: spreadDir,
      velocityVariation: new THREE.Vector3(3, 3, 3),
      acceleration: new THREE.Vector3(0, -10, 0),
      lifetime: 0.5,
      fadeOut: 0.2,
      blending: THREE.AdditiveBlending
    })
  }
  
  /**
   * Start a trail effect for an object
   */
  startTrail(object: THREE.Object3D, options: {
    color?: THREE.Color | number
    opacity?: number
    maxPoints?: number
  } = {}): void {
    if (this.activeTrails.has(object)) return
    
    const trail = this.trailPool.get()
    if (!trail) return
    
    if (trail.material instanceof THREE.MeshBasicMaterial) {
      trail.material.color = options.color instanceof THREE.Color 
        ? options.color 
        : new THREE.Color(options.color || 0xffffff)
      trail.material.opacity = options.opacity || 0.6
    }
    
    trail.maxPoints = options.maxPoints || 20
    trail.visible = true
    trail.active = true
    
    this.activeTrails.set(object, trail)
    this.scene.add(trail)
  }
  
  /**
   * Stop a trail effect
   */
  stopTrail(object: THREE.Object3D): void {
    const trail = this.activeTrails.get(object)
    if (!trail) return
    
    this.activeTrails.delete(object)
    this.scene.remove(trail)
    this.trailPool.release(trail)
  }
  
  /**
   * Apply screen effect
   */
  screenEffect(type: ScreenEffect['type'], duration: number, intensity: number, options: {
    color?: THREE.Color | number
    easing?: (t: number) => number
  } = {}): void {
    const effect: ScreenEffect = {
      type,
      duration,
      intensity,
      color: options.color instanceof THREE.Color ? options.color : new THREE.Color(options.color || 0xffffff),
      easing: options.easing || ((t) => t)
    }
    
    this.activeScreenEffects.push(effect)
    
    // Handle immediate effects
    if (type === 'flash' && this.screenFlashMesh) {
      this.screenFlashMesh.visible = true
      if (this.screenFlashMesh.material instanceof THREE.MeshBasicMaterial) {
        this.screenFlashMesh.material.color = effect.color || new THREE.Color(0xffffff)
        this.screenFlashMesh.material.opacity = intensity
      }
    }
  }
  
  /**
   * Convenience method for screen shake
   */
  screenShake(duration: number, intensity: number): void {
    this.screenEffect('shake', duration, intensity)
  }
  
  /**
   * Update all effects
   */
  update(deltaTime: number): void {
    // Update particles
    this.activeParticles.forEach(particle => {
      particle.age += deltaTime
      
      if (particle.age >= particle.lifetime) {
        this.activeParticles.delete(particle)
        this.scene.remove(particle)
        this.particlePool.release(particle)
        return
      }
      
      // Update physics
      particle.velocity.add(particle.acceleration.clone().multiplyScalar(deltaTime))
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime))
      
      // Update rotation
      if (particle.rotationSpeed !== 0) {
        particle.material.rotation += particle.rotationSpeed * deltaTime
      }
      
      // Update opacity
      const lifeRatio = particle.age / particle.lifetime
      let opacity = particle.startOpacity
      
      if (particle.fadeIn > 0 && lifeRatio < particle.fadeIn) {
        opacity *= lifeRatio / particle.fadeIn
      } else if (particle.fadeOut > 0 && lifeRatio > (1 - particle.fadeOut)) {
        opacity *= (1 - lifeRatio) / particle.fadeOut
      }
      
      particle.material.opacity = opacity
      
      // Update scale (shrink over time)
      const scaleFactor = 1 - lifeRatio * 0.5
      particle.scale.set(
        particle.startScale * scaleFactor,
        particle.startScale * scaleFactor,
        1
      )
    })
    
    // Update trails
    this.activeTrails.forEach((trail, object) => {
      trail.addPoint(object.position)
    })
    
    // Update screen effects
    this.updateScreenEffects(deltaTime)
  }
  
  private updateScreenEffects(deltaTime: number): void {
    // Reset screen shake
    this.screenShakeData.x = 0
    this.screenShakeData.y = 0
    this.screenShakeData.intensity = 0
    
    // Process active effects
    for (let i = this.activeScreenEffects.length - 1; i >= 0; i--) {
      const effect = this.activeScreenEffects[i]
      effect.duration -= deltaTime
      
      if (effect.duration <= 0) {
        // Remove expired effect
        this.activeScreenEffects.splice(i, 1)
        
        // Clean up specific effects
        if (effect.type === 'flash' && this.screenFlashMesh) {
          this.screenFlashMesh.visible = false
        }
        continue
      }
      
      const progress = 1 - (effect.duration / this.activeScreenEffects[i].duration)
      const easedProgress = effect.easing ? effect.easing(progress) : progress
      
      switch (effect.type) {
        case 'shake': {
          const shakeIntensity = effect.intensity * (1 - easedProgress)
          this.screenShakeData.x += (Math.random() - 0.5) * shakeIntensity
          this.screenShakeData.y += (Math.random() - 0.5) * shakeIntensity
          this.screenShakeData.intensity = Math.max(this.screenShakeData.intensity, shakeIntensity)
          break
        }
        
        case 'flash':
          if (this.screenFlashMesh && this.screenFlashMesh.material instanceof THREE.MeshBasicMaterial) {
            this.screenFlashMesh.material.opacity = effect.intensity * (1 - easedProgress)
          }
          break
        
        case 'fade':
          // Would need post-processing or overlay
          break
      }
    }
    
    // Apply screen shake to camera
    if (this.screenShakeData.intensity > 0) {
      this.camera.position.x = this.originalCameraPosition.x + this.screenShakeData.x
      this.camera.position.y = this.originalCameraPosition.y + this.screenShakeData.y
    } else {
      // Restore original position
      this.camera.position.x = this.originalCameraPosition.x
      this.camera.position.y = this.originalCameraPosition.y
    }
  }
  
  private createParticle(): Particle {
    const material = new THREE.SpriteMaterial({
      map: this.defaultParticleTexture,
      color: 0xffffff,
      blending: THREE.NormalBlending,
      transparent: true
    })
    
    const particle = new Particle(material)
    particle.scale.set(1, 1, 1)
    return particle
  }
  
  private createDefaultParticleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 32, 32)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }
  
  private createScreenFlashMesh(): void {
    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false
    })
    
    this.screenFlashMesh = new THREE.Mesh(geometry, material)
    this.screenFlashMesh.frustumCulled = false
    this.screenFlashMesh.renderOrder = 9999
    this.screenFlashMesh.visible = false
    
    // Add to camera as child so it stays in front
    if (this.camera instanceof THREE.PerspectiveCamera || this.camera instanceof THREE.OrthographicCamera) {
      this.screenFlashMesh.position.z = -1
      this.camera.add(this.screenFlashMesh)
    }
  }
  
  /**
   * Clear all effects
   */
  clear(): void {
    // Clear particles
    this.activeParticles.forEach(particle => {
      this.scene.remove(particle)
      this.particlePool.release(particle)
    })
    this.activeParticles.clear()
    
    // Clear trails
    this.activeTrails.forEach((trail) => {
      this.scene.remove(trail)
      this.trailPool.release(trail)
    })
    this.activeTrails.clear()
    
    // Clear screen effects
    this.activeScreenEffects = []
    if (this.screenFlashMesh) {
      this.screenFlashMesh.visible = false
    }
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    activeParticles: number
    activeTrails: number
    activeScreenEffects: number
    particlePoolUtilization: number
    trailPoolUtilization: number
  } {
    return {
      activeParticles: this.activeParticles.size,
      activeTrails: this.activeTrails.size,
      activeScreenEffects: this.activeScreenEffects.length,
      particlePoolUtilization: this.particlePool.getStats().utilization,
      trailPoolUtilization: this.trailPool.getStats().utilization
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Clear all effects
    this.clear()
    
    // Remove screen flash mesh from camera
    if (this.screenFlashMesh && this.screenFlashMesh.parent) {
      this.screenFlashMesh.parent.remove(this.screenFlashMesh)
    }
    
    // Dispose textures
    if (this.defaultParticleTexture) {
      this.defaultParticleTexture.dispose()
    }
    
    logger.info('EffectsSystem disposed')
  }
}