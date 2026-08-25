import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { AdminGuard } from '../common/guards/admin.guard'
import { CatalogService } from './catalog.service'
import {
  CreateInventoryDto,
  CreateOccasionCategoryDto,
  CreateProductCategoryDto,
  CreateProductMediaDto,
  CreateProductStoneDto,
  CreateSellerProfileDto,
  CreateStoneDto,
} from './create-catalog.dto'

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  async findCategories() {
    return this.catalogService.findCategories()
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createCategory(@Body() body: CreateProductCategoryDto) {
    return this.catalogService.createCategory(body)
  }

  @Get('occasions')
  async findOccasions() {
    return this.catalogService.findOccasions()
  }

  @Post('occasions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createOccasion(@Body() body: CreateOccasionCategoryDto) {
    return this.catalogService.createOccasion(body)
  }

  @Get('products/:productId/media')
  async findProductMedia(@Param('productId') productId: string) {
    return this.catalogService.findProductMedia(productId)
  }

  @Post('products/media')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createMedia(@Body() body: CreateProductMediaDto) {
    return this.catalogService.createMedia(body)
  }

  @Get('stones')
  async findStones() {
    return this.catalogService.findStones()
  }

  @Post('stones')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createStone(@Body() body: CreateStoneDto) {
    return this.catalogService.createStone(body)
  }

  @Get('products/:productId/stones')
  async findProductStones(@Param('productId') productId: string) {
    return this.catalogService.findProductStones(productId)
  }

  @Post('products/stones')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createProductStone(@Body() body: CreateProductStoneDto) {
    return this.catalogService.createProductStone(body)
  }

  @Get('inventory/:productId')
  async findInventory(@Param('productId') productId: string) {
    return this.catalogService.findInventory(productId)
  }

  @Post('inventory')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async upsertInventory(@Body() body: CreateInventoryDto) {
    return this.catalogService.upsertInventory(body.productId, body)
  }

  @Patch('inventory/:id/stock')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateStock(@Param('id') id: string, @Body() body: { stock: number }) {
    return this.catalogService.updateInventoryStock(id, body.stock)
  }

  @Get('sellers')
  async findSellers() {
    return this.catalogService.findSellerProfiles()
  }

  @Post('sellers')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createSeller(@Body() body: CreateSellerProfileDto) {
    return this.catalogService.createSellerProfile(body)
  }
}
