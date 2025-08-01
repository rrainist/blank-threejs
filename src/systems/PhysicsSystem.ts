import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { logger } from '../utils/Logger'

export enum CollisionShape {
  SPHERE = 'sphere',
  BOX = 'box',
  CAPSULE = 'capsule'
}

export interface RigidBody {
  object: THREE.Object3D
  body: CANNON.Body
  shape: CollisionShape
  offset?: THREE.Vector3
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
  
  // Cannon world
  private world: CANNON.World
  
  // Body tracking
  private bodies: Map<THREE.Object3D, RigidBody> = new Map()
  private cannonToRigidBody: Map<CANNON.Body, RigidBody> = new Map()
  private collisionCallbacks: Map<RigidBody, CollisionCallback[]> = new Map()
  
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
    // Initialize Cannon world
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -30, 0) // Stronger gravity for better game feel
    })
    
    // Performance settings
    this.world.defaultContactMaterial.friction = 0.4
    this.world.defaultContactMaterial.restitution = 0.3
    this.world.broadphase = new CANNON.SAPBroadphase(this.world)
    ;(this.world.solver as any).iterations = 10
    
    logger.info('PhysicsSystem initialized with Cannon-es')
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
      shape?: CollisionShape
      radius?: number
      halfExtents?: THREE.Vector3
      height?: number
    }> = {}
  ): RigidBody {
    // Create appropriate Cannon shape
    let cannonShape: CANNON.Shape
    let shape = options.shape || CollisionShape.BOX
    
    if (shape === CollisionShape.SPHERE || (object instanceof THREE.Mesh && object.geometry?.type === 'SphereGeometry')) {
      const radius = options.radius || 1
      cannonShape = new CANNON.Sphere(radius)
      shape = CollisionShape.SPHERE
    } else if (shape === CollisionShape.CAPSULE) {
      // Cannon doesn't have capsule, approximate with box
      const radius = options.radius || 0.5
      const height = options.height || 1
      cannonShape = new CANNON.Box(new CANNON.Vec3(radius, (height + 2 * radius) / 2, radius))
      shape = CollisionShape.CAPSULE
    } else {
      // Default to box
      let halfExtents = options.halfExtents
      if (!halfExtents && object instanceof THREE.Mesh && object.geometry) {
        // Auto-detect from geometry
        const geometry = object.geometry
        if (geometry.type === 'BoxGeometry') {
          const box = geometry as THREE.BoxGeometry
          const params = box.parameters
          halfExtents = new THREE.Vector3(
            params.width / 2,
            params.height / 2,
            params.depth / 2
          ).multiply(object.scale)
        }
      }
      halfExtents = halfExtents || new THREE.Vector3(0.5, 0.5, 0.5)
      cannonShape = new CANNON.Box(new CANNON.Vec3(halfExtents.x, halfExtents.y, halfExtents.z))
      shape = CollisionShape.BOX
    }
    
    // Create Cannon body
    const body = new CANNON.Body({
      mass: options.isStatic ? 0 : (options.mass ?? 1),
      shape: cannonShape,
      position: new CANNON.Vec3(object.position.x, object.position.y, object.position.z),
      fixedRotation: shape === CollisionShape.CAPSULE // Prevent capsule from rotating
    })
    
    // Set properties
    body.material = new CANNON.Material({
      friction: options.friction ?? 0.4,
      restitution: options.restitution ?? 0.3
    })
    
    // Set collision filtering
    body.collisionFilterGroup = options.collisionGroup ?? PhysicsSystem.COLLISION_GROUP.DEFAULT
    body.collisionFilterMask = options.collisionMask ?? -1
    
    // Set initial velocity
    if (options.velocity) {
      body.velocity.set(options.velocity.x, options.velocity.y, options.velocity.z)
    }
    
    // Add to world
    this.world.addBody(body)
    
    // Create rigid body wrapper
    const rigidBody: RigidBody = {
      object,
      body,
      shape
    }
    
    // Store mappings
    this.bodies.set(object, rigidBody)
    this.cannonToRigidBody.set(body, rigidBody)
    
    // Setup collision events
    body.addEventListener('collide', (event: any) => {
      const otherBody = event.body as CANNON.Body
      const otherRigidBody = this.cannonToRigidBody.get(otherBody)
      if (otherRigidBody) {
        const callbacks = this.collisionCallbacks.get(rigidBody) || []
        callbacks.forEach(callback => {
          const contact = event.contact as CANNON.ContactEquation
          const normal = new THREE.Vector3(contact.ni.x, contact.ni.y, contact.ni.z)
          const point = new THREE.Vector3(contact.ri.x, contact.ri.y, contact.ri.z)
          point.add(object.position)
          
          callback({
            bodyA: rigidBody,
            bodyB: otherRigidBody,
            normal,
            depth: 0, // Cannon doesn't provide penetration depth easily
            contactPoint: point
          })
        })
      }
    })
    
    return rigidBody
  }
  
  /**
   * Remove a rigid body from the physics system
   */
  removeRigidBody(rigidBody: RigidBody): void {
    this.world.removeBody(rigidBody.body)
    this.bodies.delete(rigidBody.object)
    this.cannonToRigidBody.delete(rigidBody.body)
    this.collisionCallbacks.delete(rigidBody)
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
    body.body.applyForce(new CANNON.Vec3(force.x, force.y, force.z))
  }
  
  /**
   * Apply impulse to a body (instant velocity change)
   */
  applyImpulse(body: RigidBody, impulse: THREE.Vector3): void {
    body.body.applyImpulse(new CANNON.Vec3(impulse.x, impulse.y, impulse.z))
  }
  
  /**
   * Set gravity
   */
  setGravity(gravity: THREE.Vector3 | number): void {
    if (typeof gravity === 'number') {
      this.world.gravity.set(0, -gravity, 0)
    } else {
      this.world.gravity.set(gravity.x, gravity.y, gravity.z)
    }
  }
  
  /**
   * Update physics simulation
   */
  update(deltaTime: number): void {
    // Step the physics world
    this.world.step(1/60, deltaTime, 3)
    
    // Sync Three.js objects with physics bodies
    this.bodies.forEach((rigidBody) => {
      rigidBody.object.position.copy(rigidBody.body.position as any)
      
      // Don't update rotation for capsules
      if (rigidBody.shape !== CollisionShape.CAPSULE) {
        rigidBody.object.quaternion.copy(rigidBody.body.quaternion as any)
      }
    })
  }
  
  /**
   * Check if a body is grounded (touching ground)
   */
  isGrounded(body: RigidBody, groundCheckDistance = 1.1): boolean {
    // Cast a ray downward to check for ground
    const from = new CANNON.Vec3(
      body.body.position.x,
      body.body.position.y,
      body.body.position.z
    )
    const to = new CANNON.Vec3(
      body.body.position.x,
      body.body.position.y - groundCheckDistance - 2, // Longer ray
      body.body.position.z
    )
    
    const result = new CANNON.RaycastResult()
    this.world.raycastClosest(from, to, {
      collisionFilterMask: PhysicsSystem.COLLISION_GROUP.STATIC
    }, result)
    
    return result.hasHit && result.distance <= groundCheckDistance
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
    const from = new CANNON.Vec3(origin.x, origin.y, origin.z)
    const to = new CANNON.Vec3(
      origin.x + direction.x * maxDistance,
      origin.y + direction.y * maxDistance,
      origin.z + direction.z * maxDistance
    )
    
    const result = new CANNON.RaycastResult()
    this.world.raycastClosest(from, to, {
      collisionFilterMask: collisionMask
    }, result)
    
    if (result.hasHit && result.body) {
      const rigidBody = this.cannonToRigidBody.get(result.body)
      if (rigidBody) {
        return {
          body: rigidBody,
          point: new THREE.Vector3(
            result.hitPointWorld.x,
            result.hitPointWorld.y,
            result.hitPointWorld.z
          ),
          distance: result.distance
        }
      }
    }
    
    return null
  }
  
  /**
   * Clear all bodies
   */
  clear(): void {
    // Remove all bodies from world
    this.bodies.forEach((rigidBody) => {
      this.world.removeBody(rigidBody.body)
    })
    
    this.bodies.clear()
    this.cannonToRigidBody.clear()
    this.collisionCallbacks.clear()
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
      activeCollisions: this.world.contacts.length
    }
  }
  
  /**
   * Get rigid body for an object
   */
  getRigidBody(object: THREE.Object3D): RigidBody | undefined {
    return this.bodies.get(object)
  }
  
  /**
   * Direct access to Cannon world for advanced usage
   */
  getWorld(): CANNON.World {
    return this.world
  }
}