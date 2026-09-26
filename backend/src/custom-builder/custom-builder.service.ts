import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  CustomBuilderQuote,
  CustomBuilderQuoteStatus,
} from './custom-builder-quote.entity'
import { GemstoneLibrary } from './gemstone-library.entity'
import {
  JewelryDesign,
  JewelryDesignCategory,
  JewelryDesignStatus,
  JewelryBaseType,
} from './jewelry-design.entity'
import { JewelryDesignVersion } from './jewelry-design-version.entity'
import { JewelryDesignStage, JewelryDesignStageStatus } from './jewelry-design-stage.entity'
import {
  CreateCustomBuilderQuoteDto,
  CreateGemstoneDto,
  CreateJewelryDesignDto,
  CreateJewelryDesignVersionDto,
  CreateJewelryDesignStageDto,
  UpdateJewelryDesignStageDto,
} from './create-custom-builder.dto'
import { GoldPricingService } from '../gold-pricing/gold-pricing.service'
import { GoldPriceType } from '../gold-pricing/gold-price.entity'

@Injectable()
export class CustomBuilderService {
  constructor(
    @InjectRepository(JewelryDesign)
    private designRepository: Repository<JewelryDesign>,
    @InjectRepository(JewelryDesignVersion)
    private versionRepository: Repository<JewelryDesignVersion>,
    @InjectRepository(GemstoneLibrary)
    private gemstoneRepository: Repository<GemstoneLibrary>,
    @InjectRepository(CustomBuilderQuote)
    private quoteRepository: Repository<CustomBuilderQuote>,
    @Optional() private readonly goldPricing?: GoldPricingService,
    @Optional() @InjectRepository(JewelryDesignStage)
    private readonly stageRepository?: Repository<JewelryDesignStage>,
  ) {}

  async findDesigns(): Promise<JewelryDesign[]> {
    return this.designRepository.find({ where: { status: JewelryDesignStatus.APPROVED }, order: { createdAt: 'DESC' } })
  }

  async findAllDesignsForAdmin(): Promise<JewelryDesign[]> {
    return this.designRepository.find({ order: { updatedAt: 'DESC' } })
  }

  async findDesignsByUser(userId: string): Promise<JewelryDesign[]> {
    return this.designRepository.findBy({ userId })
  }

  async findDesign(id: string, userId?: string, isAdmin = false): Promise<JewelryDesign | null> {
    const design = await this.designRepository.findOneBy({ id })
    if (design && userId && !isAdmin && design.userId !== userId) throw new ForbiddenException('به این طرح دسترسی ندارید')
    return design
  }

  async createDesign(data: CreateJewelryDesignDto): Promise<JewelryDesign> {
    const pricing = await this.calculateBuilderPricing(data.weight, data.karat ?? 18, data)
    const design = this.designRepository.create({
      ...data,
      baseType: (data.baseType as JewelryBaseType | undefined) || JewelryBaseType.SIMPLE,
      category: data.category as JewelryDesignCategory,
      weight: data.weight,
      karat: data.karat ?? 18,
      metalColor: data.metalColor ?? null,
      stones: data.stones ?? [],
      dimensions: data.dimensions ?? null,
      imageUrl: data.imageUrl ?? null,
      modelUrl: data.modelUrl ?? null,
      preview3dUrl: data.preview3dUrl ?? null,
      ...pricing,
      status: JewelryDesignStatus.DRAFT,
    })

    return this.designRepository.save(design)
  }

  async findDesignVersions(designId: string, userId?: string, isAdmin = false): Promise<JewelryDesignVersion[]> {
    await this.assertDesignOwner(designId, userId, isAdmin)
    return this.versionRepository.findBy({ designId })
  }

  async findDesignStages(designId: string, userId?: string, isAdmin = false): Promise<JewelryDesignStage[]> {
    await this.assertDesignOwner(designId, userId, isAdmin)
    if (!this.stageRepository) return []
    return this.stageRepository.find({ where: { designId }, order: { createdAt: 'ASC' } })
  }

  async createDesignStage(designId: string, data: CreateJewelryDesignStageDto): Promise<JewelryDesignStage> {
    const design = await this.designRepository.findOneBy({ id: designId })
    if (!design) throw new NotFoundException('طرح یافت نشد')
    if (!this.stageRepository) throw new NotFoundException('مخزن مرحله‌های ساخت آماده نیست')
    if (data.imageUrl) assertSafeStageAssetUrl(data.imageUrl, 'تصویر')
    if (data.modelUrl) assertSafeStageAssetUrl(data.modelUrl, 'مدل')
    return this.stageRepository.save(this.stageRepository.create({
      designId,
      title: data.title.trim(),
      status: (data.status as JewelryDesignStageStatus | undefined) || JewelryDesignStageStatus.PLANNED,
      note: data.note?.trim() || null,
      imageUrl: data.imageUrl?.trim() || null,
      modelUrl: data.modelUrl?.trim() || null,
    }))
  }

  async updateDesignStage(designId: string, stageId: string, data: UpdateJewelryDesignStageDto): Promise<JewelryDesignStage> {
    if (!this.stageRepository) throw new NotFoundException('مخزن مرحله‌های ساخت آماده نیست')
    const stage = await this.stageRepository.findOneBy({ id: stageId, designId })
    if (!stage) throw new NotFoundException('مرحله‌ی ساخت یافت نشد')
    if (data.imageUrl) assertSafeStageAssetUrl(data.imageUrl, 'تصویر')
    if (data.modelUrl) assertSafeStageAssetUrl(data.modelUrl, 'مدل')
    Object.assign(stage, {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.status !== undefined ? { status: data.status as JewelryDesignStageStatus } : {}),
      ...(data.note !== undefined ? { note: data.note?.trim() || null } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl?.trim() || null } : {}),
      ...(data.modelUrl !== undefined ? { modelUrl: data.modelUrl?.trim() || null } : {}),
    })
    return this.stageRepository.save(stage)
  }

  async deleteDesignStage(designId: string, stageId: string): Promise<{ deleted: true }> {
    if (!this.stageRepository) throw new NotFoundException('مخزن مرحله‌های ساخت آماده نیست')
    const stage = await this.stageRepository.findOneBy({ id: stageId, designId })
    if (!stage) throw new NotFoundException('مرحله‌ی ساخت یافت نشد')
    await this.stageRepository.remove(stage)
    return { deleted: true }
  }

  async createDesignVersion(
    designId: string,
    data: CreateJewelryDesignVersionDto,
    userId?: string,
    isAdmin = false,
  ): Promise<JewelryDesignVersion> {
    const design = await this.designRepository.findOneBy({ id: designId })

    if (!design) {
      throw new NotFoundException('طرح یافت نشد')
    }
    if (userId && !isAdmin && design.userId !== userId) throw new ForbiddenException('به این طرح دسترسی ندارید')

    const pricing = await this.calculateBuilderPricing(Number(design.weight), Number(design.karat), design)
    const version = this.versionRepository.create({
      designId,
      version: data.version,
      changes: data.changes,
      totalPrice: pricing.totalPrice,
      modelUrl: data.modelUrl ?? null,
    })

    Object.assign(design, pricing)
    await this.designRepository.save(design)
    return this.versionRepository.save(version)
  }

  async updateDesignStatus(id: string, status: string, userId?: string, isAdmin = false): Promise<JewelryDesign | null> {
    const design = await this.designRepository.findOneBy({ id })

    if (!design) {
      throw new NotFoundException('طرح یافت نشد')
    }
    if (userId && !isAdmin && design.userId !== userId) throw new ForbiddenException('به این طرح دسترسی ندارید')

    const allowed = isAdmin
      ? Object.values(JewelryDesignStatus)
      : [JewelryDesignStatus.DRAFT, JewelryDesignStatus.IN_PROGRESS, JewelryDesignStatus.READY_FOR_REVIEW]
    if (!allowed.includes(status as JewelryDesignStatus)) throw new ForbiddenException('این وضعیت برای شما مجاز نیست')

    design.status = status as JewelryDesignStatus
    return this.designRepository.save(design)
  }

  async findGemstones(): Promise<GemstoneLibrary[]> {
    return this.gemstoneRepository.findBy({ isActive: true })
  }

  async createGemstone(data: CreateGemstoneDto): Promise<GemstoneLibrary> {
    return this.gemstoneRepository.save(
      this.gemstoneRepository.create({
        ...data,
        color: data.color ?? null,
        stock: data.stock ?? 0,
        imageUrl: data.imageUrl ?? null,
        isActive: data.isActive ?? true,
      }),
    )
  }

  async findQuotes(): Promise<CustomBuilderQuote[]> {
    return this.quoteRepository.find({ order: { createdAt: 'DESC' } })
  }

  async findQuotesByUser(userId: string): Promise<CustomBuilderQuote[]> {
    return this.quoteRepository.findBy({ userId })
  }

  async createQuote(data: CreateCustomBuilderQuoteDto): Promise<CustomBuilderQuote> {
    const design = data.designId ? await this.designRepository.findOneBy({ id: data.designId }) : null
    if (data.designId && !design) throw new NotFoundException('طرح یافت نشد')
    const source = design
      ? { goldPriceSnapshot: Number(design.estimatedGoldPrice), goldWeight: Number(design.weight), laborCost: Number(design.laborCost), profit: Number(design.profit), tax: Number(design.tax), total: Number(design.totalPrice) }
      : data
    if (this.goldPricing) {
      const livePrice = Number((await this.goldPricing.getPriceByType(GoldPriceType.GOLD_18))?.value || 0)
      if (!livePrice) throw new NotFoundException('قیمت لحظه‌ای طلا در دسترس نیست')
      const rawGold = livePrice * Number(source.goldWeight) * (Number(design?.karat || 18) / 18)
      const laborCost = Number(source.laborCost || 0)
      const profit = Number(source.profit || 0)
      const taxRate = Number(source.tax ?? 9)
      Object.assign(source, {
        goldPriceSnapshot: livePrice,
        total: Math.round(rawGold + laborCost + profit + ((laborCost + profit) * taxRate) / 100),
      })
    }
    const expiresAt = data.expiresAt && new Date(data.expiresAt).getTime() > Date.now()
      ? new Date(data.expiresAt)
      : new Date(Date.now() + 30 * 60 * 1000)
    return this.quoteRepository.save(
      this.quoteRepository.create({
        ...data,
        ...source,
        designId: data.designId ?? null,
        profit: source.profit ?? 0,
        tax: source.tax ?? 9,
        expiresAt,
        status: CustomBuilderQuoteStatus.DRAFT,
      }),
    )
  }

  private async calculateBuilderPricing(weight: number, karat: number, fallback: {
    estimatedGoldPrice?: number
    laborCost?: number
    profit?: number
    tax?: number
    totalPrice?: number
  }): Promise<{ estimatedGoldPrice: number; laborCost: number; profit: number; tax: number; totalPrice: number }> {
    const livePrice = this.goldPricing
      ? Number((await this.goldPricing.getPriceByType(GoldPriceType.GOLD_18))?.value || 0)
      : 0
    if (this.goldPricing && !livePrice) throw new NotFoundException('قیمت لحظه‌ای طلا در دسترس نیست')
    if (!livePrice) {
      return {
        estimatedGoldPrice: Number(fallback.estimatedGoldPrice || 0),
        laborCost: Number(fallback.laborCost || 0),
        profit: Number(fallback.profit || 0),
        tax: Number(fallback.tax ?? 9),
        totalPrice: Number(fallback.totalPrice || 0),
      }
    }
    const rawGold = livePrice * Number(weight) * (Number(karat || 18) / 18)
    const laborCost = Math.round(rawGold * 0.12)
    const profit = Math.round((rawGold + laborCost) * 0.08)
    const tax = Number(fallback.tax ?? 9)
    const totalPrice = Math.round(rawGold + laborCost + profit + ((laborCost + profit) * tax) / 100)
    return { estimatedGoldPrice: Math.round(rawGold), laborCost, profit, tax, totalPrice }
  }

  async updateQuoteStatus(id: string, status: string, userId?: string, isAdmin = false): Promise<CustomBuilderQuote | null> {
    const quote = await this.quoteRepository.findOneBy({ id })

    if (!quote) {
      throw new NotFoundException('پیش‌فاکتور یافت نشد')
    }
    if (userId && !isAdmin && quote.userId !== userId) throw new ForbiddenException('به این پیش‌فاکتور دسترسی ندارید')

    quote.status = status as CustomBuilderQuoteStatus
    return this.quoteRepository.save(quote)
  }

  private async assertDesignOwner(designId: string, userId?: string, isAdmin = false): Promise<void> {
    if (!userId || isAdmin) return
    const design = await this.designRepository.findOneBy({ id: designId })
    if (!design) throw new NotFoundException('طرح یافت نشد')
    if (design.userId !== userId) throw new ForbiddenException('به این طرح دسترسی ندارید')
  }
}

function assertSafeStageAssetUrl(value: string, label: string): void {
  const normalized = value.trim()
  if (!normalized || !/^(?:\/|https?:\/\/)/i.test(normalized) || normalized.length > 2048) {
    throw new BadRequestException(`آدرس ${label} باید مسیر local یا http/https باشد`)
  }
}
