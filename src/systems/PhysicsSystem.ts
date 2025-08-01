import * as THREE from 'three'
import { logger } from '../utils/Logger'

export interface RigidBody {
  object: THREE.Object3D
  velocity: THREE.Vector3
  acceleration: THREE.Vector3
  mass: number
  restitution: number // Bounciness: 0 = no bounce, 1 = perfect bounce
  friction: number
  isStatic: boolean
  useGravity: boolean
  collisionGroup: number
  collisionMask: number
}

export interface CollisionInfo {
  bodyA: RigidBody
  bodyB: RigidBody
  normal: THREE.Vector3
  depth: number
  contactPoint: THREE.Vector3
}

export type CollisionCallback = (collision: CollisionInfo) => void

export class PhysicsSystem {
  private static instance: PhysicsSystem
  
  // Physics settings
  private gravity = new THREE.Vector3(0, -9.81, 0)
  private fixedTimeStep = 1 / 60 // 60 FPS physics
  private maxSubSteps = 3
  private accumulator = 0
  
  // Bodies and collision tracking
  private bodies: Set<RigidBody> = new Set()
  private collisionCallbacks: Map<RigidBody, CollisionCallback[]> = new Map()
  private previousCollisions: Map<string, boolean> = new Map()
  
  // Collision groups (bit flags)
  static readonly COLLISION_GROUP = {
    DEFAULT: 1,
    PLAYER: 2,
    ENEMY: 4,
    PROJECTILE: 8,
    STATIC: 16,
    PICKUP: 32,
    TRIGGER: 64
  }
  
  private constructor() {
    logger.info('PhysicsSystem initialized')
  }
  
  static getInstance(): PhysicsSystem {
    if (!PhysicsSystem.instance) {
      PhysicsSystem.instance = new PhysicsSystem()
    }
    return PhysicsSystem.instance
  }
  
  /**
   * Create a rigid body for a Three.js object
   */
  createRigidBody(
    object: THREE.Object3D,
    options: Partial<{
      mass: number
      restitution: number
      friction: number
      isStatic: boolean
      useGravity: boolean
      velocity: THREE.Vector3
      collisionGroup: number
      collisionMask: number
    }> = {}
  ): RigidBody {
    const body: RigidBody = {
      object,
      velocity: options.velocity || new THREE.Vector3(),
      acceleration: new THREE.Vector3(),
      mass: options.mass ?? 1,
      restitution: options.restitution ?? 0.5,
      friction: options.friction ?? 0.5,
      isStatic: options.isStatic ?? false,
      useGravity: options.useGravity ?? true,
      collisionGroup: options.collisionGroup ?? PhysicsSystem.COLLISION_GROUP.DEFAULT,
      collisionMask: options.collisionMask ?? -1 // Collide with everything by default
    }
    
    this.bodies.add(body)
    return body
  }
  
  /**
   * Remove a rigid body from the physics system
   */
  removeRigidBody(body: RigidBody): void {
    this.bodies.delete(body)
    this.collisionCallbacks.delete(body)
    
    // Clean up collision history
    const keysToRemove: string[] = []
    this.previousCollisions.forEach((_, key) => {
      if (key.includes(body.object.uuid)) {
        keysToRemove.push(key)
      }
    })
    keysToRemove.forEach(key => this.previousCollisions.delete(key))
  }
  
  /**
   * Add collision callback for a body
   */
  onCollision(body: RigidBody, callback: CollisionCallback): () => void {
    if (!this.collisionCallbacks.has(body)) {
      this.collisionCallbacks.set(body, [])
    }
    
    this.collisionCallbacks.get(body)!.push(callback)
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.collisionCallbacks.get(body)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index !== -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }
  
  /**
   * Apply force to a body
   */
  applyForce(body: RigidBody, force: THREE.Vector3): void {
    if (body.isStatic || body.mass === 0) return
    
    // F = ma, so a = F/m
    const acceleration = force.clone().divideScalar(body.mass)
    body.acceleration.add(acceleration)
  }
  
  /**
   * Apply impulse to a body (instant velocity change)
   */
  applyImpulse(body: RigidBody, impulse: THREE.Vector3): void {
    if (body.isStatic || body.mass === 0) return
    
    // J = mv, so v = J/m
    const velocityChange = impulse.clone().divideScalar(body.mass)
    body.velocity.add(velocityChange)
  }
  
  /**
   * Set gravity
   */
  setGravity(gravity: THREE.Vector3 | number): void {
    if (typeof gravity === 'number') {
      this.gravity.set(0, -gravity, 0)
    } else {
      this.gravity.copy(gravity)
    }
  }
  
  /**
   * Update physics simulation
   */
  update(deltaTime: number): void {
    // Fixed timestep with interpolation
    this.accumulator += Math.min(deltaTime, 0.25) // Prevent spiral of death
    
    let steps = 0
    while (this.accumulator >= this.fixedTimeStep && steps < this.maxSubSteps) {
      this.fixedUpdate(this.fixedTimeStep)
      this.accumulator -= this.fixedTimeStep
      steps++
    }
    
    // Interpolate positions for smooth rendering
    const alpha = this.accumulator / this.fixedTimeStep
    this.interpolatePositions(alpha)
  }
  
  private fixedUpdate(deltaTime: number): void {
    // Apply forces and update velocities
    this.bodies.forEach(body => {
      if (body.isStatic) return
      
      // Apply gravity
      if (body.useGravity && body.mass > 0) {
        const gravityForce = this.gravity.clone().multiplyScalar(body.mass)
        this.applyForce(body, gravityForce)
      }
      
      // Update velocity from acceleration
      body.velocity.add(body.acceleration.clone().multiplyScalar(deltaTime))
      
      // Apply friction (simple linear dampening)
      body.velocity.multiplyScalar(1 - body.friction * deltaTime)
      
      // Update position
      const displacement = body.velocity.clone().multiplyScalar(deltaTime)
      body.object.position.add(displacement)
      
      // Reset acceleration for next frame
      body.acceleration.set(0, 0, 0)
    })
    
    // Check collisions
    this.checkCollisions()
  }
  
  private interpolatePositions(_alpha: number): void {
    // For now, just use current positions
    // In a more advanced system, you'd store previous positions
    // and interpolate between them
  }
  
  private checkCollisions(): void {
    const bodiesArray = Array.from(this.bodies)
    
    for (let i = 0; i < bodiesArray.length; i++) {
      for (let j = i + 1; j < bodiesArray.length; j++) {
        const bodyA = bodiesArray[i]
        const bodyB = bodiesArray[j]
        
        // Check collision masks
        if ((bodyA.collisionGroup & bodyB.collisionMask) === 0 ||
            (bodyB.collisionGroup & bodyA.collisionMask) === 0) {
          continue
        }
        
        // Simple sphere collision detection
        const collision = this.checkSphereSphereCollision(bodyA, bodyB)
        if (collision) {
          this.resolveCollision(collision)
          this.notifyCollisionCallbacks(collision)
        }
      }
    }
  }
  
  private checkSphereSphereCollision(bodyA: RigidBody, bodyB: RigidBody): CollisionInfo | null {
    // Get bounding spheres (simplified - assumes objects are roughly spherical)
    const radiusA = this.getBoundingSphereRadius(bodyA.object)
    const radiusB = this.getBoundingSphereRadius(bodyB.object)
    
    const distance = bodyA.object.position.distanceTo(bodyB.object.position)
    const minDistance = radiusA + radiusB
    
    if (distance < minDistance) {
      const normal = new THREE.Vector3()
        .subVectors(bodyB.object.position, bodyA.object.position)
        .normalize()
      
      const depth = minDistance - distance
      const contactPoint = bodyA.object.position.clone()
        .add(normal.clone().multiplyScalar(radiusA))
      
      return {
        bodyA,
        bodyB,
        normal,
        depth,
        contactPoint
      }
    }
    
    return null
  }
  
  private getBoundingSphereRadius(object: THREE.Object3D): number {
    // Try to get actual geometry bounds
    if (object instanceof THREE.Mesh && object.geometry) {
      if (!object.geometry.boundingSphere) {
        object.geometry.computeBoundingSphere()
      }
      return object.geometry.boundingSphere?.radius || 1
    }
    
    // Fallback to scale-based estimation
    const scale = object.scale
    return Math.max(scale.x, scale.y, scale.z) * 0.5
  }
  
  private resolveCollision(collision: CollisionInfo): void {
    const { bodyA, bodyB, normal, depth } = collision
    
    // Skip if both are static
    if (bodyA.isStatic && bodyB.isStatic) return
    
    // Separate objects
    const totalMass = bodyA.mass + bodyB.mass
    const separationA = bodyA.isStatic ? 0 : (bodyB.mass / totalMass) * depth
    const separationB = bodyB.isStatic ? 0 : (bodyA.mass / totalMass) * depth
    
    bodyA.object.position.add(normal.clone().multiplyScalar(-separationA))
    bodyB.object.position.add(normal.clone().multiplyScalar(separationB))
    
    // Calculate relative velocity
    const relativeVelocity = new THREE.Vector3()
      .subVectors(bodyB.velocity, bodyA.velocity)
    
    const velocityAlongNormal = relativeVelocity.dot(normal)
    
    // Don't resolve if objects are moving apart
    if (velocityAlongNormal > 0) return
    
    // Calculate restitution (bounciness)
    const restitution = Math.min(bodyA.restitution, bodyB.restitution)
    
    // Calculate impulse scalar
    let impulseMagnitude = -(1 + restitution) * velocityAlongNormal
    
    if (!bodyA.isStatic && !bodyB.isStatic) {
      impulseMagnitude /= (1 / bodyA.mass + 1 / bodyB.mass)
    } else if (bodyA.isStatic) {
      impulseMagnitude *= bodyB.mass
    } else {
      impulseMagnitude *= bodyA.mass
    }
    
    // Apply impulse
    const impulse = normal.clone().multiplyScalar(impulseMagnitude)
    
    if (!bodyA.isStatic) {
      bodyA.velocity.sub(impulse.clone().divideScalar(bodyA.mass))
    }
    if (!bodyB.isStatic) {
      bodyB.velocity.add(impulse.clone().divideScalar(bodyB.mass))
    }
  }
  
  private notifyCollisionCallbacks(collision: CollisionInfo): void {
    // Create unique key for this collision pair
    const key = [collision.bodyA.object.uuid, collision.bodyB.object.uuid]
      .sort()
      .join('-')
    
    // Mark collision as active
    this.previousCollisions.set(key, true)
    
    // Notify callbacks
    const callbacksA = this.collisionCallbacks.get(collision.bodyA) || []
    const callbacksB = this.collisionCallbacks.get(collision.bodyB) || []
    
    callbacksA.forEach(callback => callback(collision))
    callbacksB.forEach(callback => callback({
      ...collision,
      bodyA: collision.bodyB,
      bodyB: collision.bodyA,
      normal: collision.normal.clone().negate()
    }))
  }
  
  /**
   * Raycast in the physics world
   */
  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance = Infinity,
    collisionMask = -1
  ): {
    body: RigidBody
    point: THREE.Vector3
    distance: number
  } | null {
    const ray = new THREE.Ray(origin, direction.clone().normalize())
    let closestHit: {
      body: RigidBody
      point: THREE.Vector3
      distance: number
    } | null = null
    let closestDistance = maxDistance
    
    this.bodies.forEach(body => {
      // Check collision mask
      if ((body.collisionGroup & collisionMask) === 0) return
      
      // Simple sphere intersection
      const radius = this.getBoundingSphereRadius(body.object)
      const sphereCenter = body.object.position
      
      const toSphere = new THREE.Vector3().subVectors(sphereCenter, ray.origin)
      const alongRay = toSphere.dot(ray.direction)
      
      if (alongRay < 0) return // Sphere is behind ray
      
      const closestPoint = ray.origin.clone()
        .add(ray.direction.clone().multiplyScalar(alongRay))
      
      const distanceToCenter = closestPoint.distanceTo(sphereCenter)
      
      if (distanceToCenter <= radius) {
        const distance = alongRay - Math.sqrt(radius * radius - distanceToCenter * distanceToCenter)
        
        if (distance < closestDistance && distance > 0) {
          closestDistance = distance
          closestHit = {
            body,
            point: ray.origin.clone().add(ray.direction.clone().multiplyScalar(distance)),
            distance
          }
        }
      }
    })
    
    return closestHit
  }
  
  /**
   * Get all bodies within a sphere
   */
  getBodiesInSphere(center: THREE.Vector3, radius: number, collisionMask = -1): RigidBody[] {
    const bodies: RigidBody[] = []
    
    this.bodies.forEach(body => {
      // Check collision mask
      if ((body.collisionGroup & collisionMask) === 0) return
      
      const bodyRadius = this.getBoundingSphereRadius(body.object)
      const distance = body.object.position.distanceTo(center)
      
      if (distance <= radius + bodyRadius) {
        bodies.push(body)
      }
    })
    
    return bodies
  }
  
  /**
   * Clear all bodies
   */
  clear(): void {
    this.bodies.clear()
    this.collisionCallbacks.clear()
    this.previousCollisions.clear()
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    bodyCount: number
    activeCollisions: number
  } {
    return {
      bodyCount: this.bodies.size,
      activeCollisions: this.previousCollisions.size
    }
  }
}