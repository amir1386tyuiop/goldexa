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
})
