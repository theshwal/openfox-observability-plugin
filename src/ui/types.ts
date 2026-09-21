export type CacheSource = 'provider' | 'estimated' | 'unavailable'

export interface CallStatsDataPoint {
  messageId: string
  timestamp: string
  providerId: string
  providerName: string
  backend: string
  model: string
  mode: string
  responseIndex: number
  sessionCallIndex: number
  callIndex: number
  promptTokens: number
  completionTokens: number
  ttft: number
  completionTime: number
  prefillSpeed: number
  generationSpeed: number
  totalTime: number
  cachedPromptTokens?: number
  cacheWriteTokens?: number
  cacheSource?: CacheSource
  contextSize?: number
  retries?: number
}

export interface CompactionRecord {
  timestamp: number
  closedWindowId: string
  newWindowId: string
  beforeTokens: number
  afterTokens: number
  reduction: number
  reductionPercent: number
  subAgentId?: string
  subAgentType?: string
}

export interface RetryRecord {
  timestamp: number
  type: 'pattern' | 'truncation' | 'continuation'
  reason?: string
  pattern?: string
  responseIndex?: number
  attempt?: number
  maxAttempts?: number
}

export interface ToolEntry {
  toolName: string
  category: string
  count: number
  errors: number
}

export interface SessionEventRollup {
  compactions: CompactionRecord[]
  retries: RetryRecord[]
  toolCalls: number
  toolErrors: number
  toolBreakdown: ToolEntry[]
  subAgentCalls: number
  compactionCount: number
  retryCount: number
  compactionsDetailsAvailable?: boolean
}

export interface SessionStats {
  totalTime: number
  aiTime: number
  toolTime: number
  prefillTokens: number
  generationTokens: number
  avgPrefillSpeed: number
  avgGenerationSpeed: number
  responseCount: number
  llmCallCount: number
  callDataPoints: CallStatsDataPoint[]
  events: SessionEventRollup
}

export interface StatsEnvelope {
  stats: SessionStats | null
}
