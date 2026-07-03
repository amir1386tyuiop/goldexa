import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { CartService } from './cart.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { OwnerGuard } from '../common/guards/owner.guard'
import { AddCartItemDto, CreateCartDto, UpdateCartItemQuantityDto } from './create-cart.dto'

@Controller('cart')
@UseGuards(JwtAuthGuard, OwnerGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.cartService.findByUser(userId)
  }

  @Post()
  async create(@Body() body: CreateCartDto) {
    return this.cartService.create(body)
  }

  @Post('items')
  async addItem(@Body() body: AddCartItemDto) {
    return this.cartService.addItem(body)
  }

  @Patch('items/:id/quantity')
  async updateQuantity(@Param('id') id: string, @Body() body: UpdateCartItemQuantityDto) {
    return this.cartService.updateQuantity(id, body.quantity)
  }

  @Delete('items/:id')
  async removeItem(@Param('id') id: string) {
    return this.cartService.removeItem(id)
  }

  @Post(':id/clear')
  async clear(@Param('id') id: string) {
    return this.cartService.clear(id)
  }
}
