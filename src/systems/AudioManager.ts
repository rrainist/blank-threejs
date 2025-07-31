import * as THREE from 'three'
import { AssetLoader } from './AssetLoader'

export interface Sound3DOptions {
  refDistance?: number
  rolloffFactor?: number
  maxDistance?: number
  volume?: number
  loop?: boolean
  autoplay?: boolean
}

export interface SoundOptions {
  volume?: number
  loop?: boolean
  autoplay?: boolean
}

export class AudioManager {
  private static instance: AudioManager
  private listener: THREE.AudioListener
  private assetLoader: AssetLoader
  
  // Audio pools for reuse
  private audioPool: THREE.Audio[] = []
  private positionalAudioPool: THREE.PositionalAudio[] = []
  private activeAudio: Set<THREE.Audio | THREE.PositionalAudio> = new Set()
  
  // Volume controls
  private masterVolume = 1
  private musicVolume = 1
  private sfxVolume = 1
  private muted = false
  
  // Currently playing music
  private currentMusic?: THREE.Audio
  private musicFadeTime = 1 // seconds

  private constructor(camera: THREE.Camera) {
    this.listener = new THREE.AudioListener()
    camera.add(this.listener)
    this.assetLoader = AssetLoader.getInstance()
    
    // Create initial pool
    this.expandPool()
  }

  static initialize(camera: THREE.Camera): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager(camera)
    }
    return AudioManager.instance
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      throw new Error('AudioManager not initialized. Call AudioManager.initialize(camera) first.')
    }
    return AudioManager.instance
  }

  /**
   * Alias for playSound - Play a 2D sound (UI, music, etc)
   */
  play2D(soundKey: string, options: SoundOptions = {}): THREE.Audio | null {
    return this.playSound(soundKey, options)
  }

  /**
   * Play a 2D sound (UI, music, etc)
   */
  playSound(soundKey: string, options: SoundOptions = {}): THREE.Audio | null {
    const buffer = this.assetLoader.getSound(soundKey)
    if (!buffer) {
      console.warn(`Sound not loaded: ${soundKey}`)
      return null
    }

    const audio = this.getAudioFromPool()
    audio.setBuffer(buffer)
    audio.setLoop(options.loop || false)
    audio.setVolume((options.volume || 1) * this.sfxVolume * this.masterVolume)
    
    if (!this.muted) {
      audio.play()
    }
    
    this.activeAudio.add(audio as THREE.Audio | THREE.PositionalAudio)
    
    // Auto-cleanup for non-looping sounds
    if (!options.loop) {
      audio.onEnded = () => {
        this.activeAudio.delete(audio)
        this.returnAudioToPool(audio)
      }
    }
    
    return audio
  }

  /**
   * Alias for playSound3D - Play a 3D positional sound
   */
  play3D(soundKey: string, position: THREE.Vector3, options: Sound3DOptions = {}): THREE.PositionalAudio | null {
    return this.playSound3D(soundKey, position, options)
  }

  /**
   * Play a 3D positional sound
   */
  playSound3D(soundKey: string, position: THREE.Vector3, options: Sound3DOptions = {}): THREE.PositionalAudio | null {
    const buffer = this.assetLoader.getSound(soundKey)
    if (!buffer) {
      console.warn(`Sound not loaded: ${soundKey}`)
      return null
    }

    const audio = this.getPositionalAudioFromPool()
    audio.setBuffer(buffer)
    audio.setLoop(options.loop || false)
    audio.setVolume((options.volume || 1) * this.sfxVolume * this.masterVolume)
    audio.setRefDistance(options.refDistance || 10)
    audio.setRolloffFactor(options.rolloffFactor || 1)
    audio.setMaxDistance(options.maxDistance || 100)
    audio.position.copy(position)
    
    if (!this.muted) {
      audio.play()
    }
    
    this.activeAudio.add(audio as THREE.Audio | THREE.PositionalAudio)
    
    // Auto-cleanup for non-looping sounds
    if (!options.loop) {
      audio.onEnded = () => {
        this.activeAudio.delete(audio)
        this.returnPositionalAudioToPool(audio)
      }
    }
    
    return audio
  }

  /**
   * Play background music with fade transition
   */
  async playMusic(soundKey: string, options: SoundOptions = {}): Promise<void> {
    const buffer = this.assetLoader.getSound(soundKey)
    if (!buffer) {
      console.warn(`Music not loaded: ${soundKey}`)
      return
    }

    // Fade out current music if playing
    if (this.currentMusic && this.currentMusic.isPlaying) {
      await this.fadeOut(this.currentMusic, this.musicFadeTime)
      this.currentMusic.stop()
      this.returnAudioToPool(this.currentMusic)
    }

    // Play new music
    const audio = this.getAudioFromPool()
    audio.setBuffer(buffer)
    audio.setLoop(options.loop !== false) // Default to loop for music
    audio.setVolume(0) // Start at 0 for fade in
    
    if (!this.muted) {
      audio.play()
      await this.fadeIn(audio, (options.volume || 1) * this.musicVolume * this.masterVolume, this.musicFadeTime)
    } else {
      audio.setVolume((options.volume || 1) * this.musicVolume * this.masterVolume)
    }
    
    this.currentMusic = audio
    this.activeAudio.add(audio as THREE.Audio | THREE.PositionalAudio)
  }

  /**
   * Stop current music with fade
   */
  async stopMusic(): Promise<void> {
    if (this.currentMusic && this.currentMusic.isPlaying) {
      await this.fadeOut(this.currentMusic, this.musicFadeTime)
      this.currentMusic.stop()
      this.activeAudio.delete(this.currentMusic)
      this.returnAudioToPool(this.currentMusic)
      this.currentMusic = undefined
    }
  }

  /**
   * Stop a specific sound
   */
  stopSound(audio: THREE.Audio): void {
    if (audio.isPlaying) {
      audio.stop()
    }
    this.activeAudio.delete(audio)
    
    if (audio instanceof THREE.PositionalAudio) {
      this.returnPositionalAudioToPool(audio)
    } else {
      this.returnAudioToPool(audio)
    }
  }

  /**
   * Stop all sounds
   */
  stopAllSounds(): void {
    this.activeAudio.forEach(audio => {
      if (audio.isPlaying) {
        audio.stop()
      }
    })
    this.activeAudio.clear()
  }

  /**
   * Volume controls
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    this.updateAllVolumes()
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume))
    if (this.currentMusic) {
      this.currentMusic.setVolume(this.musicVolume * this.masterVolume)
    }
  }

  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume))
    this.updateAllVolumes()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    
    if (muted) {
      this.activeAudio.forEach(audio => {
        if (audio.isPlaying) {
          audio.pause()
        }
      })
    } else {
      this.activeAudio.forEach(audio => {
        if (!audio.isPlaying && audio.buffer) {
          audio.play()
        }
      })
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

  isMutedState(): boolean {
    return this.muted
  }

  isMuted(): boolean {
    return this.muted
  }

  /**
   * Preload a sound buffer
   */
  preloadSound(key: string, buffer: AudioBuffer): void {
    this.assetLoader.addSound(key, buffer)
  }

  /**
   * Create a simple oscillator-based sound buffer for placeholder audio
   */
  createOscillatorBuffer(tones: Array<{
    frequency: number
    duration: number
    type?: OscillatorType
    volume?: number
  }>): AudioBuffer {
    const audioContext = this.listener.context
    const sampleRate = audioContext.sampleRate
    
    // Calculate total duration
    const totalDuration = tones.reduce((sum, tone) => sum + tone.duration, 0)
    const frameCount = totalDuration * sampleRate
    
    // Create buffer
    const buffer = audioContext.createBuffer(2, frameCount, sampleRate)
    
    let currentFrame = 0
    
    // Generate tones
    for (const tone of tones) {
      const toneFrames = tone.duration * sampleRate
      const volume = tone.volume || 1
      
      for (let channel = 0; channel < 2; channel++) {
        const channelData = buffer.getChannelData(channel)
        
        for (let i = 0; i < toneFrames; i++) {
          const t = i / sampleRate
          let value = 0
          
          switch (tone.type || 'sine') {
            case 'sine':
              value = Math.sin(2 * Math.PI * tone.frequency * t)
              break
            case 'square':
              value = Math.sin(2 * Math.PI * tone.frequency * t) > 0 ? 1 : -1
              break
            case 'sawtooth':
              value = 2 * (tone.frequency * t % 1) - 1
              break
            case 'triangle':
              const period = 1 / tone.frequency
              const phase = (t % period) / period
              value = 4 * Math.abs(phase - 0.5) - 1
              break
          }
          
          // Apply envelope (simple fade in/out)
          const envelope = Math.min(1, i / (0.01 * sampleRate)) * // Fade in
                           Math.min(1, (toneFrames - i) / (0.01 * sampleRate)) // Fade out
          
          channelData[currentFrame + i] = value * volume * envelope * 0.3 // Reduce overall volume
        }
      }
      
      currentFrame += toneFrames
    }
    
    return buffer
  }

  /**
   * Fade effects
   */
  private fadeIn(audio: THREE.Audio, targetVolume: number, duration: number): Promise<void> {
    return new Promise(resolve => {
      const startVolume = audio.getVolume()
      const startTime = Date.now()
      
      const fade = () => {
        const elapsed = (Date.now() - startTime) / 1000
        const t = Math.min(elapsed / duration, 1)
        const volume = startVolume + (targetVolume - startVolume) * t
        
        audio.setVolume(volume)
        
        if (t < 1) {
          requestAnimationFrame(fade)
        } else {
          resolve()
        }
      }
      
      fade()
    })
  }

  private fadeOut(audio: THREE.Audio, duration: number): Promise<void> {
    return new Promise(resolve => {
      const startVolume = audio.getVolume()
      const startTime = Date.now()
      
      const fade = () => {
        const elapsed = (Date.now() - startTime) / 1000
        const t = Math.min(elapsed / duration, 1)
        const volume = startVolume * (1 - t)
        
        audio.setVolume(volume)
        
        if (t < 1) {
          requestAnimationFrame(fade)
        } else {
          resolve()
        }
      }
      
      fade()
    })
  }

  /**
   * Audio pooling
   */
  private expandPool(): void {
    // Add more audio objects to pools
    for (let i = 0; i < 5; i++) {
      this.audioPool.push(new THREE.Audio(this.listener))
      this.positionalAudioPool.push(new THREE.PositionalAudio(this.listener))
    }
  }

  private getAudioFromPool(): THREE.Audio {
    let audio = this.audioPool.pop()
    if (!audio) {
      audio = new THREE.Audio(this.listener)
    }
    return audio
  }

  private getPositionalAudioFromPool(): THREE.PositionalAudio {
    let audio = this.positionalAudioPool.pop()
    if (!audio) {
      audio = new THREE.PositionalAudio(this.listener)
    }
    return audio
  }

  private returnAudioToPool(audio: THREE.Audio): void {
    audio.disconnect()
    if (audio.buffer) {
      audio.setBuffer(null as any) // Clear buffer reference
    }
    this.audioPool.push(audio)
  }

  private returnPositionalAudioToPool(audio: THREE.PositionalAudio): void {
    audio.disconnect()
    if (audio.buffer) {
      audio.setBuffer(null as any) // Clear buffer reference
    }
    audio.position.set(0, 0, 0)
    this.positionalAudioPool.push(audio)
  }

  private updateAllVolumes(): void {
    this.activeAudio.forEach(audio => {
      if (audio === this.currentMusic) {
        audio.setVolume(this.musicVolume * this.masterVolume)
      } else {
        audio.setVolume(this.sfxVolume * this.masterVolume)
      }
    })
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stopAllSounds()
    this.audioPool.forEach(audio => audio.disconnect())
    this.positionalAudioPool.forEach(audio => audio.disconnect())
    this.audioPool = []
    this.positionalAudioPool = []
  }
}