import * as THREE from 'three'
import { logger } from '../utils/Logger'

export interface InputAction {
  name: string
  keys?: string[]
  mouseButtons?: number[]
  gamepadButtons?: number[]
  gamepadAxes?: { axis: number; threshold: number }[]
}

export interface InputAxis {
  name: string
  positive?: string[]
  negative?: string[]
  gamepadAxis?: number
  mouseAxis?: 'x' | 'y' | 'wheel'
  sensitivity?: number
  deadzone?: number
}

export class InputManager {
  private static instance: InputManager
  
  // Raw input state
  private keys: Map<string, boolean> = new Map()
  private keysDown: Set<string> = new Set()
  private keysUp: Set<string> = new Set()
  
  private mouseButtons: Map<number, boolean> = new Map()
  private mouseButtonsDown: Set<number> = new Set()
  private mouseButtonsUp: Set<number> = new Set()
  private mousePosition: THREE.Vector2 = new THREE.Vector2()
  private mouseDelta: THREE.Vector2 = new THREE.Vector2()
  private mouseWheel: number = 0
  
  private touches: Map<number, Touch> = new Map()
  private touchesDown: Set<number> = new Set()
  private touchesUp: Set<number> = new Set()
  
  private gamepads: Map<number, Gamepad> = new Map()
  
  // Input mapping
  private actions: Map<string, InputAction> = new Map()
  private axes: Map<string, InputAxis> = new Map()
  
  // Settings
  private mouseSensitivity = 1
  private gamepadDeadzone = 0.1
  private enabled = true
  private contextMenuHandler?: (e: Event) => void

  private constructor() {
    this.setupEventListeners()
    this.setupDefaultMappings()
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
    window.addEventListener('wheel', this.onMouseWheel.bind(this))
    
    // Touch events
    window.addEventListener('touchstart', this.onTouchStart.bind(this))
    window.addEventListener('touchend', this.onTouchEnd.bind(this))
    window.addEventListener('touchmove', this.onTouchMove.bind(this))
    
    // Gamepad events
    window.addEventListener('gamepadconnected', this.onGamepadConnected.bind(this))
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected.bind(this))
    
    // Prevent right-click context menu in game (optional)
    this.contextMenuHandler = (e: Event) => {
      if (this.enabled) e.preventDefault()
    }
    window.addEventListener('contextmenu', this.contextMenuHandler)
  }

  private setupDefaultMappings(): void {
    // Default actions
    this.addAction('jump', { keys: [' '], gamepadButtons: [0] }) // A button
    this.addAction('fire', { mouseButtons: [0], gamepadButtons: [7] }) // R2/RT
    this.addAction('aim', { mouseButtons: [2], gamepadButtons: [6] }) // L2/LT
    this.addAction('interact', { keys: ['e', 'E'], gamepadButtons: [2] }) // X button
    this.addAction('pause', { keys: ['Escape', 'p', 'P'], gamepadButtons: [9] }) // Start
    
    // Default axes
    this.addAxis('horizontal', {
      positive: ['d', 'D', 'ArrowRight'],
      negative: ['a', 'A', 'ArrowLeft'],
      gamepadAxis: 0, // Left stick X
      sensitivity: 1
    })
    
    this.addAxis('vertical', {
      positive: ['w', 'W', 'ArrowUp'],
      negative: ['s', 'S', 'ArrowDown'],
      gamepadAxis: 1, // Left stick Y
      sensitivity: 1
    })
    
    this.addAxis('lookX', {
      mouseAxis: 'x',
      gamepadAxis: 2, // Right stick X
      sensitivity: 1
    })
    
    this.addAxis('lookY', {
      mouseAxis: 'y',
      gamepadAxis: 3, // Right stick Y
      sensitivity: 1
    })
  }

  /**
   * Update input state (call at start of frame)
   */
  update(): void {
    // Update gamepad state
    this.updateGamepads()
  }
  
  /**
   * Late update - call at end of frame
   */
  lateUpdate(): void {
    // Clear per-frame data
    this.keysDown.clear()
    this.keysUp.clear()
    this.mouseButtonsDown.clear()
    this.mouseButtonsUp.clear()
    this.touchesDown.clear()
    this.touchesUp.clear()
    this.mouseDelta.set(0, 0)
    this.mouseWheel = 0
  }

  private updateGamepads(): void {
    const gamepads = navigator.getGamepads()
    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i]
      if (gamepad) {
        this.gamepads.set(i, gamepad)
      }
    }
  }

  /**
   * Input mapping
   */
  addAction(name: string, mapping: Omit<InputAction, 'name'>): void {
    this.actions.set(name, { name, ...mapping })
  }

  addAxis(name: string, mapping: Omit<InputAxis, 'name'>): void {
    this.axes.set(name, { name, ...mapping })
  }

  removeAction(name: string): void {
    this.actions.delete(name)
  }

  removeAxis(name: string): void {
    this.axes.delete(name)
  }

  /**
   * Action queries
   */
  isActionPressed(name: string): boolean {
    if (!this.enabled) return false
    
    const action = this.actions.get(name)
    if (!action) return false
    
    // Check keys
    if (action.keys) {
      for (const key of action.keys) {
        if (this.keys.get(key)) return true
      }
    }
    
    // Check mouse buttons
    if (action.mouseButtons) {
      for (const button of action.mouseButtons) {
        if (this.mouseButtons.get(button)) return true
      }
    }
    
    // Check gamepad buttons
    if (action.gamepadButtons) {
      for (const [_, gamepad] of this.gamepads) {
        for (const buttonIndex of action.gamepadButtons) {
          if (gamepad.buttons[buttonIndex]?.pressed) return true
        }
      }
    }
    
    // Check gamepad axes
    if (action.gamepadAxes) {
      for (const [_, gamepad] of this.gamepads) {
        for (const { axis, threshold } of action.gamepadAxes) {
          if (Math.abs(gamepad.axes[axis]) > threshold) return true
        }
      }
    }
    
    return false
  }

  isActionJustPressed(name: string): boolean {
    if (!this.enabled) return false
    
    const action = this.actions.get(name)
    if (!action) return false
    
    // Check keys
    if (action.keys) {
      for (const key of action.keys) {
        if (this.keysDown.has(key)) {
          return true
        }
      }
    }
    
    // Check mouse buttons
    if (action.mouseButtons) {
      for (const button of action.mouseButtons) {
        if (this.mouseButtonsDown.has(button)) return true
      }
    }
    
    // TODO: Track gamepad button down events
    
    return false
  }

  isActionJustReleased(name: string): boolean {
    if (!this.enabled) return false
    
    const action = this.actions.get(name)
    if (!action) return false
    
    // Check keys
    if (action.keys) {
      for (const key of action.keys) {
        if (this.keysUp.has(key)) return true
      }
    }
    
    // Check mouse buttons
    if (action.mouseButtons) {
      for (const button of action.mouseButtons) {
        if (this.mouseButtonsUp.has(button)) return true
      }
    }
    
    // TODO: Track gamepad button up events
    
    return false
  }

  /**
   * Axis queries
   */
  getAxis(name: string): number {
    if (!this.enabled) return 0
    
    const axis = this.axes.get(name)
    if (!axis) return 0
    
    let value = 0
    const sensitivity = axis.sensitivity || 1
    const deadzone = axis.deadzone || this.gamepadDeadzone
    
    // Keyboard input
    if (axis.positive) {
      for (const key of axis.positive) {
        if (this.keys.get(key)) value += 1
      }
    }
    if (axis.negative) {
      for (const key of axis.negative) {
        if (this.keys.get(key)) value -= 1
      }
    }
    
    // Mouse input
    if (axis.mouseAxis) {
      switch (axis.mouseAxis) {
        case 'x':
          value += this.mouseDelta.x * sensitivity * 0.01
          break
        case 'y':
          value += this.mouseDelta.y * sensitivity * 0.01
          break
        case 'wheel':
          value += this.mouseWheel * sensitivity
          break
      }
    }
    
    // Gamepad input
    if (axis.gamepadAxis !== undefined) {
      for (const [_, gamepad] of this.gamepads) {
        const axisValue = gamepad.axes[axis.gamepadAxis]
        if (Math.abs(axisValue) > deadzone) {
          value += axisValue * sensitivity
        }
      }
    }
    
    // Clamp to -1, 1 range
    return Math.max(-1, Math.min(1, value))
  }

  /**
   * Raw input queries
   */
  isKeyPressed(key: string): boolean {
    return this.enabled && (this.keys.get(key) || false)
  }

  isKeyJustPressed(key: string): boolean {
    return this.enabled && this.keysDown.has(key)
  }

  isKeyJustReleased(key: string): boolean {
    return this.enabled && this.keysUp.has(key)
  }

  isMouseButtonPressed(button: number): boolean {
    return this.enabled && (this.mouseButtons.get(button) || false)
  }

  isMouseButtonJustPressed(button: number): boolean {
    return this.enabled && this.mouseButtonsDown.has(button)
  }

  isMouseButtonJustReleased(button: number): boolean {
    return this.enabled && this.mouseButtonsUp.has(button)
  }

  getMousePosition(): THREE.Vector2 {
    return this.mousePosition.clone()
  }

  getMouseDelta(): THREE.Vector2 {
    return this.mouseDelta.clone()
  }

  getMouseWheel(): number {
    return this.mouseWheel
  }

  /**
   * Touch input
   */
  getTouchCount(): number {
    return this.touches.size
  }

  getTouch(id: number): Touch | undefined {
    return this.touches.get(id)
  }

  getTouches(): Touch[] {
    return Array.from(this.touches.values())
  }

  /**
   * Gamepad input
   */
  getGamepadCount(): number {
    return this.gamepads.size
  }

  getGamepad(index: number): Gamepad | undefined {
    return this.gamepads.get(index)
  }

  /**
   * Settings
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  setMouseSensitivity(sensitivity: number): void {
    this.mouseSensitivity = sensitivity
  }

  setGamepadDeadzone(deadzone: number): void {
    this.gamepadDeadzone = deadzone
  }

  /**
   * Event handlers
   */
  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key
    if (!this.keys.get(key)) {
      this.keysDown.add(key)
    }
    this.keys.set(key, true)
  }

  private onKeyUp(event: KeyboardEvent): void {
    const key = event.key
    this.keys.set(key, false)
    this.keysUp.add(key)
  }

  private onMouseDown(event: MouseEvent): void {
    const button = event.button
    if (!this.mouseButtons.get(button)) {
      this.mouseButtonsDown.add(button)
    }
    this.mouseButtons.set(button, true)
  }

  private onMouseUp(event: MouseEvent): void {
    const button = event.button
    this.mouseButtons.set(button, false)
    this.mouseButtonsUp.add(button)
  }

  private onMouseMove(event: MouseEvent): void {
    const newX = event.clientX
    const newY = event.clientY
    
    this.mouseDelta.x = (newX - this.mousePosition.x) * this.mouseSensitivity
    this.mouseDelta.y = (newY - this.mousePosition.y) * this.mouseSensitivity
    
    this.mousePosition.set(newX, newY)
  }

  private onMouseWheel(event: WheelEvent): void {
    this.mouseWheel = Math.sign(event.deltaY)
  }

  private onTouchStart(event: TouchEvent): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i]
      this.touches.set(touch.identifier, touch)
      this.touchesDown.add(touch.identifier)
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i]
      this.touches.delete(touch.identifier)
      this.touchesUp.add(touch.identifier)
    }
  }

  private onTouchMove(event: TouchEvent): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i]
      this.touches.set(touch.identifier, touch)
    }
  }

  private onGamepadConnected(event: GamepadEvent): void {
    logger.info(`Gamepad ${event.gamepad.index} connected: ${event.gamepad.id}`)
    this.gamepads.set(event.gamepad.index, event.gamepad)
  }

  private onGamepadDisconnected(event: GamepadEvent): void {
    logger.info(`Gamepad ${event.gamepad.index} disconnected`)
    this.gamepads.delete(event.gamepad.index)
  }

  /**
   * Clean up event listeners
   */
  dispose(): void {
    // Remove keyboard listeners
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    
    // Remove mouse listeners
    window.removeEventListener('mousedown', this.onMouseDown)
    window.removeEventListener('mouseup', this.onMouseUp)
    window.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('wheel', this.onMouseWheel)
    window.removeEventListener('contextmenu', (e) => e.preventDefault())
    
    // Remove touch listeners
    window.removeEventListener('touchstart', this.onTouchStart as EventListener)
    window.removeEventListener('touchend', this.onTouchEnd as EventListener)
    window.removeEventListener('touchmove', this.onTouchMove as EventListener)
    
    // Remove gamepad listeners
    window.removeEventListener('gamepadconnected', this.onGamepadConnected)
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected)
    
    // Clear all maps
    this.keys.clear()
    this.keysDown.clear()
    this.keysUp.clear()
    this.mouseButtons.clear()
    this.mouseButtonsDown.clear()
    this.mouseButtonsUp.clear()
    this.touches.clear()
    this.touchesDown.clear()
    this.touchesUp.clear()
    this.gamepads.clear()
    this.actions.clear()
    this.axes.clear()
  }
}