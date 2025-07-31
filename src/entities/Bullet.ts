import * as THREE from 'three'

export class Bullet extends THREE.Group {
  // Properties
  speed: number = 15
  damage: number = 20
  lifetime: number = 3
  age: number = 0
  direction: THREE.Vector3
  
  // Visual
  mesh: THREE.Mesh
  
  // State
  active: boolean = true
  
  constructor() {
    super()
    
    // Create visual representation - small yellow sphere
    const geometry = new THREE.SphereGeometry(0.2, 8, 6)
    const material = new THREE.MeshPhongMaterial({ 
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.5
    })
    
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = false
    this.add(this.mesh)
    
    // Initialize direction
    this.direction = new THREE.Vector3(0, 0, -1)
    
    // Set user data
    this.userData.type = 'bullet'
    this.name = 'Bullet'
  }
  
  /**
   * Set the bullet's direction and initial position
   */
  fire(origin: THREE.Vector3, direction: THREE.Vector3): void {
    this.position.copy(origin)
    this.position.y = 1 // Keep bullets at consistent height
    this.direction.copy(direction).normalize()
    this.age = 0
    this.active = true
    this.visible = true
    
    // Point the bullet in the direction of travel
    this.lookAt(this.position.clone().add(this.direction))
  }
  
  /**
   * Update bullet position and check lifetime
   */
  update(deltaTime: number): void {
    if (!this.active) return
    
    // Move bullet
    const movement = this.direction.clone().multiplyScalar(this.speed * deltaTime)
    this.position.add(movement)
    
    // Update age
    this.age += deltaTime
    
    // Check lifetime
    if (this.age >= this.lifetime) {
      this.deactivate()
    }
  }
  
  /**
   * Deactivate the bullet (for pooling)
   */
  deactivate(): void {
    this.active = false
    this.visible = false
  }
  
  /**
   * Reset bullet for reuse
   */
  reset(): void {
    this.position.set(0, 0, 0)
    this.direction.set(0, 0, -1)
    this.age = 0
    this.active = true
    this.visible = true
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.mesh.geometry.dispose()
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose()
    }
  }
}