import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://0c934643eff2d7419f0a10ad3ac6f3ad@o4511525768724480.ingest.us.sentry.io/4511525775605760',
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
})
