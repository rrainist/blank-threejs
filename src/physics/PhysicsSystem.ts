import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Scene } from '@babylonjs/core/scene'

export type ColliderShape = 'box' | 'sphere' | 'plane'

export interface DynamicBodyOptions {
  mass: number
  restitution?: number
  friction?: number
  linearDamping?: number
  angularDamping?: number
  shape: ColliderShape
  size?: Vector3
}

export interface StaticBodyOptions {
  restitution?: number
  friction?: number
  shape?: ColliderShape
  size?: Vector3
}

export interface PhysicsBodyHandle {
  setLinearVelocity(velocity: Vector3): void
  getLinearVelocity(): Vector3
  applyImpulse(impulse: Vector3, contactPoint?: Vector3): void
  syncMesh(): void
}

export interface PhysicsSystem {
  init(scene: Scene): void
  registerStaticMesh(mesh: AbstractMesh, options?: StaticBodyOptions): void
  registerDynamicMesh(mesh: AbstractMesh, options: DynamicBodyOptions): PhysicsBodyHandle
  removeMesh(mesh: AbstractMesh): void
  step(deltaTime: number): void
  dispose(): void
}

class NullPhysicsHandle implements PhysicsBodyHandle {
  setLinearVelocity(_velocity: Vector3): void {}
  getLinearVelocity(): Vector3 {
    return Vector3.Zero()
  }
  applyImpulse(_impulse: Vector3): void {}
  syncMesh(): void {}
}

export class NullPhysicsSystem implements PhysicsSystem {
  init(_scene: Scene): void {
  }

  registerStaticMesh(_mesh: AbstractMesh, _options?: StaticBodyOptions): void {}

  registerDynamicMesh(_mesh: AbstractMesh, _options: DynamicBodyOptions): PhysicsBodyHandle {
    return new NullPhysicsHandle()
  }

  removeMesh(_mesh: AbstractMesh): void {}

  step(_deltaTime: number): void {}

  dispose(): void {}
}
