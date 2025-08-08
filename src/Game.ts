import * as THREE from 'three'
import { GameManager, GameState } from './systems/GameManager'
import { TimeManager } from './systems/TimeManager'
import { InputManager } from './systems/InputManager'
import { AssetLoader } from './systems/AssetLoader'
import { AudioManager } from './systems/AudioManager'
import { UIManager } from './systems/UIManager'
import { CameraController } from './systems/CameraController'
import { PhysicsSystem } from './systems/PhysicsSystem'
import { EffectsSystem } from './systems/EffectsSystem'
import { eventBus, GameEvents } from './utils/EventBus'
import { logger } from './utils/Logger'
import { Player } from './entities/Player'
import { Enemy } from './entities/Enemy'
import { Collectible } from './entities/Collectible'
import { Bullet } from './entities/Bullet'
import { ObjectPool } from './utils/ObjectPool'
import { createLevel } from './Level'

export class Game {
  private scene: THREE.Scene
  private camera: THREE.OrthographicCamera
  private renderer: THREE.WebGLRenderer
  
  // Systems
  private gameManager: GameManager
  private timeManager: TimeManager
  private inputManager: InputManager
  private assetLoader: AssetLoader
  private audioManager: AudioManager
  private uiManager: UIManager
  private cameraController: CameraController
  private physicsSystem: PhysicsSystem
  private effectsSystem: EffectsSystem
  
  // Game entities
  private player?: Player
  private enemies: Enemy[] = []
  private collectibles: Collectible[] = []
  private collectiblePool: ObjectPool<Collectible>
  private bulletPool: ObjectPool<Bullet>
  
  // Game state
  private currentLevel = 1
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  
  constructor(scene: THREE.Scene, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    
    // Initialize systems
    this.gameManager = GameManager.getInstance()
    this.timeManager = TimeManager.getInstance()
    this.inputManager = InputManager.getInstance()
    this.assetLoader = AssetLoader.getInstance()
    this.audioManager = AudioManager.initialize()
    this.uiManager = UIManager.initialize({ debugMode: false })
    this.cameraController = CameraController.initialize(camera)
    this.physicsSystem = PhysicsSystem.getInstance()
    this.effectsSystem = EffectsSystem.initialize(scene)
    
    // Initialize pools
    this.collectiblePool = new ObjectPool<Collectible>(
      () => new Collectible(10, 0xffff00),
      20,
      100,
      (collectible) => {
        collectible.position.set(0, -1000, 0)
        if (collectible.parent) {
          collectible.parent.remove(collectible)
        }
      }
    )
    
    this.bulletPool = new ObjectPool<Bullet>(
      () => new Bullet(),
      20,
      50,
      (bullet) => {
        bullet.position.set(0, -1000, 0)
        if (bullet.parent) {
          bullet.parent.remove(bullet)
        }
      }
    )
    
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    
    logger.info('Game initialized')
  }
  
  async initialize(): Promise<void> {
    // Load assets
    await this.loadAssets()
    
    // Setup event listeners
    this.setupEventListeners()
    
    // Create UI
    this.uiManager.createCommonScreens()
    this.uiManager.createHUD()
    this.uiManager.createPauseMenu()
    
    // Start game
    this.startGame()
  }
  
  private async loadAssets(): Promise<void> {
    // Create common textures
    this.assetLoader.createCommonTextures()
    
    // Load sounds
    const soundsToLoad = [
      { key: 'collect', url: 'assets/sounds/General Sounds/Coins/sfx_coin_single1.wav' },
      { key: 'damage', url: 'assets/sounds/General Sounds/Simple Damage Sounds/sfx_damage_hit5.wav' },
      { key: 'jump', url: 'assets/sounds/Movement/Jumping and Landing/sfx_movement_jump8.wav' },
      { key: 'shoot', url: 'assets/sounds/General Sounds/Buttons/sfx_sounds_button6.wav' },
      { key: 'enemyDeath', url: 'assets/sounds/General Sounds/Positive Sounds/sfx_sounds_powerup10.wav' }
    ]
    
    const loadPromises = soundsToLoad.map(({ key, url }) => 
      this.assetLoader.loadSound(key, url).catch(err => {
        logger.warn(`Failed to load sound ${key}:`, err)
      })
    )
    
    await Promise.all(loadPromises)
  }
  
  private setupEventListeners(): void {
    // Game events
    eventBus.on(GameEvents.ITEM_COLLECT, (event: any) => {
      this.gameManager.addScore(event.value)
      this.audioManager.play2D('collect', { volume: 0.5 })
    })
    
    eventBus.on(GameEvents.PLAYER_DEATH, () => {
      this.gameManager.changeState(GameState.GAME_OVER)
      this.timeManager.setTimeout(() => {
        this.resetGame()
      }, 3)
    })
    
    eventBus.on(GameEvents.PLAYER_DAMAGE, () => {
      this.audioManager.play2D('damage', { volume: 0.7 })
    })
    
    eventBus.on('player:jump', () => {
      this.audioManager.play2D('jump', { volume: 0.3 })
    })
    
    eventBus.on('player:shoot', (event: any) => {
      const bullet = this.bulletPool.get()
      if (bullet) {
        bullet.fire(event.origin, event.direction)
        this.scene.add(bullet)
        this.audioManager.play2D('shoot', { volume: 0.3 })
      }
    })
    
    eventBus.on(GameEvents.ENEMY_DEATH, (event: any) => {
      this.gameManager.addScore(100)
      this.audioManager.play2D('enemyDeath', { volume: 0.4 })
      
      // Spawn particles
      this.effectsSystem.explosion(event.position, {
        color: 0xff0000,
        count: 20
      })
    })
    
    // Mouse click for shooting
    window.addEventListener('click', this.onMouseClick.bind(this))
  }
  
  private startGame(): void {
    // Create player
    this.player = new Player()
    this.scene.add(this.player)
    this.player.initPhysics()
    
    // Setup camera
    this.cameraController.setTarget(this.player)
    
    // Load level
    this.loadLevel(1)
    
    // Start playing
    this.gameManager.changeState(GameState.PLAYING)
    this.uiManager.showScreen('hud')
  }
  
  private loadLevel(levelNumber: number): void {
    this.currentLevel = levelNumber
    
    // Clear existing level
    this.clearLevel()
    
    // Create level geometry
    createLevel(this.scene, levelNumber)
    
    // Spawn collectibles
    this.spawnCollectibles()
    
    // Spawn enemies
    this.spawnEnemies()
    
    // Reset player position
    if (this.player) {
      this.player.position.set(0, 1.5, 0) // Match the physics box positioning
      const rigidBody = this.physicsSystem.getRigidBody(this.player)
      if (rigidBody) {
        rigidBody.body.position.set(0, 1.5, 0) // Match the physics box positioning
        rigidBody.body.velocity.set(0, 0, 0)
      }
      logger.info(`Player position set to: ${this.player.position.toArray()}`)
      
      // Debug: Log all objects in scene
      let sceneObjects = [];
      this.scene.traverse((obj) => {
        sceneObjects.push({
          name: obj.name || 'unnamed',
          type: obj.type,
          position: obj.position ? obj.position.toArray() : null,
          visible: obj.visible
        });
      });
      logger.info('Scene objects:', sceneObjects.filter(obj => obj.name !== 'unnamed'));
      
      // Debug: Specifically check if player is in scene
      const playerInScene = this.scene.getObjectByName('Player');
      logger.info('Player found in scene:', !!playerInScene);
      if (playerInScene) {
        logger.info('Player details:', {
          position: playerInScene.position.toArray(),
          visible: playerInScene.visible,
          children: playerInScene.children.length
        });
      }
    }
  }
  
  private clearLevel(): void {
    // Remove collectibles
    this.collectibles.forEach(collectible => {
      this.scene.remove(collectible)
      this.collectiblePool.release(collectible)
    })
    this.collectibles = []
    
    // Remove enemies
    this.enemies.forEach(enemy => {
      this.scene.remove(enemy)
      enemy.dispose()
    })
    this.enemies = []
    
    // Remove level geometry
    const objectsToRemove: THREE.Object3D[] = []
    this.scene.traverse((object) => {
      if (object.name === 'Ground' || object.name.startsWith('Wall_') || object.name.startsWith('Obstacle_')) {
        objectsToRemove.push(object)
      }
    })
    objectsToRemove.forEach(obj => this.scene.remove(obj))
  }
  
  private spawnCollectibles(): void {
    const positions = [
      new THREE.Vector3(10, 1, 10),
      new THREE.Vector3(-10, 1, 10),
      new THREE.Vector3(10, 1, -10),
      new THREE.Vector3(-10, 1, -10),
      new THREE.Vector3(0, 1, 15),
      new THREE.Vector3(0, 1, -15),
      new THREE.Vector3(15, 1, 0),
      new THREE.Vector3(-15, 1, 0)
    ]
    
    positions.forEach((pos, index) => {
      const collectible = this.collectiblePool.get()
      collectible.position.copy(pos)
      collectible.setValue(10 + index * 5)
      collectible.baseY = pos.y
      this.scene.add(collectible)
      this.collectibles.push(collectible)
    })
  }
  
  private spawnEnemies(): void {
    const positions = [
      new THREE.Vector3(20, 1, 0),
      new THREE.Vector3(-20, 1, 0),
      new THREE.Vector3(0, 1, 20),
      new THREE.Vector3(0, 1, -20)
    ]
    
    positions.forEach(pos => {
      const enemy = new Enemy()
      enemy.position.copy(pos)
      this.scene.add(enemy)
      this.enemies.push(enemy)
    })
  }
  
  private onMouseClick(event: MouseEvent): void {
    if (!this.player || this.gameManager.isInState(GameState.PAUSED)) return
    
    // Convert mouse position to normalized device coordinates
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    
    // Set up ray from camera through mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera)
    
    // Calculate shooting direction
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const intersectPoint = new THREE.Vector3()
    
    if (this.raycaster.ray.intersectPlane(plane, intersectPoint)) {
      const direction = new THREE.Vector3()
      const playerCenter = this.player.position.clone()
      playerCenter.y = 1
      
      direction.subVectors(intersectPoint, playerCenter)
      direction.y = 0
      direction.normalize()
      
      this.player.shoot(direction)
    }
  }
  
  update(deltaTime: number): void {
    // Update input
    this.inputManager.update()
    
    // Handle pause
    if (this.inputManager.isKeyJustPressed('p') || this.inputManager.isKeyJustPressed('P')) {
      this.gameManager.togglePause()
      this.audioManager.play2D('pause', { volume: 0.3 })
    }
    
    // Handle debug spawn
    if (this.inputManager.isKeyJustPressed('c') && this.player) {
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
      this.collectibles.push(collectible)
    }
    
    // Handle mute
    if (this.inputManager.isKeyJustPressed('m') || this.inputManager.isKeyJustPressed('M')) {
      this.audioManager.toggleMute()
      logger.info(`Audio ${this.audioManager.isMuted() ? 'muted' : 'unmuted'}`)
    }
    
    // Update game manager
    this.gameManager.update(deltaTime)
    
    // Skip entity updates if paused
    if (this.gameManager.isInState(GameState.PAUSED)) {
      this.inputManager.lateUpdate()
      return
    }
    
    // Update game when playing
    if (this.gameManager.isInState(GameState.PLAYING)) {
      // Update physics
      this.physicsSystem.update(deltaTime)
      
      // Update player
      if (this.player) {
        this.player.update(deltaTime)
      }
      
      // Update enemies
      this.enemies = this.enemies.filter(enemy => {
        enemy.update(deltaTime)
        if (enemy.health <= 0) {
          this.scene.remove(enemy)
          enemy.dispose()
          return false
        }
        return true
      })
      
      // Update collectibles
      this.collectibles.forEach(collectible => {
        collectible.update(deltaTime)
      })
      
      // Update bullets
      this.bulletPool.forEach(bullet => {
        if (bullet.active) {
          bullet.update(deltaTime)
        }
      })
      
      // Check collisions
      this.checkCollisions()
      this.checkBulletCollisions()
      
      // Update camera
      this.cameraController.update(deltaTime)
      
      // Update effects
      this.effectsSystem.update(deltaTime)
    }
    
    // Update UI
    this.uiManager.update(deltaTime)
    
    // Clear input state
    this.inputManager.lateUpdate()
  }
  
  private checkCollisions(): void {
    if (!this.player) return
    
    const playerPos = this.player.position
    
    // Check collectible collisions
    this.collectibles = this.collectibles.filter(collectible => {
      const distance = playerPos.distanceTo(collectible.position)
      if (distance < 1.5) {
        eventBus.emit(GameEvents.ITEM_COLLECT, {
          item: collectible,
          collector: this.player,
          value: collectible.value
        })
        
        // Particle effect
        this.effectsSystem.sparkle(collectible.position, {
          color: collectible.color,
          count: 10
        })
        
        this.scene.remove(collectible)
        this.collectiblePool.release(collectible)
        
        // Check level complete
        if (this.collectibles.length === 1) { // This will be the last one
          this.onLevelComplete()
        }
        
        return false
      }
      return true
    })
  }
  
  private checkBulletCollisions(): void {
    const bullets = this.bulletPool.filter(bullet => bullet.active)
    
    bullets.forEach(bullet => {
      if (!bullet.active) return
      
      this.enemies.forEach(enemy => {
        if (!enemy.visible) return
        
        const distance = bullet.position.distanceTo(enemy.position)
        if (distance < 1.0) {
          enemy.takeDamage(bullet.damage)
          
          if (enemy.health <= 0) {
            eventBus.emit(GameEvents.ENEMY_DEATH, {
              enemy,
              position: enemy.position.clone()
            })
          }
          
          this.scene.remove(bullet)
          this.bulletPool.release(bullet)
          
          // Flash effect
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
  
  private onLevelComplete(): void {
    logger.info(`Level ${this.currentLevel} complete!`)
    
    this.currentLevel++
    if (this.currentLevel > 2) {
      this.currentLevel = 1
    }
    
    this.gameManager.setLevel(this.currentLevel)
    
    // Load next level after delay
    this.timeManager.setTimeout(() => {
      this.loadLevel(this.currentLevel)
    }, 1.5)
  }
  
  private resetGame(): void {
    this.gameManager.resetGameData()
    this.currentLevel = 1
    this.loadLevel(1)
    this.gameManager.changeState(GameState.PLAYING)
  }
  
  resize(): void {
    this.cameraController.onResize()
  }
  
  dispose(): void {
    // Remove event listeners
    window.removeEventListener('click', this.onMouseClick)
    
    // Clear entities
    this.clearLevel()
    
    // Dispose systems
    this.inputManager.dispose()
    this.audioManager.dispose()
    this.physicsSystem.dispose()
    this.effectsSystem.dispose()
    this.cameraController.dispose()
    this.uiManager.dispose()
    this.gameManager.dispose()
    
    logger.info('Game disposed')
  }
}