import { ArService } from './ar.service'

describe('ArService', () => {
  it('only exposes shared previews publicly', async () => {
    const models = {}
    const previews = { findBy: jest.fn().mockResolvedValue([]) }
    const service = new ArService(models as never, previews as never)
    await service.findPreviews('m1')
    expect(previews.findBy).toHaveBeenCalledWith({ modelId: 'm1', isShared: true })
  })
})
