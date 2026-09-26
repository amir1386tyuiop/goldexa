import { isAllowedMutationOrigin, isUnsafeMethod } from './origin-policy'

describe('mutation origin policy', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'post'])('classifies %s as unsafe', (method) => {
    expect(isUnsafeMethod(method)).toBe(true)
  })

  it.each(['GET', 'HEAD', 'OPTIONS'])('does not classify %s as unsafe', (method) => {
    expect(isUnsafeMethod(method)).toBe(false)
  })

  it('allows native/server requests without an Origin header', () => {
    expect(isAllowedMutationOrigin(undefined, ['https://goldexa.example'])).toBe(true)
  })

  it('allows only explicitly configured origins', () => {
    const allowed = ['https://goldexa.example', 'http://localhost:5174']
    expect(isAllowedMutationOrigin('http://localhost:5174', allowed)).toBe(true)
    expect(isAllowedMutationOrigin('https://evil.example', allowed)).toBe(false)
  })
})
