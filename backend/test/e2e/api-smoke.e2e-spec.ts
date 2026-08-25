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
})
