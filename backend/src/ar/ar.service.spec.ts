import { ArService } from './ar.service'

describe('ArService', () => {
  it('only exposes shared previews publicly', async () => {
    const models = {}
    const previews = { findBy: jest.fn().mockResolvedValue([]) }
    const service = new ArService(models as never, previews as never)
    await service.findPreviews('m1')
    expect(previews.findBy).toHaveBeenCalledWith({ modelId: 'm1', isShared: true })
  })

  it('rejects unsafe asset URL schemes', async () => {
    const models = { create: jest.fn(), save: jest.fn() }
    const previews = { create: jest.fn(), save: jest.fn() }
    const service = new ArService(models as never, previews as never)
    await expect(service.createModel({ name: 'Ring', modelUrl: 'javascript:alert(1)' })).rejects.toThrow()
    await expect(service.createPreview({ modelId: 'm1', videoUrl: 'data:text/html;base64,abc' })).rejects.toThrow()
    expect(models.save).not.toHaveBeenCalled()
    expect(previews.save).not.toHaveBeenCalled()
  })

  it('accepts local and HTTPS model assets', async () => {
    const models = { create: jest.fn((value) => value), save: jest.fn(async (value) => value) }
    const previews = { create: jest.fn((value) => value), save: jest.fn(async (value) => value) }
    const service = new ArService(models as never, previews as never)
    await expect(service.createModel({ name: 'Ring', modelUrl: '/models/ring.glb', thumbnailUrl: 'https://cdn.example/ring.webp' })).resolves.toMatchObject({ model_url: '/models/ring.glb' })
    await expect(service.createPreview({ modelId: 'm1', screenshotUrl: '/uploads/ar.png' })).resolves.toMatchObject({ screenshot_url: '/uploads/ar.png' })
  })
})
