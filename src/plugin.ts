type LocalizedString = { en: string; fr: string }

interface PluginRegistry {
  registerUiAction(action: {
    id: string
    slot: string
    label: LocalizedString
    icon?: string
    variant?: 'default' | 'primary' | 'danger' | 'ghost'
    tooltip?: LocalizedString
    visibleWhen?: { hasSession?: boolean; hasProject?: boolean; hasMessage?: boolean }
    onActivate: { kind: 'openPanel'; panelId: string }
  }): void
  registerUiPanel(panel: {
    id: string
    title: LocalizedString
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    kind: 'iframe'
    url: string
  }): void
  registerAsset(relativePath: string): void
}

const CHART_ICON =
  'M4 19V9m5 10V5m5 14v-7m5 7V3M3 21h18'

export function register(registry: PluginRegistry): void {
  registry.registerUiAction({
    id: 'observability-open',
    slot: 'session.header.actions',
    label: { en: 'Observability', fr: 'Observabilité' },
    tooltip: {
      en: 'Inspect cache, context and agent activity',
      fr: 'Inspecter le cache, le contexte et l’activité agent',
    },
    icon: CHART_ICON,
    variant: 'ghost',
    visibleWhen: { hasSession: true },
    onActivate: { kind: 'openPanel', panelId: 'observability-dashboard' },
  })

  registry.registerUiPanel({
    id: 'observability-dashboard',
    title: { en: 'Session observability', fr: 'Observabilité de session' },
    size: 'full',
    kind: 'iframe',
    url: 'dashboard.html',
  })

  registry.registerAsset('dashboard.html')
  registry.registerAsset('ui.js')
  registry.registerAsset('ui.css')
}
