#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const sourceRoot = path.resolve(process.cwd(), 'backend', 'src')
const routeDecorators = /@(?:Get|Post|Put|Patch|Delete)\s*\(([^)]*)\)/
const mutationDecorators = /@(?:Post|Put|Patch|Delete)\s*\(([^)]*)\)/
const controllerDecorator = /@Controller\s*\(\s*['"]?([^'")\s]*)/
const guardedTokens = ['JwtAuthGuard', 'AdminGuard', 'PermissionsGuard']
const publicMutations = new Set([
  'auth:request-otp',
  'auth:login',
  'auth:refresh',
  'auth:logout',
  'users:',
  'pricing:calculate/:category',
  'pricing:quote/:category',
])
// Community profile reads are intentionally public. Every other route that
// exposes a userId in its path must carry an auth/ownership policy.
const publicUserScopedReads = new Set([
  'community-extensions:follows/:userId',
  'community-extensions:badges/:userId',
])

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? collectFiles(fullPath) : entry.name.endsWith('.controller.ts') ? [fullPath] : []
  })
}

function routePath(controller, decoratorArgs) {
  const raw = decoratorArgs.trim()
  if (!raw) return controller
  const match = raw.match(/^['"]([^'"]*)['"]$/)
  return `${controller}:${match ? match[1] : ''}`
}

const findings = []
for (const file of collectFiles(sourceRoot)) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  const source = lines.join('\n')
  const controllerMatch = source.match(controllerDecorator)
  const controller = controllerMatch?.[1] || ''
  const classStart = source.indexOf('export class')
  const classPrefix = classStart >= 0 ? source.slice(Math.max(0, source.lastIndexOf('@Controller', classStart)), classStart) : ''
  const classGuarded = guardedTokens.some((token) => classPrefix.includes(token))

  lines.forEach((line, index) => {
    const routeMatch = line.match(routeDecorators)
    if (!routeMatch) return
    const route = routePath(controller, routeMatch[1])
    const userScoped = line.match(/@(?:Get|Post|Put|Patch|Delete)\s*\(([^)]*userId[^)]*)\)/)
    const window = lines.slice(Math.max(0, index - 8), Math.min(lines.length, index + 4)).join('\n')
    const guarded = classGuarded || guardedTokens.some((token) => window.includes(token))

    if (userScoped) {
      const userRoute = routePath(controller, userScoped[1])
      if (!guarded && !publicUserScopedReads.has(userRoute)) {
        findings.push(`${path.relative(process.cwd(), file)}:${index + 1} unguarded user-scoped route ${userRoute}`)
      }
    }

    const mutation = line.match(mutationDecorators)
    if (!mutation) return
    if (!guarded && !publicMutations.has(route)) {
      findings.push(`${path.relative(process.cwd(), file)}:${index + 1} ${route}`)
    }
  })
}

if (findings.length) {
  console.error('Ungarded state-changing routes found:')
  findings.forEach((finding) => console.error(`- ${finding}`))
  process.exitCode = 1
} else {
  console.log(`Route guard audit passed: ${collectFiles(sourceRoot).length} controllers checked.`)
}
