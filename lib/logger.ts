/**
 * Central logger for OtakuPal. Use this instead of console.* for consistent,
 * structured logs with timestamps and optional context.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_FROM_ENV = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
const DEFAULT_MIN_LEVEL: LogLevel = process.env.NODE_ENV === "production" ? "info" : "debug";
const MIN_LEVEL: LogLevel =
  LEVEL_FROM_ENV && LEVEL_ORDER[LEVEL_FROM_ENV] !== undefined ? LEVEL_FROM_ENV : DEFAULT_MIN_LEVEL;

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL];
}

function timestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, namespace: string, message: string, context?: Record<string, unknown>): string {
  const parts = [timestamp(), level.toUpperCase().padEnd(5), `[${namespace}]`, message];
  if (context != null && Object.keys(context).length > 0) {
    try {
      parts.push(JSON.stringify(context));
    } catch {
      parts.push("[non-serializable context]");
    }
  }
  return parts.join(" ");
}

function log(level: LogLevel, namespace: string, message: string, context?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  const line = formatMessage(level, namespace, message, context);
  switch (level) {
    case "debug":
      console.debug(line);
      break;
    case "info":
      console.info(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
  }
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  child(namespace: string): Logger;
}

function createLogger(namespace: string): Logger {
  return {
    debug(msg: string, ctx?: Record<string, unknown>) {
      log("debug", namespace, msg, ctx);
    },
    info(msg: string, ctx?: Record<string, unknown>) {
      log("info", namespace, msg, ctx);
    },
    warn(msg: string, ctx?: Record<string, unknown>) {
      log("warn", namespace, msg, ctx);
    },
    error(msg: string, ctx?: Record<string, unknown>) {
      log("error", namespace, msg, ctx);
    },
    child(name: string) {
      return createLogger(`${namespace}:${name}`);
    },
  };
}

/** Default app logger. Prefer logger.child('api:chat') etc. for scoped logs. */
export const logger = createLogger("otakupal");

export default logger;
