type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

/**
 * Structured JSON logger. Never log passwords, session tokens, the
 * Anthropic API key, storage credentials, full raw design-asset content, or
 * full designer-note/AI-message text — see .agents/rules/security.md's
 * Logging section. Prefer a short event name for `message` (e.g.
 * "handoff.decision.recorded") plus structured `context`, not an
 * interpolated sentence.
 */
function write(level: LogLevel, message: string, context?: LogContext): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'production') {
      write('debug', message, context);
    }
  },
  info(message: string, context?: LogContext): void {
    write('info', message, context);
  },
  warn(message: string, context?: LogContext): void {
    write('warn', message, context);
  },
  error(message: string, context?: LogContext): void {
    write('error', message, context);
  },
};
