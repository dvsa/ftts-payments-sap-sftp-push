import dns from 'dns';
import { Server } from 'ssh2';
import SFTP from 'ssh2-sftp-client';
import config from '../../src/config';
import { azureBlobStorageTrigger } from '../../src/uploader/index';
import { mockedContext } from '../mocks/context.mock';
import { close, listen, newSftpServer } from '../mocks/sftpServer.mock';

jest.mock('../../src/config');
const mockedConfig = jest.mocked(config, true);

let sftpServer: Server;

const username = 'foo';
const password = 'bar';
const sftpAddress = '127.0.0.1';

jest.mock('dns', () => ({
  promises: {
    setServers: jest.fn(),
    resolve4: jest.fn(),
  },
}));
const resolve4Mock = jest.mocked(dns.promises.resolve4, true);
const dnsResolveResult = [sftpAddress];

const FILE_NAME = 'sample_file.csv';
const EXPECTED_FILENAME = './sample_file.csv';
const FILE_CONTENT = 'sss,fff,ggg,ttt,yyy';

describe('SFTP Push Uploader', () => {
  beforeEach(async () => {
    sftpServer = newSftpServer(
      Buffer.from(username),
      Buffer.from(password),
      new Map(),
    );
    await listen(sftpServer, 0, sftpAddress);

    mockedConfig.sftp.dnsServer = '';
    mockedConfig.sftp.password = password;
    mockedConfig.sftp.userName = username;
    mockedConfig.sftp.sftpHost = 'server_sftp';
    mockedConfig.sftp.sftpPort = sftpServer.address().port.toString();
    mockedConfig.sftp.path = './';

    resolve4Mock.mockResolvedValue(dnsResolveResult);
  });

  afterEach(async () => {
    await close(sftpServer);
    jest.resetAllMocks();
  });

  test('GIVEN blob WHEN call uploader THEN correct file in SFTP server is present', async () => {
    const myBlob = Buffer.from(FILE_CONTENT);
    mockedContext.bindingData.name = FILE_NAME;

    await azureBlobStorageTrigger(mockedContext, myBlob);

    const file = await getFileFromSftp(EXPECTED_FILENAME);
    expect(file).toEqual(Buffer.from(FILE_CONTENT));
  });

  test('GIVEN wrong sftp password WHEN call uploader THEN error is thrown', async () => {
    const myBlob = Buffer.from(FILE_CONTENT);
    mockedContext.bindingData.name = FILE_NAME;
    mockedConfig.sftp.password = 'wrong';

    const error = new Error('end: No SFTP connection available');
    await expect(() => azureBlobStorageTrigger(mockedContext, myBlob)).rejects.toThrow(error);
  });
});

async function getFileFromSftp(fileName: string): Promise<Buffer> {
  const sftpClient = new SFTP();
  try {
    const connectOptions: SFTP.ConnectOptions = {
      host: sftpServer.address().address,
      port: sftpServer.address().port,
      username,
      password,
    };
    await sftpClient.connect(connectOptions);
    const file = await sftpClient.get(fileName);
    return file as Buffer;
  } finally {
    await sftpClient.end();
  }
}
