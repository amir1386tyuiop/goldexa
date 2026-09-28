import { ForbiddenException } from '@nestjs/common'
import { CartController } from '../cart/cart.controller'
import { CommunityExtensionsController } from '../community-extensions/community-extensions.controller'
import { LiquidityController } from '../liquidity/liquidity.controller'
import { NotificationsController } from '../notifications/notifications.controller'
import { PayoutController } from '../wallet/payout.controller'
import { SmartVaultController } from '../smart-vault/smart-vault.controller'
import { WalletController } from '../wallet/wallet.controller'

const userRequest = (sub = 'user-1') => ({ user: { sub, role: 'user', roleNames: [] } }) as never

describe('ownership enforcement on user-scoped controllers', () => {
  it('rejects another user from reading a cart', async () => {
    const service = { findByUser: jest.fn() }
    const controller = new CartController(service as never)

    await expect(controller.findByUser('user-2', userRequest())).rejects.toBeInstanceOf(ForbiddenException)
    expect(service.findByUser).not.toHaveBeenCalled()
  })

  it('rejects another user from reading wallet data', async () => {
    const service = { findByUser: jest.fn() }
    const controller = new WalletController(service as never)

    await expect(controller.findByUser('user-2', userRequest())).rejects.toBeInstanceOf(ForbiddenException)
    expect(service.findByUser).not.toHaveBeenCalled()
  })

  it('does not trust a different userId in a wallet creation body', async () => {
    const service = { create: jest.fn() }
    const controller = new WalletController(service as never)

    await expect(controller.create({ userId: 'user-2' } as never, userRequest())).rejects.toBeInstanceOf(ForbiddenException)
    expect(service.create).not.toHaveBeenCalled()
  })

  it('rejects another user from reading saved designs', async () => {
    const service = { findSaves: jest.fn() }
    const controller = new CommunityExtensionsController(service as never)

    await expect(controller.findSaves('user-2', userRequest())).rejects.toBeInstanceOf(ForbiddenException)
    expect(service.findSaves).not.toHaveBeenCalled()
  })

  it('rejects another user from reading smart-vault assets and alerts', async () => {
    const service = { findAssets: jest.fn(), findAlerts: jest.fn() }
    const controller = new SmartVaultController(service as never)

    await expect(controller.findAssets('user-2', userRequest())).rejects.toBeInstanceOf(ForbiddenException)
    await expect(controller.findAlerts('user-2', userRequest())).rejects.toBeInstanceOf(ForbiddenException)
    expect(service.findAssets).not.toHaveBeenCalled()
    expect(service.findAlerts).not.toHaveBeenCalled()
  })

  it('rejects another user from reading payout and liquidity records', async () => {
    const payout = new PayoutController({ findByUser: jest.fn() } as never)
    const liquidity = new LiquidityController({ findRequests: jest.fn(), findRecommendations: jest.fn() } as never)

    await expect(payout.findByUser('user-2', userRequest())).rejects.toBeInstanceOf(ForbiddenException)
    await expect(liquidity.findRequests('user-2', userRequest())).rejects.toBeInstanceOf(ForbiddenException)
    await expect(liquidity.findRecommendations('user-2', userRequest())).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('scopes notifications to the JWT subject instead of the path', async () => {
    const service = { findByUser: jest.fn().mockResolvedValue([]) }
    const controller = new NotificationsController(service as never)

    await expect(controller.findByUser({ user: { sub: 'user-1', role: 'user', roleNames: [] } } as never)).resolves.toEqual([])
    expect(service.findByUser).toHaveBeenCalledWith('user-1')
  })

  it('allows an admin to read a different user scope', async () => {
    const service = { findByUser: jest.fn().mockResolvedValue([]) }
    const controller = new WalletController(service as never)

    await expect(controller.findByUser('user-2', { user: { sub: 'admin-1', role: 'admin', roleNames: [] } } as never))
      .resolves.toEqual([])
    expect(service.findByUser).toHaveBeenCalledWith('user-2')
  })
})
