import Phaser from 'phaser'
import { BootScene } from '../scenes/BootScene'
import { PreloadScene } from '../scenes/PreloadScene'
import { MainScene } from '../scenes/MainScene'
import { UIScene } from '../scenes/UIScene'

const DEBUG = import.meta.env.DEV

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.WEBGL,
    parent: 'app',
    backgroundColor: '#0f172a',
    disableContextMenu: true,
    pixelArt: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 800 },
        debug: DEBUG
      },
      matter: {
        gravity: { x: 0, y: 1 },
        enableSleeping: true,
        debug: DEBUG
      }
    },
    audio: {
      disableWebAudio: false,
      noAudio: false
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false
    },
    scene: [BootScene, PreloadScene, MainScene, UIScene]
  }
}
