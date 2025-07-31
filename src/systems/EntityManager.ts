import * as THREE from 'three'
import { GameObject } from '../entities/GameObject'

export class EntityManager {
  private static instance: EntityManager
  private entities: Map<string, GameObject> = new Map()
  private entitiesByTag: Map<string, Set<GameObject>> = new Map()
  private entitiesByType: Map<string, Set<GameObject>> = new Map()
  private scene: THREE.Scene
  private entityIdCounter = 0

  private constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  static initialize(scene: THREE.Scene): EntityManager {
    if (!EntityManager.instance) {
      EntityManager.instance = new EntityManager(scene)
    }
    return EntityManager.instance
  }

  static getInstance(): EntityManager {
    if (!EntityManager.instance) {
      throw new Error('EntityManager not initialized. Call EntityManager.initialize(scene) first.')
    }
    return EntityManager.instance
  }

  /**
   * Generate unique entity ID
   */
  generateId(): string {
    return `entity_${this.entityIdCounter++}`
  }

  /**
   * Add entity to the manager
   */
  addEntity(entity: GameObject): void {
    this.entities.set(entity.id, entity)
    
    // Add to scene if it has a mesh
    if (entity.mesh) {
      this.scene.add(entity.mesh)
    }

    // Track by tag
    entity.tags.forEach(tag => {
      if (!this.entitiesByTag.has(tag)) {
        this.entitiesByTag.set(tag, new Set())
      }
      this.entitiesByTag.get(tag)!.add(entity)
    })

    // Track by type
    const type = entity.constructor.name
    if (!this.entitiesByType.has(type)) {
      this.entitiesByType.set(type, new Set())
    }
    this.entitiesByType.get(type)!.add(entity)

    // Initialize the entity
    entity.start()
  }

  /**
   * Remove entity from the manager
   */
  removeEntity(entity: GameObject): void {
    if (!this.entities.has(entity.id)) return

    // Call destroy on the entity
    entity.destroy()

    // Remove from scene
    if (entity.mesh) {
      this.scene.remove(entity.mesh)
    }

    // Remove from maps
    this.entities.delete(entity.id)

    // Remove from tag tracking
    entity.tags.forEach(tag => {
      this.entitiesByTag.get(tag)?.delete(entity)
    })

    // Remove from type tracking
    const type = entity.constructor.name
    this.entitiesByType.get(type)?.delete(entity)
  }

  /**
   * Remove entity by ID
   */
  removeEntityById(id: string): void {
    const entity = this.entities.get(id)
    if (entity) {
      this.removeEntity(entity)
    }
  }

  /**
   * Get entity by ID
   */
  getEntity(id: string): GameObject | undefined {
    return this.entities.get(id)
  }

  /**
   * Get all entities
   */
  getAllEntities(): GameObject[] {
    return Array.from(this.entities.values())
  }

  /**
   * Get entities by tag
   */
  getEntitiesByTag(tag: string): GameObject[] {
    return Array.from(this.entitiesByTag.get(tag) || [])
  }

  /**
   * Get entities by type
   */
  getEntitiesByType<T extends GameObject>(type: new (...args: any[]) => T): T[] {
    const typeName = type.name
    return Array.from(this.entitiesByType.get(typeName) || []) as T[]
  }

  /**
   * Find entity by predicate
   */
  findEntity(predicate: (entity: GameObject) => boolean): GameObject | undefined {
    return Array.from(this.entities.values()).find(predicate)
  }

  /**
   * Find entities by predicate
   */
  findEntities(predicate: (entity: GameObject) => boolean): GameObject[] {
    return Array.from(this.entities.values()).filter(predicate)
  }

  /**
   * Update all entities
   */
  update(deltaTime: number): void {
    this.entities.forEach(entity => {
      if (entity.active) {
        entity.update(deltaTime)
      }
    })
  }

  /**
   * Late update all entities (called after physics)
   */
  lateUpdate(deltaTime: number): void {
    this.entities.forEach(entity => {
      if (entity.active) {
        entity.lateUpdate(deltaTime)
      }
    })
  }

  /**
   * Fixed update all entities (for physics)
   */
  fixedUpdate(fixedDeltaTime: number): void {
    this.entities.forEach(entity => {
      if (entity.active) {
        entity.fixedUpdate(fixedDeltaTime)
      }
    })
  }

  /**
   * Clear all entities
   */
  clear(): void {
    // Destroy all entities
    this.entities.forEach(entity => {
      entity.destroy()
      if (entity.mesh) {
        this.scene.remove(entity.mesh)
      }
    })

    // Clear all maps
    this.entities.clear()
    this.entitiesByTag.clear()
    this.entitiesByType.clear()
  }

  /**
   * Get entity count
   */
  getEntityCount(): number {
    return this.entities.size
  }

  /**
   * Debug information
   */
  getDebugInfo(): string {
    const info: string[] = [
      `Total Entities: ${this.entities.size}`,
      `Tags: ${Array.from(this.entitiesByTag.keys()).join(', ')}`,
      `Types: ${Array.from(this.entitiesByType.keys()).join(', ')}`
    ]

    this.entitiesByType.forEach((entities, type) => {
      info.push(`  ${type}: ${entities.size}`)
    })

    return info.join('\\n')
  }
}