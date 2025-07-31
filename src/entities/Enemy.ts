import * as THREE from 'three'

export enum EnemyType {
  PATROL = 'patrol',
  CHASER = 'chaser',
  SHOOTER = 'shooter'
}

export class Enemy extends THREE.Group {
  // Properties
  enemyType: EnemyType
  health: number
  maxHealth: number
  speed: number
  attackDamage: number
  attackRange: number = 2
  attackCooldown: number
  lastAttackTime: number = 0
  detectionRange: number = 10
  
  // Target
  target?: THREE.Object3D
  
  // Visual
  mesh: THREE.Mesh
  originalColor: number
  
  // Patrol behavior
  patrolPoints: THREE.Vector3[] = []
  currentPatrolIndex: number = 0
  patrolWaitTime: number = 2
  waitTimer: number = 0
  
  constructor(type: EnemyType = EnemyType.PATROL, color = 0xff0000) {
    super()
    
    this.enemyType = type
    this.originalColor = color
    
    // Set properties based on type
    switch (type) {
      case EnemyType.CHASER:
        this.speed = 3
        this.health = 30
        this.attackDamage = 15
        break
      case EnemyType.SHOOTER:
        this.speed = 2
        this.health = 50
        this.attackDamage = 5
        this.attackRange = 8
        break
      default: // PATROL
        this.speed = 2
        this.health = 30
        this.attackDamage = 10
        break
    }
    
    this.maxHealth = this.health
    this.attackCooldown = 1
    
    // Create visual based on type
    const geometry = this.createGeometryForType(type)
    const material = new THREE.MeshPhongMaterial({ 
      color,
      emissive: color,
      emissiveIntensity: 0.2
    })
    
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.add(this.mesh)
    
    // Set position
    this.position.y = 1
    
    // Set user data
    this.userData.type = 'enemy'
    this.userData.enemyType = type
    this.name = 'Enemy'
  }
  
  private createGeometryForType(type: EnemyType): THREE.BufferGeometry {
    switch (type) {
      case EnemyType.PATROL:
        return new THREE.BoxGeometry(1, 1, 1)
      case EnemyType.CHASER:
        return new THREE.ConeGeometry(0.5, 1.5, 8)
      case EnemyType.SHOOTER:
        return new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8)
      default:
        return new THREE.SphereGeometry(0.5)
    }
  }
  
  setTarget(target: THREE.Object3D): void {
    this.target = target
  }
  
  setPatrolPoints(points: THREE.Vector3[]): void {
    this.patrolPoints = points
    this.currentPatrolIndex = 0
  }
  
  update(deltaTime: number): void {
    if (this.health <= 0) return
    
    // Update behavior based on type
    switch (this.enemyType) {
      case EnemyType.PATROL:
        this.updatePatrol(deltaTime)
        break
      case EnemyType.CHASER:
        this.updateChaser(deltaTime)
        break
      case EnemyType.SHOOTER:
        this.updateShooter(deltaTime)
        break
    }
    
    // Check if can attack
    if (this.target) {
      const distance = this.position.distanceTo(this.target.position)
      if (distance <= this.attackRange) {
        this.tryAttack()
      }
    }
  }
  
  private updatePatrol(deltaTime: number): void {
    if (this.patrolPoints.length === 0) return
    
    // Check if should chase target
    if (this.target) {
      const distance = this.position.distanceTo(this.target.position)
      if (distance <= this.detectionRange) {
        this.moveTowards(this.target.position, deltaTime)
        return
      }
    }
    
    // Continue patrol
    const targetPoint = this.patrolPoints[this.currentPatrolIndex]
    const distance = this.position.distanceTo(targetPoint)
    
    if (distance > 0.5) {
      this.moveTowards(targetPoint, deltaTime)
    } else {
      // Wait at patrol point
      this.waitTimer += deltaTime
      if (this.waitTimer >= this.patrolWaitTime) {
        this.waitTimer = 0
        this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length
      }
    }
  }
  
  private updateChaser(deltaTime: number): void {
    if (!this.target) return
    
    const distance = this.position.distanceTo(this.target.position)
    if (distance <= this.detectionRange && distance > this.attackRange) {
      this.moveTowards(this.target.position, deltaTime)
    }
  }
  
  private updateShooter(deltaTime: number): void {
    if (!this.target) return
    
    const distance = this.position.distanceTo(this.target.position)
    if (distance <= this.detectionRange) {
      // Face target
      this.lookAt(this.target.position)
      
      // Move closer if too far
      if (distance > this.detectionRange * 0.7) {
        this.moveTowards(this.target.position, deltaTime)
      } else if (distance < this.attackRange * 2) {
        // Back away if too close
        const direction = this.position.clone().sub(this.target.position).normalize()
        this.position.add(direction.multiplyScalar(this.speed * deltaTime))
      }
    }
  }
  
  private moveTowards(target: THREE.Vector3, deltaTime: number): void {
    const direction = target.clone().sub(this.position).normalize()
    direction.y = 0 // Keep on ground
    
    this.position.add(direction.multiplyScalar(this.speed * deltaTime))
    this.lookAt(new THREE.Vector3(target.x, this.position.y, target.z))
  }
  
  private tryAttack(): void {
    const now = Date.now() / 1000
    if (now - this.lastAttackTime < this.attackCooldown) return
    
    this.lastAttackTime = now
    
    // Visual feedback
    if (this.mesh.material instanceof THREE.MeshPhongMaterial) {
      const material = this.mesh.material
      material.emissive.setHex(0xffff00)
      material.emissiveIntensity = 0.6
      
      setTimeout(() => {
        material.emissive.setHex(this.originalColor)
        material.emissiveIntensity = 0.2
      }, 200)
    }
    
    // Attack will be handled by game logic
  }
  
  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount)
    
    // Visual feedback
    if (this.mesh.material instanceof THREE.MeshPhongMaterial) {
      const material = this.mesh.material
      material.emissive.setHex(0xffffff)
      material.emissiveIntensity = 0.8
      
      setTimeout(() => {
        material.emissive.setHex(this.originalColor)
        material.emissiveIntensity = 0.2
      }, 100)
    }
    
    if (this.health <= 0) {
      this.onDeath()
    }
  }
  
  private onDeath(): void {
    // Hide mesh
    this.visible = false
    // Game will handle removal
  }
  
  getHealth(): number {
    return this.health
  }
}