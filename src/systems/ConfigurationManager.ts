import { logger } from '../utils/Logger'
import { Storage, StorageData } from './Storage'

export interface GameConfig {
  // Graphics settings
  graphics: {
    quality: 'low' | 'medium' | 'high'
    shadows: boolean
    antialiasing: boolean
    postProcessing: boolean
    particleEffects: boolean
    screenShake: boolean
  }
  
  // Audio settings
  audio: {
    masterVolume: number
    musicVolume: number
    sfxVolume: number
    muted: boolean
  }
  
  // Gameplay settings
  gameplay: {
    difficulty: 'easy' | 'normal' | 'hard'
    showTutorial: boolean
    showFPS: boolean
    debugMode: boolean
  }
  
  // Control settings
  controls: {
    mouseSensitivity: number
    invertYAxis: boolean
    vibration: boolean
    keyBindings: Record<string, string[]>
  }
}

export class ConfigurationManager {
  private static instance: ConfigurationManager
  private config: GameConfig
  private storage: Storage
  private listeners: Map<string, ((value: unknown) => void)[]> = new Map()
  
  private readonly DEFAULT_CONFIG: GameConfig = {
    graphics: {
      quality: 'medium',
      shadows: true,
      antialiasing: true,
      postProcessing: false,
      particleEffects: true,
      screenShake: true
    },
    audio: {
      masterVolume: 1.0,
      musicVolume: 0.7,
      sfxVolume: 0.8,
      muted: false
    },
    gameplay: {
      difficulty: 'normal',
      showTutorial: true,
      showFPS: false,
      debugMode: false
    },
    controls: {
      mouseSensitivity: 1.0,
      invertYAxis: false,
      vibration: true,
      keyBindings: {
        'jump': ['Space', ' '],
        'attack': ['f', 'F'],
        'pause': ['p', 'P', 'Escape'],
        'restart': ['r', 'R']
      }
    }
  }
  
  private constructor() {
    this.storage = Storage.getInstance()
    this.config = this.loadConfiguration()
  }
  
  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager()
    }
    return ConfigurationManager.instance
  }
  
  /**
   * Get a configuration value
   */
  get<K extends keyof GameConfig>(category: K): GameConfig[K]
  get<K extends keyof GameConfig, P extends keyof GameConfig[K]>(
    category: K,
    property: P
  ): GameConfig[K][P]
  get<K extends keyof GameConfig>(category: K, property?: string): unknown {
    if (property === undefined) {
      return this.config[category]
    }
    return (this.config[category] as Record<string, unknown>)[property]
  }
  
  /**
   * Set a configuration value
   */
  set<K extends keyof GameConfig>(category: K, value: GameConfig[K]): void
  set<K extends keyof GameConfig, P extends keyof GameConfig[K]>(
    category: K,
    property: P,
    value: GameConfig[K][P]
  ): void
  set<K extends keyof GameConfig>(category: K, propertyOrValue: unknown, value?: unknown): void {
    if (value === undefined) {
      // Setting entire category
      this.config[category] = propertyOrValue as GameConfig[K]
      this.notifyListeners(`${category}`, propertyOrValue)
    } else {
      // Setting specific property
      const prop = propertyOrValue as string;
      (this.config[category] as Record<string, unknown>)[prop] = value
      this.notifyListeners(`${category}.${prop}`, value)
    }
    
    // Save configuration
    this.saveConfiguration()
  }
  
  /**
   * Get the entire configuration
   */
  getAll(): GameConfig {
    return { ...this.config }
  }
  
  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = JSON.parse(JSON.stringify(this.DEFAULT_CONFIG))
    this.saveConfiguration()
    this.notifyListeners('*', this.config)
    logger.info('Configuration reset to defaults')
  }
  
  /**
   * Reset a specific category to defaults
   */
  resetCategory<K extends keyof GameConfig>(category: K): void {
    this.config[category] = JSON.parse(JSON.stringify(this.DEFAULT_CONFIG[category]))
    this.saveConfiguration()
    this.notifyListeners(category, this.config[category])
    logger.info(`Configuration category '${category}' reset to defaults`)
  }
  
  /**
   * Apply graphics quality preset
   */
  applyGraphicsPreset(quality: 'low' | 'medium' | 'high'): void {
    switch (quality) {
      case 'low':
        this.config.graphics = {
          quality: 'low',
          shadows: false,
          antialiasing: false,
          postProcessing: false,
          particleEffects: false,
          screenShake: true
        }
        break
      
      case 'medium':
        this.config.graphics = {
          quality: 'medium',
          shadows: true,
          antialiasing: true,
          postProcessing: false,
          particleEffects: true,
          screenShake: true
        }
        break
      
      case 'high':
        this.config.graphics = {
          quality: 'high',
          shadows: true,
          antialiasing: true,
          postProcessing: true,
          particleEffects: true,
          screenShake: true
        }
        break
    }
    
    this.saveConfiguration()
    this.notifyListeners('graphics', this.config.graphics)
    logger.info(`Applied graphics preset: ${quality}`)
  }
  
  /**
   * Subscribe to configuration changes
   */
  subscribe(path: string, callback: (value: unknown) => void): () => void {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, [])
    }
    
    this.listeners.get(path)!.push(callback)
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(path)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index !== -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }
  
  /**
   * Load configuration from a JSON file/URL
   */
  async loadFromFile(url: string): Promise<void> {
    try {
      const response = await fetch(url)
      const data = await response.json()
      
      // Validate and merge with defaults
      this.config = this.mergeConfigs(this.DEFAULT_CONFIG, data)
      this.saveConfiguration()
      this.notifyListeners('*', this.config)
      
      logger.info(`Configuration loaded from: ${url}`)
    } catch (error) {
      logger.error('Failed to load configuration file:', error)
      throw error
    }
  }
  
  /**
   * Export configuration as JSON
   */
  export(): string {
    return JSON.stringify(this.config, null, 2)
  }
  
  /**
   * Import configuration from JSON string
   */
  import(jsonString: string): void {
    try {
      const data = JSON.parse(jsonString)
      this.config = this.mergeConfigs(this.DEFAULT_CONFIG, data)
      this.saveConfiguration()
      this.notifyListeners('*', this.config)
      logger.info('Configuration imported successfully')
    } catch (error) {
      logger.error('Failed to import configuration:', error)
      throw error
    }
  }
  
  /**
   * Get difficulty multipliers
   */
  getDifficultyMultipliers(): {
    enemyHealth: number
    enemyDamage: number
    enemySpeed: number
    playerDamage: number
    scoreMultiplier: number
  } {
    switch (this.config.gameplay.difficulty) {
      case 'easy':
        return {
          enemyHealth: 0.7,
          enemyDamage: 0.7,
          enemySpeed: 0.8,
          playerDamage: 1.5,
          scoreMultiplier: 0.8
        }
      
      case 'hard':
        return {
          enemyHealth: 1.5,
          enemyDamage: 1.5,
          enemySpeed: 1.3,
          playerDamage: 0.8,
          scoreMultiplier: 1.5
        }
      
      case 'normal':
      default:
        return {
          enemyHealth: 1.0,
          enemyDamage: 1.0,
          enemySpeed: 1.0,
          playerDamage: 1.0,
          scoreMultiplier: 1.0
        }
    }
  }
  
  private loadConfiguration(): GameConfig {
    const saved = this.storage.load('config') as GameConfig | null
    if (saved) {
      // Merge with defaults to ensure all properties exist
      return this.mergeConfigs(this.DEFAULT_CONFIG, saved)
    }
    return JSON.parse(JSON.stringify(this.DEFAULT_CONFIG))
  }
  
  private saveConfiguration(): void {
    this.storage.save('config', this.config as unknown as StorageData)
  }
  
  private mergeConfigs(defaults: GameConfig, overrides: Partial<GameConfig>): GameConfig {
    const result = JSON.parse(JSON.stringify(defaults))
    
    // Deep merge
    const merge = (target: Record<string, unknown>, source: Record<string, unknown>) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {}
          merge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>)
        } else {
          target[key] = source[key]
        }
      }
    }
    
    merge(result as Record<string, unknown>, overrides as Record<string, unknown>)
    return result as GameConfig
  }
  
  private notifyListeners(path: string, value: unknown): void {
    // Notify exact path listeners
    const exactListeners = this.listeners.get(path)
    if (exactListeners) {
      exactListeners.forEach(callback => callback(value))
    }
    
    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get('*')
    if (wildcardListeners) {
      wildcardListeners.forEach(callback => callback(this.config))
    }
    
    // Notify parent path listeners
    const parts = path.split('.')
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('.')
      const parentListeners = this.listeners.get(parentPath)
      if (parentListeners) {
        const parentValue = parentPath.split('.').reduce((obj: Record<string, unknown>, key) => obj[key] as Record<string, unknown>, this.config as unknown as Record<string, unknown>)
        parentListeners.forEach(callback => callback(parentValue))
      }
    }
  }
}