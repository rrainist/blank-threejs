import * as THREE from 'three'
import { createScene } from './scene'
import { handleResize } from './utils/resize'
import { GameManager, GameState } from './systems/GameManager'
import { TimeManager } from './systems/TimeManager'
import { InputManager } from './systems/InputManager'
import { SimpleEntityManager } from './systems/EntityManager.simple'
import { AudioManager } from './systems/AudioManager'
import { eventBus, GameEvents } from './utils/EventBus'
import { logger } from './utils/Logger'
import { ENEMY } from './constants/GameConstants'

// Import simplified entities
import { Player } from './entities/Player.simple'
import { Collectible } from './entities/Collectible.simple'
import { Enemy, EnemyType } from './entities/Enemy.simple'
import { ObjectPool } from './utils/ObjectPool'

class SimpleGameApp {
  private scene!: THREE.Scene
  private camera!: THREE.OrthographicCamera
  private renderer!: THREE.WebGLRenderer
  private animationId: number | null = null
  private resizeHandler!: () => void
  
  // Game systems
  private gameManager!: GameManager
  private timeManager!: TimeManager
  private inputManager!: InputManager
  private entityManager!: SimpleEntityManager
  private audioManager!: AudioManager
  
  // Game entities
  private player!: Player
  private collectibles: Collectible[] = []
  private enemies: Enemy[] = []
  private collectiblePool!: ObjectPool<Collectible>
  
  // Game state
  private score = 0

  constructor() {
    this.init()
  }

  private async init(): Promise<void> {
    try {
      // Initialize Three.js
      this.scene = createScene()
      this.camera = this.createCamera()
      this.renderer = this.createRenderer()
      
      // Initialize systems
      this.timeManager = TimeManager.getInstance()
      this.inputManager = InputManager.getInstance()
      this.gameManager = GameManager.getInstance()
      this.entityManager = new SimpleEntityManager(this.scene)
      this.audioManager = AudioManager.initialize(this.camera)
      
      // Load basic sounds for the simplified game
      this.loadBasicSounds()
      
      // Create object pool for collectibles
      this.collectiblePool = new ObjectPool<Collectible>(
        () => new Collectible(10, 0xffff00),
        20,
        100,
        (collectible) => collectible.reset()
      )
      
      // Hide loading
      const loading = document.getElementById('loading')
      if (loading) loading.style.display = 'none'
      
      // Setup
      this.setupEventListeners()
      this.createLevel()
      this.setupGame()
      
      // Start
      this.gameManager.changeState(GameState.PLAYING)
      this.animate()
      
    } catch (error) {
      logger.error('Game initialization failed:', error)
    }
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

  private createLevel(): void {
    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    this.scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.left = -20
    directionalLight.shadow.camera.right = 20
    directionalLight.shadow.camera.top = 20
    directionalLight.shadow.camera.bottom = -20
    this.scene.add(directionalLight)
    
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(50, 50)
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)
    
    // Walls
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
    
    // Fog
    this.scene.fog = new THREE.Fog(0xcccccc, 20, 100)
  }

  private setupGame(): void {
    // Create player
    this.player = new Player()
    this.entityManager.add(this.player)
    
    // Create collectibles
    this.spawnCollectibles()
    
    // Create enemies
    this.spawnEnemies()
  }

  private spawnCollectibles(): void {
    const positions = [
      [5, 1, 5], [-5, 1, 5], [5, 1, -5], [-5, 1, -5],
      [10, 1, 0], [-10, 1, 0], [0, 1, 10], [0, 1, -10],
      [15, 1, 15], [-15, 1, -15]
    ]
    
    const colors = [0xffff00, 0xff00ff, 0x00ffff, 0xff8800, 0x00ff00]
    
    positions.forEach((pos, index) => {
      const collectible = this.collectiblePool.get()
      collectible.setValue(10 + index * 5)
      collectible.setColor(colors[index % colors.length])
      collectible.position.set(pos[0], pos[1], pos[2])
      collectible.baseY = pos[1]
      this.collectibles.push(collectible)
      this.entityManager.add(collectible)
    })
  }

  private spawnEnemies(): void {
    // Patrol enemies
    const patrol1 = new Enemy(EnemyType.PATROL, 0xff0000)
    patrol1.position.set(10, 1, 10)
    patrol1.setTarget(this.player)
    patrol1.setPatrolPoints([
      new THREE.Vector3(10, 1, 10),
      new THREE.Vector3(15, 1, 10),
      new THREE.Vector3(15, 1, 15),
      new THREE.Vector3(10, 1, 15)
    ])
    this.enemies.push(patrol1)
    this.entityManager.add(patrol1)
    
    const patrol2 = new Enemy(EnemyType.PATROL, 0xff0000)
    patrol2.position.set(-10, 1, -10)
    patrol2.setTarget(this.player)
    patrol2.setPatrolPoints([
      new THREE.Vector3(-10, 1, -10),
      new THREE.Vector3(-15, 1, -10),
      new THREE.Vector3(-15, 1, -15),
      new THREE.Vector3(-10, 1, -15)
    ])
    this.enemies.push(patrol2)
    this.entityManager.add(patrol2)
    
    // Chaser enemy
    const chaser = new Enemy(EnemyType.CHASER, 0xff00ff)
    chaser.position.set(0, 1, -15)
    chaser.setTarget(this.player)
    this.enemies.push(chaser)
    this.entityManager.add(chaser)
    
    // Shooter enemy
    const shooter = new Enemy(EnemyType.SHOOTER, 0x0000ff)
    shooter.position.set(-15, 1, 0)
    shooter.setTarget(this.player)
    this.enemies.push(shooter)
    this.entityManager.add(shooter)
  }

  private setupEventListeners(): void {
    // Window resize
    this.resizeHandler = () => handleResize(this.camera, this.renderer)
    window.addEventListener('resize', this.resizeHandler)
    
    // Input actions
    this.inputManager.addAction('restart', { keys: ['r', 'R'] })
    this.inputManager.addAction('debugSpawn', { keys: ['c', 'C'] })
  }

  private checkCollisions(): void {
    // Player vs Collectibles
    this.collectibles = this.collectibles.filter(collectible => {
      if (!collectible.visible) return false
      
      const distance = this.player.position.distanceTo(collectible.position)
      if (distance < 1.5) {
        // Collect it
        collectible.collect()
        this.score += collectible.value
        this.gameManager.setScore(this.score)
        logger.info(`Score: ${this.score}`)
        
        // Remove and return to pool
        this.entityManager.remove(collectible)
        this.collectiblePool.release(collectible)
        return false
      }
      return true
    })
    
    // Player vs Enemies
    this.enemies.forEach(enemy => {
      if (enemy.health <= 0) return
      
      const distance = this.player.position.distanceTo(enemy.position)
      
      // Enemy attack
      if (distance < enemy.attackRange) {
        const now = Date.now() / 1000
        if (now - enemy.lastAttackTime > enemy.attackCooldown) {
          enemy.lastAttackTime = now
          this.player.takeDamage(enemy.attackDamage)
          
          if (this.player.health <= 0) {
            this.gameManager.changeState(GameState.GAME_OVER)
            logger.info('Game Over!')
          }
        }
      }
      
      // Player attack
      if (this.inputManager.isActionJustPressed('attack') && distance < this.player.attackRange) {
        enemy.takeDamage(this.player.attackDamage)
        
        if (enemy.health <= 0) {
          this.score += ENEMY.COMMON.DEATH_POINTS
          this.gameManager.setScore(this.score)
          
          // Remove enemy after delay
          setTimeout(() => {
            this.entityManager.remove(enemy)
            const index = this.enemies.indexOf(enemy)
            if (index > -1) this.enemies.splice(index, 1)
          }, 500)
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
    if (this.inputManager.isActionJustPressed('restart')) {
      this.resetGame()
    }
    
    if (this.inputManager.isActionJustPressed('debugSpawn')) {
      const angle = Math.random() * Math.PI * 2
      const distance = 3
      const collectible = this.collectiblePool.get()
      collectible.position.set(
        this.player.position.x + Math.cos(angle) * distance,
        1,
        this.player.position.z + Math.sin(angle) * distance
      )
      collectible.baseY = 1
      this.collectibles.push(collectible)
      this.entityManager.add(collectible)
    }
    
    // Update game
    if (this.gameManager.isInState(GameState.PLAYING)) {
      // Update entities
      this.entityManager.update(deltaTime)
      
      // Check collisions
      this.checkCollisions()
      
      // Camera follow player
      this.camera.position.x = this.player.position.x
      this.camera.position.z = this.player.position.z + 10
      this.camera.lookAt(this.player.position)
    }
    
    // Render
    this.renderer.render(this.scene, this.camera)
    
    // Clear input state
    this.inputManager.lateUpdate()
  }

  private resetGame(): void {
    // Clear entities
    this.entityManager.clear()
    this.collectibles = []
    this.enemies = []
    
    // Reset score
    this.score = 0
    this.gameManager.resetGameData()
    
    // Setup again
    this.setupGame()
    this.gameManager.changeState(GameState.PLAYING)
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    
    window.removeEventListener('resize', this.resizeHandler)
    this.entityManager.clear()
    this.renderer.dispose()
  }
}

// Initialize the game
new SimpleGameApp()

// Hot module replacement
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    // Cleanup for HMR
  })
}