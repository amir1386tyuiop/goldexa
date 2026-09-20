import { api, baseUrl, createAndLogin, e2e, jsonBody, jsonHeaders, seedWalletFixture } from './support'

type Product = { id: string; name: string; finalPrice: number | string; stock: number }

e2e('group buying creates one paid order after atomic share checkout', () => {
  it('charges the member, locks product stock, and finalizes the leader order', async () => {
    const leader = await createAndLogin('group-leader')
    const member = await createAndLogin('group-member')
    const products = await api<Product[]>('/products?inStock=true&limit=10')
    expect(products.status).toBe(200)
    const product = products.body.find((candidate) => candidate.stock >= 1)
    expect(product).toBeDefined()
    const unitPrice = Number(product!.finalPrice)

    const group = await api<{ id: string }>('/group-buying', jsonBody({ title: 'E2E group', paymentMode: 'member' }, leader.token))
    expect(group.status).toBe(201)
    const item = await api(`/group-buying/${group.body.id}/items`, jsonBody({ productId: product!.id, name: product!.name, quantity: 1, unitPrice }, leader.token))
    expect(item.status).toBe(201)

    const joined = await api<{ id: string; shareAmount: number | string }>(`/group-buying/${group.body.id}/join`, jsonBody({ shareAmount: unitPrice }, member.token))
    expect(joined.status).toBe(201)
    await seedWalletFixture(member.userId, unitPrice * 2)
    const paid = await api(`/group-buying/${group.body.id}/members/${joined.body.id}/pay`, { ...jsonBody({ paidAmount: unitPrice }, member.token), method: 'PATCH' })
    expect(paid.status).toBe(200)

    const finalized = await api<{ id: string; status: string; paymentMethod: string }>(`/group-buying/${group.body.id}/finalize`, jsonBody({ address: { title: 'E2E', province: 'تهران', city: 'تهران', street: 'خیابان تست', postalCode: '1234567890', isDefault: true } }, leader.token))
    expect(finalized.status).toBe(201)
    expect(finalized.body.status).toBe('paid')
    expect(finalized.body.paymentMethod).toBe('wallet')

    const leaderTracking = await api<{ orderId: string; orderStatus: string }>(`/group-buying/${group.body.id}/tracking`, { method: 'GET', headers: jsonHeaders(leader.token) })
    expect(leaderTracking.status).toBe(200)
    expect(leaderTracking.body).toEqual(expect.objectContaining({ orderId: finalized.body.id, orderStatus: 'paid' }))

    const memberTracking = await api(`/group-buying/${group.body.id}/tracking`, { method: 'GET', headers: jsonHeaders(member.token) })
    expect(memberTracking.status).toBe(200)

    const outsider = await createAndLogin('group-outsider')
    const denied = await api(`/group-buying/${group.body.id}/tracking`, { method: 'GET', headers: jsonHeaders(outsider.token) })
    expect(denied.status).toBe(403)
  })
})

void baseUrl
