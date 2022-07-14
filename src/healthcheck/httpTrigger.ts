import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import * as Healthcheck from '@dvsa/healthcheck';
import { logger, BusinessTelemetryEvent } from '../observability/logger';
import config from '../config';
import { getConnectOptions } from '../sftp/newSFTPClient';

const headers = {
  'Content-Type': 'application/json',
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const httpTrigger: AzureFunction = async function healthcheck(context: Context, _req: HttpRequest): Promise<void> {
  try {
    logger.info('Trying to invoke healthcheck function');
    const blobError = await Healthcheck.azureBlobHealthcheck(
      config.azureBlob.storageConnectionString,
      config.azureBlob.containerName,
    );
    const sftpError = await Healthcheck.sftpHealthcheck(getConnectOptions());
    const errors: Healthcheck.ServiceUnavailableError[] = [];
    if (blobError) {
      errors.push({
        component: Healthcheck.Component.AZURE_BLOB_STORAGE,
        message: blobError.message,
      });
    }
    if (sftpError) {
      errors.push({
        component: Healthcheck.Component.SFTP_SERVER,
        message: sftpError.message,
      });
    }
    if (errors.length > 0) {
      logger.logEvent(
        BusinessTelemetryEvent.HEALTH_CHECK_FAILED,
        'At least one component is unhealthy',
        { errors },
      );
      context.res = {
        status: 503,
        headers,
        body: new Healthcheck.ServiceUnavailableResponse(errors),
      };
    } else {
      logger.logEvent(
        BusinessTelemetryEvent.HEALTH_CHECK_SUCCESS,
        'Components are healthy',
        {
          components: [
            Healthcheck.Component.AZURE_BLOB_STORAGE,
            Healthcheck.Component.SFTP_SERVER,
          ],
        },
      );
      context.res = {
        status: 200,
      };
    }
  } catch (error) {
    const errorMessage = (error as Error).message || 'No additional error details';
    logger.error(new Healthcheck.HealthcheckError(errorMessage, error), errorMessage);
    logger.logEvent(
      BusinessTelemetryEvent.HEALTH_CHECK_FAILED,
      errorMessage,
    );
    context.res = {
      status: 500,
      headers,
      body: {
        code: 500,
        message: errorMessage,
      },
    };
  }
};
