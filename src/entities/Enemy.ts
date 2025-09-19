import * as THREE from 'three'

/**
 * Slow roaming critter that can trample fields.
 */
export class Enemy extends THREE.Group {
  public gridX = 0
  public gridY = 0
  public readonly height: number

  private readonly body: THREE.Mesh<THREE.ConeGeometry, THREE.MeshStandardMaterial>

  constructor(tileSize: number) {
    super()

    const radius = tileSize * 0.25
    const height = tileSize * 0.8
    this.height = height

    const geometry = new THREE.ConeGeometry(radius, height, 5)
    const material = new THREE.MeshStandardMaterial({ color: 0xff8a65 })
    this.body = new THREE.Mesh(geometry, material)
    this.body.castShadow = true
    this.body.receiveShadow = true
    this.body.rotation.x = Math.PI
    this.body.position.y = height / 2

    this.add(this.body)

    this.name = 'Roamer'
  }

  setGridPosition(x: number, y: number, worldPosition: THREE.Vector3): void {
    this.gridX = x
    this.gridY = y
    this.position.copy(worldPosition)
  }
}
