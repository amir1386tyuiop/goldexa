import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, MoreThan, Not, Repository } from 'typeorm'
import { Cart } from './cart.entity'
import { CartItem } from './cart-item.entity'
import { Product } from '../products/product.entity'
import { AddCartItemDto, CreateCartDto } from './create-cart.dto'
import { JwtUser } from '../common/guards/jwt-auth.guard'

@Injectable()
export class CartService {
  private readonly reservationMinutes = Number(process.env.CART_RESERVATION_MINUTES) || 15

  constructor(
    @InjectRepository(Cart) private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem) private itemRepository: Repository<CartItem>,
    @InjectRepository(Product) private productRepository: Repository<Product>,
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
    if (existing) return existing
    return this.cartRepository.save(this.cartRepository.create({ userId: data.userId, isActive: true }))
  }

  /** Must run after the product row is locked in the same transaction. */
  private async reservedQuantity(manager: EntityManager, productId: string, excludeItemId?: string): Promise<number> {
    const items = await manager.find(CartItem, {
      where: {
        productId,
        reservedUntil: MoreThan(new Date()),
        ...(excludeItemId ? { id: Not(excludeItemId) } : {}),
      },
    })
    return items.reduce((sum, item) => sum + Number(item.quantity), 0)
  }

  private async assertStockAvailable(
    manager: EntityManager,
    product: Product,
    desiredQty: number,
    excludeItemId?: string,
  ): Promise<void> {
    const reserved = await this.reservedQuantity(manager, product.id, excludeItemId)
    const available = Number(product.stock) - reserved
    if (desiredQty > available) {
      throw new BadRequestException(`موجودی کافی نیست. حداکثر قابل سفارش: ${Math.max(0, available)}`)
    }
  }

  async addItem(data: AddCartItemDto, user: JwtUser): Promise<CartItem> {
    const cart = await this.cartRepository.findOneBy({ id: data.cartId })
    if (!cart) throw new NotFoundException('سبد خرید یافت نشد')
    this.assertOwner(cart.userId, user)
    const quantity = data.quantity ?? 1
    this.assertValidQuantity(quantity)

    return this.withTransaction(async (manager) => {
      const lockedCart = await manager.findOne(Cart, {
        where: { id: data.cartId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!lockedCart) throw new NotFoundException('سبد خرید یافت نشد')
      this.assertOwner(lockedCart.userId, user)
      const product = await manager.findOne(Product, {
        where: { id: data.productId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!product) throw new NotFoundException('محصول یافت نشد')
      await this.assertStockAvailable(manager, product, quantity)
      const item = manager.create(CartItem, {
        cartId: data.cartId,
        productId: product.id,
        name: product.name,
        quantity,
        unitPrice: product.finalPrice,
        totalPrice: Number(product.finalPrice) * quantity,
        reservedUntil: new Date(Date.now() + this.reservationMinutes * 60 * 1000),
      })
      return manager.save(CartItem, item)
    })
  }

  async updateQuantity(id: string, quantity: number, user: JwtUser): Promise<CartItem | null> {
    const item = await this.itemRepository.findOne({ where: { id }, relations: ['cart'] })
    if (!item) throw new NotFoundException('آیتم سبد خرید یافت نشد')
    this.assertValidQuantity(quantity)

    return this.withTransaction(async (manager) => {
      const lockedCart = await manager.findOne(Cart, {
        where: { id: item.cartId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!lockedCart) throw new NotFoundException('سبد خرید یافت نشد')
      this.assertOwner(lockedCart.userId, user)
      const lockedItem = await manager.findOne(CartItem, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      })
      if (!lockedItem) throw new NotFoundException('آیتم سبد خرید یافت نشد')
      const product = await manager.findOne(Product, {
        where: { id: lockedItem.productId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!product) throw new NotFoundException('محصول یافت نشد')
      await this.assertStockAvailable(manager, product, quantity, lockedItem.id)
      lockedItem.quantity = quantity
      lockedItem.name = product.name
      lockedItem.unitPrice = product.finalPrice
      lockedItem.totalPrice = Number(product.finalPrice) * quantity
      lockedItem.reservedUntil = new Date(Date.now() + this.reservationMinutes * 60 * 1000)
      return manager.save(CartItem, lockedItem)
    })
  }

  async removeItem(id: string, user: JwtUser): Promise<void> {
    const item = await this.itemRepository.findOne({ where: { id }, relations: ['cart'] })
    if (!item) throw new NotFoundException('آیتم سبد خرید یافت نشد')
    await this.withTransaction(async (manager) => {
      const cart = await manager.findOne(Cart, { where: { id: item.cartId }, lock: { mode: 'pessimistic_write' } })
      if (!cart) throw new NotFoundException('سبد خرید یافت نشد')
      this.assertOwner(cart.userId, user)
      await manager.delete(CartItem, id)
    })
  }

  async clear(cartId: string, user: JwtUser): Promise<void> {
    await this.withTransaction(async (manager) => {
      const cart = await manager.findOne(Cart, { where: { id: cartId }, lock: { mode: 'pessimistic_write' } })
      if (!cart) throw new NotFoundException('سبد خرید یافت نشد')
      this.assertOwner(cart.userId, user)
      await manager.delete(CartItem, { cartId })
    })
  }

  private assertOwner(ownerId: string, user: JwtUser) {
    if (user.role !== 'admin' && !user.roleNames?.includes('admin') && ownerId !== user.sub) {
      throw new ForbiddenException('دسترسی به سبد خرید کاربر دیگر مجاز نیست')
    }
  }

  private assertValidQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('تعداد باید یک عدد صحیح بزرگ‌تر از صفر باشد')
    }
  }

  private async withTransaction<T>(callback: (manager: EntityManager) => Promise<T>): Promise<T> {
    const queryRunner = this.cartRepository.manager.connection.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      const result = await callback(queryRunner.manager)
      await queryRunner.commitTransaction()
      return result
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }
}
