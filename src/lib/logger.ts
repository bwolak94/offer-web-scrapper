// src/lib/logger.ts
// Structured JSON logger for server-side use (scraper workers, API routes).
// All fields are optional except level and message.
// Output goes to stdout → captured by Vercel function logs.

type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  level:            LogLevel
  message:          string
  // Scraper context
  source?:          string       // e.g. 'otodom', 'justjoinit'
  category?:        string       // e.g. 'sale', 'rent_long', 'jobs'
  // Pipeline metrics
  items_scraped?:   number
  items_new?:       number
  items_updated?:   number
  items_skipped?:   number
  duration_ms?:     number
  // Error details
  error?:           string       // error.message
  error_stack?:     string       // error.stack (dev/staging only)
  // Correlation
  request_id?:      string       // QStash message ID or request trace ID
  worker?:          string       // 'scrape' | 'score'
  // Additional arbitrary context
  [key: string]:    unknown
}

function log(level: LogLevel, message: string, context?: Omit<LogEntry, 'level' | 'message'>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  }

  // Remove error_stack in production to keep logs clean
  if (process.env.NODE_ENV === 'production') {
    delete entry.error_stack
  }

  const output = JSON.stringify(entry)

  if (level === 'error') {
    console.error(output)
  } else if (level === 'warn') {
    console.warn(output)
  } else {
    console.log(output)
  }
}

export const logger = {
  info:  (message: string, context?: Omit<LogEntry, 'level' | 'message'>) => log('info',  message, context),
  warn:  (message: string, context?: Omit<LogEntry, 'level' | 'message'>) => log('warn',  message, context),
  error: (message: string, context?: Omit<LogEntry, 'level' | 'message'>) => log('error', message, context),
}
