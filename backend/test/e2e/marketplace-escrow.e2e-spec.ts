import {
  api,
  baseUrl,
  createAndLogin,
  databaseFixturesEnabled,
  jsonBody,
  jsonHeaders,
  seedWalletFixture,
} from './support'
import { Client } from 'pg'

type Listing = { id: string; fixedPrice: number | string; status: string }
type Purchase = {
  order: { id: string; status: string }
  escrow: { id: string; status: string; amount: number | string }
  listing: { id: string; status: string }
}
type EscrowStatusResponse = { status: string }

const databaseE2e = baseUrl && databaseFixturesEnabled() ? describe : describe.skip

async function markListingActive(id: string): Promise<void> {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE,
  })
  await client.connect()
  try {
    await client.query(
      `UPDATE used_gold_listings
       SET status = 'active', quality_status = 'approved', quality_badge = true
       WHERE id = $1`,
      [id],
    )
  } finally {
    await client.end()
  }
}

databaseE2e('used-gold marketplace and escrow lifecycle', () => {
  it('atomically buys a direct listing, holds funds, ships, and releases escrow', async () => {
    const seller = await createAndLogin('used-gold-seller')
    const buyer = await createAndLogin('used-gold-buyer')
    const price = 2500000
    await seedWalletFixture(buyer.userId, price)

    const created = await api<Listing>('/marketplace/listings', jsonBody({
      title: 'E2E دستبند طلای دست دوم',
      description: 'فقط برای تست ایزوله E2E',
      weight: 2.1,
      karat: 18,
      saleType: 'direct',
      fixedPrice: price,
      images: [],
    }, seller.token))
    expect(created.status).toBe(201)
    await markListingActive(created.body.id)

    const purchased = await api<Purchase>(
      `/marketplace/listings/${created.body.id}/purchase`,
      jsonBody({
        address: {
          title: 'آدرس E2E',
          province: 'تهران',
          city: 'تهران',
          street: 'خیابان تست',
          postalCode: '1234567890',
          isDefault: true,
        },
      }, buyer.token),
    )
    expect(purchased.status).toBe(201)
    expect(purchased.body.order.status).toBe('paid')
    expect(purchased.body.escrow.status).toBe('held')
    expect(Number(purchased.body.escrow.amount)).toBe(price)
    expect(purchased.body.listing.status).toBe('sold')

    const wallet = await api<{ balance: number | string }>(
      `/wallet/user/${buyer.userId}`,
      { headers: jsonHeaders(buyer.token) },
    )
    expect(wallet.status).toBe(200)
    expect(Number(wallet.body.balance)).toBe(0)

    const shipped = await api<EscrowStatusResponse>(`/escrow/payments/${purchased.body.escrow.id}/ship`, jsonBody({ trackingCode: 'E2E-TRACK-001' }, seller.token))
    expect(shipped.status).toBe(200)
    expect(shipped.body.status).toBe('shipped')

    const delivered = await api<EscrowStatusResponse>(`/escrow/payments/${purchased.body.escrow.id}/confirm-delivery`, jsonBody({}, buyer.token))
    expect(delivered.status).toBe(200)
    expect(delivered.body.status).toBe('released')

    const repeated = await api(`/marketplace/listings/${created.body.id}/purchase`, jsonBody({ address: {} }, buyer.token))
    expect(repeated.status).toBe(400)
  })

  it('lets a participant open a dispute and prevents resolution without a note', async () => {
    const seller = await createAndLogin('dispute-seller')
    const buyer = await createAndLogin('dispute-buyer')
    const price = 1800000
    await seedWalletFixture(buyer.userId, price)

    const created = await api<Listing>('/marketplace/listings', jsonBody({
      title: 'E2E آگهی مورد اختلاف',
      description: 'فقط برای تست dispute',
      weight: 1.7,
      karat: 18,
      saleType: 'direct',
      fixedPrice: price,
      images: [],
    }, seller.token))
    expect(created.status).toBe(201)
    await markListingActive(created.body.id)

    const purchased = await api<Purchase>(`/marketplace/listings/${created.body.id}/purchase`, jsonBody({ address: {} }, buyer.token))
    expect(purchased.status).toBe(201)

    const dispute = await api<EscrowStatusResponse>(`/escrow/payments/${purchased.body.escrow.id}/dispute`, jsonBody({ reason: 'کالای دریافت‌شده با آگهی مطابقت ندارد' }, buyer.token))
    expect(dispute.status).toBe(201)
    expect(dispute.body.status).toBe('disputed')

    const noNote = await api(`/escrow/payments/${purchased.body.escrow.id}/status`, jsonBody({ status: 'refunded' }, seller.token))
    expect([401, 403]).toContain(noNote.status)
  })
})
