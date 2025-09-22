import { Scene } from '@babylonjs/core/scene'
import { AssetsManager } from '@babylonjs/core/Misc/assetsManager'
import '@babylonjs/core/Loading/loadingScreen'
import { logger } from '../utils/Logger'

export type AssetType = 'gltf' | 'hdr' | 'texture' | 'sound'

export interface AssetDefinition {
  id: string
  type: AssetType
  rootUrl: string
  file: string
}

const manifest: AssetDefinition[] = []

export class AssetManagerService {
  constructor(private readonly scene: Scene) {}

  async load(): Promise<void> {
    if (manifest.length === 0) {
      logger.info('No runtime assets specified, skipping load step')
      return
    }

    const manager = new AssetsManager(this.scene)

    manifest.forEach((asset) => {
      switch (asset.type) {
        case 'gltf':
          manager.addMeshTask(asset.id, '', asset.rootUrl, asset.file)
          break
        case 'hdr':
          manager.addCubeTextureTask(asset.id, asset.rootUrl)
          break
        case 'texture':
          manager.addTextureTask(asset.id, `${asset.rootUrl}${asset.file}`)
          break
        case 'sound':
          manager.addBinaryFileTask(asset.id, `${asset.rootUrl}${asset.file}`)
          break
        default:
          logger.warn(`Unsupported asset type for ${asset.id}`)
      }
    })

    await manager.loadAsync()
    logger.info('Assets loaded successfully')
  }
}
