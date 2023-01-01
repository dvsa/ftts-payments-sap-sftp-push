/* eslint-disable @typescript-eslint/no-empty-function */
import { Address, addressParser, InternalAccessDeniedError } from '@dvsa/egress-filtering';
import config from '../config';
import { logger } from '../observability/logger';

export const whitelistedUrls: Array<Address> = addressParser.parseConnectionString(config.azureBlob.storageConnectionString);

export const onInternalAccessDeniedError = (error: InternalAccessDeniedError): void => {
  logger.security('egress::OnInternalAccessDeniedError: url is not whitelisted so it cannot be called', {
    host: error.host,
    port: error.port,
    reason: JSON.stringify(error),
  });
  throw error;
};
