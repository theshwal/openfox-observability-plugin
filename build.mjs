import { build } from 'esbuild'
import { copyFile, mkdir, rm } from 'node:fs/promises'

await rm('dist', { recursive: true, force: true })
await mkdir('dist', { recursive: true })

await build({
  entryPoints: ['src/plugin.ts'],
  outfile: 'dist/plugin.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  sourcemap: true,
})

await build({
  entryPoints: ['src/ui/main.tsx'],
  outfile: 'dist/ui.js',
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: ['es2022'],
  jsx: 'automatic',
  minify: true,
  sourcemap: true,
})

await copyFile('src/ui/dashboard.html', 'dist/dashboard.html')
await copyFile('src/ui/styles.css', 'dist/ui.css')
