import * as Healthcheck from '@dvsa/healthcheck';
import { getConnectOptions } from '../../../src/sftp/newSFTPClient';
import { httpTrigger } from '../../../src/healthcheck/httpTrigger';
import { mockedContext } from '../../mocks/context.mock';
import { httpRequest } from '../../mocks/httpRequest.mock';
import { mockedConfig } from '../../mocks/config.mock';
import { mockedLogger } from '../../mocks/logger.mock';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';

jest.mock('../../../src/observability/logger');
jest.mock('../../../src/config');

jest.mock('@dvsa/healthcheck');
const mockedAzureBlobHealthcheck = jest.mocked(Healthcheck.azureBlobHealthcheck, true);
const mockedSftpHealthcheck = jest.mocked(Healthcheck.sftpHealthcheck, true);

jest.mock('../../../src/sftp/newSFTPClient');
const mockedGetConnectOptions = jest.mocked(getConnectOptions, true);

describe('healthcheck', () => {
  const azureBlobConnectionString = 'connection';
  const azureBlobContainerName = 'container';
  const azureBlobError = new Error('azure blob failed');
  const sftpError = new Error('sftp failed');
  const azureBlobServiceUnavailableError: Healthcheck.ServiceUnavailableError = {
    component: Healthcheck.Component.AZURE_BLOB_STORAGE,
    message: 'azure blob failed',
  };
  const sftpServiceUnavailableError: Healthcheck.ServiceUnavailableError = {
    component: Healthcheck.Component.SFTP_SERVER,
    message: 'sftp failed',
  };

  beforeEach(() => {
    mockedConfig.azureBlob.storageConnectionString = azureBlobConnectionString;
    mockedConfig.azureBlob.containerName = azureBlobContainerName;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('GIVEN request WHEN no errors THEN return http status 200', async () => {
    mockedAzureBlobHealthcheck.mockResolvedValue(undefined);
    mockedSftpHealthcheck.mockResolvedValue(undefined);

    await httpTrigger(mockedContext, httpRequest);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect((mockedContext.res)!.status).toBe(200);
    expect(mockedAzureBlobHealthcheck).toHaveBeenCalledTimes(1);
    expect(mockedAzureBlobHealthcheck).toHaveBeenCalledWith(
      azureBlobConnectionString,
      azureBlobContainerName,
    );
    expect(mockedSftpHealthcheck).toHaveBeenCalledTimes(1);
    expect(mockedSftpHealthcheck).toHaveBeenCalledWith(mockedGetConnectOptions());
    expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledWith('Trying to invoke healthcheck function');
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledWith(
      BusinessTelemetryEvent.HEALTH_CHECK_SUCCESS,
      'Components are healthy',
      {
        components: [
          Healthcheck.Component.AZURE_BLOB_STORAGE,
          Healthcheck.Component.SFTP_SERVER,
        ],
      },
    );
  });

  test('GIVEN request WHEN azure blob error THEN return http status 503 with proper body', async () => {
    mockedAzureBlobHealthcheck.mockResolvedValue(azureBlobError);
    mockedSftpHealthcheck.mockResolvedValue(undefined);

    await httpTrigger(mockedContext, httpRequest);

    expect(mockedContext.res).toEqual({
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
      body: new Healthcheck.ServiceUnavailableResponse([azureBlobServiceUnavailableError]),
    });
    expect(mockedAzureBlobHealthcheck).toHaveBeenCalledTimes(1);
    expect(mockedSftpHealthcheck).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledWith('Trying to invoke healthcheck function');
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledWith(
      BusinessTelemetryEvent.HEALTH_CHECK_FAILED,
      'At least one component is unhealthy',
      {
        errors: [azureBlobServiceUnavailableError],
      },
    );
  });

  test('GIVEN request WHEN sftp error THEN return http status 503 with proper body', async () => {
    mockedAzureBlobHealthcheck.mockResolvedValue(undefined);
    mockedSftpHealthcheck.mockResolvedValue(sftpError);

    await httpTrigger(mockedContext, httpRequest);

    expect(mockedContext.res).toEqual({
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
      body: new Healthcheck.ServiceUnavailableResponse([sftpServiceUnavailableError]),
    });
    expect(mockedAzureBlobHealthcheck).toHaveBeenCalledTimes(1);
    expect(mockedSftpHealthcheck).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledWith('Trying to invoke healthcheck function');
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledWith(
      BusinessTelemetryEvent.HEALTH_CHECK_FAILED,
      'At least one component is unhealthy',
      {
        errors: [sftpServiceUnavailableError],
      },
    );
  });

  test('GIVEN request WHEN all errors THEN return http status 503 with proper body', async () => {
    mockedAzureBlobHealthcheck.mockResolvedValue(azureBlobError);
    mockedSftpHealthcheck.mockResolvedValue(sftpError);

    await httpTrigger(mockedContext, httpRequest);

    expect(mockedContext.res).toEqual({
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
      body: new Healthcheck.ServiceUnavailableResponse([
        azureBlobServiceUnavailableError,
        sftpServiceUnavailableError,
      ]),
    });
    expect(mockedAzureBlobHealthcheck).toHaveBeenCalledTimes(1);
    expect(mockedSftpHealthcheck).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledWith('Trying to invoke healthcheck function');
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledWith(
      BusinessTelemetryEvent.HEALTH_CHECK_FAILED,
      'At least one component is unhealthy',
      {
        errors: [
          azureBlobServiceUnavailableError,
          sftpServiceUnavailableError,
        ],
      },
    );
  });

  test('GIVEN request WHEN error not from tested components THEN returns http status 500 and log proper event', async () => {
    const otherError = new Error();
    mockedAzureBlobHealthcheck.mockRejectedValue(otherError);

    await httpTrigger(mockedContext, httpRequest);

    expect(mockedContext.res).toEqual({
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        code: 500,
        message: 'No additional error details',
      },
    });
    expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledWith('Trying to invoke healthcheck function');
    expect(mockedLogger.error).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledWith(
      BusinessTelemetryEvent.HEALTH_CHECK_FAILED,
      'No additional error details',
    );
  });
});
