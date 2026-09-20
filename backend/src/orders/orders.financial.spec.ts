import { BadRequestException } from '@nestjs/common'
import { OrdersService } from './orders.service'
import { OrderStatus, PaymentMethod } from './order.entity'
import { Refund } from './refund.entity'

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('OrdersService invoice and refund guards', () => {
  it('requires an invoice total to equal the order total', async () => {
    const service = Object.create(OrdersService.prototype) as any
    service.findOwnedOrder = jest.fn().mockResolvedValue({ id: 'order-1', totalAmount: 1250 })
    service.invoiceRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    }

    await expect(service.createInvoice('order-1', 1200, null, 'user-1')).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.createInvoice('order-1', 1250, null, 'user-1')).resolves.toEqual(
      expect.objectContaining({ orderId: 'order-1', totalAmount: 1250 }),
    )
  })

  it('locks the order before calculating available refund capacity', async () => {
    const service = Object.create(OrdersService.prototype) as any
    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: 'order-1', userId: 'user-1', totalAmount: 1000, status: OrderStatus.PAID }),
      find: jest.fn().mockResolvedValue([{ amount: 700, status: 'pending' }]),
      create: jest.fn((_, value) => value),
      save: jest.fn(async (_, value) => value),
    }
    service.dataSource = { transaction: jest.fn((callback) => callback(manager)) }

    await expect(service.requestRefund('order-1', 400, 'مرجوعی', 'user-1')).rejects.toBeInstanceOf(BadRequestException)
    expect(manager.findOne).toHaveBeenCalledWith(expect.anything(), {
      where: { id: 'order-1', userId: 'user-1' },
      lock: { mode: 'pessimistic_write' },
    })
    expect(manager.save).not.toHaveBeenCalled()
  })

  it('approves a wallet refund exactly once and rejects online approval without a provider', async () => {
    const service = Object.create(OrdersService.prototype) as any
    const refund = { id: 'refund-1', orderId: 'order-1', amount: 250, status: 'pending' }
    const order = { id: 'order-1', userId: 'user-1', paymentMethod: PaymentMethod.WALLET }
    const manager = {
      findOne: jest.fn(async (entity: unknown) => entity === Refund ? refund : order),
      save: jest.fn(async (_entity: unknown, value: unknown) => value),
    }
    service.dataSource = { transaction: jest.fn((callback: (value: unknown) => unknown) => callback(manager)) }
    service.walletService = { refundOrderToWallet: jest.fn() }

    await expect(service.resolveRefund('refund-1', 'approved')).resolves.toMatchObject({ status: 'approved' })
    expect(service.walletService.refundOrderToWallet).toHaveBeenCalledWith('user-1', 'order-1', 250, manager)

    refund.status = 'approved'
    await expect(service.resolveRefund('refund-1', 'approved')).rejects.toThrow('قبلاً تعیین تکلیف')

    refund.status = 'pending'
    order.paymentMethod = PaymentMethod.ONLINE
    await expect(service.resolveRefund('refund-1', 'approved')).rejects.toThrow('provider واقعی')
    expect(refund.status).toBe('pending')
  })

  it('cancels a paid wallet order atomically, refunds it, and restores stock', async () => {
    const service = Object.create(OrdersService.prototype) as any
    const order = {
      id: 'order-1', userId: 'user-1', status: OrderStatus.PAID, paymentMethod: PaymentMethod.WALLET,
      totalAmount: 250, groupBuyingId: null, items: [{ productId: 'product-1', quantity: 2 }],
    }
    const product = { id: 'product-1', stock: 1 }
    const manager = {
      findOne: jest.fn(async (entity: unknown, options: any) => options.where.id === 'order-1' ? order : product),
      save: jest.fn(async (value: unknown) => value),
      create: jest.fn((_entity: unknown, value: unknown) => value),
    }
    service.dataSource = { transaction: jest.fn((callback: (value: unknown) => unknown) => callback(manager)) }
    service.walletService = { refundOrderToWallet: jest.fn() }

    await expect(service.cancelOrder('order-1', 'user-1')).resolves.toMatchObject({ status: OrderStatus.CANCELLED })
    expect(product.stock).toBe(3)
    expect(service.walletService.refundOrderToWallet).toHaveBeenCalledWith('user-1', 'order-1', 250, manager)
    expect(manager.save).toHaveBeenCalledWith(expect.objectContaining({ status: OrderStatus.CANCELLED }))
  })

  it('refuses generic cancellation for a group order to avoid double refunds', async () => {
    const service = Object.create(OrdersService.prototype) as any
    const manager = { findOne: jest.fn().mockResolvedValue({ id: 'order-1', userId: 'leader-1', status: OrderStatus.PAID, groupBuyingId: 'group-1' }) }
    service.dataSource = { transaction: jest.fn((callback: (value: unknown) => unknown) => callback(manager)) }
    await expect(service.cancelOrder('order-1', 'leader-1')).rejects.toThrow('لغو سفارش گروهی')
  })
})
