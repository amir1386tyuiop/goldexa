import 'reflect-metadata'
import { ExecutionContext } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Reflector } from '@nestjs/core'
import { AdminGuard } from './admin.guard'
import { JwtAuthGuard } from './jwt-auth.guard'
import { OwnerGuard } from './owner.guard'

function httpContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext
}

describe('security guard primitives', () => {
  it('rejects missing and malformed bearer tokens', () => {
    const jwt = { verify: jest.fn(() => { throw new Error('bad token') }) } as unknown as JwtService
    const guard = new JwtAuthGuard(jwt)

    expect(() => guard.canActivate(httpContext({ headers: {} }))).toThrow()
    expect(() => guard.canActivate(httpContext({ headers: { authorization: 'Bearer bad' } }))).toThrow()
    expect(jwt.verify).toHaveBeenCalledTimes(1)
  })

  it('attaches a verified JWT user to the request', () => {
    const jwt = { verify: jest.fn(() => ({ sub: 'user-1', role: 'user' })) } as unknown as JwtService
    const request = { headers: { authorization: 'Bearer valid' } }
    const guard = new JwtAuthGuard(jwt)

    expect(guard.canActivate(httpContext(request))).toBe(true)
    expect(request).toEqual(expect.objectContaining({ user: { sub: 'user-1', role: 'user' } }))
  })

  it('allows only the owner or an admin', () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => undefined),
    } as unknown as Reflector
    const guard = new OwnerGuard(reflector)
    const context = (request: Record<string, unknown>) => ({
      ...httpContext(request),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as unknown as ExecutionContext

    expect(
      guard.canActivate(context({ user: { sub: 'user-1', role: 'user' }, params: { userId: 'user-1' }, body: {} })),
    ).toBe(true)

    expect(() => guard.canActivate(context({
      user: { sub: 'user-1', role: 'user' },
      params: { userId: 'user-2' },
      body: {},
    }))).toThrow()

    expect(
      guard.canActivate(context({
        user: { sub: 'admin-1', role: 'admin' },
        params: { userId: 'user-2' },
        body: {},
      })),
    ).toBe(true)
  })

  it('rejects non-admin users from admin-only operations', () => {
    const guard = new AdminGuard()

    expect(() => guard.canActivate(httpContext({ user: undefined }))).toThrow()
    expect(() => guard.canActivate(httpContext({ user: { sub: 'user-1', role: 'user' } }))).toThrow()
    expect(guard.canActivate(httpContext({ user: { sub: 'admin-1', role: 'admin' } }))).toBe(true)
  })
})
