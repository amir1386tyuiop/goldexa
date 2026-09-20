import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { getSecurityConfig } from './common/security-config'

async function bootstrap() {
  const { isProduction, origins } = getSecurityConfig()

  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.enableCors({
    origin: origins,
    credentials: true,
  })

  app.set('trust proxy', 1)
  // Keep the explicit CSP/HSTS policy below as the application contract, while
  // letting Helmet cover the remaining OWASP browser hardening headers.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      hsts: false,
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  )
  app.use((_request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('X-Frame-Options', 'DENY')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()')
    response.setHeader('Cross-Origin-Resource-Policy', 'same-site')
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    )
    if (isProduction) {
      response.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      )
    }
    next()
  })

  // Serve uploaded product images (WebP) from /uploads.
  const uploadsDir = join(process.cwd(), 'uploads')
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true })
  }
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const port = process.env.PORT || 3001
  await app.listen(port)
  console.log(`🚀 Goldexa API running on port ${port}`)
}

bootstrap()
