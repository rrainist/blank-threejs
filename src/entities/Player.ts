import * as THREE from 'three'
import { GameObject } from './GameObject'
import { Movement, Health, Collider, ColliderType } from '../components'
import { InputManager } from '../systems/InputManager'
import { TimeManager } from '../systems/TimeManager'
import { PhysicsManager } from '../systems/PhysicsManager'
import { eventBus, GameEvents } from '../utils/EventBus'
import { Enemy } from './Enemy'
import { PLAYER, PHYSICS } from '../constants/GameConstants'

export class Player extends GameObject {
  private movement: Movement
  private health: Health
  private collider: Collider
  private input: InputManager
  private time: TimeManager
  private physics?: PhysicsManager
  private attackDamage = PLAYER.ATTACK_DAMAGE
  private attackRange = PLAYER.ATTACK_RANGE
  private attackCooldown = PLAYER.ATTACK_COOLDOWN
  private lastAttackTime = 0

  constructor() {
    super('Player')
    
    // Create player mesh
    const geometry = new THREE.CapsuleGeometry(PLAYER.CAPSULE_RADIUS, PLAYER.CAPSULE_HEIGHT, 4, 8)
    const material = new THREE.MeshPhongMaterial({ 
      color: PLAYER.COLOR,
      emissive: PLAYER.EMISSIVE_COLOR
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    
    // Add components
    this.movement = this.addComponent('movement', new Movement(PLAYER.MOVE_SPEED))
    this.health = this.addComponent('health', new Health(PLAYER.HEALTH))
    this.collider = this.addComponent('collider', new Collider(ColliderType.CAPSULE, PLAYER.CAPSULE_RADIUS))
    
    // Get system references
    this.input = InputManager.getInstance()
    this.time = TimeManager.getInstance()
    
    // Don't use PhysicsManager for player - Movement component handles physics
    // This prevents double gravity application
    // try {
    //   this.physics = PhysicsManager.getInstance()
    //   // Add physics body
    //   this.physics.addBody(this, {
    //     mass: PHYSICS.DEFAULT_MASS,
    //     restitution: PHYSICS.DEFAULT_RESTITUTION,
    //     friction: PHYSICS.DEFAULT_FRICTION,
    //     linearDamping: PHYSICS.DEFAULT_LINEAR_DAMPING
    //   })
    // } catch (e) {
    //   // Physics manager not initialized yet
    // }
    
    // Setup health callbacks
    this.health.onDamage((event) => {
      // Player took damage
      eventBus.emit(GameEvents.PLAYER_DAMAGE, event)
      
      // Flash red when damaged
      if (this.mesh instanceof THREE.Mesh) {
        const originalColor = (this.mesh.material as THREE.MeshPhongMaterial).color.getHex()
        ;(this.mesh.material as THREE.MeshPhongMaterial).color.setHex(0xff0000)
        
        this.time.setTimeout(() => {
          if (this.mesh instanceof THREE.Mesh) {
            (this.mesh.material as THREE.MeshPhongMaterial).color.setHex(originalColor)
          }
        }, 0.2)
      }
    })
    
    this.health.onDeath(() => {
      // Player died
      eventBus.emit(GameEvents.PLAYER_DEATH)
      this.active = false
    })
    
    // Set initial position (capsule radius + half height)
    this.setPosition(0, PLAYER.CAPSULE_RADIUS + PLAYER.CAPSULE_HEIGHT / 2, 0)
    
    // Add player tag
    this.addTag('player')
    
    // Add attack action
    this.input.addAction('attack', { keys: ['f', 'F'], mouseButtons: [0] })
  }

  update(deltaTime: number): void {
    super.update(deltaTime)
    
    if (!this.active) return
    
    // Get input
    const horizontal = this.input.getAxis('horizontal')
    const vertical = this.input.getAxis('vertical')
    
    // Movement (flipped vertical for correct camera orientation)
    if (horizontal !== 0 || vertical !== 0) {
      this.movement.moveRelative(vertical, horizontal)
    }
    
    // Jump
    if (this.input.isActionJustPressed('jump')) {
      this.movement.jump()
      // Emit jump event for sound
      eventBus.emit('player:jump', { player: this })
    }
    
    // Attack
    if (this.input.isActionJustPressed('attack')) {
      this.attack()
    }
    
    // Look direction based on movement
    const lookX = this.input.getAxis('lookX')
    // const lookY = this.input.getAxis('lookY') // Reserved for future camera look
    
    if (Math.abs(lookX) > 0.1) {
      this.movement.rotate(lookX * deltaTime)
    }
  }

  takeDamage(amount: number, source?: GameObject): void {
    this.health.takeDamage(amount, source)
  }

  heal(amount: number): void {
    this.health.heal(amount)
  }

  getHealth(): number {
    return this.health.getHealth()
  }

  getMaxHealth(): number {
    return this.health.getMaxHealth()
  }

  respawn(position: THREE.Vector3): void {
    this.setPosition(position.x, position.y, position.z)
    this.health.reset()
    this.movement.stop()
    this.active = true
    eventBus.emit(GameEvents.PLAYER_SPAWN)
  }

  attack(): void {
    const currentTime = this.time.getElapsedTime()
    if (currentTime - this.lastAttackTime < this.attackCooldown) return
    
    this.lastAttackTime = currentTime
    
    // Visual feedback - flash green brighter
    if (this.mesh instanceof THREE.Mesh) {
      const material = this.mesh.material as THREE.MeshPhongMaterial
      const originalEmissive = material.emissive.getHex()
      material.emissive.setHex(0x00ff00)
      material.emissiveIntensity = 0.8
      
      this.time.setTimeout(() => {
        material.emissive.setHex(originalEmissive)
        material.emissiveIntensity = 0.1
      }, 0.2)
    }
    
    // Check for enemies in range
    if (!this.entityManager) return
    
    const enemies = this.entityManager.getEntitiesByTag('enemy')
    const playerPos = this.position
    
    enemies.forEach((enemy: GameObject) => {
      if (enemy.active) {
        const distance = playerPos.distanceTo(enemy.position)
        if (distance <= this.attackRange) {
          // Damage the enemy
          const enemyComponent = enemy as Enemy
          if (enemyComponent.takeDamage) {
            enemyComponent.takeDamage(this.attackDamage, this)
          }
          
          // Play attack sound
          eventBus.emit('player:attack', { 
            player: this, 
            target: enemy,
            damage: this.attackDamage
          })
        }
      }
    })
  }

  clone(): Player {
    return new Player()
  }
}