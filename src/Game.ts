import * as THREE from 'three'
import { GameManager, GameState } from './systems/GameManager'
import { InputManager } from './systems/InputManager'
import { AudioManager } from './systems/AudioManager'
import { UIManager } from './systems/UIManager'
import { EffectsSystem } from './systems/EffectsSystem'
import { PhysicsSystem, CollisionShape, type RigidBody } from './systems/PhysicsSystem'
import { TimeManager } from './systems/TimeManager'
import { logger } from './utils/Logger'
import { Player } from './entities/Player'
import { Enemy } from './entities/Enemy'
import { BOARD, ENEMY, ORB, PING, SCENE, WORLD } from './constants/GameConstants'

interface GridPosition {
  x: number
  y: number
}

interface TileState {
  type: 'floor' | 'resonator'
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>
}

export class Game {
  private readonly scene: THREE.Scene
  private readonly camera: THREE.OrthographicCamera
  private readonly renderer: THREE.WebGLRenderer

  private readonly gameManager: GameManager
  private readonly inputManager: InputManager
  private readonly audioManager: AudioManager
  private readonly uiManager: UIManager
  private readonly effectsSystem: EffectsSystem
  private readonly physicsSystem: PhysicsSystem
  private readonly timeManager: TimeManager

  private readonly gridGroup = new THREE.Group()
  private readonly tiles: TileState[][] = []

  private player?: Player
  private playerTile: GridPosition = { x: 0, y: 0 }
  private resonatorTile: GridPosition = { x: 0, y: 0 }

  private enemy?: Enemy
  private orb?: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>
  private orbBody?: RigidBody

  private lastStatus = 'Step onto the glowing tile and press F to ping.'
  private pausedMessage = 'Paused — press P to resume.'

  constructor(scene: THREE.Scene, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer

    this.gameManager = GameManager.getInstance()
    this.inputManager = InputManager.getInstance()
    this.audioManager = AudioManager.initialize()
    this.uiManager = UIManager.initialize()
    this.effectsSystem = EffectsSystem.initialize(this.scene)
    this.physicsSystem = PhysicsSystem.getInstance()
    this.timeManager = TimeManager.getInstance()
  }

  async initialize(): Promise<void> {
    this.renderer.setClearColor(SCENE.BACKGROUND, 1)

    this.setupLighting()
    this.createBoard()
    this.spawnPlayer()
    this.spawnEnemy()
    this.setupOrb()

    await this.prepareAudio()
    this.setupUI()

    this.gameManager.changeState(GameState.PLAYING)
    logger.info('Minimal playground ready')
  }

  update(): void {
    this.timeManager.update(performance.now())
    const delta = this.timeManager.getDeltaTime()

    this.inputManager.update()
    this.handleInput()

    if (this.gameManager.isInState(GameState.PLAYING)) {
      this.updateEnemy(delta)
      this.physicsSystem.update(delta)
      this.effectsSystem.update(delta)
    }

    this.uiManager.update(delta)
    this.inputManager.lateUpdate()
  }

  resize(): void {
    // No special handling required, method kept for API parity
  }

  dispose(): void {
    this.clearBoard()
    if (this.player) {
      this.scene.remove(this.player)
      this.player = undefined
    }
    if (this.enemy) {
      this.scene.remove(this.enemy)
      this.enemy = undefined
    }
    if (this.orb) {
      this.scene.remove(this.orb)
      this.orb = undefined
    }

    this.physicsSystem.clear()
    this.effectsSystem.clear()
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, SCENE.AMBIENT_INTENSITY)
    this.scene.add(ambient)

    const directional = new THREE.DirectionalLight(0xffffff, SCENE.DIRECTIONAL_INTENSITY)
    directional.position.set(14, 18, 10)
    directional.castShadow = true
    directional.shadow.mapSize.set(512, 512)
    this.scene.add(directional)
  }

  private createBoard(): void {
    const tileGeometry = new THREE.BoxGeometry(WORLD.TILE_SIZE, WORLD.TILE_HEIGHT, WORLD.TILE_SIZE)
    this.resonatorTile = {
      x: Math.floor(WORLD.WIDTH / 2),
      y: Math.max(0, Math.floor(WORLD.HEIGHT / 2) - 1)
    }

    for (let y = 0; y < WORLD.HEIGHT; y += 1) {
      const row: TileState[] = []
      for (let x = 0; x < WORLD.WIDTH; x += 1) {
        const isResonator = x === this.resonatorTile.x && y === this.resonatorTile.y
        const material = new THREE.MeshStandardMaterial({
          color: isResonator ? BOARD.RESONATOR_COLOR : BOARD.FLOOR_COLOR,
          emissive: isResonator ? new THREE.Color(BOARD.RESONATOR_COLOR).multiplyScalar(0.25) : new THREE.Color(0x000000)
        })

        const mesh = new THREE.Mesh(tileGeometry.clone(), material)
        mesh.receiveShadow = true

        const { x: worldX, z: worldZ } = this.gridToWorldCenter({ x, y })
        mesh.position.set(worldX, -WORLD.TILE_HEIGHT / 2, worldZ)

        if (isResonator) {
          const marker = new THREE.Mesh(
            new THREE.CylinderGeometry(WORLD.TILE_SIZE * 0.2, WORLD.TILE_SIZE * 0.2, WORLD.TILE_HEIGHT * 0.5, 24),
            new THREE.MeshStandardMaterial({ color: BOARD.MARKER_COLOR, emissive: 0x0, metalness: 0.2, roughness: 0.4 })
          )
          marker.position.set(worldX, 0, worldZ)
          this.gridGroup.add(marker)
        }

        row.push({ type: isResonator ? 'resonator' : 'floor', mesh })
        this.gridGroup.add(mesh)
      }
      this.tiles.push(row)
    }

    this.scene.add(this.gridGroup)
  }

  private spawnPlayer(): void {
    this.player = new Player(WORLD.TILE_SIZE)
    this.scene.add(this.player)

    this.playerTile = {
      x: Math.floor(WORLD.WIDTH / 2),
      y: WORLD.HEIGHT - 2
    }

    this.setPlayerPosition(this.playerTile)
    this.configureCamera()
  }

  private spawnEnemy(): void {
    this.enemy = new Enemy(WORLD.TILE_SIZE)
    this.scene.add(this.enemy)
    this.enemy.position.set(ENEMY.ORBIT_RADIUS, ENEMY.HOVER_HEIGHT, 0)
  }

  private setupOrb(): void {
    const sphere = new THREE.SphereGeometry(ORB.RADIUS, 24, 16)
    const material = new THREE.MeshStandardMaterial({ color: 0xb0d9ff, roughness: 0.3, metalness: 0.1 })
    this.orb = new THREE.Mesh(sphere, material)
    this.orb.castShadow = true
    this.orb.position.set(0, ORB.RADIUS * 2, -WORLD.TILE_SIZE * 0.8)
    this.scene.add(this.orb)

    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(WORLD.WIDTH * WORLD.TILE_SIZE, WORLD.TILE_HEIGHT, WORLD.HEIGHT * WORLD.TILE_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x141d28 })
    )
    ground.receiveShadow = true
    ground.position.set(0, -WORLD.TILE_HEIGHT / 2, 0)
    this.scene.add(ground)

    this.physicsSystem.createRigidBody(ground, {
      isStatic: true,
      shape: CollisionShape.BOX,
      halfExtents: new THREE.Vector3(
        (WORLD.WIDTH * WORLD.TILE_SIZE) / 2,
        WORLD.TILE_HEIGHT / 2,
        (WORLD.HEIGHT * WORLD.TILE_SIZE) / 2
      ),
      friction: 0.8
    })

    this.orbBody = this.physicsSystem.createRigidBody(this.orb, {
      mass: ORB.MASS,
      shape: CollisionShape.SPHERE,
      radius: ORB.RADIUS,
      restitution: ORB.BOUNCE,
      friction: 0.2
    })
  }

  private async prepareAudio(): Promise<void> {
    try {
      this.audioManager.registerSound(PING.SOUND_KEY, PING.SOUND_URL)
      await this.audioManager.preloadSound(PING.SOUND_KEY)
    } catch (error) {
      logger.warn('Audio preload failed; continuing without sound', error)
    }
  }

  private setupUI(): void {
    this.uiManager.setTitle('Playground Controls')
    this.uiManager.setInstructions([
      'WASD / Arrow keys — move',
      'F — ping the resonator',
      'P — pause'
    ])
    this.uiManager.setStatus(this.lastStatus)
    this.uiManager.setHint('Template starts here: replace the scene or build on top.')
    this.uiManager.pushMessage('Minimal scene booted. Explore and customize.')
  }

  private handleInput(): void {
    if (this.wasKeyJustPressed('p')) {
      this.gameManager.togglePause()
      if (this.gameManager.isInState(GameState.PAUSED)) {
        this.timeManager.pause()
        this.uiManager.setStatus(this.pausedMessage)
        this.uiManager.pushMessage('Simulation paused.')
      } else {
        this.timeManager.resume()
        this.uiManager.setStatus(this.lastStatus)
        this.uiManager.pushMessage('Back to realtime.')
      }
      return
    }

    if (!this.gameManager.isInState(GameState.PLAYING)) {
      return
    }

    if (this.handleMovement()) {
      return
    }

    if (this.wasKeyJustPressed('f')) {
      this.triggerPing()
    }
  }

  private handleMovement(): boolean {
    const directions: Array<{ keys: string[]; delta: GridPosition; summary: string }> = [
      { keys: ['w', 'ArrowUp'], delta: { x: 0, y: -1 }, summary: 'north' },
      { keys: ['s', 'ArrowDown'], delta: { x: 0, y: 1 }, summary: 'south' },
      { keys: ['a', 'ArrowLeft'], delta: { x: -1, y: 0 }, summary: 'west' },
      { keys: ['d', 'ArrowRight'], delta: { x: 1, y: 0 }, summary: 'east' }
    ]

    for (const { keys, delta, summary } of directions) {
      if (keys.some(key => this.wasKeyJustPressed(key))) {
        if (this.tryMove(delta)) {
          this.lastStatus = `Moved ${summary}.`;
          this.uiManager.setStatus(this.lastStatus)
        }
        return true
      }
    }

    return false
  }

  private tryMove(delta: GridPosition): boolean {
    const target = { x: this.playerTile.x + delta.x, y: this.playerTile.y + delta.y }
    if (!this.withinBounds(target)) {
      this.uiManager.pushMessage('The platform ends here.')
      return false
    }

    this.setPlayerPosition(target)
    this.uiManager.pushMessage(`Standing on tile (${target.x + 1}, ${target.y + 1}).`)
    return true
  }

  private triggerPing(): void {
    const onResonator = this.playerTile.x === this.resonatorTile.x && this.playerTile.y === this.resonatorTile.y
    if (!onResonator) {
      this.lastStatus = 'Step onto the glowing tile to ping it.'
      this.uiManager.setStatus(this.lastStatus)
      this.uiManager.pushMessage('Ping fizzles — you are not on the resonator.')
      return
    }

    this.audioManager.play2D(PING.SOUND_KEY, { volume: 0.45 })

    const resonator = this.tiles[this.resonatorTile.y][this.resonatorTile.x]
    const effectOrigin = resonator.mesh.position.clone().add(new THREE.Vector3(0, WORLD.TILE_HEIGHT * 0.75, 0))
    this.effectsSystem.sparkle(effectOrigin, { color: PING.EFFECT_COLOR, count: 14 })

    if (this.orbBody) {
      this.physicsSystem.applyImpulse(
        this.orbBody,
        new THREE.Vector3(0, PING.IMPULSE_STRENGTH, 0)
      )
    }

    this.lastStatus = 'Resonator responds with a gentle hum.'
    this.uiManager.setStatus(this.lastStatus)
    this.uiManager.pushMessage('Ping! Energy ripples across the board.')
  }

  private updateEnemy(delta: number): void {
    if (!this.enemy) return

    const elapsed = this.timeManager.getElapsedTime()
    const orbitX = Math.cos(elapsed * ENEMY.ROTATION_SPEED) * ENEMY.ORBIT_RADIUS
    const orbitZ = Math.sin(elapsed * ENEMY.ROTATION_SPEED) * ENEMY.ORBIT_RADIUS
    this.enemy.position.set(orbitX, ENEMY.HOVER_HEIGHT, orbitZ)
    this.enemy.rotation.y += delta * 1.5
  }

  private setPlayerPosition(position: GridPosition): void {
    if (!this.player) return

    this.playerTile = position
    const { x, z } = this.gridToWorldCenter(position)
    this.player.position.set(x, this.player.height / 2, z)
  }

  private configureCamera(): void {
    const spanX = WORLD.WIDTH * WORLD.TILE_SIZE
    const spanY = WORLD.HEIGHT * WORLD.TILE_SIZE
    const maxSpan = Math.max(spanX, spanY)

    this.camera.up.set(0, 0, -1)
    this.camera.position.set(0, maxSpan, maxSpan)
    this.camera.lookAt(new THREE.Vector3(0, 0, 0))
  }

  private clearBoard(): void {
    this.scene.remove(this.gridGroup)
    this.tiles.splice(0, this.tiles.length)
  }

  private withinBounds(position: GridPosition): boolean {
    return position.x >= 0 && position.x < WORLD.WIDTH && position.y >= 0 && position.y < WORLD.HEIGHT
  }

  private gridToWorldCenter(position: GridPosition): { x: number; z: number } {
    const offsetX = (WORLD.WIDTH * WORLD.TILE_SIZE) / 2
    const offsetZ = (WORLD.HEIGHT * WORLD.TILE_SIZE) / 2

    return {
      x: position.x * WORLD.TILE_SIZE - offsetX + WORLD.TILE_SIZE / 2,
      z: position.y * WORLD.TILE_SIZE - offsetZ + WORLD.TILE_SIZE / 2
    }
  }

  private wasKeyJustPressed(key: string): boolean {
    return this.inputManager.isKeyJustPressed(key) || this.inputManager.isKeyJustPressed(key.toLowerCase())
  }
}
