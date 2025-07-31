import * as THREE from 'three'

// Interface for entities that can be updated
export interface Updatable {
  update(deltaTime: number): void
}

// Type guard to check if object is updatable
function isUpdatable(obj: any): obj is Updatable {
  return obj && typeof obj.update === 'function'
}

export class SimpleEntityManager {
  private scene: THREE.Scene
  private entities: Set<THREE.Object3D> = new Set()
  
  constructor(scene: THREE.Scene) {
    this.scene = scene
  }
  
  add(entity: THREE.Object3D): void {
    this.entities.add(entity)
    this.scene.add(entity)
  }
  
  remove(entity: THREE.Object3D): void {
    this.entities.delete(entity)
    this.scene.remove(entity)
    
    // Dispose of resources if it's a mesh
    if (entity instanceof THREE.Mesh) {
      entity.geometry.dispose()
      if (entity.material instanceof THREE.Material) {
        entity.material.dispose()
      } else if (Array.isArray(entity.material)) {
        entity.material.forEach(mat => mat.dispose())
      }
    }
  }
  
  update(deltaTime: number): void {
    // Update all entities that have an update method
    for (const entity of this.entities) {
      if (isUpdatable(entity)) {
        entity.update(deltaTime)
      }
    }
  }
  
  getByType(type: string): THREE.Object3D[] {
    const result: THREE.Object3D[] = []
    for (const entity of this.entities) {
      if (entity.userData.type === type) {
        result.push(entity)
      }
    }
    return result
  }
  
  getByName(name: string): THREE.Object3D | undefined {
    for (const entity of this.entities) {
      if (entity.name === name) {
        return entity
      }
    }
    return undefined
  }
  
  clear(): void {
    // Remove all entities
    const entitiesToRemove = Array.from(this.entities)
    entitiesToRemove.forEach(entity => this.remove(entity))
  }
  
  getAll(): THREE.Object3D[] {
    return Array.from(this.entities)
  }
  
  getCount(): number {
    return this.entities.size
  }
}