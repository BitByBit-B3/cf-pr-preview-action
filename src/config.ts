import { readFileSync } from 'node:fs'

/**
 * Minimal JSONC parser: strips `//` and block comments plus trailing commas,
 * respecting JSON double-quoted strings, then JSON.parse. wrangler.jsonc is
 * JSONC, so plain JSON.parse would throw on comments.
 */
export function parseJsonc(text: string): any {
  let out = ''
  let inStr = false
  let esc = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const c2 = text[i + 1]
    if (inStr) {
      out += c
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') {
      inStr = true
      out += c
      continue
    }
    if (c === '/' && c2 === '/') {
      while (i < text.length && text[i] !== '\n') i++
      out += '\n'
      continue
    }
    if (c === '/' && c2 === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++
      i += 1
      continue
    }
    out += c
  }
  out = out.replace(/,(\s*[}\]])/g, '$1')
  return JSON.parse(out)
}

export function readConfig(path: string): any {
  return parseJsonc(readFileSync(path, 'utf8'))
}

/**
 * Return the named env block (e.g. env.main). Falls back to the top-level
 * config when envKey is empty or the block is absent, so single-env configs
 * still work.
 */
export function getEnvBlock(cfg: any, envKey: string): any {
  if (envKey && cfg.env?.[envKey]) return cfg.env[envKey]
  return cfg
}

/**
 * Cloudflare-safe R2 bucket / KV title derived from the preview worker name
 * plus a binding. Lowercased, non-alnum collapsed to '-', trimmed to 63 chars
 * while preserving a stable hash tail so deploy and teardown compute the
 * identical, unique name.
 */
export function bindingResourceName(workerName: string, binding: string): string {
  const raw = `${workerName}-${binding}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (raw.length <= 63) return raw
  let h = 0
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0
  const tail = `-${h.toString(36)}`
  return raw.slice(0, 63 - tail.length) + tail
}

export interface KvBinding {
  binding: string
  id: string
}

export interface R2Binding {
  binding: string
  bucket_name: string
  remote: boolean
}

export interface RenderInput {
  cfg: any
  envBlock: any
  workerName: string
  dbName: string
  dbId: string
  d1Binding: string
  migrationsDir: string
  kvNamespaces: KvBinding[]
  r2Buckets: R2Binding[]
  configEnv: string
  url: string
  urlVars: string[]
}

/**
 * Build the ephemeral wrangler.preview.jsonc object: the source worker config
 * rebound to the per-PR worker name and isolated D1/KV/R2 resources, deployed
 * on a workers.dev subdomain. Custom domains / routes are intentionally dropped.
 */
export function renderPreviewConfig(i: RenderInput): any {
  const originalName = i.envBlock.name ?? i.cfg.name
  const services = Array.isArray(i.envBlock.services)
    ? i.envBlock.services.map((s: any) =>
        s.service === originalName ? { ...s, service: i.workerName } : s,
      )
    : undefined

  // Merge global (top-level) vars first, then let the named env block override
  // them. Wrangler does not inherit top-level vars into named envs, so a preview
  // rendered from env.<config-env> would otherwise lose any global vars — merge
  // them back in so the preview worker sees the same vars a normal deploy would.
  const vars = {
    ...(i.cfg.vars ?? {}),
    ...(i.envBlock.vars ?? {}),
    TARGET_ENV: i.configEnv,
    CF_WORKER_NAME: i.workerName,
  }
  for (const v of i.urlVars) vars[v] = i.url

  const out: Record<string, any> = {
    $schema: i.cfg.$schema,
    name: i.workerName,
    main: i.cfg.main,
    compatibility_date: i.cfg.compatibility_date,
    compatibility_flags: i.cfg.compatibility_flags,
    build: i.cfg.build,
    assets: i.cfg.assets,
    workers_dev: true,
    preview_urls: true,
    observability: i.cfg.observability ?? i.envBlock.observability,
    placement: i.cfg.placement ?? i.envBlock.placement,
    d1_databases: [
      {
        binding: i.d1Binding,
        database_name: i.dbName,
        database_id: i.dbId,
        remote: true,
        migrations_dir: i.migrationsDir,
      },
    ],
    r2_buckets: i.r2Buckets,
    kv_namespaces: i.kvNamespaces,
    images: i.cfg.images ?? i.envBlock.images,
    vars,
    services,
  }

  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k]
  return out
}
