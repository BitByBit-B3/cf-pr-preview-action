import { exec } from '@actions/exec'
import * as core from '@actions/core'

export interface HookEnv {
  PREVIEW_WORKER: string
  PREVIEW_DB: string
  PREVIEW_DB_ID?: string
  PREVIEW_URL?: string
  PREVIEW_CONFIG?: string
  WRANGLER_COMMAND: string
}

/**
 * Run a user-supplied command hook with the preview environment injected as
 * env vars, so consumers can run migrations, seed data, smoke tests, or
 * anything else against their isolated per-PR resources.
 */
export async function runHook(name: string, command: string, shell: string, env: HookEnv): Promise<void> {
  if (!command.trim()) return
  core.startGroup(`hook: ${name}`)
  try {
    const merged: Record<string, string> = {}
    for (const [k, v] of Object.entries(process.env)) if (v !== undefined) merged[k] = v
    for (const [k, v] of Object.entries(env)) if (v !== undefined) merged[k] = v as string
    const args = shell === 'bash' ? ['-e', '-o', 'pipefail', '-c', command] : ['-c', command]
    const code = await exec(shell, args, { env: merged, ignoreReturnCode: true })
    if (code !== 0) throw new Error(`${name} exited ${code}`)
  } finally {
    core.endGroup()
  }
}
