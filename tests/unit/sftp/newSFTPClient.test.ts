import SFTP from 'ssh2-sftp-client';
import config from '../../../src/config';
import { newSftpClient } from '../../../src/sftp/newSFTPClient';
import sFTPAddressResolver from '../../../src/sftp/SFTPAddressResolver';
import { SFTPClient } from '../../../src/sftp/SFTPClient';

const DNS_SERVER = 'DNS_SERVER';
const SFTP_HOST = 'SFTP_HOST';
const SFTP_USERNAME = 'SFTP_USERNAME';
const SFTP_PASSWORD = 'SFTP_PASSWORD';
const SFTP_IP = '192.168.0.1';
const SFTP_PORT = '22';

jest.mock('../../../src/config');
const configMock = jest.mocked(config, true);

jest.mock('../../../src/sftp/SFTPAddressResolver');
const sFTPAddressResolverMock = jest.mocked(sFTPAddressResolver, true);

jest.mock('../../../src/sftp/SFTPClient');

describe('newSFTPClient', () => {
  test('GIVEN config WHEN newSFTPClient THEN new object returned', async () => {
    configMock.sftp.dnsServer = DNS_SERVER;
    configMock.sftp.password = SFTP_PASSWORD;
    configMock.sftp.userName = SFTP_USERNAME;
    configMock.sftp.sftpHost = SFTP_HOST;
    configMock.sftp.sftpPort = SFTP_PORT;

    sFTPAddressResolverMock.resolve.mockResolvedValue(SFTP_IP);

    const sftpClient: SFTPClient = await newSftpClient();

    expect(sftpClient).toBeDefined();
    expect(SFTPClient).toHaveBeenCalledTimes(1);
    expect(SFTPClient).toHaveBeenCalledWith(
      {
        host: SFTP_IP,
        port: Number(SFTP_PORT),
        username: SFTP_USERNAME,
        password: SFTP_PASSWORD,
        debug: expect.anything() as string,
      },
      expect.any(SFTP),
    );
    expect(sFTPAddressResolverMock.resolve).toHaveBeenCalledWith(DNS_SERVER, SFTP_HOST);
  });
});
