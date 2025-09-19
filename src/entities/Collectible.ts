import * as THREE from 'three'

const DEFAULTS = {
  VALUE: 5,
  COLOR: 0xffff00
} as const

/**
 * Lightweight collectible stub kept for compatibility with shared utilities.
 */
export class Collectible extends THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> {
  public value: number
  public baseY = 0
  public active = true

  constructor(value: number = DEFAULTS.VALUE, color: number = DEFAULTS.COLOR) {
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8)
    const material = new THREE.MeshStandardMaterial({ color })
    super(geometry, material)

    this.value = value
    this.castShadow = true
    this.receiveShadow = true
    this.name = 'Collectible'
  }

  setValue(value: number): void {
    this.value = value
  }

  setColor(color: number): void {
    this.material.color.setHex(color)
  }

  update(_deltaTime: number): void {
    // No animation in the turn-based prototype, but keep method for compatibility
  }
}
