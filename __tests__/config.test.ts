import { expect, test, describe } from 'bun:test'
import { parseJsonc, getEnvBlock, bindingResourceName, renderPreviewConfig } from '../src/config'

describe('parseJsonc', () => {
  test('strips line and block comments and trailing commas', () => {
    const src = `{
      // leading comment
      "a": 1, /* inline */
      "b": "http://x//y", // url has // inside a string
      "c": [1, 2,],
    }`
    expect(parseJsonc(src)).toEqual({ a: 1, b: 'http://x//y', c: [1, 2] })
  })

  test('keeps // inside strings', () => {
    expect(parseJsonc('{"u":"a//b"}')).toEqual({ u: 'a//b' })
  })
})

describe('getEnvBlock', () => {
  test('returns named env block', () => {
    const cfg = { name: 'root', env: { main: { name: 'main-x' } } }
    expect(getEnvBlock(cfg, 'main').name).toBe('main-x')
  })
  test('falls back to top level', () => {
    const cfg = { name: 'root' }
    expect(getEnvBlock(cfg, 'main').name).toBe('root')
  })
})

describe('bindingResourceName', () => {
  test('sanitizes and lowercases', () => {
    expect(bindingResourceName('app-preview-pr-12', 'STORAGE_BUCKET')).toBe(
      'app-preview-pr-12-storage-bucket',
    )
  })
  test('stays within 63 chars and stays deterministic', () => {
    const worker = 'a'.repeat(60)
    const a = bindingResourceName(worker, 'SOME_BINDING')
    const b = bindingResourceName(worker, 'SOME_BINDING')
    expect(a.length).toBeLessThanOrEqual(63)
    expect(a).toBe(b)
  })
})

describe('renderPreviewConfig', () => {
  const cfg = {
    $schema: 's',
    name: 'app',
    main: 'src/index.ts',
    compatibility_date: '2025-09-23',
    env: {
      main: {
        name: 'app-main',
        d1_databases: [{ binding: 'DB', migrations_dir: 'migrations' }],
        vars: { NODE_ENV: 'production' },
        services: [{ binding: 'SELF', service: 'app-main' }],
      },
    },
  }
  const out = renderPreviewConfig({
    cfg,
    envBlock: cfg.env.main,
    workerName: 'app-preview-pr-7',
    dbName: 'app-db-pr-7',
    dbId: 'uuid-7',
    d1Binding: 'DB',
    migrationsDir: 'migrations',
    kvNamespaces: [{ binding: 'CACHE', id: 'kv7' }],
    r2Buckets: [{ binding: 'STORE', bucket_name: 'b7', remote: true }],
    configEnv: 'main',
    url: 'https://app-preview-pr-7.acc.workers.dev',
    urlVars: ['BETTER_AUTH_URL'],
  })

  test('rebinds worker name, db, and self-referencing service', () => {
    expect(out.name).toBe('app-preview-pr-7')
    expect(out.d1_databases[0].database_id).toBe('uuid-7')
    expect(out.d1_databases[0].remote).toBe(true)
    expect(out.services[0].service).toBe('app-preview-pr-7')
    expect(out.workers_dev).toBe(true)
  })

  test('injects url + worker vars', () => {
    expect(out.vars.BETTER_AUTH_URL).toBe('https://app-preview-pr-7.acc.workers.dev')
    expect(out.vars.CF_WORKER_NAME).toBe('app-preview-pr-7')
    expect(out.vars.TARGET_ENV).toBe('main')
    expect(out.vars.NODE_ENV).toBe('production')
  })
})
