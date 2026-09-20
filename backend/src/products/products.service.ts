import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Product, ProductCategory } from './product.entity'
import { PricingService } from '../pricing/pricing.service'

export interface ProductQuery {
  search?: string
  category?: ProductCategory
  karat?: number
  minWeight?: number
  maxWeight?: number
  minPrice?: number
  maxPrice?: number
  isNew?: boolean
  isFeatured?: boolean
  inStock?: boolean
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'weight_asc' | 'weight_desc'
  page?: number
  limit?: number
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private readonly pricingService: PricingService,
  ) {}

  /**
   * Catalog responses must expose the same live price used by cart/order
   * creation. The persisted final_price is retained as a query/index hint,
   * but must never be presented as an authoritative checkout price.
   */
  private async withLivePrices(products: Product[]): Promise<Product[]> {
    const prices = await Promise.all(
      products.map(async (product) => [product.id, await this.pricingService.calculateProductPrice(product)] as const),
    )
    const priceById = new Map(prices)
    return products.map((product) => Object.assign(product, { finalPrice: priceById.get(product.id) ?? product.finalPrice }))
  }

  async findAll(): Promise<Product[]> {
    return this.withLivePrices(await this.productRepository.find({ order: { createdAt: 'DESC' } }))
  }

  async findOne(id: string): Promise<Product | null> {
    const product = await this.productRepository.findOneBy({ id })
    return product ? (await this.withLivePrices([product]))[0] : null
  }

  async findByCategory(category: ProductCategory): Promise<Product[]> {
    return this.withLivePrices(await this.productRepository.findBy({ category }))
  }

  async search(query: string): Promise<Product[]> {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.name ILIKE :query OR product.description ILIKE :query', { query: `%${query}%` })
      .getMany()
    return this.withLivePrices(products)
  }

  /**
   * Advanced catalog query: text search + filters (category, karat, weight and
   * price ranges, new/featured/stock) + sorting + pagination. Returns the page
   * of items together with the total count for the listing UI.
   */
  async query(
    filters: ProductQuery,
  ): Promise<{ items: Product[]; total: number; page: number; limit: number; pages: number }> {
    const qb = this.productRepository.createQueryBuilder('product')

    if (filters.search) {
      qb.andWhere('(product.name ILIKE :search OR product.description ILIKE :search)', { search: `%${filters.search}%` })
    }
    if (filters.category) {
      qb.andWhere('product.category = :category', { category: filters.category })
    }
    if (filters.karat !== undefined) {
      qb.andWhere('product.karat = :karat', { karat: filters.karat })
    }
    if (filters.minWeight !== undefined) {
      qb.andWhere('product.weight >= :minWeight', { minWeight: filters.minWeight })
    }
    if (filters.maxWeight !== undefined) {
      qb.andWhere('product.weight <= :maxWeight', { maxWeight: filters.maxWeight })
    }
    if (filters.minPrice !== undefined) {
      qb.andWhere('product.final_price >= :minPrice', { minPrice: filters.minPrice })
    }
    if (filters.maxPrice !== undefined) {
      qb.andWhere('product.final_price <= :maxPrice', { maxPrice: filters.maxPrice })
    }
    if (filters.isNew !== undefined) {
      qb.andWhere('product.is_new = :isNew', { isNew: filters.isNew })
    }
    if (filters.isFeatured !== undefined) {
      qb.andWhere('product.is_featured = :isFeatured', { isFeatured: filters.isFeatured })
    }
    if (filters.inStock) {
      qb.andWhere('product.stock > 0')
    }

    switch (filters.sort) {
      case 'price_asc':
        qb.orderBy('product.final_price', 'ASC')
        break
      case 'price_desc':
        qb.orderBy('product.final_price', 'DESC')
        break
      case 'weight_asc':
        qb.orderBy('product.weight', 'ASC')
        break
      case 'weight_desc':
        qb.orderBy('product.weight', 'DESC')
        break
      default:
        qb.orderBy('product.created_at', 'DESC')
    }

    const page = Math.max(1, Number(filters.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20))
    qb.skip((page - 1) * limit).take(limit)

    const [items, total] = await qb.getManyAndCount()
    return { items: await this.withLivePrices(items), total, page, limit, pages: Math.ceil(total / limit) || 1 }
  }

  /**
   * Similar/fallback products to show when a search or filter returns nothing
   * (PRD 5.2 AC). Prefers the same category, then featured, then newest.
   */
  async getSuggestions(category?: ProductCategory, limit = 8): Promise<Product[]> {
    if (category) {
      const sameCategory = await this.productRepository.find({
        where: { category },
        order: { isFeatured: 'DESC', createdAt: 'DESC' },
        take: limit,
      })
      if (sameCategory.length) return this.withLivePrices(sameCategory)
    }
    const featured = await this.productRepository.find({
      where: { isFeatured: true },
      order: { createdAt: 'DESC' },
      take: limit,
    })
    if (featured.length >= limit) return this.withLivePrices(featured)
    const newest = await this.productRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    })
    return this.withLivePrices(newest)
  }

  /** Dynamic home feed: newest, featured and discounted products. */
  async getHomeFeed() {
    const [newProducts, featured, discounted] = await Promise.all([
      this.productRepository.find({ where: { isNew: true }, order: { createdAt: 'DESC' }, take: 8 }),
      this.productRepository.find({ where: { isFeatured: true }, order: { createdAt: 'DESC' }, take: 8 }),
      this.productRepository
        .createQueryBuilder('product')
        .where('product.discount IS NOT NULL AND product.discount > 0')
        .orderBy('product.discount', 'DESC')
        .take(8)
        .getMany(),
    ])
    const [liveNew, liveFeatured, liveDiscounted] = await Promise.all([
      this.withLivePrices(newProducts),
      this.withLivePrices(featured),
      this.withLivePrices(discounted),
    ])
    return { newProducts: liveNew, featured: liveFeatured, discounted: liveDiscounted }
  }
}
