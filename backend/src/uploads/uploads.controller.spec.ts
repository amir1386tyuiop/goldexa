import { join } from 'path'
import { rm } from 'fs/promises'
import { UploadsController } from './uploads.controller'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp')

describe('UploadsController', () => {
  it('stores product images within the 200 KB WebP limit', async () => {
    const controller = new UploadsController()
    const source = await sharp({
      create: { width: 1600, height: 1600, channels: 3, background: { r: 160, g: 90, b: 40 } },
    }).png().toBuffer()

    const result = await controller.uploadProductImage({
      buffer: source,
      mimetype: 'image/png',
      originalname: 'product.png',
      size: source.length,
    })

    expect(result.format).toBe('webp')
    expect(result.size).toBeLessThanOrEqual(200 * 1024)
    expect(result.withinLimit).toBe(true)
    await rm(join(process.cwd(), 'uploads', 'products', result.filename), { force: true })
  })

  it('stores validated custom-builder stage images as WebP', async () => {
    const controller = new UploadsController()
    const source = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 30, g: 30, b: 30 } },
    }).png().toBuffer()

    const result = await controller.uploadDesignStageAsset('image', {
      buffer: source,
      mimetype: 'image/png',
      originalname: 'stage.png',
      size: source.length,
    })

    expect(result.assetType).toBe('image')
    expect(result.format).toBe('webp')
    await rm(join(process.cwd(), 'uploads', 'custom-builder', 'stages', result.filename), { force: true })
  })

  it('rejects a forged GLB payload', async () => {
    const controller = new UploadsController()
    await expect(controller.uploadDesignStageAsset('model', {
      buffer: Buffer.from('not-a-glb'),
      mimetype: 'model/gltf-binary',
      originalname: 'ring.glb',
      size: 9,
    })).rejects.toThrow('ساختار فایل GLB معتبر نیست')
  })
})
