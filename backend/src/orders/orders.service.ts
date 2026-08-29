import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
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
    return this.orderRepository.findBy({ userId })
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
      const itemsWithProducts = await Promise.all(
        data.items.map(async (item) => {
          const product = await queryRunner.manager.findOne(Product, {
            where: { id: item.productId },
            lock: { mode: 'pessimistic_write' },
          })

          if (!product) {
            throw new NotFoundException(`محصول ${item.productId} یافت نشد`)
          }

          if (product.stock < item.quantity) {
            throw new BadRequestException(`موجودی محصول ${product.name} کافی نیست`)
          }

          product.stock -= item.quantity
          await queryRunner.manager.save(product)

          return {
            productId: product.id,
            name: product.name,
            quantity: item.quantity,
            unitPrice: product.finalPrice,
            totalPrice: Number(product.finalPrice) * item.quantity,
          }
        }),
      )

      const totalAmount = itemsWithProducts.reduce(
        (total, item) => total + Number(item.totalPrice),
        data.shippingCost,
      )

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
    await this.findOwnedOrder(orderId, userId, isAdmin)
    return this.invoiceRepository.save(
      this.invoiceRepository.create({
        orderId,
        invoiceNumber: `INV-${Date.now()}`,
        totalAmount,
        pdf_url: pdfUrl ?? null,
      }),
    )
  }

  async requestRefund(orderId: string, amount: number, reason: string, userId: string, isAdmin = false): Promise<Refund> {
    const order = await this.findOwnedOrder(orderId, userId, isAdmin)
    const refundAmount = Number(amount)
    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      throw new BadRequestException('مبلغ بازپرداخت باید بیشتر از صفر باشد')
    }

    const existingRefunds = await this.refundRepository.findBy({ orderId })
    const reservedRefundTotal = existingRefunds
      .filter((refund) => !['rejected', 'cancelled'].includes(refund.status))
      .reduce((total, refund) => total + Number(refund.amount), 0)
    const availableRefund = Number(order.totalAmount) - reservedRefundTotal
    if (refundAmount > availableRefund) {
      throw new BadRequestException('مبلغ بازپرداخت از مبلغ قابل بازپرداخت سفارش بیشتر است')
    }

    return this.refundRepository.save(this.refundRepository.create({ orderId, amount, reason, status: 'pending' }))
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
