import * as THREE from 'three'
import { Component, GameObject } from '../entities/GameObject'

export enum ColliderType {
  BOX = 'box',
  SPHERE = 'sphere',
  CAPSULE = 'capsule'
}

export interface CollisionEvent {
  other: GameObject
  otherCollider: Collider
  normal: THREE.Vector3
  depth: number
}

type CollisionCallback = (event: CollisionEvent) => void

export class Collider implements Component {
  enabled = true
  gameObject!: GameObject
  
  type: ColliderType
  size: THREE.Vector3 // For box
  radius: number // For sphere/capsule
  height: number // For capsule
  offset: THREE.Vector3
  isTrigger = false
  
  // Collision layers
  layer = 0
  collidesWith = 0xFFFFFFFF // Collide with all layers by default
  
  // Debug visualization
  private debugMesh?: THREE.Mesh
  private showDebug = false
  
  // Callbacks
  private onCollisionEnterCallbacks: CollisionCallback[] = []
  private onCollisionStayCallbacks: CollisionCallback[] = []
  private onCollisionExitCallbacks: CollisionCallback[] = []
  private onTriggerEnterCallbacks: CollisionCallback[] = []
  private onTriggerStayCallbacks: CollisionCallback[] = []
  private onTriggerExitCallbacks: CollisionCallback[] = []
  
  // Track collisions
  private currentCollisions: Set<Collider> = new Set()
  private previousCollisions: Set<Collider> = new Set()

  constructor(type: ColliderType = ColliderType.BOX, size?: THREE.Vector3 | number) {
    this.type = type
    this.offset = new THREE.Vector3()
    
    if (type === ColliderType.BOX) {
      this.size = size instanceof THREE.Vector3 ? size : new THREE.Vector3(1, 1, 1)
      this.radius = 0
      this.height = 0
    } else if (type === ColliderType.SPHERE) {
      this.radius = typeof size === 'number' ? size : 0.5
      this.size = new THREE.Vector3()
      this.height = 0
    } else if (type === ColliderType.CAPSULE) {
      this.radius = typeof size === 'number' ? size : 0.5
      this.height = 2
      this.size = new THREE.Vector3()
    }
  }

  start(): void {
    if (this.showDebug) {
      this.createDebugMesh()
    }
  }

  update(deltaTime: number): void {
    // Update debug mesh position
    if (this.debugMesh) {
      this.debugMesh.position.copy(this.getWorldPosition())
      this.debugMesh.rotation.copy(this.gameObject.rotation)
    }
    
    // Process collision events
    this.processCollisionEvents()
  }

  destroy(): void {
    if (this.debugMesh) {
      this.debugMesh.geometry.dispose()
      if (this.debugMesh.material instanceof THREE.Material) {
        this.debugMesh.material.dispose()
      }
    }
  }

  /**
   * Get world position including offset
   */
  getWorldPosition(): THREE.Vector3 {
    return this.gameObject.position.clone().add(this.offset)
  }

  /**
   * Check collision with another collider
   */
  checkCollision(other: Collider): CollisionEvent | null {
    if (!this.canCollideWith(other)) return null
    
    const thisPos = this.getWorldPosition()
    const otherPos = other.getWorldPosition()
    
    // Simple sphere-sphere collision
    if (this.type === ColliderType.SPHERE && other.type === ColliderType.SPHERE) {
      const distance = thisPos.distanceTo(otherPos)
      const combinedRadius = this.radius + other.radius
      
      if (distance < combinedRadius) {
        const normal = thisPos.clone().sub(otherPos).normalize()
        const depth = combinedRadius - distance
        
        return {
          other: other.gameObject,
          otherCollider: other,
          normal,
          depth
        }
      }
    }
    
    // Box-box collision (AABB)
    if (this.type === ColliderType.BOX && other.type === ColliderType.BOX) {
      const thisMin = thisPos.clone().sub(this.size.clone().multiplyScalar(0.5))
      const thisMax = thisPos.clone().add(this.size.clone().multiplyScalar(0.5))
      const otherMin = otherPos.clone().sub(other.size.clone().multiplyScalar(0.5))
      const otherMax = otherPos.clone().add(other.size.clone().multiplyScalar(0.5))
      
      if (thisMin.x <= otherMax.x && thisMax.x >= otherMin.x &&
          thisMin.y <= otherMax.y && thisMax.y >= otherMin.y &&
          thisMin.z <= otherMax.z && thisMax.z >= otherMin.z) {
        
        // Calculate penetration depth and normal
        const overlap = new THREE.Vector3(
          Math.min(thisMax.x - otherMin.x, otherMax.x - thisMin.x),
          Math.min(thisMax.y - otherMin.y, otherMax.y - thisMin.y),
          Math.min(thisMax.z - otherMin.z, otherMax.z - thisMin.z)
        )
        
        let normal = new THREE.Vector3()
        let depth = Infinity
        
        if (overlap.x < overlap.y && overlap.x < overlap.z) {
          depth = overlap.x
          normal.x = thisPos.x > otherPos.x ? 1 : -1
        } else if (overlap.y < overlap.z) {
          depth = overlap.y
          normal.y = thisPos.y > otherPos.y ? 1 : -1
        } else {
          depth = overlap.z
          normal.z = thisPos.z > otherPos.z ? 1 : -1
        }
        
        return {
          other: other.gameObject,
          otherCollider: other,
          normal,
          depth
        }
      }
    }
    
    // TODO: Implement other collision types (sphere-box, capsule, etc.)
    
    return null
  }

  /**
   * Can this collider collide with another?
   */
  canCollideWith(other: Collider): boolean {
    return (this.collidesWith & (1 << other.layer)) !== 0
  }

  /**
   * Set collision layer
   */
  setLayer(layer: number): void {
    this.layer = Math.max(0, Math.min(31, layer))
  }

  /**
   * Set which layers to collide with
   */
  setCollidesWith(layers: number): void {
    this.collidesWith = layers
  }

  /**
   * Add collision callback
   */
  onCollisionEnter(callback: CollisionCallback): void {
    this.onCollisionEnterCallbacks.push(callback)
  }

  onCollisionStay(callback: CollisionCallback): void {
    this.onCollisionStayCallbacks.push(callback)
  }

  onCollisionExit(callback: CollisionCallback): void {
    this.onCollisionExitCallbacks.push(callback)
  }

  onTriggerEnter(callback: CollisionCallback): void {
    this.onTriggerEnterCallbacks.push(callback)
  }

  onTriggerStay(callback: CollisionCallback): void {
    this.onTriggerStayCallbacks.push(callback)
  }

  onTriggerExit(callback: CollisionCallback): void {
    this.onTriggerExitCallbacks.push(callback)
  }

  /**
   * Process collision events
   */
  private processCollisionEvents(): void {
    // Check for new collisions (enter)
    this.currentCollisions.forEach(collider => {
      if (!this.previousCollisions.has(collider)) {
        const event = this.createCollisionEvent(collider)
        if (this.isTrigger) {
          this.onTriggerEnterCallbacks.forEach(cb => cb(event))
        } else {
          this.onCollisionEnterCallbacks.forEach(cb => cb(event))
        }
      }
    })
    
    // Check for ongoing collisions (stay)
    this.currentCollisions.forEach(collider => {
      if (this.previousCollisions.has(collider)) {
        const event = this.createCollisionEvent(collider)
        if (this.isTrigger) {
          this.onTriggerStayCallbacks.forEach(cb => cb(event))
        } else {
          this.onCollisionStayCallbacks.forEach(cb => cb(event))
        }
      }
    })
    
    // Check for ended collisions (exit)
    this.previousCollisions.forEach(collider => {
      if (!this.currentCollisions.has(collider)) {
        const event = this.createCollisionEvent(collider)
        if (this.isTrigger) {
          this.onTriggerExitCallbacks.forEach(cb => cb(event))
        } else {
          this.onCollisionExitCallbacks.forEach(cb => cb(event))
        }
      }
    })
    
    // Update previous collisions
    this.previousCollisions = new Set(this.currentCollisions)
    this.currentCollisions.clear()
  }

  /**
   * Register a collision (called by physics system)
   */
  registerCollision(other: Collider): void {
    this.currentCollisions.add(other)
  }

  /**
   * Create collision event
   */
  private createCollisionEvent(collider: Collider): CollisionEvent {
    return {
      other: collider.gameObject,
      otherCollider: collider,
      normal: new THREE.Vector3(), // Would be calculated properly in physics system
      depth: 0
    }
  }

  /**
   * Debug visualization
   */
  setDebug(enabled: boolean): void {
    this.showDebug = enabled
    if (enabled && !this.debugMesh) {
      this.createDebugMesh()
    } else if (!enabled && this.debugMesh) {
      this.debugMesh.parent?.remove(this.debugMesh)
      this.debugMesh = undefined
    }
  }

  private createDebugMesh(): void {
    let geometry: THREE.BufferGeometry
    
    switch (this.type) {
      case ColliderType.BOX:
        geometry = new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z)
        break
      case ColliderType.SPHERE:
        geometry = new THREE.SphereGeometry(this.radius, 16, 8)
        break
      case ColliderType.CAPSULE:
        // Simple cylinder for now
        geometry = new THREE.CylinderGeometry(this.radius, this.radius, this.height, 16)
        break
    }
    
    const material = new THREE.MeshBasicMaterial({
      color: this.isTrigger ? 0x00ff00 : 0xff0000,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    })
    
    this.debugMesh = new THREE.Mesh(geometry, material)
    if (this.gameObject.mesh?.parent) {
      this.gameObject.mesh.parent.add(this.debugMesh)
    }
  }
}