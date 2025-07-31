export interface Timer {
  id: string
  duration: number
  elapsed: number
  callback: () => void
  repeat: boolean
  active: boolean
}

export class TimeManager {
  private static instance: TimeManager
  private lastTime: number = 0
  private deltaTime: number = 0
  private elapsedTime: number = 0
  private timeScale: number = 1
  private isPaused: boolean = false
  private timers: Map<string, Timer> = new Map()
  private timerIdCounter: number = 0
  
  // Performance tracking
  private frameCount: number = 0
  private fpsUpdateInterval: number = 1000 // Update FPS every second
  private lastFpsUpdate: number = 0
  private currentFps: number = 0
  
  private constructor() {
    this.lastTime = performance.now()
  }

  static getInstance(): TimeManager {
    if (!TimeManager.instance) {
      TimeManager.instance = new TimeManager()
    }
    return TimeManager.instance
  }

  /**
   * Update time manager - should be called once per frame
   */
  update(currentTime: number): void {
    if (this.isPaused) return

    // Calculate delta time in seconds
    const rawDeltaTime = (currentTime - this.lastTime) / 1000
    this.deltaTime = Math.min(rawDeltaTime * this.timeScale, 0.1) // Cap at 100ms to prevent large jumps
    this.lastTime = currentTime
    this.elapsedTime += this.deltaTime

    // Update FPS
    this.updateFps(currentTime)

    // Update all active timers
    this.updateTimers(this.deltaTime)
  }

  /**
   * Get delta time (time since last frame in seconds)
   */
  getDeltaTime(): number {
    return this.deltaTime
  }

  /**
   * Get unscaled delta time
   */
  getUnscaledDeltaTime(): number {
    return this.deltaTime / this.timeScale
  }

  /**
   * Get total elapsed time since start
   */
  getElapsedTime(): number {
    return this.elapsedTime
  }

  /**
   * Get/Set time scale (for slow motion or speed up effects)
   */
  getTimeScale(): number {
    return this.timeScale
  }

  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale)
  }

  /**
   * Pause/Resume time
   */
  pause(): void {
    this.isPaused = true
  }

  resume(): void {
    this.isPaused = false
    this.lastTime = performance.now() // Reset to prevent jump
  }

  isPausedState(): boolean {
    return this.isPaused
  }

  /**
   * FPS tracking
   */
  getFps(): number {
    return Math.round(this.currentFps)
  }

  private updateFps(currentTime: number): void {
    this.frameCount++

    if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      this.currentFps = (this.frameCount * 1000) / (currentTime - this.lastFpsUpdate)
      this.frameCount = 0
      this.lastFpsUpdate = currentTime
    }
  }

  /**
   * Timer management
   */
  
  /**
   * Create a one-time timer
   */
  setTimeout(callback: () => void, duration: number): string {
    const id = `timer_${this.timerIdCounter++}`
    const timer: Timer = {
      id,
      duration,
      elapsed: 0,
      callback,
      repeat: false,
      active: true
    }
    this.timers.set(id, timer)
    return id
  }

  /**
   * Create a repeating timer
   */
  setInterval(callback: () => void, duration: number): string {
    const id = `timer_${this.timerIdCounter++}`
    const timer: Timer = {
      id,
      duration,
      elapsed: 0,
      callback,
      repeat: true,
      active: true
    }
    this.timers.set(id, timer)
    return id
  }

  /**
   * Clear a timer
   */
  clearTimer(id: string): void {
    this.timers.delete(id)
  }

  /**
   * Clear all timers
   */
  clearAllTimers(): void {
    this.timers.clear()
  }

  /**
   * Pause/Resume a specific timer
   */
  pauseTimer(id: string): void {
    const timer = this.timers.get(id)
    if (timer) {
      timer.active = false
    }
  }

  resumeTimer(id: string): void {
    const timer = this.timers.get(id)
    if (timer) {
      timer.active = true
    }
  }

  private updateTimers(deltaTime: number): void {
    const timersToRemove: string[] = []

    this.timers.forEach((timer, id) => {
      if (!timer.active) return

      timer.elapsed += deltaTime

      if (timer.elapsed >= timer.duration) {
        timer.callback()

        if (timer.repeat) {
          timer.elapsed -= timer.duration
        } else {
          timersToRemove.push(id)
        }
      }
    })

    // Remove completed one-time timers
    timersToRemove.forEach(id => this.timers.delete(id))
  }

  /**
   * Utility functions
   */

  /**
   * Wait for a specific duration (returns a promise)
   */
  wait(duration: number): Promise<void> {
    return new Promise(resolve => {
      this.setTimeout(resolve, duration)
    })
  }

  /**
   * Create a countdown timer
   */
  createCountdown(duration: number, onUpdate: (remaining: number) => void, onComplete: () => void): string {
    let remaining = duration
    
    const timerId = this.setInterval(() => {
      remaining -= 1
      onUpdate(remaining)
      
      if (remaining <= 0) {
        this.clearTimer(timerId)
        onComplete()
      }
    }, 1)
    
    return timerId
  }

  /**
   * Frame-independent lerp
   */
  lerp(from: number, to: number, speed: number): number {
    const t = 1 - Math.pow(1 - speed, this.deltaTime * 60) // Normalized to 60 FPS
    return from + (to - from) * t
  }

  /**
   * Frame-independent smooth damp
   */
  smoothDamp(current: number, target: number, velocity: { value: number }, smoothTime: number): number {
    const omega = 2 / smoothTime
    const x = omega * this.deltaTime
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
    const change = current - target
    const temp = (velocity.value + omega * change) * this.deltaTime
    velocity.value = (velocity.value - omega * temp) * exp
    return target + (change + temp) * exp
  }

  /**
   * Reset time manager
   */
  reset(): void {
    this.lastTime = performance.now()
    this.deltaTime = 0
    this.elapsedTime = 0
    this.frameCount = 0
    this.lastFpsUpdate = 0
    this.currentFps = 0
    this.clearAllTimers()
  }
}