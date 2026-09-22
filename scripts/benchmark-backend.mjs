#!/usr/bin/env node

const baseUrl = (process.env.BENCHMARK_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')
const path = process.env.BENCHMARK_PATH || '/health'
const requests = Math.max(1, Number(process.env.BENCHMARK_REQUESTS || 100))
const concurrency = Math.max(1, Math.min(requests, Number(process.env.BENCHMARK_CONCURRENCY || 10)))
const p95LimitMs = Math.max(1, Number(process.env.BENCHMARK_P95_LIMIT_MS || 200))

const samples = []
let next = 0
let failures = 0

async function worker() {
  while (true) {
    const index = next++
    if (index >= requests) return
    const started = performance.now()
    try {
      const response = await fetch(`${baseUrl}${path}`, { headers: { accept: 'application/json' } })
      if (!response.ok) failures += 1
      else await response.arrayBuffer()
    } catch {
      failures += 1
    } finally {
      samples.push(performance.now() - started)
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker))
samples.sort((a, b) => a - b)
const percentile = (value) => samples[Math.min(samples.length - 1, Math.ceil(samples.length * value) - 1)]
const result = {
  url: `${baseUrl}${path}`,
  requests,
  concurrency,
  failures,
  p50Ms: Number(percentile(0.5).toFixed(2)),
  p95Ms: Number(percentile(0.95).toFixed(2)),
  maxMs: Number(samples[samples.length - 1].toFixed(2)),
  p95LimitMs,
}
console.log(JSON.stringify(result, null, 2))

if (failures > 0 || result.p95Ms > p95LimitMs) {
  process.exitCode = 1
}
