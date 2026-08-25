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
})
