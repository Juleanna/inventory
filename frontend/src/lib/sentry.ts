// Sentry integration for frontend error monitoring
// Requires: npm install @sentry/react

let sentryInitialized = false

export async function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn || sentryInitialized) return

  try {
    const Sentry = await import('@sentry/react')

    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
      ],
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    })

    sentryInitialized = true
  } catch {
    // Sentry not installed — ignore silently
  }
}

export async function captureError(error: Error, context?: Record<string, unknown>) {
  if (!sentryInitialized) return

  try {
    const Sentry = await import('@sentry/react')
    if (context) {
      Sentry.setContext('extra', context)
    }
    Sentry.captureException(error)
  } catch {
    // ignore
  }
}

export async function setUser(user: { id: string; username: string; email?: string } | null) {
  if (!sentryInitialized) return

  try {
    const Sentry = await import('@sentry/react')
    Sentry.setUser(user)
  } catch {
    // ignore
  }
}
