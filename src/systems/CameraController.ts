import * as THREE from 'three'
import { logger } from '../utils/Logger'

export class CameraController {
  private static instance: CameraController
  
  private camera: THREE.OrthographicCamera
  private target?: THREE.Object3D
  
  // Fixed isometric camera settings
  private readonly CAMERA_HEIGHT = 40
  private readonly CAMERA_DISTANCE = 40
  private readonly CAMERA_ANGLE = Math.PI / 4 // 45 degrees for true isometric
  
  private constructor(camera: THREE.OrthographicCamera) {
    this.camera = camera
    
    // Set fixed isometric camera position
    this.setupIsometricView()
    
    logger.info('CameraController initialized with fixed isometric view')
  }
  
  static initialize(camera: THREE.OrthographicCamera): CameraController {
    if (!CameraController.instance) {
      CameraController.instance = new CameraController(camera)
    }
    return CameraController.instance
  }
  
  static getInstance(): CameraController {
    if (!CameraController.instance) {
      throw new Error('CameraController not initialized. Call CameraController.initialize() first.')
    }
    return CameraController.instance
  }
  
  private setupIsometricView(): void {
    // Ultra-simple camera - basic position that should definitely work
    const x = 0
    const y = 20
    const z = 20
    
    this.camera.position.set(x, y, z)
    this.camera.lookAt(0, 0, 0) // Look at the center
    
    logger.info(`SIMPLE CAMERA: positioned at [${x}, ${y}, ${z}] looking at [0, 0, 0]`)
  }
  
  setTarget(target: THREE.Object3D | null): void {
    this.target = target || undefined
  }
  
  getCamera(): THREE.Camera {
    return this.camera
  }
  
  update(_deltaTime: number): void {
    // Fixed camera - no updates needed
    // Camera always looks at center (0, 0, 0)
  }
  
  
  onResize(): void {
    const aspect = window.innerWidth / window.innerHeight
    // Set frustum size to show entire 50x50 field plus some margin
    const frustumSize = 35 // Shows 70x70 area to ensure walls are visible
    
    this.camera.left = -frustumSize * aspect / 2
    this.camera.right = frustumSize * aspect / 2
    this.camera.top = frustumSize / 2
    this.camera.bottom = -frustumSize / 2
    this.camera.updateProjectionMatrix()
  }
  
  dispose(): void {
    logger.info('CameraController disposed')
  }
}