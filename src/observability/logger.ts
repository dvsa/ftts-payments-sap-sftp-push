import { Logger as AzureLogger } from '@dvsa/azure-logger';
import { Props } from '@dvsa/azure-logger/dist/ILogger';
import config from '../config';

export class Logger extends AzureLogger {
  constructor() {
    super('FTTS', config.appName);
  }

  logEvent(
    telemetryEvent: BusinessTelemetryEvent,
    message?: string,
    properties?: Props,
  ): void {
    super.event(
      telemetryEvent,
      message,
      {
        ...properties,
      },
    );
  }
}

export enum BusinessTelemetryEvent {
  SAP_SFTP_UPLOAD_STARTED = 'SAP_SFTP_UPLOAD_STARTED',
  SAP_SFTP_UPLOAD_SUCCESSFUL = 'SAP_SFTP_UPLOAD_SUCCESSFUL',
  SAP_SFTP_UPLOAD_FAILED = 'SAP_SFTP_UPLOAD_FAILED',
  SAP_SFTP_UPLOAD_STATS = 'SAP_SFTP_UPLOAD_STATS',
  SAP_SFTP_UPLOAD_ATTEMPT_FAILED = 'SAP_SFTP_UPLOAD_ATTEMPT_FAILED',
  NOT_WHITELISTED_URL_CALL = 'NOT_WHITELISTED_URL_CALL',
  HEALTH_CHECK_SUCCESS = 'HEALTH_CHECK_SUCCESS',
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
}

export const logger = new Logger();
