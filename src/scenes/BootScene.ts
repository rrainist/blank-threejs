import Phaser from 'phaser'
import { SceneKeys } from '../config/sceneKeys'
import { logger } from '../utils/Logger'

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.BOOT)
  }

  init(): void {
    logger.info('BootScene initialized')
    this.game.events.emit('template:boot')

    // Configure scale options early so all scenes inherit them
    this.scale.scaleMode = Phaser.Scale.FIT
    this.scale.autoCenter = Phaser.Scale.CENTER_BOTH

    // Prepare registry defaults for shared game state
    this.registry.merge({
      score: 0,
      level: 1,
      highScore: 0
    })
  }

  preload(): void {
    // Display a minimal loading UI while PreloadScene takes over
    const { width, height } = this.scale
    const loadingText = this.add.text(width / 2, height / 2, 'Booting…', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff'
    })
    loadingText.setOrigin(0.5)

    this.time.delayedCall(150, () => {
      loadingText.destroy()
      this.scene.start(SceneKeys.PRELOAD)
    })
  }
}
