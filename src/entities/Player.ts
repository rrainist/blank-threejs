import * as THREE from 'three'
import { InputManager } from '../systems/InputManager'
import { PhysicsSystem, RigidBody, CollisionShape } from '../systems/PhysicsSystem'
import { PLAYER } from '../constants/GameConstants'
import { eventBus } from '../utils/EventBus'

export class Player extends THREE.Group {
  // Properties
  health: number
  maxHealth: number
  speed: number
  jumpSpeed: number
  attackDamage: number
  attackRange: number
  attackCooldown: number
  lastAttackTime: number = 0
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
    this.maxHealth = PLAYER.HEALTH
    this.speed = PLAYER.MOVE_SPEED
    this.jumpSpeed = PLAYER.JUMP_SPEED
    this.attackDamage = PLAYER.ATTACK_DAMAGE
    this.attackRange = PLAYER.ATTACK_RANGE
    this.attackCooldown = PLAYER.ATTACK_COOLDOWN
    
    // Create visual representation
    const geometry = new THREE.CapsuleGeometry(PLAYER.CAPSULE_RADIUS, PLAYER.CAPSULE_HEIGHT, 4, 8)
    const material = new THREE.MeshPhongMaterial({ 
      color: PLAYER.COLOR,
      emissive: PLAYER.EMISSIVE_COLOR,
      emissiveIntensity: 0.1
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.add(this.mesh)
    
    // Set initial position
    // For Three.js CapsuleGeometry: total height = height + 2*radius
    // To place bottom at y=0, center should be at y = (height + 2*radius) / 2
    const totalHeight = PLAYER.CAPSULE_HEIGHT + 2 * PLAYER.CAPSULE_RADIUS
    this.position.y = totalHeight / 2
    
    // Get systems
    this.input = InputManager.getInstance()
    this.input.addAction('attack', { keys: ['f', 'F'], mouseButtons: [0] })
    this.physics = PhysicsSystem.getInstance()
    
    // Set user data for identification
    this.userData.type = 'player'
    this.name = 'Player'
  }
  
  initPhysics(): void {
    // Create rigid body for the player
    this.rigidBody = this.physics.createRigidBody(this, {
      mass: 1,
      restitution: 0,
      friction: 0.1, // Reduced friction for easier movement
      useGravity: true,
      shape: CollisionShape.CAPSULE,
      radius: PLAYER.CAPSULE_RADIUS,
      height: PLAYER.CAPSULE_HEIGHT,
      collisionGroup: PhysicsSystem.COLLISION_GROUP.PLAYER,
      collisionMask: PhysicsSystem.COLLISION_GROUP.STATIC | 
                     PhysicsSystem.COLLISION_GROUP.ENEMY | 
                     PhysicsSystem.COLLISION_GROUP.PICKUP
    })
    
    // Configure physics body
    if (this.rigidBody) {
      // Set linear damping for natural deceleration
      this.rigidBody.body.linearDamping = 0.1      // Disable sleep to ensure player is always responsive
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
    const horizontal = this.input.getAxis('horizontal')
    const vertical = this.input.getAxis('vertical')
    
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
    
    // Jump - debug version
    const jumpPressed = this.input.isActionJustPressed('jump')
    if (jumpPressed) {
      console.log('Jump pressed! isGrounded:', this.isGrounded, 'Y position:', this.rigidBody?.body.position.y, 'Y velocity:', this.rigidBody?.body.velocity.y)
      
      // Debug ground detection when jumping
      if (this.rigidBody) {
        const raycastGrounded = this.physics.isGrounded(this.rigidBody)
        console.log('Raycast grounded check:', raycastGrounded)
      }
    }
    
    if (jumpPressed && this.isGrounded) {
      if (this.rigidBody) {
        console.log('Jumping! Setting velocity to:', this.jumpSpeed, 'from Y velocity:', this.rigidBody.body.velocity.y)
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
    
    // Attack
    if (this.input.isActionJustPressed('attack')) {
      this.attack()
    }
    
    // Rotate based on mouse look
    const lookX = this.input.getAxis('lookX')
    if (Math.abs(lookX) > 0.1) {
      this.rotation.y -= lookX * deltaTime * 2
    }
  }
  
  attack(): void {
    const now = Date.now() / 1000
    if (now - this.lastAttackTime < this.attackCooldown) return
    
    this.lastAttackTime = now
    
    // Visual feedback
    if (this.mesh.material instanceof THREE.MeshPhongMaterial) {
      const material = this.mesh.material
      material.emissive.setHex(0x00ff00)
      material.emissiveIntensity = 0.8
      
      // Reset after delay
      setTimeout(() => {
        material.emissiveIntensity = 0.1
      }, 200)
    }
    
    // Emit attack event
    eventBus.emit('player:attack', {
      player: this,
      target: this, // Will be updated by game to actual target
      damage: this.attackDamage
    })
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
  }
  
  shoot(direction: THREE.Vector3): void {
    const now = Date.now() / 1000
    if (now - this.lastShootTime < this.shootCooldown) return
    
    this.lastShootTime = now
    
    // Emit shoot event with origin and direction
    eventBus.emit('player:shoot', {
      player: this,
      origin: this.position.clone(),
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
  
  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount)
  }
  
  getHealth(): number {
    return this.health
  }
  
  getMaxHealth(): number {
    return this.maxHealth
  }
}