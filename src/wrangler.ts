import * as core from '@actions/core'
import { getExecOutput } from '@actions/exec'

let baseCache: string[] | null = null

function baseCmd(): string[] {
  if (!baseCache) {
    baseCache = (process.env.WRANGLER_COMMAND || 'bunx wrangler').trim().split(/\s+/)
  }
  return baseCache
}

export async function runWrangler(
  args: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const [cmd, ...pre] = baseCmd()
  return getExecOutput(cmd, [...pre, ...args], { ignoreReturnCode: true })
}

export async function wrangler(
  args: string[],
  opts: { allowFail?: boolean } = {},
): Promise<string> {
  const res = await runWrangler(args)
  if (res.exitCode !== 0) {
    if (opts.allowFail) {
      core.info(`wrangler ${args.join(' ')} exited ${res.exitCode} (ignored)`)
      return res.stdout
    }
    throw new Error(`wrangler ${args.join(' ')} failed (exit ${res.exitCode})`)
  }
  return res.stdout
}

export async function wranglerJson<T = any>(
  args: string[],
  opts: { allowFail?: boolean } = {},
): Promise<T | null> {
  const out = await wrangler(args, opts)
  const tryParse = (s: string): T | null => {
    try {
      return JSON.parse(s) as T
    } catch {
      return null
    }
  }
  const direct = tryParse(out)
  if (direct !== null) return direct
  const start = out.search(/[[{]/)
  if (start >= 0) {
    const salvaged = tryParse(out.slice(start))
    if (salvaged !== null) return salvaged
  }
  if (opts.allowFail) return null
  throw new Error(`could not parse wrangler JSON for: ${args.join(' ')}`)
}
