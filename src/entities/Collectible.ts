import * as THREE from 'three'
import { GameObject } from './GameObject'
import { Collider, ColliderType } from '../components'

export class Collectible extends GameObject {
  private collider: Collider
  private value: number
  private rotationSpeed: number
  private floatSpeed: number
  private floatHeight: number
  private baseY: number
  private time: number = 0

  constructor(value = 10, color = 0xffff00) {
    super('Collectible')
    
    // Create collectible mesh (spinning coin/gem)
    const geometry = new THREE.OctahedronGeometry(0.3, 0)
    const material = new THREE.MeshPhongMaterial({ 
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      shininess: 100
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    
    // Add components
    this.collider = this.addComponent('collider', new Collider(ColliderType.SPHERE, 0.5))
    this.collider.isTrigger = true
    
    // Properties
    this.value = value
    this.rotationSpeed = 2
    this.floatSpeed = 2
    this.floatHeight = 0.2
    this.baseY = 0
    
    // Note: Collision is handled by the game's checkCollisions method
    // This allows for simpler collision detection without complex physics
    
    // Add tag
    this.addTag('collectible')
  }

  start(): void {
    super.start()
    this.baseY = this.position.y
  }

  update(deltaTime: number): void {
    super.update(deltaTime)
    
    // Rotate
    this.rotation.y += this.rotationSpeed * deltaTime
    
    // Float up and down
    this.time += deltaTime
    this.position.y = this.baseY + Math.sin(this.time * this.floatSpeed) * this.floatHeight
  }

  collect(_collector: GameObject): void {
    // Visual effect - just scale down quickly
    if (this.mesh instanceof THREE.Mesh) {
      this.setScale(0.1)
      ;(this.mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 1
    }
  }

  getValue(): number {
    return this.value
  }

  clone(): Collectible {
    return new Collectible(this.value)
  }
}