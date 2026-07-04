import * as core from '@actions/core'
import { deleteD1, deleteKv, deleteR2, deleteWorker } from './cloudflare'
import { postTeardownComment } from './comment'
import { getEnvBlock, readConfig } from './config'
import { type HookEnv, runHook } from './hook'
import type { Inputs } from './inputs'

export async function teardown(inputs: Inputs): Promise<void> {
  let envBlock: any = {}
  try {
    envBlock = getEnvBlock(readConfig(inputs.sourceConfig), inputs.configEnv)
  } catch (err: any) {
    core.info(`could not read ${inputs.sourceConfig} (${err.message}); deleting by name only`)
  }

  const hookEnv: HookEnv = {
    PREVIEW_WORKER: inputs.workerName,
    PREVIEW_DB: inputs.dbName,
    WRANGLER_COMMAND: inputs.wranglerCommand,
  }
  await runHook('pre-teardown-command', inputs.preTeardownCommand, inputs.shell, hookEnv)

  await deleteWorker(inputs.workerName)
  await deleteD1(inputs.dbName)
  if (inputs.isolateKv) await deleteKv(envBlock.kv_namespaces, inputs.workerName)
  if (inputs.isolateR2) await deleteR2(envBlock.r2_buckets, inputs.workerName)

  core.setOutput('worker', inputs.workerName)
  core.setOutput('db', inputs.dbName)

  if (inputs.comment) {
    await postTeardownComment(inputs.githubToken, { worker: inputs.workerName, db: inputs.dbName })
  }

  core.info(`preview torn down for PR #${inputs.prNumber}`)
}
