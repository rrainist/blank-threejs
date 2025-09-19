import * as THREE from 'three'
import { SCENE } from './constants/GameConstants'

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(SCENE.BACKGROUND)
  scene.fog = new THREE.Fog(SCENE.BACKGROUND, 40, 120)
  return scene
}
