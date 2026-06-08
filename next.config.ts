import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {}

export default withSentryConfig(nextConfig, {
  org:     'vox',
  project: 'project-slug',
  silent:  !process.env.CI,
  widenClientFileUpload:     true,
  disableLogger:             true,
  automaticVercelMonitors:   true,
})
