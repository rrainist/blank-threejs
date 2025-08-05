import * as THREE from 'three'
import { logger } from '../utils/Logger'

export class InputManager {
  private static instance: InputManager
  
  // Keyboard state
  private keys: Map<string, boolean> = new Map()
  private keysJustPressed: Set<string> = new Set()
  private keysJustReleased: Set<string> = new Set()
  
  // Mouse state
  private mouseButtons: Map<number, boolean> = new Map()
  private mouseButtonsJustPressed: Set<number> = new Set()
  private mouseButtonsJustReleased: Set<number> = new Set()
  private mousePosition = new THREE.Vector2()
  private mouseDelta = new THREE.Vector2()
  private lastMousePosition = new THREE.Vector2()
  
  private enabled = true

  private constructor() {
    this.setupEventListeners()
    logger.info('InputManager initialized')
  }

  static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager()
    }
    return InputManager.instance
  }

  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown.bind(this))
    window.addEventListener('keyup', this.onKeyUp.bind(this))
    
    // Mouse events
    window.addEventListener('mousedown', this.onMouseDown.bind(this))
    window.addEventListener('mouseup', this.onMouseUp.bind(this))
    window.addEventListener('mousemove', this.onMouseMove.bind(this))
    
    // Prevent right-click context menu
    window.addEventListener('contextmenu', (e) => {
      if (this.enabled) e.preventDefault()
    })
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return
    
    const key = event.key
    console.log('KEY DOWN DETECTED:', key) // Debug
    if (!this.keys.get(key)) {
      this.keys.set(key, true)
      this.keysJustPressed.add(key)
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (!this.enabled) return
    
    const key = event.key
    this.keys.set(key, false)
    this.keysJustReleased.add(key)
  }

  private onMouseDown(event: MouseEvent): void {
    if (!this.enabled) return
    
    const button = event.button
    this.mouseButtons.set(button, true)
    this.mouseButtonsJustPressed.add(button)
  }

  private onMouseUp(event: MouseEvent): void {
    if (!this.enabled) return
    
    const button = event.button
    this.mouseButtons.set(button, false)
    this.mouseButtonsJustReleased.add(button)
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.enabled) return
    
    this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1
    
    this.mouseDelta.x = event.clientX - this.lastMousePosition.x
    this.mouseDelta.y = event.clientY - this.lastMousePosition.y
    
    this.lastMousePosition.x = event.clientX
    this.lastMousePosition.y = event.clientY
  }

  /**
   * Update input state (call at start of frame)
   */
  update(): void {
    // Mouse delta will accumulate until lateUpdate
  }
  
  /**
   * Late update - call at end of frame
   */
  lateUpdate(): void {
    // Clear per-frame data
    this.keysJustPressed.clear()
    this.keysJustReleased.clear()
    this.mouseButtonsJustPressed.clear()
    this.mouseButtonsJustReleased.clear()
    this.mouseDelta.set(0, 0)
  }

  /**
   * Check if a key is currently held down
   */
  isKeyDown(key: string): boolean {
    return this.keys.get(key) || false
  }

  /**
   * Check if a key was just pressed this frame
   */
  isKeyJustPressed(key: string): boolean {
    return this.keysJustPressed.has(key)
  }

  /**
   * Check if a key was just released this frame
   */
  isKeyJustReleased(key: string): boolean {
    return this.keysJustReleased.has(key)
  }

  /**
   * Check if a mouse button is currently held down
   */
  isMouseButtonDown(button: number): boolean {
    return this.mouseButtons.get(button) || false
  }

  /**
   * Check if a mouse button was just pressed this frame
   */
  isMouseButtonJustPressed(button: number): boolean {
    return this.mouseButtonsJustPressed.has(button)
  }

  /**
   * Check if a mouse button was just released this frame
   */
  isMouseButtonJustReleased(button: number): boolean {
    return this.mouseButtonsJustReleased.has(button)
  }

  /**
   * Get mouse position in normalized device coordinates (-1 to 1)
   */
  getMousePosition(): THREE.Vector2 {
    return this.mousePosition.clone()
  }

  /**
   * Get mouse movement delta since last frame
   */
  getMouseDelta(): THREE.Vector2 {
    return this.mouseDelta.clone()
  }

  /**
   * Get movement input as a vector (WASD or arrow keys)
   */
  getMovementVector(): THREE.Vector2 {
    const vector = new THREE.Vector2()
    
    const wDown = this.isKeyDown('w') || this.isKeyDown('W') || this.isKeyDown('ArrowUp')
    const sDown = this.isKeyDown('s') || this.isKeyDown('S') || this.isKeyDown('ArrowDown')
    const aDown = this.isKeyDown('a') || this.isKeyDown('A') || this.isKeyDown('ArrowLeft')
    const dDown = this.isKeyDown('d') || this.isKeyDown('D') || this.isKeyDown('ArrowRight')
    
    if (wDown || sDown || aDown || dDown) {
      console.log('KEYS DETECTED:', {w: wDown, s: sDown, a: aDown, d: dDown})
    }
    
    if (wDown) {
      vector.y = 1
    }
    if (sDown) {
      vector.y = -1
    }
    if (aDown) {
      vector.x = -1
    }
    if (dDown) {
      vector.x = 1
    }
    
    // Normalize diagonal movement
    if (vector.length() > 0) {
      vector.normalize()
    }
    
    return vector
  }

  /**
   * Enable/disable input
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.keys.clear()
      this.mouseButtons.clear()
    }
  }

  /**
   * Check if input is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Cleanup
   */
  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('mousedown', this.onMouseDown)
    window.removeEventListener('mouseup', this.onMouseUp)
    window.removeEventListener('mousemove', this.onMouseMove)
    
    this.keys.clear()
    this.keysJustPressed.clear()
    this.keysJustReleased.clear()
    this.mouseButtons.clear()
    this.mouseButtonsJustPressed.clear()
    this.mouseButtonsJustReleased.clear()
    
    logger.info('InputManager disposed')
  }
}