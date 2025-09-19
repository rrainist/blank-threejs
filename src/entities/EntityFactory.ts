import { Player } from './Player'
import { Enemy } from './Enemy'
import { WORLD } from '../constants/GameConstants'
import { logger } from '../utils/Logger'

/**
 * Minimal factory tailored for the turn-based valley prototype.
 */
export class EntityFactory {
  static createPlayer(tileSize: number = WORLD.TILE_SIZE): Player {
    logger.info('Created player avatar via factory')
    return new Player(tileSize)
  }

  static createEnemy(tileSize: number = WORLD.TILE_SIZE): Enemy {
    logger.info('Created roamer via factory')
    return new Enemy(tileSize)
  }
}
