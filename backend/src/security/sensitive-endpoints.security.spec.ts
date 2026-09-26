import 'reflect-metadata'
import { readFileSync } from 'fs'
import { join } from 'path'

function methodPolicy(relativeFile: string, method: string): string {
  const source = readFileSync(join(__dirname, relativeFile), 'utf8')
  const methodIndex = source.indexOf(`async ${method}(`)
  expect(methodIndex).toBeGreaterThanOrEqual(0)
  const classDecoratorIndex = source.indexOf('export class')
  const decoratorCandidates = ['@Post', '@Patch', '@Put', '@Delete', '@Get']
    .map((decorator) => source.lastIndexOf(decorator, methodIndex))
    .filter((index) => index >= classDecoratorIndex)
  const routeDecoratorIndex = Math.max(...decoratorCandidates)
  return `${source.slice(0, classDecoratorIndex)}\n${source.slice(routeDecoratorIndex, methodIndex)}`
}

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

  it('rate-limits all AI provider-backed routes before production keys are enabled', () => {
    const source = readFileSync(join(__dirname, '../ai-engine/ai-engine.controller.ts'), 'utf8')
    expect(source).toContain('RateLimitGuard')
    expect(source).toContain('@RateLimit({ limit: 30, windowMs: 60_000 })')
  })

  it.each([
    ['auction creation', '../auctions/auctions.controller.ts', 'create', false],
    ['auction bid', '../auctions/auctions.controller.ts', 'placeBid', false],
    ['auction settlement', '../auctions/auctions.controller.ts', 'settle', true],
    ['auction review', '../auctions/auctions.controller.ts', 'updateReview', true],
    ['auction status', '../auctions/auctions.controller.ts', 'updateStatus', true],
    ['auction cancellation', '../auctions/auctions.controller.ts', 'cancel', true],
    ['escrow creation', '../escrow/escrow.controller.ts', 'createPayment', false],
    ['escrow payment', '../escrow/escrow.controller.ts', 'payFromWallet', false],
    ['escrow shipping', '../escrow/escrow.controller.ts', 'markShipped', false],
    ['escrow delivery confirmation', '../escrow/escrow.controller.ts', 'confirmDelivery', false],
    ['escrow dispute', '../escrow/escrow.controller.ts', 'openDispute', false],
    ['escrow status mutation', '../escrow/escrow.controller.ts', 'updatePaymentStatus', true],
    ['marketplace listing creation', '../marketplace/used-gold-listings.controller.ts', 'create', false],
    ['marketplace cancellation', '../marketplace/used-gold-listings.controller.ts', 'cancelOwn', false],
    ['marketplace purchase', '../marketplace/used-gold-listings.controller.ts', 'purchase', false],
    ['marketplace review', '../marketplace/used-gold-listings.controller.ts', 'review', true],
    ['marketplace status', '../marketplace/used-gold-listings.controller.ts', 'updateStatus', true],
    ['catalog category mutation', '../catalog/catalog.controller.ts', 'createCategory', true],
    ['catalog inventory mutation', '../catalog/catalog.controller.ts', 'upsertInventory', true],
    ['catalog stock mutation', '../catalog/catalog.controller.ts', 'updateStock', true],
  ])('%s keeps its auth/admin policy', (_label, relativeFile, method, adminRequired) => {
    const decorators = methodPolicy(relativeFile, method)
    expect(decorators).toContain('JwtAuthGuard')
    if (adminRequired) expect(decorators).toContain('AdminGuard')
  })

  it('binds auction, marketplace and escrow mutations to the authenticated subject', () => {
    const auction = readFileSync(join(__dirname, '../auctions/auctions.controller.ts'), 'utf8')
    const marketplace = readFileSync(join(__dirname, '../marketplace/used-gold-listings.controller.ts'), 'utf8')
    const escrow = readFileSync(join(__dirname, '../escrow/escrow.controller.ts'), 'utf8')
    expect(auction).toContain('createAuction(body, req.user.sub)')
    expect(auction).toContain('placeBid(id, body, req.user.sub)')
    expect(marketplace).toContain('sellerId: req.user.sub')
    expect(marketplace).toContain('cancelOwnListing(id, req.user.sub)')
    expect(marketplace).toContain('purchaseDirect(id, body, req.user.sub)')
    expect(escrow).toContain('buyerId: req.user.sub')
    expect(escrow).toContain('markShipped(id, req.user.sub')
    expect(escrow).toContain('confirmDelivery(id, req.user.sub)')
    expect(escrow).toContain('openDispute(id, req.user.sub')
  })

  it.each([
    ['AI user predictions', '../ai-engine/ai-engine.controller.ts', 'findPredictionsByUser'],
    ['AI user recommendations', '../ai-engine/ai-engine.controller.ts', 'findRecommendations'],
    ['custom designs by user', '../custom-builder/custom-builder.controller.ts', 'findDesignsByUser'],
    ['custom quotes by user', '../custom-builder/custom-builder.controller.ts', 'findQuotesByUser'],
    ['notifications by user', '../notifications/notifications.controller.ts', 'findByUser'],
    ['smart vault assets by user', '../smart-vault/smart-vault.controller.ts', 'findAssets'],
    ['smart vault alerts by user', '../smart-vault/smart-vault.controller.ts', 'findAlerts'],
    ['subscriptions by user', '../subscriptions/subscriptions.controller.ts', 'findUserSubscriptions'],
  ])('%s is authenticated and uses the JWT subject', (_label, relativeFile, method) => {
    const decorators = methodPolicy(relativeFile, method)
    expect(decorators).toContain('JwtAuthGuard')
  })

  it('prevents user-scoped reads from trusting a path userId', () => {
    const ai = readFileSync(join(__dirname, '../ai-engine/ai-engine.controller.ts'), 'utf8')
    const customBuilder = readFileSync(join(__dirname, '../custom-builder/custom-builder.controller.ts'), 'utf8')
    const notifications = readFileSync(join(__dirname, '../notifications/notifications.controller.ts'), 'utf8')
    const smartVault = readFileSync(join(__dirname, '../smart-vault/smart-vault.controller.ts'), 'utf8')
    const subscriptions = readFileSync(join(__dirname, '../subscriptions/subscriptions.controller.ts'), 'utf8')

    expect(ai).toContain('findPredictionsByUser(request.user.sub)')
    expect(ai).toContain('findRecommendations(request.user.sub)')
    expect(customBuilder).toContain('findDesignsByUser(req.user.sub)')
    expect(customBuilder).toContain('findQuotesByUser(req.user.sub)')
    expect(notifications).toContain('findByUser(req.user.sub)')
    expect(smartVault).toContain('findAssets(req.user.sub)')
    expect(smartVault).toContain('findAlerts(req.user.sub)')
    expect(subscriptions).toContain('findUserSubscriptions(req.user.sub)')
  })
})
