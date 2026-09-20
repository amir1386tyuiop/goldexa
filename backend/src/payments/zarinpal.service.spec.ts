import { ConfigService } from '@nestjs/config'
import { ZarinpalService } from './zarinpal.service'

describe('ZarinpalService (mock mode)', () => {
  function build(merchantId?: string) {
    const config = {
      get: (key: string) => (key === 'ZARINPAL_MERCHANT_ID' ? merchantId : undefined),
    } as unknown as ConfigService
    return new ZarinpalService(config)
  }

  it('runs in mock mode when no merchant id is configured', () => {
    expect(build().isMock).toBe(true)
  })

  it('returns a mock authority + StartPay URL on requestPayment', async () => {
    const res = await build().requestPayment({ amount: 1000, description: 'x', callbackUrl: 'http://cb' })
    expect(res.mock).toBe(true)
    expect(res.authority).toContain('MOCK-')
    expect(res.paymentUrl).toContain(res.authority)
  })

  it('verifies a mock payment as successful', async () => {
    const req = await build().requestPayment({ amount: 1000, description: 'x', callbackUrl: 'http://cb' })
    const verify = await build().verifyPayment({ authority: req.authority, amount: 1000 })
    expect(verify.success).toBe(true)
    expect(verify.refId).toBeTruthy()
  })

  it('treats a configured merchant id as real (non-mock) mode', () => {
    expect(build('REAL-MERCHANT-ID').isMock).toBe(false)
  })

  it('refuses refunds in mock mode instead of creating a fake refund', async () => {
    await expect(build().refundPayment({ authority: 'MOCK-1', amount: 1000 })).rejects.toThrow('حالت mock')
  })
})
