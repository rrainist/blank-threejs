import * as THREE from 'three'
import { GameObject } from './GameObject'
import { Movement, Health, Collider, ColliderType } from '../components'
import { TimeManager } from '../systems/TimeManager'
import { PhysicsManager } from '../systems/PhysicsManager'
import { eventBus, GameEvents } from '../utils/EventBus'

export enum EnemyType {
  PATROL = 'patrol',
  CHASER = 'chaser',
  SHOOTER = 'shooter'
}

export class Enemy extends GameObject {
  private movement: Movement
  private health: Health
  private collider: Collider
  private time: TimeManager
  private physics?: PhysicsManager
  
  private enemyType: EnemyType
  private target?: GameObject
  private attackDamage = 10
  private attackCooldown = 1 // seconds
  private lastAttackTime = 0
  private detectionRange = 10
  private attackRange = 2
  
  // Patrol behavior
  private patrolPoints: THREE.Vector3[] = []
  private currentPatrolIndex = 0
  private patrolWaitTime = 2 // seconds at each point
  private waitTimer = 0
  
  // Visual state
  private originalColor: number
  
  constructor(type: EnemyType = EnemyType.PATROL, color = 0xff0000) {
    super('Enemy')
    
    this.enemyType = type
    this.originalColor = color
    
    // Create enemy mesh
    const geometry = this.createGeometryForType(type)
    const material = new THREE.MeshPhongMaterial({ 
      color,
      emissive: color,
      emissiveIntensity: 0.2
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    
    // Add components
    const speed = type === EnemyType.CHASER ? 3 : 2
    this.movement = this.addComponent('movement', new Movement(speed))
    this.health = this.addComponent('health', new Health(type === EnemyType.SHOOTER ? 50 : 30))
    this.collider = this.addComponent('collider', new Collider(ColliderType.SPHERE, 0.5))
    
    // Get system references
    this.time = TimeManager.getInstance()
    
    try {
      this.physics = PhysicsManager.getInstance()
      // Add physics body
      this.physics.addBody(this, {
        mass: 2,
        restitution: 0.3,
        friction: 0.4,
        linearDamping: 0.2
      })
    } catch (e) {
      // Physics manager not initialized yet
    }
    
    // Setup health callbacks
    this.health.onDamage((event) => {
      this.flashDamage()
      // Enemy took damage
    })
    
    this.health.onDeath(() => {
      // Enemy died
      this.onDeath()
    })
    
    // Add enemy tag
    this.addTag('enemy')
    this.addTag(type)
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
  
  setTarget(target: GameObject): void {
    this.target = target
  }
  
  setPatrolPoints(points: THREE.Vector3[]): void {
    this.patrolPoints = points
    if (points.length > 0) {
      this.currentPatrolIndex = 0
    }
  }
  
  update(deltaTime: number): void {
    super.update(deltaTime)
    
    if (!this.active) return
    
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
    if (this.target && this.target.active) {
      const distance = this.position.distanceTo(this.target.position)
      if (distance <= this.attackRange) {
        this.tryAttack()
      }
    }
  }
  
  private updatePatrol(_deltaTime: number): void {
    if (this.patrolPoints.length === 0) return
    
    // Check if should chase target instead
    if (this.target && this.target.active) {
      const distance = this.position.distanceTo(this.target.position)
      if (distance <= this.detectionRange) {
        this.chaseTarget()
        return
      }
    }
    
    // Continue patrol
    const targetPoint = this.patrolPoints[this.currentPatrolIndex]
    const distance = this.position.distanceTo(targetPoint)
    
    if (distance > 0.5) {
      // Move towards patrol point
      const direction = targetPoint.clone().sub(this.position).normalize()
      this.movement.move(direction)
      this.movement.lookInDirection(direction)
    } else {
      // Wait at patrol point
      this.waitTimer += _deltaTime
      if (this.waitTimer >= this.patrolWaitTime) {
        this.waitTimer = 0
        this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length
      }
    }
  }
  
  private updateChaser(_deltaTime: number): void {
    if (!this.target || !this.target.active) return
    
    const distance = this.position.distanceTo(this.target.position)
    if (distance <= this.detectionRange && distance > this.attackRange) {
      this.chaseTarget()
    }
  }
  
  private updateShooter(_deltaTime: number): void {
    if (!this.target || !this.target.active) return
    
    const distance = this.position.distanceTo(this.target.position)
    if (distance <= this.detectionRange) {
      // Face target
      const direction = this.target.position.clone().sub(this.position).normalize()
      this.movement.lookInDirection(direction)
      
      // Move closer if too far, back away if too close
      if (distance > this.detectionRange * 0.7) {
        this.movement.move(direction)
      } else if (distance < this.attackRange * 2) {
        this.movement.move(direction.negate())
      }
    }
  }
  
  private chaseTarget(): void {
    if (!this.target || !this.target.active) return
    
    const direction = this.target.position.clone().sub(this.position).normalize()
    this.movement.move(direction)
    this.movement.lookInDirection(direction)
  }
  
  private tryAttack(): void {
    const currentTime = this.time.getElapsedTime()
    if (currentTime - this.lastAttackTime < this.attackCooldown) return
    
    this.lastAttackTime = currentTime
    
    if (this.enemyType === EnemyType.SHOOTER) {
      this.shootProjectile()
    } else {
      // Melee attack
      if (this.target) {
        eventBus.emit(GameEvents.ENEMY_ATTACK, {
          enemy: this,
          target: this.target,
          damage: this.attackDamage
        })
        
        // Apply damage if target has health
        const targetHealth = this.target.getComponent<Health>('health')
        if (targetHealth) {
          targetHealth.takeDamage(this.attackDamage, this)
        }
      }
    }
    
    // Visual feedback
    this.flashAttack()
  }
  
  private shootProjectile(): void {
    if (!this.target) return
    
    // Create projectile
    const projectile = new Projectile(this, this.target.position.clone())
    
    // Position at enemy
    projectile.setPosition(
      this.position.x,
      this.position.y + 0.5,
      this.position.z
    )
    
    // Add to scene through entity manager
    if (this.entityManager) {
      this.entityManager.addEntity(projectile)
    }
    
    eventBus.emit(GameEvents.ENEMY_SHOOT, {
      enemy: this,
      target: this.target,
      projectile
    })
  }
  
  private flashDamage(): void {
    if (this.mesh instanceof THREE.Mesh) {
      const material = this.mesh.material as THREE.MeshPhongMaterial
      material.emissive.setHex(0xffffff)
      material.emissiveIntensity = 0.8
      
      this.time.setTimeout(() => {
        material.emissive.setHex(this.originalColor)
        material.emissiveIntensity = 0.2
      }, 0.1)
    }
  }
  
  private flashAttack(): void {
    if (this.mesh instanceof THREE.Mesh) {
      const material = this.mesh.material as THREE.MeshPhongMaterial
      material.emissive.setHex(0xffff00)
      material.emissiveIntensity = 0.6
      
      this.time.setTimeout(() => {
        material.emissive.setHex(this.originalColor)
        material.emissiveIntensity = 0.2
      }, 0.2)
    }
  }
  
  private onDeath(): void {
    // Death animation
    if (this.mesh) {
      const scale = this.mesh.scale.x
      const steps = 10
      let currentStep = 0
      
      const shrink = () => {
        currentStep++
        const newScale = scale * (1 - currentStep / steps)
        this.setScale(newScale)
        
        if (currentStep < steps) {
          this.time.setTimeout(shrink, 0.05)
        } else {
          this.destroy()
        }
      }
      
      shrink()
    }
    
    // Drop loot
    this.dropLoot()
    
    eventBus.emit(GameEvents.ENEMY_DEATH, {
      enemy: this,
      position: this.position.clone()
    })
  }
  
  private dropLoot(): void {
    // Random chance to drop health or points
    if (Math.random() < 0.3) {
      const loot = new Collectible(25, 0x00ff00) // Green health pickup
      loot.setPosition(this.position.x, this.position.y, this.position.z)
      
      if (this.entityManager) {
        this.entityManager.addEntity(loot)
      }
    }
  }
  
  takeDamage(amount: number, source?: GameObject): void {
    this.health.takeDamage(amount, source)
  }
  
  getHealth(): number {
    return this.health.getHealth()
  }
  
  clone(): Enemy {
    const enemy = new Enemy(this.enemyType, this.originalColor)
    enemy.setPosition(this.position.x, this.position.y, this.position.z)
    if (this.target) {
      enemy.setTarget(this.target)
    }
    if (this.patrolPoints.length > 0) {
      enemy.setPatrolPoints([...this.patrolPoints])
    }
    return enemy
  }
}

// Projectile class for shooter enemies
class Projectile extends GameObject {
  private velocity: THREE.Vector3
  private damage = 5
  private speed = 10
  private lifetime = 3
  private age = 0
  private owner: GameObject
  
  constructor(owner: GameObject, targetPosition: THREE.Vector3) {
    super('Projectile')
    
    this.owner = owner
    
    // Create projectile mesh
    const geometry = new THREE.SphereGeometry(0.1)
    const material = new THREE.MeshPhongMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.5
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.castShadow = true
    
    // Calculate velocity towards target
    const direction = targetPosition.sub(owner.position).normalize()
    this.velocity = direction.multiplyScalar(this.speed)
    
    // Add tag
    this.addTag('projectile')
  }
  
  update(deltaTime: number): void {
    super.update(deltaTime)
    
    // Move projectile
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime))
    
    // Check lifetime
    this.age += deltaTime
    if (this.age >= this.lifetime) {
      this.destroy()
      return
    }
    
    // Check collision with player
    if (this.entityManager) {
      const players = this.entityManager.getEntitiesByTag('player')
      
      for (const player of players) {
        if (player.active && player !== this.owner) {
          const distance = this.position.distanceTo(player.position)
          if (distance < 1) {
            // Hit player
            const health = player.getComponent<Health>('health')
            if (health) {
              health.takeDamage(this.damage, this.owner)
            }
            
            eventBus.emit(GameEvents.PROJECTILE_HIT, {
              projectile: this,
              target: player,
              damage: this.damage
            })
            
            this.destroy()
            break
          }
        }
      }
    }
  }
  
  clone(): Projectile {
    return new Projectile(this.owner, this.velocity.clone().normalize())
  }
}

// Import Collectible for loot drops
import { Collectible } from './Collectible'