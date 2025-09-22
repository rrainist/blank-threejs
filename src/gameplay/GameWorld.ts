import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Scene } from '@babylonjs/core/scene'
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import { PhysicsSystem } from '../physics/PhysicsSystem'
import { logger } from '../utils/Logger'
import { eventBus } from '../utils/EventBus'
import { InputManager } from '../input/InputManager'
import { LevelGeometry } from './LevelGeometry'
import { PlayerController } from './PlayerController'
import { CollectibleManager } from './CollectibleManager'

export class GameWorld {
  private initialized = false
  private levelGeometry: LevelGeometry | null = null
  private player: PlayerController | null = null
  private collectibles = new CollectibleManager()
  private score = 0
  private wave = 1

  constructor(
    private readonly physics: PhysicsSystem,
    private readonly input: InputManager
  ) {}

  init(scene: Scene, shadowGenerator: ShadowGenerator, camera: ArcRotateCamera): void {
    if (this.initialized) return

    logger.info('GameWorld initializing')

    this.physics.init(scene)

    this.levelGeometry = new LevelGeometry({
      scene,
      physics: this.physics,
      shadowGenerator
    })
    this.levelGeometry.build()

    this.player = new PlayerController({
      scene,
      shadowGenerator,
      physics: this.physics,
      input: this.input,
      camera
    })

    const ground = this.levelGeometry.getGround()
    const platforms = this.levelGeometry.getPlatforms()
    const obstacles = this.levelGeometry.getObstacles()

    this.collectibles.init(scene, [ground, ...platforms], obstacles)
    this.initialized = true

    this.score = 0
    this.wave = 1
    eventBus.emit('game:start', undefined)
    eventBus.emit('game:wave', { wave: this.wave })
    eventBus.emit('game:score', { score: this.score, delta: 0 })
  }

  update(deltaSeconds: number): void {
    if (!this.initialized || !this.player) {
      return
    }

    this.player.update(deltaSeconds)
    this.physics.step(deltaSeconds)

    const collected = this.collectibles.update(deltaSeconds, this.player.getPosition())
    if (collected > 0) {
      const deltaScore = collected * 10
      this.score += deltaScore
      eventBus.emit('game:score', { score: this.score, delta: deltaScore })
      if (this.score % 50 === 0) {
        this.wave += 1
        eventBus.emit('game:wave', { wave: this.wave })
      }
    }
  }

  dispose(): void {
    if (!this.initialized) return
    this.collectibles.dispose()
    this.player?.dispose()
    this.levelGeometry = null
    this.player = null
    this.initialized = false
    this.physics.dispose()
  }
}
