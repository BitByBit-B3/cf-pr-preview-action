import { defineConfig } from 'vitepress'

const GITHUB = 'https://github.com/BitByBit-B3/cf-pr-preview-action'
const SITE = 'https://cf-pr-preview.bbyb.dev'
const DESCRIPTION =
  'GitHub Action for per-PR Cloudflare preview environments — an isolated Worker, D1, KV, and R2 for every pull request, auto-deployed and torn down on close, with dev data sync and D1 migrations.'

export default defineConfig({
  lang: 'en-US',
  title: 'cf-pr-preview-action',
  description: DESCRIPTION,
  cleanUrls: true,
  lastUpdated: true,
  sitemap: { hostname: SITE },
  head: [
    ['meta', { name: 'keywords', content: 'cloudflare, github action, preview environment, ephemeral environment, per-pr preview, pull request, cloudflare workers, cloudflare d1, cloudflare kv, cloudflare r2, wrangler, ci cd, database branching, preview deployment' }],
    ['meta', { name: 'author', content: 'BitByBit-B3' }],
    ['link', { rel: 'canonical', href: SITE }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'cf-pr-preview-action' }],
    ['meta', { property: 'og:title', content: 'cf-pr-preview-action — per-PR Cloudflare preview environments' }],
    ['meta', { property: 'og:description', content: DESCRIPTION }],
    ['meta', { property: 'og:url', content: SITE }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'cf-pr-preview-action' }],
    ['meta', { name: 'twitter:description', content: DESCRIPTION }],
    ['meta', { name: 'theme-color', content: '#f6821f' }],
  ],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Reference', link: '/reference/config' },
      { text: 'v1', link: `${GITHUB}/releases` },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is it?', link: '/guide/introduction' },
          { text: 'Getting started', link: '/guide/getting-started' },
        ],
      },
      {
        text: 'Guides',
        items: [
          { text: 'Usage', link: '/guide/usage' },
          { text: 'Syncing dev data', link: '/guide/syncing' },
          { text: 'How it works', link: '/guide/how-it-works' },
        ],
      },
      {
        text: 'Reference',
        items: [{ text: 'Inputs & outputs', link: '/reference/config' }],
      },
    ],
    socialLinks: [{ icon: 'github', link: GITHUB }],
    editLink: {
      pattern: `${GITHUB}/edit/main/docs/:path`,
      text: 'Edit this page on GitHub',
    },
    search: { provider: 'local' },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 BitByBit-B3',
    },
  },
})
