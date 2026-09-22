# OpenFox Observability Plugin

Session-level observability for OpenFox.

The plugin adds an **Observability** action to the session header and opens a full-screen dashboard showing:

- provider-reported prompt cache reads and cache writes
- derived new-input tokens, cache hit ratio and context amplification factor (CAF)
- provider-reported logical prompt size (P50 / P95 / max)
- LLM call progression
- compactions, retries, tool calls, tool errors and sub-agent activity
- tool breakdown
- raw JSON copy for diagnostics

## Data provenance

The dashboard deliberately separates three classes of data:

- **Provider** — returned by the LLM provider, e.g. prompt tokens, cached prompt tokens and cache writes.
- **Derived** — computed only from provider-reported fields, e.g. cache hit ratio, new input and CAF.
- **OpenFox** — persisted runtime events, e.g. tools, compactions, retries and sub-agents.

Missing provider cache values are displayed as unavailable. They are never converted to zero and are never inferred from OpenFox's internal prefill increment.

## Host requirements

This plugin now has a **single OpenFox host dependency**: the consolidated session-observability bridge in `theshwal/openfox` PR #15.

That bridge contains the OpenFox-only capabilities the plugin cannot reconstruct itself:

- provider-reported cache attribution preserved through the LLM/stat pipeline
- persisted session activity/history in `GET /api/sessions/:id/stats`
- `sessionId`, `projectId` and `workdir` propagation when an iframe plugin panel is opened

The dashboard itself, its calculations and all presentation logic remain in this repository. The plugin never reads OpenFox's SQLite database directly.

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
        ├── provider cache / logical prompt call data
        └── OpenFox persisted event rollup
```

The plugin does not read OpenFox's SQLite database and does not depend on private server internals.

## License

MIT
