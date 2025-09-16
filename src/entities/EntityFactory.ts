import * as THREE from 'three'
import { Player } from './Player'
import { Enemy } from './Enemy'
import { Collectible } from './Collectible'
import { Bullet } from './Bullet'
import { logger } from '../utils/Logger'

/**
 * Factory for creating game entities with consistent settings
 * Makes it easy for LLMs to spawn entities without knowing all the details
 */
export class EntityFactory {
  /**
   * Create a player entity
   */
  static createPlayer(): Player {
    const player = new Player()
    logger.info('Created player entity')
    return player
  }

  /**
   * Create an enemy with different variants
   */
  static createEnemy(type: 'basic' | 'fast' | 'tank' = 'basic'): Enemy {
    const enemy = new Enemy()

    switch (type) {
      case 'fast':
        enemy.speed = 6
        enemy.health = 30
        enemy.maxHealth = 30
        if (enemy.mesh && enemy.mesh.material instanceof THREE.MeshPhongMaterial) {
          enemy.mesh.material.color.setHex(0xff00ff) // Purple for fast
        }
        enemy.scale.set(0.8, 0.8, 0.8)
        break

      case 'tank':
        enemy.speed = 2
        enemy.health = 150
        enemy.maxHealth = 150
        if (enemy.mesh && enemy.mesh.material instanceof THREE.MeshPhongMaterial) {
          enemy.mesh.material.color.setHex(0x800000) // Dark red for tank
        }
        enemy.scale.set(1.5, 1.5, 1.5)
        break

      case 'basic':
      default:
        // Use default Enemy settings
        break
    }

    enemy.userData.enemyType = type
    logger.info(`Created ${type} enemy`)
    return enemy
  }

  /**
   * Create a collectible item
   */
  static createCollectible(
    value: number = 10,
    color?: number,
    type: 'coin' | 'gem' | 'powerup' = 'coin'
  ): Collectible {
    // Determine color based on type if not provided
    if (color === undefined) {
      switch (type) {
        case 'gem':
          color = 0x00ffff // Cyan
          if (value === 0) value = 50
          break
        case 'powerup':
          color = 0xff00ff // Magenta
          if (value === 0) value = 100
          break
        case 'coin':
        default:
          color = 0xffff00 // Yellow
          if (value === 0) value = 10
          break
      }
    }

    const collectible = new Collectible(value || 10, color)
    collectible.userData.collectibleType = type

    // Adjust scale based on type
    switch (type) {
      case 'gem':
        collectible.scale.set(0.8, 0.8, 0.8)
        break
      case 'powerup':
        collectible.scale.set(1.2, 1.2, 1.2)
        break
    }

    logger.info(`Created ${type} collectible with value ${value}`)
    return collectible
  }

  /**
   * Create a bullet projectile
   */
  static createBullet(): Bullet {
    return new Bullet()
  }

  /**
   * Create multiple enemies in a formation
   */
  static createEnemyFormation(
    center: THREE.Vector3,
    count: number = 4,
    radius: number = 10,
    enemyType: 'basic' | 'fast' | 'tank' = 'basic'
  ): Enemy[] {
    const enemies: Enemy[] = []
    const angleStep = (Math.PI * 2) / count

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep
      const x = center.x + Math.cos(angle) * radius
      const z = center.z + Math.sin(angle) * radius

      const enemy = this.createEnemy(enemyType)
      enemy.position.set(x, center.y, z)
      enemies.push(enemy)
    }

    logger.info(`Created enemy formation with ${count} enemies`)
    return enemies
  }

  /**
   * Create a grid of collectibles
   */
  static createCollectibleGrid(
    center: THREE.Vector3,
    rows: number = 3,
    cols: number = 3,
    spacing: number = 3,
    value: number = 10,
    color?: number
  ): Collectible[] {
    const collectibles: Collectible[] = []
    const halfWidth = ((cols - 1) * spacing) / 2
    const halfHeight = ((rows - 1) * spacing) / 2

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = center.x + col * spacing - halfWidth
        const z = center.z + row * spacing - halfHeight

        const collectible = this.createCollectible(value, color)
        collectible.position.set(x, center.y, z)
        collectible.baseY = center.y
        collectibles.push(collectible)
      }
    }

    logger.info(`Created collectible grid with ${rows}x${cols} items`)
    return collectibles
  }

  /**
   * Create a random scatter of collectibles
   */
  static createCollectibleScatter(
    center: THREE.Vector3,
    count: number = 10,
    radius: number = 15,
    minValue: number = 5,
    maxValue: number = 25
  ): Collectible[] {
    const collectibles: Collectible[] = []

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = Math.random() * radius
      const x = center.x + Math.cos(angle) * distance
      const z = center.z + Math.sin(angle) * distance

      const value = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue
      const type = Math.random() < 0.7 ? 'coin' : Math.random() < 0.5 ? 'gem' : 'powerup'
      const collectible = this.createCollectible(value, undefined, type)
      collectible.position.set(x, center.y, z)
      collectible.baseY = center.y
      collectibles.push(collectible)
    }

    logger.info(`Created scatter of ${count} collectibles`)
    return collectibles
  }

  /**
   * Create a wave of enemies
   */
  static createEnemyWave(
    spawnPoint: THREE.Vector3,
    waveNumber: number = 1
  ): Enemy[] {
    const enemies: Enemy[] = []
    const baseCount = 3
    const extraPerWave = 2
    const count = baseCount + (waveNumber - 1) * extraPerWave

    // Mix of enemy types based on wave
    for (let i = 0; i < count; i++) {
      let type: 'basic' | 'fast' | 'tank' = 'basic'

      if (waveNumber > 5 && i % 4 === 0) {
        type = 'tank'
      } else if (waveNumber > 2 && i % 2 === 0) {
        type = 'fast'
      }

      const enemy = this.createEnemy(type)

      // Spawn in a spread pattern
      const spread = 5
      const offsetX = (Math.random() - 0.5) * spread
      const offsetZ = (Math.random() - 0.5) * spread

      enemy.position.set(
        spawnPoint.x + offsetX,
        spawnPoint.y,
        spawnPoint.z + offsetZ
      )

      enemies.push(enemy)
    }

    logger.info(`Created wave ${waveNumber} with ${count} enemies`)
    return enemies
  }
}