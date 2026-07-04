import * as core from '@actions/core'
import { bindingResourceName, type KvBinding, type R2Binding } from './config'
import { wrangler, wranglerJson } from './wrangler'

/** Resolve the account's workers.dev subdomain for building the preview URL. */
export async function resolveSubdomain(accountId: string, token: string): Promise<string> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error(`resolve workers.dev subdomain failed: HTTP ${res.status}`)
  const body: any = await res.json()
  const sub = body?.result?.subdomain
  if (!sub) throw new Error('account has no workers.dev subdomain configured')
  return sub
}

/** Create the per-PR D1 idempotently (create is not idempotent, so list first). */
export async function ensureD1(dbName: string, location: string): Promise<string> {
  const list = (await wranglerJson<any[]>(['d1', 'list', '--json'], { allowFail: true })) ?? []
  let found = list.find((d) => d.name === dbName)
  if (!found) {
    core.info(`creating preview D1 ${dbName}`)
    await wrangler(['d1', 'create', dbName, '--location', location])
    const relist = (await wranglerJson<any[]>(['d1', 'list', '--json'], { allowFail: true })) ?? []
    found = relist.find((d) => d.name === dbName)
  } else {
    core.info(`reusing preview D1 ${dbName} (${found.uuid})`)
  }
  if (!found) throw new Error(`failed to resolve preview D1 id for ${dbName}`)
  return found.uuid
}

/** Delete and recreate the per-PR D1 so it is always fresh + empty (for a clean resync). */
export async function recreateD1(dbName: string, location: string): Promise<string> {
  await deleteD1(dbName)
  core.info(`creating fresh preview D1 ${dbName}`)
  await wrangler(['d1', 'create', dbName, '--location', location])
  const list = (await wranglerJson<any[]>(['d1', 'list', '--json'], { allowFail: true })) ?? []
  const found = list.find((d) => d.name === dbName)
  if (!found) throw new Error(`failed to resolve preview D1 id for ${dbName}`)
  return found.uuid
}

/** Create per-PR KV namespaces mirroring the source bindings. */
export async function ensureKv(sourceKv: any, workerName: string): Promise<KvBinding[]> {
  if (!Array.isArray(sourceKv)) return []
  const out: KvBinding[] = []
  const existing =
    (await wranglerJson<any[]>(['kv', 'namespace', 'list'], { allowFail: true })) ?? []
  for (const ns of sourceKv) {
    const title = bindingResourceName(workerName, ns.binding)
    let hit = existing.find((e) => e.title === title)
    if (!hit) {
      core.info(`creating preview KV namespace ${title}`)
      await wrangler(['kv', 'namespace', 'create', title])
      const relist =
        (await wranglerJson<any[]>(['kv', 'namespace', 'list'], { allowFail: true })) ?? []
      hit = relist.find((e) => e.title === title)
    } else {
      core.info(`reusing preview KV namespace ${title} (${hit.id})`)
    }
    if (!hit) throw new Error(`failed to resolve preview KV id for ${title}`)
    out.push({ binding: ns.binding, id: hit.id })
  }
  return out
}

/** Create per-PR R2 buckets mirroring the source bindings (create is ignore-exists). */
export async function ensureR2(sourceR2: any, workerName: string): Promise<R2Binding[]> {
  if (!Array.isArray(sourceR2)) return []
  const out: R2Binding[] = []
  for (const b of sourceR2) {
    const bucket = bindingResourceName(workerName, b.binding)
    core.info(`ensuring preview R2 bucket ${bucket}`)
    await wrangler(['r2', 'bucket', 'create', bucket], { allowFail: true })
    out.push({ binding: b.binding, bucket_name: bucket, remote: true })
  }
  return out
}

export async function deleteWorker(name: string): Promise<void> {
  core.info(`deleting preview worker ${name}`)
  await wrangler(['delete', '--name', name, '--force'], { allowFail: true })
}

export async function deleteD1(dbName: string): Promise<void> {
  const dbs = (await wranglerJson<any[]>(['d1', 'list', '--json'], { allowFail: true })) ?? []
  if (dbs.find((d) => d.name === dbName)) {
    core.info(`deleting preview D1 ${dbName}`)
    await wrangler(['d1', 'delete', dbName, '-y'], { allowFail: true })
  } else {
    core.info(`preview D1 ${dbName} absent or already deleted`)
  }
}

export async function deleteKv(sourceKv: any, workerName: string): Promise<void> {
  if (!Array.isArray(sourceKv)) return
  const existing =
    (await wranglerJson<any[]>(['kv', 'namespace', 'list'], { allowFail: true })) ?? []
  for (const ns of sourceKv) {
    const title = bindingResourceName(workerName, ns.binding)
    const hit = existing.find((e) => e.title === title)
    if (hit) {
      core.info(`deleting preview KV namespace ${title} (${hit.id})`)
      await wrangler(['kv', 'namespace', 'delete', '--namespace-id', hit.id], { allowFail: true })
    } else {
      core.info(`preview KV namespace ${title} absent or already deleted`)
    }
  }
}

export async function deleteR2(sourceR2: any, workerName: string): Promise<void> {
  if (!Array.isArray(sourceR2)) return
  for (const b of sourceR2) {
    const bucket = bindingResourceName(workerName, b.binding)
    core.info(`deleting preview R2 bucket ${bucket}`)
    await wrangler(['r2', 'bucket', 'delete', bucket], { allowFail: true })
  }
}
