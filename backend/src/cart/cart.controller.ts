import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { CartService } from './cart.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { JwtUser } from '../common/guards/jwt-auth.guard'
import { AddCartItemDto, CreateCartDto, UpdateCartItemQuantityDto } from './create-cart.dto'

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string, @Req() request: Request & { user: JwtUser }) {
    this.assertTarget(userId, request.user)
    return this.cartService.findByUser(userId)
  }

  @Post()
  async create(@Body() body: CreateCartDto, @Req() request: Request & { user: JwtUser }) {
    body.userId = this.resolveTarget(body.userId, request.user)
    return this.cartService.create(body)
  }

  @Post('items')
  async addItem(@Body() body: AddCartItemDto, @Req() request: Request & { user: JwtUser }) {
    return this.cartService.addItem(body, request.user)
  }

  @Patch('items/:id/quantity')
  async updateQuantity(@Param('id') id: string, @Body() body: UpdateCartItemQuantityDto, @Req() request: Request & { user: JwtUser }) {
    return this.cartService.updateQuantity(id, body.quantity, request.user)
  }

  @Delete('items/:id')
  async removeItem(@Param('id') id: string, @Req() request: Request & { user: JwtUser }) {
    return this.cartService.removeItem(id, request.user)
  }

  @Post(':id/clear')
  async clear(@Param('id') id: string, @Req() request: Request & { user: JwtUser }) {
    return this.cartService.clear(id, request.user)
  }

  private resolveTarget(target: string | undefined, user: JwtUser) {
    if (user.role === 'admin' || user.roleNames?.includes('admin')) return target ?? user.sub
    if (target && target !== user.sub) this.assertTarget(target, user)
    return user.sub
  }

  private assertTarget(target: string, user: JwtUser) {
    if (user.role !== 'admin' && !user.roleNames?.includes('admin') && target !== user.sub) {
      throw new ForbiddenException('دسترسی به سبد خرید کاربر دیگر مجاز نیست')
    }
  }
}
