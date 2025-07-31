import { logger } from './Logger'

export interface ErrorContext {
  system?: string
  method?: string
  data?: Record<string, unknown>
}

export class GameError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: ErrorContext
  ) {
    super(message)
    this.name = 'GameError'
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler
  private errorCallbacks: ((error: Error, context?: ErrorContext) => void)[] = []
  private recoveryStrategies: Map<string, () => void> = new Map()

  private constructor() {
    // Set up global error handlers
    window.addEventListener('error', (event) => {
      this.handleError(event.error, { system: 'global' })
    })
    
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new Error(event.reason), { system: 'promise' })
    })
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  /**
   * Register an error callback
   */
  onError(callback: (error: Error, context?: ErrorContext) => void): void {
    this.errorCallbacks.push(callback)
  }

  /**
   * Register a recovery strategy for specific error codes
   */
  registerRecoveryStrategy(errorCode: string, strategy: () => void): void {
    this.recoveryStrategies.set(errorCode, strategy)
  }

  /**
   * Handle an error with context
   */
  handleError(error: Error, context?: ErrorContext): void {
    // Log the error
    logger.error(`Error in ${context?.system || 'unknown'}: ${error.message}`, {
      error,
      context
    })

    // Notify callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error, context)
      } catch (callbackError) {
        logger.error('Error in error callback:', callbackError)
      }
    })

    // Try recovery strategy if available
    if (error instanceof GameError && error.code) {
      const strategy = this.recoveryStrategies.get(error.code)
      if (strategy) {
        try {
          logger.info(`Attempting recovery for error code: ${error.code}`)
          strategy()
        } catch (recoveryError) {
          logger.error('Recovery strategy failed:', recoveryError)
        }
      }
    }
  }

  /**
   * Wrap a function with error handling
   */
  wrap<T extends (...args: any[]) => any>(
    fn: T,
    context: ErrorContext
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        const result = fn(...args)
        if (result instanceof Promise) {
          return result.catch((error) => {
            this.handleError(error, context)
            throw error
          })
        }
        return result
      } catch (error) {
        this.handleError(error as Error, context)
        throw error
      }
    }) as T
  }

  /**
   * Try to execute a function with error handling
   */
  tryExecute<T>(
    fn: () => T,
    context: ErrorContext,
    defaultValue?: T
  ): T | undefined {
    try {
      return fn()
    } catch (error) {
      this.handleError(error as Error, context)
      return defaultValue
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance()

// Common error codes
export const ErrorCodes = {
  ASSET_LOAD_FAILED: 'ASSET_LOAD_FAILED',
  PHYSICS_INIT_FAILED: 'PHYSICS_INIT_FAILED',
  AUDIO_INIT_FAILED: 'AUDIO_INIT_FAILED',
  SAVE_FAILED: 'SAVE_FAILED',
  LOAD_FAILED: 'LOAD_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  WEBGL_NOT_SUPPORTED: 'WEBGL_NOT_SUPPORTED',
  COMPONENT_NOT_FOUND: 'COMPONENT_NOT_FOUND',
  INVALID_STATE: 'INVALID_STATE'
} as const