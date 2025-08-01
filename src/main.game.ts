import * as THREE from 'three'
import { createScene } from './scene'
import { handleResize } from './utils/resize'
import { GameManager, GameState } from './systems/GameManager'
import { TimeManager } from './systems/TimeManager'
import { InputManager } from './systems/InputManager'
import { AssetLoader } from './systems/AssetLoader'
import { AudioManager } from './systems/AudioManager'
import { SceneManager } from './systems/SceneManager'
import { UIManager } from './systems/UIManager'
import { CameraController, CameraMode } from './systems/CameraController'
import { LevelManager } from './systems/LevelManager'
import { PhysicsSystem } from './systems/PhysicsSystem'
import { EffectsSystem } from './systems/EffectsSystem'
import { eventBus, GameEvents } from './utils/EventBus'
import { ItemCollectEvent, PlayerJumpEvent, PlayerAttackEvent, EnemyDeathEvent, EnemyAttackEvent } from './types/events'
import { logger } from './utils/Logger'
import { ENEMY } from './constants/GameConstants'
import { Player } from './entities/Player'
import { Collectible } from './entities/Collectible'
import { Enemy, EnemyType } from './entities/Enemy'
import { ObjectPool } from './utils/ObjectPool'
import { Bullet } from './entities/Bullet'

class GameApp {
  private scene!: THREE.Scene
  private camera!: THREE.OrthographicCamera
  private renderer!: THREE.WebGLRenderer
  private animationId: number | null = null
  private resizeHandler!: () => void
  
  // Game systems
  private gameManager!: GameManager
  private timeManager!: TimeManager
  private inputManager!: InputManager
  private assetLoader!: AssetLoader
  private audioManager!: AudioManager
  private sceneManager!: SceneManager
  private uiManager!: UIManager
  private cameraController!: CameraController
  private levelManager!: LevelManager
  private physicsSystem!: PhysicsSystem
  private effectsSystem!: EffectsSystem
  
  // Game state
  private player?: Player
  private score = 0
  private currentLevel = 1
  private totalLevels = 2
  private debugInfo?: HTMLDivElement
  private collectiblePool!: ObjectPool<Collectible>
  private bulletPool!: ObjectPool<Bullet>
  private raycaster!: THREE.Raycaster
  private mouse!: THREE.Vector2

  constructor() {
    this.init()
  }

  private async init(): Promise<void> {
    try {
      // Initialize Three.js components
      this.scene = createScene()
      this.camera = this.createCamera()
      this.renderer = this.createRenderer()
      
      // Initialize game systems
      await this.initializeSystems()
      
      // Initialize collectible pool
      this.initializeCollectiblePool()
      
      // Hide loading indicator
      const loading = document.getElementById('loading')
      if (loading) loading.style.display = 'none'
      
      // Setup
      this.setupEventListeners()
      
      // Load initial scene
      await this.sceneManager.loadScene('level1', false)
      
      // Setup game
      this.setupGame()
      this.createDebugUI()
      
      // Start animation loop
      this.animate()
    } catch (error) {
      this.handleWebGLError(error)
    }
  }

  private async initializeSystems(): Promise<void> {
    // Initialize core systems
    this.timeManager = TimeManager.getInstance()
    this.inputManager = InputManager.getInstance()
    this.gameManager = GameManager.getInstance()
    this.assetLoader = AssetLoader.getInstance()
    this.audioManager = AudioManager.initialize()
    this.sceneManager = SceneManager.initialize(this.scene, this.camera, this.renderer)
    this.uiManager = UIManager.initialize({
      debugMode: false
    })
    this.cameraController = CameraController.initialize(this.camera)
    this.levelManager = LevelManager.initialize(this.scene)
    this.physicsSystem = PhysicsSystem.getInstance()
    this.effectsSystem = EffectsSystem.initialize(this.scene, this.camera, this.renderer)
    
    // Initialize shooting systems
    this.initializeBulletPool()
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    
    // Preload common assets
    this.assetLoader.preloadCommonTextures()
    
    // Setup audio with real sound files
    await this.setupAudio()
    
    // Setup scenes
    this.setupScenes()
    
    // Create UI screens
    this.uiManager.createCommonScreens()
    this.uiManager.createHUD()
    this.uiManager.createPauseMenu()
  }

  private createCamera(): THREE.OrthographicCamera {
    const aspect = window.innerWidth / window.innerHeight
    const frustumSize = 20
    const camera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    )
    camera.position.set(5, 8, 10)
    camera.lookAt(0, 0, 0)
    return camera
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    
    const app = document.getElementById('app')
    if (app) {
      app.appendChild(renderer.domElement)
    }
    
    return renderer
  }


  private setupEventListeners(): void {
    // Window resize
    this.resizeHandler = () => {
      handleResize(this.camera, this.renderer)
    }
    window.addEventListener('resize', this.resizeHandler)
    
    // Game events
    eventBus.on(GameEvents.ITEM_COLLECT, (event: ItemCollectEvent) => {
      this.score += event.value
      this.gameManager.setScore(this.score)
      logger.info(`Score: ${this.score}`)
      
      // Play collect sound (using placeholder audio)
      this.playCollectSound()
    })
    
    eventBus.on(GameEvents.PLAYER_DEATH, () => {
      this.gameManager.changeState(GameState.GAME_OVER)
      this.playGameOverSound()
      this.timeManager.setTimeout(() => {
        this.resetGame()
      }, 3)
    })
    
    eventBus.on(GameEvents.PLAYER_DAMAGE, () => {
      this.playDamageSound()
    })
    
    eventBus.on('player:jump', (_event: PlayerJumpEvent) => {
      this.playJumpSound()
    })
    
    eventBus.on('player:land', () => {
      // Play landing sound at player position
      if (this.player) {
        this.audioManager.play3D('land', this.player.position, {
          volume: 0.2
        })
      }
    })
    
    eventBus.on('player:attack', (event: PlayerAttackEvent) => {
      // Play attack sound at player position
      this.audioManager.play3D('button', event.player.position, {
        volume: 0.4
      })
      
      // Check for enemy hits
      this.checkAttackCollisions(event.player)
    })
    
    // Enemy events
    eventBus.on(GameEvents.ENEMY_DEATH, (event: EnemyDeathEvent) => {
      logger.info('Enemy defeated!')
      this.score += ENEMY.COMMON.DEATH_POINTS
      this.gameManager.setScore(this.score)
      // Play enemy death sound
      this.audioManager.play3D('powerup', event.position, { volume: 0.4 })
    })
    
    eventBus.on(GameEvents.ENEMY_ATTACK, (event: EnemyAttackEvent) => {
      // Play attack sound
      this.audioManager.play3D('damage', event.enemy.position, { volume: 0.3 })
    })
    
    // Input events
    this.inputManager.addAction('jump', { keys: [' ', 'Space'] })
    this.inputManager.addAction('restart', { keys: ['r', 'R'] })
    this.inputManager.addAction('debugSpawn', { keys: ['c', 'C'] })
    this.inputManager.addAction('mute', { keys: ['m', 'M'] })
    this.inputManager.addAction('save', { keys: ['F5'] })
    this.inputManager.addAction('load', { keys: ['F9'] })
    this.inputManager.addAction('debugPhysics', { keys: ['F1'] })
    
    // Mouse click for shooting
    window.addEventListener('click', this.onMouseClick.bind(this))
    
    // Player shoot event
    eventBus.on('player:shoot', (event: { origin: THREE.Vector3; direction: THREE.Vector3 }) => {
      const bullet = this.bulletPool.get()
      if (bullet) {
        bullet.fire(event.origin, event.direction)
        this.scene.add(bullet)
        
        // Play shoot sound
        this.audioManager.play3D('button', event.origin, { volume: 0.3 })
      }
    })
  }

  private async setupAudio(): Promise<void> {
    // Load actual sound files from assets
    const soundsToLoad = [
      // Collect sound - use coin sound
      { key: 'collect', url: 'assets/sounds/General Sounds/Coins/sfx_coin_single1.wav' },
      
      // Damage sound
      { key: 'damage', url: 'assets/sounds/General Sounds/Simple Damage Sounds/sfx_damage_hit5.wav' },
      
      // Game over sound - use a death scream
      { key: 'gameOver', url: 'assets/sounds/Death Screams/Human/sfx_deathscream_human1.wav' },
      
      // Jump sound
      { key: 'jump', url: 'assets/sounds/Movement/Jumping and Landing/sfx_movement_jump8.wav' },
      
      // Landing sound
      { key: 'land', url: 'assets/sounds/Movement/Jumping and Landing/sfx_movement_jump8_landing.wav' },
      
      // Button/UI sounds
      { key: 'button', url: 'assets/sounds/General Sounds/Buttons/sfx_sounds_button6.wav' },
      { key: 'pause', url: 'assets/sounds/General Sounds/Pause Sounds/sfx_sounds_pause3_in.wav' },
      { key: 'unpause', url: 'assets/sounds/General Sounds/Pause Sounds/sfx_sounds_pause3_out.wav' },
      
      // Power up sound
      { key: 'powerup', url: 'assets/sounds/General Sounds/Positive Sounds/sfx_sounds_powerup10.wav' },
      
      // Error sound
      { key: 'error', url: 'assets/sounds/General Sounds/Negative Sounds/sfx_sounds_error1.wav' }
    ]
    
    // Load all sounds
    const loadPromises = soundsToLoad.map(({ key, url }) => 
      this.assetLoader.loadSound(key, url)
    )
    
    try {
      await Promise.all(loadPromises)
      logger.debug('All sounds loaded successfully')
    } catch (error) {
      logger.warn('Some sounds failed to load:', error)
      // Continue anyway - the game can work without sounds
    }
  }

  private playCollectSound(): void {
    // Find collectibles by traversing scene
    const collectibles: THREE.Object3D[] = []
    this.scene.traverse((object) => {
      if (object.userData.type === 'collectible') {
        collectibles.push(object)
      }
    })
    
    if (collectibles.length > 0) {
      const lastCollectible = collectibles[collectibles.length - 1]
      this.audioManager.play3D('collect', lastCollectible.position, {
        volume: 0.5
      })
    } else {
      // Fallback to 2D sound
      this.audioManager.play2D('collect', { volume: 0.5 })
    }
  }

  private playDamageSound(): void {
    // Play at player position
    if (this.player) {
      this.audioManager.play3D('damage', this.player.position, {
        volume: 0.7
      })
    }
  }

  private playGameOverSound(): void {
    // Play as 2D sound (UI sound)
    this.audioManager.play2D('gameOver', { volume: 0.6 })
  }

  private playJumpSound(): void {
    // Use simple 2D audio - no AudioListener needed
    this.audioManager.play2D('jump', { volume: 0.3 })
  }
  
  private initializeCollectiblePool(): void {
    // Create object pool for collectibles
    this.collectiblePool = new ObjectPool<Collectible>(
      () => {
        const collectible = new Collectible(10, 0xffff00)
        // Don't add to entity manager yet - wait until it's activated
        return collectible
      },
      20, // Initial size
      100, // Max size
      (collectible) => {
        // Additional reset logic if needed
        collectible.position.set(0, -1000, 0) // Move off-screen
      }
    )
  }
  
  private initializeBulletPool(): void {
    // Create object pool for bullets
    this.bulletPool = new ObjectPool<Bullet>(
      () => new Bullet(),
      20, // Initial size
      50, // Max size
      (bullet) => {
        // Additional reset logic
        bullet.position.set(0, -1000, 0) // Move off-screen
        if (bullet.parent) {
          bullet.parent.remove(bullet)
        }
      }
    )
  }

  private setupScenes(): void {
    // Initialize preset scenes
    this.sceneManager.initializePresetScenes()
    
    // Register Level 1 - City Theme
    this.sceneManager.registerScene('level1', {
      name: 'level1',
      onLoad: async () => {
        logger.info('Loading Level 1 - City')
        this.currentLevel = 1
        await this.levelManager.loadLevelFromFile('assets/levels/level1-city.json')
        this.setupLevel()
      }
    })
    
    // Register Level 2 - Forest Theme
    this.sceneManager.registerScene('level2', {
      name: 'level2',
      onLoad: async () => {
        logger.info('Loading Level 2 - Forest')
        this.currentLevel = 2
        await this.levelManager.loadLevelFromFile('assets/levels/level2-forest.json')
        this.setupLevel()
      }
    })
  }

  /* Level geometry now loaded from JSON files
  private createLevel1Geometry(): void {
    logger.debug('Creating Level 1 - City geometry...')
    
    // Add city ground - gray concrete
    const planeGeometry = new THREE.PlaneGeometry(50, 50)
    const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 })
    const plane = new THREE.Mesh(planeGeometry, planeMaterial)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = 0
    plane.receiveShadow = true
    plane.name = 'Ground'
    this.scene.add(plane)
    
    // Add city walls
    const wallGeometry = new THREE.BoxGeometry(50, 10, 1)
    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x606060 })
    
    const walls = [
      { pos: [0, 5, -25], rot: [0, 0, 0] },
      { pos: [0, 5, 25], rot: [0, Math.PI, 0] },
      { pos: [-25, 5, 0], rot: [0, Math.PI / 2, 0] },
      { pos: [25, 5, 0], rot: [0, -Math.PI / 2, 0] }
    ]
    
    walls.forEach(({ pos, rot }) => {
      const wall = new THREE.Mesh(wallGeometry, wallMaterial)
      wall.position.set(pos[0], pos[1], pos[2])
      wall.rotation.set(rot[0], rot[1], rot[2])
      wall.castShadow = true
      wall.receiveShadow = true
      wall.name = `Wall_${pos[0]}_${pos[2]}`
      this.scene.add(wall)
    })
    
    // Add city buildings (boxes)
    const buildingMaterial = new THREE.MeshPhongMaterial({ color: 0x404040 })
    const buildings = [
      { pos: [8, 3, 8], size: [4, 6, 4] },
      { pos: [-8, 2.5, -8], size: [5, 5, 5] },
      { pos: [15, 4, -10], size: [3, 8, 3] },
      { pos: [-12, 2, 12], size: [6, 4, 6] },
      { pos: [0, 3.5, 0], size: [4, 7, 4] }
    ]
    
    buildings.forEach(({ pos, size }, index) => {
      const buildingGeometry = new THREE.BoxGeometry(size[0], size[1], size[2])
      const building = new THREE.Mesh(buildingGeometry, buildingMaterial)
      building.position.set(pos[0], pos[1], pos[2])
      building.castShadow = true
      building.receiveShadow = true
      building.name = `Building_${index}`
      this.scene.add(building)
    })
    
    logger.debug(`Level 1 geometry complete. Scene has ${this.scene.children.length} children`)
  }

  private createLevel2Geometry(): void {
    logger.debug('Creating Level 2 - Forest geometry...')
    
    // Add forest ground - green grass
    const planeGeometry = new THREE.PlaneGeometry(50, 50)
    const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x2d5016 })
    const plane = new THREE.Mesh(planeGeometry, planeMaterial)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = 0
    plane.receiveShadow = true
    plane.name = 'Ground'
    this.scene.add(plane)
    
    // Add forest boundaries - natural rock walls
    const wallGeometry = new THREE.BoxGeometry(50, 10, 1)
    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x4a4a4a })
    
    const walls = [
      { pos: [0, 5, -25], rot: [0, 0, 0] },
      { pos: [0, 5, 25], rot: [0, Math.PI, 0] },
      { pos: [-25, 5, 0], rot: [0, Math.PI / 2, 0] },
      { pos: [25, 5, 0], rot: [0, -Math.PI / 2, 0] }
    ]
    
    walls.forEach(({ pos, rot }) => {
      const wall = new THREE.Mesh(wallGeometry, wallMaterial)
      wall.position.set(pos[0], pos[1], pos[2])
      wall.rotation.set(rot[0], rot[1], rot[2])
      wall.castShadow = true
      wall.receiveShadow = true
      wall.name = `Wall_${pos[0]}_${pos[2]}`
      this.scene.add(wall)
    })
    
    // Add trees (cylinders)
    const treeTrunkMaterial = new THREE.MeshPhongMaterial({ color: 0x4a3c28 })
    const treeLeavesMaterial = new THREE.MeshPhongMaterial({ color: 0x228b22 })
    
    const trees = [
      { pos: [10, 0, 10], height: 6, radius: 0.8 },
      { pos: [-12, 0, -8], height: 8, radius: 1 },
      { pos: [15, 0, -15], height: 5, radius: 0.6 },
      { pos: [-8, 0, 12], height: 7, radius: 0.9 },
      { pos: [5, 0, -5], height: 6, radius: 0.7 },
      { pos: [-18, 0, 5], height: 9, radius: 1.2 }
    ]
    
    trees.forEach(({ pos, height, radius }, index) => {
      // Tree trunk
      const trunkGeometry = new THREE.CylinderGeometry(radius, radius * 1.2, height)
      const trunk = new THREE.Mesh(trunkGeometry, treeTrunkMaterial)
      trunk.position.set(pos[0], height / 2, pos[2])
      trunk.castShadow = true
      trunk.receiveShadow = true
      trunk.name = `TreeTrunk_${index}`
      this.scene.add(trunk)
      
      // Tree leaves (sphere on top)
      const leavesGeometry = new THREE.SphereGeometry(radius * 3, 8, 6)
      const leaves = new THREE.Mesh(leavesGeometry, treeLeavesMaterial)
      leaves.position.set(pos[0], height + radius * 2, pos[2])
      leaves.castShadow = true
      leaves.receiveShadow = true
      leaves.name = `TreeLeaves_${index}`
      this.scene.add(leaves)
    })
    
    logger.debug(`Level 2 geometry complete. Scene has ${this.scene.children.length} children`)
  }
  */

  private setupGame(): void {
    // Create player
    this.player = new Player()
    this.scene.add(this.player)
    
    // Initialize player physics - DISABLED until we fix box collision
    // this.player.initPhysics()
    
    // Setup camera to follow player
    this.cameraController.setMode(CameraMode.THIRD_PERSON)
    this.cameraController.setTarget(this.player)
    
    // Start game
    this.gameManager.changeState(GameState.PLAYING)
    
    // Show HUD
    this.uiManager.showScreen('hud')
  }
  
  private setupLevel(): void {
    // Clear existing collectibles and enemies
    this.clearLevelEntities()
    
    // Spawn level-specific items
    if (this.currentLevel === 1) {
      this.spawnLevel1Collectibles()
      this.spawnLevel1Enemies()
    } else if (this.currentLevel === 2) {
      this.spawnLevel2Collectibles()
      this.spawnLevel2Enemies()
    }
    
    // Reset player position
    if (this.player) {
      this.player.position.set(0, 1, 0)
    }
  }
  
  private clearLevelEntities(): void {
    // Remove all collectibles and enemies from scene
    const entitiesToRemove: THREE.Object3D[] = []
    this.scene.traverse((object) => {
      if (object.userData.type === 'collectible' || object.userData.type === 'enemy') {
        entitiesToRemove.push(object)
      }
    })
    
    entitiesToRemove.forEach(entity => {
      this.scene.remove(entity)
      if (entity.userData.type === 'collectible' && entity instanceof Collectible) {
        this.collectiblePool.release(entity)
      }
    })
  }

  private spawnLevel1Collectibles(): void {
    // City-themed collectible positions (strategically placed in open areas)
    const positions = [
      [0, 1, 0],      // Center of map
      [-12, 1, 0],    // West open area
      [12, 1, 0],     // East open area
      [0, 1, -12],    // North open area
      [0, 1, 12],     // South open area
      [15, 1, 15],    // Southeast corner (open)
      [-15, 1, -15],  // Northwest corner (open)
      [15, 1, -15]    // Northeast corner (open)
    ]
    
    const colors = [0xffff00, 0xff00ff, 0x00ffff]
    
    positions.forEach((pos, index) => {
      const collectible = this.collectiblePool.get()
      collectible.setValue(10 + index * 5)
      collectible.setColor(colors[index % colors.length])
      collectible.position.set(pos[0], pos[1], pos[2])
      collectible.baseY = pos[1]
      this.scene.add(collectible)
    })
  }
  
  private spawnLevel2Collectibles(): void {
    // Forest-themed collectible positions (in clearings between trees)
    const positions = [
      [0, 1, 0],      // Center clearing
      [-15, 1, 0],    // West clearing
      [15, 1, 0],     // East clearing  
      [0, 1, -15],    // North clearing
      [0, 1, 15],     // South clearing
      [18, 1, 18],    // Far corner clearing
      [-18, 1, -18],  // Opposite corner clearing
      [18, 1, -18],   // Northeast clearing
      [-18, 1, 18]    // Southwest clearing
    ]
    
    const colors = [0x00ff00, 0xffff00, 0xff8800] // Nature colors
    
    positions.forEach((pos, index) => {
      const collectible = this.collectiblePool.get()
      collectible.setValue(15 + index * 5) // Higher value in level 2
      collectible.setColor(colors[index % colors.length])
      collectible.position.set(pos[0], pos[1], pos[2])
      collectible.baseY = pos[1]
      this.scene.add(collectible)
    })
  }

  private spawnLevel1Enemies(): void {
    // City enemies - more mechanical/robotic theme
    const patrolEnemy1 = new Enemy(EnemyType.PATROL, 0xff0000)
    patrolEnemy1.position.set(10, 1, 10)
    patrolEnemy1.setTarget(this.player!)
    patrolEnemy1.setPatrolPoints([
      new THREE.Vector3(10, 1, 10),
      new THREE.Vector3(15, 1, 10),
      new THREE.Vector3(15, 1, 15),
      new THREE.Vector3(10, 1, 15)
    ])
    this.scene.add(patrolEnemy1)
    
    // Spawn shooter enemy in city
    const shooterEnemy = new Enemy(EnemyType.SHOOTER, 0x0000ff)
    shooterEnemy.position.set(-15, 1, 0)
    shooterEnemy.setTarget(this.player!)
    this.scene.add(shooterEnemy)
  }
  
  private spawnLevel2Enemies(): void {
    // Forest enemies - more organic/creature theme
    const patrolEnemy1 = new Enemy(EnemyType.PATROL, 0x8b4513) // Brown
    patrolEnemy1.position.set(-10, 1, -10)
    patrolEnemy1.setTarget(this.player!)
    patrolEnemy1.setPatrolPoints([
      new THREE.Vector3(-10, 1, -10),
      new THREE.Vector3(-15, 1, -10),
      new THREE.Vector3(-15, 1, -15),
      new THREE.Vector3(-10, 1, -15)
    ])
    this.scene.add(patrolEnemy1)
    
    // Spawn multiple chasers in forest
    const chaserEnemy1 = new Enemy(EnemyType.CHASER, 0x228b22) // Forest green
    chaserEnemy1.position.set(0, 1, -15)
    chaserEnemy1.setTarget(this.player!)
    this.scene.add(chaserEnemy1)
    
    const chaserEnemy2 = new Enemy(EnemyType.CHASER, 0x228b22)
    chaserEnemy2.position.set(15, 1, 5)
    chaserEnemy2.setTarget(this.player!)
    this.scene.add(chaserEnemy2)
  }

  private createDebugUI(): void {
    this.debugInfo = document.createElement('div')
    this.debugInfo.style.position = 'absolute'
    this.debugInfo.style.top = '60px'
    this.debugInfo.style.left = '20px'
    this.debugInfo.style.color = '#ffffff'
    this.debugInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
    this.debugInfo.style.padding = '10px'
    this.debugInfo.style.borderRadius = '5px'
    this.debugInfo.style.fontFamily = 'monospace'
    this.debugInfo.style.fontSize = '12px'
    this.debugInfo.style.pointerEvents = 'none'
    this.debugInfo.style.userSelect = 'none'
    document.body.appendChild(this.debugInfo)
  }

  private updateDebugInfo(): void {
    if (!this.debugInfo) return
    
    const fps = this.timeManager.getFps()
    // Count entities by traversing scene
    let entityCount = 0
    this.scene.traverse((object) => {
      if (object.userData.type) {
        entityCount++
      }
    })
    const state = this.gameManager.getCurrentState()
    const health = this.player ? `${this.player.getHealth()}/${this.player.getMaxHealth()}` : 'N/A'
    const currentScene = this.sceneManager.getCurrentSceneName() || 'None'
    const poolStats = this.collectiblePool.getStats()
    
    this.debugInfo.innerHTML = `
      <div>FPS: ${fps}</div>
      <div>Entities: ${entityCount}</div>
      <div>State: ${state}</div>
      <div>Level: ${this.currentLevel} / ${this.totalLevels}</div>
      <div>Scene: ${currentScene}</div>
      <div>Score: ${this.score}</div>
      <div>Health: ${health}</div>
      <div>Collectible Pool: ${poolStats.activeCount}/${poolStats.totalCount} (${Math.round(poolStats.utilization * 100)}%)</div>
      <div style="margin-top: 10px;">
        <div>Controls:</div>
        <div>WASD/Arrows - Move</div>
        <div>Space - Jump</div>
        <div>F - Melee Attack</div>
        <div>Left Click - Shoot</div>
        <div>C - Spawn collectible</div>
        <div>R - Restart</div>
        <div>P - Pause</div>
        <div>M - Mute audio</div>
        <div>F5 - Save game</div>
        <div>F9 - Load game</div>
      </div>
    `
  }

  private resetGame(): void {
    // Reset score and level
    this.score = 0
    this.currentLevel = 1
    this.gameManager.resetGameData()
    this.gameManager.setLevel(1)
    
    // Load level 1
    this.sceneManager.loadScene('level1')
  }
  
  private checkCollisions(): void {
    if (!this.player) return
    
    // Find collectibles by traversing scene
    const collectibles: Collectible[] = []
    this.scene.traverse((object) => {
      if (object.userData.type === 'collectible' && object instanceof Collectible) {
        collectibles.push(object)
      }
    })
    
    const playerPos = this.player.position
    
    collectibles.forEach(collectible => {
      const distance = playerPos.distanceTo(collectible.position)
      if (distance < 1.5) { // Collection radius
        // Trigger collection
        eventBus.emit(GameEvents.ITEM_COLLECT, {
          item: collectible,
          collector: this.player,
          value: collectible.value
        })
        
        // Play collection effect
        collectible.collect()
        
        // Return to pool after a short delay for particle effect
        this.timeManager.setTimeout(() => {
          this.scene.remove(collectible)
          this.collectiblePool.release(collectible)
          
          // Check if all collectibles are collected
          this.checkLevelComplete()
        }, 0.5)
      }
    })
  }
  
  private checkLevelComplete(): void {
    // Count remaining collectibles
    let remainingCollectibles = 0
    this.scene.traverse((object) => {
      if (object.userData.type === 'collectible') {
        remainingCollectibles++
      }
    })
    
    logger.debug(`Collectibles remaining: ${remainingCollectibles}`)
    
    // If no collectibles left, level is complete
    if (remainingCollectibles === 0) {
      eventBus.emit(GameEvents.LEVEL_COMPLETE, {
        level: this.currentLevel,
        score: this.score
      })
      
      // Progress to next level
      this.progressToNextLevel()
    }
  }
  
  private progressToNextLevel(): void {
    logger.info(`Level ${this.currentLevel} complete! Score: ${this.score}`)
    
    // Calculate next level
    this.currentLevel++
    if (this.currentLevel > this.totalLevels) {
      this.currentLevel = 1 // Loop back to level 1
    }
    
    // Update game manager level
    this.gameManager.setLevel(this.currentLevel)
    
    // Load next level scene
    const nextScene = `level${this.currentLevel}`
    logger.info(`Loading ${nextScene}...`)
    
    // Add a small delay for transition
    this.timeManager.setTimeout(() => {
      this.sceneManager.loadScene(nextScene)
    }, 1.5)
  }
  
  private onMouseClick(event: MouseEvent): void {
    if (!this.player || this.gameManager.isInState(GameState.PAUSED)) return
    
    // Convert mouse position to normalized device coordinates (-1 to +1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    
    // Set up ray from camera through mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera)
    
    // Create a plane at player height for ray intersection
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1) // y = 1 plane
    const intersectPoint = new THREE.Vector3()
    this.raycaster.ray.intersectPlane(plane, intersectPoint)
    
    // Calculate direction from player to click point
    const direction = new THREE.Vector3()
    direction.subVectors(intersectPoint, this.player.position)
    direction.y = 0 // Keep bullets horizontal
    direction.normalize()
    
    // Shoot bullet
    this.player.shoot(direction)
  }
  
  private checkAttackCollisions(attacker: Player): void {
    if (!attacker) return
    
    // Find all enemies in the scene
    const enemies: Enemy[] = []
    this.scene.traverse((object) => {
      if (object.userData.type === 'enemy' && object instanceof Enemy) {
        enemies.push(object)
      }
    })
    
    const attackerPos = attacker.position
    const attackRange = attacker.attackRange
    
    enemies.forEach(enemy => {
      const distance = attackerPos.distanceTo(enemy.position)
      if (distance <= attackRange) {
        // Deal damage to enemy
        enemy.takeDamage(attacker.attackDamage)
        
        // Check if enemy died
        if (enemy.health <= 0) {
          // Emit death event
          eventBus.emit(GameEvents.ENEMY_DEATH, {
            enemy: enemy,
            position: enemy.position.clone()
          })
          
          // Remove enemy from scene
          this.scene.remove(enemy)
        }
      }
    })
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate)
    
    // Update time
    this.timeManager.update(performance.now())
    const deltaTime = this.timeManager.getDeltaTime()
    
    // Update input
    this.inputManager.update()
    
    // Handle input
    if (this.inputManager.isActionJustPressed('pause')) {
      const wasPaused = this.gameManager.isInState(GameState.PAUSED)
      this.gameManager.togglePause()
      // Play pause/unpause sound
      this.audioManager.play2D(wasPaused ? 'unpause' : 'pause', { volume: 0.3 })
    }
    
    if (this.inputManager.isActionJustPressed('restart')) {
      this.resetGame()
    }
    
    if (this.inputManager.isActionJustPressed('debugSpawn') && this.player) {
      const offset = 3
      const angle = Math.random() * Math.PI * 2
      const x = this.player.position.x + Math.cos(angle) * offset
      const z = this.player.position.z + Math.sin(angle) * offset
      
      const collectible = this.collectiblePool.get()
      collectible.setValue(50)
      collectible.setColor(0x00ffff)
      collectible.position.set(x, 1, z)
      collectible.baseY = 1
      this.scene.add(collectible)
    }
    
    if (this.inputManager.isActionJustPressed('mute')) {
      this.audioManager.toggleMute()
      logger.info(`Audio ${this.audioManager.isMuted() ? 'muted' : 'unmuted'}`)
    }
    
    if (this.inputManager.isActionJustPressed('save')) {
      if (this.gameManager.saveGame()) {
        logger.info('Game saved!')
      }
    }
    
    if (this.inputManager.isActionJustPressed('load')) {
      if (this.gameManager.loadGame()) {
        logger.info('Game loaded!')
        this.score = this.gameManager.getScore()
        // In a real game, you'd restore more state
      }
    }
    
    
    // Update game manager
    this.gameManager.update(deltaTime)
    
    // Update scene manager
    this.sceneManager.update(deltaTime)
    
    // Skip entity updates if paused
    const isPaused = this.gameManager.isInState(GameState.PAUSED)
    
    // Update entities only when playing
    if (this.gameManager.isInState(GameState.PLAYING) && !isPaused) {
      // Update physics system first
      this.physicsSystem.update(deltaTime)
      
      // Update player
      if (this.player) {
        this.player.update(deltaTime)
      }
      
      // Update all scene objects that have update methods
      this.scene.traverse((object) => {
        if (object !== this.player && 'update' in object && typeof object.update === 'function') {
          object.update(deltaTime)
        }
      })
      
      // Update bullets
      this.bulletPool.forEach(bullet => {
        if (bullet.active) {
          bullet.update(deltaTime)
        }
      })
      
      // Simple collision detection
      this.checkCollisions()
      this.checkBulletCollisions()
      
      // Camera controller will handle camera movement
      this.cameraController.update(deltaTime)
    }
    
    // Update UI
    this.uiManager.update(deltaTime)
    
    // Render the scene
    this.renderer.render(this.scene, this.camera)
    
    // Debug: Log scene info periodically
    if (Math.random() < 0.001) { // Log occasionally
      const meshes = this.scene.children.filter(child => child instanceof THREE.Mesh)
      logger.debug(`Rendering scene with ${this.scene.children.length} children, ${meshes.length} meshes`)
    }
    
    // Update debug info
    this.updateDebugInfo()
    
    // Clear input state at end of frame
    this.inputManager.lateUpdate()
  }

  private handleWebGLError(error: unknown): void {
    logger.error('WebGL initialization failed:', error)
    
    const loading = document.getElementById('loading')
    if (loading) {
      loading.innerHTML = `
        <div style="text-align: center;">
          <h2 style="color: #ff6b6b; margin-bottom: 10px;">WebGL Not Available</h2>
          <p style="margin-bottom: 20px;">Your browser or device doesn't support WebGL.</p>
          <p style="font-size: 14px;">Try:</p>
          <ul style="text-align: left; display: inline-block; font-size: 14px;">
            <li>Using Chrome, Firefox, or Edge</li>
            <li>Enabling hardware acceleration in browser settings</li>
            <li>Updating your graphics drivers</li>
            <li>Checking WebGL at <a href="https://get.webgl.org/" target="_blank" style="color: #00ff88;">get.webgl.org</a></li>
          </ul>
        </div>
      `
    }
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    
    // Remove event listeners
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
    }
    
    // Clean up systems
    this.inputManager.dispose()
    this.timeManager.reset()
    eventBus.clear()
    
    // Dispose Three.js resources
    if (this.renderer) {
      this.renderer.dispose()
    }
    
    if (this.scene) {
      this.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (child.material instanceof THREE.Material) {
            child.material.dispose()
          } else if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose())
          }
        }
      })
    }
    
    if (this.debugInfo) {
      this.debugInfo.remove()
    }
  }
  
  private checkBulletCollisions(): void {
    const bullets = this.bulletPool.filter(bullet => bullet.active)
    const enemies: Enemy[] = []
    
    // Find all enemies
    this.scene.traverse((object) => {
      if (object.userData.type === 'enemy' && object instanceof Enemy) {
        enemies.push(object)
      }
    })
    
    // Check each bullet against each enemy
    bullets.forEach(bullet => {
      if (!bullet.active) return
      
      enemies.forEach(enemy => {
        if (!enemy.visible) return
        
        const distance = bullet.position.distanceTo(enemy.position)
        if (distance < 1.0) { // Hit radius
          // Deal damage to enemy
          enemy.takeDamage(bullet.damage)
          
          // Check if enemy died
          if (enemy.health <= 0) {
            eventBus.emit(GameEvents.ENEMY_DEATH, {
              enemy,
              position: enemy.position.clone()
            })
            this.scene.remove(enemy)
          }
          
          // Remove bullet
          this.scene.remove(bullet)
          this.bulletPool.release(bullet)
          
          // Visual effect - flash enemy red
          if (enemy.mesh && enemy.mesh.material instanceof THREE.MeshPhongMaterial) {
            const material = enemy.mesh.material
            const originalColor = material.color.getHex()
            material.color.setHex(0xffffff)
            
            this.timeManager.setTimeout(() => {
              if (enemy.mesh && enemy.mesh.material instanceof THREE.MeshPhongMaterial) {
                enemy.mesh.material.color.setHex(originalColor)
              }
            }, 0.1)
          }
        }
      })
    })
  }
}

// Initialize the app
new GameApp()

// Handle hot module replacement in development
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    // Cleanup code for HMR
  })
}