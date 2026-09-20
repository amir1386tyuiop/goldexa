import { Client } from 'pg'

export const baseUrl = (process.env.E2E_BASE_URL || '').replace(/\/$/, '')
export const e2e = baseUrl ? describe : describe.skip

export type ApiResult<T = unknown> = {
  status: number
  body: T
  headers: Headers
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const response = await fetch(`${baseUrl}${path}`, init)
  const text = await response.text()
  let body: T
  try {
    body = (text ? JSON.parse(text) : undefined) as T
  } catch {
    body = text as T
  }
  return { status: response.status, body, headers: response.headers }
}

export function jsonHeaders(token?: string): HeadersInit {
  return {
    'content-type': 'application/json',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  }
}

export function jsonBody(value: unknown, token?: string): RequestInit {
  return { method: 'POST', headers: jsonHeaders(token), body: JSON.stringify(value) }
}

export function uniquePhone(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9)
  return `09${suffix}`
}

export async function createAndLogin(label: string) {
  const phone = uniquePhone()
  const clientIp = `10.250.0.${(Array.from(label).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 240) + 10}`
  const clientHeaders = { ...jsonHeaders(), 'x-forwarded-for': clientIp }
  const created = await api<{ id: string }>('/users', { ...jsonBody({ name: `E2E ${label}`, phone }), headers: clientHeaders })
  expect(created.status).toBe(201)

  const otp = await api<{ otp?: string }>('/auth/request-otp', { ...jsonBody({ phone }), headers: clientHeaders })
  expect(otp.status).toBe(201)
  if (!otp.body?.otp) {
    throw new Error('E2E requires RETURN_OTP_IN_RESPONSE=true on the isolated test backend')
  }

  const login = await api<{ user: { id: string }; accessToken: string }>('/auth/login', { ...jsonBody({ phone, otp: otp.body.otp }), headers: clientHeaders })
  expect(login.status).toBe(201)
  expect(login.body.accessToken).toBeTruthy()
  return { phone, userId: login.body.user.id, token: login.body.accessToken }
}

function testDatabaseName(): string {
  return process.env.DB_DATABASE || ''
}

export function databaseFixturesEnabled(): boolean {
  const name = testDatabaseName().toLowerCase()
  return process.env.E2E_ALLOW_DB_FIXTURES === '1' && /(?:test|e2e)/.test(name) && !/(?:prod|production|goldeksa$)/.test(name)
}

export async function seedWalletFixture(userId: string, balance: number): Promise<void> {
  if (!databaseFixturesEnabled()) {
    throw new Error('Wallet E2E fixtures require E2E_ALLOW_DB_FIXTURES=1 and a DB_DATABASE containing test/e2e')
  }

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: testDatabaseName(),
  })

  await client.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM wallet_transactions WHERE user_id = $1', [userId])
    await client.query(
      `INSERT INTO wallets (user_id, balance, gold_balance_grams, is_active)
       VALUES ($1, $2, 0, true)
       ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance, gold_balance_grams = 0, is_active = true`,
      [userId, balance],
    )
    const wallet = await client.query('SELECT id FROM wallets WHERE user_id = $1', [userId])
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, amount_grams, description)
       VALUES ($1, $2, 'deposit', $3, 0, 'E2E fixture — never use outside test database')`,
      [wallet.rows[0].id, userId, balance],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    await client.end()
  }
}
