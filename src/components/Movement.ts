import * as THREE from 'three'
import { Component, GameObject } from '../entities/GameObject'

export class Movement implements Component {
  enabled = true
  gameObject!: GameObject
  
  // Movement properties
  speed = 5
  rotationSpeed = 2
  acceleration = 10
  friction = 5
  maxSpeed = 10
  
  // Jump properties
  jumpForce = 15
  gravity = -30
  isGrounded = true
  groundCheckDistance = 0.1
  groundLevel = 1 // Account for capsule geometry (radius + half height)
  
  // Current state
  velocity: THREE.Vector3
  private targetVelocity: THREE.Vector3
  private isJumping = false

  constructor(speed = 5) {
    this.speed = speed
    this.velocity = new THREE.Vector3()
    this.targetVelocity = new THREE.Vector3()
  }

  update(deltaTime: number): void {
    // Apply acceleration towards target velocity
    this.velocity.lerp(this.targetVelocity, this.acceleration * deltaTime)
    
    // Apply friction when no input
    if (this.targetVelocity.lengthSq() < 0.01) {
      this.velocity.multiplyScalar(1 - this.friction * deltaTime)
    }
    
    // Clamp to max speed (horizontal only)
    const horizontalVelocity = new THREE.Vector3(this.velocity.x, 0, this.velocity.z)
    if (horizontalVelocity.length() > this.maxSpeed) {
      horizontalVelocity.normalize().multiplyScalar(this.maxSpeed)
      this.velocity.x = horizontalVelocity.x
      this.velocity.z = horizontalVelocity.z
    }
    
    // Apply gravity
    if (!this.isGrounded) {
      this.velocity.y += this.gravity * deltaTime
    }
    
    // Update position
    this.gameObject.position.x += this.velocity.x * deltaTime
    this.gameObject.position.y += this.velocity.y * deltaTime
    this.gameObject.position.z += this.velocity.z * deltaTime
    
    // HARD CONSTRAINT: Never allow position below ground level
    if (this.gameObject.position.y < this.groundLevel) {
      this.gameObject.position.y = this.groundLevel
      this.velocity.y = Math.max(0, this.velocity.y) // Only allow upward velocity
      this.isGrounded = true
      this.isJumping = false
    }
    
    // Ground check with small threshold
    const groundThreshold = 0.05
    if (this.gameObject.position.y <= this.groundLevel + groundThreshold) {
      this.isGrounded = true
      if (this.velocity.y < 0) { // Stop downward velocity when grounded
        this.velocity.y = 0
        this.isJumping = false
      }
    } else {
      this.isGrounded = false
    }
    
    // Reset target velocity for next frame
    this.targetVelocity.set(0, 0, 0)
  }

  /**
   * Move in a direction (relative to world)
   */
  move(direction: THREE.Vector3): void {
    const moveVector = direction.normalize().multiplyScalar(this.speed)
    this.targetVelocity.x = moveVector.x
    this.targetVelocity.z = moveVector.z
  }

  /**
   * Move relative to current rotation
   */
  moveRelative(forward: number, right: number): void {
    const forwardVector = this.gameObject.getForward().multiplyScalar(forward * this.speed)
    const rightVector = this.gameObject.getRight().multiplyScalar(right * this.speed)
    
    this.targetVelocity.x = forwardVector.x + rightVector.x
    this.targetVelocity.z = forwardVector.z + rightVector.z
  }

  /**
   * Rotate
   */
  rotate(yaw: number, pitch = 0, roll = 0): void {
    this.gameObject.rotation.y += yaw * this.rotationSpeed
    this.gameObject.rotation.x += pitch * this.rotationSpeed
    this.gameObject.rotation.z += roll * this.rotationSpeed
  }

  /**
   * Look at direction
   */
  lookInDirection(direction: THREE.Vector3): void {
    if (direction.lengthSq() > 0.01) {
      const angle = Math.atan2(direction.x, direction.z)
      this.gameObject.rotation.y = angle
    }
  }

  /**
   * Jump
   */
  jump(): void {
    if (this.isGrounded && !this.isJumping) {
      this.velocity.y = this.jumpForce
      this.isGrounded = false
      this.isJumping = true
    }
  }

  /**
   * Apply force
   */
  applyForce(force: THREE.Vector3): void {
    this.velocity.add(force)
  }

  /**
   * Apply impulse (instant force)
   */
  applyImpulse(impulse: THREE.Vector3): void {
    this.velocity.add(impulse)
  }

  /**
   * Stop movement
   */
  stop(): void {
    this.velocity.set(0, 0, 0)
    this.targetVelocity.set(0, 0, 0)
  }

  /**
   * Stop horizontal movement
   */
  stopHorizontal(): void {
    this.velocity.x = 0
    this.velocity.z = 0
    this.targetVelocity.x = 0
    this.targetVelocity.z = 0
  }

  /**
   * Set velocity directly
   */
  setVelocity(x: number, y: number, z: number): void {
    this.velocity.set(x, y, z)
  }

  /**
   * Getters
   */
  getVelocity(): THREE.Vector3 {
    return this.velocity.clone()
  }

  getSpeed(): number {
    return this.velocity.length()
  }

  getHorizontalSpeed(): number {
    return new THREE.Vector3(this.velocity.x, 0, this.velocity.z).length()
  }

  isMoving(): boolean {
    return this.velocity.lengthSq() > 0.01
  }
}