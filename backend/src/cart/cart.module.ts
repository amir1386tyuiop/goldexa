import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CartController } from './cart.controller'
import { CartService } from './cart.service'
import { Cart } from './cart.entity'
import { CartItem } from './cart-item.entity'
import { Product } from '../products/product.entity'
import { PricingModule } from '../pricing/pricing.module'

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem, Product]), PricingModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
