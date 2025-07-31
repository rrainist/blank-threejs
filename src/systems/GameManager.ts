import { Storage } from './Storage'

export enum GameState {
  LOADING = 'loading',
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  VICTORY = 'victory'
}

export interface GameStateData {
  score: number
  level: number
  lives: number
  [key: string]: any
}

type StateChangeCallback = (from: GameState, to: GameState) => void
type UpdateCallback = (deltaTime: number) => void

export class GameManager {
  private static instance: GameManager
  private currentState: GameState = GameState.LOADING
  private previousState: GameState = GameState.LOADING
  private stateChangeCallbacks: Map<GameState, StateChangeCallback[]> = new Map()
  private updateCallbacks: Map<GameState, UpdateCallback[]> = new Map()
  private gameData: GameStateData = {
    score: 0,
    level: 1,
    lives: 3
  }
  private isPaused = false
  private storage: Storage

  private constructor() {
    this.storage = Storage.getInstance()
    this.initializeStateCallbacks()
  }

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager()
    }
    return GameManager.instance
  }

  private initializeStateCallbacks() {
    // Initialize empty callback arrays for each state
    Object.values(GameState).forEach(state => {
      this.stateChangeCallbacks.set(state, [])
      this.updateCallbacks.set(state, [])
    })
  }

  /**
   * Change the game state
   */
  changeState(newState: GameState): void {
    if (this.currentState === newState) return

    const oldState = this.currentState
    this.previousState = oldState
    this.currentState = newState

    console.log(`Game state changed: ${oldState} -> ${newState}`)

    // Call exit callbacks for old state
    this.triggerStateCallbacks(oldState, newState)

    // Handle state-specific logic
    switch (newState) {
      case GameState.PLAYING:
        this.isPaused = false
        break
      case GameState.PAUSED:
        this.isPaused = true
        break
      case GameState.GAME_OVER:
        this.handleGameOver()
        break
      case GameState.VICTORY:
        this.handleVictory()
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
  onStateChange(state: GameState, callback: StateChangeCallback): void {
    const callbacks = this.stateChangeCallbacks.get(state) || []
    callbacks.push(callback)
    this.stateChangeCallbacks.set(state, callbacks)
  }

  /**
   * Register a callback for state updates
   */
  onStateUpdate(state: GameState, callback: UpdateCallback): void {
    const callbacks = this.updateCallbacks.get(state) || []
    callbacks.push(callback)
    this.updateCallbacks.set(state, callbacks)
  }

  /**
   * Update the game manager (called each frame)
   */
  update(deltaTime: number): void {
    if (this.isPaused) return

    // Call update callbacks for current state
    const callbacks = this.updateCallbacks.get(this.currentState) || []
    callbacks.forEach(callback => callback(deltaTime))
  }

  /**
   * Game data management
   */
  getScore(): number {
    return this.gameData.score
  }

  addScore(points: number): void {
    this.gameData.score += points
  }

  setScore(score: number): void {
    this.gameData.score = score
  }

  getLevel(): number {
    return this.gameData.level
  }

  setLevel(level: number): void {
    this.gameData.level = level
  }

  nextLevel(): void {
    this.gameData.level++
  }

  getLives(): number {
    return this.gameData.lives
  }

  setLives(lives: number): void {
    this.gameData.lives = lives
  }

  loseLife(): void {
    this.gameData.lives--
    if (this.gameData.lives <= 0) {
      this.changeState(GameState.GAME_OVER)
    }
  }

  /**
   * Get/set custom game data
   */
  getData(key: string): any {
    return this.gameData[key]
  }

  setData(key: string, value: any): void {
    this.gameData[key] = value
  }

  /**
   * Get all game data
   */
  getAllData(): GameStateData {
    return { ...this.gameData }
  }

  /**
   * Reset game data to defaults
   */
  resetGameData(): void {
    this.gameData = {
      score: 0,
      level: 1,
      lives: 3
    }
  }

  /**
   * Save/Load game state
   */
  saveGame(slot = 0): boolean {
    const saveData = {
      state: this.currentState,
      gameData: this.gameData,
      timestamp: Date.now()
    }
    return this.storage.save(`game_save_${slot}`, saveData)
  }

  loadGame(slot = 0): boolean {
    const saveData = this.storage.load(`game_save_${slot}`)
    if (!saveData) return false

    try {
      this.currentState = saveData.state as GameState
      this.gameData = saveData.gameData as GameStateData
      return true
    } catch (error) {
      console.error('Failed to load game:', error)
      return false
    }
  }

  /**
   * Check if save game exists
   */
  hasSaveGame(slot = 0): boolean {
    return this.storage.exists(`game_save_${slot}`)
  }

  /**
   * Private helper methods
   */
  private triggerStateCallbacks(from: GameState, to: GameState): void {
    const callbacks = this.stateChangeCallbacks.get(to) || []
    callbacks.forEach(callback => callback(from, to))
  }

  private handleGameOver(): void {
    console.log('Game Over! Final score:', this.gameData.score)
    // You can add more game over logic here
  }

  private handleVictory(): void {
    console.log('Victory! Final score:', this.gameData.score)
    // You can add more victory logic here
  }
}