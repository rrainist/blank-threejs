import { Engine } from '@babylonjs/core/Engines/engine'
import { createEngine } from './rendering/createEngine'
import { SceneOrchestrator } from './rendering/SceneOrchestrator'
import { CannonPhysicsSystem } from './physics/CannonPhysicsSystem'
import { logger } from './utils/Logger'
import { errorHandler } from './utils/ErrorHandler'

let engine: Engine | null = null
let orchestrator: SceneOrchestrator | null = null

function setLoadingState(visible: boolean): void {
  const loadingElement = document.getElementById('loading')
  if (!loadingElement) return
  loadingElement.style.display = visible ? 'block' : 'none'
}

async function launch(): Promise<void> {
  if (orchestrator) {
    return
  }

  setLoadingState(true)
  engine = createEngine()

  const physics = new CannonPhysicsSystem()
  orchestrator = new SceneOrchestrator(engine, physics)

  try {
    await orchestrator.start()
    setLoadingState(false)
  } catch (error) {
    setLoadingState(false)
    errorHandler.handleError(error as Error, { system: 'bootstrap' })
    throw error
  }
}

const boot = () => {
  launch().catch((error) => {
    logger.error('Failed to launch Babylon starter', error)
  })
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  boot()
} else {
  window.addEventListener('DOMContentLoaded', boot, { once: true })
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    logger.info('HMR: accepting updated modules')
    if (!orchestrator) {
      boot()
    }
  })

  import.meta.hot.dispose(() => {
    logger.info('HMR: disposing Babylon engine and orchestrator')
    orchestrator?.dispose()
    orchestrator = null
    engine?.dispose()
    engine = null
  })
}
