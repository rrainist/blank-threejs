import * as THREE from 'three'
import { logger } from '../utils/Logger'

export class AssetLoader {
  private static instance: AssetLoader
  
  // Loaders
  private textureLoader: THREE.TextureLoader
  private audioLoader: THREE.AudioLoader
  
  // Caches
  private textures: Map<string, THREE.Texture> = new Map()
  private sounds: Map<string, AudioBuffer> = new Map()

  private constructor() {
    this.textureLoader = new THREE.TextureLoader()
    this.audioLoader = new THREE.AudioLoader()
    logger.info('AssetLoader initialized')
  }

  static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader()
    }
    return AssetLoader.instance
  }

  /**
   * Load texture
   */
  async loadTexture(key: string, url: string): Promise<THREE.Texture> {
    // Check cache
    if (this.textures.has(key)) {
      return this.textures.get(key)!
    }
    
    return new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          this.textures.set(key, texture)
          logger.debug(`Texture loaded: ${key}`)
          resolve(texture)
        },
        undefined,
        (error) => {
          logger.error(`Failed to load texture ${key}:`, error)
          reject(error)
        }
      )
    })
  }

  /**
   * Load sound
   */
  async loadSound(key: string, url: string): Promise<AudioBuffer> {
    // Check cache
    if (this.sounds.has(key)) {
      return this.sounds.get(key)!
    }
    
    return new Promise<AudioBuffer>((resolve, reject) => {
      this.audioLoader.load(
        url,
        (buffer) => {
          this.sounds.set(key, buffer)
          logger.debug(`Sound loaded: ${key}`)
          resolve(buffer)
        },
        undefined,
        (error) => {
          logger.error(`Failed to load sound ${key}:`, error)
          reject(error)
        }
      )
    })
  }

  /**
   * Get cached assets
   */
  getTexture(key: string): THREE.Texture | undefined {
    return this.textures.get(key)
  }

  getSound(key: string): AudioBuffer | undefined {
    return this.sounds.get(key)
  }

  /**
   * Add sound to cache
   */
  addSound(key: string, buffer: AudioBuffer): void {
    this.sounds.set(key, buffer)
  }

  /**
   * Create common textures
   */
  createCommonTextures(): void {
    // White texture
    const whiteTexture = new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 255]),
      1, 1,
      THREE.RGBAFormat
    )
    whiteTexture.needsUpdate = true
    this.textures.set('white', whiteTexture)
    
    // Black texture
    const blackTexture = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 255]),
      1, 1,
      THREE.RGBAFormat
    )
    blackTexture.needsUpdate = true
    this.textures.set('black', blackTexture)
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    // Dispose textures
    this.textures.forEach(texture => texture.dispose())
    this.textures.clear()
    
    // Clear sound cache
    this.sounds.clear()
    
    logger.info('AssetLoader cache cleared')
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.clearCache()
    logger.info('AssetLoader disposed')
  }
}