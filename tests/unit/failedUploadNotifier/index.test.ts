import { BusinessTelemetryEvent } from '../../../src/observability/logger';
import { createTraceparent } from '../../../src/observability/createTraceparent';
import { poisonQueueTrigger, index as wrappedPisonQueueTrigger } from '../../../src/failedUploadNotifier';
import { mockedContext } from '../../mocks/context.mock';
import { mockedLogger } from '../../mocks/logger.mock';
import { mockedAzureBlobClient } from '../../mocks/azureBlobClient.mock';
import handleError from '../../../src/error/handleError';

jest.mock('../../../src/azureBlob/azureBlobClient');
jest.mock('../../../src/observability/logger');
jest.mock('../../../src/observability/createTraceparent');
const mockedCreateTraceparent = jest.mocked(createTraceparent, true);

jest.mock('../../../src/error/handleError');
const mockedHandleError = jest.mocked(handleError, true);

const fileName = 'FTTS_20201103000000.dat';
const containerName = 'files';
const operationid = '22222222222222222222222222222222';
const metadata = { operationid };
const properties = {
  fileName,
  containerName,
};

describe('failedUploadNotifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedContext.bindingData.queueTrigger = {
      blobName: fileName,
      containerName,
    };
  });

  describe('poisonQueueTrigger', () => {
    test('GIVEN context WHEN called THEN proper event is logged', async () => {
      await poisonQueueTrigger(mockedContext);

      expect(mockedLogger.info).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        1,
        'Trying to execute failedUploadNotifier',
        properties,
      );
      expect(mockedLogger.info).toHaveBeenNthCalledWith(
        2,
        'Successfully executed failedUploadNotifier',
        properties,
      );
      expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
      expect(mockedLogger.logEvent).toHaveBeenCalledWith(
        BusinessTelemetryEvent.SAP_SFTP_UPLOAD_FAILED,
        undefined,
        properties,
      );
    });

    test('GIVEN context without bindingData.queueTrigger WHEN called THEN error is logged', async () => {
      mockedContext.bindingData = {};

      await poisonQueueTrigger(mockedContext);

      expect(mockedLogger.info).toHaveBeenCalledTimes(0);
      expect(mockedLogger.logEvent).toHaveBeenCalledTimes(0);
      expect(mockedHandleError).toHaveBeenCalledTimes(1);
      expect(mockedHandleError).toHaveBeenCalledWith(new Error("Cannot read properties of undefined (reading \'blobName\')"));
    });
  });

  describe('wrapped poisonQueueTrigger', () => {
    const originalTraceparent = '00-12345678901234567890123456789012-1234567890123456-11';
    const expectedTraceparent = `00-${operationid}-1234567890123456-11`;
    test('GIVEN azure function WHEN invoke wrapper THEN wrapped function is invoked', async () => {
      mockedContext.traceContext.traceparent = originalTraceparent;
      mockedAzureBlobClient.getFileMetadata.mockResolvedValue(metadata);
      mockedCreateTraceparent.mockReturnValue(expectedTraceparent);

      await wrappedPisonQueueTrigger(mockedContext);

      expect(mockedContext.traceContext.traceparent).toEqual(expectedTraceparent);
      expect(mockedAzureBlobClient.getFileMetadata).toHaveBeenCalledTimes(1);
      expect(mockedAzureBlobClient.getFileMetadata).toHaveBeenCalledWith(containerName, fileName);
      expect(mockedCreateTraceparent).toHaveBeenCalledTimes(1);
      expect(mockedCreateTraceparent).toHaveBeenCalledWith(originalTraceparent, operationid);
    });
  });
});
