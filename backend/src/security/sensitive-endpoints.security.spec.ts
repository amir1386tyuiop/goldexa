import 'reflect-metadata'
import { readFileSync } from 'fs'
import { join } from 'path'

const enforceSecurity = process.env.ENFORCE_SECURITY_TESTS === '1'
const securityIt = enforceSecurity ? it : it.skip

describe('sensitive endpoint guard policy', () => {
  // These tests are intentionally opt-in until the corresponding production
  // controllers are hardened. Run with ENFORCE_SECURITY_TESTS=1 to make the
  // current gaps fail CI instead of allowing them to be forgotten.
  securityIt.each([
    ['auth role sync', '../auth/auth.controller.ts', 'syncRoles', true],
    ['auth role assignment', '../auth/auth.controller.ts', 'assignRole', true],
    ['auth permission assignment', '../auth/auth.controller.ts', 'assignPermission', true],
    ['payment request', '../payments/payments.controller.ts', 'requestPayment', false],
    ['payment verify', '../payments/payments.controller.ts', 'verifyPayment', false],
    ['payment transaction creation', '../payments/payments.controller.ts', 'createTransaction', true],
    ['payment transaction status update', '../payments/payments.controller.ts', 'updateTransactionStatus', true],
    ['pricing rule creation', '../pricing/pricing.controller.ts', 'createRule', true],
    ['pricing spread creation', '../pricing/pricing.controller.ts', 'createSpread', true],
    ['pricing tax rule creation', '../pricing/pricing.controller.ts', 'createTaxRule', true],
    ['pricing labor rule creation', '../pricing/pricing.controller.ts', 'createLaborRule', true],
    ['content page creation', '../content/content.controller.ts', 'createPage', true],
    ['promotion creation', '../content/content.controller.ts', 'createPromotion', true],
    ['ad campaign creation', '../content/content.controller.ts', 'createAd', true],
    ['liquidity status update', '../liquidity/liquidity.controller.ts', 'updateRequestStatus', true],
    ['community challenge creation', '../community/community.controller.ts', 'createChallenge', true],
    ['community challenge winner', '../community/community.controller.ts', 'setWinner', true],
  ])('%s requires the declared security policy', (_label, relativeFile, method, adminRequired) => {
    const source = readFileSync(join(__dirname, relativeFile), 'utf8')
    const methodIndex = source.indexOf(`async ${method}(`)
    const routeDecoratorIndex = source.lastIndexOf('@Post', methodIndex)
    const decorators = source.slice(Math.max(0, routeDecoratorIndex), methodIndex)

    expect(methodIndex).toBeGreaterThanOrEqual(0)
    expect(decorators).toContain('JwtAuthGuard')
    if (adminRequired) {
      expect(decorators).toContain('AdminGuard')
    }
  })

  securityIt('keeps user-scoped liquidity reads behind an owner-or-admin check', () => {
    const source = readFileSync(join(__dirname, '../liquidity/liquidity.controller.ts'), 'utf8')
    expect(source).toContain('assertOwnerOrAdmin(userId, req.user)')
    expect(source).toContain("user.role !== 'admin'")
  })

  securityIt('keeps saved designs behind authentication and ownership checks', () => {
    const source = readFileSync(join(__dirname, '../community-extensions/community-extensions.controller.ts'), 'utf8')
    const methodIndex = source.indexOf('async findSaves(')
    const routeDecoratorIndex = source.lastIndexOf("@Get('saves/:userId')", methodIndex)
    const decorators = source.slice(routeDecoratorIndex, methodIndex)
    expect(methodIndex).toBeGreaterThanOrEqual(0)
    expect(decorators).toContain('JwtAuthGuard')
    expect(source).toContain('req.user.sub !== userId')
  })
})
