import { withEgressFiltering } from '@dvsa/egress-filtering';
import { AzureFunction, Context } from '@azure/functions';
import { nonHttpTriggerContextWrapper } from '@dvsa/azure-logger';
import { BusinessTelemetryEvent, logger } from '../observability/logger';
import { createTraceparent } from '../observability/createTraceparent';
import upload from './upload';
import { onInternalAccessDeniedError, whitelistedUrls } from '../security/EgressFilterSetup';

export const azureBlobStorageTrigger: AzureFunction = async function uploader(
  context: Context,
  myBlob: Buffer,
): Promise<void> {
  try {
    const fileName = context.bindingData.name as string;
    logger.info(
      'Trying to sftp push',
      {
        name: fileName,
        length: myBlob.length,
      },
    );
    await upload(fileName, myBlob);
  } catch (error) {
    logger.logEvent(
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_ATTEMPT_FAILED,
      (error as Error).message,
      {
        fileName: context.bindingData.name as string,
        size: myBlob.length,
      },
    );
    throw error; // error needs to be thrown to enable Azure retry and append to poison queue
  }
};

export const index = (context: Context, myBlob: Buffer): Promise<void> => {
  const { operationid } = context.bindingData?.metadata as Record<string, string>;
  context.traceContext.traceparent = createTraceparent(context.traceContext.traceparent, operationid);

  return nonHttpTriggerContextWrapper(
    withEgressFiltering(azureBlobStorageTrigger, whitelistedUrls, onInternalAccessDeniedError, logger),
    context, myBlob,
  );
};
