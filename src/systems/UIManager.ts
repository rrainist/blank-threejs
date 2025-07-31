import { EventBus } from '../utils/EventBus'
import { InputManager } from './InputManager'
import { GameManager, GameState } from './GameManager'

export interface UIElement {
  id: string
  element: HTMLElement
  parent?: string
  visible: boolean
  interactable: boolean
  updateCallback?: (element: UIElement) => void
}

export interface UIScreen {
  id: string
  elements: Map<string, UIElement>
  onShow?: () => void
  onHide?: () => void
  update?: () => void
}

export interface UIConfig {
  rootElement?: HTMLElement
  defaultStyles?: boolean
  debugMode?: boolean
}

export class UIManager {
  private static instance: UIManager
  
  private rootElement: HTMLElement
  private screens: Map<string, UIScreen> = new Map()
  private activeScreens: Set<string> = new Set()
  private elements: Map<string, UIElement> = new Map()
  
  private eventBus: EventBus
  private inputManager: InputManager
  private gameManager: GameManager
  
  private updateCallbacks: Set<(deltaTime: number) => void> = new Set()
  private debugMode: boolean

  private constructor(config: UIConfig = {}) {
    this.rootElement = config.rootElement || document.body
    this.debugMode = config.debugMode || false
    
    this.eventBus = EventBus.getInstance()
    this.inputManager = InputManager.getInstance()
    this.gameManager = GameManager.getInstance()
    
    if (config.defaultStyles !== false) {
      this.injectDefaultStyles()
    }
    
    this.setupEventListeners()
  }

  static initialize(config?: UIConfig): UIManager {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager(config)
    }
    return UIManager.instance
  }

  static getInstance(): UIManager {
    if (!UIManager.instance) {
      throw new Error('UIManager not initialized. Call UIManager.initialize() first.')
    }
    return UIManager.instance
  }

  /**
   * Create a new UI screen
   */
  createScreen(id: string, config: Partial<UIScreen> = {}): UIScreen {
    const screen: UIScreen = {
      id,
      elements: new Map(),
      onShow: config.onShow,
      onHide: config.onHide,
      update: config.update
    }
    
    this.screens.set(id, screen)
    return screen
  }

  /**
   * Show a screen
   */
  showScreen(id: string, hideOthers = true): void {
    const screen = this.screens.get(id)
    if (!screen) {
      console.warn(`Screen "${id}" not found`)
      return
    }
    
    if (hideOthers) {
      this.hideAllScreens()
    }
    
    this.activeScreens.add(id)
    
    // Show all elements in the screen
    screen.elements.forEach(element => {
      this.showElement(element.id)
    })
    
    if (screen.onShow) {
      screen.onShow()
    }
    
    this.eventBus.emit('ui:screen:shown', { screenId: id })
  }

  /**
   * Hide a screen
   */
  hideScreen(id: string): void {
    const screen = this.screens.get(id)
    if (!screen) return
    
    this.activeScreens.delete(id)
    
    // Hide all elements in the screen
    screen.elements.forEach(element => {
      this.hideElement(element.id)
    })
    
    if (screen.onHide) {
      screen.onHide()
    }
    
    this.eventBus.emit('ui:screen:hidden', { screenId: id })
  }

  /**
   * Hide all screens
   */
  hideAllScreens(): void {
    this.activeScreens.forEach(id => this.hideScreen(id))
  }

  /**
   * Check if screen is active
   */
  isScreenActive(id: string): boolean {
    return this.activeScreens.has(id)
  }

  /**
   * Create a UI element
   */
  createElement(config: {
    id: string
    type?: keyof HTMLElementTagNameMap
    parent?: string | HTMLElement
    className?: string
    style?: Partial<CSSStyleDeclaration>
    innerHTML?: string
    text?: string
    attributes?: Record<string, string>
    screen?: string
    onClick?: (event: MouseEvent) => void
    updateCallback?: (element: UIElement) => void
  }): UIElement {
    // Create HTML element
    const htmlElement = document.createElement(config.type || 'div')
    htmlElement.id = config.id
    
    if (config.className) {
      htmlElement.className = config.className
    }
    
    if (config.style) {
      Object.assign(htmlElement.style, config.style)
    }
    
    if (config.innerHTML) {
      htmlElement.innerHTML = config.innerHTML
    } else if (config.text) {
      htmlElement.textContent = config.text
    }
    
    if (config.attributes) {
      Object.entries(config.attributes).forEach(([key, value]) => {
        htmlElement.setAttribute(key, value)
      })
    }
    
    if (config.onClick) {
      htmlElement.addEventListener('click', config.onClick as EventListener)
    }
    
    // Create UI element wrapper
    const element: UIElement = {
      id: config.id,
      element: htmlElement,
      parent: typeof config.parent === 'string' ? config.parent : undefined,
      visible: false,
      interactable: true,
      updateCallback: config.updateCallback
    }
    
    // Add to parent
    const parentElement = this.getParentElement(config.parent)
    parentElement.appendChild(htmlElement)
    
    // Register element
    this.elements.set(config.id, element)
    
    // Add to screen if specified
    if (config.screen) {
      const screen = this.screens.get(config.screen)
      if (screen) {
        screen.elements.set(config.id, element)
      }
    }
    
    return element
  }

  /**
   * Get parent element
   */
  private getParentElement(parent?: string | HTMLElement): HTMLElement {
    if (!parent) return this.rootElement
    
    if (typeof parent === 'string') {
      const element = this.elements.get(parent)
      if (element) return element.element
      
      const domElement = document.getElementById(parent)
      if (domElement) return domElement
      
      return this.rootElement
    }
    
    return parent
  }

  /**
   * Update element properties
   */
  updateElement(id: string, updates: {
    text?: string
    innerHTML?: string
    style?: Partial<CSSStyleDeclaration>
    className?: string
    attributes?: Record<string, string>
  }): void {
    const element = this.elements.get(id)
    if (!element) return
    
    if (updates.text !== undefined) {
      element.element.textContent = updates.text
    }
    
    if (updates.innerHTML !== undefined) {
      element.element.innerHTML = updates.innerHTML
    }
    
    if (updates.style) {
      Object.assign(element.element.style, updates.style)
    }
    
    if (updates.className !== undefined) {
      element.element.className = updates.className
    }
    
    if (updates.attributes) {
      Object.entries(updates.attributes).forEach(([key, value]) => {
        element.element.setAttribute(key, value)
      })
    }
  }

  /**
   * Show element
   */
  showElement(id: string): void {
    const element = this.elements.get(id)
    if (!element) return
    
    element.visible = true
    element.element.style.display = ''
    
    this.eventBus.emit('ui:element:shown', { elementId: id })
  }

  /**
   * Hide element
   */
  hideElement(id: string): void {
    const element = this.elements.get(id)
    if (!element) return
    
    element.visible = false
    element.element.style.display = 'none'
    
    this.eventBus.emit('ui:element:hidden', { elementId: id })
  }

  /**
   * Remove element
   */
  removeElement(id: string): void {
    const element = this.elements.get(id)
    if (!element) return
    
    element.element.remove()
    this.elements.delete(id)
    
    // Remove from screens
    this.screens.forEach(screen => {
      screen.elements.delete(id)
    })
  }

  /**
   * Get element
   */
  getElement(id: string): UIElement | undefined {
    return this.elements.get(id)
  }

  /**
   * Add update callback
   */
  addUpdateCallback(callback: (deltaTime: number) => void): void {
    this.updateCallbacks.add(callback)
  }

  /**
   * Remove update callback
   */
  removeUpdateCallback(callback: (deltaTime: number) => void): void {
    this.updateCallbacks.delete(callback)
  }

  /**
   * Update UI
   */
  update(deltaTime: number): void {
    // Update active screens
    this.activeScreens.forEach(screenId => {
      const screen = this.screens.get(screenId)
      if (screen?.update) {
        screen.update()
      }
    })
    
    // Update elements with callbacks
    this.elements.forEach(element => {
      if (element.visible && element.updateCallback) {
        element.updateCallback(element)
      }
    })
    
    // Call update callbacks
    this.updateCallbacks.forEach(callback => callback(deltaTime))
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for game state changes
    this.eventBus.on('game:state:changed', (event: any) => {
      this.handleGameStateChange(event.newState)
    })
    
    // Listen for input events
    this.inputManager.addAction('ui_cancel', { keys: ['Escape'] })
    this.inputManager.addAction('ui_confirm', { keys: ['Enter', ' '] })
    this.inputManager.addAction('ui_up', { keys: ['ArrowUp', 'w', 'W'] })
    this.inputManager.addAction('ui_down', { keys: ['ArrowDown', 's', 'S'] })
    this.inputManager.addAction('ui_left', { keys: ['ArrowLeft', 'a', 'A'] })
    this.inputManager.addAction('ui_right', { keys: ['ArrowRight', 'd', 'D'] })
  }

  /**
   * Handle game state changes
   */
  private handleGameStateChange(newState: GameState): void {
    switch (newState) {
      case GameState.MENU:
        this.showScreen('mainMenu')
        break
      case GameState.PLAYING:
        this.hideScreen('pauseMenu')
        this.showScreen('hud')
        break
      case GameState.PAUSED:
        this.showScreen('pauseMenu', false)
        break
      case GameState.GAME_OVER:
        this.showScreen('gameOver', false)
        break
    }
  }

  /**
   * Create common UI screens
   */
  createCommonScreens(): void {
    // HUD
    this.createScreen('hud', {
      onShow: () => {
        console.log('HUD shown')
      }
    })
    
    // Main Menu
    this.createScreen('mainMenu', {
      onShow: () => {
        console.log('Main menu shown')
      }
    })
    
    // Pause Menu
    this.createScreen('pauseMenu', {
      onShow: () => {
        console.log('Pause menu shown')
      }
    })
    
    // Game Over
    this.createScreen('gameOver', {
      onShow: () => {
        console.log('Game over screen shown')
      }
    })
  }

  /**
   * Create HUD elements
   */
  createHUD(): void {
    // Score display
    this.createElement({
      id: 'score-display',
      screen: 'hud',
      className: 'ui-text ui-score',
      text: 'Score: 0',
      style: {
        position: 'absolute',
        top: '20px',
        left: '20px',
        color: 'white',
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
      },
      updateCallback: (element) => {
        const score = this.gameManager.getScore()
        element.element.textContent = `Score: ${score}`
      }
    })
    
    // Health bar
    this.createElement({
      id: 'health-bar-container',
      screen: 'hud',
      className: 'ui-health-container',
      style: {
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        width: '200px',
        height: '20px',
        border: '2px solid white',
        backgroundColor: 'rgba(0,0,0,0.5)'
      }
    })
    
    this.createElement({
      id: 'health-bar',
      parent: 'health-bar-container',
      screen: 'hud',
      className: 'ui-health-bar',
      style: {
        width: '100%',
        height: '100%',
        backgroundColor: '#00ff00',
        transition: 'width 0.3s ease'
      },
      updateCallback: (element) => {
        const health = this.gameManager.getHealth()
        const maxHealth = this.gameManager.getMaxHealth()
        const percentage = (health / maxHealth) * 100
        element.element.style.width = `${percentage}%`
        
        // Change color based on health
        if (percentage > 60) {
          element.element.style.backgroundColor = '#00ff00'
        } else if (percentage > 30) {
          element.element.style.backgroundColor = '#ffff00'
        } else {
          element.element.style.backgroundColor = '#ff0000'
        }
      }
    })
    
    // Lives display
    this.createElement({
      id: 'lives-display',
      screen: 'hud',
      className: 'ui-text ui-lives',
      text: 'Lives: 3',
      style: {
        position: 'absolute',
        top: '60px',
        left: '20px',
        color: 'white',
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
      },
      updateCallback: (element) => {
        const lives = this.gameManager.getLives()
        element.element.textContent = `Lives: ${lives}`
      }
    })
  }

  /**
   * Create pause menu
   */
  createPauseMenu(): void {
    // Pause overlay
    this.createElement({
      id: 'pause-overlay',
      screen: 'pauseMenu',
      className: 'ui-overlay',
      style: {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '1000'
      }
    })
    
    // Pause menu container
    this.createElement({
      id: 'pause-menu-container',
      parent: 'pause-overlay',
      screen: 'pauseMenu',
      className: 'ui-menu',
      style: {
        backgroundColor: 'rgba(0,0,0,0.9)',
        border: '2px solid white',
        padding: '40px',
        borderRadius: '10px',
        textAlign: 'center'
      }
    })
    
    // Title
    this.createElement({
      id: 'pause-title',
      parent: 'pause-menu-container',
      screen: 'pauseMenu',
      type: 'h2',
      text: 'PAUSED',
      style: {
        color: 'white',
        fontSize: '48px',
        marginBottom: '30px',
        fontFamily: 'Arial, sans-serif'
      }
    })
    
    // Resume button
    this.createElement({
      id: 'resume-button',
      parent: 'pause-menu-container',
      screen: 'pauseMenu',
      type: 'button',
      text: 'Resume',
      className: 'ui-button',
      style: {
        display: 'block',
        width: '200px',
        padding: '15px',
        margin: '10px auto',
        fontSize: '20px',
        color: 'white',
        backgroundColor: 'transparent',
        border: '2px solid white',
        cursor: 'pointer',
        fontFamily: 'Arial, sans-serif'
      },
      onClick: () => {
        this.gameManager.togglePause()
      }
    })
    
    // Quit button
    this.createElement({
      id: 'quit-button',
      parent: 'pause-menu-container',
      screen: 'pauseMenu',
      type: 'button',
      text: 'Quit to Menu',
      className: 'ui-button',
      style: {
        display: 'block',
        width: '200px',
        padding: '15px',
        margin: '10px auto',
        fontSize: '20px',
        color: 'white',
        backgroundColor: 'transparent',
        border: '2px solid white',
        cursor: 'pointer',
        fontFamily: 'Arial, sans-serif'
      },
      onClick: () => {
        this.gameManager.changeState(GameState.MENU)
      }
    })
  }

  /**
   * Show notification
   */
  showNotification(text: string, duration = 3000, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const id = `notification-${Date.now()}`
    
    const colors = {
      info: '#3498db',
      success: '#2ecc71',
      warning: '#f39c12',
      error: '#e74c3c'
    }
    
    this.createElement({
      id,
      className: 'ui-notification',
      text,
      style: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        padding: '20px 40px',
        backgroundColor: colors[type],
        color: 'white',
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
        borderRadius: '5px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        zIndex: '2000',
        opacity: '0',
        transition: 'opacity 0.3s ease'
      }
    })
    
    // Fade in
    setTimeout(() => {
      const element = this.getElement(id)
      if (element) {
        element.element.style.opacity = '1'
      }
    }, 10)
    
    // Fade out and remove
    setTimeout(() => {
      const element = this.getElement(id)
      if (element) {
        element.element.style.opacity = '0'
        setTimeout(() => this.removeElement(id), 300)
      }
    }, duration)
  }

  /**
   * Inject default styles
   */
  private injectDefaultStyles(): void {
    const styleId = 'ui-manager-default-styles'
    if (document.getElementById(styleId)) return
    
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .ui-button {
        transition: all 0.2s ease;
      }
      
      .ui-button:hover {
        background-color: white !important;
        color: black !important;
        transform: scale(1.05);
      }
      
      .ui-button:active {
        transform: scale(0.95);
      }
      
      .ui-text {
        user-select: none;
        pointer-events: none;
      }
      
      .ui-overlay {
        backdrop-filter: blur(5px);
      }
      
      @keyframes ui-pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
      }
      
      .ui-pulse {
        animation: ui-pulse 2s infinite;
      }
    `
    
    document.head.appendChild(style)
  }

  /**
   * Clean up
   */
  dispose(): void {
    // Remove all elements
    this.elements.forEach(element => {
      element.element.remove()
    })
    
    this.elements.clear()
    this.screens.clear()
    this.activeScreens.clear()
    this.updateCallbacks.clear()
  }
}