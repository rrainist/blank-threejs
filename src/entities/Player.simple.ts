import * as THREE from 'three'
import { InputManager } from '../systems/InputManager'
import { PLAYER } from '../constants/GameConstants'

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
  
  // Physics
  velocity: THREE.Vector3
  isGrounded: boolean = false
  gravity: number = -30
  groundLevel: number = 1
  
  // Visual
  mesh: THREE.Mesh
  
  // Systems
  input: InputManager
  
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
    
    // Get input manager
    this.input = InputManager.getInstance()
    this.input.addAction('attack', { keys: ['f', 'F'], mouseButtons: [0] })
    
    // Set user data for identification
    this.userData.type = 'player'
    this.name = 'Player'
  }
  
  update(deltaTime: number): void {
    // Get input
    const horizontal = this.input.getAxis('horizontal')
    const vertical = this.input.getAxis('vertical')
    
    // Movement
    const moveX = horizontal * this.speed * deltaTime
    const moveZ = -vertical * this.speed * deltaTime // Negative for correct direction
    
    // Apply movement
    this.position.x += moveX
    this.position.z += moveZ
    
    // Apply gravity
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
    
    // Jump
    if (this.input.isActionJustPressed('jump') && this.isGrounded) {
      this.velocity.y = this.jumpSpeed
      this.isGrounded = false
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
    
    // Attack logic will be handled by game
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