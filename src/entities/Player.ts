import * as THREE from 'three'
import { GameObject } from './GameObject'
import { Movement, Health, Collider, ColliderType } from '../components'
import { InputManager } from '../systems/InputManager'
import { TimeManager } from '../systems/TimeManager'
import { eventBus, GameEvents } from '../utils/EventBus'

export class Player extends GameObject {
  private movement: Movement
  private health: Health
  private collider: Collider
  private input: InputManager
  private time: TimeManager

  constructor() {
    super('Player')
    
    // Create player mesh
    const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8)
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x00ff00,
      emissive: 0x002200
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    
    // Add components
    this.movement = this.addComponent('movement', new Movement(5))
    this.health = this.addComponent('health', new Health(100))
    this.collider = this.addComponent('collider', new Collider(ColliderType.CAPSULE, 0.5))
    
    // Get system references
    this.input = InputManager.getInstance()
    this.time = TimeManager.getInstance()
    
    // Setup health callbacks
    this.health.onDamage((event) => {
      console.log(`Player took ${event.damage} damage! Health: ${event.current}/${event.max}`)
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
      console.log('Player died!')
      eventBus.emit(GameEvents.PLAYER_DEATH)
      this.active = false
    })
    
    // Set initial position
    this.setPosition(0, 1, 0)
    
    // Add player tag
    this.addTag('player')
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
    }
    
    // Look direction based on movement
    const lookX = this.input.getAxis('lookX')
    const lookY = this.input.getAxis('lookY')
    
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

  clone(): Player {
    return new Player()
  }
}