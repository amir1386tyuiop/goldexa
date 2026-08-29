import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateOrderItemDto } from './create-order.dto'

describe('CreateOrderItemDto quantity validation', () => {
  it.each([0, -1, 1.5, Number.NaN])('rejects invalid quantity %p', async (quantity) => {
    const errors = await validate(plainToInstance(CreateOrderItemDto, { productId: 'product-1', quantity }))
    expect(errors.some((error) => error.property === 'quantity')).toBe(true)
  })

  it('accepts a positive integer quantity', async () => {
    const errors = await validate(plainToInstance(CreateOrderItemDto, { productId: 'product-1', quantity: 2 }))
    expect(errors).toHaveLength(0)
  })
})
