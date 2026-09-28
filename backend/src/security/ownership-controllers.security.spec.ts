import { ForbiddenException } from '@nestjs/common'
import { CartController } from '../cart/cart.controller'
import { CommunityExtensionsController } from '../community-extensions/community-extensions.controller'
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

  it('allows an admin to read a different user scope', async () => {
    const service = { findByUser: jest.fn().mockResolvedValue([]) }
    const controller = new WalletController(service as never)

    await expect(controller.findByUser('user-2', { user: { sub: 'admin-1', role: 'admin', roleNames: [] } } as never))
      .resolves.toEqual([])
    expect(service.findByUser).toHaveBeenCalledWith('user-2')
  })
})
