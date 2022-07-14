import { promises } from 'dns';
import { logger } from '../observability/logger';

export class SFTPAddressResolver {
  public async resolve(dnsServerAddress: string, sftpHost: string): Promise<string> {
    promises.setServers([dnsServerAddress]);
    logger.info(`Checking ip address of ${sftpHost} with dns server ${dnsServerAddress}`);
    const result = await promises.resolve4(sftpHost);
    logger.info(`SFTP address resolved: ${result[0]}`);
    return result[0];
  }
}

export default new SFTPAddressResolver();
