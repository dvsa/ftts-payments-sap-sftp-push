import SFTP from 'ssh2-sftp-client';

export class SFTPClient {
  constructor(
    private connectOptions: SFTP.ConnectOptions,
    private client: SFTP,
  ) { }

  public async connect(): Promise<void> {
    await this.client.connect(this.connectOptions);
  }

  public async disconnect(): Promise<void> {
    await this.client.end();
  }

  public async upload(input: Buffer, filePath: string): Promise<void> {
    await this.client.put(input, filePath);
  }

  public async fileExists(destPath: string): Promise<boolean> {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const exists = await this.client.exists(destPath);
    // will be false or d, -, l (dir, file or link)
    return exists === '-';
  }

  public async fileStats(destPath: string): Promise<SFTP.FileStats> {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return this.client.stat(destPath);
  }
}
