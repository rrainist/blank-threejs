import * as THREE from 'three'
import { EntityManager } from '../systems/EntityManager'

export interface Component {
  enabled: boolean
  gameObject: GameObject
  start?(): void
  update?(deltaTime: number): void
  lateUpdate?(deltaTime: number): void
  fixedUpdate?(fixedDeltaTime: number): void
  destroy?(): void
}

export abstract class GameObject {
  id: string
  name: string
  active: boolean = true
  tags: Set<string> = new Set()
  
  // Transform
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
  
  // Three.js mesh (optional)
  mesh?: THREE.Mesh | THREE.Group
  
  // Components
  protected components: Map<string, Component> = new Map()
  
  // Reference to entity manager
  protected entityManager: EntityManager

  constructor(name = 'GameObject') {
    this.entityManager = EntityManager.getInstance()
    this.id = this.entityManager.generateId()
    this.name = name
    
    // Initialize transform
    this.position = new THREE.Vector3()
    this.rotation = new THREE.Euler()
    this.scale = new THREE.Vector3(1, 1, 1)
  }

  /**
   * Called when entity is added to the scene
   */
  start(): void {
    // Initialize all components
    this.components.forEach(component => {
      if (component.start) {
        component.start()
      }
    })
  }

  /**
   * Called every frame
   */
  update(deltaTime: number): void {
    // Update mesh transform if exists
    if (this.mesh) {
      this.mesh.position.copy(this.position)
      this.mesh.rotation.copy(this.rotation)
      this.mesh.scale.copy(this.scale)
    }

    // Update all enabled components
    this.components.forEach(component => {
      if (component.enabled && component.update) {
        component.update(deltaTime)
      }
    })
  }

  /**
   * Called after update (useful for camera follow, etc)
   */
  lateUpdate(deltaTime: number): void {
    this.components.forEach(component => {
      if (component.enabled && component.lateUpdate) {
        component.lateUpdate(deltaTime)
      }
    })
  }

  /**
   * Called at fixed intervals for physics
   */
  fixedUpdate(fixedDeltaTime: number): void {
    this.components.forEach(component => {
      if (component.enabled && component.fixedUpdate) {
        component.fixedUpdate(fixedDeltaTime)
      }
    })
  }

  /**
   * Called when entity is removed
   */
  destroy(): void {
    // Destroy all components
    this.components.forEach(component => {
      if (component.destroy) {
        component.destroy()
      }
    })
    this.components.clear()

    // Dispose of Three.js resources
    if (this.mesh) {
      if (this.mesh instanceof THREE.Mesh) {
        this.mesh.geometry.dispose()
        if (this.mesh.material instanceof THREE.Material) {
          this.mesh.material.dispose()
        } else if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(mat => mat.dispose())
        }
      }
    }
  }

  /**
   * Component management
   */
  addComponent<T extends Component>(name: string, component: T): T {
    component.gameObject = this
    this.components.set(name, component)
    
    // If entity is already started, start the component
    if (this.entityManager.getEntity(this.id) && component.start) {
      component.start()
    }
    
    return component
  }

  getComponent<T extends Component>(name: string): T | undefined {
    return this.components.get(name) as T
  }

  removeComponent(name: string): void {
    const component = this.components.get(name)
    if (component) {
      if (component.destroy) {
        component.destroy()
      }
      this.components.delete(name)
    }
  }

  hasComponent(name: string): boolean {
    return this.components.has(name)
  }

  /**
   * Tag management
   */
  addTag(tag: string): void {
    this.tags.add(tag)
  }

  removeTag(tag: string): void {
    this.tags.delete(tag)
  }

  hasTag(tag: string): boolean {
    return this.tags.has(tag)
  }

  /**
   * Transform helpers
   */
  setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z)
  }

  translate(x: number, y: number, z: number): void {
    this.position.x += x
    this.position.y += y
    this.position.z += z
  }

  setRotation(x: number, y: number, z: number): void {
    this.rotation.set(x, y, z)
  }

  rotate(x: number, y: number, z: number): void {
    this.rotation.x += x
    this.rotation.y += y
    this.rotation.z += z
  }

  setScale(x: number, y?: number, z?: number): void {
    if (y === undefined) {
      this.scale.set(x, x, x)
    } else {
      this.scale.set(x, y!, z!)
    }
  }

  /**
   * Look at a point or another game object
   */
  lookAt(target: THREE.Vector3 | GameObject): void {
    if (this.mesh) {
      if (target instanceof GameObject) {
        this.mesh.lookAt(target.position)
      } else {
        this.mesh.lookAt(target)
      }
      this.rotation.copy(this.mesh.rotation)
    }
  }

  /**
   * Get forward direction
   */
  getForward(): THREE.Vector3 {
    const forward = new THREE.Vector3(0, 0, -1)
    forward.applyEuler(this.rotation)
    return forward.normalize()
  }

  /**
   * Get right direction
   */
  getRight(): THREE.Vector3 {
    const right = new THREE.Vector3(1, 0, 0)
    right.applyEuler(this.rotation)
    return right.normalize()
  }

  /**
   * Get up direction
   */
  getUp(): THREE.Vector3 {
    const up = new THREE.Vector3(0, 1, 0)
    up.applyEuler(this.rotation)
    return up.normalize()
  }

  /**
   * Distance to another game object
   */
  distanceTo(other: GameObject): number {
    return this.position.distanceTo(other.position)
  }

  /**
   * Clone the game object (override in subclasses for deep cloning)
   */
  abstract clone(): GameObject
}