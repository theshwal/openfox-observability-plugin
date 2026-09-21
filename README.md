# OpenFox Observability Plugin

Session-level observability for OpenFox.

The plugin adds an **Observability** action to the session header and opens a full-screen dashboard showing:

- provider-reported prompt cache reads and cache writes
- derived new-input tokens, cache hit ratio and context amplification factor (CAF)
- explicit per-call context size (P50 / P95 / max)
- LLM call progression
- compactions, retries, tool calls, tool errors and sub-agent activity
- tool breakdown
- raw JSON copy for diagnostics

## Data provenance

The dashboard deliberately separates three classes of data:

- **Provider** — returned by the LLM provider, e.g. prompt tokens, cached prompt tokens, cache writes and explicit context size.
- **Derived** — computed only from provider-reported fields, e.g. cache hit ratio, new input and CAF.
- **OpenFox** — persisted runtime events, e.g. tools, compactions, retries and sub-agents.

Missing provider cache values are displayed as unavailable. They are never converted to zero and are never inferred from OpenFox's internal prefill increment.

## Host requirements

This plugin expects the OpenFox observability foundation currently developed in:

- `theshwal/openfox` PR #8 — provider cache/context fields and historical session event rollup
- `theshwal/openfox` PR #9 — preserves session context when opening iframe plugin panels

The panel requires `sessionId` in its iframe query string. Without PR #9 (or equivalent upstream support), the dashboard shows a clear "No session context received" message rather than guessing the active session.

## Install from GitHub

OpenFox can build plugins after cloning them.

In **Settings → Plugins**, install:

```
https://github.com/theshwal/openfox-observability-plugin
```

OpenFox will run:

```bash
npm install
npm run build
```

The built plugin entry is `dist/plugin.js`; iframe assets are `dist/dashboard.html`, `dist/ui.js`, and `dist/ui.css`.

## Local development

Requires Node 24+.

```bash
npm install
npm run check
```

To test against an OpenFox development build, install the local repository path from **Settings → Plugins**.

## Architecture

```text
session.header.actions
        │
        ▼
openPanel(observability-dashboard)
        │ sessionId / projectId / workdir
        ▼
sandboxed iframe
        │ x-session-token
        ▼
GET /api/sessions/:sessionId/stats
        │
        ├── provider cache/context call data
        └── OpenFox persisted event rollup
```

The plugin does not read OpenFox's SQLite database and does not depend on private server internals.

## License

MIT
