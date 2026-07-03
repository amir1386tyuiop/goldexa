import { Controller, Get, NotFoundException, Param, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { ProductsService, ProductQuery } from './products.service'
import { ProductCategory } from './product.entity'

function toBool(value?: string): boolean | undefined {
  if (value === undefined) return undefined
  return value === 'true' || value === '1'
}

function toNum(value?: string): number | undefined {
  if (value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Catalog listing. Returns a page of products (array, for backward
   * compatibility) and exposes the total count via the X-Total-Count header.
   * Supports search, category/karat/weight/price filters, sorting, pagination.
   */
  @Get()
  async findAll(
    @Res({ passthrough: true }) res: Response,
    @Query('category') category?: ProductCategory,
    @Query('search') search?: string,
    @Query('karat') karat?: string,
    @Query('minWeight') minWeight?: string,
    @Query('maxWeight') maxWeight?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('isNew') isNew?: string,
    @Query('isFeatured') isFeatured?: string,
    @Query('inStock') inStock?: string,
    @Query('sort') sort?: ProductQuery['sort'],
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.productsService.query({
      search,
      category,
      karat: toNum(karat),
      minWeight: toNum(minWeight),
      maxWeight: toNum(maxWeight),
      minPrice: toNum(minPrice),
      maxPrice: toNum(maxPrice),
      isNew: toBool(isNew),
      isFeatured: toBool(isFeatured),
      inStock: toBool(inStock),
      sort,
      page: toNum(page),
      limit: toNum(limit),
    })

    res.setHeader('X-Total-Count', String(result.total))
    res.setHeader('X-Total-Pages', String(result.pages))
    res.setHeader('X-Page', String(result.page))
    return result.items
  }

  @Get('home')
  async home() {
    return this.productsService.getHomeFeed()
  }

  // Similar/fallback products for empty search results (PRD 5.2 AC).
  @Get('suggestions')
  async suggestions(@Query('category') category?: ProductCategory, @Query('limit') limit?: string) {
    return this.productsService.getSuggestions(category, limit ? Number(limit) : 8)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id)
    if (!product) {
      throw new NotFoundException('محصول یافت نشد')
    }
    return product
  }
}
