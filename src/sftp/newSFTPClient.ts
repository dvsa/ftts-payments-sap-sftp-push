import SFTP from 'ssh2-sftp-client';
import config from '../config';
import { SFTPClient } from './SFTPClient';
import sftpAddressResolver from './SFTPAddressResolver';
import { logger } from '../observability/logger';

export const getConnectOptions = async (): Promise<SFTP.ConnectOptions> => ({
  host: await sftpAddressResolver.resolve(config.sftp.dnsServer, config.sftp.sftpHost),
  port: Number(config.sftp.sftpPort),
  username: config.sftp.userName,
  password: config.sftp.password,
  debug: (msg: string): void => {
    logger.debug(msg);
  },
});

export const newSftpClient = async (): Promise<SFTPClient> => new SFTPClient(
  await getConnectOptions(),
  new SFTP(),
);
