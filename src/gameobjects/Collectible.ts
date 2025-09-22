import Phaser from 'phaser'

export class Collectible extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'collectible')
    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setCircle(16)
    this.setBounce(0.4)
    this.setDepth(3)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)

    scene.tweens.add({
      targets: this,
      duration: 1200,
      angle: 360,
      repeat: -1
    })

    scene.tweens.add({
      targets: this,
      duration: 900,
      y: this.y - 6,
      yoyo: true,
      ease: Phaser.Math.Easing.Sine.InOut,
      repeat: -1
    })
  }
}
