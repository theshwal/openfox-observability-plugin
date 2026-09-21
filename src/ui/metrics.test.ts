import { describe, expect, it } from 'vitest'
import { computeCacheMetrics, computeContextMetrics } from './metrics'
import type { SessionStats } from './types'

function stats(): SessionStats {
  return {
    totalTime: 1,
    aiTime: 1,
    toolTime: 0,
    prefillTokens: 150,
    generationTokens: 10,
    avgPrefillSpeed: 1,
    avgGenerationSpeed: 1,
    responseCount: 1,
    llmCallCount: 2,
    events: {
      compactions: [],
      retries: [],
      toolCalls: 0,
      toolErrors: 0,
      toolBreakdown: [],
      subAgentCalls: 0,
      compactionCount: 0,
      retryCount: 0,
    },
    callDataPoints: [
      {
        messageId: 'm1',
        timestamp: '2026-01-01T00:00:00Z',
        providerId: 'p',
        providerName: 'Provider',
        backend: 'openai',
        model: 'm',
        mode: 'builder',
        responseIndex: 1,
        sessionCallIndex: 1,
        callIndex: 1,
        promptTokens: 100,
        completionTokens: 5,
        ttft: 1,
        completionTime: 1,
        prefillSpeed: 1,
        generationSpeed: 1,
        totalTime: 2,
        cachedPromptTokens: 90,
        cacheSource: 'provider',
        contextSize: 100,
      },
      {
        messageId: 'm1',
        timestamp: '2026-01-01T00:00:01Z',
        providerId: 'p',
        providerName: 'Provider',
        backend: 'openai',
        model: 'm',
        mode: 'builder',
        responseIndex: 1,
        sessionCallIndex: 2,
        callIndex: 2,
        promptTokens: 50,
        completionTokens: 5,
        ttft: 1,
        completionTime: 1,
        prefillSpeed: 1,
        generationSpeed: 1,
        totalTime: 2,
        cachedPromptTokens: 40,
        cacheSource: 'provider',
        contextSize: 200,
      },
    ],
  }
}

describe('observability metrics', () => {
  it('derives provider cache metrics without using OpenFox prefill increments', () => {
    const result = computeCacheMetrics(stats())
    expect(result.logicalPrompt).toBe(150)
    expect(result.cacheRead).toBe(130)
    expect(result.newInput).toBe(20)
    expect(result.cacheHitPercent).toBeCloseTo(86.666, 2)
    expect(result.caf).toBe(7.5)
    expect(result.completeProviderCoverage).toBe(true)
  })

  it('uses explicit contextSize only for context percentiles', () => {
    const result = computeContextMetrics(stats())
    expect(result.p50).toBe(100)
    expect(result.p95).toBe(200)
    expect(result.max).toBe(200)
  })

  it('marks provider cache coverage partial when a call has no provider cache attribution', () => {
    const input = stats()
    input.callDataPoints[1]!.cachedPromptTokens = undefined
    input.callDataPoints[1]!.cacheSource = 'unavailable'
    const result = computeCacheMetrics(input)
    expect(result.providerKnownCalls).toBe(1)
    expect(result.completeProviderCoverage).toBe(false)
    expect(result.cacheRead).toBe(90)
    expect(result.newInput).toBe(10)
  })
})
