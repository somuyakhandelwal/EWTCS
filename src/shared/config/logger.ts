/**
 * Structured logging module for EWTCS
 * Provides consistent logging across development and production environments
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Log entry structure
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

/**
 * Logger class for structured logging
 * Used throughout the application for consistent error/info tracking
 */
class Logger {
  private isDevelopment: boolean;

  constructor(isDevelopment: boolean = process.env.NODE_ENV === 'development') {
    this.isDevelopment = isDevelopment;
  }

  /**
   * Log entry formatter
   */
  private formatLog(entry: LogEntry): string {
    const contextStr = entry.context ? ` | ${JSON.stringify(entry.context)}` : '';
    const errorStr = entry.error ? `\n${entry.error.stack}` : '';
    return `[${entry.timestamp}] [${entry.level}] ${entry.message}${contextStr}${errorStr}`;
  }

  /**
   * Output log based on environment
   */
  private output(entry: LogEntry): void {
    const formatted = this.formatLog(entry);

    if (this.isDevelopment) {
      // Development: color-coded console output
      const colors: Record<LogLevel, string> = {
        [LogLevel.DEBUG]: '\x1b[36m', // Cyan
        [LogLevel.INFO]: '\x1b[32m', // Green
        [LogLevel.WARN]: '\x1b[33m', // Yellow
        [LogLevel.ERROR]: '\x1b[31m', // Red
        [LogLevel.CRITICAL]: '\x1b[35m', // Magenta
      };
      const reset = '\x1b[0m';
      console.log(`${colors[entry.level]}${formatted}${reset}`);
    } else {
      // Production: simple structured logs
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message,
      context,
    });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message,
      context,
    });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message,
      context,
    });
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      context,
      error,
    });
  }

  critical(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: LogLevel.CRITICAL,
      message,
      context,
      error,
    });
  }
}

export const logger = new Logger();
