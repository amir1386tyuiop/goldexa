import { api } from './client'

/** Authentication and user-session API facade. */
export const authApi = {
  requestOtp: api.requestOtp,
  loginWithOtp: api.loginWithOtp,
  refreshToken: api.refreshToken,
  registerUser: api.registerUser,
}

export type { AuthTokenPayload, OtpResponse, UserRole } from '@/types'
