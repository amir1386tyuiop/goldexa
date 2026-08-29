import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CustomBuilderController } from './custom-builder.controller'
import { CustomBuilderService } from './custom-builder.service'
import { CustomBuilderQuote } from './custom-builder-quote.entity'
import { GemstoneLibrary } from './gemstone-library.entity'
import { JewelryDesign } from './jewelry-design.entity'
import { JewelryDesignVersion } from './jewelry-design-version.entity'
import { GoldPricingModule } from '../gold-pricing/gold-pricing.module'

@Module({
  imports: [TypeOrmModule.forFeature([JewelryDesign, JewelryDesignVersion, GemstoneLibrary, CustomBuilderQuote]), GoldPricingModule],
  controllers: [CustomBuilderController],
  providers: [CustomBuilderService],
})
export class CustomBuilderModule {}
