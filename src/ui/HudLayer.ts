import { eventBus } from '../utils/EventBus'

interface HudElements {
  container: HTMLDivElement
  wave: HTMLSpanElement
  score: HTMLSpanElement
  status: HTMLSpanElement
}

export class HudLayer {
  private elements: HudElements | null = null
  private unsubscribes: Array<() => void> = []

  init(): void {
    if (this.elements) return

    const root = document.getElementById('app')
    if (!root) {
      throw new Error('Unable to attach HUD: missing root element')
    }

    const container = document.createElement('div')
    container.className = 'info'

    const title = document.createElement('h1')
    title.textContent = 'Babylon Starter'

    const waveLabel = document.createElement('p')
    waveLabel.textContent = 'Wave: '
    const waveValue = document.createElement('span')
    waveLabel.appendChild(waveValue)

    const scoreLabel = document.createElement('p')
    scoreLabel.textContent = 'Score: '
    const scoreValue = document.createElement('span')
    scoreLabel.appendChild(scoreValue)

    const status = document.createElement('p')
    status.textContent = 'Status: Ready'

    container.append(title, waveLabel, scoreLabel, status)
    root.appendChild(container)

    this.elements = {
      container,
      wave: waveValue,
      score: scoreValue,
      status
    }

    this.registerEvents()
  }

  dispose(): void {
    if (!this.elements) return
    const { container } = this.elements
    container.remove()
    this.elements = null
    this.unsubscribes.forEach((fn) => fn())
    this.unsubscribes = []
  }

  private registerEvents(): void {
    const unsubWave = eventBus.on('game:wave', ({ wave }) => {
      if (!this.elements) return
      this.elements.wave.textContent = String(wave)
      this.elements.status.textContent = `Status: Wave ${wave}`
    })

    const unsubScore = eventBus.on('game:score', ({ score }) => {
      if (!this.elements) return
      this.elements.score.textContent = String(score)
    })

    this.unsubscribes.push(unsubWave, unsubScore)
  }
}
