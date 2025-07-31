import { logger } from '../utils/Logger'

export interface StorageData {
  [key: string]: unknown
}

export interface SaveData {
  version: string
  timestamp: number
  data: StorageData
}

export class Storage {
  private static instance: Storage
  private prefix: string
  private version: string

  private constructor(prefix = 'game', version = '1.0.0') {
    this.prefix = prefix
    this.version = version
  }

  static getInstance(prefix = 'game', version = '1.0.0'): Storage {
    if (!Storage.instance) {
      Storage.instance = new Storage(prefix, version)
    }
    return Storage.instance
  }

  /**
   * Save data to localStorage
   */
  save(key: string, data: StorageData): boolean {
    try {
      const saveData: SaveData = {
        version: this.version,
        timestamp: Date.now(),
        data
      }
      const fullKey = `${this.prefix}_${key}`
      localStorage.setItem(fullKey, JSON.stringify(saveData))
      return true
    } catch (error) {
      logger.error('Failed to save data:', error)
      return false
    }
  }

  /**
   * Load data from localStorage
   */
  load(key: string): StorageData | null {
    try {
      const fullKey = `${this.prefix}_${key}`
      const item = localStorage.getItem(fullKey)
      
      if (!item) return null
      
      const saveData: SaveData = JSON.parse(item)
      
      // Version check for future compatibility
      if (saveData.version !== this.version) {
        logger.warn(`Save data version mismatch: ${saveData.version} vs ${this.version}`)
        // In the future, you could add migration logic here
      }
      
      return saveData.data
    } catch (error) {
      logger.error('Failed to load data:', error)
      return null
    }
  }

  /**
   * Delete saved data
   */
  delete(key: string): boolean {
    try {
      const fullKey = `${this.prefix}_${key}`
      localStorage.removeItem(fullKey)
      return true
    } catch (error) {
      logger.error('Failed to delete data:', error)
      return false
    }
  }

  /**
   * Check if save data exists
   */
  exists(key: string): boolean {
    const fullKey = `${this.prefix}_${key}`
    return localStorage.getItem(fullKey) !== null
  }

  /**
   * Get all saved keys for this game
   */
  getAllKeys(): string[] {
    const keys: string[] = []
    const prefixLength = this.prefix.length + 1 // +1 for underscore

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(`${this.prefix}_`)) {
        keys.push(key.substring(prefixLength))
      }
    }

    return keys
  }

  /**
   * Clear all saved data for this game
   */
  clearAll(): boolean {
    try {
      const keys = this.getAllKeys()
      keys.forEach(key => this.delete(key))
      return true
    } catch (error) {
      logger.error('Failed to clear all data:', error)
      return false
    }
  }

  /**
   * Get storage size in bytes (approximate)
   */
  getStorageSize(): number {
    let size = 0
    const keys = this.getAllKeys()
    
    keys.forEach(key => {
      const fullKey = `${this.prefix}_${key}`
      const item = localStorage.getItem(fullKey)
      if (item) {
        size += item.length * 2 // Approximate bytes (UTF-16)
      }
    })
    
    return size
  }

  /**
   * Export all saved data (useful for backup)
   */
  exportAll(): Record<string, SaveData> {
    const allData: Record<string, SaveData> = {}
    const keys = this.getAllKeys()
    
    keys.forEach(key => {
      const fullKey = `${this.prefix}_${key}`
      const item = localStorage.getItem(fullKey)
      if (item) {
        try {
          allData[key] = JSON.parse(item)
        } catch (error) {
          logger.error(`Failed to parse data for key ${key}:`, error)
        }
      }
    })
    
    return allData
  }

  /**
   * Import saved data (useful for restore)
   */
  importAll(data: Record<string, SaveData>): boolean {
    try {
      Object.entries(data).forEach(([key, saveData]) => {
        const fullKey = `${this.prefix}_${key}`
        localStorage.setItem(fullKey, JSON.stringify(saveData))
      })
      return true
    } catch (error) {
      logger.error('Failed to import data:', error)
      return false
    }
  }
}

// Convenience functions for common use cases
export const GameStorage = {
  saveGame(slot: number, gameState: unknown): boolean {
    return Storage.getInstance().save(`save_${slot}`, gameState)
  },

  loadGame(slot: number): unknown {
    return Storage.getInstance().load(`save_${slot}`)
  },

  saveSettings(settings: unknown): boolean {
    return Storage.getInstance().save('settings', settings)
  },

  loadSettings(): unknown {
    return Storage.getInstance().load('settings')
  },

  saveProgress(progress: unknown): boolean {
    return Storage.getInstance().save('progress', progress)
  },

  loadProgress(): unknown {
    return Storage.getInstance().load('progress')
  }
}