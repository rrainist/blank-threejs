import * as THREE from 'three'
import { createScene } from './scene'
import { handleResize } from './utils/resize'
import { GameManager, GameState } from './systems/GameManager'
import { TimeManager } from './systems/TimeManager'
import { InputManager } from './systems/InputManager'
import { EntityManager } from './systems/EntityManager'
import { AssetLoader } from './systems/AssetLoader'
import { AudioManager } from './systems/AudioManager'
import { SceneManager } from './systems/SceneManager'
import { PhysicsManager } from './systems/PhysicsManager'
import { UIManager } from './systems/UIManager'
import { eventBus, GameEvents } from './utils/EventBus'
import { ItemCollectEvent, PlayerDamageEvent, PlayerJumpEvent, PlayerAttackEvent, EnemyDeathEvent, EnemyAttackEvent } from './types/events'
import { logger } from './utils/Logger'
import { GAME, CAMERA, RENDERER, PHYSICS, SCENE, ENEMY } from './constants/GameConstants'
import { Player } from './entities/Player'
import { Collectible } from './entities/Collectible'
import { Enemy, EnemyType } from './entities/Enemy'

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
  private entityManager!: EntityManager
  private assetLoader!: AssetLoader
  private audioManager!: AudioManager
  private sceneManager!: SceneManager
  private physicsManager!: PhysicsManager
  private uiManager!: UIManager
  
  // Game state
  private player?: Player
  private score = 0
  private debugInfo?: HTMLDivElement

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
      
      // Hide loading indicator
      const loading = document.getElementById('loading')
      if (loading) loading.style.display = 'none'
      
      // Setup
      this.setupEventListeners()
      
      // Load initial scene
      await this.sceneManager.loadScene('gameLevel', false)
      
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
    this.entityManager = EntityManager.initialize(this.scene)
    this.assetLoader = AssetLoader.getInstance()
    this.audioManager = AudioManager.initialize(this.camera)
    this.sceneManager = SceneManager.initialize(this.scene, this.camera, this.renderer)
    this.physicsManager = PhysicsManager.initialize({
      gravity: new THREE.Vector3(0, -30, 0),
      enableDebugDraw: false
    })
    this.uiManager = UIManager.initialize({
      debugMode: false
    })
    
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
    
    eventBus.on('player:jump', (event: PlayerJumpEvent) => {
      this.playJumpSound()
    })
    
    eventBus.on('player:attack', (event: PlayerAttackEvent) => {
      // Play attack sound at player position
      this.audioManager.play3D('button', event.player.position, {
        volume: 0.4,
        refDistance: 5
      })
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
    this.inputManager.addAction('restart', { keys: ['r', 'R'] })
    this.inputManager.addAction('debugSpawn', { keys: ['c', 'C'] })
    this.inputManager.addAction('mute', { keys: ['m', 'M'] })
    this.inputManager.addAction('save', { keys: ['F5'] })
    this.inputManager.addAction('load', { keys: ['F9'] })
    this.inputManager.addAction('switchScene', { keys: ['n', 'N'] })
    this.inputManager.addAction('debugPhysics', { keys: ['F1'] })
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
    // Play at the collectible's position for 3D sound
    const collectibles = this.entityManager.getEntitiesByTag('collectible')
    if (collectibles.length > 0) {
      const lastCollectible = collectibles[collectibles.length - 1]
      this.audioManager.play3D('collect', lastCollectible.position, {
        volume: 0.5,
        refDistance: 5,
        maxDistance: 20
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
        volume: 0.7,
        refDistance: 10
      })
    }
  }

  private playGameOverSound(): void {
    // Play as 2D sound (UI sound)
    this.audioManager.play2D('gameOver', { volume: 0.6 })
  }

  private playJumpSound(): void {
    // Play at player position
    if (this.player) {
      this.audioManager.play3D('jump', this.player.position, {
        volume: 0.3,
        refDistance: 5,
        maxDistance: 15
      })
    }
  }

  private setupScenes(): void {
    // Initialize preset scenes
    this.sceneManager.initializePresetScenes()
    
    // Register game level scene
    this.sceneManager.registerScene('gameLevel', {
      name: 'gameLevel',
      fogColor: 0xcccccc,
      fogNear: 20,
      fogFar: 100,
      ambientLight: {
        color: 0x404040,
        intensity: 0.6
      },
      directionalLight: {
        color: 0xffffff,
        intensity: 0.8,
        position: new THREE.Vector3(10, 10, 5),
        castShadow: true
      },
      onLoad: () => {
        logger.info('Game level loaded')
        // Create level geometry
        this.createLevelGeometry()
      }
    })
    
    // Register night scene variant
    this.sceneManager.registerScene('gameLevelNight', {
      name: 'gameLevelNight',
      fogColor: 0x000033,
      fogNear: 10,
      fogFar: 50,
      ambientLight: {
        color: 0x222244,
        intensity: 0.2
      },
      directionalLight: {
        color: 0x4444ff,
        intensity: 0.3,
        position: new THREE.Vector3(-20, 30, -10),
        castShadow: true
      },
      onLoad: () => {
        logger.info('Night level loaded')
        this.createLevelGeometry()
      }
    })
  }

  private createLevelGeometry(): void {
    // Add larger ground plane
    const planeGeometry = new THREE.PlaneGeometry(50, 50)
    const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 })
    const plane = new THREE.Mesh(planeGeometry, planeMaterial)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = 0
    plane.receiveShadow = true
    this.scene.add(plane)
    
    // Add some walls
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
      this.scene.add(wall)
    })
  }

  private setupGame(): void {
    // Create player
    this.player = new Player()
    this.entityManager.addEntity(this.player)
    
    // Create some collectibles
    this.spawnCollectibles()
    
    // Create some enemies
    this.spawnEnemies()
    
    // Start game
    this.gameManager.changeState(GameState.PLAYING)
    
    // Show HUD
    this.uiManager.showScreen('hud')
  }

  private spawnCollectibles(): void {
    const positions = [
      [5, 1, 5],
      [-5, 1, 5],
      [5, 1, -5],
      [-5, 1, -5],
      [10, 1, 0],
      [-10, 1, 0],
      [0, 1, 10],
      [0, 1, -10],
      [15, 1, 15],
      [-15, 1, -15]
    ]
    
    positions.forEach((pos, index) => {
      const collectible = new Collectible(10 + index * 5, 0xffff00)
      collectible.setPosition(pos[0], pos[1], pos[2])
      this.entityManager.addEntity(collectible)
    })
  }

  private spawnEnemies(): void {
    // Spawn patrol enemies
    const patrolEnemy1 = new Enemy(EnemyType.PATROL, 0xff0000)
    patrolEnemy1.setPosition(10, 1, 10)
    patrolEnemy1.setTarget(this.player!)
    patrolEnemy1.setPatrolPoints([
      new THREE.Vector3(10, 1, 10),
      new THREE.Vector3(15, 1, 10),
      new THREE.Vector3(15, 1, 15),
      new THREE.Vector3(10, 1, 15)
    ])
    this.entityManager.addEntity(patrolEnemy1)
    
    const patrolEnemy2 = new Enemy(EnemyType.PATROL, 0xff0000)
    patrolEnemy2.setPosition(-10, 1, -10)
    patrolEnemy2.setTarget(this.player!)
    patrolEnemy2.setPatrolPoints([
      new THREE.Vector3(-10, 1, -10),
      new THREE.Vector3(-15, 1, -10),
      new THREE.Vector3(-15, 1, -15),
      new THREE.Vector3(-10, 1, -15)
    ])
    this.entityManager.addEntity(patrolEnemy2)
    
    // Spawn chaser enemy
    const chaserEnemy = new Enemy(EnemyType.CHASER, 0xff00ff)
    chaserEnemy.setPosition(0, 1, -15)
    chaserEnemy.setTarget(this.player!)
    this.entityManager.addEntity(chaserEnemy)
    
    // Spawn shooter enemy
    const shooterEnemy = new Enemy(EnemyType.SHOOTER, 0x0000ff)
    shooterEnemy.setPosition(-15, 1, 0)
    shooterEnemy.setTarget(this.player!)
    this.entityManager.addEntity(shooterEnemy)
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
    const entities = this.entityManager.getEntityCount()
    const state = this.gameManager.getCurrentState()
    const health = this.player ? `${this.player.getHealth()}/${this.player.getMaxHealth()}` : 'N/A'
    const currentScene = this.sceneManager.getCurrentSceneName() || 'None'
    
    this.debugInfo.innerHTML = `
      <div>FPS: ${fps}</div>
      <div>Entities: ${entities}</div>
      <div>State: ${state}</div>
      <div>Scene: ${currentScene}</div>
      <div>Score: ${this.score}</div>
      <div>Health: ${health}</div>
      <div style="margin-top: 10px;">
        <div>Controls:</div>
        <div>WASD/Arrows - Move</div>
        <div>Space - Jump</div>
        <div>F/Left Click - Attack</div>
        <div>Mouse - Look</div>
        <div>C - Spawn collectible</div>
        <div>R - Restart</div>
        <div>P - Pause</div>
        <div>N - Switch scene</div>
        <div>M - Mute audio</div>
        <div>F5 - Save game</div>
        <div>F9 - Load game</div>
      </div>
    `
  }

  private resetGame(): void {
    // Clear entities
    this.entityManager.clear()
    
    // Reset score
    this.score = 0
    this.gameManager.resetGameData()
    
    // Recreate game
    this.setupGame()
  }
  
  private checkCollisions(): void {
    if (!this.player) return
    
    // Simple distance-based collision for collectibles
    const collectibles = this.entityManager.getEntitiesByTag('collectible')
    const playerPos = this.player.position
    
    collectibles.forEach(collectible => {
      const distance = playerPos.distanceTo(collectible.position)
      if (distance < 1.5) { // Collection radius
        // Trigger collection
        eventBus.emit(GameEvents.ITEM_COLLECT, {
          item: collectible,
          collector: this.player,
          value: (collectible as Collectible).getValue()
        })
        
        // Remove collectible
        this.entityManager.removeEntity(collectible)
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
      
      const collectible = new Collectible(50, 0x00ffff)
      collectible.setPosition(x, 1, z)
      this.entityManager.addEntity(collectible)
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
    
    if (this.inputManager.isActionJustPressed('switchScene')) {
      // Toggle between day and night scenes
      const currentScene = this.sceneManager.getCurrentSceneName()
      const newScene = currentScene === 'gameLevel' ? 'gameLevelNight' : 'gameLevel'
      this.sceneManager.loadScene(newScene)
      logger.info(`Switched to ${newScene}`)
    }
    
    // Update game manager
    this.gameManager.update(deltaTime)
    
    // Update scene manager
    this.sceneManager.update(deltaTime)
    
    // Skip entity updates if paused
    const isPaused = this.gameManager.isInState(GameState.PAUSED)
    
    // Update entities only when playing
    if (this.gameManager.isInState(GameState.PLAYING) && !isPaused) {
      this.entityManager.update(deltaTime)
      
      // Update physics
      this.physicsManager.update(deltaTime)
      
      // Simple collision detection
      this.checkCollisions()
      
      // Simple camera follow
      if (this.player) {
        // Position camera behind and above player
        this.camera.position.x = this.player.position.x
        this.camera.position.y = this.player.position.y + 10
        this.camera.position.z = this.player.position.z + 10
        
        // Look at player
        this.camera.lookAt(this.player.position)
      }
    }
    
    // Update UI
    this.uiManager.update(deltaTime)
    
    // Render the scene
    this.renderer.render(this.scene, this.camera)
    
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
    this.entityManager.clear()
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
}

// Initialize the app
new GameApp()

// Handle hot module replacement in development
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    // Cleanup code for HMR
  })
}