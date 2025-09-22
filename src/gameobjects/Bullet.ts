import Phaser from 'phaser'

export class Bullet extends Phaser.Physics.Arcade.Image {
  private speed = 800
  private lifespan = 1200
  private born = 0

  constructor(scene: Phaser.Scene, x = 0, y = 0) {
    super(scene, x, y, 'bullet')
    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setBlendMode(Phaser.BlendModes.ADD)
    this.setDepth(5)
    this.setActive(false)
    this.setVisible(false)
  }

  fire(origin: Phaser.Math.Vector2, direction: Phaser.Math.Vector2): void {
    this.enableBody(true, origin.x, origin.y, true, true)
    this.setActive(true)
    this.setVisible(true)
    this.setVelocity(direction.x * this.speed, direction.y * this.speed)
    this.setAcceleration(direction.x * this.speed * 0.6, direction.y * this.speed * 0.6)
    this.born = 0
  }

  update(_time: number, delta: number): void {
    this.born += delta
    if (this.born > this.lifespan) {
      this.disable()
    }
  }

  disable(): void {
    this.disableBody(true, true)
    this.setActive(false)
    this.setVisible(false)
    this.setVelocity(0)
    this.setAcceleration(0)
  }
}
