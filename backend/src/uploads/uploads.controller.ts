import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { join } from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { Permissions } from '../common/decorators/permissions.decorator'

// sharp is a CommonJS native module; require avoids ESM-interop call issues.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp')

interface UploadedImage {
  buffer: Buffer
  mimetype: string
  originalname: string
  size: number
}

@Controller('uploads')
export class UploadsController {
  /**
   * Accepts a product image, converts it to optimized WebP with sharp, stores
   * it under uploads/products and returns its public URL. Admin-only.
   */
  @UseGuards(PermissionsGuard)
  @Permissions('UPDATE_ANY_PRODUCT')
  @Post('product-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('فقط فایل تصویری مجاز است'), false)
        }
        cb(null, true)
      },
    }),
  )
  async uploadProductImage(@UploadedFile() file?: UploadedImage) {
    if (!file) {
      throw new BadRequestException('فایلی ارسال نشده است')
    }

    const dir = join(process.cwd(), 'uploads', 'products')
    await mkdir(dir, { recursive: true })

    // PRD 5.5 AC: product images are stored as WebP under 200 KB. Progressively
    // lower quality (and, if needed, dimensions) until the target size is met.
    const MAX_BYTES = 200 * 1024
    let webp: Buffer = Buffer.alloc(0)
    for (const width of [1200, 1000, 800, 640, 512, 420, 360, 320]) {
      for (const quality of [82, 72, 62, 52, 45, 38, 30, 25]) {
        webp = await sharp(file.buffer)
          .rotate() // respect EXIF orientation
          .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
          .webp({ quality })
          .toBuffer()
        if (webp.length <= MAX_BYTES) break
      }
      if (webp.length <= MAX_BYTES) break
    }

    if (webp.length === 0 || webp.length > MAX_BYTES) {
      throw new BadRequestException('تصویر پس از فشرده‌سازی همچنان بزرگ‌تر از ۲۰۰ کیلوبایت است')
    }

    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.webp`
    await writeFile(join(dir, filename), webp)

    const url = `/uploads/products/${filename}`
    return { url, filename, size: webp.length, format: 'webp', withinLimit: true }
  }
}
