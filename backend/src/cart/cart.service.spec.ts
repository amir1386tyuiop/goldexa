import { BadRequestException } from '@nestjs/common'
import { CartService } from './cart.service'
import { Cart } from './cart.entity'
import { CartItem } from './cart-item.entity'
import { Product } from '../products/product.entity'

describe('CartService reservations', () => {
  const user = { sub: 'user-1', role: 'user', roleNames: [] } as any

  function setup() {
    const manager: any = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((_entity, value) => value),
      save: jest.fn(async (_entity, value) => value),
      delete: jest.fn(),
    }
    const queryRunner: any = {
      manager,
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    }
    const cartRepository: any = {
      manager: { connection: { createQueryRunner: jest.fn(() => queryRunner) } },
      findOneBy: jest.fn(),
    }
    const itemRepository: any = { findOne: jest.fn() }
    const productRepository: any = {}
    return { service: new CartService(cartRepository, itemRepository, productRepository), manager, queryRunner, cartRepository, itemRepository }
  }

  it('locks cart then product and persists authoritative product fields', async () => {
    const { service, manager, cartRepository } = setup()
    const product = { id: 'product-1', name: 'DB gold ring', stock: 5, finalPrice: 125000 } as Product
    cartRepository.findOneBy.mockResolvedValue({ id: 'cart-1', userId: 'user-1' })
    manager.findOne
      .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1' } as Cart)
      .mockResolvedValueOnce(product)

    const result = await service.addItem(
      { cartId: 'cart-1', productId: 'product-1', quantity: 2, name: 'forged', unitPrice: 1 } as any,
      user,
    )

    expect(manager.findOne.mock.calls[0][0]).toBe(Cart)
    expect(manager.findOne.mock.calls[0][1].lock).toEqual({ mode: 'pessimistic_write' })
    expect(manager.findOne.mock.calls[1][0]).toBe(Product)
    expect(result).toMatchObject({ name: 'DB gold ring', unitPrice: 125000, totalPrice: 250000, quantity: 2 })
  })

  it('rolls back a reservation when active reservations exhaust stock', async () => {
    const { service, manager, queryRunner, cartRepository } = setup()
    cartRepository.findOneBy.mockResolvedValue({ id: 'cart-1', userId: 'user-1' })
    manager.findOne
      .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1' } as Cart)
      .mockResolvedValueOnce({ id: 'product-1', name: 'Ring', stock: 2, finalPrice: 10 } as Product)
    manager.find.mockResolvedValue([{ quantity: 2 }])

    await expect(service.addItem({ cartId: 'cart-1', productId: 'product-1', quantity: 1 } as any, user)).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1)
    expect(manager.save).not.toHaveBeenCalled()
  })

  it('rejects non-integer quantities before opening a transaction', async () => {
    const { service, cartRepository } = setup()
    cartRepository.findOneBy.mockResolvedValue({ id: 'cart-1', userId: 'user-1' })

    await expect(service.addItem({ cartId: 'cart-1', productId: 'product-1', quantity: 1.5 } as any, user)).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })
})
