import { mock } from 'jest-mock-extended';
import SFTP from 'ssh2-sftp-client';
import config from '../../../src/config';
import { newSftpClient } from '../../../src/sftp/newSFTPClient';
import { SFTPClient } from '../../../src/sftp/SFTPClient';
import upload from '../../../src/uploader/upload';
import { mockedLogger } from '../../mocks/logger.mock';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';

jest.mock('../../../src/sftp/SFTPClient');
jest.mock('../../../src/sftp/newSFTPClient');
jest.mock('../../../src/config');
jest.mock('../../../src/observability/logger');

const mockedSFTPClient = mock<SFTPClient>();
const mockedNewSFTPClient = jest.mocked(newSftpClient, true);
const mockedConfig = jest.mocked(config, true);

const blob = Buffer.from('my blob');
const sftpPath = '/some/path';
const fileName = 'my_file.csv';
const logProperties = {
  fileName,
  size: blob.length,
  destPath: `${sftpPath}${fileName}`,
};

describe('upload', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedConfig.sftp.path = sftpPath;
    mockedNewSFTPClient.mockResolvedValue(mockedSFTPClient);
    mockedSFTPClient.connect.mockResolvedValue();
    mockedSFTPClient.disconnect.mockResolvedValue();
    mockedSFTPClient.fileExists.mockResolvedValue(true);
    mockedSFTPClient.fileStats.mockResolvedValue({
      isFile: true,
      size: blob.length,
    } as SFTP.FileStats);
  });

  test('GIVEN a blob and a file name WHEN called THEN sftpClient.upload is called', async () => {
    await upload(fileName, blob);

    expect(mockedSFTPClient.connect).toHaveBeenCalledTimes(1);
    expect(mockedSFTPClient.upload).toHaveBeenCalledTimes(1);
    expect(mockedSFTPClient.upload).toHaveBeenCalledWith(blob, `${sftpPath}${fileName}`);
    expect(mockedSFTPClient.disconnect).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(4);
    expect(mockedLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_STARTED,
      undefined,
      logProperties,
    );
    expect(mockedLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_SUCCESSFUL,
      'Upload successful',
      logProperties,
    );
    expect(mockedLogger.logEvent).toHaveBeenNthCalledWith(
      3,
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_STATS,
      'File exists',
      {
        exists: true,
      },
    );
    expect(mockedLogger.logEvent).toHaveBeenNthCalledWith(
      4,
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_STATS,
      'File stats',
      {
        isFile: true,
        size: blob.length,
      },
    );
  });

  test('GIVEN a blob and a file name WHEN called AND the file does not exist THEN it is reflected in logs', async () => {
    mockedSFTPClient.fileExists.mockResolvedValue(false);

    await upload(fileName, blob);

    expect(mockedSFTPClient.connect).toHaveBeenCalledTimes(1);
    expect(mockedSFTPClient.upload).toHaveBeenCalledTimes(1);
    expect(mockedSFTPClient.upload).toHaveBeenCalledWith(blob, `${sftpPath}${fileName}`);
    expect(mockedSFTPClient.disconnect).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(3);
    expect(mockedLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_STARTED,
      undefined,
      logProperties,
    );
    expect(mockedLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_SUCCESSFUL,
      'Upload successful',
      logProperties,
    );
    expect(mockedLogger.logEvent).toHaveBeenNthCalledWith(
      3,
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_STATS,
      'File exists',
      {
        exists: false,
      },
    );
    expect(mockedSFTPClient.fileExists).toHaveBeenCalledWith(`${sftpPath}${fileName}`);
  });

  test('GIVEN a blob and a file name WHEN called AND the file corrupts THEN it is reflected in logs', async () => {
    mockedSFTPClient.fileStats.mockResolvedValue({
      mode: 33279,
      isFile: true,
      // corrupted
      size: blob.length - 1,
    } as SFTP.FileStats);

    await upload(fileName, blob);

    expect(mockedSFTPClient.connect).toHaveBeenCalledTimes(1);
    expect(mockedSFTPClient.upload).toHaveBeenCalledTimes(1);
    expect(mockedSFTPClient.upload).toHaveBeenCalledWith(blob, `${sftpPath}${fileName}`);
    expect(mockedSFTPClient.disconnect).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(4);
    expect(mockedLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_STARTED,
      undefined,
      logProperties,
    );
    expect(mockedLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_SUCCESSFUL,
      'Upload successful',
      logProperties,
    );
    expect(mockedLogger.logEvent).toHaveBeenNthCalledWith(
      3,
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_STATS,
      'File exists',
      {
        exists: true,
      },
    );
    expect(mockedLogger.logEvent).toHaveBeenNthCalledWith(
      4,
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_STATS,
      'File stats',
      {
        mode: 33279,
        isFile: true,
        size: blob.length - 1,
      },
    );
    expect(mockedSFTPClient.fileStats).toHaveBeenCalledWith(`${sftpPath}${fileName}`);
  });

  test('GIVEN a blob and a file name WHEN sftpClient.upload fails THEN an error is thrown', async () => {
    const expectedError = new Error('upload failed');
    mockedSFTPClient.upload.mockImplementation(() => { throw expectedError; });

    await expect(upload(fileName, blob)).rejects.toThrow(expectedError);
    expect(mockedSFTPClient.connect).toHaveBeenCalledTimes(1);
    expect(mockedSFTPClient.disconnect).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledWith(
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_STARTED,
      undefined,
      logProperties,
    );
    expect(mockedSFTPClient.upload).toHaveBeenCalledWith(blob, `${sftpPath}${fileName}`);
  });

  test('GIVEN a blob and a file name WHEN sftpClient.fileExists fails THEN an error is thrown', async () => {
    const expectedError = new Error('upload failed');
    mockedSFTPClient.fileExists.mockImplementation(() => { throw expectedError; });

    await expect(upload(fileName, blob)).rejects.toThrow(expectedError);
    expect(mockedSFTPClient.connect).toHaveBeenCalledTimes(1);
    expect(mockedSFTPClient.disconnect).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(mockedLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_STARTED,
      undefined,
      logProperties,
    );
    expect(mockedLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_SUCCESSFUL,
      'Upload successful',
      logProperties,
    );
    expect(mockedSFTPClient.fileExists).toHaveBeenCalledWith(`${sftpPath}${fileName}`);
  });

  test('GIVEN a blob and a file name WHEN sftpClient.fileStats fails THEN an error is thrown', async () => {
    const expectedError = new Error('upload failed');
    mockedSFTPClient.fileStats.mockRejectedValue(
      expectedError,
    );

    await expect(upload(fileName, blob)).rejects.toThrow(expectedError);
    expect(mockedSFTPClient.connect).toHaveBeenCalledTimes(1);
    expect(mockedSFTPClient.disconnect).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(3);
    expect(mockedLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_STARTED,
      undefined,
      logProperties,
    );
    expect(mockedLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_SUCCESSFUL,
      'Upload successful',
      logProperties,
    );
    expect(mockedLogger.logEvent).toHaveBeenNthCalledWith(
      3,
      BusinessTelemetryEvent.SAP_SFTP_UPLOAD_STATS,
      'File exists',
      {
        exists: true,
      },
    );
    expect(mockedSFTPClient.fileStats).toHaveBeenCalledWith(`${sftpPath}${fileName}`);
  });
});
