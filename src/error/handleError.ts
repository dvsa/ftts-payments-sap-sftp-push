/* eslint-disable @typescript-eslint/no-explicit-any */
import { InternalAccessDeniedError } from '@dvsa/egress-filtering';
import { BusinessTelemetryEvent, logger } from '../observability/logger';

export default function handleError(error: any): void {
  if (error instanceof InternalAccessDeniedError) {
    logger.logEvent(
      BusinessTelemetryEvent.NOT_WHITELISTED_URL_CALL,
      error.message,
      {
        host: error.host,
        port: error.port,
      },
    );
  } else {
    logger.error(error as Error);
  }
  throw error;
}
