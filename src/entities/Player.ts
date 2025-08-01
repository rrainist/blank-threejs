import * as THREE from 'three'
import { InputManager } from '../systems/InputManager'
import { PhysicsSystem, RigidBody } from '../systems/PhysicsSystem'
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
  velocity: THREE.Vector3
  isGrounded: boolean = false
  gravity: number = -30
  groundLevel: number = 1  // Player center position when standing on ground
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
    this.velocity = new THREE.Vector3()
    
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
    this.position.y = PLAYER.CAPSULE_RADIUS + PLAYER.CAPSULE_HEIGHT / 2
    
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
      friction: 0.5,
      useGravity: true,
      collisionGroup: PhysicsSystem.COLLISION_GROUP.PLAYER,
      collisionMask: PhysicsSystem.COLLISION_GROUP.STATIC | 
                     PhysicsSystem.COLLISION_GROUP.ENEMY | 
                     PhysicsSystem.COLLISION_GROUP.PICKUP
    })
    
    // Listen for collisions
    this.physics.onCollision(this.rigidBody, (collision) => {
      // Check if we hit the ground
      if (collision.normal.y > 0.7) { // Mostly vertical normal
        this.isGrounded = true
        this.velocity.y = 0
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
    
    // Debug: log player position when moving
    if (Math.abs(horizontal) > 0.1 || Math.abs(vertical) > 0.1) {
      console.log(`Player Y position: ${this.position.y.toFixed(2)}, Grounded: ${this.isGrounded}`)
    }
    
    // Movement forces
    const moveForce = new THREE.Vector3(
      horizontal * this.speed * 50, // Convert speed to force
      0,
      -vertical * this.speed * 50
    )
    
    // Apply movement force if we have a rigid body
    if (this.rigidBody) {
      // Apply force for movement
      this.physics.applyForce(this.rigidBody, moveForce)
      
      // Limit horizontal velocity
      const vel = this.rigidBody.velocity
      const horizontalVel = new THREE.Vector2(vel.x, vel.z)
      if (horizontalVel.length() > this.speed) {
        horizontalVel.normalize().multiplyScalar(this.speed)
        this.rigidBody.velocity.x = horizontalVel.x
        this.rigidBody.velocity.z = horizontalVel.y
      }
    } else {
      // Fallback to direct movement if no physics
      this.position.x += horizontal * this.speed * deltaTime
      this.position.z += -vertical * this.speed * deltaTime
      
      // Simple gravity
      if (!this.isGrounded) {
        this.velocity.y += this.gravity * deltaTime
      }
      
      // Update position from velocity
      this.position.y += this.velocity.y * deltaTime
      
      // Ground collision
      if (this.position.y <= this.groundLevel) {
        this.position.y = this.groundLevel
        this.velocity.y = 0
        this.isGrounded = true
      } else {
        this.isGrounded = false
      }
    }
    
    // Jump
    if (this.input.isActionJustPressed('jump') && this.isGrounded) {
      if (this.rigidBody) {
        // Apply jump impulse
        this.physics.applyImpulse(this.rigidBody, new THREE.Vector3(0, this.jumpSpeed, 0))
      } else {
        this.velocity.y = this.jumpSpeed
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