import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Ray } from '@babylonjs/core/Culling/ray'

interface CollectibleInstance {
  mesh: AbstractMesh
  baseY: number
  phase: number
  collected: boolean
}

export class CollectibleManager {
  private collectibles: CollectibleInstance[] = []

  init(scene: Scene, surfaces: AbstractMesh[], obstacles: AbstractMesh[]): void {
    this.clear()

    const material = new StandardMaterial('collectible-material', scene)
    material.emissiveColor = new Color3(1, 0.88, 0.4)
    material.diffuseColor = new Color3(0.98, 0.74, 0.1)
    material.specularColor = new Color3(0.9, 0.9, 0.9)

    const spawnAnchors: Vector3[] = []

    surfaces.forEach((surface) => {
      const info = surface.getBoundingInfo().boundingBox
      spawnAnchors.push(info.centerWorld.clone())
      spawnAnchors.push(info.maximumWorld.clone().add(new Vector3(0, 0, info.extendSizeWorld.z * 0.4)))
      spawnAnchors.push(info.maximumWorld.clone().add(new Vector3(info.extendSizeWorld.x * 0.4, 0, 0)))
    })

    const radius = 25
    const offsets = [
      new Vector3(-radius * 0.4, 0, -radius * 0.4),
      new Vector3(radius * 0.4, 0, radius * -0.2),
      new Vector3(radius * -0.1, 0, radius * 0.35)
    ]

    offsets.forEach((offset) => {
      spawnAnchors.push(offset)
    })

    spawnAnchors.forEach((anchor, index) => {
      const position = this.findSurfacePoint(scene, anchor, surfaces)
      if (!position) return

      if (this.intersectsObstacle(position, obstacles)) {
        const adjusted = this.findNonIntersectingPoint(position, obstacles)
        if (!adjusted) return
        position.copyFrom(adjusted)
      }

      const mesh = MeshBuilder.CreateTorus(`collectible-${index}`, {
        diameter: 1.2,
        thickness: 0.3,
        tessellation: 24
      }, scene)
      mesh.material = material
      mesh.position = position

      const instance: CollectibleInstance = {
        mesh,
        baseY: position.y,
        phase: Math.random() * Math.PI * 2,
        collected: false
      }
      this.collectibles.push(instance)
    })
  }

  update(deltaSeconds: number, playerPosition: Vector3): number {
    let collectedThisFrame = 0

    this.collectibles.forEach((collectible) => {
      if (collectible.collected) return

      collectible.phase += deltaSeconds * 2.2
      const bobOffset = Math.sin(collectible.phase) * 0.25
      collectible.mesh.position.y = collectible.baseY + bobOffset
      collectible.mesh.rotate(Vector3.Up(), deltaSeconds * 1.6)

      if (Vector3.Distance(collectible.mesh.position, playerPosition) <= 1.4) {
        collectible.collected = true
        collectible.mesh.setEnabled(false)
        collectedThisFrame += 1
      }
    })

    return collectedThisFrame
  }

  dispose(): void {
    this.clear()
  }

  private clear(): void {
    this.collectibles.forEach((collectible) => {
      collectible.mesh.dispose()
    })
    this.collectibles = []
  }

  private findSurfacePoint(scene: Scene, anchor: Vector3, surfaces: AbstractMesh[]): Vector3 | null {
    const rayOrigin = new Vector3(anchor.x, anchor.y + 30, anchor.z)
    const ray = new Ray(rayOrigin, new Vector3(0, -1, 0), 60)
    const pick = scene.pickWithRay(ray, (mesh) => surfaces.some((surface) => surface === mesh))
    if (pick?.hit && pick.pickedPoint) {
      return pick.pickedPoint.add(new Vector3(0, 1.2, 0))
    }
    return null
  }

  private intersectsObstacle(point: Vector3, obstacles: AbstractMesh[]): boolean {
    return obstacles.some((obstacle) => {
      const box = obstacle.getBoundingInfo().boundingBox
      const min = box.minimumWorld
      const max = box.maximumWorld
      return point.x >= min.x - 0.8 && point.x <= max.x + 0.8
        && point.y >= min.y - 0.8 && point.y <= max.y + 0.8
        && point.z >= min.z - 0.8 && point.z <= max.z + 0.8
    })
  }

  private findNonIntersectingPoint(point: Vector3, obstacles: AbstractMesh[]): Vector3 | null {
    const candidates = [
      point.add(new Vector3(2, 0, 0)),
      point.add(new Vector3(-2, 0, 0)),
      point.add(new Vector3(0, 0, 2)),
      point.add(new Vector3(0, 0, -2))
    ]

    return candidates.find((candidate) => !this.intersectsObstacle(candidate, obstacles)) ?? null
  }
}
