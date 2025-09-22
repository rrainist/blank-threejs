import { Engine } from '@babylonjs/core/Engines/engine'
import '@babylonjs/core/Loading/loadingScreen'
import { appConfig } from '../config/appConfig'
import { logger } from '../utils/Logger'

function ensureCanvasElement(): HTMLCanvasElement {
  const { canvasId } = appConfig.render
  const existing = document.getElementById(canvasId) as HTMLCanvasElement | null
  if (existing) {
    return existing
  }

  const root = document.getElementById('app')
  if (!root) {
    throw new Error('Unable to find root element with id "app"')
  }

  const canvas = document.createElement('canvas')
  canvas.id = canvasId
  canvas.dataset.engine = 'babylon'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  root.appendChild(canvas)

  return canvas
}

export function createEngine(): Engine {
  const canvas = ensureCanvasElement()
  const engine = new Engine(canvas, appConfig.render.antialias, {
    preserveDrawingBuffer: true,
    stencil: true
  }, appConfig.render.adaptToDeviceRatio)

  engine.onResizeObservable.add(() => {
    logger.debug('Engine resize event triggered')
  })

  window.addEventListener('resize', () => {
    engine.resize()
  })

  logger.info('Babylon engine created')
  return engine
}
