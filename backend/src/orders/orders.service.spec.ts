/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException } from '@nestjs/common'
import { OrdersService } from './orders.service'
import { OrderStatus, PaymentMethod } from './order.entity'

describe('OrdersService wallet checkout', () => {
  const product = { id: 'product-1', name: 'Ring', stock: 2, finalPrice: 100 }
  let queryRunner: any
  let service: OrdersService
  let walletService: any
  let pricingService: any
  let dataSource: any

  beforeEach(() => {
    const orderDraft: any = { id: 'order-1' }
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(async (entity, options) => (options.where.id === 'product-1' ? { ...product } : null)),
        create: jest.fn((_, value) => ({ id: orderDraft.id, ...value })),
        save: jest.fn(async (value) => value),
      },
    }
    walletService = { payOrderWithWallet: jest.fn(async () => ({ id: 'wallet-tx-1' })) }
    pricingService = { requireValidQuote: jest.fn(async () => ({ quoteId: 'Q-1', valid: true, total: 110 })), calculateProductPrice: jest.fn(async () => 100) }
    dataSource = { transaction: jest.fn() }
    const orderRepository: any = {
      manager: { connection: { createQueryRunner: jest.fn(() => queryRunner) } },
    }
    const userRepository: any = { findOneBy: jest.fn(async () => ({ id: 'user-1' })) }
    service = new OrdersService(
      orderRepository,
      {} as any,
      userRepository,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      walletService,
      pricingService,
      dataSource,
    )
  })

  const orderInput = {
    items: [{ productId: 'product-1', quantity: 1 }],
    shippingCost: 10,
    address: { title: 'Home', province: 'Tehran', city: 'Tehran', street: 'Main', postalCode: '1', isDefault: true },
    paymentMethod: PaymentMethod.WALLET,
  } as any

  it('locks inventory, charges wallet, and marks the order paid in one transaction', async () => {
    const result = await service.createOrder(orderInput, 'user-1')

    expect(queryRunner.manager.findOne).toHaveBeenCalledWith(expect.anything(), {
      where: { id: 'product-1' },
      lock: { mode: 'pessimistic_write' },
    })
    expect(walletService.payOrderWithWallet).toHaveBeenCalledWith('user-1', 'order-1', 110, queryRunner.manager)
    expect(queryRunner.manager.save).toHaveBeenLastCalledWith(expect.objectContaining({ status: OrderStatus.PAID }))
    expect(queryRunner.commitTransaction).toHaveBeenCalled()
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled()
    expect(result.status).toBe(OrderStatus.PAID)
  })

  it('rolls back inventory and order creation when wallet payment fails', async () => {
    walletService.payOrderWithWallet.mockRejectedValueOnce(new BadRequestException('موجودی کافی نیست'))

    await expect(service.createOrder(orderInput, 'user-1')).rejects.toBeInstanceOf(BadRequestException)

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled()
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled()
    expect(queryRunner.release).toHaveBeenCalled()
  })

  it('does not call wallet payment for online checkout', async () => {
    await service.createOrder({ ...orderInput, paymentMethod: PaymentMethod.ONLINE }, 'user-1')

    expect(walletService.payOrderWithWallet).not.toHaveBeenCalled()
    expect(queryRunner.commitTransaction).toHaveBeenCalled()
  })

  it('accepts an unexpired server quote only when it matches the authoritative order total', async () => {
    await service.createOrder({ ...orderInput, quoteId: 'Q-1' }, 'user-1')

    expect(pricingService.requireValidQuote).toHaveBeenCalledWith('Q-1')
    expect(queryRunner.manager.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ totalAmount: 110 }),
    )
  })

  it('rejects a quote whose locked total differs from the server-computed order total', async () => {
    pricingService.requireValidQuote.mockResolvedValueOnce({ quoteId: 'Q-2', valid: true, total: 999 })

    await expect(service.createOrder({ ...orderInput, quoteId: 'Q-2' }, 'user-1')).rejects.toThrow(
      'مبلغ سفارش با قیمت رزرو شده مطابقت ندارد',
    )
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled()
  })
})
