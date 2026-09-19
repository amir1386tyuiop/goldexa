import { SmartVaultService } from './smart-vault.service'

describe('SmartVaultService', () => {
  const assets = { findBy: jest.fn(), findOneBy: jest.fn(), create: jest.fn((value) => value), save: jest.fn((value) => Promise.resolve(value)) }
  const snapshots = { findBy: jest.fn(), create: jest.fn((value) => value), save: jest.fn((value) => Promise.resolve(value)) }
  const alerts = { findBy: jest.fn(), findOneBy: jest.fn(), create: jest.fn((value) => value), save: jest.fn((value) => Promise.resolve(value)) }

  beforeEach(() => jest.clearAllMocks())

  it('aggregates the authenticated user portfolio', async () => {
    assets.findBy.mockResolvedValue([{ purchasePrice: 100, currentValue: 130, weight: 2, profitLoss: 30 }, { purchasePrice: 50, currentValue: 45, weight: 1, profitLoss: -5 }])
    const service = new SmartVaultService(assets as never, snapshots as never, alerts as never)
    await expect(service.getSummary('u1')).resolves.toMatchObject({ assetCount: 2, purchaseValue: 150, currentValue: 175, goldWeight: 3, profitLoss: 25, profitLossPercent: expect.closeTo(16.666, 2) })
  })

  it('rejects snapshots for another user asset', async () => {
    assets.findOneBy.mockResolvedValue({ id: 'a1', userId: 'owner' })
    const service = new SmartVaultService(assets as never, snapshots as never, alerts as never)
    await expect(service.createSnapshot({ assetId: 'a1', userId: 'attacker', rawGoldValue: 1, totalValue: 1, profitLoss: 0, goldPrice: 1 })).rejects.toThrow()
  })

  it('rejects creating an unverified vault asset without a delivered order', async () => {
    const service = new SmartVaultService(assets as never, snapshots as never, alerts as never)
    await expect(service.createAsset({
      userId: 'u1', name: 'جعلی', weight: 2, karat: 18, purchasePrice: 100,
      purchaseDate: new Date(), orderId: null,
    })).rejects.toThrow('سفارش تحویل‌شده')
  })
})
