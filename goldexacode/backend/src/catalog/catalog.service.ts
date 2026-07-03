import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Inventory } from './inventory.entity'
import { OccasionCategory } from './occasion-category.entity'
import { ProductCategoryMaster } from './product-category-master.entity'
import { ProductMedia } from './product-media.entity'
import { ProductStone } from './product-stone.entity'
import { SellerProfile } from './seller-profile.entity'
import { Stone } from './stone.entity'
import {
  CreateInventoryDto,
  CreateOccasionCategoryDto,
  CreateProductCategoryDto,
  CreateProductMediaDto,
  CreateProductStoneDto,
  CreateSellerProfileDto,
  CreateStoneDto,
} from './create-catalog.dto'

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(ProductCategoryMaster)
    private categoryRepository: Repository<ProductCategoryMaster>,
    @InjectRepository(OccasionCategory)
    private occasionRepository: Repository<OccasionCategory>,
    @InjectRepository(ProductMedia)
    private mediaRepository: Repository<ProductMedia>,
    @InjectRepository(Stone)
    private stoneRepository: Repository<Stone>,
    @InjectRepository(ProductStone)
    private productStoneRepository: Repository<ProductStone>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(SellerProfile)
    private sellerRepository: Repository<SellerProfile>,
  ) {}

  async findCategories(): Promise<ProductCategoryMaster[]> {
    return this.categoryRepository.findBy({ isActive: true })
  }

  async createCategory(data: CreateProductCategoryDto): Promise<ProductCategoryMaster> {
    return this.categoryRepository.save(
      this.categoryRepository.create({
        ...data,
        slug: data.slug ?? null,
        description: data.description ?? null,
        icon_url: data.iconUrl ?? null,
        isActive: data.isActive ?? true,
      }),
    )
  }

  async findOccasions(): Promise<OccasionCategory[]> {
    return this.occasionRepository.findBy({ isActive: true })
  }

  async createOccasion(data: CreateOccasionCategoryDto): Promise<OccasionCategory> {
    return this.occasionRepository.save(
      this.occasionRepository.create({
        ...data,
        slug: data.slug ?? null,
        isActive: data.isActive ?? true,
      }),
    )
  }

  async findProductMedia(productId: string): Promise<ProductMedia[]> {
    return this.mediaRepository.findBy({ productId })
  }

  async createMedia(data: CreateProductMediaDto): Promise<ProductMedia> {
    return this.mediaRepository.save(
      this.mediaRepository.create({
        ...data,
        alt: data.alt ?? null,
        sort_order: data.sortOrder ?? 0,
      }),
    )
  }

  async findStones(): Promise<Stone[]> {
    return this.stoneRepository.findBy({ isActive: true })
  }

  async createStone(data: CreateStoneDto): Promise<Stone> {
    return this.stoneRepository.save(
      this.stoneRepository.create({
        ...data,
        color: data.color ?? null,
        isActive: data.isActive ?? true,
      }),
    )
  }

  async findProductStones(productId: string): Promise<ProductStone[]> {
    return this.productStoneRepository.findBy({ productId })
  }

  async createProductStone(data: CreateProductStoneDto): Promise<ProductStone> {
    return this.productStoneRepository.save(
      this.productStoneRepository.create({
        ...data,
        carat: data.carat ?? 0,
        position: data.position ?? null,
      }),
    )
  }

  async findInventory(productId: string): Promise<Inventory | null> {
    return this.inventoryRepository.findOneBy({ productId })
  }

  async upsertInventory(productId: string, data: CreateInventoryDto): Promise<Inventory> {
    const existing = await this.inventoryRepository.findOneBy({ productId })
    const inventory = existing || this.inventoryRepository.create({ productId })

    inventory.stock = data.stock ?? inventory.stock
    inventory.reservedStock = data.reservedStock ?? inventory.reservedStock
    inventory.warehouse = data.warehouse ?? inventory.warehouse
    return this.inventoryRepository.save(inventory)
  }

  async findSellerProfiles(): Promise<SellerProfile[]> {
    return this.sellerRepository.find({ order: { rating: 'DESC' } })
  }

  async createSellerProfile(data: CreateSellerProfileDto): Promise<SellerProfile> {
    const existing = await this.sellerRepository.findOneBy({ userId: data.userId })
    const profile = existing || this.sellerRepository.create({ userId: data.userId })

    profile.storeName = data.storeName
    profile.description = data.description ?? profile.description
    profile.location = data.location ?? profile.location
    profile.rating = data.rating ?? profile.rating
    profile.isVerified = data.isVerified ?? profile.isVerified
    return this.sellerRepository.save(profile)
  }

  async updateInventoryStock(id: string, stock: number): Promise<Inventory | null> {
    const inventory = await this.inventoryRepository.findOneBy({ id })

    if (!inventory) {
      throw new NotFoundException('موجودی یافت نشد')
    }

    inventory.stock = Math.max(0, stock)
    return this.inventoryRepository.save(inventory)
  }
}
