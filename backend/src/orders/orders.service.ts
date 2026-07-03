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
  ) {}

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({ order: { createdAt: 'DESC' } })
  }

  async findOne(id: string): Promise<Order | null> {
    return this.orderRepository.findOneBy({ id })
  }

  async findByUser(userId: string): Promise<Order[]> {
    return this.orderRepository.findBy({ userId })
  }

  async createOrder(data: CreateOrderDto): Promise<Order> {
    const user = await this.userRepository.findOneBy({ id: data.userId })

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد')
    }

    const queryRunner = this.orderRepository.manager.connection.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const itemsWithProducts = await Promise.all(
        data.items.map(async (item) => {
          const product = await queryRunner.manager.findOne(Product, { where: { id: item.productId } })

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
        orderNumber: `GX-${Date.now()}`,
        userId: data.userId,
        items: itemsWithProducts,
        totalAmount,
        shippingCost: data.shippingCost,
        status: OrderStatus.PENDING,
        address: data.address,
        paymentMethod: data.paymentMethod as unknown as PaymentMethod,
      })

      const savedOrder = await queryRunner.manager.save(order)
      await queryRunner.commitTransaction()
      return savedOrder
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async addStatusHistory(orderId: string, status: string, note?: string | null): Promise<OrderStatusHistory> {
    return this.orderStatusHistoryRepository.save(
      this.orderStatusHistoryRepository.create({ orderId, status, note: note ?? null }),
    )
  }

  async createShipment(orderId: string, carrier?: string | null, trackingCode?: string | null): Promise<Shipment> {
    return this.shipmentRepository.save(
      this.shipmentRepository.create({ orderId, carrier: carrier ?? null, trackingCode: trackingCode ?? null }),
    )
  }

  async createInvoice(orderId: string, totalAmount: number, pdfUrl?: string | null): Promise<Invoice> {
    return this.invoiceRepository.save(
      this.invoiceRepository.create({
        orderId,
        invoiceNumber: `INV-${Date.now()}`,
        totalAmount,
        pdf_url: pdfUrl ?? null,
      }),
    )
  }

  async requestRefund(orderId: string, amount: number, reason: string): Promise<Refund> {
    return this.refundRepository.save(this.refundRepository.create({ orderId, amount, reason, status: 'pending' }))
  }

  async requestCancellation(orderId: string, reason: string): Promise<OrderCancellation> {
    return this.cancellationRepository.save(
      this.cancellationRepository.create({ orderId, reason, status: 'pending' }),
    )
  }

  async findStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
    return this.orderStatusHistoryRepository.findBy({ orderId })
  }

  async findShipments(orderId: string): Promise<Shipment[]> {
    return this.shipmentRepository.findBy({ orderId })
  }

  async findInvoices(orderId: string): Promise<Invoice[]> {
    return this.invoiceRepository.findBy({ orderId })
  }

  async findRefunds(orderId: string): Promise<Refund[]> {
    return this.refundRepository.findBy({ orderId })
  }

  async findCancellations(orderId: string): Promise<OrderCancellation[]> {
    return this.cancellationRepository.findBy({ orderId })
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order | null> {
    await this.orderRepository.update(id, { status })
    await this.addStatusHistory(id, status)
    return this.orderRepository.findOneBy({ id })
  }
}
