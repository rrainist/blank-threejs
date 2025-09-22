import Phaser from 'phaser'
import { SceneKeys } from '../config/sceneKeys'
import { Player } from '../gameobjects/Player'
import { Bullet } from '../gameobjects/Bullet'
import { Enemy } from '../gameobjects/Enemy'
import { Collectible } from '../gameobjects/Collectible'
import { eventBus } from '../utils/EventBus'
import { logger } from '../utils/Logger'

interface MainSceneData {
  levelKey?: string
}

export class MainScene extends Phaser.Scene {
  private player!: Player
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private bullets!: Phaser.Physics.Arcade.Group
  private enemies!: Phaser.Physics.Arcade.Group
  private collectibles!: Phaser.Physics.Arcade.Group
  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private score = 0
  private wave = 1
  private debugOverlay?: Phaser.GameObjects.Text
  private matterEnabled = true
  private unsubscribes: Array<() => void> = []
  private paused = false

  constructor() {
    super(SceneKeys.MAIN)
  }

  create(data: MainSceneData): void {
    logger.info('MainScene starting', data)
    this.score = 0
    this.wave = 1
    this.registry.set('score', this.score)
    this.registry.set('wave', this.wave)
    eventBus.emit('game:wave', { wave: this.wave })

    this.physics.world.setBounds(0, 0, 3200, 720, true, true, true, true)

    this.add.tileSprite(0, 0, 3200, 720, 'platform')
      .setOrigin(0)
      .setTint(0x1d2540)
      .setAlpha(0.12)

    this.createParallaxBackground()
    this.createShaderBackdrop()
    this.createPlatforms()
    this.createCollectibles(data.levelKey)
    this.createPlayer()
    this.createEnemiesFromData(data.levelKey)
    this.createMatterPlayground()
    this.configureCamera()
    this.configureInput()
    this.configureColliders()
    this.configureEvents()

    eventBus.emit('game:start', undefined)
  }

  update(time: number, delta: number): void {
    if (this.paused) {
      return
    }

    this.player.update(time, delta)

    this.bullets.getChildren().forEach((child) => {
      const bullet = child as Bullet
      if (!bullet.active) return
      bullet.update(time, delta)
      const bounds = this.physics.world.bounds
      if (bullet.x < bounds.left
        || bullet.x > bounds.right
        || bullet.y > bounds.bottom
        || bullet.y < bounds.top) {
        bullet.disable()
      }
    })

    if (this.cursors.shift && Phaser.Input.Keyboard.JustDown(this.cursors.shift)) {
      this.toggleSlowMotion()
    }
  }

  private createParallaxBackground(): void {
    for (let i = 0; i < 3; i += 1) {
      const layer = this.add.rectangle(1600, 360, 3200, 720, 0x0f172a + i * 0x020202)
      layer.setScrollFactor(0.2 * (i + 1))
      layer.setDepth(-5 + i)
      layer.setAlpha(0.4 - i * 0.1)
    }
  }

  private createShaderBackdrop(): void {
    const shader = this.add.shader('pulse', 1600, 80, 3200, 160)
    shader.setScrollFactor(0.1)
    shader.setDepth(-1)
  }

  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup()

    const ground = this.platforms.create(1600, 700, 'platform') as Phaser.Physics.Arcade.Sprite
    ground.setScale(50, 1).refreshBody()

    const ledgePositions = [
      { x: 400, y: 500, scale: 2 },
      { x: 800, y: 400, scale: 2 },
      { x: 1200, y: 520, scale: 3 },
      { x: 1900, y: 420, scale: 2.5 },
      { x: 2400, y: 340, scale: 2 }
    ]

    ledgePositions.forEach(({ x, y, scale }) => {
      const platform = this.platforms.create(x, y, 'platform') as Phaser.Physics.Arcade.Sprite
      platform.setScale(scale, 1).refreshBody()
    })
  }

  private createCollectibles(levelKey?: string): void {
    this.collectibles = this.physics.add.group({ runChildUpdate: false, allowGravity: false })

    const level = levelKey ? this.cache.json.get(levelKey) : undefined
    const collectibleSpawns: Array<{ position: number[] }> = Array.isArray(level?.spawnPoints)
      ? level.spawnPoints.filter((spawn: any) => spawn.type === 'collectible')
      : []

    if (collectibleSpawns.length > 0) {
      collectibleSpawns.forEach(({ position }) => {
        const worldX = 1600 + (position?.[0] ?? 0) * 4
        const fallbackY = 520 - (position?.[2] ?? 0) * 4
        this.spawnCollectible(worldX, fallbackY)
      })
      return
    }

    const fallbackPositions = [
      { x: 420, y: 450 },
      { x: 780, y: 350 },
      { x: 1180, y: 470 },
      { x: 1800, y: 360 },
      { x: 2350, y: 280 }
    ]

    fallbackPositions.forEach(({ x, y }) => {
      this.spawnCollectible(x, y)
    })
  }

  private spawnCollectible(x: number, y: number): void {
    const collectible = new Collectible(this, x, y)
    this.collectibles.add(collectible)
    this.snapCollectibleToSurface(collectible)
  }

  private snapCollectibleToSurface(collectible: Collectible): void {
    const body = collectible.body as Phaser.Physics.Arcade.Body
    if (!body) return

    const support = this.getPlatformTopAt(collectible.x)
    if (typeof support === 'number') {
      collectible.setY(support - body.height / 2 - 4)
      body.updateFromGameObject()
    }

    let iterations = 0
    while (this.physics.world.overlap(collectible, this.platforms) && iterations < 12) {
      collectible.y -= 2
      body.updateFromGameObject()
      iterations += 1
    }
  }

  private getPlatformTopAt(x: number): number | null {
    let surface: number | null = null
    this.platforms.getChildren().forEach((child) => {
      const platform = child as Phaser.Physics.Arcade.Sprite
      const platformBody = platform.body as Phaser.Physics.Arcade.StaticBody | null
      if (!platformBody) return
      if (x >= platformBody.left && x <= platformBody.right) {
        if (surface === null || platformBody.top < surface) {
          surface = platformBody.top
        }
      }
    })
    return surface
  }

  private createPlayer(): void {
    this.player = new Player(this, 160, 520)
  }

  private createEnemiesFromData(levelKey?: string): void {
    this.enemies = this.physics.add.group({ runChildUpdate: true })

    const level = this.cache.json.get(levelKey ?? '')
    if (!level || !level.spawnPoints) {
      this.spawnDefaultEnemies()
      return
    }

    const enemySpawns = level.spawnPoints.filter((spawn: any) => spawn.type === 'enemy')

    enemySpawns.forEach((spawn: any) => {
      const { position, data = {} } = spawn
      const patrolPoints = data.patrolPoints ?? []
      const xs = patrolPoints.map((point: number[]) => point[0])
      const left = (Math.min(...xs) || position[0]) * 4 + 1600
      const right = (Math.max(...xs) || position[0] + 5) * 4 + 1600

      const enemy = new Enemy(this, left, 520 - position[2] * 4, {
        left,
        right,
        speed: Phaser.Math.Between(90, 140)
      })

      this.enemies.add(enemy)
    })
  }

  private spawnDefaultEnemies(): void {
    const defaults = [
      { x: 600, y: 480, range: 200 },
      { x: 1400, y: 440, range: 220 },
      { x: 2100, y: 480, range: 260 }
    ]

    defaults.forEach(({ x, y, range }) => {
      const enemy = new Enemy(this, x, y, {
        left: x - range / 2,
        right: x + range / 2,
        speed: Phaser.Math.Between(80, 130)
      })
      this.enemies.add(enemy)
    })
  }

  private createMatterPlayground(): void {
    if (!this.matterEnabled) return

    this.matter.world.setBounds(2500, 0, 700, 720)

    this.matter.add.rectangle(2850, 660, 600, 40, { isStatic: true, chamfer: 12 })
    this.add.rectangle(2850, 660, 600, 40, 0x1e293b, 1).setDepth(-2)

    type MatterBody = Phaser.Types.Physics.Matter.MatterBody
    type MatterCompositeLike = { bodies: MatterBody[] }

    const stack = this.matter.add.stack(2620, 200, 6, 4, 8, 4, (x: number, y: number) =>
      this.matter.add.rectangle(x, y, 48, 48, {
        chamfer: 6,
        friction: 0.03,
        restitution: 0.4
      })) as unknown as MatterCompositeLike

    const stackBodies = stack.bodies ?? []

    this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: () => {
        this.matter.add.image(2700 + Phaser.Math.Between(-60, 60), 100, 'collectible', undefined, {
          shape: { type: 'circle', radius: 18 },
          restitution: 0.9,
          frictionAir: 0.01
        })
      }
    })

    this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        if (stackBodies.length === 0) return
        const body = Phaser.Utils.Array.GetRandom(stackBodies)
        if (!body) return
        this.matter.body.setAngularVelocity(body as any, Phaser.Math.FloatBetween(-0.1, 0.1))
      }
    })
  }

  private configureCamera(): void {
    const camera = this.cameras.main
    camera.setBounds(0, 0, 3200, 720)
    camera.startFollow(this.player, true, 0.08, 0.08)
    camera.setZoom(1.1)
    camera.setBackgroundColor(0x0f172a)
  }

  private configureInput(): void {
    const keyboard = this.input.keyboard
    if (!keyboard) {
      logger.warn('Keyboard plugin unavailable')
      return
    }

    this.cursors = keyboard.createCursorKeys()

    keyboard.on('keydown-P', () => {
      this.paused = !this.paused
      this.physics.world.isPaused = this.paused
      this.time.timeScale = this.paused ? 0 : 1
      eventBus.emit(this.paused ? 'game:pause' : 'game:resume', undefined)
    })

    keyboard.on('keydown-F1', () => this.toggleDebug())

    const gamepadPlugin = this.input.gamepad
    if (gamepadPlugin) {
      gamepadPlugin.once('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
        this.player.attachInput(this.cursors, pad)
      })
      if (gamepadPlugin.total) {
        const pad = gamepadPlugin.getPad(0)
        if (pad) {
          this.player.attachInput(this.cursors, pad)
        }
      }
    }

    this.player.attachInput(this.cursors)
  }

  private configureColliders(): void {
    this.physics.add.collider(this.player, this.platforms)
    this.physics.add.collider(this.enemies, this.platforms)
    this.physics.add.collider(this.collectibles, this.platforms)

    this.physics.add.collider(this.player, this.enemies, (_player, enemy) => {
      const enemySprite = enemy as Enemy
      this.player.takeDamage(1)
      const body = enemySprite.body as Phaser.Physics.Arcade.Body
      body.velocity.x *= -1
    })

    this.physics.add.overlap(this.player, this.collectibles, (_player, collectible) => {
      const target = collectible as Collectible
      target.disableBody(true, true)
      this.incrementScore(10)
      this.player.heal(1)
      this.sound.play('sfx-collect', { volume: 0.5 })
    })

    this.bullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true, maxSize: 32 })
    for (let i = 0; i < 20; i += 1) {
      const bullet = new Bullet(this, -100, -100)
      this.bullets.add(bullet, true)
      bullet.disable()
    }
    this.physics.add.collider(this.bullets, this.platforms, (bullet) => {
      const instance = bullet as Bullet
      instance.disable()
    })

    this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
      const projectile = bullet as Bullet
      const target = enemy as Enemy
      projectile.disable()
      if (target.takeHit()) {
        this.incrementScore(35)
      }
    })
  }

  private configureEvents(): void {
    this.events.on('player:fire', this.handlePlayerFire, this)
    this.events.on('player:dead', () => {
      eventBus.emit('game:over', { score: this.score, wave: this.wave })
      this.scene.pause()
    })

    this.time.addEvent({
      delay: 15000,
      loop: true,
      callback: () => this.spawnEnemyWave()
    })

    this.unsubscribes.push(eventBus.on('audio:toggle', ({ muted }) => {
      this.sound.mute = muted
    }))

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribes.forEach((unsubscribe) => unsubscribe())
      this.unsubscribes = []
      this.events.off('player:fire', this.handlePlayerFire, this)
    })
  }

  private handlePlayerFire(event: { origin: Phaser.Math.Vector2; pointer: Phaser.Input.Pointer }): void {
    let bullet = this.bullets.getFirstDead(false) as Bullet
    if (!bullet) {
      bullet = this.bullets.get(0, 0) as Bullet
      if (!bullet) {
        logger.warn('Bullet pool exhausted')
        return
      }
    }

    const direction = new Phaser.Math.Vector2(event.pointer.worldX, event.pointer.worldY)
      .subtract(event.origin)
      .normalize()

    bullet.fire(event.origin, direction)
  }

  private incrementScore(delta: number): void {
    this.score += delta
    this.registry.set('score', this.score)
    eventBus.emit('game:score', { score: this.score, delta })
  }

  private spawnEnemyWave(): void {
    this.wave += 1
    this.registry.set('wave', this.wave)
    eventBus.emit('game:wave', { wave: this.wave })

    const spawnX = Phaser.Math.Between(600, 3000)
    const enemy = new Enemy(this, spawnX, 360, {
      left: spawnX - 200,
      right: spawnX + 200,
      speed: Phaser.Math.Between(110, 160)
    })
    this.enemies.add(enemy)

    eventBus.emit('game:score', { score: this.score, delta: 0 })
  }

  private toggleDebug(): void {
    const debug = this.physics.world.drawDebug
    this.physics.world.drawDebug = !debug
    this.physics.world.debugGraphic.clear()

    if (!this.debugOverlay) {
      this.debugOverlay = this.add.text(this.cameras.main.worldView.left + 20, 20, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#38bdf8'
      })
      this.debugOverlay.setScrollFactor(0)
    }

    const overlay = this.debugOverlay
    if (!overlay) return

    if (!debug) {
      overlay.setText('Arcade Debug Enabled (F1)')
    } else {
      overlay.setText('')
    }
  }

  private toggleSlowMotion(): void {
    const isSlow = this.time.timeScale < 1
    this.time.timeScale = isSlow ? 1 : 0.5
    this.physics.world.timeScale = isSlow ? 1 : 0.5
    this.sound.rate = isSlow ? 1 : 0.9
  }
}
