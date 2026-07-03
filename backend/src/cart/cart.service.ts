import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { MoreThan, Not, Repository } from 'typeorm'
import { Cart } from './cart.entity'
import { CartItem } from './cart-item.entity'
import { Product } from '../products/product.entity'
import { AddCartItemDto, CreateCartDto } from './create-cart.dto'

@Injectable()
export class CartService {
  private readonly reservationMinutes = Number(process.env.CART_RESERVATION_MINUTES) || 15

  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private itemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async findByUser(userId: string): Promise<Cart | null> {
    return this.cartRepository.findOne({
      where: { userId, isActive: true },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    })
  }

  async create(data: CreateCartDto): Promise<Cart> {
    const existing = await this.findByUser(data.userId)
    if (existing) {
      return existing
    }
    return this.cartRepository.save(this.cartRepository.create({ userId: data.userId, isActive: true }))
  }

  /** Quantity of a product currently held by un-expired cart reservations. */
  private async reservedQuantity(productId: string, excludeItemId?: string): Promise<number> {
    const items = await this.itemRepository.find({
      where: {
        productId,
        reservedUntil: MoreThan(new Date()),
        ...(excludeItemId ? { id: Not(excludeItemId) } : {}),
      },
    })
    return items.reduce((sum, item) => sum + Number(item.quantity), 0)
  }

  /** Throws if the requested quantity exceeds stock minus active reservations. */
  private async assertStockAvailable(productId: string, desiredQty: number, excludeItemId?: string): Promise<void> {
    const product = await this.productRepository.findOneBy({ id: productId })
    if (!product) {
      throw new NotFoundException('محصول یافت نشد')
    }
    const reserved = await this.reservedQuantity(productId, excludeItemId)
    const available = Number(product.stock) - reserved
    if (desiredQty > available) {
      throw new BadRequestException(`موجودی کافی نیست. حداکثر قابل سفارش: ${Math.max(0, available)}`)
    }
  }

  async addItem(data: AddCartItemDto): Promise<CartItem> {
    const cart = await this.cartRepository.findOneBy({ id: data.cartId })
    if (!cart) {
      throw new NotFoundException('سبد خرید یافت نشد')
    }

    const quantity = Math.max(1, data.quantity || 1)
    await this.assertStockAvailable(data.productId, quantity)

    const reservedUntil = data.reservedUntil ?? new Date(Date.now() + this.reservationMinutes * 60 * 1000)
    const item = this.itemRepository.create({
      cartId: data.cartId,
      productId: data.productId,
      name: data.name,
      quantity,
      unitPrice: data.unitPrice,
      totalPrice: Number(data.unitPrice) * quantity,
      reservedUntil,
    })

    return this.itemRepository.save(item)
  }

  async updateQuantity(id: string, quantity: number): Promise<CartItem | null> {
    const item = await this.itemRepository.findOneBy({ id })
    if (!item) {
      throw new NotFoundException('آیتم سبد خرید یافت نشد')
    }
    if (quantity <= 0) {
      throw new BadRequestException('تعداد باید بزرگ‌تر از صفر باشد')
    }

    // Re-check stock, excluding this item's own current reservation.
    await this.assertStockAvailable(item.productId, quantity, item.id)

    item.quantity = quantity
    item.totalPrice = Number(item.unitPrice) * quantity
    item.reservedUntil = new Date(Date.now() + this.reservationMinutes * 60 * 1000)
    return this.itemRepository.save(item)
  }

  async removeItem(id: string): Promise<void> {
    await this.itemRepository.delete(id)
  }

  async clear(cartId: string): Promise<void> {
    await this.itemRepository.delete({ cartId })
  }
}
