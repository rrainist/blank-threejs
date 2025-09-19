import * as THREE from 'three'

/**
 * Simple avatar that occupies a tile on the valley grid.
 */
export class Player extends THREE.Group {
  public gridX = 0
  public gridY = 0
  public readonly height: number

  private readonly body: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>
  private readonly ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>

  constructor(tileSize: number) {
    super()

    const size = tileSize * 0.6
    this.height = size

    const geometry = new THREE.BoxGeometry(size, size, size)
    const material = new THREE.MeshStandardMaterial({ color: 0x4db8ff })
    this.body = new THREE.Mesh(geometry, material)
    this.body.castShadow = true
    this.body.receiveShadow = true
    this.body.position.y = size / 2

    this.add(this.body)

    const innerRadius = tileSize * 0.35
    const outerRadius = tileSize * 0.45
    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 32)
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
    this.ring = new THREE.Mesh(ringGeometry, ringMaterial)
    this.ring.rotation.x = -Math.PI / 2
    this.ring.position.y = 0.01
    this.add(this.ring)

    this.name = 'Player'
  }

  setGridPosition(x: number, y: number, worldPosition: THREE.Vector3): void {
    this.gridX = x
    this.gridY = y
    this.position.copy(worldPosition)
  }
}
