/**
 * Structured logging system with transports and context loggers.
 * Replaces ad-hoc console.log with structured, leveled, timed logging.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, unknown>;
  traceId?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export type LogTransport = (entry: LogEntry) => void;

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3, fatal: 4,
};

class StructuredLogger {
  private minLevel: LogLevel = 'info';
  private transports: LogTransport[] = [];
  private globalContext: Record<string, unknown> = {};

  constructor() {
    this.transports.push((entry) => {
      const method = entry.level === 'error' || entry.level === 'fatal'
        ? 'error' : entry.level === 'warn' ? 'warn' : 'log';

      console[method](
        `[${entry.level.toUpperCase()}] [${entry.context}] ${entry.message}`,
        entry.data || '',
        entry.duration !== undefined ? `(${entry.duration}ms)` : '',
      );
    });
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  setGlobalContext(ctx: Record<string, unknown>): void {
    this.globalContext = { ...this.globalContext, ...ctx };
  }

  child(context: string): ContextLogger {
    return new ContextLogger(this, context);
  }

  emit(entry: LogEntry): void {
    if (LOG_LEVEL_PRIORITY[entry.level] < LOG_LEVEL_PRIORITY[this.minLevel]) return;
    const enriched = { ...entry, data: { ...this.globalContext, ...entry.data } };
    this.transports.forEach(t => t(enriched));
  }
}

export class ContextLogger {
  constructor(
    private parent: StructuredLogger,
    private context: string
  ) {}

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    this.parent.emit({
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      data,
    });
  }

  debug(msg: string, data?: Record<string, unknown>) { this.log('debug', msg, data); }
  info(msg: string, data?: Record<string, unknown>) { this.log('info', msg, data); }
  warn(msg: string, data?: Record<string, unknown>) { this.log('warn', msg, data); }

  error(msg: string, error?: Error, data?: Record<string, unknown>) {
    this.parent.emit({
      timestamp: new Date().toISOString(),
      level: 'error',
      context: this.context,
      message: msg,
      data,
      error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
    });
  }

  async timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      this.parent.emit({
        timestamp: new Date().toISOString(),
        level: 'info',
        context: this.context,
        message: `${label} completed`,
        duration: Math.round(performance.now() - start),
      });
      return result;
    } catch (e) {
      this.parent.emit({
        timestamp: new Date().toISOString(),
        level: 'error',
        context: this.context,
        message: `${label} failed`,
        duration: Math.round(performance.now() - start),
        error: e instanceof Error
          ? { name: e.name, message: e.message, stack: e.stack }
          : { name: 'Unknown', message: String(e) },
      });
      throw e;
    }
  }
}

export const logger = new StructuredLogger();

export const wpLogger = logger.child('WordPress');
export const vectorLogger = logger.child('VectorEngine');
export const linkLogger = logger.child('LinkAutomation');
export const batchLogger = logger.child('BatchProcessor');
export const perfLogger = logger.child('Performance');
