import * as THREE from 'three'
import { logger } from '../utils/Logger'

export interface SoundOptions {
  volume?: number
  loop?: boolean
  autoplay?: boolean
}

export class AudioManager {
  private static instance: AudioManager
  
  // Volume controls
  private masterVolume = 1
  private musicVolume = 1
  private sfxVolume = 1
  private muted = false
  
  // Currently playing music
  private currentMusic?: HTMLAudioElement
  
  // Sound cache
  private soundCache: Map<string, HTMLAudioElement> = new Map()
  private soundUrls: Map<string, string> = new Map()

  private constructor() {
    // No Three.js AudioListener needed!
  }

  static initialize(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager()
    }
    return AudioManager.instance
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      throw new Error('AudioManager not initialized. Call AudioManager.initialize() first.')
    }
    return AudioManager.instance
  }

  /**
   * Play a 2D sound using HTML5 Audio
   */
  play2D(soundKey: string, options: SoundOptions = {}): HTMLAudioElement | null {
    const soundUrl = this.soundUrls.get(soundKey)
    if (!soundUrl) {
      logger.warn(`Sound key '${soundKey}' not found`)
      return null
    }

    let baseAudio = this.soundCache.get(soundKey)
    if (!baseAudio) {
      baseAudio = new Audio(soundUrl)
      baseAudio.preload = 'auto'
      baseAudio.load()
      this.soundCache.set(soundKey, baseAudio)
    }

    const audio = baseAudio.cloneNode(true) as HTMLAudioElement
    audio.src = soundUrl
    audio.currentTime = 0
    
    // Set properties
    const volume = (options.volume || 1) * this.sfxVolume * this.masterVolume
    audio.volume = Math.max(0, Math.min(1, volume))
    audio.loop = options.loop || false
    
    if (!this.muted && options.autoplay !== false) {
      audio.play().catch(error => {
        logger.warn(`Failed to play audio '${soundKey}':`, error)
      })
    }
    
    return audio
  }

  /**
   * Alias for play2D - for compatibility with existing code
   */
  play3D(soundKey: string, position: THREE.Vector3, options: SoundOptions = {}): HTMLAudioElement | null {
    // Just play as 2D sound - ignore position since we don't need 3D audio
    return this.play2D(soundKey, options)
  }

  /**
   * Play background music
   */
  async playMusic(soundKey: string, options: SoundOptions = {}): Promise<void> {
    // Stop current music if playing
    if (this.currentMusic) {
      this.currentMusic.pause()
      this.currentMusic = undefined
    }

    const soundUrl = this.soundUrls.get(soundKey) || soundKey
    const audio = new Audio(soundUrl)
    audio.preload = 'auto'
    audio.loop = options.loop !== false // Default to loop for music
    audio.volume = (options.volume || 1) * this.musicVolume * this.masterVolume
    
    if (!this.muted) {
      try {
        await audio.play()
      } catch (error) {
        logger.warn('Failed to play music:', error)
      }
    }
    
    this.currentMusic = audio
  }

  /**
   * Stop current music
   */
  async stopMusic(): Promise<void> {
    if (this.currentMusic) {
      this.currentMusic.pause()
      this.currentMusic = undefined
    }
  }

  /**
   * Volume controls
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume))
    if (this.currentMusic) {
      this.currentMusic.volume = this.musicVolume * this.masterVolume
    }
  }

  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume))
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    
    if (this.currentMusic) {
      if (muted) {
        this.currentMusic.pause()
      } else {
        this.currentMusic.play().catch(error => {
          logger.warn('Failed to resume music:', error)
        })
      }
    }
  }

  toggleMute(): void {
    this.setMuted(!this.muted)
  }

  getMasterVolume(): number {
    return this.masterVolume
  }

  getMusicVolume(): number {
    return this.musicVolume
  }

  getSFXVolume(): number {
    return this.sfxVolume
  }

  isMuted(): boolean {
    return this.muted
  }

  registerSound(key: string, url: string): void {
    this.soundUrls.set(key, url)
  }

  registerSounds(definitions: Array<{ key: string, url: string }>): void {
    definitions.forEach(({ key, url }) => this.registerSound(key, url))
  }

  async preloadSound(key: string): Promise<void> {
    const url = this.soundUrls.get(key)
    if (!url) {
      logger.warn(`Cannot preload sound '${key}' because it is not registered`)
      return
    }

    if (this.soundCache.has(key)) {
      const cached = this.soundCache.get(key)
      if (cached && cached.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        return
      }
    }

    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url)
      audio.preload = 'auto'
      audio.addEventListener('canplaythrough', () => {
        this.soundCache.set(key, audio)
        resolve()
      }, { once: true })
      audio.addEventListener('error', (event) => {
        reject(event)
      }, { once: true })
      audio.load()
    }).catch(error => {
      logger.warn(`Failed to preload audio '${key}':`, error)
    })
  }

  async preloadSounds(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.preloadSound(key)))
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.currentMusic) {
      this.currentMusic.pause()
      this.currentMusic = undefined
    }
    this.soundCache.clear()
    this.soundUrls.clear()
  }
}
