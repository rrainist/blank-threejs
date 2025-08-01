import * as THREE from 'three'

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene()
  
  // Background is now handled by the renderer to avoid conflicts with orthographic camera
  // scene.background = new THREE.Color(0x222222)
  
  // Optional: Add fog for depth
  scene.fog = new THREE.Fog(0x222222, 20, 100)
  
  return scene
} 