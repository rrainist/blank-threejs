import { Engine } from '@babylonjs/core/Engines/engine'
import { Scene } from '@babylonjs/core/scene'
import { createScene } from './createScene'
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { createCamera } from './CameraRig'
import { GameWorld } from '../gameplay/GameWorld'
import { PhysicsSystem } from '../physics/PhysicsSystem'
import { AssetManagerService } from '../assets/AssetManager'
import { HudLayer } from '../ui/HudLayer'
import { InputManager } from '../input/InputManager'
import { logger } from '../utils/Logger'

export class SceneOrchestrator {
  private readonly scene: Scene
  private readonly assetManager: AssetManagerService
  private readonly hud = new HudLayer()
  private readonly input = new InputManager()
  private readonly gameWorld: GameWorld
  private readonly camera: ArcRotateCamera
  private lastFrameTime = performance.now()

  constructor(private readonly engine: Engine, physics: PhysicsSystem) {
    const { scene, shadowGenerator } = createScene(engine)
    this.camera = createCamera(scene)

    this.scene = scene
    this.assetManager = new AssetManagerService(scene)
    this.gameWorld = new GameWorld(physics, this.input)

    this.gameWorld.init(scene, shadowGenerator, this.camera)
    this.hud.init()
    this.input.attach()
  }

  async start(): Promise<void> {
    logger.info('Starting render loop')
    await this.assetManager.load()
    this.lastFrameTime = performance.now()

    this.engine.runRenderLoop(() => {
      const now = performance.now()
      const deltaSeconds = (now - this.lastFrameTime) / 1000
      this.lastFrameTime = now

      this.gameWorld.update(deltaSeconds)
      this.scene.render()
    })
  }

  dispose(): void {
    logger.info('Disposing SceneOrchestrator')
    this.engine.stopRenderLoop()
    this.gameWorld.dispose()
    this.hud.dispose()
    this.input.detach()
    this.scene.dispose()
  }

  getScene(): Scene {
    return this.scene
  }
}
