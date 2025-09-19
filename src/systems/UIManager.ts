import { logger } from '../utils/Logger'

export interface UIConfig {
  rootElement?: HTMLElement
  debugMode?: boolean
}

interface MessageEntry {
  id: number
  text: string
}

export class UIManager {
  private static instance: UIManager

  private readonly root: HTMLElement
  private readonly card: HTMLDivElement
  private readonly titleElement: HTMLDivElement
  private readonly instructionsElement: HTMLUListElement
  private readonly statusElement: HTMLDivElement
  private readonly hintElement: HTMLDivElement
  private readonly feedElement: HTMLDivElement

  private readonly messages: MessageEntry[] = []
  private readonly maxMessages = 4
  private nextMessageId = 0

  private constructor(config: UIConfig = {}) {
    this.root = config.rootElement ?? document.body

    this.card = document.createElement('div')
    this.card.id = 'ui-card'
    this.applyCardStyles()

    this.titleElement = document.createElement('div')
    this.titleElement.className = 'ui-title'
    this.card.appendChild(this.titleElement)

    this.instructionsElement = document.createElement('ul')
    this.instructionsElement.className = 'ui-instructions'
    this.card.appendChild(this.instructionsElement)

    this.statusElement = document.createElement('div')
    this.statusElement.className = 'ui-status'
    this.card.appendChild(this.statusElement)

    this.feedElement = document.createElement('div')
    this.feedElement.className = 'ui-feed'
    this.card.appendChild(this.feedElement)

    this.hintElement = document.createElement('div')
    this.hintElement.className = 'ui-hint'
    this.card.appendChild(this.hintElement)

    this.injectStyles()
    this.root.appendChild(this.card)

    logger.info('UIManager initialized with compact HUD')
  }

  static initialize(config?: UIConfig): UIManager {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager(config)
    }
    return UIManager.instance
  }

  static getInstance(): UIManager {
    if (!UIManager.instance) {
      throw new Error('UIManager not initialized. Call UIManager.initialize() first.')
    }
    return UIManager.instance
  }

  update(_deltaTime: number): void {
    // No per-frame work required yet, method retained for API parity
  }

  setTitle(text: string): void {
    this.titleElement.textContent = text
  }

  setInstructions(lines: string[]): void {
    this.instructionsElement.innerHTML = ''
    lines.forEach(line => {
      const item = document.createElement('li')
      item.textContent = line
      this.instructionsElement.appendChild(item)
    })
  }

  setStatus(text: string): void {
    this.statusElement.textContent = text
  }

  setHint(text: string): void {
    this.hintElement.textContent = text
  }

  pushMessage(text: string): void {
    const entry: MessageEntry = { id: this.nextMessageId += 1, text }
    this.messages.push(entry)
    while (this.messages.length > this.maxMessages) {
      this.messages.shift()
    }

    this.feedElement.innerHTML = ''
    this.messages.forEach(message => {
      const line = document.createElement('div')
      line.textContent = message.text
      line.className = 'ui-feed-line'
      this.feedElement.appendChild(line)
    })
  }

  dispose(): void {
    this.root.removeChild(this.card)
    UIManager.instance = undefined!
    logger.info('UIManager disposed')
  }

  private applyCardStyles(): void {
    Object.assign(this.card.style, {
      position: 'absolute',
      top: '20px',
      left: '20px',
      padding: '16px 20px',
      color: '#f5f5f5',
      background: 'rgba(12, 18, 26, 0.82)',
      borderRadius: '12px',
      fontFamily: 'Inter, system-ui, sans-serif',
      width: '260px',
      pointerEvents: 'none'
    })
  }

  private injectStyles(): void {
    if (document.getElementById('ui-compact-styles')) return

    const style = document.createElement('style')
    style.id = 'ui-compact-styles'
    style.textContent = `
      #ui-card {
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
      }

      #ui-card .ui-title {
        font-size: 14px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: 12px;
        color: rgba(225, 242, 255, 0.8);
      }

      #ui-card .ui-instructions {
        list-style: none;
        padding: 0;
        margin: 0 0 12px 0;
        font-size: 14px;
        line-height: 1.5;
        color: rgba(240, 248, 255, 0.9);
      }

      #ui-card .ui-status {
        font-size: 15px;
        margin-bottom: 12px;
        color: #ffffff;
        font-weight: 500;
      }

      #ui-card .ui-feed {
        font-size: 13px;
        color: rgba(209, 220, 232, 0.85);
        min-height: 40px;
      }

      #ui-card .ui-feed-line {
        opacity: 0.8;
      }

      #ui-card .ui-hint {
        margin-top: 12px;
        font-size: 12px;
        color: rgba(173, 205, 255, 0.7);
      }
    `

    document.head.appendChild(style)
  }
}
