import { writeFileSync } from 'node:fs'
import * as core from '@actions/core'
import * as github from '@actions/github'
import type { Inputs } from './inputs'
import { readConfig, getEnvBlock, renderPreviewConfig } from './config'
import {
  resolveSubdomain,
  ensureD1,
  ensureKv,
  ensureR2,
} from './cloudflare'
import { wrangler } from './wrangler'
import { runHook, type HookEnv } from './hook'
import { postDeployComment } from './comment'

export async function deploy(inputs: Inputs): Promise<void> {
  const cfg = readConfig(inputs.sourceConfig)
  const envBlock = getEnvBlock(cfg, inputs.configEnv)

  const subdomain = await resolveSubdomain(inputs.accountId, inputs.apiToken)
  const url = `https://${inputs.workerName}.${subdomain}.workers.dev`

  const dbId = await ensureD1(inputs.dbName, inputs.d1Location)
  const d1Binding = envBlock.d1_databases?.[0]?.binding ?? 'DB'
  const migrationsDir =
    envBlock.d1_databases?.[0]?.migrations_dir || inputs.migrationsDir || 'migrations'

  const kvNamespaces = inputs.isolateKv
    ? await ensureKv(envBlock.kv_namespaces, inputs.workerName)
    : (envBlock.kv_namespaces ?? [])
  const r2Buckets = inputs.isolateR2
    ? await ensureR2(envBlock.r2_buckets, inputs.workerName)
    : (envBlock.r2_buckets ?? [])

  const rendered = renderPreviewConfig({
    cfg,
    envBlock,
    workerName: inputs.workerName,
    dbName: inputs.dbName,
    dbId,
    d1Binding,
    migrationsDir,
    kvNamespaces,
    r2Buckets,
    configEnv: inputs.configEnv,
    url,
    urlVars: inputs.urlVars,
  })
  writeFileSync(inputs.outConfig, `${JSON.stringify(rendered, null, 2)}\n`)
  core.info(`wrote ${inputs.outConfig} for ${inputs.workerName}`)

  core.setOutput('worker', inputs.workerName)
  core.setOutput('db', inputs.dbName)
  core.setOutput('db-id', dbId)
  core.setOutput('url', url)
  core.setOutput('config', inputs.outConfig)

  const hookEnv: HookEnv = {
    PREVIEW_WORKER: inputs.workerName,
    PREVIEW_DB: inputs.dbName,
    PREVIEW_DB_ID: dbId,
    PREVIEW_URL: url,
    PREVIEW_CONFIG: inputs.outConfig,
    WRANGLER_COMMAND: inputs.wranglerCommand,
  }

  await runHook('pre-deploy-command', inputs.preDeployCommand, inputs.shell, hookEnv)

  if (inputs.runMigrations) {
    core.info(`applying migrations to ${inputs.dbName}`)
    await wrangler(['d1', 'migrations', 'apply', inputs.dbName, '--config', inputs.outConfig, '--remote'])
  }

  core.info(`deploying preview worker ${inputs.workerName}`)
  await wrangler(['deploy', '--config', inputs.outConfig])

  await runHook('post-deploy-command', inputs.postDeployCommand, inputs.shell, hookEnv)

  if (inputs.comment) {
    const sha = (github.context.payload.pull_request?.head?.sha ?? github.context.sha ?? '').slice(0, 7)
    await postDeployComment(inputs.githubToken, {
      url,
      worker: inputs.workerName,
      db: inputs.dbName,
      sha,
    })
  }

  core.info(`preview ready: ${url}`)
}
