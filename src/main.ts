import * as THREE from 'three'
import { createScene } from './scene'
import { setupControls } from './controls'
import { handleResize } from './utils/resize'

class ThreeApp {
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private cube!: THREE.Mesh
  private animationId: number | null = null

  constructor() {
    try {
      // Initialize Three.js components
      this.scene = createScene()
      this.camera = this.createCamera()
      this.renderer = this.createRenderer()
      this.cube = this.createCube()

      // Hide loading indicator only after successful init
      const loading = document.getElementById('loading')
      if (loading) loading.style.display = 'none'

      // Setup
      this.setupScene()
      this.setupEventListeners()
      setupControls(this.camera, this.renderer.domElement)

      // Start animation loop
      this.animate()
    } catch (error) {
      this.handleWebGLError(error)
    }
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(2, 2, 3)
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

  private createCube(): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshPhongMaterial({ 
      color: 0xff3333,
      shininess: 100
    })
    const cube = new THREE.Mesh(geometry, material)
    cube.castShadow = true
    cube.receiveShadow = true
    return cube
  }

  private setupScene(): void {
    // Add cube to scene
    this.scene.add(this.cube)

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    this.scene.add(directionalLight)

    // Add ground plane
    const planeGeometry = new THREE.PlaneGeometry(10, 10)
    const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 })
    const plane = new THREE.Mesh(planeGeometry, planeMaterial)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -1
    plane.receiveShadow = true
    this.scene.add(plane)
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      handleResize(this.camera, this.renderer)
    })
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate)

    // Rotate the cube
    this.cube.rotation.x += 0.005
    this.cube.rotation.y += 0.01

    // Render the scene
    this.renderer.render(this.scene, this.camera)
  }

  private handleWebGLError(error: unknown): void {
    console.error('WebGL initialization failed:', error)
    
    const loading = document.getElementById('loading')
    if (loading) {
      loading.innerHTML = `
        <div style="text-align: center;">
          <h2 style="color: #ff6b6b; margin-bottom: 10px;">WebGL Not Available - turn on HW acceleration</h2>
        </div>
      `
    }
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    
    // Clean up geometry and materials
    if (this.cube) {
      this.cube.geometry.dispose()
      if (this.cube.material instanceof THREE.Material) {
        this.cube.material.dispose()
      }
    }
    
    if (this.renderer) {
      this.renderer.dispose()
    }
  }
}

// Initialize the app
new ThreeApp()

// Handle hot module replacement in development
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    // Cleanup code for HMR
  })
} 