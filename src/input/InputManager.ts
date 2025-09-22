export type InputIntent = 'forward' | 'backward' | 'left' | 'right' | 'jump' | 'sprint'

const keyBindings: Record<string, InputIntent> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'jump',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint'
}

export class InputManager {
  private activeIntents = new Set<InputIntent>()

  private boundKeyDown = (event: KeyboardEvent) => {
    const intent = keyBindings[event.code]
    if (!intent) return
    this.activeIntents.add(intent)
  }

  private boundKeyUp = (event: KeyboardEvent) => {
    const intent = keyBindings[event.code]
    if (!intent) return
    this.activeIntents.delete(intent)
  }

  attach(): void {
    window.addEventListener('keydown', this.boundKeyDown)
    window.addEventListener('keyup', this.boundKeyUp)
  }

  detach(): void {
    window.removeEventListener('keydown', this.boundKeyDown)
    window.removeEventListener('keyup', this.boundKeyUp)
    this.activeIntents.clear()
  }

  isActive(intent: InputIntent): boolean {
    return this.activeIntents.has(intent)
  }
}
