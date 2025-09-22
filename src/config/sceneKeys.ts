export const SceneKeys = {
  BOOT: 'boot',
  PRELOAD: 'preload',
  MAIN: 'main',
  UI: 'ui'
} as const

export type SceneKey = typeof SceneKeys[keyof typeof SceneKeys]
