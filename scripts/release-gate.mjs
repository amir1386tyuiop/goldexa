#!/usr/bin/env node

const backendUrl = (process.env.RELEASE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '')
const frontendUrl = (process.env.RELEASE_FRONTEND_URL || 'http://localhost:5174').replace(/\/$/, '')
const aiUrl = (process.env.RELEASE_AI_URL || 'http://localhost:8000').replace(/\/$/, '')

const backendChecks = [
  ['/health/ready', 'آمادگی سرویس‌ها'],
  ['/health', 'سلامت API'],
  ['/products/home', 'کاتالوگ محصولات'],
  ['/gold-pricing/status', 'وضعیت قیمت طلا'],
]
// These are SPA entry points, so the gate verifies that every product area is
// served by the deployed frontend. Authenticated pages intentionally return
// the shell here; API authorization is covered by the backend security/E2E
// suites.
const frontendChecks = [
  '/',
  '/login',
  '/home',
  '/shop',
  '/product/release-smoke',
  '/checkout',
  '/ar',
  '/auctions',
  '/marketplace',
  '/builder',
  '/ai-workspace',
  '/ai-engine',
  '/pricing',
  '/wallet',
  '/orders',
  '/group-buying',
  '/escrow',
  '/admin',
  '/dashboard',
]
const failures = []

async function check(url, label, validate) {
  try {
    const response = await fetch(url, { headers: { accept: 'application/json,text/html' } })
    const body = await response.text()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    if (validate) validate(body)
    console.log(`PASS ${label}: ${response.status} ${url}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push(`${label}: ${message}`)
    console.error(`FAIL ${label}: ${message}`)
  }
}

for (const [path, label] of backendChecks) {
  await check(`${backendUrl}${path}`, label, path === '/health/ready' ? (body) => {
    const payload = JSON.parse(body)
    if (payload.ready !== true || payload.status !== 'ready') throw new Error('سرویس آماده نیست')
  } : undefined)
}

for (const path of frontendChecks) await check(`${frontendUrl}${path}`, `فرانت ${path}`)

await check(`${aiUrl}/health`, 'سلامت سرویس AI', (body) => {
  const payload = JSON.parse(body)
  if (payload.status !== 'healthy' || payload.service !== 'goldexa-ai-service') throw new Error('AI service healthy نیست')
  if (!payload.models || typeof payload.models !== 'object') throw new Error('وضعیت مدل‌های AI گزارش نشده است')
})

if (failures.length) {
  console.error(`\nRelease gate failed (${failures.length}):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log('\nRelease gate passed: backend readiness, pricing, catalog, AI health, frontend routes.')
}
