import { api, createAndLogin, jsonBody, jsonHeaders } from './support'

const baseUrl = (process.env.E2E_BASE_URL || '').replace(/\/$/, '')
const e2e = baseUrl ? describe : describe.skip

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl}${path}`, init)
}

e2e('API smoke and unauthenticated access checks', () => {
  it('responds to the health/root endpoint', async () => {
    const response = await request('/')
    expect(response.status).toBeLessThan(500)
  })

  it.each(['/orders', '/cart/user/11111111-1111-1111-1111-111111111111', '/wallet/user/11111111-1111-1111-1111-111111111111'])('%s rejects anonymous access', async (path) => {
    const response = await request(path)
    expect(response.status).toBe(401)
  })

  it('does not expose payment transactions anonymously', async () => {
    const response = await request('/payments/transactions')
    expect(response.status).toBe(401)
  })

  it('does not allow anonymous direct payment verification', async () => {
    const response = await request('/payments/zarinpal/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ authority: 'unknown', status: 'OK' }),
    })
    expect(response.status).toBe(401)
  })

  it('does not allow anonymous pricing rule changes', async () => {
    const response = await request('/pricing/rules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'security-smoke', laborRate: 1, profitRate: 1, taxRate: 1 }),
    })
    expect(response.status).toBe(401)
  })

  it('keeps Smart Vault assets scoped to their owner', async () => {
    const owner = await createAndLogin('vault-owner')
    const other = await createAndLogin('vault-other')
    const foreign = await api(`/smart-vault/assets/user/${owner.userId}`, { headers: jsonHeaders(other.token) })
    expect(foreign.status).toBe(403)
    const own = await api(`/smart-vault/assets/user/${owner.userId}`, { headers: jsonHeaders(owner.token) })
    expect(own.status).toBe(200)
  })

  it('runs the authenticated local AI design workspace against live pricing', async () => {
    const user = await createAndLogin('ai-design-workspace')
    const result = await api<{ output: string; provider: { endpoint: string } }>('/ai-engine/chat', {
      ...jsonBody({ task: 'assistant', prompt: 'یک انگشتر مینیمال ۳ گرم با الماس طراحی کن' }, user.token),
    })

    expect(result.status).toBe(201)
    expect(result.body.provider.endpoint).toBe('local')
    const output = JSON.parse(result.body.output) as { design: { pricing: { liveGoldPricePerGram: number; total: number } } }
    expect(output.design.pricing.liveGoldPricePerGram).toBeGreaterThan(0)
    expect(output.design.pricing.total).toBeGreaterThan(output.design.pricing.liveGoldPricePerGram)
  })
})
