import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CatalogController } from './catalog.controller'
import { CatalogService } from './catalog.service'
import { Inventory } from './inventory.entity'
import { OccasionCategory } from './occasion-category.entity'
import { ProductCategoryMaster } from './product-category-master.entity'
import { ProductMedia } from './product-media.entity'
import { ProductStone } from './product-stone.entity'
import { SellerProfile } from './seller-profile.entity'
import { Stone } from './stone.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ProductCategoryMaster, OccasionCategory, ProductMedia, Stone, ProductStone, Inventory, SellerProfile])],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
