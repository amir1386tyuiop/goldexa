import { BadRequestException } from '@nestjs/common'
import { OrdersService } from './orders.service'
import { OrderStatus } from './order.entity'

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
})
