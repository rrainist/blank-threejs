import * as THREE from 'three'
import { GameObject } from '../entities/GameObject'
import { Collider, ColliderType, CollisionEvent } from '../components/Collider'
import { eventBus, GameEvents } from '../utils/EventBus'

export interface RaycastHit {
  object: GameObject
  point: THREE.Vector3
  normal: THREE.Vector3
  distance: number
}

export interface PhysicsConfig {
  gravity?: THREE.Vector3
  fixedTimeStep?: number
  maxSubSteps?: number
  broadphaseType?: 'simple' | 'spatial' | 'octree'
  enableDebugDraw?: boolean
}

interface PhysicsBody {
  gameObject: GameObject
  collider: Collider
  velocity: THREE.Vector3
  angularVelocity: THREE.Vector3
  mass: number
  isKinematic: boolean
  restitution: number // Bounciness 0-1
  friction: number // 0-1
  linearDamping: number // Air resistance
  angularDamping: number
}

// Simple spatial hash for broad phase collision detection
class SpatialHash {
  private cellSize: number
  private cells: Map<string, Set<PhysicsBody>> = new Map()

  constructor(cellSize = 10) {
    this.cellSize = cellSize
  }

  clear(): void {
    this.cells.clear()
  }

  private getKey(x: number, y: number, z: number): string {
    const cx = Math.floor(x / this.cellSize)
    const cy = Math.floor(y / this.cellSize)
    const cz = Math.floor(z / this.cellSize)
    return `${cx},${cy},${cz}`
  }

  insert(body: PhysicsBody): void {
    const pos = body.gameObject.position
    const radius = this.getBodyRadius(body)
    
    // Insert into all cells the body overlaps
    const minX = pos.x - radius
    const maxX = pos.x + radius
    const minY = pos.y - radius
    const maxY = pos.y + radius
    const minZ = pos.z - radius
    const maxZ = pos.z + radius
    
    for (let x = minX; x <= maxX; x += this.cellSize) {
      for (let y = minY; y <= maxY; y += this.cellSize) {
        for (let z = minZ; z <= maxZ; z += this.cellSize) {
          const key = this.getKey(x, y, z)
          if (!this.cells.has(key)) {
            this.cells.set(key, new Set())
          }
          this.cells.get(key)!.add(body)
        }
      }
    }
  }

  query(body: PhysicsBody): Set<PhysicsBody> {
    const pos = body.gameObject.position
    const radius = this.getBodyRadius(body)
    const nearby = new Set<PhysicsBody>()
    
    // Check all cells the body overlaps
    const minX = pos.x - radius
    const maxX = pos.x + radius
    const minY = pos.y - radius
    const maxY = pos.y + radius
    const minZ = pos.z - radius
    const maxZ = pos.z + radius
    
    for (let x = minX; x <= maxX; x += this.cellSize) {
      for (let y = minY; y <= maxY; y += this.cellSize) {
        for (let z = minZ; z <= maxZ; z += this.cellSize) {
          const key = this.getKey(x, y, z)
          const cell = this.cells.get(key)
          if (cell) {
            cell.forEach(other => {
              if (other !== body) {
                nearby.add(other)
              }
            })
          }
        }
      }
    }
    
    return nearby
  }

  private getBodyRadius(body: PhysicsBody): number {
    switch (body.collider.type) {
      case ColliderType.SPHERE:
        return body.collider.radius
      case ColliderType.BOX:
        return body.collider.size.length() * 0.5
      case ColliderType.CAPSULE:
        return Math.max(body.collider.radius, body.collider.height * 0.5)
      default:
        return 1
    }
  }
}

export class PhysicsManager {
  private static instance: PhysicsManager
  
  private config: Required<PhysicsConfig>
  private bodies: Map<GameObject, PhysicsBody> = new Map()
  private spatialHash: SpatialHash
  private accumulator = 0
  private debugGroup?: THREE.Group
  
  // Collision pairs to check
  private broadPhasePairs: Set<string> = new Set()
  private collisionPairs: Map<string, CollisionEvent> = new Map()
  
  // Gravity and forces
  private globalForces: THREE.Vector3[] = []

  private constructor(config: PhysicsConfig = {}) {
    this.config = {
      gravity: config.gravity || new THREE.Vector3(0, -9.81, 0),
      fixedTimeStep: config.fixedTimeStep || 1/60,
      maxSubSteps: config.maxSubSteps || 3,
      broadphaseType: config.broadphaseType || 'spatial',
      enableDebugDraw: config.enableDebugDraw || false
    }
    
    this.spatialHash = new SpatialHash()
    
    if (this.config.enableDebugDraw) {
      this.debugGroup = new THREE.Group()
      this.debugGroup.name = 'PhysicsDebug'
    }
  }

  static initialize(config?: PhysicsConfig): PhysicsManager {
    if (!PhysicsManager.instance) {
      PhysicsManager.instance = new PhysicsManager(config)
    }
    return PhysicsManager.instance
  }

  static getInstance(): PhysicsManager {
    if (!PhysicsManager.instance) {
      throw new Error('PhysicsManager not initialized. Call PhysicsManager.initialize() first.')
    }
    return PhysicsManager.instance
  }

  /**
   * Add a physics body to the simulation
   */
  addBody(gameObject: GameObject, config: Partial<PhysicsBody> = {}): void {
    const collider = gameObject.getComponent<Collider>('collider')
    if (!collider) {
      console.warn('GameObject must have a Collider component for physics')
      return
    }

    const body: PhysicsBody = {
      gameObject,
      collider,
      velocity: config.velocity || new THREE.Vector3(),
      angularVelocity: config.angularVelocity || new THREE.Vector3(),
      mass: config.mass ?? 1,
      isKinematic: config.isKinematic ?? false,
      restitution: config.restitution ?? 0.3,
      friction: config.friction ?? 0.5,
      linearDamping: config.linearDamping ?? 0.01,
      angularDamping: config.angularDamping ?? 0.01
    }

    this.bodies.set(gameObject, body)
  }

  /**
   * Remove a physics body from the simulation
   */
  removeBody(gameObject: GameObject): void {
    this.bodies.delete(gameObject)
  }

  /**
   * Get physics body for a game object
   */
  getBody(gameObject: GameObject): PhysicsBody | undefined {
    return this.bodies.get(gameObject)
  }

  /**
   * Apply force to a body
   */
  applyForce(gameObject: GameObject, force: THREE.Vector3): void {
    const body = this.bodies.get(gameObject)
    if (body && !body.isKinematic && body.mass > 0) {
      // F = ma, so a = F/m
      const acceleration = force.clone().divideScalar(body.mass)
      body.velocity.add(acceleration.multiplyScalar(this.config.fixedTimeStep))
    }
  }

  /**
   * Apply impulse (instant velocity change)
   */
  applyImpulse(gameObject: GameObject, impulse: THREE.Vector3): void {
    const body = this.bodies.get(gameObject)
    if (body && !body.isKinematic) {
      body.velocity.add(impulse.clone().divideScalar(body.mass))
    }
  }

  /**
   * Set velocity directly
   */
  setVelocity(gameObject: GameObject, velocity: THREE.Vector3): void {
    const body = this.bodies.get(gameObject)
    if (body) {
      body.velocity.copy(velocity)
    }
  }

  /**
   * Get velocity
   */
  getVelocity(gameObject: GameObject): THREE.Vector3 | undefined {
    return this.bodies.get(gameObject)?.velocity.clone()
  }

  /**
   * Add global force (like wind)
   */
  addGlobalForce(force: THREE.Vector3): void {
    this.globalForces.push(force)
  }

  /**
   * Remove global force
   */
  removeGlobalForce(force: THREE.Vector3): void {
    const index = this.globalForces.indexOf(force)
    if (index !== -1) {
      this.globalForces.splice(index, 1)
    }
  }

  /**
   * Raycast into the physics world
   */
  raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance = Infinity, layerMask = 0xFFFFFFFF): RaycastHit | null {
    const ray = new THREE.Ray(origin, direction.normalize())
    let closestHit: RaycastHit | null = null
    let closestDistance = maxDistance

    this.bodies.forEach(body => {
      // Check layer mask
      if ((body.collider.layer & layerMask) === 0) return

      const hit = this.raycastBody(ray, body, maxDistance)
      if (hit && hit.distance < closestDistance) {
        closestDistance = hit.distance
        closestHit = hit
      }
    })

    return closestHit
  }

  /**
   * Raycast against a single body
   */
  private raycastBody(ray: THREE.Ray, body: PhysicsBody, maxDistance: number): RaycastHit | null {
    const pos = body.gameObject.position
    
    switch (body.collider.type) {
      case ColliderType.SPHERE: {
        const sphere = new THREE.Sphere(pos, body.collider.radius)
        const intersectPoint = new THREE.Vector3()
        
        if (ray.intersectSphere(sphere, intersectPoint)) {
          const distance = ray.origin.distanceTo(intersectPoint)
          if (distance <= maxDistance) {
            const normal = intersectPoint.clone().sub(pos).normalize()
            return {
              object: body.gameObject,
              point: intersectPoint,
              normal,
              distance
            }
          }
        }
        break
      }
      
      case ColliderType.BOX: {
        // Simplified box raycast (axis-aligned)
        const halfSize = body.collider.size.clone().multiplyScalar(0.5)
        const min = pos.clone().sub(halfSize)
        const max = pos.clone().add(halfSize)
        const box = new THREE.Box3(min, max)
        const intersectPoint = new THREE.Vector3()
        
        if (ray.intersectBox(box, intersectPoint)) {
          const distance = ray.origin.distanceTo(intersectPoint)
          if (distance <= maxDistance) {
            // Approximate normal (not accurate for rotated boxes)
            const normal = intersectPoint.clone().sub(pos).normalize()
            return {
              object: body.gameObject,
              point: intersectPoint,
              normal,
              distance
            }
          }
        }
        break
      }
    }
    
    return null
  }

  /**
   * Main physics update
   */
  update(deltaTime: number): void {
    // Fixed timestep with accumulator
    this.accumulator += deltaTime
    
    let substeps = 0
    while (this.accumulator >= this.config.fixedTimeStep && substeps < this.config.maxSubSteps) {
      this.fixedUpdate(this.config.fixedTimeStep)
      this.accumulator -= this.config.fixedTimeStep
      substeps++
    }
    
    // Update debug visualization
    if (this.config.enableDebugDraw && this.debugGroup) {
      this.updateDebugDraw()
    }
  }

  /**
   * Fixed timestep physics update
   */
  private fixedUpdate(dt: number): void {
    // Update spatial hash
    this.spatialHash.clear()
    this.bodies.forEach(body => {
      if (!body.collider.enabled) return
      this.spatialHash.insert(body)
    })
    
    // Broad phase
    this.broadPhase()
    
    // Integrate velocities
    this.integrateVelocities(dt)
    
    // Narrow phase collision detection and resolution
    this.narrowPhase()
    
    // Update positions
    this.integratePositions(dt)
    
    // Clear forces
    this.clearForces()
  }

  /**
   * Broad phase collision detection
   */
  private broadPhase(): void {
    this.broadPhasePairs.clear()
    
    this.bodies.forEach(bodyA => {
      if (!bodyA.collider.enabled) return
      
      const nearby = this.spatialHash.query(bodyA)
      nearby.forEach(bodyB => {
        if (!bodyB.collider.enabled) return
        
        // Check collision masks
        if ((bodyA.collider.layer & bodyB.collider.collidesWith) === 0 ||
            (bodyB.collider.layer & bodyA.collider.collidesWith) === 0) {
          return
        }
        
        // Create unique pair key
        const idA = bodyA.gameObject.id
        const idB = bodyB.gameObject.id
        const pairKey = idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`
        
        this.broadPhasePairs.add(pairKey)
      })
    })
  }

  /**
   * Integrate velocities (apply forces)
   */
  private integrateVelocities(dt: number): void {
    this.bodies.forEach(body => {
      if (body.isKinematic) return
      
      // Apply gravity
      const gravity = this.config.gravity.clone().multiplyScalar(dt)
      body.velocity.add(gravity)
      
      // Apply global forces
      this.globalForces.forEach(force => {
        const acceleration = force.clone().divideScalar(body.mass).multiplyScalar(dt)
        body.velocity.add(acceleration)
      })
      
      // Apply damping
      body.velocity.multiplyScalar(1 - body.linearDamping)
      body.angularVelocity.multiplyScalar(1 - body.angularDamping)
    })
  }

  /**
   * Narrow phase collision detection
   */
  private narrowPhase(): void {
    const previousPairs = new Map(this.collisionPairs)
    this.collisionPairs.clear()
    
    this.broadPhasePairs.forEach(pairKey => {
      const [idA, idB] = pairKey.split('-')
      const bodyA = this.getBodyById(idA)
      const bodyB = this.getBodyById(idB)
      
      if (!bodyA || !bodyB) return
      
      const collision = this.checkCollision(bodyA, bodyB)
      if (collision) {
        this.collisionPairs.set(pairKey, collision)
        
        // Resolve collision
        if (!bodyA.collider.isTrigger && !bodyB.collider.isTrigger) {
          this.resolveCollision(bodyA, bodyB, collision)
        }
        
        // Fire collision events
        const wasColliding = previousPairs.has(pairKey)
        if (!wasColliding) {
          // Collision enter
          this.fireCollisionEvent('enter', bodyA, bodyB, collision)
        } else {
          // Collision stay
          this.fireCollisionEvent('stay', bodyA, bodyB, collision)
        }
      }
    })
    
    // Check for collision exits
    previousPairs.forEach((collision, pairKey) => {
      if (!this.collisionPairs.has(pairKey)) {
        const [idA, idB] = pairKey.split('-')
        const bodyA = this.getBodyById(idA)
        const bodyB = this.getBodyById(idB)
        
        if (bodyA && bodyB) {
          this.fireCollisionEvent('exit', bodyA, bodyB, collision)
        }
      }
    })
  }

  /**
   * Check collision between two bodies
   */
  private checkCollision(bodyA: PhysicsBody, bodyB: PhysicsBody): CollisionEvent | null {
    const posA = bodyA.gameObject.position
    const posB = bodyB.gameObject.position
    
    // Simple sphere-sphere collision for now
    if (bodyA.collider.type === ColliderType.SPHERE && bodyB.collider.type === ColliderType.SPHERE) {
      const distance = posA.distanceTo(posB)
      const radiusSum = bodyA.collider.radius + bodyB.collider.radius
      
      if (distance < radiusSum) {
        const normal = posB.clone().sub(posA).normalize()
        const depth = radiusSum - distance
        
        return {
          other: bodyB.gameObject,
          otherCollider: bodyB.collider,
          normal,
          depth
        }
      }
    }
    
    // Add more collision types as needed
    
    return null
  }

  /**
   * Resolve collision between two bodies
   */
  private resolveCollision(bodyA: PhysicsBody, bodyB: PhysicsBody, collision: CollisionEvent): void {
    // Skip if both are kinematic or have no mass
    if ((bodyA.isKinematic && bodyB.isKinematic) || 
        (bodyA.mass === 0 && bodyB.mass === 0)) {
      return
    }
    
    // Separate the bodies
    const totalMass = bodyA.mass + bodyB.mass
    const pushA = bodyA.isKinematic ? 0 : (bodyB.mass / totalMass) * collision.depth
    const pushB = bodyB.isKinematic ? 0 : (bodyA.mass / totalMass) * collision.depth
    
    bodyA.gameObject.position.add(collision.normal.clone().multiplyScalar(-pushA))
    bodyB.gameObject.position.add(collision.normal.clone().multiplyScalar(pushB))
    
    // Calculate relative velocity
    const relativeVelocity = bodyB.velocity.clone().sub(bodyA.velocity)
    const velocityAlongNormal = relativeVelocity.dot(collision.normal)
    
    // Don't resolve if velocities are separating
    if (velocityAlongNormal > 0) return
    
    // Calculate restitution (bounciness)
    const restitution = Math.min(bodyA.restitution, bodyB.restitution)
    
    // Calculate impulse scalar
    let impulseScalar = -(1 + restitution) * velocityAlongNormal
    impulseScalar /= (1 / bodyA.mass) + (1 / bodyB.mass)
    
    // Apply impulse
    const impulse = collision.normal.clone().multiplyScalar(impulseScalar)
    
    if (!bodyA.isKinematic && bodyA.mass > 0) {
      bodyA.velocity.sub(impulse.clone().divideScalar(bodyA.mass))
    }
    
    if (!bodyB.isKinematic && bodyB.mass > 0) {
      bodyB.velocity.add(impulse.clone().divideScalar(bodyB.mass))
    }
    
    // Apply friction
    const tangent = relativeVelocity.clone().sub(
      collision.normal.clone().multiplyScalar(velocityAlongNormal)
    ).normalize()
    
    const velocityAlongTangent = relativeVelocity.dot(tangent)
    const friction = Math.sqrt(bodyA.friction * bodyB.friction)
    
    let frictionImpulseScalar = -velocityAlongTangent
    frictionImpulseScalar /= (1 / bodyA.mass) + (1 / bodyB.mass)
    
    // Clamp friction (Coulomb's law)
    frictionImpulseScalar = Math.max(-impulseScalar * friction, 
                                    Math.min(impulseScalar * friction, frictionImpulseScalar))
    
    const frictionImpulse = tangent.multiplyScalar(frictionImpulseScalar)
    
    if (!bodyA.isKinematic && bodyA.mass > 0) {
      bodyA.velocity.sub(frictionImpulse.clone().divideScalar(bodyA.mass))
    }
    
    if (!bodyB.isKinematic && bodyB.mass > 0) {
      bodyB.velocity.add(frictionImpulse.clone().divideScalar(bodyB.mass))
    }
  }

  /**
   * Integrate positions
   */
  private integratePositions(dt: number): void {
    this.bodies.forEach(body => {
      if (body.isKinematic) return
      
      // Update position
      const displacement = body.velocity.clone().multiplyScalar(dt)
      body.gameObject.position.add(displacement)
      
      // Update rotation
      if (body.angularVelocity.lengthSq() > 0) {
        const angle = body.angularVelocity.length() * dt
        const axis = body.angularVelocity.clone().normalize()
        // Apply rotation to the game object's rotation
        const quaternion = new THREE.Quaternion()
        quaternion.setFromAxisAngle(axis, angle)
        body.gameObject.rotation.x += quaternion.x
        body.gameObject.rotation.y += quaternion.y
        body.gameObject.rotation.z += quaternion.z
      }
    })
  }

  /**
   * Clear forces
   */
  private clearForces(): void {
    // Forces are applied as impulses, so nothing to clear
  }

  /**
   * Fire collision event
   */
  private fireCollisionEvent(type: 'enter' | 'stay' | 'exit', bodyA: PhysicsBody, bodyB: PhysicsBody, collision: CollisionEvent): void {
    const eventType = bodyA.collider.isTrigger || bodyB.collider.isTrigger ? 'trigger' : 'collision'
    const eventName = `physics:${eventType}:${type}`
    
    // Fire event for body A
    eventBus.emit(eventName, {
      gameObject: bodyA.gameObject,
      other: bodyB.gameObject,
      collision
    })
    
    // Fire event for body B (with inverted normal)
    const invertedCollision = {
      ...collision,
      other: bodyA.gameObject,
      otherCollider: bodyA.collider,
      normal: collision.normal.clone().negate()
    }
    
    eventBus.emit(eventName, {
      gameObject: bodyB.gameObject,
      other: bodyA.gameObject,
      collision: invertedCollision
    })
  }

  /**
   * Get body by game object ID
   */
  private getBodyById(id: string): PhysicsBody | undefined {
    for (const [gameObject, body] of this.bodies) {
      if (gameObject.id === id) {
        return body
      }
    }
    return undefined
  }

  /**
   * Update debug visualization
   */
  private updateDebugDraw(): void {
    if (!this.debugGroup) return
    
    // Clear previous debug meshes
    while (this.debugGroup.children.length > 0) {
      const child = this.debugGroup.children[0]
      this.debugGroup.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (child.material instanceof THREE.Material) {
          child.material.dispose()
        }
      }
    }
    
    // Draw colliders
    this.bodies.forEach(body => {
      if (!body.collider.enabled) return
      
      const color = body.collider.isTrigger ? 0x00ff00 : 0xff0000
      const material = new THREE.MeshBasicMaterial({ 
        color, 
        wireframe: true,
        transparent: true,
        opacity: 0.3
      })
      
      let mesh: THREE.Mesh | null = null
      
      switch (body.collider.type) {
        case ColliderType.SPHERE:
          mesh = new THREE.Mesh(
            new THREE.SphereGeometry(body.collider.radius),
            material
          )
          break
          
        case ColliderType.BOX:
          mesh = new THREE.Mesh(
            new THREE.BoxGeometry(
              body.collider.size.x,
              body.collider.size.y,
              body.collider.size.z
            ),
            material
          )
          break
          
        case ColliderType.CAPSULE:
          mesh = new THREE.Mesh(
            new THREE.CapsuleGeometry(body.collider.radius, body.collider.height),
            material
          )
          break
      }
      
      if (mesh && this.debugGroup) {
        mesh.position.copy(body.gameObject.position)
        mesh.rotation.copy(body.gameObject.rotation)
        this.debugGroup.add(mesh)
      }
    })
  }

  /**
   * Get debug group for adding to scene
   */
  getDebugGroup(): THREE.Group | undefined {
    return this.debugGroup
  }

  /**
   * Set gravity
   */
  setGravity(gravity: THREE.Vector3): void {
    this.config.gravity.copy(gravity)
  }

  /**
   * Get gravity
   */
  getGravity(): THREE.Vector3 {
    return this.config.gravity.clone()
  }

  /**
   * Clear all physics bodies
   */
  clear(): void {
    this.bodies.clear()
    this.broadPhasePairs.clear()
    this.collisionPairs.clear()
    this.spatialHash.clear()
  }
}