import type { CallStatsDataPoint, SessionStats } from './types'

export interface CacheMetrics {
  logicalPrompt: number
  cacheRead: number
  cacheWrite?: number
  newInput?: number
  cacheHitPercent?: number
  caf?: number
  providerKnownCalls: number
  totalCalls: number
  completeProviderCoverage: boolean
}

export interface ContextMetrics {
  p50?: number
  p95?: number
  max?: number
  values: number[]
}

export function computeCacheMetrics(stats: SessionStats): CacheMetrics {
  const calls = stats.callDataPoints ?? []
  let logicalPrompt = 0
  let cacheRead = 0
  let cacheWrite = 0
  let sawCacheWrite = false
  let knownPrompt = 0
  let knownNew = 0
  let providerKnownCalls = 0

  for (const call of calls) {
    logicalPrompt += call.promptTokens || 0
    const providerKnown =
      call.cacheSource === 'provider' &&
      typeof call.cachedPromptTokens === 'number'

    if (providerKnown) {
      const cached = Math.max(0, call.cachedPromptTokens ?? 0)
      const prompt = Math.max(0, call.promptTokens || 0)
      providerKnownCalls += 1
      cacheRead += cached
      knownPrompt += prompt
      knownNew += Math.max(0, prompt - cached)
    }

    if (call.cacheSource === 'provider' && typeof call.cacheWriteTokens === 'number') {
      sawCacheWrite = true
      cacheWrite += Math.max(0, call.cacheWriteTokens)
    }
  }

  const totalCalls = calls.length
  const completeProviderCoverage = totalCalls > 0 && providerKnownCalls === totalCalls
  const cacheHitPercent = knownPrompt > 0 ? (cacheRead / knownPrompt) * 100 : undefined
  const newInput = providerKnownCalls > 0 ? knownNew : undefined
  const caf = newInput && newInput > 0 ? logicalPrompt / newInput : undefined

  return {
    logicalPrompt: logicalPrompt || stats.prefillTokens || 0,
    cacheRead,
    ...(sawCacheWrite ? { cacheWrite } : {}),
    ...(newInput !== undefined ? { newInput } : {}),
    ...(cacheHitPercent !== undefined ? { cacheHitPercent } : {}),
    ...(caf !== undefined ? { caf } : {}),
    providerKnownCalls,
    totalCalls,
    completeProviderCoverage,
  }
}

function percentile(sorted: number[], p: number): number | undefined {
  if (sorted.length === 0) return undefined
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))
  return sorted[idx]
}

export function computeContextMetrics(stats: SessionStats): ContextMetrics {
  const values = (stats.callDataPoints ?? [])
    .map((call) => call.contextSize)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0)
  const sorted = [...values].sort((a, b) => a - b)
  return {
    values,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    max: sorted.length ? sorted[sorted.length - 1] : undefined,
  }
}
