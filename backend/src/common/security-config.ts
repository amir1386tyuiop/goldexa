export type SecurityEnvironment = Record<string, string | undefined>

export interface SecurityConfig {
  nodeEnv: string
  isProduction: boolean
  origins: string[]
}

/** Validate security-sensitive runtime configuration before Nest starts. */
export function getSecurityConfig(env: SecurityEnvironment = process.env): SecurityConfig {
  const nodeEnv = env.NODE_ENV || 'development'
  const isProduction = nodeEnv === 'production'
  const requiresExplicitSecrets = nodeEnv !== 'development'
  const jwtSecret = env.JWT_SECRET?.trim()

  if (
    requiresExplicitSecrets &&
    (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('your-super-secret'))
  ) {
    throw new Error('JWT_SECRET must be explicitly configured with at least 32 characters')
  }

  const configuredOrigins = (env.FRONTEND_URL || 'http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  if (configuredOrigins.length === 0 || configuredOrigins.some((origin) => origin === '*')) {
    throw new Error('FRONTEND_URL must contain one or more explicit origins; wildcard CORS is forbidden')
  }

  let origins: string[]
  try {
    origins = configuredOrigins.map((origin) => new URL(origin).origin)
  } catch {
    throw new Error('FRONTEND_URL must contain valid absolute origins')
  }

  if (isProduction && origins.some((origin) => !origin.startsWith('https://'))) {
    throw new Error('Production FRONTEND_URL origins must use HTTPS')
  }

  if (isProduction) {
    const appBaseUrl = env.APP_BASE_URL?.trim()
    if (!appBaseUrl) {
      throw new Error('APP_BASE_URL must be explicitly configured in production')
    }
    try {
      const parsedBaseUrl = new URL(appBaseUrl)
      if (parsedBaseUrl.protocol !== 'https:') {
        throw new Error('APP_BASE_URL must use HTTPS in production')
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('must use HTTPS')) {
        throw error
      }
      throw new Error('APP_BASE_URL must be a valid absolute URL')
    }

    const cacheDriver = (env.CACHE_DRIVER || '').trim().toLowerCase()
    if (cacheDriver !== 'redis') {
      throw new Error('CACHE_DRIVER must be redis in production')
    }

    const priceSource = (env.GOLD_PRICE_SOURCE || '').trim().toLowerCase()
    if (priceSource === 'mock' || (!priceSource && !env.GOLD_PRICE_API_URL?.trim())) {
      throw new Error('A real gold price source must be configured in production')
    }

    const paymentMode = (env.PAYMENT_MODE || '').trim().toLowerCase()
    if (paymentMode === 'mock' || !env.ZARINPAL_MERCHANT_ID?.trim()) {
      throw new Error('A real payment gateway must be configured in production')
    }
  }

  return { nodeEnv, isProduction, origins }
}
