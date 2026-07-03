import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
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

@Injectable()
export class PaymentsService {
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
  ) {}

  /**
   * Start a ZarinPal payment for an order. Idempotent: repeating the call with
   * the same idempotencyKey returns the existing transaction instead of
   * creating a second charge.
   */
  async requestPayment(data: RequestPaymentDto) {
    const amount = Number(data.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('مبلغ پرداخت نامعتبر است')
    }

    if (data.idempotencyKey) {
      const existing = await this.transactionRepository.findOneBy({ idempotencyKey: data.idempotencyKey })
      if (existing) {
        const sandbox = String(this.config.get('ZARINPAL_SANDBOX') ?? 'true').toLowerCase() !== 'false'
        const startBase = sandbox ? 'https://sandbox.zarinpal.com' : 'https://www.zarinpal.com'
        return {
          transaction: existing,
          authority: existing.authority,
          paymentUrl: existing.authority ? `${startBase}/pg/StartPay/${existing.authority}` : null,
          reused: true,
        }
      }
    }

    const callbackUrl =
      data.callbackUrl || `${this.config.get('APP_BASE_URL') || 'http://localhost:3001'}/payments/zarinpal/callback`

    const gateway = await this.zarinpal.requestPayment({
      amount,
      description: data.description || `پرداخت سفارش ${data.orderId ?? ''}`.trim(),
      callbackUrl,
      mobile: data.mobile,
    })

    const transaction = await this.transactionRepository.save(
      this.transactionRepository.create({
        orderId: data.orderId ?? null,
        userId: data.userId,
        amount,
        paymentMethod: 'zarinpal',
        status: PaymentTransactionStatus.PENDING,
        authority: gateway.authority,
        idempotencyKey: data.idempotencyKey ?? null,
        referenceId: null,
        trackingCode: null,
        paidAt: null,
      }),
    )

    return { transaction, authority: gateway.authority, paymentUrl: gateway.paymentUrl, mock: gateway.mock, reused: false }
  }

  /**
   * Verify a returned payment. Idempotent: a transaction already marked PAID is
   * returned as-is without re-crediting or re-marking the order.
   */
  async verifyPayment(data: VerifyPaymentDto) {
    const transaction = await this.transactionRepository.findOneBy({ authority: data.authority })
    if (!transaction) {
      throw new NotFoundException('تراکنش پرداخت یافت نشد')
    }

    if (transaction.status === PaymentTransactionStatus.PAID) {
      return { status: 'paid', alreadyVerified: true, transaction }
    }

    if (data.status && data.status.toUpperCase() !== 'OK') {
      transaction.status = PaymentTransactionStatus.FAILED
      await this.transactionRepository.save(transaction)
      return { status: 'failed', transaction }
    }

    const result = await this.zarinpal.verifyPayment({ authority: data.authority, amount: Number(transaction.amount) })

    if (!result.success) {
      transaction.status = PaymentTransactionStatus.FAILED
      await this.transactionRepository.save(transaction)
      return { status: 'failed', code: result.code, transaction }
    }

    await this.dataSource.transaction(async (manager) => {
      transaction.status = PaymentTransactionStatus.PAID
      transaction.referenceId = result.refId
      transaction.trackingCode = transaction.trackingCode ?? result.refId
      transaction.paidAt = new Date()
      await manager.save(transaction)

      if (transaction.orderId) {
        const order = await manager.findOne(Order, { where: { id: transaction.orderId } })
        if (order && order.status !== OrderStatus.PAID) {
          order.status = OrderStatus.PAID
          await manager.save(order)
        }
      }
    })

    await this.audit.record({
      userId: transaction.userId,
      action: 'PAYMENT_VERIFIED',
      entityType: 'payment_transaction',
      entityId: transaction.id,
      metadata: { amount: Number(transaction.amount), orderId: transaction.orderId, refId: result.refId },
    })

    return { status: 'paid', refId: result.refId, mock: result.mock, transaction }
  }

  async findTransactions(): Promise<PaymentTransaction[]> {
    return this.transactionRepository.find({ order: { createdAt: 'DESC' } })
  }

  async findTransaction(id: string): Promise<PaymentTransaction | null> {
    return this.transactionRepository.findOneBy({ id })
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

  async findOrderTracking(orderId: string): Promise<OrderTrackingEvent[]> {
    return this.trackingRepository.findBy({ orderId })
  }

  async createTrackingEvent(
    orderId: string,
    data: CreateOrderTrackingEventDto,
  ): Promise<OrderTrackingEvent> {
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
