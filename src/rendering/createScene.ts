import { Engine } from '@babylonjs/core/Engines/engine'
import { Scene } from '@babylonjs/core/scene'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent'
import '@babylonjs/core/Rendering/depthRendererSceneComponent'
import '@babylonjs/core/Rendering/geometryBufferRendererSceneComponent'
import { appConfig } from '../config/appConfig'

export interface SceneBootstrapResult {
  scene: Scene
  shadowGenerator: ShadowGenerator
}

export function createScene(engine: Engine): SceneBootstrapResult {
  const scene = new Scene(engine)
  scene.metadata = { engine: 'babylon' }
  scene.useRightHandedSystem = true
  const bgColor = Color3.FromHexString(appConfig.render.backgroundColor)
  scene.clearColor.set(bgColor.r, bgColor.g, bgColor.b, 1)

  const hemi = new HemisphericLight('global-hemi', new Vector3(0, 1, 0), scene)
  hemi.intensity = 0.6

  const sunDirection = new Vector3(-0.5, -1, 0.4).normalize()
  const sun = new DirectionalLight('sun', sunDirection, scene)
  sun.position = sunDirection.scale(-80)
  sun.intensity = 1.25
  sun.shadowMinZ = 1
  sun.shadowMaxZ = 200
  sun.autoCalcShadowZBounds = true

  const shadowGenerator = new ShadowGenerator(1024, sun, false)
  shadowGenerator.usePoissonSampling = true
  shadowGenerator.bias = 0.0008
  shadowGenerator.normalBias = 0.02
  shadowGenerator.setDarkness(0.4)

  return { scene, shadowGenerator }
}
