import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { computeCacheMetrics, computeContextMetrics } from './metrics'
import type { CallStatsDataPoint, SessionStats, StatsEnvelope } from './types'

const params = new URLSearchParams(window.location.search)
const sessionId = params.get('sessionId') ?? ''
const token = params.get('token') ?? ''

function fmtInt(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  return Math.round(value).toLocaleString()
}

function fmtPct(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(1)}%`
}

function fmtSec(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(2)}s`
}

function fmtRate(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '—' : `${Math.round(value).toLocaleString()} tok/s`
}

function Metric({
  label,
  value,
  provenance,
  hint,
}: {
  label: string
  value: string
  provenance: 'Provider' | 'Derived' | 'OpenFox'
  hint?: string
}) {
  return (
    <div className="metric">
      <div className="metric-top">
        <span>{label}</span>
        <span className={`prov prov-${provenance.toLowerCase()}`}>{provenance}</span>
      </div>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  )
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="empty-chart">No explicit context-size series available</div>
  const width = 900
  const height = 220
  const max = Math.max(...values, 1)
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width
      const y = height - (value / max) * (height - 16) - 8
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Context size by LLM call">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function cacheHit(call: CallStatsDataPoint): string {
  if (call.cacheSource !== 'provider' || call.cachedPromptTokens === undefined || call.promptTokens <= 0) return '—'
  return fmtPct((call.cachedPromptTokens / call.promptTokens) * 100)
}

function App() {
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [copyState, setCopyState] = useState('Copy JSON')

  const load = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/stats`, {
        headers: token ? { 'x-session-token': token } : {},
      })
      const body = (await response.json()) as StatsEnvelope & { error?: string }
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`)
      setStats(body.stats)
      setError('')
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 5000)
    return () => window.clearInterval(timer)
  }, [load])

  const cache = useMemo(() => (stats ? computeCacheMetrics(stats) : null), [stats])
  const context = useMemo(() => (stats ? computeContextMetrics(stats) : null), [stats])

  const copyJson = async () => {
    if (!stats) return
    const json = JSON.stringify({ sessionId, stats }, null, 2)
    try {
      await navigator.clipboard.writeText(json)
      setCopyState('Copied')
      window.setTimeout(() => setCopyState('Copy JSON'), 1500)
    } catch {
      setCopyState('Clipboard blocked')
    }
  }

  if (!sessionId) {
    return (
      <main className="shell">
        <div className="callout error">
          <strong>No session context received.</strong>
          <span>This panel must be opened from a session header on an OpenFox host that preserves plugin panel context.</span>
        </div>
      </main>
    )
  }

  return (
    <main className="shell">
      <header>
        <div>
          <p className="eyebrow">OPENFOX / SESSION</p>
          <h1>Observability</h1>
          <p className="session">{sessionId}</p>
        </div>
        <div className="actions">
          <span className="updated">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ''}</span>
          <button onClick={() => void copyJson()} disabled={!stats}>{copyState}</button>
          <button className="primary" onClick={() => void load()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
        </div>
      </header>

      {error ? <div className="callout error"><strong>Stats request failed.</strong><span>{error}</span></div> : null}
      {!stats && !error ? <div className="loading">Loading session statistics…</div> : null}

      {stats && cache && context ? (
        <>
          {!cache.completeProviderCoverage ? (
            <div className="callout warn">
              <strong>Provider cache coverage is partial.</strong>
              <span>
                Cache-derived metrics use only calls where the provider explicitly reported cached tokens
                ({cache.providerKnownCalls}/{cache.totalCalls} calls). Missing cache data is never treated as zero.
              </span>
            </div>
          ) : null}

          <section className="metrics">
            <Metric label="Raw prompt" value={fmtInt(cache.logicalPrompt)} provenance="Provider" hint="Logical prompt tokens across LLM calls" />
            <Metric label="Cache read" value={cache.providerKnownCalls ? fmtInt(cache.cacheRead) : '—'} provenance="Provider" />
            <Metric label="New input" value={fmtInt(cache.newInput)} provenance="Derived" hint="Prompt − provider cache read" />
            <Metric label="Cache hit" value={fmtPct(cache.cacheHitPercent)} provenance="Derived" />
            <Metric label="CAF" value={cache.caf === undefined ? '—' : `${cache.caf.toFixed(1)}×`} provenance="Derived" hint="Logical prompt / new input" />
            <Metric label="Cache write" value={fmtInt(cache.cacheWrite)} provenance="Provider" hint="N/A when provider does not report it" />
            <Metric label="Context P50" value={fmtInt(context.p50)} provenance="Provider" hint="Explicit contextSize only" />
            <Metric label="Context P95" value={fmtInt(context.p95)} provenance="Provider" />
            <Metric label="Context max" value={fmtInt(context.max)} provenance="Provider" />
            <Metric label="LLM calls" value={fmtInt(stats.llmCallCount)} provenance="OpenFox" />
            <Metric label="Compactions" value={fmtInt(stats.events.compactionCount)} provenance="OpenFox" />
            <Metric label="Tool calls" value={fmtInt(stats.events.toolCalls)} provenance="OpenFox" />
            <Metric label="Retries" value={fmtInt(stats.events.retryCount)} provenance="OpenFox" />
            <Metric label="Sub-agents" value={fmtInt(stats.events.subAgentCalls)} provenance="OpenFox" />
          </section>

          <section className="panel">
            <div className="panel-title">
              <div>
                <h2>Context progression</h2>
                <p>Explicit context size by persisted LLM call. Prompt tokens are not substituted for missing context size.</p>
              </div>
              <span>{context.values.length}/{stats.callDataPoints.length} calls</span>
            </div>
            <Sparkline values={context.values} />
          </section>

          <div className="grid-two">
            <section className="panel">
              <div className="panel-title">
                <div><h2>Agent activity</h2><p>Persisted OpenFox event rollup</p></div>
              </div>
              <div className="activity-grid">
                <div><span>Tool errors</span><strong>{fmtInt(stats.events.toolErrors)}</strong></div>
                <div><span>Compactions</span><strong>{fmtInt(stats.events.compactionCount)}</strong></div>
                <div><span>Retries</span><strong>{fmtInt(stats.events.retryCount)}</strong></div>
                <div><span>Sub-agent calls</span><strong>{fmtInt(stats.events.subAgentCalls)}</strong></div>
              </div>
              {stats.events.compactionCount > 0 && stats.events.compactionsDetailsAvailable === false ? (
                <div className="inline-note">Legacy session: compaction count is authoritative, but historical per-compaction details are incomplete.</div>
              ) : null}
            </section>

            <section className="panel">
              <div className="panel-title"><div><h2>Tools</h2><p>Calls and errors by tool</p></div></div>
              {stats.events.toolBreakdown.length ? (
                <table>
                  <thead><tr><th>Tool</th><th>Category</th><th>Calls</th><th>Errors</th></tr></thead>
                  <tbody>
                    {stats.events.toolBreakdown.slice(0, 12).map((tool) => (
                      <tr key={tool.toolName}>
                        <td>{tool.toolName}</td><td>{tool.category}</td><td>{fmtInt(tool.count)}</td><td>{fmtInt(tool.errors)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="empty">No tool activity persisted.</div>}
            </section>
          </div>

          <section className="panel">
            <div className="panel-title">
              <div><h2>LLM calls</h2><p>Latest persisted calls, provider attribution kept explicit</p></div>
              <span>{stats.callDataPoints.length} total</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Model</th><th>Context</th><th>Prompt</th><th>Cache read</th><th>New</th><th>Hit</th><th>TTFT</th><th>Prefill</th><th>Gen</th><th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {[...stats.callDataPoints].slice(-40).reverse().map((call) => {
                    const providerKnown = call.cacheSource === 'provider' && call.cachedPromptTokens !== undefined
                    const fresh = providerKnown ? Math.max(0, call.promptTokens - (call.cachedPromptTokens ?? 0)) : undefined
                    return (
                      <tr key={`${call.messageId}:${call.sessionCallIndex}`}>
                        <td>{call.sessionCallIndex}</td>
                        <td><strong>{call.model}</strong><small>{call.providerName}</small></td>
                        <td>{fmtInt(call.contextSize)}</td>
                        <td>{fmtInt(call.promptTokens)}</td>
                        <td>{providerKnown ? fmtInt(call.cachedPromptTokens) : '—'}</td>
                        <td>{fmtInt(fresh)}</td>
                        <td>{cacheHit(call)}</td>
                        <td>{fmtSec(call.ttft)}</td>
                        <td>{fmtRate(call.prefillSpeed)}</td>
                        <td>{fmtRate(call.generationSpeed)}</td>
                        <td><span className={`prov prov-${call.cacheSource === 'provider' ? 'provider' : 'openfox'}`}>{call.cacheSource ?? 'unavailable'}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
