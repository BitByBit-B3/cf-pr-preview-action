import * as github from '@actions/github'
import * as core from '@actions/core'

const MARKER = '<!-- cf-pr-preview-action -->'

async function upsert(token: string, body: string): Promise<void> {
  if (!token) {
    core.info('no github-token; skipping preview comment')
    return
  }
  const octo = github.getOctokit(token)
  const { owner, repo } = github.context.repo
  const issue_number = github.context.payload.pull_request?.number
  if (!issue_number) return
  const comments = await octo.paginate(octo.rest.issues.listComments, {
    owner,
    repo,
    issue_number,
  })
  const existing = comments.find((c) => c.body && c.body.includes(MARKER))
  if (existing) {
    await octo.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body })
  } else {
    await octo.rest.issues.createComment({ owner, repo, issue_number, body })
  }
}

export async function postDeployComment(
  token: string,
  o: { url: string; worker: string; db: string; sha: string },
): Promise<void> {
  const body = [
    MARKER,
    '### 🚀 Preview deployment',
    '',
    `**Preview URL:** ${o.url}`,
    '',
    `| | |`,
    `|---|---|`,
    `| Worker | \`${o.worker}\` |`,
    `| Database | \`${o.db}\` |`,
    `| Commit | \`${o.sha}\` |`,
    '',
    'This preview and its isolated D1/KV/R2 are torn down automatically when the PR is closed or merged.',
  ].join('\n')
  await upsert(token, body)
}

export async function postTeardownComment(
  token: string,
  o: { worker: string; db: string },
): Promise<void> {
  const body = [
    MARKER,
    '### 🧹 Preview torn down',
    '',
    'The preview worker and its isolated database, KV, and R2 resources were deleted when this PR was closed.',
    '',
    `| | |`,
    `|---|---|`,
    `| Worker | \`${o.worker}\` (deleted) |`,
    `| Database | \`${o.db}\` (deleted) |`,
  ].join('\n')
  await upsert(token, body)
}
