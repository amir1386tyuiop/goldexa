import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Order, OrderStatus, PaymentMethod } from './order.entity'
import { Product } from '../products/product.entity'
import { User } from '../users/user.entity'
import { OrderCancellation } from './order-cancellation.entity'
import { Invoice } from './invoice.entity'
import { OrderStatusHistory } from './order-status-history.entity'
import { Refund } from './refund.entity'
import { Shipment } from './shipment.entity'
import { CreateOrderDto } from './create-order.dto'
import { WalletService } from '../wallet/wallet.service'
import { randomUUID } from 'crypto'
import { PricingService } from '../pricing/pricing.service'

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OrderStatusHistory)
    private orderStatusHistoryRepository: Repository<OrderStatusHistory>,
    @InjectRepository(Shipment)
    private shipmentRepository: Repository<Shipment>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
    @InjectRepository(OrderCancellation)
    private cancellationRepository: Repository<OrderCancellation>,
    private readonly walletService: WalletService,
    private readonly pricingService: PricingService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(userId: string, isAdmin = false): Promise<Order[]> {
    return this.orderRepository.find({
      where: isAdmin ? {} : { userId },
      order: { createdAt: 'DESC' },
    })
  }

  private async findOwnedOrder(id: string, userId: string, isAdmin = false): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: isAdmin ? { id } : { id, userId },
    })
    if (!order) {
      throw new NotFoundException('سفارش یافت نشد')
    }
    return order
  }

  async findOne(id: string, userId: string, isAdmin = false): Promise<Order> {
    return this.findOwnedOrder(id, userId, isAdmin)
  }

  async findByUser(userId: string): Promise<Order[]> {
    return this.orderRepository.find({ where: { userId }, order: { createdAt: 'DESC' } })
  }

  async createOrder(data: CreateOrderDto, userId: string): Promise<Order> {
    const user = await this.userRepository.findOneBy({ id: userId })

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد')
    }

    const queryRunner = this.orderRepository.manager.connection.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // Acquire every product lock in a deterministic order to prevent
      // deadlocks when concurrent orders contain the same products in a
      // different request order.
      const productsById = new Map<string, Product>()
      const productIds = [...new Set(data.items.map((item) => item.productId))].sort()
      for (const productId of productIds) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: productId },
          lock: { mode: 'pessimistic_write' },
        })
        if (!product) throw new NotFoundException(`محصول ${productId} یافت نشد`)
        productsById.set(product.id, product)
      }

      const itemsWithProducts = []
      for (const item of data.items) {
        const product = productsById.get(item.productId)!
        if (product.stock < item.quantity) {
          throw new BadRequestException(`موجودی محصول ${product.name} کافی نیست`)
        }
        product.stock -= item.quantity
        await queryRunner.manager.save(product)
        const livePrice = await this.pricingService.calculateProductPrice(product)
        itemsWithProducts.push({
          productId: product.id,
          name: product.name,
          quantity: item.quantity,
          unitPrice: livePrice,
          totalPrice: livePrice * item.quantity,
        })
      }

      const totalAmount = itemsWithProducts.reduce(
        (total, item) => total + Number(item.totalPrice),
        data.shippingCost,
      )

      const quoteIds = data.quoteIds?.length ? data.quoteIds : data.quoteId ? [data.quoteId] : []
      if (quoteIds.length) {
        let quotedTotal = 0
        try {
          const quotes = await Promise.all(quoteIds.map((quoteId) => this.pricingService.requireValidQuote(quoteId)))
          quotedTotal = quotes.reduce((sum, quote) => sum + Number((quote as { total: number }).total), 0)
        } catch (error) {
          throw new BadRequestException(error instanceof Error ? error.message : 'قیمت رزرو شده نامعتبر است')
        }
        const matchesGoodsTotal = Math.round(quotedTotal) === Math.round(totalAmount)
        const matchesGoodsPlusShipping = Math.round(quotedTotal + Number(data.shippingCost)) === Math.round(totalAmount)
        if (!matchesGoodsTotal && !matchesGoodsPlusShipping) {
          throw new BadRequestException('مبلغ سفارش با قیمت رزرو شده مطابقت ندارد')
        }
      }

      const order = queryRunner.manager.create(Order, {
        orderNumber: `GX-${randomUUID().replace(/-/g, '').slice(0, 24)}`,
        userId,
        items: itemsWithProducts,
        totalAmount,
        shippingCost: data.shippingCost,
        status: OrderStatus.PENDING,
        address: data.address,
        paymentMethod: data.paymentMethod as unknown as PaymentMethod,
      })

      const savedOrder = await queryRunner.manager.save(order)

      if (savedOrder.paymentMethod === PaymentMethod.WALLET) {
        await this.walletService.payOrderWithWallet(userId, savedOrder.id, totalAmount, queryRunner.manager)
        savedOrder.status = OrderStatus.PAID
        await queryRunner.manager.save(savedOrder)
      }

      await queryRunner.commitTransaction()
      return savedOrder
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async addStatusHistory(
    orderId: string,
    status: string,
    note: string | null | undefined,
    userId: string,
    isAdmin = false,
  ): Promise<OrderStatusHistory> {
    await this.findOwnedOrder(orderId, userId, isAdmin)
    return this.orderStatusHistoryRepository.save(
      this.orderStatusHistoryRepository.create({ orderId, status, note: note ?? null }),
    )
  }

  async createShipment(
    orderId: string,
    carrier: string | null | undefined,
    trackingCode: string | null | undefined,
    userId: string,
    isAdmin = false,
  ): Promise<Shipment> {
    await this.findOwnedOrder(orderId, userId, isAdmin)
    return this.shipmentRepository.save(
      this.shipmentRepository.create({ orderId, carrier: carrier ?? null, trackingCode: trackingCode ?? null }),
    )
  }

  async createInvoice(
    orderId: string,
    totalAmount: number,
    pdfUrl: string | null | undefined,
    userId: string,
    isAdmin = false,
  ): Promise<Invoice> {
    const order = await this.findOwnedOrder(orderId, userId, isAdmin)
    const amount = Number(totalAmount)
    if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== Math.round(Number(order.totalAmount) * 100)) {
      throw new BadRequestException('مبلغ فاکتور باید با مبلغ سفارش برابر باشد')
    }
    return this.invoiceRepository.save(
      this.invoiceRepository.create({
        orderId,
        invoiceNumber: `INV-${randomUUID().replace(/-/g, '').slice(0, 24)}`,
        totalAmount: amount,
        pdf_url: pdfUrl ?? null,
      }),
    )
  }

  async requestRefund(orderId: string, amount: number, reason: string, userId: string, isAdmin = false): Promise<Refund> {
    const refundAmount = Number(amount)
    if (!Number.isFinite(refundAmount) || refundAmount <= 0 || !reason?.trim()) {
      throw new BadRequestException('مبلغ و دلیل بازپرداخت الزامی است')
    }
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: isAdmin ? { id: orderId } : { id: orderId, userId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!order) throw new NotFoundException('سفارش یافت نشد')
      if (![OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status)) {
        throw new BadRequestException('این سفارش در وضعیت قابل بازپرداخت نیست')
      }
      const existingRefunds = await manager.find(Refund, { where: { orderId } })
      const reservedRefundTotal = existingRefunds
        .filter((refund) => !['rejected', 'cancelled'].includes(refund.status))
        .reduce((total, refund) => total + Number(refund.amount), 0)
      if (refundAmount > Number(order.totalAmount) - reservedRefundTotal) {
        throw new BadRequestException('مبلغ بازپرداخت از مبلغ قابل بازپرداخت سفارش بیشتر است')
      }
      return manager.save(Refund, manager.create(Refund, { orderId, amount: refundAmount, reason: reason.trim(), status: 'pending' }))
    })
  }

  async requestCancellation(orderId: string, reason: string, userId: string, isAdmin = false): Promise<OrderCancellation> {
    await this.findOwnedOrder(orderId, userId, isAdmin)
    return this.cancellationRepository.save(
      this.cancellationRepository.create({ orderId, reason, status: 'pending' }),
    )
  }

  async findStatusHistory(orderId: string, userId: string, isAdmin = false): Promise<OrderStatusHistory[]> {
    await this.findOwnedOrder(orderId, userId, isAdmin)
    return this.orderStatusHistoryRepository.findBy({ orderId })
  }

  async findShipments(orderId: string, userId: string, isAdmin = false): Promise<Shipment[]> {
    await this.findOwnedOrder(orderId, userId, isAdmin)
    return this.shipmentRepository.findBy({ orderId })
  }

  async findInvoices(orderId: string, userId: string, isAdmin = false): Promise<Invoice[]> {
    await this.findOwnedOrder(orderId, userId, isAdmin)
    return this.invoiceRepository.findBy({ orderId })
  }

  async findRefunds(orderId: string, userId: string, isAdmin = false): Promise<Refund[]> {
    await this.findOwnedOrder(orderId, userId, isAdmin)
    return this.refundRepository.findBy({ orderId })
  }

  async findCancellations(orderId: string, userId: string, isAdmin = false): Promise<OrderCancellation[]> {
    await this.findOwnedOrder(orderId, userId, isAdmin)
    return this.cancellationRepository.findBy({ orderId })
  }

  async updateStatus(id: string, status: OrderStatus, userId: string, isAdmin = false): Promise<Order> {
    const order = await this.findOwnedOrder(id, userId, isAdmin)
    await this.orderRepository.update(order.id, { status })
    await this.addStatusHistory(order.id, status, null, userId, isAdmin)
    return this.findOwnedOrder(order.id, userId, isAdmin)
  }
}
