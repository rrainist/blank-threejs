import Phaser from 'phaser'

interface PatrolConfig {
  left: number
  right: number
  speed: number
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private patrol: PatrolConfig
  private health = 3

  constructor(scene: Phaser.Scene, x: number, y: number, patrol: PatrolConfig) {
    super(scene, x, y, 'enemy-body')

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.patrol = patrol
    this.setCollideWorldBounds(true)
    this.setBounce(0.2)
    this.setVelocityX(this.patrol.speed)
    this.setDepth(2)
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta)
    this.handlePatrol()
  }

  takeHit(): boolean {
    this.health -= 1

    this.scene.tweens.add({
      targets: this,
      duration: 100,
      scaleX: { from: 1.1, to: 1 },
      scaleY: { from: 0.9, to: 1 },
      ease: Phaser.Math.Easing.Back.Out
    })

    if (this.health <= 0) {
      const burst = this.scene.add.circle(this.x, this.y, 24, 0xf97316, 0.8)
      burst.setDepth(5)
      this.scene.tweens.add({
        targets: burst,
        duration: 320,
        scale: { from: 1, to: 2.4 },
        alpha: { from: 0.8, to: 0 },
        ease: Phaser.Math.Easing.Quadratic.Out,
        onComplete: () => burst.destroy()
      })
      this.scene.sound.play('sfx-explosion', { volume: 0.5 })
      this.disableBody(true, true)
      return true
    }

    return false
  }

  private handlePatrol(): void {
    const body = this.body as Phaser.Physics.Arcade.Body
    if (!body) return

    if (this.x <= this.patrol.left) {
      body.setVelocityX(Math.abs(this.patrol.speed))
      this.setFlipX(false)
    } else if (this.x >= this.patrol.right) {
      body.setVelocityX(-Math.abs(this.patrol.speed))
      this.setFlipX(true)
    }
  }
}
