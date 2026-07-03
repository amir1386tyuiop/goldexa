import { Injectable, NotFoundException } from '@nestjs/common'
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
import {
  CreateCustomBuilderQuoteDto,
  CreateGemstoneDto,
  CreateJewelryDesignDto,
  CreateJewelryDesignVersionDto,
} from './create-custom-builder.dto'

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
  ) {}

  async findDesigns(): Promise<JewelryDesign[]> {
    return this.designRepository.find({ order: { createdAt: 'DESC' } })
  }

  async findDesignsByUser(userId: string): Promise<JewelryDesign[]> {
    return this.designRepository.findBy({ userId })
  }

  async findDesign(id: string): Promise<JewelryDesign | null> {
    return this.designRepository.findOneBy({ id })
  }

  async createDesign(data: CreateJewelryDesignDto): Promise<JewelryDesign> {
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
      estimatedGoldPrice: data.estimatedGoldPrice ?? 0,
      laborCost: data.laborCost ?? 0,
      profit: data.profit ?? 0,
      tax: data.tax ?? 9,
      totalPrice: data.totalPrice ?? 0,
      status: (data.status as JewelryDesignStatus | undefined) || JewelryDesignStatus.DRAFT,
    })

    return this.designRepository.save(design)
  }

  async findDesignVersions(designId: string): Promise<JewelryDesignVersion[]> {
    return this.versionRepository.findBy({ designId })
  }

  async createDesignVersion(
    designId: string,
    data: CreateJewelryDesignVersionDto,
  ): Promise<JewelryDesignVersion> {
    const design = await this.designRepository.findOneBy({ id: designId })

    if (!design) {
      throw new NotFoundException('طرح یافت نشد')
    }

    const version = this.versionRepository.create({
      designId,
      version: data.version,
      changes: data.changes,
      totalPrice: data.totalPrice,
      modelUrl: data.modelUrl ?? null,
    })

    design.totalPrice = data.totalPrice
    await this.designRepository.save(design)
    return this.versionRepository.save(version)
  }

  async updateDesignStatus(id: string, status: string): Promise<JewelryDesign | null> {
    const design = await this.designRepository.findOneBy({ id })

    if (!design) {
      throw new NotFoundException('طرح یافت نشد')
    }

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
    return this.quoteRepository.save(
      this.quoteRepository.create({
        ...data,
        designId: data.designId ?? null,
        profit: data.profit ?? 0,
        tax: data.tax ?? 9,
        expiresAt: data.expiresAt ?? null,
        status: (data.status as CustomBuilderQuoteStatus | undefined) || CustomBuilderQuoteStatus.DRAFT,
      }),
    )
  }

  async updateQuoteStatus(id: string, status: string): Promise<CustomBuilderQuote | null> {
    const quote = await this.quoteRepository.findOneBy({ id })

    if (!quote) {
      throw new NotFoundException('پیش‌فاکتور یافت نشد')
    }

    quote.status = status as CustomBuilderQuoteStatus
    return this.quoteRepository.save(quote)
  }
}
