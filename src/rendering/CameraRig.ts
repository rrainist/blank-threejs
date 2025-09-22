import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import '@babylonjs/core/Cameras/Inputs/arcRotateCameraPointersInput'
import '@babylonjs/core/Cameras/Inputs/arcRotateCameraKeyboardMoveInput'
import '@babylonjs/core/Cameras/Inputs/arcRotateCameraMouseWheelInput'
import { Scene } from '@babylonjs/core/scene'
import { appConfig } from '../config/appConfig'

export function createCamera(scene: Scene): ArcRotateCamera {
  const { camera } = appConfig
  const target = new Vector3(0, 1.5, 0)

  const cameraRig = new ArcRotateCamera(
    'main-camera',
    camera.alpha,
    camera.beta,
    camera.radius,
    target,
    scene
  )

  cameraRig.lowerRadiusLimit = camera.lowerRadiusLimit
  cameraRig.upperRadiusLimit = camera.upperRadiusLimit
  cameraRig.wheelPrecision = camera.wheelPrecision
  cameraRig.minZ = camera.minZ
  cameraRig.maxZ = camera.maxZ
  cameraRig.panningSensibility = 250
  cameraRig.allowUpsideDown = false
  cameraRig.upperBetaLimit = Math.PI * 0.95
  cameraRig.lowerBetaLimit = Math.PI / 6
  cameraRig.attachControl(scene.getEngine().getRenderingCanvas(), true)

  return cameraRig
}
