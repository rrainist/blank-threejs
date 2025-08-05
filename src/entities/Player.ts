import * as THREE from 'three'
import { InputManager } from '../systems/InputManager'
import { PhysicsSystem, RigidBody, CollisionShape } from '../systems/PhysicsSystem'
import { PLAYER } from '../constants/GameConstants'
import { eventBus, GameEvents } from '../utils/EventBus'

export class Player extends THREE.Group {
  // Properties
  health: number
  speed: number
  jumpSpeed: number
  shootCooldown: number = 0.3
  lastShootTime: number = 0
  
  // Physics
  isGrounded: boolean = false
  groundContactCount: number = 0
  rigidBody?: RigidBody
  
  // Visual
  mesh: THREE.Mesh
  
  // Systems
  input: InputManager
  physics: PhysicsSystem
  
  constructor() {
    super()
    
    // Initialize properties
    this.health = PLAYER.HEALTH
    this.speed = PLAYER.MOVE_SPEED
    this.jumpSpeed = PLAYER.JUMP_SPEED
    
    // Create visual representation - HUGE and very visible
    const geometry = new THREE.BoxGeometry(3, 3, 3) // Simple big box instead of capsule
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, // Bright green
      transparent: false
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.add(this.mesh)
    
    // Set initial position - proper height for physics box
    // Ground is at y=0, box center needs to be at y = halfExtents.y = 1.5
    this.position.set(0, 1.5, 0) // Proper physics positioning for 3x3x3 box
    
    console.log('PLAYER CREATED: Position =', this.position.toArray())
    console.log('PLAYER CREATED: Mesh color =', this.mesh.material.color.getHex())
    console.log('PLAYER CREATED: Geometry =', this.mesh.geometry)
    
    // Get systems
    this.input = InputManager.getInstance()
    this.physics = PhysicsSystem.getInstance()
    
    // Set user data for identification
    this.userData.type = 'player'
    this.name = 'Player'
  }
  
  initPhysics(): void {
    // Create rigid body for the player - use box shape to match visual better
    this.rigidBody = this.physics.createRigidBody(this, {
      mass: 1,
      restitution: 0,
      friction: 0.1, // Reduced friction for easier movement
      useGravity: true,
      shape: CollisionShape.BOX,
      halfExtents: new THREE.Vector3(1.5, 1.5, 1.5), // Match 3x3x3 visual box
      collisionGroup: PhysicsSystem.COLLISION_GROUP.PLAYER,
      collisionMask: PhysicsSystem.COLLISION_GROUP.STATIC | 
                     PhysicsSystem.COLLISION_GROUP.ENEMY | 
                     PhysicsSystem.COLLISION_GROUP.PICKUP
    })
    
    // Configure physics body
    if (this.rigidBody) {
      // Set linear damping for natural deceleration
      this.rigidBody.body.linearDamping = 0.1
      
      // Disable sleep to ensure player is always responsive
      this.rigidBody.body.allowSleep = false
    }
    
    // Listen for collisions
    this.physics.onCollision(this.rigidBody, (collision) => {
      // Check for ground collisions (normal pointing up)
      if (collision.normal.y > 0.5) {
        this.groundContactCount++
        console.log('Ground contact detected! Count:', this.groundContactCount)
      }
      
      // Check for wall collisions
      if (Math.abs(collision.normal.y) < 0.3) { // Mostly horizontal
        eventBus.emit('player:wallHit', {
          player: this,
          point: collision.contactPoint,
          normal: collision.normal
        })
      }
    })
  }
  
  update(deltaTime: number): void {
    // Get input
    const movement = this.input.getMovementVector()
    const horizontal = movement.x
    const vertical = movement.y
    
    // Debug input only when there's movement
    if (Math.abs(horizontal) > 0.01 || Math.abs(vertical) > 0.01) {
      console.log('PLAYER MOVING:', horizontal, vertical)
    }
    
    // Check if grounded using both raycast and collision detection
    if (this.rigidBody) {
      const raycastGrounded = this.physics.isGrounded(this.rigidBody)
      const collisionGrounded = this.groundContactCount > 0
      this.isGrounded = raycastGrounded || collisionGrounded
      
      // Note: Raycast and collision detection may differ, that's fine - we use either method
      
      // Reset contact count for next frame
      this.groundContactCount = 0
    }
    
    // Apply movement if we have a rigid body
    if (this.rigidBody) {
      // Force-based movement for proper physics behavior
      if (Math.abs(horizontal) > 0.01 || Math.abs(vertical) > 0.01) {
        // Calculate movement force
        const forceMultiplier = 100 // Adjust this value for responsiveness
        const force = new THREE.Vector3(
          horizontal * forceMultiplier,
          0,
          -vertical * forceMultiplier
        )
        
        // Apply the force
        this.physics.applyForce(this.rigidBody, force)
      }
      
      // Limit maximum horizontal velocity to prevent runaway speed
      const velocity = this.rigidBody.body.velocity
      const maxSpeed = this.speed
      const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z)
      if (horizontalSpeed > maxSpeed) {
        const scale = maxSpeed / horizontalSpeed
        velocity.x *= scale
        velocity.z *= scale
      }
    }
    
    // Jump
    if (this.input.isKeyJustPressed(' ') && this.isGrounded) {
      if (this.rigidBody) {
        // Directly set Y velocity for predictable jump height
        this.rigidBody.body.velocity.y = this.jumpSpeed
      }
      this.isGrounded = false
      
      // Emit jump event
      eventBus.emit('player:jump', {
        player: this,
        timestamp: Date.now()
      })
    }
  }
  
  
  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount)
    
    // Visual feedback
    if (this.mesh.material instanceof THREE.MeshPhongMaterial) {
      const material = this.mesh.material
      const originalColor = material.color.getHex()
      material.color.setHex(0xff0000)
      
      setTimeout(() => {
        material.color.setHex(originalColor)
      }, 200)
    }
    
    // Emit damage event
    eventBus.emit(GameEvents.PLAYER_DAMAGE)
    
    // Check death
    if (this.health <= 0) {
      eventBus.emit(GameEvents.PLAYER_DEATH)
    }
  }
  
  shoot(direction: THREE.Vector3): void {
    const now = Date.now() / 1000
    if (now - this.lastShootTime < this.shootCooldown) return
    
    this.lastShootTime = now
    
    // Emit shoot event with origin at player's center height
    const shootOrigin = this.position.clone()
    shootOrigin.y = 1 // Set to player's approximate center height
    
    eventBus.emit('player:shoot', {
      player: this,
      origin: shootOrigin,
      direction: direction.clone()
    })
    
    // Visual feedback - quick flash
    if (this.mesh.material instanceof THREE.MeshPhongMaterial) {
      const material = this.mesh.material
      material.emissive.setHex(0xffff00)
      material.emissiveIntensity = 0.8
      
      setTimeout(() => {
        material.emissive.setHex(PLAYER.EMISSIVE_COLOR)
        material.emissiveIntensity = 0.1
      }, 100)
    }
  }
  
}