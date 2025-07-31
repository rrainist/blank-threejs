import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { logger } from '../utils/Logger'

export interface AssetLoadProgress {
  url: string
  loaded: number
  total: number
  percent: number
}

export interface AssetManifest {
  textures?: { [key: string]: string }
  models?: { [key: string]: string }
  sounds?: { [key: string]: string }
  fonts?: { [key: string]: string }
  json?: { [key: string]: string }
}

type LoadProgressCallback = (progress: AssetLoadProgress) => void
type LoadCompleteCallback = () => void
type LoadErrorCallback = (error: Error) => void

export class AssetLoader {
  private static instance: AssetLoader
  
  // Loaders
  private textureLoader: THREE.TextureLoader
  private gltfLoader: GLTFLoader
  private audioLoader: THREE.AudioLoader
  private fileLoader: THREE.FileLoader
  
  // Caches
  private textures: Map<string, THREE.Texture> = new Map()
  private models: Map<string, THREE.Group> = new Map()
  private sounds: Map<string, AudioBuffer> = new Map()
  private jsonData: Map<string, unknown> = new Map()
  
  // Loading state
  private loadingQueue: Map<string, Promise<THREE.Texture | THREE.Group | AudioBuffer | unknown>> = new Map()
  private totalAssets = 0
  private loadedAssets = 0
  
  // Callbacks
  private progressCallbacks: LoadProgressCallback[] = []
  private completeCallbacks: LoadCompleteCallback[] = []
  private errorCallbacks: LoadErrorCallback[] = []

  private constructor() {
    this.textureLoader = new THREE.TextureLoader()
    this.gltfLoader = new GLTFLoader()
    this.audioLoader = new THREE.AudioLoader()
    this.fileLoader = new THREE.FileLoader()
    
    // Configure loaders
    this.fileLoader.setResponseType('text')
  }

  static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader()
    }
    return AssetLoader.instance
  }

  /**
   * Load a manifest of assets
   */
  async loadManifest(manifest: AssetManifest): Promise<void> {
    const promises: Promise<THREE.Texture | THREE.Group | AudioBuffer | unknown>[] = []
    
    // Count total assets
    this.totalAssets = 0
    if (manifest.textures) this.totalAssets += Object.keys(manifest.textures).length
    if (manifest.models) this.totalAssets += Object.keys(manifest.models).length
    if (manifest.sounds) this.totalAssets += Object.keys(manifest.sounds).length
    if (manifest.json) this.totalAssets += Object.keys(manifest.json).length
    
    this.loadedAssets = 0
    
    // Load textures
    if (manifest.textures) {
      for (const [key, url] of Object.entries(manifest.textures)) {
        promises.push(this.loadTexture(key, url))
      }
    }
    
    // Load models
    if (manifest.models) {
      for (const [key, url] of Object.entries(manifest.models)) {
        promises.push(this.loadModel(key, url))
      }
    }
    
    // Load sounds
    if (manifest.sounds) {
      for (const [key, url] of Object.entries(manifest.sounds)) {
        promises.push(this.loadSound(key, url))
      }
    }
    
    // Load JSON data
    if (manifest.json) {
      for (const [key, url] of Object.entries(manifest.json)) {
        promises.push(this.loadJSON(key, url))
      }
    }
    
    try {
      await Promise.all(promises)
      this.onLoadComplete()
    } catch (error) {
      this.onLoadError(error as Error)
    }
  }

  /**
   * Load individual assets
   */
  async loadTexture(key: string, url: string): Promise<THREE.Texture> {
    // Check cache
    if (this.textures.has(key)) {
      return this.textures.get(key)!
    }
    
    // Check if already loading
    if (this.loadingQueue.has(url)) {
      return this.loadingQueue.get(url) as Promise<THREE.Texture>
    }
    
    const promise = new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          this.textures.set(key, texture)
          this.onAssetLoaded(url)
          this.loadingQueue.delete(url)
          resolve(texture)
        },
        (progress) => {
          this.onLoadProgress(url, progress.loaded, progress.total)
        },
        (error) => {
          this.loadingQueue.delete(url)
          reject(error)
        }
      )
    })
    
    this.loadingQueue.set(url, promise)
    return promise
  }

  async loadModel(key: string, url: string): Promise<THREE.Group> {
    // Check cache
    if (this.models.has(key)) {
      return this.models.get(key)!.clone()
    }
    
    // Check if already loading
    if (this.loadingQueue.has(url)) {
      const model = await this.loadingQueue.get(url) as THREE.Group
      return model.clone()
    }
    
    const promise = new Promise<THREE.Group>((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          this.models.set(key, gltf.scene)
          this.onAssetLoaded(url)
          this.loadingQueue.delete(url)
          resolve(gltf.scene.clone())
        },
        (progress) => {
          this.onLoadProgress(url, progress.loaded, progress.total)
        },
        (error) => {
          this.loadingQueue.delete(url)
          reject(error)
        }
      )
    })
    
    this.loadingQueue.set(url, promise)
    return promise
  }

  async loadSound(key: string, url: string): Promise<AudioBuffer> {
    // Check cache
    if (this.sounds.has(key)) {
      return this.sounds.get(key)!
    }
    
    // Check if already loading
    if (this.loadingQueue.has(url)) {
      return this.loadingQueue.get(url) as Promise<AudioBuffer>
    }
    
    const promise = new Promise<AudioBuffer>((resolve, reject) => {
      this.audioLoader.load(
        url,
        (buffer) => {
          this.sounds.set(key, buffer)
          this.onAssetLoaded(url)
          this.loadingQueue.delete(url)
          resolve(buffer)
        },
        (progress) => {
          this.onLoadProgress(url, progress.loaded, progress.total)
        },
        (error) => {
          this.loadingQueue.delete(url)
          reject(error)
        }
      )
    })
    
    this.loadingQueue.set(url, promise)
    return promise
  }

  async loadJSON(key: string, url: string): Promise<unknown> {
    // Check cache
    if (this.jsonData.has(key)) {
      return this.jsonData.get(key)
    }
    
    // Check if already loading
    if (this.loadingQueue.has(url)) {
      return this.loadingQueue.get(url)
    }
    
    const promise = new Promise<unknown>((resolve, reject) => {
      this.fileLoader.load(
        url,
        (data) => {
          try {
            const json = JSON.parse(data as string)
            this.jsonData.set(key, json)
            this.onAssetLoaded(url)
            this.loadingQueue.delete(url)
            resolve(json)
          } catch (error) {
            reject(error)
          }
        },
        (progress) => {
          this.onLoadProgress(url, progress.loaded, progress.total)
        },
        (error) => {
          this.loadingQueue.delete(url)
          reject(error)
        }
      )
    })
    
    this.loadingQueue.set(url, promise)
    return promise
  }

  /**
   * Get cached assets
   */
  getTexture(key: string): THREE.Texture | undefined {
    return this.textures.get(key)
  }

  getModel(key: string): THREE.Group | undefined {
    return this.models.get(key)?.clone()
  }

  getSound(key: string): AudioBuffer | undefined {
    return this.sounds.get(key)
  }

  addSound(key: string, buffer: AudioBuffer): void {
    this.sounds.set(key, buffer)
  }

  getJSON(key: string): unknown {
    return this.jsonData.get(key)
  }

  /**
   * Check if asset is loaded
   */
  hasTexture(key: string): boolean {
    return this.textures.has(key)
  }

  hasModel(key: string): boolean {
    return this.models.has(key)
  }

  hasSound(key: string): boolean {
    return this.sounds.has(key)
  }

  hasJSON(key: string): boolean {
    return this.jsonData.has(key)
  }

  /**
   * Preload common textures
   */
  preloadCommonTextures(): void {
    // Create common procedural textures
    const whiteTexture = new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 255]),
      1, 1,
      THREE.RGBAFormat
    )
    whiteTexture.needsUpdate = true
    this.textures.set('white', whiteTexture)
    
    const blackTexture = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 255]),
      1, 1,
      THREE.RGBAFormat
    )
    blackTexture.needsUpdate = true
    this.textures.set('black', blackTexture)
    
    const normalTexture = new THREE.DataTexture(
      new Uint8Array([128, 128, 255, 255]),
      1, 1,
      THREE.RGBAFormat
    )
    normalTexture.needsUpdate = true
    this.textures.set('normal', normalTexture)
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    // Dispose textures
    this.textures.forEach(texture => texture.dispose())
    this.textures.clear()
    
    // Clear other caches
    this.models.clear()
    this.sounds.clear()
    this.jsonData.clear()
    this.loadingQueue.clear()
  }

  /**
   * Event handlers
   */
  onProgress(callback: LoadProgressCallback): void {
    this.progressCallbacks.push(callback)
  }

  onComplete(callback: LoadCompleteCallback): void {
    this.completeCallbacks.push(callback)
  }

  onError(callback: LoadErrorCallback): void {
    this.errorCallbacks.push(callback)
  }

  private onLoadProgress(url: string, loaded: number, total: number): void {
    const percent = total > 0 ? (loaded / total) * 100 : 0
    const progress: AssetLoadProgress = { url, loaded, total, percent }
    this.progressCallbacks.forEach(callback => callback(progress))
  }

  private onAssetLoaded(_url: string): void {
    this.loadedAssets++
    const overallPercent = (this.loadedAssets / this.totalAssets) * 100
    const progress: AssetLoadProgress = {
      url: 'overall',
      loaded: this.loadedAssets,
      total: this.totalAssets,
      percent: overallPercent
    }
    this.progressCallbacks.forEach(callback => callback(progress))
  }

  private onLoadComplete(): void {
    this.completeCallbacks.forEach(callback => callback())
  }

  private onLoadError(error: Error): void {
    logger.error('Asset loading error:', error)
    this.errorCallbacks.forEach(callback => callback(error))
  }

  /**
   * Get loading progress
   */
  getProgress(): number {
    return this.totalAssets > 0 ? (this.loadedAssets / this.totalAssets) * 100 : 100
  }

  isLoading(): boolean {
    return this.loadingQueue.size > 0
  }
}