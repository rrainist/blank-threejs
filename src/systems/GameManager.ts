import { eventBus } from '../utils/EventBus'
import { logger } from '../utils/Logger'

export enum GameState {
  LOADING = 'loading',
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  VICTORY = 'victory'
}

type StateChangeCallback = (from: GameState, to: GameState) => void

export class GameManager {
  private static instance: GameManager
  private currentState: GameState = GameState.LOADING
  private previousState: GameState = GameState.LOADING
  private stateChangeCallbacks: StateChangeCallback[] = []
  
  // Game data
  private score = 0
  private level = 1
  private lives = 3
  private health = 100
  private maxHealth = 100

  private constructor() {
    logger.info('GameManager initialized')
  }

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager()
    }
    return GameManager.instance
  }

  /**
   * Change the game state
   */
  changeState(newState: GameState): void {
    if (this.currentState === newState) return

    const oldState = this.currentState
    this.previousState = oldState
    this.currentState = newState

    logger.info(`Game state changed: ${oldState} -> ${newState}`)

    // Emit state change event
    eventBus.emit('game:state:changed', { 
      from: oldState, 
      to: newState 
    })

    // Call state change callbacks
    this.stateChangeCallbacks.forEach(callback => callback(oldState, newState))

    // Handle state-specific logic
    switch (newState) {
      case GameState.GAME_OVER:
        logger.info('Game Over! Final score:', this.score)
        break
      case GameState.VICTORY:
        logger.info('Victory! Final score:', this.score)
        break
    }
  }

  /**
   * Get current game state
   */
  getCurrentState(): GameState {
    return this.currentState
  }

  /**
   * Get previous game state
   */
  getPreviousState(): GameState {
    return this.previousState
  }

  /**
   * Check if game is in a specific state
   */
  isInState(state: GameState): boolean {
    return this.currentState === state
  }

  /**
   * Toggle pause state
   */
  togglePause(): void {
    if (this.currentState === GameState.PLAYING) {
      this.changeState(GameState.PAUSED)
    } else if (this.currentState === GameState.PAUSED) {
      this.changeState(GameState.PLAYING)
    }
  }

  /**
   * Register a callback for state changes
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.push(callback)
    // Return unsubscribe function
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback)
      if (index > -1) {
        this.stateChangeCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Update the game manager (called each frame)
   */
  update(_deltaTime: number): void {
    // Currently no per-frame updates needed
  }

  /**
   * Game data management
   */
  getScore(): number {
    return this.score
  }

  addScore(points: number): void {
    this.score += points
    eventBus.emit('score:changed', { score: this.score })
  }

  setScore(score: number): void {
    this.score = score
    eventBus.emit('score:changed', { score: this.score })
  }

  getLevel(): number {
    return this.level
  }

  getHealth(): number {
    return this.health
  }

  getMaxHealth(): number {
    return this.maxHealth
  }

  setHealth(health: number): void {
    this.health = Math.max(0, Math.min(health, this.maxHealth))
    eventBus.emit('health:changed', { health: this.health, maxHealth: this.maxHealth })
  }

  setLevel(level: number): void {
    this.level = level
  }

  nextLevel(): void {
    this.level++
    eventBus.emit('level:changed', { level: this.level })
  }

  getLives(): number {
    return this.lives
  }

  setLives(lives: number): void {
    this.lives = lives
    eventBus.emit('lives:changed', { lives: this.lives })
  }

  loseLife(): void {
    this.lives--
    if (this.lives <= 0) {
      this.changeState(GameState.GAME_OVER)
    }
  }

  /**
   * Reset game data to defaults
   */
  resetGameData(): void {
    this.score = 0
    this.level = 1
    this.lives = 3
    this.health = this.maxHealth
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stateChangeCallbacks = []
    logger.info('GameManager disposed')
  }
}