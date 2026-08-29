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
  }

  return { nodeEnv, isProduction, origins }
}
