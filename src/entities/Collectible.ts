import * as THREE from 'three'

export class Collectible extends THREE.Mesh {
  value: number
  baseY: number
  time: number = 0
  active: boolean = false
  color: number
  
  // Animation parameters
  rotationSpeed: number = 2
  floatSpeed: number = 2
  floatHeight: number = 0.2
  
  constructor(value = 10, color = 0xffff00) {
    // Create geometry and material
    const geometry = new THREE.OctahedronGeometry(0.3, 0)
    const material = new THREE.MeshPhongMaterial({ 
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      shininess: 100
    })
    
    // Call parent constructor
    super(geometry, material)
    
    // Set properties
    this.value = value
    this.color = color
    this.baseY = 1
    this.castShadow = true
    this.receiveShadow = true
    this.name = 'Collectible'
    
    // Add to collectible group for easy identification
    this.userData.type = 'collectible'
  }
  
  update(deltaTime: number): void {
    // Rotate
    this.rotation.y += this.rotationSpeed * deltaTime
    
    // Float up and down
    this.time += deltaTime
    this.position.y = this.baseY + Math.sin(this.time * this.floatSpeed) * this.floatHeight
  }
  
  setColor(color: number): void {
    if (this.material instanceof THREE.MeshPhongMaterial) {
      this.material.color.setHex(color)
      this.material.emissive.setHex(color)
    }
  }
  
  setValue(value: number): void {
    this.value = value
  }
  
  // For object pooling
  reset(): void {
    this.position.set(0, -1000, 0) // Move off screen
    this.time = 0
    this.visible = true
  }
  
  // Collection effect
  collect(): void {
    // Simple collection effect - scale down and fade
    this.visible = false // Hide immediately
    // In a real game, you'd trigger particles here
  }
}