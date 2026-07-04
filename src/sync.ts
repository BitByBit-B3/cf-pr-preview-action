import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as core from '@actions/core'
import { getExecOutput } from '@actions/exec'
import { runWrangler, wrangler, wranglerJson } from './wrangler'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function syncD1(
  fromDb: string,
  previewDb: string,
  previewConfig: string,
): Promise<void> {
  core.startGroup(`sync D1 ${fromDb} -> ${previewDb}`)
  try {
    const dump = join(tmpdir(), 'cf-pr-preview-dev-d1.sql')

    let exported = false
    for (let attempt = 1; attempt <= 8; attempt++) {
      const res = await runWrangler(['d1', 'export', fromDb, '--remote', '--output', dump])
      if (res.exitCode === 0) {
        exported = true
        break
      }
      core.info(`dev D1 export busy/failed (attempt ${attempt}); waiting 30s...`)
      await sleep(30_000)
    }
    if (!exported) throw new Error(`failed to export source D1 ${fromDb} after retries`)

    const rows = await wranglerJson<any[]>(
      [
        'd1',
        'execute',
        previewDb,
        '--config',
        previewConfig,
        '--remote',
        '--json',
        '--command',
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%';",
      ],
      { allowFail: true },
    )
    const tables: string[] = (rows?.[0]?.results ?? []).map((r: any) => r.name).filter(Boolean)
    if (tables.length) {
      const dropSql = join(tmpdir(), 'cf-pr-preview-drop.sql')
      writeFileSync(
        dropSql,
        [
          'PRAGMA foreign_keys=OFF;',
          ...tables.map((t) => `DROP TABLE IF EXISTS "${t}";`),
          'PRAGMA foreign_keys=ON;',
        ].join('\n') + '\n',
      )
      await wrangler([
        'd1',
        'execute',
        previewDb,
        '--config',
        previewConfig,
        '--remote',
        '--file',
        dropSql,
      ])
    }

    await wrangler([
      'd1',
      'execute',
      previewDb,
      '--config',
      previewConfig,
      '--remote',
      '--file',
      dump,
    ])
    core.info(`cloned ${fromDb} into ${previewDb}`)
  } finally {
    core.endGroup()
  }
}

export interface R2Creds {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
}

export async function syncR2(fromBucket: string, toBucket: string, creds: R2Creds): Promise<void> {
  core.startGroup(`sync R2 ${fromBucket} -> ${toBucket}`)
  try {
    const have = await getExecOutput('bash', ['-c', 'command -v rclone || true'], {
      ignoreReturnCode: true,
      silent: true,
    })
    if (!have.stdout.trim()) {
      core.info('installing rclone')
      await getExecOutput('bash', [
        '-c',
        'sudo apt-get update -qq && sudo apt-get install -y -qq rclone',
      ])
    }

    const conf = join(tmpdir(), 'cf-pr-preview-rclone.conf')
    writeFileSync(
      conf,
      [
        '[r2]',
        'type = s3',
        'provider = Cloudflare',
        `access_key_id = ${creds.accessKeyId}`,
        `secret_access_key = ${creds.secretAccessKey}`,
        `endpoint = ${creds.endpoint}`,
        'no_check_bucket = true',
        'region = auto',
        '',
      ].join('\n'),
    )

    const code = await getExecOutput(
      'rclone',
      ['sync', `r2:${fromBucket}`, `r2:${toBucket}`, '--config', conf, '--s3-no-check-bucket'],
      { ignoreReturnCode: true },
    )
    if (code.exitCode !== 0) throw new Error(`rclone sync failed (exit ${code.exitCode})`)
    core.info(`synced R2 ${fromBucket} -> ${toBucket}`)
  } finally {
    core.endGroup()
  }
}
