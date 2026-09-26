import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ArModel } from './ar-model.entity'
import { ArPreview } from './ar-preview.entity'
import { CreateArModelDto, CreateArPreviewDto } from './create-ar.dto'

@Injectable()
export class ArService {
  constructor(
    @InjectRepository(ArModel)
    private modelRepository: Repository<ArModel>,
    @InjectRepository(ArPreview)
    private previewRepository: Repository<ArPreview>,
  ) {}

  async findModels(): Promise<ArModel[]> {
    return this.modelRepository.findBy({ isActive: true })
  }

  async createModel(data: CreateArModelDto): Promise<ArModel> {
    assertSafeAssetUrl(data.modelUrl, 'مدل')
    if (data.thumbnailUrl) assertSafeAssetUrl(data.thumbnailUrl, 'thumbnail')
    return this.modelRepository.save(
      this.modelRepository.create({
        ...data,
        productId: data.productId ?? null,
        designId: data.designId ?? null,
        model_url: data.modelUrl,
        thumbnail_url: data.thumbnailUrl ?? null,
        isActive: data.isActive ?? true,
      }),
    )
  }

  async findPreviews(modelId: string): Promise<ArPreview[]> {
    return this.previewRepository.findBy({ modelId, isShared: true })
  }

  async createPreview(data: CreateArPreviewDto): Promise<ArPreview> {
    if (data.screenshotUrl) assertSafeAssetUrl(data.screenshotUrl, 'تصویر')
    if (data.videoUrl) assertSafeAssetUrl(data.videoUrl, 'ویدیو')
    return this.previewRepository.save(
      this.previewRepository.create({
        ...data,
        screenshot_url: data.screenshotUrl ?? null,
        video_url: data.videoUrl ?? null,
        isShared: data.isShared ?? false,
      }),
    )
  }
}

function assertSafeAssetUrl(value: string, label: string): void {
  const normalized = value.trim()
  if (!normalized || !/^(?:\/|https?:\/\/)/i.test(normalized) || normalized.length > 2048) {
    throw new BadRequestException(`آدرس ${label} باید مسیر local یا http/https باشد`)
  }
}
