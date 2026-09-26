import { getSecurityConfig } from './security-config'

describe('security runtime configuration', () => {
  it('rejects missing or weak secrets outside development', () => {
    expect(() => getSecurityConfig({ NODE_ENV: 'test', FRONTEND_URL: 'http://localhost:5174' })).toThrow(
      'JWT_SECRET',
    )
    expect(() =>
      getSecurityConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'short',
        FRONTEND_URL: 'https://goldexa.example',
        APP_BASE_URL: 'https://api.goldexa.example',
      }),
    ).toThrow('JWT_SECRET')
  })

  it('rejects wildcard and malformed CORS origins', () => {
    const secret = 'ci-only-jwt-secret-at-least-32-characters-long'
    expect(() => getSecurityConfig({ NODE_ENV: 'test', JWT_SECRET: secret, FRONTEND_URL: '*' })).toThrow(
      'wildcard CORS',
    )
    expect(() =>
      getSecurityConfig({ NODE_ENV: 'test', JWT_SECRET: secret, FRONTEND_URL: 'not-an-origin' }),
    ).toThrow('valid absolute origins')
  })

  it('requires HTTPS origins in production and normalizes origin lists', () => {
    const secret = 'ci-only-jwt-secret-at-least-32-characters-long'
    expect(() =>
      getSecurityConfig({
        NODE_ENV: 'production',
        JWT_SECRET: secret,
        FRONTEND_URL: 'http://goldexa.example',
        APP_BASE_URL: 'https://api.goldexa.example',
      }),
    ).toThrow('HTTPS')

    expect(
      getSecurityConfig({
        NODE_ENV: 'test',
        JWT_SECRET: secret,
        FRONTEND_URL: 'http://localhost:5174/path, http://localhost:5174',
      }).origins,
    ).toEqual(['http://localhost:5174', 'http://localhost:5174'])
  })

  it('requires an HTTPS API base URL in production', () => {
    const secret = 'ci-only-jwt-secret-at-least-32-characters-long'
    expect(() =>
      getSecurityConfig({
        NODE_ENV: 'production',
        JWT_SECRET: secret,
        FRONTEND_URL: 'https://goldexa.example',
      }),
    ).toThrow('APP_BASE_URL')
    expect(() =>
      getSecurityConfig({
        NODE_ENV: 'production',
        JWT_SECRET: secret,
        FRONTEND_URL: 'https://goldexa.example',
        APP_BASE_URL: 'http://api.goldexa.example',
      }),
    ).toThrow('HTTPS')
  })

  it('rejects mock infrastructure in production', () => {
    const base = {
      NODE_ENV: 'production',
      JWT_SECRET: 'ci-only-jwt-secret-at-least-32-characters-long',
      FRONTEND_URL: 'https://goldexa.example',
      APP_BASE_URL: 'https://api.goldexa.example',
      CACHE_DRIVER: 'redis',
      GOLD_PRICE_SOURCE: 'tgju',
      ZARINPAL_MERCHANT_ID: 'merchant-test',
      PAYMENT_MODE: 'real',
    }
    expect(getSecurityConfig(base).isProduction).toBe(true)
    expect(() => getSecurityConfig({ ...base, CACHE_DRIVER: 'memory' })).toThrow('CACHE_DRIVER')
    expect(() => getSecurityConfig({ ...base, GOLD_PRICE_SOURCE: 'mock' })).toThrow('gold price source')
    expect(() => getSecurityConfig({ ...base, PAYMENT_MODE: 'mock' })).toThrow('payment gateway')
    expect(() => getSecurityConfig({ ...base, ZARINPAL_MERCHANT_ID: '' })).toThrow('payment gateway')
  })
})
