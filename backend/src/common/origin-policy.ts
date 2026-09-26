const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Bearer-token clients do not rely on cookies for authorization, but rejecting
 * unknown browser origins on state-changing requests is still useful defense in
 * depth for admin forms, accidental credential forwarding and future cookies.
 * Requests without an Origin are kept valid for mobile apps and server-to-server
 * callbacks; CORS remains the browser-facing policy.
 */
export function isUnsafeMethod(method: string): boolean {
  return UNSAFE_METHODS.has(method.toUpperCase())
}

export function isAllowedMutationOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true
  return allowedOrigins.includes(origin)
}
