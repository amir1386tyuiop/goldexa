import 'reflect-metadata'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('sensitive endpoint guard policy', () => {
  // These are production security gates. Keep them enabled in every test run
  // so a newly added sensitive route cannot silently bypass authentication or
  // the required admin/permission policy.
  it.each([
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
    ['AI code generation', '../ai-engine/ai-engine.controller.ts', 'code', true],
    ['AI KYC analysis', '../ai-engine/ai-engine.controller.ts', 'kycDocument', true],
    ['AI image generation', '../ai-engine/ai-engine.controller.ts', 'image', true],
    ['AI notification creation', '../ai-engine/ai-engine.controller.ts', 'notification', true],
    ['AI market matching', '../ai-engine/ai-engine.controller.ts', 'executeMatch', true],
  ])('%s requires the declared security policy', (_label, relativeFile, method, adminRequired) => {
    const source = readFileSync(join(__dirname, relativeFile), 'utf8')
    const methodIndex = source.indexOf(`async ${method}(`)
    const routeDecoratorIndex = source.lastIndexOf('@Post', methodIndex)
    const classDecoratorIndex = source.indexOf('export class')
    const decorators = `${source.slice(0, classDecoratorIndex)}\n${source.slice(Math.max(0, routeDecoratorIndex), methodIndex)}`

    expect(methodIndex).toBeGreaterThanOrEqual(0)
    expect(decorators).toContain('JwtAuthGuard')
    if (adminRequired) {
      const isAiEndpoint = relativeFile.includes('../ai-engine/')
      if (isAiEndpoint) {
        expect(decorators).toContain("@Permissions('VIEW_REPORTS')")
      } else {
        expect(decorators).toContain('AdminGuard')
      }
    }
  })

  it('keeps user-scoped liquidity reads behind an owner-or-admin check', () => {
    const source = readFileSync(join(__dirname, '../liquidity/liquidity.controller.ts'), 'utf8')
    expect(source).toContain('assertOwnerOrAdmin(userId, req.user)')
    expect(source).toContain("user.role !== 'admin'")
  })

  it('keeps saved designs behind authentication and ownership checks', () => {
    const source = readFileSync(join(__dirname, '../community-extensions/community-extensions.controller.ts'), 'utf8')
    const methodIndex = source.indexOf('async findSaves(')
    const routeDecoratorIndex = source.lastIndexOf("@Get('saves/:userId')", methodIndex)
    const decorators = source.slice(routeDecoratorIndex, methodIndex)
    expect(methodIndex).toBeGreaterThanOrEqual(0)
    expect(decorators).toContain('JwtAuthGuard')
    expect(source).toContain('req.user.sub !== userId')
  })

  it('binds AI chat ownership to the authenticated JWT subject', () => {
    const source = readFileSync(join(__dirname, '../ai-engine/ai-engine.controller.ts'), 'utf8')
    expect(source).toContain('userId: request.user.sub')
  })
})
