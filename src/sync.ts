import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as core from '@actions/core'
import { getExecOutput } from '@actions/exec'
import { runWrangler, wrangler } from './wrangler'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Sync a source (dev) D1's DATA into the preview D1. The preview D1 is recreated
 * fresh + empty and its schema built by migrations before this runs, so we only
 * copy rows (--no-schema) — no table drops, no schema conflicts. D1 permits one
 * export per database at a time, so the export retries with backoff.
 */
export async function syncD1(
  fromDb: string,
  previewDb: string,
  previewConfig: string,
): Promise<void> {
  core.startGroup(`sync D1 data ${fromDb} -> ${previewDb}`)
  try {
    const dump = join(tmpdir(), 'cf-pr-preview-dev-d1.sql')

    // 1. Export the source D1's data (no schema), retrying while a prior export runs.
    let exported = false
    for (let attempt = 1; attempt <= 8; attempt++) {
      const res = await runWrangler([
        'd1',
        'export',
        fromDb,
        '--remote',
        '--no-schema',
        '--output',
        dump,
      ])
      if (res.exitCode === 0) {
        exported = true
        break
      }
      core.info(`dev D1 export busy/failed (attempt ${attempt}); waiting 30s...`)
      await sleep(30_000)
    }
    if (!exported) throw new Error(`failed to export source D1 ${fromDb} after retries`)

    // 2. Import the data into the freshly-migrated preview D1 (defer FK checks to commit).
    const importSql = join(tmpdir(), 'cf-pr-preview-import.sql')
    writeFileSync(importSql, `PRAGMA defer_foreign_keys=on;\n${readFileSync(dump, 'utf8')}`)
    await wrangler([
      'd1',
      'execute',
      previewDb,
      '--config',
      previewConfig,
      '--remote',
      '--file',
      importSql,
    ])
    core.info(`synced data from ${fromDb} into ${previewDb}`)
  } finally {
    core.endGroup()
  }
}

export interface R2Creds {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
}

/** Sync a source (dev) R2 bucket into the preview bucket over the S3 API (aws cli). */
export async function syncR2(fromBucket: string, toBucket: string, creds: R2Creds): Promise<void> {
  core.startGroup(`sync R2 ${fromBucket} -> ${toBucket}`)
  try {
    // Ensure the AWS CLI is present (self-hosted/arm runners may lack it).
    const have = await getExecOutput('bash', ['-c', 'command -v aws || true'], {
      ignoreReturnCode: true,
      silent: true,
    })
    if (!have.stdout.trim()) {
      core.info('installing aws cli')
      const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64'
      await getExecOutput('bash', [
        '-c',
        `set -e; curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${arch}.zip" -o /tmp/awscliv2.zip; unzip -q -o /tmp/awscliv2.zip -d /tmp; sudo /tmp/aws/install --update`,
      ])
    }

    const env: Record<string, string> = {}
    for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v
    env.AWS_ACCESS_KEY_ID = creds.accessKeyId
    env.AWS_SECRET_ACCESS_KEY = creds.secretAccessKey
    env.AWS_DEFAULT_REGION = 'auto'
    env.AWS_EC2_METADATA_DISABLED = 'true'

    const code = await getExecOutput(
      'aws',
      [
        's3',
        'sync',
        `s3://${fromBucket}`,
        `s3://${toBucket}`,
        '--endpoint-url',
        creds.endpoint,
        '--delete',
        '--only-show-errors',
      ],
      { env, ignoreReturnCode: true },
    )
    if (code.exitCode !== 0) throw new Error(`aws s3 sync failed (exit ${code.exitCode})`)
    core.info(`synced R2 ${fromBucket} -> ${toBucket}`)
  } finally {
    core.endGroup()
  }
}
