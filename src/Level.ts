import * as THREE from 'three'

/**
 * Legacy level hook retained for compatibility. The new turn-based prototype
 * builds its board dynamically inside Game.ts, so this function simply ensures
 * any stray meshes flagged as level objects are removed.
 */
export function createLevel(scene: THREE.Scene, _levelNumber: number): void {
  const staleObjects: THREE.Object3D[] = []
  scene.traverse(object => {
    if (object.userData.levelObject) {
      staleObjects.push(object)
    }
  })

  staleObjects.forEach(object => {
    if (object.parent) {
      object.parent.remove(object)
    }
  })
}
