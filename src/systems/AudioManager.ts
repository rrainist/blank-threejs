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
    // Map sound keys to actual file URLs
    const soundUrls: Record<string, string> = {
      'jump': 'assets/sounds/Movement/Jumping and Landing/sfx_movement_jump8.wav',
      'collect': 'assets/sounds/General Sounds/Coins/sfx_coin_single1.wav',
      'damage': 'assets/sounds/General Sounds/Simple Damage Sounds/sfx_damage_hit5.wav',
      'gameOver': 'assets/sounds/Death Screams/Human/sfx_deathscream_human1.wav',
      'button': 'assets/sounds/General Sounds/Buttons/sfx_sounds_button6.wav',
      'powerup': 'assets/sounds/General Sounds/Positive Sounds/sfx_sounds_powerup10.wav'
    }
    
    const soundUrl = soundUrls[soundKey]
    if (!soundUrl) {
      logger.warn(`Sound key '${soundKey}' not found`)
      return null
    }
    
    const audio = new Audio(soundUrl)
    
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

    // Create new music audio
    const audio = new Audio()
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

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.currentMusic) {
      this.currentMusic.pause()
      this.currentMusic = undefined
    }
    this.soundCache.clear()
  }
}