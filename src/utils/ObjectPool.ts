export interface Poolable {
  reset(): void
  active: boolean
}

export class ObjectPool<T extends Poolable> {
  private pool: T[] = []
  private activeObjects: Set<T> = new Set()
  private createFn: () => T
  private resetFn?: (obj: T) => void
  private maxSize: number

  constructor(
    createFn: () => T,
    initialSize = 10,
    maxSize = 100,
    resetFn?: (obj: T) => void
  ) {
    this.createFn = createFn
    this.maxSize = maxSize
    this.resetFn = resetFn
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createObject())
    }
  }

  /**
   * Get an object from the pool
   */
  get(): T {
    let obj: T
    
    if (this.pool.length > 0) {
      obj = this.pool.pop()!
    } else if (this.activeObjects.size < this.maxSize) {
      obj = this.createObject()
    } else {
      // Pool is exhausted, find and reuse the oldest active object
      const firstActive = this.activeObjects.values().next().value
      if (firstActive) {
        obj = firstActive
        this.release(obj)
      } else {
        throw new Error('Pool exhausted and no active objects available')
      }
    }
    
    obj.active = true
    this.activeObjects.add(obj)
    return obj
  }

  /**
   * Return an object to the pool
   */
  release(obj: T): void {
    if (!this.activeObjects.has(obj)) return
    
    obj.active = false
    obj.reset()
    
    if (this.resetFn) {
      this.resetFn(obj)
    }
    
    this.activeObjects.delete(obj)
    
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj)
    }
  }

  /**
   * Release all active objects
   */
  releaseAll(): void {
    this.activeObjects.forEach(obj => {
      obj.active = false
      obj.reset()
      
      if (this.resetFn) {
        this.resetFn(obj)
      }
      
      if (this.pool.length < this.maxSize) {
        this.pool.push(obj)
      }
    })
    
    this.activeObjects.clear()
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    poolSize: number
    activeCount: number
    totalCount: number
    utilization: number
  } {
    const poolSize = this.pool.length
    const activeCount = this.activeObjects.size
    const totalCount = poolSize + activeCount
    const utilization = totalCount > 0 ? activeCount / totalCount : 0
    
    return {
      poolSize,
      activeCount,
      totalCount,
      utilization
    }
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool = []
    this.activeObjects.clear()
  }

  /**
   * Resize the pool
   */
  resize(newSize: number): void {
    this.maxSize = newSize
    
    // Remove excess objects from pool
    while (this.pool.length > newSize) {
      this.pool.pop()
    }
  }

  /**
   * Pre-warm the pool
   */
  prewarm(count: number): void {
    const targetSize = Math.min(count, this.maxSize)
    while (this.pool.length < targetSize) {
      this.pool.push(this.createObject())
    }
  }

  /**
   * Process all active objects
   */
  forEach(callback: (obj: T) => void): void {
    this.activeObjects.forEach(callback)
  }

  /**
   * Filter active objects
   */
  filter(predicate: (obj: T) => boolean): T[] {
    return Array.from(this.activeObjects).filter(predicate)
  }

  /**
   * Find an active object
   */
  find(predicate: (obj: T) => boolean): T | undefined {
    return Array.from(this.activeObjects).find(predicate)
  }

  private createObject(): T {
    const obj = this.createFn()
    obj.active = false
    return obj
  }
}

// Example poolable class
export abstract class PoolableObject implements Poolable {
  active = false
  
  abstract reset(): void
}