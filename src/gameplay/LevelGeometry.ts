import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { Scene } from '@babylonjs/core/scene'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import { PhysicsSystem } from '../physics/PhysicsSystem'

interface LevelGeometryOptions {
  scene: Scene
  physics: PhysicsSystem
  shadowGenerator: ShadowGenerator
}

interface ObstacleConfig {
  name: string
  size: Vector3
  position: Vector3
  color: Color3
}

export class LevelGeometry {
  private ground!: Mesh
  private platforms: Mesh[] = []
  private obstacles: Mesh[] = []

  constructor(private readonly options: LevelGeometryOptions) {}

  build(): void {
    const { scene, physics, shadowGenerator } = this.options

    const groundMaterial = new StandardMaterial('ground-material', scene)
    groundMaterial.diffuseColor = new Color3(0.12, 0.15, 0.22)
    groundMaterial.specularColor = new Color3(0, 0, 0)

    this.ground = MeshBuilder.CreateGround('ground', { width: 80, height: 80 }, scene)
    this.ground.material = groundMaterial
    this.ground.receiveShadows = true

    physics.registerStaticMesh(this.ground, { shape: 'plane' })

    const platformMaterial = new StandardMaterial('platform-material', scene)
    platformMaterial.diffuseColor = new Color3(0.16, 0.21, 0.32)

    const platformConfigs = [
      { position: new Vector3(-14, 1, -6), size: new Vector3(8, 1, 8) },
      { position: new Vector3(6, 2.2, -12), size: new Vector3(6, 1, 6) },
      { position: new Vector3(18, 3, -4), size: new Vector3(7, 1, 7) },
      { position: new Vector3(-6, 2.6, 10), size: new Vector3(10, 1, 10) },
      { position: new Vector3(14, 1.8, 14), size: new Vector3(8, 1, 8) }
    ]

    platformConfigs.forEach(({ position, size }, index) => {
      const platform = MeshBuilder.CreateBox(`platform-${index}`, {
        width: size.x,
        height: size.y,
        depth: size.z
      }, scene)
      platform.position = position
      platform.material = platformMaterial
      platform.receiveShadows = true
      shadowGenerator.addShadowCaster(platform)
      physics.registerStaticMesh(platform, { shape: 'box', size })
      this.platforms.push(platform)
    })

    const obstacleConfigs: ObstacleConfig[] = [
      {
        name: 'tower-west',
        size: new Vector3(6, 14, 6),
        position: new Vector3(-20, 7, -18),
        color: new Color3(0.25, 0.29, 0.42)
      },
      {
        name: 'tower-east',
        size: new Vector3(8, 12, 8),
        position: new Vector3(22, 6, 6),
        color: new Color3(0.21, 0.25, 0.36)
      },
      {
        name: 'center-block',
        size: new Vector3(10, 6, 6),
        position: new Vector3(2, 3, 0),
        color: new Color3(0.18, 0.22, 0.34)
      }
    ]

    obstacleConfigs.forEach((config) => {
      const material = new StandardMaterial(`${config.name}-material`, scene)
      material.diffuseColor = config.color
      const obstacle = MeshBuilder.CreateBox(config.name, {
        width: config.size.x,
        height: config.size.y,
        depth: config.size.z
      }, scene)
      obstacle.position = config.position
      obstacle.material = material
      obstacle.receiveShadows = true
      shadowGenerator.addShadowCaster(obstacle)
      physics.registerStaticMesh(obstacle, { shape: 'box', size: config.size })
      this.obstacles.push(obstacle)
    })
  }

  getGround(): Mesh {
    return this.ground
  }

  getPlatforms(): Mesh[] {
    return this.platforms
  }

  getObstacles(): Mesh[] {
    return this.obstacles
  }
}
