import * as THREE from 'three'

export function handleResize(camera: THREE.PerspectiveCamera | THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void {
  const aspect = window.innerWidth / window.innerHeight
  
  if (camera instanceof THREE.PerspectiveCamera) {
    // Update perspective camera
    camera.aspect = aspect
    camera.updateProjectionMatrix()
  } else if (camera instanceof THREE.OrthographicCamera) {
    // Update orthographic camera
    const frustumSize = 20 // Should match the frustumSize in createCamera
    camera.left = frustumSize * aspect / -2
    camera.right = frustumSize * aspect / 2
    camera.top = frustumSize / 2
    camera.bottom = frustumSize / -2
    camera.updateProjectionMatrix()
  }
  
  // Update renderer size
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
} 