/**
 * Structured logger for the AI pipeline.
 *
 * Logs AI latency, token usage, errors, and extraction timing.
 * All entries are tagged so they can be filtered and aggregated later
 * for analytics dashboards (Phase 7+).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  tag: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

const LOG_BUFFER: LogEntry[] = [];
const MAX_BUFFER = 500;

function createEntry(level: LogLevel, tag: string, message: string, data?: Record<string, unknown>): LogEntry {
  return { level, tag, message, data, timestamp: new Date().toISOString() };
}

function push(entry: LogEntry) {
  if (LOG_BUFFER.length >= MAX_BUFFER) LOG_BUFFER.shift();
  LOG_BUFFER.push(entry);

  const prefix = `[${entry.tag}]`;
  const payload = entry.data ? entry.data : '';
  switch (entry.level) {
    case 'debug': console.debug(prefix, entry.message, payload); break;
    case 'info':  console.info(prefix, entry.message, payload); break;
    case 'warn':  console.warn(prefix, entry.message, payload); break;
    case 'error': console.error(prefix, entry.message, payload); break;
  }
}

/** Scoped logger factory — every service creates its own logger with a fixed tag. */
export function createLogger(tag: string) {
  return {
    debug: (msg: string, data?: Record<string, unknown>) => push(createEntry('debug', tag, msg, data)),
    info:  (msg: string, data?: Record<string, unknown>) => push(createEntry('info',  tag, msg, data)),
    warn:  (msg: string, data?: Record<string, unknown>) => push(createEntry('warn',  tag, msg, data)),
    error: (msg: string, data?: Record<string, unknown>) => push(createEntry('error', tag, msg, data)),
  };
}

/** Returns a shallow copy of all buffered log entries (useful for debugging / future analytics). */
export function getLogBuffer(): ReadonlyArray<LogEntry> {
  return [...LOG_BUFFER];
}

// ---------------------------------------------------------------------------
// Pre-built loggers for the main services
// ---------------------------------------------------------------------------
export const llmLogger = createLogger('LLM');
export const agentLogger = createLogger('RequirementAgent');
export const validationLogger = createLogger('ValidationAgent');
export const parserLogger = createLogger('Parser');
export const firebaseLogger = createLogger('Firebase');
