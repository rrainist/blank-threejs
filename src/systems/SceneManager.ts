import * as THREE from 'three'
import { EventBus } from '../utils/EventBus'
import { AssetLoader } from './AssetLoader'
import { EntityManager } from './EntityManager'
import { GameManager, GameState } from './GameManager'

export interface SceneConfig {
  name: string
  fogColor?: number
  fogNear?: number
  fogFar?: number
  ambientLight?: {
    color: number
    intensity: number
  }
  directionalLight?: {
    color: number
    intensity: number
    position: THREE.Vector3
    castShadow?: boolean
  }
  skybox?: string[] // URLs for cubemap textures
  onLoad?: () => void
  onUnload?: () => void
  onUpdate?: (deltaTime: number) => void
}

export class SceneManager {
  private static instance: SceneManager
  private scene: THREE.Scene
  private camera: THREE.Camera
  private renderer: THREE.WebGLRenderer
  
  private scenes: Map<string, SceneConfig> = new Map()
  private currentSceneName?: string
  private currentSceneConfig?: SceneConfig
  private transitionInProgress = false
  
  private skybox?: THREE.Mesh
  private lights: THREE.Light[] = []
  
  private assetLoader: AssetLoader
  private entityManager: EntityManager
  private gameManager: GameManager
  private eventBus: EventBus

  private constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    
    this.assetLoader = AssetLoader.getInstance()
    this.entityManager = EntityManager.getInstance()
    this.gameManager = GameManager.getInstance()
    this.eventBus = EventBus.getInstance()
  }

  static initialize(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): SceneManager {
    if (!SceneManager.instance) {
      SceneManager.instance = new SceneManager(scene, camera, renderer)
    }
    return SceneManager.instance
  }

  static getInstance(): SceneManager {
    if (!SceneManager.instance) {
      throw new Error('SceneManager not initialized. Call SceneManager.initialize() first.')
    }
    return SceneManager.instance
  }

  /**
   * Register a scene configuration
   */
  registerScene(name: string, config: SceneConfig): void {
    this.scenes.set(name, { ...config, name })
  }

  /**
   * Load and transition to a scene
   */
  async loadScene(name: string, transition = true): Promise<void> {
    const config = this.scenes.get(name)
    if (!config) {
      throw new Error(`Scene "${name}" not found`)
    }

    if (this.transitionInProgress) {
      console.warn('Scene transition already in progress')
      return
    }

    this.transitionInProgress = true
    
    // Notify about scene change
    this.eventBus.emit('scene:changing', { from: this.currentSceneName, to: name })
    
    // Fade out if transitioning
    if (transition && this.currentSceneName) {
      await this.fadeOut()
    }
    
    // Unload current scene
    if (this.currentSceneConfig?.onUnload) {
      this.currentSceneConfig.onUnload()
    }
    
    // Clear current scene
    this.clearScene()
    
    // Apply new scene configuration
    await this.applySceneConfig(config)
    
    // Update current scene
    this.currentSceneName = name
    this.currentSceneConfig = config
    
    // Call onLoad callback
    if (config.onLoad) {
      config.onLoad()
    }
    
    // Fade in if transitioning
    if (transition) {
      await this.fadeIn()
    }
    
    this.transitionInProgress = false
    
    // Notify scene loaded
    this.eventBus.emit('scene:loaded', { name })
  }

  /**
   * Get current scene name
   */
  getCurrentSceneName(): string | undefined {
    return this.currentSceneName
  }

  /**
   * Update current scene
   */
  update(deltaTime: number): void {
    if (this.currentSceneConfig?.onUpdate) {
      this.currentSceneConfig.onUpdate(deltaTime)
    }
  }

  /**
   * Clear the current scene
   */
  private clearScene(): void {
    // Remove all lights
    this.lights.forEach(light => {
      this.scene.remove(light)
      if (light instanceof THREE.DirectionalLight && light.shadow.map) {
        light.shadow.map.dispose()
      }
    })
    this.lights = []
    
    // Remove skybox
    if (this.skybox) {
      this.scene.remove(this.skybox)
      if (this.skybox.material instanceof THREE.Material) {
        this.skybox.material.dispose()
      }
      this.skybox.geometry.dispose()
      this.skybox = undefined
    }
    
    // Clear entities (but keep persistent ones like player)
    const persistentTags = ['player', 'persistent']
    const entitiesToRemove = this.entityManager.getAllEntities()
      .filter(entity => !Array.from(entity.tags).some((tag: string) => persistentTags.includes(tag)))
    
    entitiesToRemove.forEach(entity => {
      this.entityManager.removeEntity(entity)
    })
    
    // Clear fog
    this.scene.fog = null
    
    // Clear background
    this.scene.background = null
  }

  /**
   * Apply scene configuration
   */
  private async applySceneConfig(config: SceneConfig): Promise<void> {
    // Set fog
    if (config.fogColor !== undefined) {
      this.scene.fog = new THREE.Fog(
        config.fogColor,
        config.fogNear || 10,
        config.fogFar || 100
      )
    }
    
    // Set ambient light
    if (config.ambientLight) {
      const ambientLight = new THREE.AmbientLight(
        config.ambientLight.color,
        config.ambientLight.intensity
      )
      this.scene.add(ambientLight)
      this.lights.push(ambientLight)
    }
    
    // Set directional light
    if (config.directionalLight) {
      const dirLight = new THREE.DirectionalLight(
        config.directionalLight.color,
        config.directionalLight.intensity
      )
      dirLight.position.copy(config.directionalLight.position)
      
      if (config.directionalLight.castShadow) {
        dirLight.castShadow = true
        dirLight.shadow.mapSize.width = 2048
        dirLight.shadow.mapSize.height = 2048
        dirLight.shadow.camera.near = 0.5
        dirLight.shadow.camera.far = 50
        dirLight.shadow.camera.left = -20
        dirLight.shadow.camera.right = 20
        dirLight.shadow.camera.top = 20
        dirLight.shadow.camera.bottom = -20
      }
      
      this.scene.add(dirLight)
      this.lights.push(dirLight)
    }
    
    // Load skybox
    if (config.skybox) {
      await this.loadSkybox(config.skybox)
    }
  }

  /**
   * Load skybox from cubemap URLs
   */
  private async loadSkybox(urls: string[]): Promise<void> {
    const loader = new THREE.CubeTextureLoader()
    
    return new Promise((resolve, reject) => {
      loader.load(
        urls,
        (texture) => {
          this.scene.background = texture
          resolve()
        },
        undefined,
        (error) => {
          console.error('Failed to load skybox:', error)
          resolve() // Continue without skybox
        }
      )
    })
  }

  /**
   * Fade out effect
   */
  private async fadeOut(duration = 0.5): Promise<void> {
    // Create a full-screen overlay
    const overlay = document.createElement('div')
    overlay.style.position = 'fixed'
    overlay.style.top = '0'
    overlay.style.left = '0'
    overlay.style.width = '100%'
    overlay.style.height = '100%'
    overlay.style.backgroundColor = 'black'
    overlay.style.opacity = '0'
    overlay.style.pointerEvents = 'none'
    overlay.style.transition = `opacity ${duration}s`
    overlay.style.zIndex = '9999'
    
    document.body.appendChild(overlay)
    
    // Trigger fade
    requestAnimationFrame(() => {
      overlay.style.opacity = '1'
    })
    
    // Wait for fade to complete
    await new Promise(resolve => setTimeout(resolve, duration * 1000))
    
    // Keep overlay for fade in
    overlay.id = 'scene-transition-overlay'
  }

  /**
   * Fade in effect
   */
  private async fadeIn(duration = 0.5): Promise<void> {
    const overlay = document.getElementById('scene-transition-overlay')
    if (!overlay) return
    
    // Trigger fade
    overlay.style.opacity = '0'
    
    // Wait for fade to complete
    await new Promise(resolve => setTimeout(resolve, duration * 1000))
    
    // Remove overlay
    overlay.remove()
  }

  /**
   * Predefine common scene configurations
   */
  registerCommonScenes(): void {
    // Main menu scene
    this.registerScene('mainMenu', {
      name: 'mainMenu',
      fogColor: 0x000033,
      fogNear: 10,
      fogFar: 50,
      ambientLight: {
        color: 0x404080,
        intensity: 0.5
      },
      directionalLight: {
        color: 0x8080ff,
        intensity: 0.3,
        position: new THREE.Vector3(5, 10, 5)
      }
    })
    
    // Game level scene
    this.registerScene('gameLevel', {
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
      }
    })
    
    // Boss arena scene
    this.registerScene('bossArena', {
      name: 'bossArena',
      fogColor: 0x440000,
      fogNear: 5,
      fogFar: 50,
      ambientLight: {
        color: 0x220000,
        intensity: 0.3
      },
      directionalLight: {
        color: 0xff4444,
        intensity: 0.6,
        position: new THREE.Vector3(0, 20, 0),
        castShadow: true
      }
    })
  }

  /**
   * Quick scene presets
   */
  async loadDayScene(): Promise<void> {
    await this.loadScene('day', false)
  }

  async loadNightScene(): Promise<void> {
    await this.loadScene('night', false)
  }

  async loadSpaceScene(): Promise<void> {
    await this.loadScene('space', false)
  }

  /**
   * Initialize preset scenes
   */
  initializePresetScenes(): void {
    // Day scene
    this.registerScene('day', {
      name: 'day',
      fogColor: 0xccccff,
      fogNear: 50,
      fogFar: 200,
      ambientLight: {
        color: 0xffffff,
        intensity: 0.4
      },
      directionalLight: {
        color: 0xffffff,
        intensity: 0.6,
        position: new THREE.Vector3(50, 50, 30),
        castShadow: true
      }
    })
    
    // Night scene
    this.registerScene('night', {
      name: 'night',
      fogColor: 0x000033,
      fogNear: 10,
      fogFar: 100,
      ambientLight: {
        color: 0x222244,
        intensity: 0.2
      },
      directionalLight: {
        color: 0x4444ff,
        intensity: 0.3,
        position: new THREE.Vector3(-20, 30, -10),
        castShadow: true
      }
    })
    
    // Space scene
    this.registerScene('space', {
      name: 'space',
      ambientLight: {
        color: 0x111122,
        intensity: 0.3
      },
      directionalLight: {
        color: 0xffffff,
        intensity: 1,
        position: new THREE.Vector3(100, 0, 0),
        castShadow: false
      }
    })
  }
}