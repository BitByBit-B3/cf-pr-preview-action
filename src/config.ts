import { readFileSync } from 'node:fs'
import { parse } from 'jsonc-parser'

export function parseJsonc(text: string): any {
  return parse(text, [], { allowTrailingComma: true })
}

export function readConfig(path: string): any {
  return parseJsonc(readFileSync(path, 'utf8'))
}

export function getEnvBlock(cfg: any, envKey: string): any {
  if (envKey && cfg.env?.[envKey]) return cfg.env[envKey]
  return cfg
}

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

export function renderPreviewConfig(i: RenderInput): any {
  const originalName = i.envBlock.name ?? i.cfg.name
  const services = Array.isArray(i.envBlock.services)
    ? i.envBlock.services.map((s: any) =>
        s.service === originalName ? { ...s, service: i.workerName } : s,
      )
    : undefined

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
