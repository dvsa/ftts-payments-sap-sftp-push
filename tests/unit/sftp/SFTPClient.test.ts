import { mock } from 'jest-mock-extended';
import SFTP from 'ssh2-sftp-client';
import { SFTPClient } from '../../../src/sftp/SFTPClient';

jest.mock('ssh2-sftp-client');

const sftpMock = mock<SFTP>();

const connectOptions: SFTP.ConnectOptions = {};
const input = {} as Buffer;
const filePath = 'some file';
const sftpClient = new SFTPClient(connectOptions, sftpMock);

describe('SFTPClient', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('upload', () => {
    test('GIVEN input buffer and filePath WHEN upload THEN sftp library was called with correct arguments', async () => {
      await sftpClient.upload(input, filePath);

      expect(sftpMock.put).toHaveBeenCalledTimes(1);
      expect(sftpMock.put).toHaveBeenCalledWith(input, filePath);
    });

    test('GIVEN input buffer and filePath WHEN put fails THEN error is thrown and "end" is called', async () => {
      const expectedError = new Error('put error');
      sftpMock.put.mockImplementation(() => { throw expectedError; });

      await expect(sftpClient.upload(input, filePath)).rejects.toThrow(expectedError);
      expect(sftpMock.put).toHaveBeenCalledTimes(1);
      expect(sftpMock.put).toHaveBeenCalledWith(input, filePath);
    });
  });

  describe('connect', () => {
    test('WHEN called THEN sftp library is called', async () => {
      await sftpClient.connect();

      expect(sftpMock.connect).toHaveBeenCalledTimes(1);
      expect(sftpMock.connect).toHaveBeenCalledWith(connectOptions);
    });

    test('GIVEN an error WHEN called THEN the error is thrown', async () => {
      const expectedError = new Error('not connected');
      sftpMock.connect.mockImplementation(() => { throw expectedError; });

      await expect(sftpClient.connect()).rejects.toEqual(expectedError);
    });
  });

  describe('disconnect', () => {
    test('WHEN called THEN sftp library is called', async () => {
      await sftpClient.disconnect();

      expect(sftpMock.end).toHaveBeenCalledTimes(1);
    });

    test('GIVEN an error WHEN called THEN the error is thrown', async () => {
      const expectedError = new Error('wrong');
      sftpMock.end.mockImplementation(() => { throw expectedError; });

      await expect(sftpClient.disconnect()).rejects.toEqual(expectedError);
    });
  });
});
