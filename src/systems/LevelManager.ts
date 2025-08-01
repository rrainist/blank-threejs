import * as THREE from 'three'
import { AssetLoader } from './AssetLoader'
import { PhysicsSystem, CollisionShape } from './PhysicsSystem'
import { logger } from '../utils/Logger'
import { eventBus } from '../utils/EventBus'

export interface LevelObject {
  type: 'box' | 'sphere' | 'cylinder' | 'plane' | 'model'
  name?: string
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number] | number
  size?: [number, number, number] | number
  color?: number | string
  material?: {
    type?: 'phong' | 'standard' | 'basic'
    color?: number | string
    emissive?: number | string
    roughness?: number
    metalness?: number
    transparent?: boolean
    opacity?: number
  }
  physics?: {
    mass?: number
    isStatic?: boolean
    collisionGroup?: number
    restitution?: number
    friction?: number
  }
  castShadow?: boolean
  receiveShadow?: boolean
  userData?: Record<string, unknown>
}

export interface SpawnPoint {
  type: 'player' | 'enemy' | 'collectible' | 'checkpoint'
  position: [number, number, number]
  rotation?: [number, number, number]
  data?: Record<string, unknown>
}

export interface LevelDefinition {
  name: string
  description?: string
  environment: {
    fogColor?: number | string
    fogNear?: number
    fogFar?: number
    ambientLight?: {
      color: number | string
      intensity: number
    }
    directionalLight?: {
      color: number | string
      intensity: number
      position: [number, number, number]
      castShadow?: boolean
    }
    skybox?: string
  }
  ground: {
    size: [number, number]
    position?: [number, number, number]
    color?: number | string
    texture?: string
  }
  objects: LevelObject[]
  spawnPoints: SpawnPoint[]
  boundaries?: {
    min: [number, number, number]
    max: [number, number, number]
  }
}

export class LevelManager {
  private static instance: LevelManager
  
  private scene: THREE.Scene
  private assetLoader: AssetLoader
  private physicsSystem: PhysicsSystem
  
  private currentLevel?: LevelDefinition
  private levelObjects: THREE.Object3D[] = []
  private spawnPoints: Map<string, SpawnPoint[]> = new Map()
  
  private constructor(scene: THREE.Scene) {
    this.scene = scene
    this.assetLoader = AssetLoader.getInstance()
    this.physicsSystem = PhysicsSystem.getInstance()
    
    logger.info('LevelManager initialized')
  }
  
  static initialize(scene: THREE.Scene): LevelManager {
    if (!LevelManager.instance) {
      LevelManager.instance = new LevelManager(scene)
    }
    return LevelManager.instance
  }
  
  static getInstance(): LevelManager {
    if (!LevelManager.instance) {
      throw new Error('LevelManager not initialized. Call LevelManager.initialize() first.')
    }
    return LevelManager.instance
  }
  
  /**
   * Load a level from JSON definition
   */
  async loadLevel(levelData: LevelDefinition): Promise<void> {
    logger.info(`Loading level: ${levelData.name}`)
    
    // Clear previous level
    this.clearLevel()
    
    this.currentLevel = levelData
    
    // Apply environment settings
    this.applyEnvironment(levelData.environment)
    
    // Create ground
    this.createGround(levelData.ground)
    
    // Create level objects
    for (const objDef of levelData.objects) {
      const object = await this.createObject(objDef)
      if (object) {
        this.levelObjects.push(object)
        this.scene.add(object)
      }
    }
    
    // Store spawn points
    this.processSpawnPoints(levelData.spawnPoints)
    
    // Emit level loaded event
    eventBus.emit('level:loaded', {
      levelName: levelData.name,
      spawnPoints: this.spawnPoints
    })
    
    logger.info(`Level ${levelData.name} loaded successfully`)
  }
  
  /**
   * Load level from JSON file
   */
  async loadLevelFromFile(url: string): Promise<void> {
    try {
      const response = await fetch(url)
      const levelData = await response.json() as LevelDefinition
      await this.loadLevel(levelData)
    } catch (error) {
      logger.error(`Failed to load level from ${url}:`, error)
      throw error
    }
  }
  
  /**
   * Clear current level
   */
  clearLevel(): void {
    // Remove all level objects from scene
    this.levelObjects.forEach(obj => {
      this.scene.remove(obj)
      
      // Remove physics body if exists
      const rigidBody = this.physicsSystem.getRigidBody(obj)
      if (rigidBody) {
        this.physicsSystem.removeRigidBody(rigidBody)
      }
      
      // Dispose geometry and materials
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (child.material instanceof THREE.Material) {
            child.material.dispose()
          } else if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose())
          }
        }
      })
    })
    
    this.levelObjects = []
    this.spawnPoints.clear()
    this.currentLevel = undefined
  }
  
  private applyEnvironment(env: LevelDefinition['environment']): void {
    if (!env) return
    
    // Fog
    if (env.fogColor !== undefined) {
      const color = typeof env.fogColor === 'string' ? parseInt(env.fogColor) : env.fogColor
      this.scene.fog = new THREE.Fog(color, env.fogNear || 10, env.fogFar || 100)
    }
    
    // Ambient light
    if (env.ambientLight) {
      const existing = this.scene.getObjectByName('AmbientLight') as THREE.AmbientLight
      if (existing) {
        existing.color.set(env.ambientLight.color)
        existing.intensity = env.ambientLight.intensity
      } else {
        const light = new THREE.AmbientLight(env.ambientLight.color, env.ambientLight.intensity)
        light.name = 'AmbientLight'
        this.scene.add(light)
      }
    }
    
    // Directional light
    if (env.directionalLight) {
      const existing = this.scene.getObjectByName('DirectionalLight') as THREE.DirectionalLight
      if (existing) {
        existing.color.set(env.directionalLight.color)
        existing.intensity = env.directionalLight.intensity
        existing.position.fromArray(env.directionalLight.position)
        if (env.directionalLight.castShadow !== undefined) {
          existing.castShadow = env.directionalLight.castShadow
        }
      } else {
        const light = new THREE.DirectionalLight(
          env.directionalLight.color,
          env.directionalLight.intensity
        )
        light.name = 'DirectionalLight'
        light.position.fromArray(env.directionalLight.position)
        light.castShadow = env.directionalLight.castShadow ?? true
        
        // Shadow camera setup
        light.shadow.camera.left = -50
        light.shadow.camera.right = 50
        light.shadow.camera.top = 50
        light.shadow.camera.bottom = -50
        light.shadow.camera.near = 0.1
        light.shadow.camera.far = 200
        light.shadow.mapSize.width = 2048
        light.shadow.mapSize.height = 2048
        
        this.scene.add(light)
      }
    }
  }
  
  private createGround(ground: LevelDefinition['ground']): void {
    // Create a thin box instead of a plane for better physics collision
    const geometry = new THREE.BoxGeometry(ground.size[0], 0.2, ground.size[1])
    const material = new THREE.MeshPhongMaterial({
      color: typeof ground.color === 'string' ? parseInt(ground.color) : (ground.color || 0x228B22)  // Parse hex string to number
    })
    
    const mesh = new THREE.Mesh(geometry, material)
    
    // Disable frustum culling to prevent clipping issues
    mesh.frustumCulled = false
    
    // Position the box so its top surface is at y=0
    mesh.position.y = -0.1
    if (ground.position) {
      mesh.position.fromArray(ground.position)
      mesh.position.y = (ground.position[1] || 0) - 0.1
    }
    mesh.receiveShadow = true
    mesh.name = 'Ground'
    mesh.userData.type = 'ground'
    
    this.scene.add(mesh)
    this.levelObjects.push(mesh)
    
    // Add physics body for ground
    this.physicsSystem.createRigidBody(mesh, {
      mass: 0,
      isStatic: true,
      shape: CollisionShape.BOX,
      halfExtents: new THREE.Vector3(ground.size[0] / 2, 0.1, ground.size[1] / 2),
      collisionGroup: PhysicsSystem.COLLISION_GROUP.STATIC,
      friction: 0.1  // Low friction for good movement feel
    })
  }
  
  private async createObject(objDef: LevelObject): Promise<THREE.Object3D | null> {
    let geometry: THREE.BufferGeometry | null = null
    let material: THREE.Material
    
    // Create geometry based on type
    switch (objDef.type) {
      case 'box': {
        const boxSize = objDef.size || [1, 1, 1]
        geometry = new THREE.BoxGeometry(
          Array.isArray(boxSize) ? boxSize[0] : boxSize,
          Array.isArray(boxSize) ? boxSize[1] : boxSize,
          Array.isArray(boxSize) ? boxSize[2] : boxSize
        )
        break
      }
      
      case 'sphere': {
        const sphereRadius = Array.isArray(objDef.size) ? objDef.size[0] : (objDef.size || 1)
        geometry = new THREE.SphereGeometry(sphereRadius, 32, 16)
        break
      }
      
      case 'cylinder': {
        const cylSize = objDef.size || [1, 2, 1]
        geometry = new THREE.CylinderGeometry(
          Array.isArray(cylSize) ? cylSize[0] : cylSize,
          Array.isArray(cylSize) ? cylSize[2] : cylSize,
          Array.isArray(cylSize) ? cylSize[1] : cylSize * 2,
          32
        )
        break
      }
      
      case 'plane': {
        const planeSize = objDef.size || [1, 1]
        geometry = new THREE.PlaneGeometry(
          Array.isArray(planeSize) ? planeSize[0] : planeSize,
          Array.isArray(planeSize) ? planeSize[1] : planeSize
        )
        break
      }
      
      case 'model':
        // TODO: Load GLTF model
        logger.warn('Model loading not yet implemented')
        return null
    }
    
    if (!geometry) return null
    
    // Create material
    const matDef = objDef.material || {}
    const materialType = matDef.type || 'phong'
    
    switch (materialType) {
      case 'standard':
        material = new THREE.MeshStandardMaterial({
          color: matDef.color || objDef.color || 0xffffff,
          roughness: matDef.roughness ?? 0.5,
          metalness: matDef.metalness ?? 0,
          transparent: matDef.transparent || false,
          opacity: matDef.opacity ?? 1
        })
        break
      
      case 'basic':
        material = new THREE.MeshBasicMaterial({
          color: matDef.color || objDef.color || 0xffffff,
          transparent: matDef.transparent || false,
          opacity: matDef.opacity ?? 1
        })
        break
      
      case 'phong':
      default:
        material = new THREE.MeshPhongMaterial({
          color: matDef.color || objDef.color || 0xffffff,
          emissive: matDef.emissive || 0x000000,
          transparent: matDef.transparent || false,
          opacity: matDef.opacity ?? 1
        })
        break
    }
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material)
    
    // Disable frustum culling to fix clipping issues with buildings/walls
    mesh.frustumCulled = false
    
    // Set transform
    mesh.position.fromArray(objDef.position)
    if (objDef.rotation) {
      mesh.rotation.fromArray(objDef.rotation)
    }
    if (objDef.scale) {
      if (Array.isArray(objDef.scale)) {
        mesh.scale.fromArray(objDef.scale)
      } else {
        mesh.scale.setScalar(objDef.scale)
      }
    }
    
    // Set properties
    if (objDef.name) mesh.name = objDef.name
    mesh.castShadow = objDef.castShadow ?? true
    mesh.receiveShadow = objDef.receiveShadow ?? true
    
    // Set user data
    if (objDef.userData) {
      Object.assign(mesh.userData, objDef.userData)
    }
    mesh.userData.levelObject = true
    
    // Add physics if specified
    if (objDef.physics) {
      this.physicsSystem.createRigidBody(mesh, {
        mass: objDef.physics.mass ?? 0,
        isStatic: objDef.physics.isStatic ?? true,
        shape: objDef.type === 'sphere' ? CollisionShape.SPHERE : CollisionShape.BOX,
        collisionGroup: objDef.physics.collisionGroup ?? PhysicsSystem.COLLISION_GROUP.STATIC,
        restitution: objDef.physics.restitution ?? 0.3,
        friction: objDef.physics.friction ?? 0.5
      })
    }
    
    return mesh
  }
  
  private processSpawnPoints(spawnPoints: SpawnPoint[]): void {
    this.spawnPoints.clear()
    
    for (const spawn of spawnPoints) {
      if (!this.spawnPoints.has(spawn.type)) {
        this.spawnPoints.set(spawn.type, [])
      }
      this.spawnPoints.get(spawn.type)!.push(spawn)
    }
  }
  
  /**
   * Get spawn points by type
   */
  getSpawnPoints(type: string): SpawnPoint[] {
    return this.spawnPoints.get(type) || []
  }
  
  /**
   * Get a random spawn point of given type
   */
  getRandomSpawnPoint(type: string): SpawnPoint | null {
    const points = this.getSpawnPoints(type)
    if (points.length === 0) return null
    
    const index = Math.floor(Math.random() * points.length)
    return points[index]
  }
  
  /**
   * Get all level objects
   */
  getLevelObjects(): THREE.Object3D[] {
    return [...this.levelObjects]
  }
  
  /**
   * Get current level definition
   */
  getCurrentLevel(): LevelDefinition | undefined {
    return this.currentLevel
  }
  
  /**
   * Find object by name
   */
  findObject(name: string): THREE.Object3D | null {
    return this.levelObjects.find(obj => obj.name === name) || null
  }
  
  /**
   * Add object to level at runtime
   */
  addObject(object: THREE.Object3D, addPhysics = false): void {
    this.levelObjects.push(object)
    this.scene.add(object)
    
    if (addPhysics) {
      this.physicsSystem.createRigidBody(object, {
        isStatic: true,
        collisionGroup: PhysicsSystem.COLLISION_GROUP.STATIC
      })
    }
  }
  
  /**
   * Remove object from level
   */
  removeObject(object: THREE.Object3D): void {
    const index = this.levelObjects.indexOf(object)
    if (index !== -1) {
      this.levelObjects.splice(index, 1)
      this.scene.remove(object)
      
      // Remove physics body
      const rigidBody = this.physicsSystem.getRigidBody(object)
      if (rigidBody) {
        this.physicsSystem.removeRigidBody(rigidBody)
      }
    }
  }
}