import Phaser from 'phaser'
import { createGameConfig } from './config/gameConfig'
import { logger } from './utils/Logger'

let game: Phaser.Game | null = null

function launch(): void {
  if (game) {
    return
  }

  logger.info('Bootstrapping Phaser game')
  const config = createGameConfig()
  game = new Phaser.Game(config)
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  launch()
} else {
  window.addEventListener('DOMContentLoaded', launch, { once: true })
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    logger.info('HMR: accepting updated modules')
    if (!game) {
      launch()
    }
  })

  import.meta.hot.dispose(() => {
    logger.info('HMR: disposing Phaser game instance')
    game?.destroy(true)
    game = null
  })
}
