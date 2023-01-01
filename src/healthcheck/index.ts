import { withEgressFiltering } from '@dvsa/egress-filtering';
import { httpTriggerContextWrapper } from '@dvsa/azure-logger';
import { withRolesValidation, Role, resolveBooleanConfig } from '@dvsa/ftts-role-validation';
import { Context, HttpRequest } from '@azure/functions';
import { httpTrigger } from './httpTrigger';
import { logger } from '../observability/logger';
import config from '../config';
import { onInternalAccessDeniedError, whitelistedUrls } from '../security/EgressFilterSetup';

export const index = async (context: Context, httpRequest: HttpRequest): Promise<void> => httpTriggerContextWrapper(
  withEgressFiltering(
    withRolesValidation(
      httpTrigger,
      resolveBooleanConfig(config.security.rolesValidation),
      [Role.OPERATIONS_HEALTHCHECK_READ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error: Error, message?: string, properties?: Record<string, any>): void => logger.error(error, message, properties),
    ),
    whitelistedUrls,
    onInternalAccessDeniedError,
    logger,
  ),
  context,
  httpRequest,
);
