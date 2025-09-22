import Phaser from 'phaser'
import { eventBus } from '../utils/EventBus'

interface PlayerConfig {
  speed: number
  jumpVelocity: number
  maxHealth: number
}

const DEFAULTS: PlayerConfig = {
  speed: 280,
  jumpVelocity: -520,
  maxHealth: 5
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private wasOnGround = false
  private doubleJumpAvailable = true
  private fireCooldown = 200
  private lastFired = 0
  private gamepad?: Phaser.Input.Gamepad.Gamepad
  private readonly config: PlayerConfig

  constructor(scene: Phaser.Scene, x: number, y: number, config: Partial<PlayerConfig> = {}) {
    super(scene, x, y, 'player-body')
    this.config = { ...DEFAULTS, ...config }

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setCollideWorldBounds(true)
    this.setBounce(0.15)
    this.setDragX(800)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setSize(32, 48)

    this.setDataEnabled()
    this.setData('health', this.config.maxHealth)
    this.setData('maxHealth', this.config.maxHealth)

    eventBus.emit('player:health', { current: this.config.maxHealth, max: this.config.maxHealth })
  }

  attachInput(cursors: Phaser.Types.Input.Keyboard.CursorKeys, gamepad?: Phaser.Input.Gamepad.Gamepad): void {
    this.cursors = cursors
    this.gamepad = gamepad
  }

  update(time: number, delta: number): void {
    this.handleMovement(delta)
    this.handleJumping()

    const pointer = this.scene.input.activePointer
    const isPointerDown = pointer.isDown || this.gamepad?.buttons[0]?.pressed

    if (isPointerDown && time > this.lastFired + this.fireCooldown) {
      this.lastFired = time
      eventBus.emit('player:ability', { name: 'pulse', cooldown: this.fireCooldown / 1000 })
      this.scene.events.emit('player:fire', { origin: this.getCenter(), pointer })
    }

    const body = this.body as Phaser.Physics.Arcade.Body
    this.wasOnGround = body.blocked.down
  }

  takeDamage(amount: number): void {
    const current = this.getData('health') as number
    const next = Phaser.Math.Clamp(current - amount, 0, this.config.maxHealth)
    this.setData('health', next)
    eventBus.emit('player:health', { current: next, max: this.config.maxHealth })

    this.scene.tweens.add({
      targets: this,
      duration: 80,
      repeat: 3,
      alpha: { from: 1, to: 0.4 },
      yoyo: true
    })

    if (next <= 0) {
      this.disableBody(true, true)
      this.scene.events.emit('player:dead')
    }
  }

  heal(amount: number): void {
    const current = this.getData('health') as number
    const next = Phaser.Math.Clamp(current + amount, 0, this.config.maxHealth)
    this.setData('health', next)
    eventBus.emit('player:health', { current: next, max: this.config.maxHealth })
  }

  resetAbilities(): void {
    this.doubleJumpAvailable = true
  }

  private handleMovement(delta: number): void {
    const acceleration = this.config.speed * (delta / 16.67)
    const inputX = this.getHorizontalInput()

    if (inputX !== 0) {
      this.setAccelerationX(acceleration * inputX)
      this.setFlipX(inputX < 0)
    } else {
      this.setAccelerationX(0)
      this.setDragX(1200)
    }
  }

  private getHorizontalInput(): number {
    if (this.gamepad) {
      const axis = this.gamepad.axes[0]?.getValue() ?? 0
      if (Math.abs(axis) > 0.2) {
        return axis
      }
    }

    if (!this.cursors) return 0

    const left = this.cursors.left?.isDown ? -1 : 0
    const right = this.cursors.right?.isDown ? 1 : 0
    return left + right
  }

  private handleJumping(): void {
    const jumpPressed = this.isJumpPressed()

    const body = this.body as Phaser.Physics.Arcade.Body

    if (jumpPressed && body.blocked.down) {
      this.setVelocityY(this.config.jumpVelocity)
      this.doubleJumpAvailable = true
      this.emitJumpFeedback()
    } else if (jumpPressed && this.doubleJumpAvailable && !body.blocked.down && this.wasOnGround === false) {
      this.doubleJumpAvailable = false
      this.setVelocityY(this.config.jumpVelocity * 0.9)
      this.emitJumpFeedback()
    }

    if (body.blocked.down) {
      this.doubleJumpAvailable = true
    }
  }

  private isJumpPressed(): boolean {
    const pointer = this.scene.input.activePointer
    const keyboardJump = this.cursors?.up?.isDown || this.cursors?.space?.isDown
    const pointerJump = pointer.isDown && pointer.getDuration() < 200
    const gamepadJump = this.gamepad?.buttons[1]?.pressed

    return Boolean(keyboardJump || pointerJump || gamepadJump)
  }

  private emitJumpFeedback(): void {
    this.scene.sound.play('sfx-jump', { volume: 0.4 })
    this.scene.tweens.add({
      targets: this,
      duration: 180,
      scaleY: { from: 1.1, to: 1 },
      scaleX: { from: 0.9, to: 1 },
      ease: Phaser.Math.Easing.Quadratic.Out
    })
  }
}
