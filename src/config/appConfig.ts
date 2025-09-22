export interface RenderConfig {
  canvasId: string
  backgroundColor: string
  antialias: boolean
  adaptToDeviceRatio: boolean
}

export interface PhysicsConfig {
  gravity: { x: number; y: number; z: number }
  fixedTimeStep: number
  maxSubSteps: number
}

export interface CameraConfig {
  radius: number
  alpha: number
  beta: number
  lowerRadiusLimit: number
  upperRadiusLimit: number
  wheelPrecision: number
  minZ: number
  maxZ: number
}

export interface AppConfig {
  render: RenderConfig
  physics: PhysicsConfig
  camera: CameraConfig
}

export const appConfig: AppConfig = {
  render: {
    canvasId: 'render-surface',
    backgroundColor: '#0f172a',
    antialias: true,
    adaptToDeviceRatio: true
  },
  physics: {
    gravity: { x: 0, y: -9.81, z: 0 },
    fixedTimeStep: 1 / 60,
    maxSubSteps: 3
  },
  camera: {
    radius: 24,
    alpha: Math.PI * 1.2,
    beta: Math.PI / 3,
    lowerRadiusLimit: 8,
    upperRadiusLimit: 64,
    wheelPrecision: 60,
    minZ: 0.1,
    maxZ: 500
  }
}
