import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { Scene } from '@babylonjs/core/scene'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import { InputManager } from '../input/InputManager'
import { DynamicBodyOptions, PhysicsBodyHandle, PhysicsSystem } from '../physics/PhysicsSystem'

interface PlayerControllerOptions {
  scene: Scene
  shadowGenerator: ShadowGenerator
  physics: PhysicsSystem
  input: InputManager
  camera: ArcRotateCamera
}

export class PlayerController {
  private readonly mesh: Mesh
  private readonly handle: PhysicsBodyHandle
  private readonly input: InputManager
  private readonly camera: ArcRotateCamera

  private readonly walkSpeed = 6
  private readonly sprintSpeed = 10
  private readonly mass = 2.5
  private jumpCooldown = 0

  constructor(options: PlayerControllerOptions) {
    const { scene, shadowGenerator, physics, input, camera } = options

    const playerMaterial = new StandardMaterial('player-material', scene)
    playerMaterial.diffuseColor = new Color3(0.45, 0.76, 0.98)
    playerMaterial.emissiveColor = new Color3(0.08, 0.21, 0.36)

    this.mesh = MeshBuilder.CreateCapsule('player', {
      height: 2,
      radius: 0.4,
      tessellation: 12
    }, scene)
    this.mesh.position = new Vector3(0, 4, -10)
    this.mesh.material = playerMaterial
    this.mesh.receiveShadows = true

    shadowGenerator.addShadowCaster(this.mesh)

    const bodyOptions: DynamicBodyOptions = {
      mass: this.mass,
      shape: 'box',
      size: new Vector3(1, 2, 1),
      linearDamping: 0.3,
      angularDamping: 0.9,
      friction: 0.4,
      restitution: 0
    }

    this.handle = physics.registerDynamicMesh(this.mesh, bodyOptions)
    this.input = input
    this.camera = camera
    this.camera.lockedTarget = this.mesh
  }

  update(deltaSeconds: number): void {
    this.jumpCooldown = Math.max(0, this.jumpCooldown - deltaSeconds)

    const moveDirection = this.computeMoveVector()
    const targetSpeed = this.input.isActive('sprint') ? this.sprintSpeed : this.walkSpeed
    const desiredVelocity = moveDirection.scale(targetSpeed)

    const currentVelocity = this.handle.getLinearVelocity()
    const nextVelocity = new Vector3(
      desiredVelocity.x,
      currentVelocity.y,
      desiredVelocity.z
    )

    this.handle.setLinearVelocity(nextVelocity)

    if (this.input.isActive('jump') && this.canJump()) {
      this.handle.applyImpulse(new Vector3(0, this.mass * 12, 0))
      this.jumpCooldown = 0.35
    }
  }

  getPosition(): Vector3 {
    return this.mesh.position
  }

  dispose(): void {
    this.mesh.dispose()
  }

  private computeMoveVector(): Vector3 {
    const forwardRay = this.camera.getForwardRay()
    const forward = forwardRay.direction.clone()
    forward.y = 0
    if (forward.lengthSquared() === 0) {
      forward.set(0, 0, 1)
    } else {
      forward.normalize()
    }

    let right = Vector3.Cross(forward, Vector3.Up())
    if (right.lengthSquared() === 0) {
      right = new Vector3(1, 0, 0)
    } else {
      right.normalize()
    }

    let direction = Vector3.Zero()

    if (this.input.isActive('forward')) direction = direction.add(forward)
    if (this.input.isActive('backward')) direction = direction.subtract(forward)
    if (this.input.isActive('right')) direction = direction.add(right)
    if (this.input.isActive('left')) direction = direction.subtract(right)

    if (direction.lengthSquared() > 0) {
      direction = direction.normalize()
    }

    return direction
  }

  private canJump(): boolean {
    if (this.jumpCooldown > 0) {
      return false
    }

    const currentVelocity = this.handle.getLinearVelocity()
    const verticalSpeedNearZero = Math.abs(currentVelocity.y) < 0.6
    const closeToGround = this.mesh.position.y <= 1.2
    return verticalSpeedNearZero && closeToGround
  }
}
