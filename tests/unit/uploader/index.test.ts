import { BusinessTelemetryEvent } from '../../../src/observability/logger';
import { createTraceparent } from '../../../src/observability/createTraceparent';
import { azureBlobStorageTrigger, index as wrappedStorageTrigger } from '../../../src/uploader/index';
import upload from '../../../src/uploader/upload';
import { mockedContext } from '../../mocks/context.mock';
import { mockedLogger } from '../../mocks/logger.mock';

jest.mock('../../../src/uploader/upload');
const mockedUpload = jest.mocked(upload, true);

jest.mock('../../../src/observability/createTraceparent');
const mockedCreateTraceparent = jest.mocked(createTraceparent, true);

jest.mock('../../../src/observability/logger');

const blob = Buffer.from('my blob file');
const fileName = 'blob file name';

describe('uploader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedContext.bindingData.name = fileName;
  });

  test('WHEN called THEN upload function is called', async () => {
    await azureBlobStorageTrigger(mockedContext, blob);

    expect(mockedUpload).toHaveBeenCalledTimes(1);
    expect(mockedUpload).toHaveBeenCalledWith(fileName, blob);
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(0);
  });

  test('WHEN called THEN throw an error', async () => {
    const errorMessage = 'msg';
    const expectedError = new Error(errorMessage);
    mockedUpload.mockRejectedValue(expectedError);

    await expect(azureBlobStorageTrigger(mockedContext, blob)).rejects.toThrow(expectedError);
    expect(mockedUpload).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledWith(
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_ATTEMPT_FAILED,
      errorMessage,
      {
        fileName,
        size: blob.length,
      },
    );
  });
});

describe('wrapped storageTrigger', () => {
  const operationid = '22222222222222222222222222222222';
  const originalTraceparent = '00-12345678901234567890123456789012-1234567890123456-11';
  const expectedTraceparent = '00-22222222222222222222222222222222-1234567890123456-11';
  test('GIVEN azure function WHEN invoke wrapper THEN wrapped function is invoked', async () => {
    mockedContext.bindingData.metadata = { operationid };
    mockedContext.traceContext.traceparent = originalTraceparent;
    const mockedBlob = Buffer.from('simple,csv,content');
    mockedCreateTraceparent.mockReturnValue(expectedTraceparent);

    await wrappedStorageTrigger(mockedContext, mockedBlob);

    expect(mockedContext.traceContext.traceparent).toEqual(expectedTraceparent);
    expect(mockedCreateTraceparent).toHaveBeenCalledTimes(1);
    expect(mockedCreateTraceparent).toHaveBeenCalledWith(originalTraceparent, operationid);
  });
});
