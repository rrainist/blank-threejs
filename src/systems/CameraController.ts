import * as THREE from 'three'
import { InputManager } from './InputManager'
import { ConfigurationManager } from './ConfigurationManager'
import { logger } from '../utils/Logger'

export enum CameraMode {
  FIRST_PERSON = 'first_person',
  THIRD_PERSON = 'third_person',
  ORBITAL = 'orbital',
  FIXED = 'fixed',
  FREE = 'free'
}

export interface CameraConfig {
  mode: CameraMode
  target?: THREE.Object3D
  offset?: THREE.Vector3
  distance?: number
  minDistance?: number
  maxDistance?: number
  minPolarAngle?: number
  maxPolarAngle?: number
  enableDamping?: boolean
  dampingFactor?: number
  rotationSpeed?: number
  zoomSpeed?: number
  collisionEnabled?: boolean
  collisionPadding?: number
}

export class CameraController {
  private static instance: CameraController
  
  private camera: THREE.Camera
  private orthographicCamera: THREE.OrthographicCamera | null = null
  private perspectiveCamera: THREE.PerspectiveCamera | null = null
  private inputManager: InputManager
  private configManager: ConfigurationManager
  
  // Camera state
  private mode: CameraMode = CameraMode.THIRD_PERSON
  private target?: THREE.Object3D
  private offset = new THREE.Vector3(0, 5, 10)
  private distance = 10
  private minDistance = 2
  private maxDistance = 50
  
  // Orbital camera state
  private spherical = new THREE.Spherical()
  private sphericalDelta = new THREE.Spherical()
  private minPolarAngle = 0 // Top
  private maxPolarAngle = Math.PI // Bottom
  
  // Smoothing
  private enableDamping = true
  private dampingFactor = 0.05
  private currentPosition = new THREE.Vector3()
  private desiredPosition = new THREE.Vector3()
  private currentLookAt = new THREE.Vector3()
  private desiredLookAt = new THREE.Vector3()
  
  // Input state
  private rotationSpeed = 0.002
  private zoomSpeed = 0.1
  private panSpeed = 0.5
  private isMouseDown = false
  private mouseStart = new THREE.Vector2()
  private mouseDelta = new THREE.Vector2()
  
  // Collision
  private collisionEnabled = true
  private collisionPadding = 0.5
  private raycaster = new THREE.Raycaster()
  
  // First person
  private pitch = 0
  private yaw = 0
  
  private constructor(camera: THREE.Camera) {
    this.camera = camera
    this.inputManager = InputManager.getInstance()
    this.configManager = ConfigurationManager.getInstance()
    
    // Create both camera types
    this.createCameras()
    
    this.setupInputHandlers()
    this.loadConfiguration()
    
    // Initialize position
    this.currentPosition.copy(camera.position)
    this.desiredPosition.copy(camera.position)
    
    logger.info('CameraController initialized')
  }
  
  private createCameras(): void {
    const aspectRatio = window.innerWidth / window.innerHeight
    
    // Create orthographic camera with proper world unit scaling
    const viewHeight = 40  // Height in world units - covers the game level appropriately
    const viewWidth = viewHeight * aspectRatio
    this.orthographicCamera = new THREE.OrthographicCamera(
      -viewWidth / 2,   // left
      viewWidth / 2,    // right  
      viewHeight / 2,   // top
      -viewHeight / 2,  // bottom
      0.1,              // near
      10000             // far
    )
    
    // Create perspective camera
    this.perspectiveCamera = new THREE.PerspectiveCamera(75, aspectRatio, 0.01, 10000)
    
    // Copy current camera position to both
    if (this.camera) {
      this.orthographicCamera.position.copy(this.camera.position)
      this.perspectiveCamera.position.copy(this.camera.position)
      this.orthographicCamera.rotation.copy(this.camera.rotation)
      this.perspectiveCamera.rotation.copy(this.camera.rotation)
    }
  }
  
  static initialize(camera: THREE.Camera): CameraController {
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
  
  private setupInputHandlers(): void {
    // Mouse events
    window.addEventListener('mousedown', this.onMouseDown.bind(this))
    window.addEventListener('mousemove', this.onMouseMove.bind(this))
    window.addEventListener('mouseup', this.onMouseUp.bind(this))
    window.addEventListener('wheel', this.onMouseWheel.bind(this))
    
    // Touch events for mobile
    window.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false })
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false })
    window.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false })
    
    // Keyboard shortcuts
    this.inputManager.addAction('cameraMode1', { keys: ['1'] })
    this.inputManager.addAction('cameraMode2', { keys: ['2'] })
    this.inputManager.addAction('cameraMode3', { keys: ['3'] })
    this.inputManager.addAction('cameraOrtho', { keys: ['4'] })
    this.inputManager.addAction('cameraPerspective', { keys: ['5'] })
    this.inputManager.addAction('cameraReset', { keys: ['0'] })
  }
  
  private loadConfiguration(): void {
    const sensitivity = this.configManager.get('controls', 'mouseSensitivity')
    this.rotationSpeed = 0.002 * sensitivity
    
    // Subscribe to configuration changes
    this.configManager.subscribe('controls.mouseSensitivity', (value) => {
      this.rotationSpeed = 0.002 * (value as number)
    })
  }
  
  /**
   * Set camera mode
   */
  setMode(mode: CameraMode, config?: Partial<CameraConfig>): void {
    this.mode = mode
    
    if (config) {
      this.applyConfig(config)
    }
    
    // Reset camera based on mode
    switch (mode) {
      case CameraMode.FIRST_PERSON:
        this.offset.set(0, 0.5, 0) // Eye height
        this.distance = 0
        break
      
      case CameraMode.THIRD_PERSON:
        this.offset.set(0, 20, 10)  // Much higher view to see more of the scene
        this.distance = 30
        break
      
      case CameraMode.ORBITAL:
        // Initialize spherical coordinates from current camera position
        if (this.target) {
          const offset = new THREE.Vector3()
          offset.subVectors(this.camera.position, this.target.position)
          this.spherical.setFromVector3(offset)
          this.distance = offset.length()
        }
        break
    }
    
    logger.info(`Camera mode changed to: ${mode}`)
  }
  
  /**
   * Set camera target
   */
  setTarget(target: THREE.Object3D | null): void {
    this.target = target || undefined
  }
  
  /**
   * Switch to orthographic camera
   */
  switchToOrthographic(): void {
    if (this.orthographicCamera) {
      // Copy current camera state
      this.orthographicCamera.position.copy(this.camera.position)
      this.orthographicCamera.rotation.copy(this.camera.rotation)
      this.orthographicCamera.quaternion.copy(this.camera.quaternion)
      this.orthographicCamera.up.copy(this.camera.up)
      
      // Switch camera
      this.camera = this.orthographicCamera
      this.currentPosition.copy(this.camera.position)
      this.desiredPosition.copy(this.camera.position)
      
      logger.info('Switched to orthographic camera')
      logger.debug(`Ortho camera position: ${this.camera.position.toArray()}`)
      logger.debug(`Ortho camera rotation: ${this.camera.rotation.toArray()}`)
    }
  }
  
  /**
   * Switch to perspective camera
   */
  switchToPerspective(): void {
    if (this.perspectiveCamera) {
      // Copy current camera state
      this.perspectiveCamera.position.copy(this.camera.position)
      this.perspectiveCamera.rotation.copy(this.camera.rotation)
      
      // Switch camera
      this.camera = this.perspectiveCamera
      this.currentPosition.copy(this.camera.position)
      this.desiredPosition.copy(this.camera.position)
      
      logger.info('Switched to perspective camera')
    }
  }
  
  /**
   * Get current active camera
   */
  getCamera(): THREE.Camera {
    return this.camera
  }
  
  /**
   * Handle window resize for both cameras
   */
  onResize(): void {
    const aspect = window.innerWidth / window.innerHeight
    
    // Update perspective camera
    if (this.perspectiveCamera) {
      this.perspectiveCamera.aspect = aspect
      this.perspectiveCamera.updateProjectionMatrix()
    }
    
    // Update orthographic camera with proper world unit scaling
    if (this.orthographicCamera) {
      const viewHeight = 40  // Match the viewHeight used in createCameras
      const viewWidth = viewHeight * aspect
      this.orthographicCamera.left = -viewWidth / 2
      this.orthographicCamera.right = viewWidth / 2
      this.orthographicCamera.top = viewHeight / 2
      this.orthographicCamera.bottom = -viewHeight / 2
      this.orthographicCamera.updateProjectionMatrix()
    }
  }
  
  /**
   * Apply camera configuration
   */
  applyConfig(config: Partial<CameraConfig>): void {
    if (config.mode !== undefined) this.mode = config.mode
    if (config.target !== undefined) this.target = config.target
    if (config.offset !== undefined) this.offset.copy(config.offset)
    if (config.distance !== undefined) this.distance = config.distance
    if (config.minDistance !== undefined) this.minDistance = config.minDistance
    if (config.maxDistance !== undefined) this.maxDistance = config.maxDistance
    if (config.minPolarAngle !== undefined) this.minPolarAngle = config.minPolarAngle
    if (config.maxPolarAngle !== undefined) this.maxPolarAngle = config.maxPolarAngle
    if (config.enableDamping !== undefined) this.enableDamping = config.enableDamping
    if (config.dampingFactor !== undefined) this.dampingFactor = config.dampingFactor
    if (config.rotationSpeed !== undefined) this.rotationSpeed = config.rotationSpeed
    if (config.zoomSpeed !== undefined) this.zoomSpeed = config.zoomSpeed
    if (config.collisionEnabled !== undefined) this.collisionEnabled = config.collisionEnabled
    if (config.collisionPadding !== undefined) this.collisionPadding = config.collisionPadding
  }
  
  /**
   * Update camera position and rotation
   */
  update(deltaTime: number): void {
    // Check for mode switching
    if (this.inputManager.isActionJustPressed('cameraMode1')) {
      this.setMode(CameraMode.FIRST_PERSON)
    } else if (this.inputManager.isActionJustPressed('cameraMode2')) {
      this.setMode(CameraMode.THIRD_PERSON)
    } else if (this.inputManager.isActionJustPressed('cameraMode3')) {
      this.setMode(CameraMode.ORBITAL)
    } else if (this.inputManager.isActionJustPressed('cameraOrtho')) {
      this.switchToOrthographic()
    } else if (this.inputManager.isActionJustPressed('cameraPerspective')) {
      this.switchToPerspective()
    }
    
    switch (this.mode) {
      case CameraMode.FIRST_PERSON:
        this.updateFirstPerson(deltaTime)
        break
      
      case CameraMode.THIRD_PERSON:
        this.updateThirdPerson(deltaTime)
        break
      
      case CameraMode.ORBITAL:
        this.updateOrbital(deltaTime)
        break
      
      case CameraMode.FREE:
        this.updateFree(deltaTime)
        break
      
      case CameraMode.FIXED:
        // Fixed camera doesn't update
        break
    }
    
    // Apply damping
    if (this.enableDamping && this.mode !== CameraMode.FIXED) {
      this.currentPosition.lerp(this.desiredPosition, this.dampingFactor)
      this.camera.position.copy(this.currentPosition)
      
      if (this.mode !== CameraMode.FIRST_PERSON) {
        this.currentLookAt.lerp(this.desiredLookAt, this.dampingFactor)
        this.camera.lookAt(this.currentLookAt)
      }
    } else {
      this.camera.position.copy(this.desiredPosition)
      if (this.mode !== CameraMode.FIRST_PERSON) {
        this.camera.lookAt(this.desiredLookAt)
      }
    }
  }
  
  private updateFirstPerson(_deltaTime: number): void {
    if (!this.target) return
    
    // Position at target's eye level
    this.desiredPosition.copy(this.target.position)
    this.desiredPosition.add(this.offset)
    
    // Mouse look
    if (this.isMouseDown) {
      this.yaw -= this.mouseDelta.x * this.rotationSpeed
      this.pitch -= this.mouseDelta.y * this.rotationSpeed
      this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch))
      
      // Apply rotation to camera
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ')
      
      // Also rotate the target to match camera yaw (for movement direction)
      if (this.target) {
        this.target.rotation.y = this.yaw
      }
    }
    
    this.mouseDelta.set(0, 0)
  }
  
  private updateThirdPerson(_deltaTime: number): void {
    if (!this.target) return
    
    // Calculate desired position
    const targetPosition = this.target.position.clone()
    
    // Rotate offset based on mouse input
    if (this.isMouseDown) {
      const rotationX = this.mouseDelta.x * this.rotationSpeed
      const rotationY = this.mouseDelta.y * this.rotationSpeed
      
      // Horizontal rotation (around Y axis)
      const quaternionY = new THREE.Quaternion()
      quaternionY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -rotationX)
      this.offset.applyQuaternion(quaternionY)
      
      // Vertical rotation (limited)
      const right = new THREE.Vector3(1, 0, 0)
      right.applyQuaternion(quaternionY)
      const quaternionX = new THREE.Quaternion()
      quaternionX.setFromAxisAngle(right, -rotationY)
      
      // Apply and clamp vertical rotation
      const newOffset = this.offset.clone().applyQuaternion(quaternionX)
      const angle = newOffset.angleTo(new THREE.Vector3(0, 1, 0))
      if (angle > this.minPolarAngle && angle < this.maxPolarAngle) {
        this.offset.copy(newOffset)
      }
    }
    
    // Normalize and scale offset
    this.offset.normalize().multiplyScalar(this.distance)
    
    // Set desired position
    this.desiredPosition.copy(targetPosition).add(this.offset)
    this.desiredLookAt.copy(targetPosition)
    
    // Collision detection
    if (this.collisionEnabled) {
      this.checkCameraCollision(targetPosition)
    }
    
    this.mouseDelta.set(0, 0)
  }
  
  private updateOrbital(_deltaTime: number): void {
    if (!this.target) return
    
    const targetPosition = this.target.position
    
    // Apply mouse rotation
    if (this.isMouseDown) {
      this.sphericalDelta.theta = -this.mouseDelta.x * this.rotationSpeed
      this.sphericalDelta.phi = -this.mouseDelta.y * this.rotationSpeed
      
      this.spherical.theta += this.sphericalDelta.theta
      this.spherical.phi += this.sphericalDelta.phi
      
      // Clamp phi
      this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi))
    }
    
    // Apply zoom
    this.spherical.radius = this.distance
    
    // Convert to cartesian
    this.desiredPosition.setFromSpherical(this.spherical)
    this.desiredPosition.add(targetPosition)
    this.desiredLookAt.copy(targetPosition)
    
    this.mouseDelta.set(0, 0)
  }
  
  private updateFree(deltaTime: number): void {
    // WASD movement
    const forward = this.inputManager.getAxis('vertical') * this.panSpeed
    const right = this.inputManager.getAxis('horizontal') * this.panSpeed
    
    const cameraDirection = new THREE.Vector3()
    this.camera.getWorldDirection(cameraDirection)
    cameraDirection.y = 0
    cameraDirection.normalize()
    
    const cameraRight = new THREE.Vector3()
    cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0))
    
    this.desiredPosition.add(cameraDirection.multiplyScalar(forward * deltaTime))
    this.desiredPosition.add(cameraRight.multiplyScalar(right * deltaTime))
    
    // Mouse look
    if (this.isMouseDown) {
      this.yaw -= this.mouseDelta.x * this.rotationSpeed
      this.pitch -= this.mouseDelta.y * this.rotationSpeed
      this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch))
      
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ')
    }
    
    this.mouseDelta.set(0, 0)
  }
  
  private checkCameraCollision(targetPosition: THREE.Vector3): void {
    // Cast ray from target to camera
    const direction = new THREE.Vector3()
    direction.subVectors(this.desiredPosition, targetPosition).normalize()
    
    this.raycaster.set(targetPosition, direction)
    this.raycaster.near = 0
    this.raycaster.far = this.distance
    
    // Check for intersections with static objects
    const intersects = this.raycaster.intersectObjects(this.getCollidableObjects(), true)
    
    if (intersects.length > 0) {
      // Move camera to just before the collision point
      const hitDistance = intersects[0].distance - this.collisionPadding
      if (hitDistance > 0) {
        this.desiredPosition.copy(targetPosition)
        this.desiredPosition.add(direction.multiplyScalar(hitDistance))
      }
    }
  }
  
  private getCollidableObjects(): THREE.Object3D[] {
    // Get all objects that should block camera
    const objects: THREE.Object3D[] = []
    
    if (this.camera.parent) {
      this.camera.parent.traverse((child) => {
        if (child instanceof THREE.Mesh && 
            child.userData.type !== 'player' && 
            child.userData.type !== 'collectible' &&
            child.name !== 'Ground') {
          objects.push(child)
        }
      })
    }
    
    return objects
  }
  
  // Input handlers
  private onMouseDown(event: MouseEvent): void {
    if (event.button === 2) { // Right mouse button
      this.isMouseDown = true
      this.mouseStart.set(event.clientX, event.clientY)
    }
  }
  
  private onMouseMove(event: MouseEvent): void {
    if (this.isMouseDown) {
      this.mouseDelta.x = event.clientX - this.mouseStart.x
      this.mouseDelta.y = event.clientY - this.mouseStart.y
      this.mouseStart.set(event.clientX, event.clientY)
    }
  }
  
  private onMouseUp(event: MouseEvent): void {
    if (event.button === 2) {
      this.isMouseDown = false
    }
  }
  
  private onMouseWheel(event: WheelEvent): void {
    const delta = event.deltaY > 0 ? 1 : -1
    this.distance += delta * this.zoomSpeed * this.distance * 0.1
    this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance))
    
    event.preventDefault()
  }
  
  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.isMouseDown = true
      this.mouseStart.set(event.touches[0].clientX, event.touches[0].clientY)
    }
    event.preventDefault()
  }
  
  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1 && this.isMouseDown) {
      this.mouseDelta.x = event.touches[0].clientX - this.mouseStart.x
      this.mouseDelta.y = event.touches[0].clientY - this.mouseStart.y
      this.mouseStart.set(event.touches[0].clientX, event.touches[0].clientY)
    }
    event.preventDefault()
  }
  
  private onTouchEnd(event: TouchEvent): void {
    this.isMouseDown = false
    event.preventDefault()
  }
  
  /**
   * Reset camera to default position
   */
  reset(): void {
    switch (this.mode) {
      case CameraMode.THIRD_PERSON:
        this.offset.set(0, 5, 10)
        this.distance = 10
        break
      
      case CameraMode.ORBITAL:
        this.spherical.set(this.distance, Math.PI / 4, 0)
        break
      
      case CameraMode.FIRST_PERSON:
        this.pitch = 0
        this.yaw = 0
        break
    }
  }
  
  /**
   * Get camera state for saving
   */
  getState(): object {
    return {
      mode: this.mode,
      offset: this.offset.toArray(),
      distance: this.distance,
      spherical: {
        radius: this.spherical.radius,
        phi: this.spherical.phi,
        theta: this.spherical.theta
      },
      pitch: this.pitch,
      yaw: this.yaw
    }
  }
  
  /**
   * Restore camera state
   */
  setState(state: unknown): void {
    const s = state as {
      mode?: CameraMode
      offset?: number[]
      distance?: number
      spherical?: {
        radius: number
        phi: number
        theta: number
      }
      pitch?: number
      yaw?: number
    }
    
    if (s.mode) this.mode = s.mode
    if (s.offset) this.offset.fromArray(s.offset)
    if (s.distance) this.distance = s.distance
    if (s.spherical) {
      this.spherical.set(
        s.spherical.radius,
        s.spherical.phi,
        s.spherical.theta
      )
    }
    if (s.pitch !== undefined) this.pitch = s.pitch
    if (s.yaw !== undefined) this.yaw = s.yaw
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    window.removeEventListener('mousedown', this.onMouseDown.bind(this))
    window.removeEventListener('mousemove', this.onMouseMove.bind(this))
    window.removeEventListener('mouseup', this.onMouseUp.bind(this))
    window.removeEventListener('wheel', this.onMouseWheel.bind(this))
  }
}