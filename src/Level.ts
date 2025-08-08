import * as THREE from 'three'
import { PhysicsSystem, CollisionShape } from './systems/PhysicsSystem'
import { FIELD, SCENE } from './constants/GameConstants'

export function createLevel(scene: THREE.Scene, levelNumber: number): void {
  const physics = PhysicsSystem.getInstance()
  
  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, SCENE.AMBIENT_INTENSITY)
  scene.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, SCENE.DIRECTIONAL_INTENSITY)
  directionalLight.position.set(5, 10, 5)
  directionalLight.castShadow = true
  directionalLight.shadow.camera.left = -30
  directionalLight.shadow.camera.right = 30
  directionalLight.shadow.camera.top = 30
  directionalLight.shadow.camera.bottom = -30
  directionalLight.shadow.camera.near = 0.1
  directionalLight.shadow.camera.far = 50
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  scene.add(directionalLight)
  
  // Add fog
  scene.fog = new THREE.Fog(0x87ceeb, SCENE.FOG_NEAR, SCENE.FOG_FAR)
  
  // Create ground - simple and very visible
  const groundGeometry = new THREE.BoxGeometry(FIELD.WIDTH, 1, FIELD.HEIGHT) // Thick box instead of plane
  const groundMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x444444 // Dark gray, easy to see
  })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.position.set(0, -0.5, 0) // Half-buried so top is at y=0
  ground.name = 'Ground'
  scene.add(ground)
  
  
  // Add physics to ground
  physics.createRigidBody(ground, {
    isStatic: true,
    shape: CollisionShape.BOX,
    halfExtents: new THREE.Vector3(FIELD.WIDTH / 2, 0.1, FIELD.HEIGHT / 2),
    collisionGroup: PhysicsSystem.COLLISION_GROUP.STATIC
  })
  
  // Create walls - simple rectangular boundaries
  const wallMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xff0000 // Bright red so we can definitely see them
  })
  
  const wallHeight = 5
  const wallThickness = 1
  
  // Create 4 walls at exact boundaries - no rotation needed
  const walls = [
    { pos: [0, wallHeight/2, -FIELD.HEIGHT/2], size: [FIELD.WIDTH, wallHeight, wallThickness], name: 'North Wall' },
    { pos: [0, wallHeight/2, FIELD.HEIGHT/2], size: [FIELD.WIDTH, wallHeight, wallThickness], name: 'South Wall' },
    { pos: [-FIELD.WIDTH/2, wallHeight/2, 0], size: [wallThickness, wallHeight, FIELD.HEIGHT], name: 'West Wall' },
    { pos: [FIELD.WIDTH/2, wallHeight/2, 0], size: [wallThickness, wallHeight, FIELD.HEIGHT], name: 'East Wall' }
  ]
  
  walls.forEach(({ pos, size, name }) => {
    const geometry = new THREE.BoxGeometry(size[0], size[1], size[2])
    const wall = new THREE.Mesh(geometry, wallMaterial)
    wall.position.set(pos[0], pos[1], pos[2])
    wall.name = name
    scene.add(wall)
    
    
    // Add physics to wall
    physics.createRigidBody(wall, {
      isStatic: true,
      shape: CollisionShape.BOX,
      collisionGroup: PhysicsSystem.COLLISION_GROUP.STATIC
    })
  })
  
  // Add level-specific obstacles
  if (levelNumber === 1) {
    createLevel1Obstacles(scene, physics)
  } else {
    createLevel2Obstacles(scene, physics)
  }
}

function createLevel1Obstacles(scene: THREE.Scene, physics: PhysicsSystem): void {
  // City-themed obstacles - boxes
  const boxMaterial = new THREE.MeshPhongMaterial({ color: 0x404040 })
  const obstacles = [
    { pos: [8, 3, 8], size: [4, 6, 4] },
    { pos: [-8, 2.5, -8], size: [5, 5, 5] },
    { pos: [15, 4, -10], size: [3, 8, 3] },
    { pos: [-12, 2, 12], size: [6, 4, 6] }
  ]
  
  obstacles.forEach(({ pos, size }, index) => {
    const geometry = new THREE.BoxGeometry(size[0], size[1], size[2])
    const obstacle = new THREE.Mesh(geometry, boxMaterial)
    obstacle.position.set(pos[0], pos[1], pos[2])
    obstacle.castShadow = true
    obstacle.receiveShadow = true
    obstacle.name = `Obstacle_${index}`
    scene.add(obstacle)
    
    // Add physics
    physics.createRigidBody(obstacle, {
      isStatic: true,
      shape: CollisionShape.BOX,
      collisionGroup: PhysicsSystem.COLLISION_GROUP.STATIC
    })
  })
}

function createLevel2Obstacles(scene: THREE.Scene, physics: PhysicsSystem): void {
  // Forest-themed obstacles - cylinders (trees)
  const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x4a3c28 })
  const leavesMaterial = new THREE.MeshPhongMaterial({ color: 0x228b22 })
  
  const trees = [
    { pos: [10, 0, 10], height: 6, radius: 0.8 },
    { pos: [-12, 0, -8], height: 8, radius: 1 },
    { pos: [15, 0, -15], height: 5, radius: 0.6 },
    { pos: [-8, 0, 12], height: 7, radius: 0.9 }
  ]
  
  trees.forEach(({ pos, height, radius }, index) => {
    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(radius, radius * 1.2, height)
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
    trunk.position.set(pos[0], height / 2, pos[2])
    trunk.castShadow = true
    trunk.receiveShadow = true
    trunk.name = `Obstacle_Trunk_${index}`
    scene.add(trunk)
    
    // Add physics to trunk
    physics.createRigidBody(trunk, {
      isStatic: true,
      shape: CollisionShape.BOX, // Use box for cylinder approximation
      halfExtents: new THREE.Vector3(radius, height / 2, radius),
      collisionGroup: PhysicsSystem.COLLISION_GROUP.STATIC
    })
    
    // Tree leaves
    const leavesGeometry = new THREE.SphereGeometry(radius * 3, 8, 6)
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial)
    leaves.position.set(pos[0], height + radius * 2, pos[2])
    leaves.castShadow = true
    leaves.receiveShadow = true
    leaves.name = `Obstacle_Leaves_${index}`
    scene.add(leaves)
  })
}