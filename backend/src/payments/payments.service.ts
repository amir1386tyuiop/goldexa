import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { QueryFailedError } from 'typeorm'
import { Order, OrderStatus } from '../orders/order.entity'
import { OrderTrackingEvent } from './order-tracking-event.entity'
import { PaymentTransaction, PaymentTransactionStatus } from './payment-transaction.entity'
import { ZarinpalService } from './zarinpal.service'
import { AuditLogger } from '../common/audit-logger.service'
import {
  CreateOrderTrackingEventDto,
  CreatePaymentTransactionDto,
  RequestPaymentDto,
  UpdatePaymentTransactionDto,
  VerifyPaymentDto,
} from './create-payment.dto'
import { PricingService } from '../pricing/pricing.service'

@Injectable()
export class PaymentsService {
  private readonly requestInFlight = new Map<string, Promise<unknown>>()
  private readonly verificationInFlight = new Map<string, Promise<unknown>>()

  constructor(
    @InjectRepository(PaymentTransaction)
    private transactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(OrderTrackingEvent)
    private trackingRepository: Repository<OrderTrackingEvent>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private readonly zarinpal: ZarinpalService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly audit: AuditLogger,
    private readonly pricingService: PricingService,
  ) {}

  /**
   * Start a ZarinPal payment for an order. Idempotent: repeating the call with
   * the same idempotencyKey returns the existing transaction instead of
   * creating a second charge.
   */
  async requestPayment(data: RequestPaymentDto, authenticatedUserId?: string) {
    if (authenticatedUserId && data.userId !== authenticatedUserId) {
      throw new ForbiddenException('کاربر پرداخت با کاربر واردشده مطابقت ندارد')
    }

    if (!data.idempotencyKey) {
      return this.requestPaymentInternal(data, authenticatedUserId)
    }

    const inFlight = this.requestInFlight.get(data.idempotencyKey)
    if (inFlight) {
      return inFlight
    }

    const operation = this.requestPaymentInternal(data, authenticatedUserId)
    this.requestInFlight.set(data.idempotencyKey, operation)
    try {
      return await operation
    } finally {
      if (this.requestInFlight.get(data.idempotencyKey) === operation) {
        this.requestInFlight.delete(data.idempotencyKey)
      }
    }
  }

  private async requestPaymentInternal(data: RequestPaymentDto, authenticatedUserId?: string) {
    const amount = Number(data.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('مبلغ پرداخت نامعتبر است')
    }

    const userId = authenticatedUserId ?? data.userId
    let authoritativeAmount = amount
    if (data.orderId) {
      const order = await this.orderRepository.findOneBy({ id: data.orderId })
      if (!order) {
        throw new NotFoundException('سفارش یافت نشد')
      }
      if (order.userId !== userId) {
        throw new ForbiddenException('این سفارش متعلق به کاربر واردشده نیست')
      }
      authoritativeAmount = Number(order.totalAmount)
      if (!Number.isFinite(authoritativeAmount) || authoritativeAmount <= 0) {
        throw new BadRequestException('مبلغ سفارش نامعتبر است')
      }
      if (amount !== authoritativeAmount) {
        throw new BadRequestException('مبلغ پرداخت با مبلغ سفارش مطابقت ندارد')
      }
    }

    if (data.quoteId) {
      let quote
      try {
        quote = await this.pricingService.requireValidQuote(data.quoteId)
      } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : 'قیمت رزرو شده نامعتبر است')
      }
      const quotedAmount = Number(quote.total)
      if (!Number.isFinite(quotedAmount) || quotedAmount <= 0) {
        throw new BadRequestException('مبلغ قیمت رزرو شده نامعتبر است')
      }
      if (quotedAmount !== authoritativeAmount) {
        throw new BadRequestException('مبلغ پرداخت با قیمت رزرو شده مطابقت ندارد')
      }
    }

    if (data.idempotencyKey) {
      const existing = await this.transactionRepository.findOneBy({
        idempotencyKey: data.idempotencyKey,
        userId,
      })
      if (existing) {
        if (existing.orderId !== (data.orderId ?? null) || Number(existing.amount) !== authoritativeAmount) {
          throw new BadRequestException('کلید idempotency قبلاً برای درخواست دیگری استفاده شده است')
        }
        return this.paymentResponse(existing, true)
      }
    }

    // Reserve the idempotency key before calling the gateway. The partial
    // unique index on payment_transactions makes this safe across instances.
    let transaction: PaymentTransaction
    try {
      transaction = await this.transactionRepository.save(
        this.transactionRepository.create({
          orderId: data.orderId ?? null,
          userId,
          amount: authoritativeAmount,
          paymentMethod: 'zarinpal',
          status: PaymentTransactionStatus.INITIATED,
          authority: null,
          idempotencyKey: data.idempotencyKey ?? null,
          referenceId: null,
          trackingCode: null,
          paidAt: null,
        }),
      )
    } catch (error) {
      if (!this.isUniqueViolation(error) || !data.idempotencyKey) {
        throw error
      }
      const existing = await this.transactionRepository.findOneBy({
        idempotencyKey: data.idempotencyKey,
        userId,
      })
      if (!existing) {
        throw error
      }
      if (existing.orderId !== (data.orderId ?? null) || Number(existing.amount) !== authoritativeAmount) {
        throw new BadRequestException('کلید idempotency قبلاً برای درخواست دیگری استفاده شده است')
      }
      return this.paymentResponse(existing, true)
    }

    const callbackUrl =
      data.callbackUrl || `${this.config.get('APP_BASE_URL') || 'http://localhost:3001'}/payments/zarinpal/callback`

    const gateway = await this.zarinpal.requestPayment({
      amount: authoritativeAmount,
      description: data.description || `پرداخت سفارش ${data.orderId ?? ''}`.trim(),
      callbackUrl,
      mobile: data.mobile,
    })

    transaction.authority = gateway.authority
    transaction.status = PaymentTransactionStatus.PENDING
    transaction = await this.transactionRepository.save(transaction)

    return { transaction, authority: gateway.authority, paymentUrl: gateway.paymentUrl, mock: gateway.mock, reused: false }
  }

  private paymentResponse(transaction: PaymentTransaction, reused: boolean) {
    const sandbox = String(this.config.get('ZARINPAL_SANDBOX') ?? 'true').toLowerCase() !== 'false'
    const startBase = sandbox ? 'https://sandbox.zarinpal.com' : 'https://www.zarinpal.com'
    return {
      transaction,
      authority: transaction.authority,
      paymentUrl: transaction.authority ? `${startBase}/pg/StartPay/${transaction.authority}` : null,
      pending: transaction.status === PaymentTransactionStatus.INITIATED && !transaction.authority,
      reused,
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof QueryFailedError && (error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code === '23505'
  }

  /**
   * Verify a returned payment. Idempotent: a transaction already marked PAID is
   * returned as-is without re-crediting or re-marking the order.
   */
  async verifyPayment(data: VerifyPaymentDto, authenticatedUserId?: string) {
    const verificationKey = `${data.authority}:${authenticatedUserId ?? 'callback'}`
    const inFlight = this.verificationInFlight.get(verificationKey)
    if (inFlight) {
      return inFlight
    }

    const operation = this.verifyPaymentInternal(data, authenticatedUserId)
    this.verificationInFlight.set(verificationKey, operation)
    try {
      return await operation
    } finally {
      if (this.verificationInFlight.get(verificationKey) === operation) {
        this.verificationInFlight.delete(verificationKey)
      }
    }
  }

  private async verifyPaymentInternal(data: VerifyPaymentDto, authenticatedUserId?: string) {
    const transaction = await this.transactionRepository.findOneBy({ authority: data.authority })
    if (!transaction) {
      throw new NotFoundException('تراکنش پرداخت یافت نشد')
    }
    if (authenticatedUserId && transaction.userId !== authenticatedUserId) {
      throw new ForbiddenException('به این تراکنش دسترسی ندارید')
    }

    if (transaction.status === PaymentTransactionStatus.PAID) {
      return { status: 'paid', alreadyVerified: true, transaction }
    }

    if (data.status && data.status.toUpperCase() !== 'OK') {
      return this.markFailed(data.authority)
    }

    const result = await this.zarinpal.verifyPayment({ authority: data.authority, amount: Number(transaction.amount) })

    if (!result.success) {
      const failed = await this.markFailed(data.authority)
      return { ...failed, code: result.code }
    }

    let paidTransaction: PaymentTransaction
    let alreadyVerified = false
    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(PaymentTransaction, {
        where: { authority: data.authority },
        lock: { mode: 'pessimistic_write' },
      })
      if (!locked) {
        throw new NotFoundException('تراکنش پرداخت یافت نشد')
      }
      if (locked.status === PaymentTransactionStatus.PAID) {
        paidTransaction = locked
        alreadyVerified = true
        return
      }

      locked.status = PaymentTransactionStatus.PAID
      locked.referenceId = result.refId
      locked.trackingCode = locked.trackingCode ?? result.refId
      locked.paidAt = locked.paidAt ?? new Date()
      paidTransaction = await manager.save(locked)

      if (locked.orderId) {
        const order = await manager.findOne(Order, {
          where: { id: locked.orderId },
          lock: { mode: 'pessimistic_write' },
        })
        if (order && order.status !== OrderStatus.PAID) {
          order.status = OrderStatus.PAID
          await manager.save(order)
        }
      }
    })

    if (alreadyVerified) {
      return { status: 'paid', alreadyVerified: true, transaction: paidTransaction }
    }

    await this.audit.record({
      userId: paidTransaction.userId,
      action: 'PAYMENT_VERIFIED',
      entityType: 'payment_transaction',
      entityId: paidTransaction.id,
      metadata: { amount: Number(paidTransaction.amount), orderId: paidTransaction.orderId, refId: result.refId },
    })

    return { status: 'paid', refId: result.refId, mock: result.mock, transaction: paidTransaction }
  }

  private async markFailed(authority: string) {
    return this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(PaymentTransaction, {
        where: { authority },
        lock: { mode: 'pessimistic_write' },
      })
      if (!locked) {
        throw new NotFoundException('تراکنش پرداخت یافت نشد')
      }
      if (locked.status === PaymentTransactionStatus.PAID) {
        return { status: 'paid' as const, alreadyVerified: true, transaction: locked }
      }
      if (locked.status === PaymentTransactionStatus.FAILED) {
        return { status: 'failed' as const, transaction: locked }
      }
      locked.status = PaymentTransactionStatus.FAILED
      const saved = await manager.save(locked)
      return { status: 'failed' as const, transaction: saved }
    })
  }

  async findTransactions(userId?: string, isAdmin = false): Promise<PaymentTransaction[]> {
    return this.transactionRepository.find({
      where: isAdmin || !userId ? {} : { userId },
      order: { createdAt: 'DESC' },
    })
  }

  async findTransaction(id: string, userId?: string, isAdmin = false): Promise<PaymentTransaction | null> {
    const transaction = await this.transactionRepository.findOneBy({ id })
    if (transaction && userId && !isAdmin && transaction.userId !== userId) {
      throw new ForbiddenException('به این تراکنش دسترسی ندارید')
    }
    return transaction
  }

  async createTransaction(data: CreatePaymentTransactionDto): Promise<PaymentTransaction> {
    return this.transactionRepository.save(
      this.transactionRepository.create({
        ...data,
        orderId: data.orderId ?? null,
        auctionId: data.auctionId ?? null,
        escrowId: data.escrowId ?? null,
        authority: data.authority ?? null,
        referenceId: data.referenceId ?? null,
        trackingCode: data.trackingCode ?? null,
        status: PaymentTransactionStatus.PENDING,
        paidAt: null,
      }),
    )
  }

  async updateTransactionStatus(
    id: string,
    data: UpdatePaymentTransactionDto,
  ): Promise<PaymentTransaction | null> {
    const transaction = await this.transactionRepository.findOneBy({ id })

    if (!transaction) {
      throw new NotFoundException('تراکنش پرداخت یافت نشد')
    }

    transaction.status = data.status as PaymentTransactionStatus
    transaction.referenceId = data.referenceId ?? transaction.referenceId
    transaction.trackingCode = data.trackingCode ?? transaction.trackingCode
    transaction.paidAt = transaction.status === PaymentTransactionStatus.PAID ? new Date() : transaction.paidAt
    return this.transactionRepository.save(transaction)
  }

  /** Execute an idempotent provider-backed refund. Never credits the wallet. */
  async refundTransaction(id: string): Promise<PaymentTransaction> {
    const transaction = await this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(PaymentTransaction, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      })
      if (!locked) throw new NotFoundException('تراکنش پرداخت یافت نشد')
      if (locked.status === PaymentTransactionStatus.REFUNDED) return locked
      if (locked.status !== PaymentTransactionStatus.PAID) {
        throw new BadRequestException('فقط پرداخت موفق قابل بازپرداخت است')
      }
      locked.status = PaymentTransactionStatus.REFUND_PENDING
      return manager.save(locked)
    })

    if (transaction.status === PaymentTransactionStatus.REFUNDED) return transaction

    try {
      const provider = await this.zarinpal.refundPayment({
        authority: transaction.authority ?? '',
        amount: Number(transaction.amount),
        referenceId: transaction.referenceId,
      })
      if (!provider.success) throw new BadRequestException(provider.message)

      return this.dataSource.transaction(async (manager) => {
        const locked = await manager.findOne(PaymentTransaction, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        })
        if (!locked) throw new NotFoundException('تراکنش پرداخت یافت نشد')
        if (locked.status === PaymentTransactionStatus.REFUNDED) return locked
        if (locked.status !== PaymentTransactionStatus.REFUND_PENDING) {
          throw new BadRequestException('وضعیت بازپرداخت تراکنش تغییر کرده است')
        }
        locked.status = PaymentTransactionStatus.REFUNDED
        locked.trackingCode = provider.refundId ?? locked.trackingCode
        return manager.save(locked)
      })
    } catch (error) {
      await this.dataSource.transaction(async (manager) => {
        const locked = await manager.findOne(PaymentTransaction, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        })
        if (locked?.status === PaymentTransactionStatus.REFUND_PENDING) {
          locked.status = PaymentTransactionStatus.PAID
          await manager.save(locked)
        }
      })
      throw error
    }
  }

  async findOrderTracking(orderId: string, userId?: string, isAdmin = false): Promise<OrderTrackingEvent[]> {
    if (!isAdmin && userId) {
      const order = await this.orderRepository.findOneBy({ id: orderId, userId })
      if (!order) throw new ForbiddenException('به رهگیری این سفارش دسترسی ندارید')
    }
    return this.trackingRepository.findBy({ orderId })
  }

  async createTrackingEvent(
    orderId: string,
    data: CreateOrderTrackingEventDto,
    userId?: string,
    isAdmin = false,
  ): Promise<OrderTrackingEvent> {
    if (!isAdmin && userId) {
      const order = await this.orderRepository.findOneBy({ id: orderId, userId })
      if (!order) throw new ForbiddenException('به این سفارش دسترسی ندارید')
    }
    return this.trackingRepository.save(
      this.trackingRepository.create({
        ...data,
        orderId,
        location: data.location ?? null,
        description: data.description ?? null,
      }),
    )
  }
}
