import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Scene } from '@babylonjs/core/scene'
import { Body, Box, ContactMaterial, Material, Plane, Sphere, Vec3, World } from 'cannon-es'
import { appConfig } from '../config/appConfig'
import { logger } from '../utils/Logger'
import {
  DynamicBodyOptions,
  PhysicsBodyHandle,
  PhysicsSystem,
  StaticBodyOptions,
  ColliderShape
} from './PhysicsSystem'

class CannonBodyHandle implements PhysicsBodyHandle {
  constructor(private readonly body: Body, private readonly mesh: AbstractMesh) {}

  setLinearVelocity(velocity: Vector3): void {
    this.body.velocity.copy(convertVectorToVec3(velocity))
  }

  getLinearVelocity(): Vector3 {
    const { x, y, z } = this.body.velocity
    return new Vector3(x, y, z)
  }

  applyImpulse(impulse: Vector3, contactPoint?: Vector3): void {
    const impulseVec = convertVectorToVec3(impulse)
    if (contactPoint) {
      const contact = convertVectorToVec3(contactPoint)
      this.body.applyImpulse(impulseVec, contact)
    } else {
      this.body.applyImpulse(impulseVec)
    }
  }

  syncMesh(): void {
    this.mesh.position.copyFromFloats(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    )

    const rotation = this.mesh.rotationQuaternion ?? Quaternion.Identity()
    rotation.set(
      this.body.quaternion.x,
      this.body.quaternion.y,
      this.body.quaternion.z,
      this.body.quaternion.w
    )
    this.mesh.rotationQuaternion = rotation
  }
}

function convertVectorToVec3(vector: Vector3): Vec3 {
  return new Vec3(vector.x, vector.y, vector.z)
}

function computeHalfExtents(mesh: AbstractMesh, size?: Vector3): Vec3 {
  if (size) {
    return new Vec3(size.x / 2, size.y / 2, size.z / 2)
  }

  const boundingInfo = mesh.getBoundingInfo()
  if (!boundingInfo) {
    return new Vec3(0.5, 0.5, 0.5)
  }
  const { extendSizeWorld } = boundingInfo.boundingBox
  return new Vec3(extendSizeWorld.x, extendSizeWorld.y, extendSizeWorld.z)
}

function createShape(mesh: AbstractMesh, shape: ColliderShape, size?: Vector3) {
  switch (shape) {
    case 'plane':
      return new Plane()
    case 'sphere': {
      const radius = size ? size.x / 2 : mesh.getBoundingInfo()?.boundingSphere.radius || 0.5
      return new Sphere(radius)
    }
    case 'box':
    default: {
      const halfExtents = computeHalfExtents(mesh, size)
      return new Box(halfExtents)
    }
  }
}

export class CannonPhysicsSystem implements PhysicsSystem {
  private scene: Scene | null = null
  private world: World | null = null
  private meshToBody = new Map<number, Body>()
  private bodyToHandle = new Map<number, CannonBodyHandle>()
  private defaultMaterial: Material | null = null

  init(scene: Scene): void {
    if (this.scene) return

    this.scene = scene
    this.world = new World({ gravity: new Vec3(appConfig.physics.gravity.x, appConfig.physics.gravity.y, appConfig.physics.gravity.z) })

    this.defaultMaterial = new Material('default')
    const contactMaterial = new ContactMaterial(this.defaultMaterial, this.defaultMaterial, {
      friction: 0.4,
      restitution: 0.2
    })
    this.world.defaultContactMaterial = contactMaterial
    this.world.addContactMaterial(contactMaterial)

    logger.info('Cannon physics world initialized')
  }

  registerStaticMesh(mesh: AbstractMesh, options?: StaticBodyOptions): void {
    if (!this.world) {
      throw new Error('Physics world not initialized')
    }

    mesh.computeWorldMatrix(true)
    const shapeType = options?.shape ?? 'box'
    const shape = createShape(mesh, shapeType, options?.size)

    const body = new Body({
      mass: 0,
      shape
    })
    if (this.defaultMaterial) {
      body.material = this.defaultMaterial
    }

    const absolutePosition = mesh.getAbsolutePosition()
    body.position.copy(convertVectorToVec3(absolutePosition))

    if (shapeType === 'plane') {
      body.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    } else if (mesh.rotationQuaternion) {
      body.quaternion.set(
        mesh.rotationQuaternion.x,
        mesh.rotationQuaternion.y,
        mesh.rotationQuaternion.z,
        mesh.rotationQuaternion.w
      )
    }

    if (options?.friction !== undefined) {
      body.material = new Material('static-material')
      body.material.friction = options.friction
    }

    this.world.addBody(body)
    this.meshToBody.set(mesh.uniqueId, body)
  }

  registerDynamicMesh(mesh: AbstractMesh, options: DynamicBodyOptions): PhysicsBodyHandle {
    if (!this.world) {
      throw new Error('Physics world not initialized')
    }

    mesh.computeWorldMatrix(true)
    const shape = createShape(mesh, options.shape, options.size)

    const body = new Body({
      mass: options.mass,
      shape,
      position: convertVectorToVec3(mesh.getAbsolutePosition()),
      linearDamping: options.linearDamping ?? 0.1,
      angularDamping: options.angularDamping ?? 0.2
    })

    if (options.restitution !== undefined || options.friction !== undefined) {
      const material = new Material('dynamic-material')
      if (options.restitution !== undefined) material.restitution = options.restitution
      if (options.friction !== undefined) material.friction = options.friction
      body.material = material
    } else if (this.defaultMaterial) {
      body.material = this.defaultMaterial
    }

    this.world.addBody(body)
    this.meshToBody.set(mesh.uniqueId, body)

    const handle = new CannonBodyHandle(body, mesh)
    this.bodyToHandle.set(mesh.uniqueId, handle)

    return handle
  }

  removeMesh(mesh: AbstractMesh): void {
    if (!this.world) return
    const body = this.meshToBody.get(mesh.uniqueId)
    if (!body) return
    this.world.removeBody(body)
    this.meshToBody.delete(mesh.uniqueId)
    this.bodyToHandle.delete(mesh.uniqueId)
  }

  step(deltaTime: number): void {
    if (!this.world) return

    this.world.step(appConfig.physics.fixedTimeStep, deltaTime, appConfig.physics.maxSubSteps)

    this.bodyToHandle.forEach((handle) => {
      handle.syncMesh()
    })
  }

  dispose(): void {
    this.meshToBody.clear()
    this.bodyToHandle.clear()
    this.world = null
    this.scene = null
    this.defaultMaterial = null
  }
}
