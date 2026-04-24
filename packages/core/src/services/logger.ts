import { consoleTransport } from 'react-native-logs'
import { logger } from 'react-native-logs'
import { LogLevel } from '@credo-ts/core'

import { BifoldError } from '../types/error'
import { AbstractBifoldLogger } from './AbstractBifoldLogger'

export class BifoldLogger extends AbstractBifoldLogger {
  public constructor() {
    super()
    this.logLevel = LogLevel.trace

    const transport = [consoleTransport]
    const config = {
      ...this._config,
      transport,
    }

    this._log = logger.createLogger<'test' | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'>(config)
  }

  public trace(message: string, data?: Record<string, unknown>): void {
    super.trace(message, data)
  }

  public debug(message: string, data?: Record<string, unknown>): void {
    super.debug(message, data)
  }

  public info(message: string, data?: Record<string, unknown>): void {
    super.info(message, data)
  }

  public warn(message: string, data?: Record<string, unknown>): void {
    console.warn('[CREDO-WARN]', message, data ? JSON.stringify(data, null, 2) : '')
    super.warn(message, data)
  }

  public error(message: string, dataOrError?: Record<string, unknown> | Error, error?: Error): void {
    console.error('[CREDO-ERROR]', message, dataOrError, error)
    super.error(message, dataOrError as any, error as any)
  }

  public fatal(message: string, dataOrError?: Record<string, unknown> | Error, error?: Error): void {
    console.error('[CREDO-FATAL]', message, dataOrError, error)
    super.fatal(message, dataOrError as any, error as any)
  }

  public report(bifoldError: BifoldError): void {
    this._log?.info({ message: 'No remote logging configured, report not sent for error:', data: bifoldError.message })
  }
}
