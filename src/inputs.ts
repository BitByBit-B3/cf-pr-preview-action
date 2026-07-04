import * as core from '@actions/core'
import * as github from '@actions/github'

export type Mode = 'deploy' | 'teardown'

export interface Inputs {
  mode: Mode
  prNumber: number
  workerName: string
  dbName: string
  sourceConfig: string
  outConfig: string
  configEnv: string
  d1Location: string
  migrationsDir: string
  runMigrations: boolean
  isolateKv: boolean
  isolateR2: boolean
  urlVars: string[]
  wranglerCommand: string
  comment: boolean
  githubToken: string
  accountId: string
  apiToken: string
  preDeployCommand: string
  postDeployCommand: string
  preTeardownCommand: string
  shell: string
}

function bool(name: string, def: boolean): boolean {
  const raw = core.getInput(name)
  if (raw === '') return def
  return raw.toLowerCase() === 'true'
}

export function readInputs(): Inputs {
  const workerPrefix = core.getInput('worker-prefix', { required: true })
  const dbPrefix = core.getInput('db-prefix') || workerPrefix

  const prNumber = github.context.payload.pull_request?.number
  if (!prNumber) {
    throw new Error('this action must run on a pull_request event (no PR number in context)')
  }

  const explicit = (core.getInput('mode') || 'auto').toLowerCase()
  let mode: Mode
  if (explicit === 'deploy' || explicit === 'teardown') {
    mode = explicit
  } else {
    mode = github.context.payload.action === 'closed' ? 'teardown' : 'deploy'
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || core.getInput('cloudflare-account-id')
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || core.getInput('cloudflare-api-token')
  if (!accountId)
    throw new Error('CLOUDFLARE_ACCOUNT_ID (env or cloudflare-account-id input) is required')
  if (!apiToken)
    throw new Error('CLOUDFLARE_API_TOKEN (env or cloudflare-api-token input) is required')

  return {
    mode,
    prNumber,
    workerName: `${workerPrefix}-pr-${prNumber}`,
    dbName: `${dbPrefix}-pr-${prNumber}`,
    sourceConfig: core.getInput('source-config') || 'wrangler.jsonc',
    outConfig: core.getInput('out-config') || 'wrangler.preview.jsonc',
    configEnv: core.getInput('config-env') || 'main',
    d1Location: core.getInput('d1-location') || 'apac',
    migrationsDir: core.getInput('migrations-dir'),
    runMigrations: bool('run-migrations', true),
    isolateKv: bool('isolate-kv', true),
    isolateR2: bool('isolate-r2', true),
    urlVars: (core.getInput('preview-url-vars') || 'BETTER_AUTH_URL')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    wranglerCommand: core.getInput('wrangler-command') || 'bunx wrangler',
    comment: bool('comment', true),
    githubToken: core.getInput('github-token'),
    accountId,
    apiToken,
    preDeployCommand: core.getInput('pre-deploy-command'),
    postDeployCommand: core.getInput('post-deploy-command'),
    preTeardownCommand: core.getInput('pre-teardown-command'),
    shell: core.getInput('shell') || 'bash',
  }
}
