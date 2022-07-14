import { withEgressFiltering } from '@dvsa/egress-filtering';
import { AzureFunction, Context, ContextBindingData } from '@azure/functions';
import { nonHttpTriggerContextWrapper } from '@dvsa/azure-logger';
import { logger, BusinessTelemetryEvent } from '../observability/logger';
import { createTraceparent } from '../observability/createTraceparent';
import { newAzureBlobClient } from '../azureBlob/azureBlobClient';
import { onInternalAccessDeniedError, whitelistedUrls } from '../security/EgressFilterSetup';
import handleError from '../error/handleError';

interface QueueBindingData extends ContextBindingData {
  queueTrigger: {
    blobName: string,
    containerName: string
  }
}

export const poisonQueueTrigger: AzureFunction = async function failedUploadNotifier(context: Context): Promise<void> {
  try {
    const properties = {
      fileName: (context.bindingData as QueueBindingData).queueTrigger.blobName,
      containerName: (context.bindingData as QueueBindingData).queueTrigger.containerName,
    };
    logger.info('Trying to execute failedUploadNotifier', properties);
    logger.logEvent(
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_FAILED,
      undefined,
      properties,
    );
    logger.info('Successfully executed failedUploadNotifier', properties);
  } catch (error) {
    handleError(error);
  }
  return Promise.resolve();
};

export const index = async (context: Context): Promise<void> => nonHttpTriggerContextWrapper(
  withEgressFiltering(poisonQueueTrigger, whitelistedUrls, onInternalAccessDeniedError, logger),
  await setOperationId(context),
);

async function setOperationId(context: Context): Promise<Context> {
  const { blobName, containerName } = (context.bindingData as QueueBindingData).queueTrigger;
  const metadata = await newAzureBlobClient().getFileMetadata(containerName, blobName);
  context.traceContext.traceparent = createTraceparent(
    context.traceContext.traceparent,
    metadata ? metadata.operationid : '',
  );
  return context;
}
