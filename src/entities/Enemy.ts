import * as THREE from 'three'
import { ENEMY, FIELD } from '../constants/GameConstants'
import { PhysicsSystem, CollisionShape } from '../systems/PhysicsSystem'
import { eventBus } from '../utils/EventBus'

export class Enemy extends THREE.Group {
  // Properties
  health: number
  speed: number
  attackDamage: number
  
  // Random movement
  private targetPoint = new THREE.Vector3()
  private reachedDistance = ENEMY.REACHED_DISTANCE
  
  // Visual
  mesh: THREE.Mesh
  
  // Movement
  private moveDirection = new THREE.Vector3()
  private lastMoveUpdate = 0
  
  constructor() {
    super()
    
    // Initialize properties from constants
    this.health = ENEMY.HEALTH
    this.speed = ENEMY.SPEED
    this.attackDamage = ENEMY.ATTACK_DAMAGE
    
    // Create visual - simple red box
    const geometry = new THREE.BoxGeometry(1, 1.5, 1)
    const material = new THREE.MeshPhongMaterial({ 
      color: ENEMY.COLOR,
      emissive: ENEMY.EMISSIVE_COLOR,
      emissiveIntensity: 0.2
    })
    
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.add(this.mesh)
    
    // Set position
    this.position.y = 0.75 // Half height
    
    // Set user data
    this.userData.type = 'enemy'
    this.name = 'Enemy'
    
    // Initialize physics
    this.initPhysics()
    
    // Set initial random target
    this.generateRandomTarget()
  }
  
  private initPhysics(): void {
    const physics = PhysicsSystem.getInstance()
    physics.createRigidBody(this, {
      mass: 1,
      restitution: 0,
      friction: 0.5,
      shape: CollisionShape.BOX,
      halfExtents: new THREE.Vector3(0.5, 0.75, 0.5),
      collisionGroup: PhysicsSystem.COLLISION_GROUP.ENEMY,
      collisionMask: PhysicsSystem.COLLISION_GROUP.PLAYER | 
                     PhysicsSystem.COLLISION_GROUP.STATIC |
                     PhysicsSystem.COLLISION_GROUP.ENEMY
    })
  }
  
  private generateRandomTarget(): void {
    // Generate random point within field boundaries (with some margin from walls)
    const margin = 3
    this.targetPoint.set(
      (Math.random() - 0.5) * (FIELD.WIDTH - margin * 2),
      this.position.y, // Same height
      (Math.random() - 0.5) * (FIELD.HEIGHT - margin * 2)
    )
    
  }
  
  update(deltaTime: number): void {
    if (this.health <= 0) return
    
    const currentTime = Date.now() / 1000
    
    // Update movement every interval
    if (currentTime - this.lastMoveUpdate > ENEMY.MOVE_UPDATE_INTERVAL) {
      this.lastMoveUpdate = currentTime
      
      // Check if we've reached our target point
      const distance = this.position.distanceTo(this.targetPoint)
      
      if (distance <= this.reachedDistance) {
        // Reached target - generate new one
        this.generateRandomTarget()
      }
      
      // Calculate direction to current target point
      this.moveDirection.subVectors(this.targetPoint, this.position).normalize()
      
      // Face the target point
      this.lookAt(this.targetPoint)
    }
    
    // Apply movement
    if (this.moveDirection.length() > 0) {
      const physics = PhysicsSystem.getInstance()
      const rigidBody = physics.getRigidBody(this)
      if (rigidBody) {
        const force = this.moveDirection.clone().multiplyScalar(ENEMY.FORCE_MULTIPLIER)
        physics.applyForce(rigidBody, force)
        
        // Limit velocity
        const velocity = rigidBody.body.velocity
        const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z)
        if (horizontalSpeed > this.speed) {
          const scale = this.speed / horizontalSpeed
          velocity.x *= scale
          velocity.z *= scale
        }
      }
    }
  }
  
  
  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount)
    
    // Visual feedback - flash white
    if (this.mesh.material instanceof THREE.MeshPhongMaterial) {
      const material = this.mesh.material
      const originalColor = material.color.getHex()
      material.color.setHex(0xffffff)
      
      setTimeout(() => {
        material.color.setHex(originalColor)
      }, ENEMY.DAMAGE_FLASH_DURATION)
    }
  }
  
  dispose(): void {
    // Remove physics body
    const physics = PhysicsSystem.getInstance()
    const rigidBody = physics.getRigidBody(this)
    if (rigidBody) {
      physics.removeRigidBody(rigidBody)
    }
    
    // Dispose geometry and material
    if (this.mesh) {
      this.mesh.geometry.dispose()
      if (this.mesh.material instanceof THREE.Material) {
        this.mesh.material.dispose()
      }
    }
  }
}