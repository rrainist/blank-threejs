import Phaser from 'phaser'
import { SceneKeys } from '../config/sceneKeys'
import { logger } from '../utils/Logger'

function assetUrl(relativePath: string): string {
  return new URL(relativePath, import.meta.url).href
}

export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics
  private progressBox!: Phaser.GameObjects.Graphics
  private progressText!: Phaser.GameObjects.Text

  constructor() {
    super(SceneKeys.PRELOAD)
  }

  preload(): void {
    const { width, height } = this.scale

    this.progressBox = this.add.graphics()
    this.progressBox.fillStyle(0x0f172a, 0.8)
    this.progressBox.fillRoundedRect(width / 2 - 160, height / 2 - 30, 320, 60, 12)

    this.progressBar = this.add.graphics()

    this.progressText = this.add.text(width / 2, height / 2 + 50, 'Loading 0%', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#e2e8f0'
    }).setOrigin(0.5)

    this.load.on('progress', (value: number) => {
      this.progressBar.clear()
      this.progressBar.fillStyle(0x38bdf8, 1)
      this.progressBar.fillRoundedRect(width / 2 - 150, height / 2 - 20, 300 * value, 40, 10)
      this.progressText.setText(`Loading ${(value * 100).toFixed(0)}%`)
    })

    this.load.on('fileprogress', (_file: unknown) => {
      // hook for logging if needed
    })

    this.load.on('complete', () => {
      this.progressBar.destroy()
      this.progressBox.destroy()
      this.progressText.destroy()
    })

    // Audio assets (demonstrates multi-channel playback)
    this.load.audio('sfx-collect', assetUrl('../../assets/sounds/General Sounds/Coins/sfx_coin_single1.wav'))
    this.load.audio('sfx-explosion', assetUrl('../../assets/sounds/Explosions/Medium Length/sfx_exp_medium5.wav'))
    this.load.audio('sfx-jump', assetUrl('../../assets/sounds/Movement/Jumping and Landing/sfx_movement_jump8.wav'))

    // Structured data example
    this.load.json('level-city', assetUrl('../../assets/levels/level1-city.json'))

    // Shaders (inline for now)
    this.cache.shader.add('pulse', `
      precision mediump float;
      varying vec2 outTexCoord;
      uniform float time;
      void main() {
        float wave = sin((outTexCoord.x + time) * 10.0) * 0.1;
        gl_FragColor = vec4(0.2 + wave, 0.4, 0.8, 1.0);
      }
    `)
  }

  create(): void {
    this.generateTextures()

    const levelData = this.cache.json.get('level-city')
    logger.debug('Loaded level data preview', levelData?.name)

    this.scene.start(SceneKeys.MAIN, { levelKey: 'level-city' })
    this.scene.launch(SceneKeys.UI)
  }

  private generateTextures(): void {
    const graphics = this.add.graphics({ x: 0, y: 0 })
    graphics.setVisible(false)

    // Player texture
    graphics.clear()
    graphics.fillStyle(0x22d3ee, 1)
    graphics.fillRoundedRect(0, 0, 48, 56, 12)
    graphics.lineStyle(4, 0x0f172a, 1)
    graphics.strokeRoundedRect(0, 0, 48, 56, 12)
    graphics.generateTexture('player-body', 48, 56)

    // Enemy texture
    graphics.clear()
    graphics.fillStyle(0xf97316, 1)
    graphics.fillRoundedRect(0, 0, 48, 48, 8)
    graphics.lineStyle(4, 0x0f172a, 1)
    graphics.strokeRoundedRect(0, 0, 48, 48, 8)
    graphics.generateTexture('enemy-body', 48, 48)

    // Collectible texture
    graphics.clear()
    graphics.fillStyle(0xfacc15, 1)
    graphics.fillCircle(20, 20, 20)
    graphics.lineStyle(4, 0x0f172a, 1)
    graphics.strokeCircle(20, 20, 20)
    graphics.generateTexture('collectible', 40, 40)

    // Bullet texture
    graphics.clear()
    graphics.fillStyle(0x38bdf8, 1)
    graphics.fillRoundedRect(0, 0, 16, 16, 6)
    graphics.generateTexture('bullet', 16, 16)

    // Platform texture
    graphics.clear()
    graphics.fillStyle(0x1e293b, 1)
    graphics.fillRoundedRect(0, 0, 64, 16, 4)
    graphics.generateTexture('platform', 64, 16)

    // Particle texture
    graphics.clear()
    graphics.fillStyle(0xffffff, 1)
    graphics.fillCircle(4, 4, 4)
    graphics.generateTexture('particle', 8, 8)

    graphics.destroy()
  }
}
