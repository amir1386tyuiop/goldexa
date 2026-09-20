import {
  api,
  baseUrl,
  createAndLogin,
  databaseFixturesEnabled,
  e2e,
  jsonBody,
  jsonHeaders,
  seedWalletFixture,
} from './support'

type Product = { id: string; name: string; finalPrice: number | string; stock: number }
type Order = { id: string; totalAmount: number | string; status: string; paymentMethod: string }

e2e('checkout and refund against an isolated PostgreSQL database', () => {
  let buyer: { userId: string; token: string }
  let otherBuyer: { userId: string; token: string }
  let product: Product
  let order: Order

  beforeAll(async () => {
    buyer = await createAndLogin('buyer')
    otherBuyer = await createAndLogin('other-buyer')

    const products = await api<Product[]>('/products?inStock=true&limit=1')
    expect(products.status).toBe(200)
    expect(products.body.length).toBeGreaterThan(0)
    product = products.body[0]
  })

  it('creates a cart, reserves an item, and keeps cart ownership scoped to the JWT user', async () => {
    const createdCart = await api<{ id: string }>('/cart', jsonBody({}, buyer.token))
    expect(createdCart.status).toBe(201)

    const added = await api('/cart/items', jsonBody({
      cartId: createdCart.body.id,
      productId: product.id,
      name: product.name,
      quantity: 1,
      unitPrice: Number(product.finalPrice),
    }, buyer.token))
    expect(added.status).toBe(201)

    const foreignRead = await api(`/cart/user/${buyer.userId}`, { headers: jsonHeaders(otherBuyer.token) })
    expect(foreignRead.status).toBe(403)
  })

  it('creates an authoritative online order and verifies payment idempotently', async () => {
    const expectedTotal = Number(product.finalPrice)
    const created = await api<Order>('/orders', jsonBody({
      items: [{ productId: product.id, quantity: 1 }],
      shippingCost: 0,
      address: {
        title: 'E2E',
        province: 'تهران',
        city: 'تهران',
        street: 'خیابان تست',
        postalCode: '1234567890',
        isDefault: true,
      },
      paymentMethod: 'online',
    }, buyer.token))
    expect(created.status).toBe(201)
    order = created.body
    expect(Number(order.totalAmount)).toBe(expectedTotal)
    expect(order.status).toBe('pending')

    const idempotencyKey = `e2e-${order.id}`
    const requested = await api<{ transaction: { id: string; amount: number | string }; authority: string }>('/payments/zarinpal/request', jsonBody({
      userId: buyer.userId,
      orderId: order.id,
      amount: expectedTotal,
      idempotencyKey,
    }, buyer.token))
    expect(requested.status).toBe(201)
    expect(requested.body.transaction.amount).toBeDefined()

    const repeated = await api<{ transaction: { id: string }; reused?: boolean }>('/payments/zarinpal/request', jsonBody({
      userId: buyer.userId,
      orderId: order.id,
      amount: expectedTotal,
      idempotencyKey,
    }, buyer.token))
    expect(repeated.status).toBe(201)
    expect(repeated.body.transaction.id).toBe(requested.body.transaction.id)
    expect(repeated.body.reused).toBe(true)

    const verified = await api<{ status: string; transaction: { status: string } }>('/payments/zarinpal/verify', jsonBody({
      authority: requested.body.authority,
      status: 'OK',
    }, buyer.token))
    expect(verified.status).toBe(201)
    expect(verified.body.status).toBe('paid')
    expect(verified.body.transaction.status).toBe('paid')

    const repeatedVerify = await api<{ alreadyVerified?: boolean }>('/payments/zarinpal/verify', jsonBody({
      authority: requested.body.authority,
      status: 'OK',
    }, buyer.token))
    expect(repeatedVerify.status).toBe(201)
    expect(repeatedVerify.body.alreadyVerified).toBe(true)
  })

  it('allows only the owner to request/read a refund and rejects an over-refund', async () => {
    const foreignRequest = await api(`/orders/${order.id}/refunds`, jsonBody({ amount: 1, reason: 'foreign' }, otherBuyer.token))
    expect(foreignRequest.status).toBe(404)

    const overRefund = await api(`/orders/${order.id}/refunds`, jsonBody({
      amount: Number(order.totalAmount) + 1,
      reason: 'over the paid amount',
    }, buyer.token))
    expect(overRefund.status).toBe(400)

    const requested = await api<{ id: string; amount: number | string; status: string }>(
      `/orders/${order.id}/refunds`,
      jsonBody({ amount: Number(order.totalAmount), reason: 'E2E refund request' }, buyer.token),
    )
    expect(requested.status).toBe(201)
    expect(Number(requested.body.amount)).toBe(Number(order.totalAmount))
    expect(requested.body.status).toBe('pending')

    const refunds = await api<Array<{ id: string }>>(`/orders/${order.id}/refunds`, { headers: jsonHeaders(buyer.token) })
    expect(refunds.status).toBe(200)
    expect(refunds.body.some((item) => item.id === requested.body.id)).toBe(true)
  })

  it('cancels a pending order and restores the reserved product stock', async () => {
    const available = await api<Product[]>('/products?inStock=true&limit=10')
    const cancelProduct = available.body.find((candidate) => candidate.stock >= 1)
    expect(cancelProduct).toBeDefined()
    const before = Number(cancelProduct!.stock)
    const created = await api<Order>('/orders', jsonBody({
      items: [{ productId: cancelProduct!.id, quantity: 1 }],
      shippingCost: 0,
      address: { title: 'E2E', province: 'تهران', city: 'تهران', street: 'خیابان تست', postalCode: '1234567890', isDefault: true },
      paymentMethod: 'online',
    }, buyer.token))
    expect(created.status).toBe(201)

    const afterReservation = await api<Product[]>(`/products?inStock=true&search=${encodeURIComponent(cancelProduct!.name)}`)
    const reserved = afterReservation.body.find((candidate) => candidate.id === cancelProduct!.id)
    expect(reserved?.stock).toBe(before - 1)

    const cancelled = await api<Order>(`/orders/${created.body.id}/cancel`, { method: 'POST', headers: jsonHeaders(buyer.token) })
    expect(cancelled.status).toBe(201)
    expect(cancelled.body.status).toBe('cancelled')

    const restoredFeed = await api<Product[]>(`/products?inStock=true&search=${encodeURIComponent(cancelProduct!.name)}`)
    const restored = restoredFeed.body.find((candidate) => candidate.id === cancelProduct!.id)
    expect(restored?.stock).toBe(before)
  })
})

const walletE2e = baseUrl && databaseFixturesEnabled() ? describe : describe.skip

walletE2e('wallet checkout contract (test-database fixture only)', () => {
  it('rejects direct wallet minting and charges the wallet during wallet checkout', async () => {
    const buyer = await createAndLogin('wallet-buyer')
    const products = await api<Product[]>('/products?inStock=true&limit=1')
    const product = products.body[0]
    const total = Number(product.finalPrice)
    await seedWalletFixture(buyer.userId, total * 2)

    const mintAttempt = await api('/wallet/deposit', jsonBody({ amount: total }, buyer.token))
    expect([401, 403, 404]).toContain(mintAttempt.status)

    const before = await api<{ balance: number | string }>(`/wallet/user/${buyer.userId}`, { headers: jsonHeaders(buyer.token) })
    expect(before.status).toBe(200)

    const created = await api<Order>('/orders', jsonBody({
      items: [{ productId: product.id, quantity: 1 }],
      shippingCost: 0,
      address: { title: 'E2E', province: 'تهران', city: 'تهران', street: 'خیابان تست', postalCode: '1234567890', isDefault: true },
      paymentMethod: 'wallet',
    }, buyer.token))
    expect(created.status).toBe(201)
    expect(created.body.status).toBe('paid')

    const after = await api<{ balance: number | string }>(`/wallet/user/${buyer.userId}`, { headers: jsonHeaders(buyer.token) })
    expect(Number(after.body.balance)).toBe(Number(before.body.balance) - total)
  })
})
