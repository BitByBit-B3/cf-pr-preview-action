import * as core from '@actions/core'
import { deploy } from './deploy'
import { readInputs } from './inputs'
import { teardown } from './teardown'

async function run(): Promise<void> {
  try {
    const inputs = readInputs()
    // wrangler.ts and hooks read the exec prefix + Cloudflare creds from env.
    process.env.WRANGLER_COMMAND = inputs.wranglerCommand
    process.env.CLOUDFLARE_ACCOUNT_ID = inputs.accountId
    process.env.CLOUDFLARE_API_TOKEN = inputs.apiToken
    // Keep wrangler non-interactive: never block on a "report this error?" prompt.
    process.env.CI = process.env.CI || '1'
    process.env.WRANGLER_SEND_METRICS = 'false'
    core.setSecret(inputs.apiToken)

    core.info(
      `cf-pr-preview-action: mode=${inputs.mode} worker=${inputs.workerName} db=${inputs.dbName}`,
    )
    if (inputs.mode === 'teardown') await teardown(inputs)
    else await deploy(inputs)
  } catch (err: any) {
    core.setFailed(err?.message ?? String(err))
  }
}

void run()
