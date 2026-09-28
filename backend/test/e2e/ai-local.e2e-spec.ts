const aiBaseUrl = (process.env.AI_E2E_BASE_URL || '').replace(/\/$/, '')
const e2e = aiBaseUrl ? describe : describe.skip

export {}

e2e('local AI service integration', () => {
  it('reports health and executes a deterministic price prediction', async () => {
    const health = await fetch(`${aiBaseUrl}/health`)
    expect(health.status).toBe(200)
    const healthBody = await health.json() as { status: string; service: string; models: Record<string, boolean> }
    expect(healthBody).toEqual(expect.objectContaining({ status: 'healthy', service: 'goldexa-ai-service' }))
    expect(healthBody.models).toEqual(expect.objectContaining({ price: expect.any(Boolean), recommendation: expect.any(Boolean), matching: expect.any(Boolean) }))

    const prediction = await fetch(`${aiBaseUrl}/predict-price`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ historical_prices: [100, 101, 103, 104], days_ahead: 7 }),
    })
    expect(prediction.status).toBe(200)
    const result = await prediction.json() as { predicted_price: number; confidence: number; model_status: string }
    expect(result.predicted_price).toBeGreaterThan(0)
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
    expect(result.model_status).toBeDefined()
  })

  it('returns explainable design recommendations from history, style, and budget', async () => {
    const response = await fetch(`${aiBaseUrl}/recommend-designs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user_id: 'e2e-user',
        user_history: ['minimal gold ring', 'gold necklace'],
        style: 'minimal',
        budget: 5000,
        candidate_designs: [
          { product_id: 'ring-minimal', name: 'Minimal Ring', tags: ['ring', 'minimal', 'gold'], price: 3000 },
          { product_id: 'bracelet-classic', name: 'Classic Bracelet', tags: ['bracelet', 'classic', 'gold'], price: 3000 },
        ],
      }),
    })
    expect(response.status).toBe(200)
    const result = await response.json() as { recommendations: Array<{ product_id: string; score: number; reason: string }> }
    expect(result.recommendations.length).toBe(2)
    expect(result.recommendations[0]).toEqual(expect.objectContaining({ product_id: 'ring-minimal' }))
    expect(result.recommendations[0].score).toBeGreaterThan(result.recommendations[1].score)
    expect(result.recommendations[0].reason).toEqual(expect.any(String))
  })

  it('returns an explainable buyer and seller market match', async () => {
    const response = await fetch(`${aiBaseUrl}/match-market`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        buyer: { id: 'buyer-1', categories: ['ring', 'gold'], preferred_price: 2500, location: 'Tehran' },
        seller: { id: 'seller-1', categories: ['ring', 'gold'], preferred_price: 2400, location: 'Tehran' },
        listing_price: 2400,
      }),
    })
    expect(response.status).toBe(200)
    const result = await response.json() as { buyer_id: string; seller_id: string; match: boolean; score: number; reasons: string[] }
    expect(result).toEqual(expect.objectContaining({ buyer_id: 'buyer-1', seller_id: 'seller-1', match: true }))
    expect(result.score).toBeGreaterThanOrEqual(0.5)
    expect(result.reasons.length).toBeGreaterThan(0)
  })
})
