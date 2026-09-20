import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { PaymentsService } from './payments.service'
import { PaymentTransaction, PaymentTransactionStatus } from './payment-transaction.entity'
import { Order, OrderStatus } from '../orders/order.entity'
import { OrderTrackingEvent } from './order-tracking-event.entity'
import { ZarinpalService } from './zarinpal.service'
import { AuditLogger } from '../common/audit-logger.service'
import { PricingService } from '../pricing/pricing.service'

describe('PaymentsService financial flow', () => {
  const order = {
    id: 'order-1',
    userId: 'user-1',
    totalAmount: 12_340,
    status: OrderStatus.PENDING,
  }
  const transaction = {
    id: 'tx-1',
    orderId: order.id,
    userId: order.userId,
    amount: order.totalAmount,
    paymentMethod: 'zarinpal',
    status: PaymentTransactionStatus.INITIATED,
    authority: null,
    referenceId: null,
    trackingCode: null,
    idempotencyKey: 'idem-1',
    paidAt: null,
  } as PaymentTransaction

  let service: PaymentsService
  let transactionRepository: {
    findOneBy: jest.Mock
    create: jest.Mock
    save: jest.Mock
  }
  let orderRepository: { findOneBy: jest.Mock }
  let zarinpal: { requestPayment: jest.Mock; verifyPayment: jest.Mock; refundPayment: jest.Mock }
  let dataSource: { transaction: jest.Mock }
  let audit: { record: jest.Mock }
  let pricingService: { requireValidQuote: jest.Mock }
  type TestManager = { findOne: jest.Mock; save: jest.Mock }

  beforeEach(async () => {
    transactionRepository = {
      findOneBy: jest.fn(async () => null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        if (!value.id) value.id = 'tx-1'
        return value
      }),
    }
    orderRepository = { findOneBy: jest.fn(async () => ({ ...order })) }
    zarinpal = {
      requestPayment: jest.fn(async () => ({
        authority: 'AUTH-1',
        paymentUrl: 'https://gateway/AUTH-1',
        mock: true,
      })),
      verifyPayment: jest.fn(async () => ({
        success: true,
        refId: 'REF-1',
        code: 100,
        message: 'ok',
        mock: true,
      })),
      refundPayment: jest.fn(),
    }
    audit = { record: jest.fn(async () => undefined) }
    pricingService = {
      requireValidQuote: jest.fn(async () => ({ quoteId: 'Q-1', valid: true, total: 12_340 })),
    }
    dataSource = {
      transaction: jest.fn(async (callback: (manager: TestManager) => unknown) =>
        callback({
          findOne: jest.fn(async () => transaction),
          save: jest.fn(async (value) => value),
        }),
      ),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(PaymentTransaction), useValue: transactionRepository },
        { provide: getRepositoryToken(OrderTrackingEvent), useValue: {} },
        { provide: getRepositoryToken(Order), useValue: orderRepository },
        { provide: ZarinpalService, useValue: zarinpal },
        { provide: DataSource, useValue: dataSource },
        { provide: ConfigService, useValue: { get: jest.fn(() => 'true') } },
        { provide: AuditLogger, useValue: audit },
        { provide: PricingService, useValue: pricingService },
      ],
    }).compile()

    service = moduleRef.get(PaymentsService)
  })

  it('uses the order total as the authoritative payment amount', async () => {
    const result = (await service.requestPayment(
      { userId: 'user-1', orderId: 'order-1', amount: 12_340, idempotencyKey: 'idem-1' },
      'user-1',
    )) as { transaction: PaymentTransaction }

    expect(zarinpal.requestPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 12_340 }),
    )
    expect(result.transaction.amount).toBe(12_340)
    expect(result.transaction.status).toBe(PaymentTransactionStatus.PENDING)
  })

  it('rejects a client amount that does not match the order', async () => {
    await expect(
      service.requestPayment(
        { userId: 'user-1', orderId: 'order-1', amount: 1, idempotencyKey: 'idem-2' },
        'user-1',
      ),
    ).rejects.toThrow('مبلغ پرداخت با مبلغ سفارش مطابقت ندارد')
    expect(zarinpal.requestPayment).not.toHaveBeenCalled()
  })

  it('calls the gateway once for concurrent requests with the same idempotency key', async () => {
    zarinpal.requestPayment.mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
      return { authority: 'AUTH-1', paymentUrl: 'https://gateway/AUTH-1', mock: true }
    })

    const input = { userId: 'user-1', orderId: 'order-1', amount: 12_340, idempotencyKey: 'idem-3' }
    const [first, second] = (await Promise.all([
      service.requestPayment(input, 'user-1'),
      service.requestPayment(input, 'user-1'),
    ])) as Array<{ transaction: PaymentTransaction }>

    expect(zarinpal.requestPayment).toHaveBeenCalledTimes(1)
    expect(transactionRepository.save).toHaveBeenCalledTimes(2)
    expect(first.transaction.id).toBe(second.transaction.id)
  })

  it('verifies a payment once and locks the payment/order transition', async () => {
    transaction.authority = 'AUTH-1'
    transaction.status = PaymentTransactionStatus.PENDING
    transactionRepository.findOneBy.mockResolvedValue(transaction)
    const [first, second] = (await Promise.all([
      service.verifyPayment({ authority: 'AUTH-1', status: 'OK' }),
      service.verifyPayment({ authority: 'AUTH-1', status: 'OK' }),
    ])) as Array<{ status: string }>

    expect(zarinpal.verifyPayment).toHaveBeenCalledTimes(1)
    expect(dataSource.transaction).toHaveBeenCalledTimes(1)
    expect(audit.record).toHaveBeenCalledTimes(1)
    expect(first.status).toBe('paid')
    expect(second.status).toBe('paid')
    expect(transaction.status).toBe(PaymentTransactionStatus.PAID)
  })

  it('validates the server quote before contacting ZarinPal', async () => {
    const result = (await service.requestPayment(
      { userId: 'user-1', orderId: 'order-1', quoteId: 'Q-1', amount: 12_340 },
      'user-1',
    )) as { transaction: PaymentTransaction }

    expect(pricingService.requireValidQuote).toHaveBeenCalledWith('Q-1')
    expect(zarinpal.requestPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: 12_340 }))
    expect(result.transaction.amount).toBe(12_340)
  })

  it('rejects a quote amount mismatch before contacting ZarinPal', async () => {
    pricingService.requireValidQuote.mockResolvedValueOnce({ quoteId: 'Q-bad', valid: true, total: 99 })

    await expect(
      service.requestPayment(
        { userId: 'user-1', orderId: 'order-1', quoteId: 'Q-bad', amount: 12_340 },
        'user-1',
      ),
    ).rejects.toThrow('مبلغ پرداخت با قیمت رزرو شده مطابقت ندارد')
    expect(zarinpal.requestPayment).not.toHaveBeenCalled()
  })

  it('does not reuse an idempotency key for a different order or amount', async () => {
    transactionRepository.findOneBy.mockResolvedValueOnce({ ...transaction, orderId: 'other-order' })

    await expect(
      service.requestPayment(
        { userId: 'user-1', orderId: 'order-1', amount: 12_340, idempotencyKey: 'idem-1' },
        'user-1',
      ),
    ).rejects.toThrow('کلید idempotency قبلاً برای درخواست دیگری استفاده شده است')
    expect(zarinpal.requestPayment).not.toHaveBeenCalled()
  })

  it('requires provider acknowledgement before marking an online payment refunded', async () => {
    transaction.status = PaymentTransactionStatus.PAID
    zarinpal.refundPayment.mockRejectedValueOnce(new Error('provider unavailable'))

    await expect(service.refundTransaction('tx-1')).rejects.toThrow('provider unavailable')
    expect(zarinpal.refundPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: 12_340 }))
    expect(transaction.status).toBe(PaymentTransactionStatus.PAID)
  })

  it('marks a paid transaction refunded only after provider success', async () => {
    transaction.status = PaymentTransactionStatus.PAID
    zarinpal.refundPayment.mockResolvedValueOnce({ success: true, refundId: 'REFUND-1', code: 100, message: 'ok', mock: false })

    const result = await service.refundTransaction('tx-1')

    expect(result.status).toBe(PaymentTransactionStatus.REFUNDED)
    expect(result.trackingCode).toBe('REFUND-1')
    expect(zarinpal.refundPayment).toHaveBeenCalledTimes(1)
  })
})
