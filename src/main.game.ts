import * as THREE from 'three'
import { createScene } from './scene'
import { handleResize } from './utils/resize'
import { GameManager, GameState } from './systems/GameManager'
import { TimeManager } from './systems/TimeManager'
import { InputManager } from './systems/InputManager'
import { EntityManager } from './systems/EntityManager'
import { AssetLoader } from './systems/AssetLoader'
import { eventBus, GameEvents } from './utils/EventBus'
import { Player } from './entities/Player'
import { Collectible } from './entities/Collectible'

class GameApp {
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private animationId: number | null = null
  
  // Game systems
  private gameManager!: GameManager
  private timeManager!: TimeManager
  private inputManager!: InputManager
  private entityManager!: EntityManager
  private assetLoader!: AssetLoader
  
  // Game state
  private player?: Player
  private score = 0
  private debugInfo?: HTMLDivElement

  constructor() {
    try {
      // Initialize Three.js components
      this.scene = createScene()
      this.camera = this.createCamera()
      this.renderer = this.createRenderer()
      
      // Initialize game systems
      this.initializeSystems()
      
      // Hide loading indicator
      const loading = document.getElementById('loading')
      if (loading) loading.style.display = 'none'
      
      // Setup
      this.setupScene()
      this.setupEventListeners()
      this.setupGame()
      this.createDebugUI()
      
      // Start animation loop
      this.animate()
    } catch (error) {
      this.handleWebGLError(error)
    }
  }

  private initializeSystems(): void {
    // Initialize core systems
    this.timeManager = TimeManager.getInstance()
    this.inputManager = InputManager.getInstance()
    this.gameManager = GameManager.getInstance()
    this.entityManager = EntityManager.initialize(this.scene)
    this.assetLoader = AssetLoader.getInstance()
    
    // Preload common assets
    this.assetLoader.preloadCommonTextures()
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
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

  private setupScene(): void {
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -20
    directionalLight.shadow.camera.right = 20
    directionalLight.shadow.camera.top = 20
    directionalLight.shadow.camera.bottom = -20
    this.scene.add(directionalLight)

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
      wall.position.set(...pos)
      wall.rotation.set(...rot)
      wall.castShadow = true
      wall.receiveShadow = true
      this.scene.add(wall)
    })
  }

  private setupEventListeners(): void {
    // Window resize
    window.addEventListener('resize', () => {
      handleResize(this.camera, this.renderer)
    })
    
    // Game events
    eventBus.on(GameEvents.ITEM_COLLECT, (event: any) => {
      this.score += event.value
      this.gameManager.setScore(this.score)
      console.log(`Score: ${this.score}`)
    })
    
    eventBus.on(GameEvents.PLAYER_DEATH, () => {
      this.gameManager.changeState(GameState.GAME_OVER)
      this.timeManager.setTimeout(() => {
        this.resetGame()
      }, 3)
    })
    
    // Input events
    this.inputManager.addAction('restart', { keys: ['r', 'R'] })
    this.inputManager.addAction('debugSpawn', { keys: ['c', 'C'] })
  }

  private setupGame(): void {
    // Create player
    this.player = new Player()
    this.entityManager.addEntity(this.player)
    
    // Create some collectibles
    this.spawnCollectibles()
    
    // Start game
    this.gameManager.changeState(GameState.PLAYING)
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
      collectible.setPosition(...pos)
      this.entityManager.addEntity(collectible)
    })
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
    
    this.debugInfo.innerHTML = `
      <div>FPS: ${fps}</div>
      <div>Entities: ${entities}</div>
      <div>State: ${state}</div>
      <div>Score: ${this.score}</div>
      <div>Health: ${health}</div>
      <div style="margin-top: 10px;">
        <div>Controls:</div>
        <div>WASD/Arrows - Move</div>
        <div>Space - Jump</div>
        <div>Mouse - Look</div>
        <div>C - Spawn collectible</div>
        <div>R - Restart</div>
        <div>P - Pause</div>
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
      this.gameManager.togglePause()
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
    
    // Update game manager
    this.gameManager.update(deltaTime)
    
    // Skip entity updates if paused
    const isPaused = this.gameManager.isInState(GameState.PAUSED)
    
    // Update entities only when playing
    if (this.gameManager.isInState(GameState.PLAYING) && !isPaused) {
      this.entityManager.update(deltaTime)
      
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
    
    // Render the scene
    this.renderer.render(this.scene, this.camera)
    
    // Update debug info
    this.updateDebugInfo()
    
    // Clear input state at end of frame
    this.inputManager.lateUpdate()
  }

  private handleWebGLError(error: unknown): void {
    console.error('WebGL initialization failed:', error)
    
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
    
    // Clean up systems
    this.entityManager.clear()
    
    if (this.renderer) {
      this.renderer.dispose()
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