export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export class Logger {
  private static instance: Logger
  private logLevel: LogLevel = LogLevel.INFO
  private enableTimestamp = true
  private enableColors = true

  private constructor() {
    // Check if we're in development mode
    if (import.meta.env.DEV) {
      this.logLevel = LogLevel.DEBUG
    } else {
      this.logLevel = LogLevel.WARN
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  private formatMessage(level: string, message: string, ..._args: unknown[]): string {
    const timestamp = this.enableTimestamp ? `[${new Date().toISOString()}] ` : ''
    return `${timestamp}[${level}] ${message}`
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      // eslint-disable-next-line no-console
      console.log(this.formatMessage('DEBUG', message), ...args)
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      // eslint-disable-next-line no-console
      console.info(this.formatMessage('INFO', message), ...args)
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      // eslint-disable-next-line no-console
      console.warn(this.formatMessage('WARN', message), ...args)
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      // eslint-disable-next-line no-console
      console.error(this.formatMessage('ERROR', message), ...args)
    }
  }

  // Group logging for better organization
  group(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      // eslint-disable-next-line no-console
      console.group(label)
    }
  }

  groupEnd(): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      // eslint-disable-next-line no-console
      console.groupEnd()
    }
  }

  // Performance logging
  time(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      // eslint-disable-next-line no-console
      console.time(label)
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      // eslint-disable-next-line no-console
      console.timeEnd(label)
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance()