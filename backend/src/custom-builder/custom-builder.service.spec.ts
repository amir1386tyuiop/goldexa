import { CustomBuilderService } from './custom-builder.service'
import { JewelryDesignStatus } from './jewelry-design.entity'

describe('CustomBuilderService', () => {
  const design = { id: 'd1', userId: 'u1', estimatedGoldPrice: 100, weight: 2, laborCost: 20, profit: 10, tax: 9, totalPrice: 140 }
  const designs = { find: jest.fn(), findBy: jest.fn(), findOneBy: jest.fn(), create: jest.fn((value) => value), save: jest.fn((value) => Promise.resolve({ id: 'd1', ...value })) }
  const versions = { findBy: jest.fn(), create: jest.fn((value) => value), save: jest.fn((value) => Promise.resolve(value)) }
  const gemstones = { findBy: jest.fn(), create: jest.fn((value) => value), save: jest.fn((value) => Promise.resolve(value)) }
  const quotes = { find: jest.fn(), findBy: jest.fn(), findOneBy: jest.fn(), create: jest.fn((value) => value), save: jest.fn((value) => Promise.resolve(value)) }

  beforeEach(() => jest.clearAllMocks())

  it('builds a quote from the persisted design and ignores forged totals', async () => {
    designs.findOneBy.mockResolvedValue(design)
    const service = new CustomBuilderService(designs as never, versions as never, gemstones as never, quotes as never)
    const result = await service.createQuote({ designId: 'd1', userId: 'u1', goldPriceSnapshot: 1, goldWeight: 1, laborCost: 1, profit: 1, tax: 1, total: 1 })
    expect(result).toMatchObject({ goldPriceSnapshot: 100, goldWeight: 2, laborCost: 20, profit: 10, tax: 9, total: 140, status: 'draft' })
    expect(result.expiresAt).toBeInstanceOf(Date)
  })

  it('does not allow a buyer to approve a design', async () => {
    designs.findOneBy.mockResolvedValue({ ...design, status: JewelryDesignStatus.DRAFT })
    const service = new CustomBuilderService(designs as never, versions as never, gemstones as never, quotes as never)
    await expect(service.updateDesignStatus('d1', JewelryDesignStatus.APPROVED, 'u1')).rejects.toThrow()
  })

  it('ignores forged design pricing when live gold pricing is available', async () => {
    const service = new CustomBuilderService(
      designs as never,
      versions as never,
      gemstones as never,
      quotes as never,
      { getPriceByType: jest.fn().mockResolvedValue({ value: 1000 }) } as never,
    )
    designs.save.mockImplementation(async (value) => ({ id: 'd1', ...value }))
    const result = await service.createDesign({
      userId: 'u1', title: 'Ring', category: 'ring', weight: 2, karat: 18,
      estimatedGoldPrice: 1, laborCost: 1, profit: 1, tax: 1, totalPrice: 1,
    })
    expect(result).toMatchObject({ estimatedGoldPrice: 2000, laborCost: 240, profit: 179, tax: 1, totalPrice: 2423 })
  })

  it('ignores forged version totals and keeps the server-side design price', async () => {
    designs.findOneBy.mockResolvedValue({ ...design, karat: 18 })
    versions.save.mockImplementation(async (value) => value)
    const service = new CustomBuilderService(designs as never, versions as never, gemstones as never, quotes as never)
    const result = await service.createDesignVersion(
      'd1',
      { version: 2, changes: { title: 'updated' }, totalPrice: 1 },
      'u1',
    )
    expect(result.totalPrice).toBe(140)
    expect(designs.save).toHaveBeenCalledWith(expect.objectContaining({ totalPrice: 140 }))
  })

  it('lets the admin create a build stage linked to an existing design', async () => {
    designs.findOneBy.mockResolvedValue({ ...design, id: 'd1' })
    const stages = { create: jest.fn((value) => value), save: jest.fn(async (value) => value) }
    const service = new CustomBuilderService(designs as never, versions as never, gemstones as never, quotes as never, undefined, stages as never)
    await expect(service.createDesignStage('d1', { title: 'ساخت اولیه', status: 'in_progress', modelUrl: '/models/ring.glb' })).resolves.toMatchObject({ designId: 'd1', status: 'in_progress', modelUrl: '/models/ring.glb' })
  })
})
