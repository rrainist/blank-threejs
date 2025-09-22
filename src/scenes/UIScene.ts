import Phaser from 'phaser'
import { SceneKeys } from '../config/sceneKeys'
import { eventBus } from '../utils/EventBus'

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text
  private waveText!: Phaser.GameObjects.Text
  private healthBar!: Phaser.GameObjects.Graphics
  private cooldownText!: Phaser.GameObjects.Text
  private muted = false
  private unsubscribers: Array<() => void> = []

  constructor() {
    super(SceneKeys.UI)
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x000000)
    this.cameras.main.setAlpha(0)

    this.createHud()
    this.registerListeners()
  }

  private createHud(): void {
    this.add.rectangle(160, 40, 320, 80, 0x0f172a, 0.8).setScrollFactor(0)

    this.scoreText = this.add.text(40, 24, 'Score 0000', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#f8fafc'
    }).setScrollFactor(0)

    this.waveText = this.add.text(40, 56, 'Wave 1', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#38bdf8'
    }).setScrollFactor(0)

    this.healthBar = this.add.graphics().setScrollFactor(0)
    this.drawHealthBar(1, 1)

    this.cooldownText = this.add.text(this.scale.width - 220, 24, 'Ability Ready', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#facc15'
    }).setScrollFactor(0)

    const muteButton = this.add.text(this.scale.width - 130, 56, '[Toggle Audio]', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#f8fafc'
    }).setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.muted = !this.muted
        eventBus.emit('audio:toggle', { muted: this.muted })
        muteButton.setText(this.muted ? '[Audio Muted]' : '[Toggle Audio]')
      })

    const pauseHint = this.add.text(this.scale.width / 2, this.scale.height - 40, 'Press P to Pause · Shift for Slow-Mo · F1 Debug', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#cbd5f5'
    }).setScrollFactor(0)
    pauseHint.setOrigin(0.5, 0.5)
  }

  private registerListeners(): void {
    this.unsubscribers.push(eventBus.on('game:score', ({ score }) => {
      this.scoreText.setText(`Score ${score.toString().padStart(4, '0')}`)
    }))

    this.unsubscribers.push(eventBus.on('game:wave', ({ wave }) => {
      this.waveText.setText(`Wave ${wave}`)
    }))

    this.unsubscribers.push(eventBus.on('game:over', ({ score, wave }) => {
      this.add.text(this.scale.width / 2, this.scale.height / 2, `Game Over\nScore ${score}\nWave ${wave}`, {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#f87171',
        align: 'center'
      }).setScrollFactor(0)
        .setOrigin(0.5)
    }))

    this.unsubscribers.push(eventBus.on('game:pause', () => {
      this.add.rectangle(this.scale.width / 2, this.scale.height / 2, 480, 200, 0x0f172a, 0.85)
        .setScrollFactor(0)
        .setDepth(10)
        .setName('pause-overlay')

      this.add.text(this.scale.width / 2, this.scale.height / 2, 'Paused', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#38bdf8'
      }).setScrollFactor(0)
        .setDepth(11)
        .setOrigin(0.5)
        .setName('pause-text')
    }))

    this.unsubscribers.push(eventBus.on('game:resume', () => {
      this.children.getChildren().forEach((child) => {
        if (child.name === 'pause-overlay' || child.name === 'pause-text') {
          child.destroy()
        }
      })
    }))

    this.unsubscribers.push(eventBus.on('player:health', ({ current, max }) => {
      this.drawHealthBar(current, max)
    }))

    this.unsubscribers.push(eventBus.on('player:ability', ({ name, cooldown }) => {
      this.cooldownText.setText(`${name.toUpperCase()} Cooldown ${cooldown.toFixed(2)}s`)
      this.time.addEvent({
        delay: cooldown * 1000,
        callback: () => this.cooldownText.setText('Ability Ready')
      })
    }))

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribers.forEach((unsubscribe) => unsubscribe())
      this.unsubscribers = []
    })
  }

  private drawHealthBar(current: number, max: number): void {
    const percentage = max === 0 ? 0 : current / max
    const width = 240
    const height = 18
    const x = 40
    const y = 86

    this.healthBar.clear()
    this.healthBar.fillStyle(0x1e293b, 0.9)
    this.healthBar.fillRoundedRect(x, y, width, height, 6)

    this.healthBar.fillStyle(0x4ade80, 1)
    this.healthBar.fillRoundedRect(x + 2, y + 2, (width - 4) * percentage, height - 4, 4)
  }
}
