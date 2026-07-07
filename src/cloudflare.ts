import * as core from '@actions/core'
import { bindingResourceName, type KvBinding, type R2Binding } from './config'
import { wrangler, wranglerJson } from './wrangler'

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

// wrangler list commands tolerate failure and may print nothing; normalize to [].
const listD1 = () =>
  wranglerJson<any[]>(['d1', 'list', '--json'], { allowFail: true }).then((l) => l ?? [])
const listKv = () =>
  wranglerJson<any[]>(['kv', 'namespace', 'list'], { allowFail: true }).then((l) => l ?? [])

// Create a resource, then re-list to resolve the freshly created entry.
// Throws if it still can't be found (create silently no-op'd or the list failed).
async function createAndResolve<T>(
  label: string,
  create: () => Promise<unknown>,
  list: () => Promise<T[]>,
  match: (item: T) => boolean,
): Promise<T> {
  core.info(`creating ${label}`)
  await create()
  const hit = (await list()).find(match)
  if (!hit) throw new Error(`failed to resolve ${label} after create`)
  return hit
}

export async function ensureD1(dbName: string, location: string): Promise<string> {
  const match = (d: any) => d.name === dbName
  const found = (await listD1()).find(match)
  if (found) {
    core.info(`reusing preview D1 ${dbName} (${found.uuid})`)
    return found.uuid
  }
  const created = await createAndResolve(
    `preview D1 ${dbName}`,
    () => wrangler(['d1', 'create', dbName, '--location', location]),
    listD1,
    match,
  )
  return created.uuid
}

export async function ensureKv(sourceKv: any, workerName: string): Promise<KvBinding[]> {
  if (!Array.isArray(sourceKv)) return []
  const out: KvBinding[] = []
  const existing = await listKv()
  for (const ns of sourceKv) {
    const title = bindingResourceName(workerName, ns.binding)
    const match = (e: any) => e.title === title
    let hit = existing.find(match)
    if (hit) {
      core.info(`reusing preview KV namespace ${title} (${hit.id})`)
    } else {
      hit = await createAndResolve(
        `preview KV namespace ${title}`,
        () => wrangler(['kv', 'namespace', 'create', title]),
        listKv,
        match,
      )
    }
    out.push({ binding: ns.binding, id: hit.id })
  }
  return out
}

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
  const dbs = await listD1()
  if (dbs.find((d) => d.name === dbName)) {
    core.info(`deleting preview D1 ${dbName}`)
    await wrangler(['d1', 'delete', dbName, '-y'], { allowFail: true })
  } else {
    core.info(`preview D1 ${dbName} absent or already deleted`)
  }
}

export async function deleteKv(sourceKv: any, workerName: string): Promise<void> {
  if (!Array.isArray(sourceKv)) return
  const existing = await listKv()
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
