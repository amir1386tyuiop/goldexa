#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const sourceRoot = path.resolve(process.cwd(), 'backend', 'src')
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
    const mutation = line.match(mutationDecorators)
    if (!mutation) return
    const route = routePath(controller, mutation[1])
    const window = lines.slice(Math.max(0, index - 8), Math.min(lines.length, index + 4)).join('\n')
    const guarded = classGuarded || guardedTokens.some((token) => window.includes(token))
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
