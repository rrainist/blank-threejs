import * as THREE from 'three'
import { Game } from './Game'
import { createScene } from './scene'
import { logger } from './utils/Logger'
import { TimeManager } from './systems/TimeManager'

class App {
  private scene!: THREE.Scene
  private camera!: THREE.OrthographicCamera
  private renderer!: THREE.WebGLRenderer
  private game!: Game
  private timeManager!: TimeManager
  private animationId: number | null = null

  constructor() {
    this.init()
  }

  private async init(): Promise<void> {
    try {
      // Initialize Three.js
      this.scene = createScene()
      this.camera = this.createCamera()
      this.renderer = this.createRenderer()
      
      // Initialize time manager
      this.timeManager = TimeManager.getInstance()
      
      // Create and initialize game
      this.game = new Game(this.scene, this.camera, this.renderer)
      await this.game.initialize()
      
      // Setup resize handler
      window.addEventListener('resize', this.onResize.bind(this))
      
      // Hide loading indicator
      const loading = document.getElementById('loading')
      if (loading) loading.style.display = 'none'
      
      // Start animation loop
      this.animate()
    } catch (error) {
      this.handleError(error)
    }
  }

  private createCamera(): THREE.OrthographicCamera {
    const aspect = window.innerWidth / window.innerHeight
    const frustumSize = 35 // Shows entire field plus margin
    const camera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    )
    // Camera position will be set by CameraController
    return camera
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x87ceeb, 1.0)
    
    const app = document.getElementById('app')
    if (app) {
      app.appendChild(renderer.domElement)
      // Make canvas focusable for keyboard input
      renderer.domElement.tabIndex = 0
      renderer.domElement.focus()
    }
    
    return renderer
  }

  private onResize(): void {
    const width = window.innerWidth
    const height = window.innerHeight
    
    // Update camera
    const aspect = width / height
    const frustumSize = 35 // Match CameraController
    this.camera.left = -frustumSize * aspect / 2
    this.camera.right = frustumSize * aspect / 2
    this.camera.top = frustumSize / 2
    this.camera.bottom = -frustumSize / 2
    this.camera.updateProjectionMatrix()
    
    // Update renderer
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    // Update game
    this.game.resize()
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate)
    
    // Update time
    this.timeManager.update(performance.now())
    const deltaTime = this.timeManager.getDeltaTime()
    
    // Update game
    this.game.update(deltaTime)
    
    // Render
    this.renderer.render(this.scene, this.camera)
  }

  private handleError(error: unknown): void {
    logger.error('Application error:', error)
    
    const loading = document.getElementById('loading')
    if (loading) {
      loading.innerHTML = `
        <div style="text-align: center;">
          <h2 style="color: #ff6b6b;">Error</h2>
          <p>Something went wrong. Please refresh the page.</p>
        </div>
      `
    }
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    
    window.removeEventListener('resize', this.onResize)
    
    this.game.dispose()
    this.renderer.dispose()
    
    const app = document.getElementById('app')
    if (app) {
      app.removeChild(this.renderer.domElement)
    }
  }
}

// Create the app
const app = new App()

// Handle hot module replacement
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    app.dispose()
  })
}