import { Server } from 'ssh2';
import SFTP from 'ssh2-sftp-client';
import { newSftpServer, close, listen } from '../mocks/sftpServer.mock';

const username = 'foo';
const password = 'bar';

const storedFiles = new Map();
storedFiles.set('/tmp/a.txt', 'Lorem ipsum dolor sit amet');

describe('sftpServer.mock', () => {
  let sftpServer: Server;
  let sftpClient: SFTP;

  beforeAll(async () => {
    sftpServer = newSftpServer(
      Buffer.from(username),
      Buffer.from(password),
      storedFiles as Map<string, string>,
    );
    await listen(sftpServer, 0, '127.0.0.1');
  });

  afterAll(async () => {
    await close(sftpServer);
  });

  beforeEach(async () => {
    const connectOptions: SFTP.ConnectOptions = {
      host: sftpServer.address().address,
      port: sftpServer.address().port,
      username,
      password,
    };
    sftpClient = new SFTP();
    await sftpClient.connect(connectOptions);
  });

  afterEach(async () => {
    await sftpClient.end();
  });

  test('GET', async () => {
    const contents = await sftpClient.get('/tmp/a.txt');
    expect(Buffer.from(contents).toString()).toBe('Lorem ipsum dolor sit amet');
  });

  test('RENAME', async () => {
    const foo = await sftpClient.get('/tmp/a.txt');
    expect(Buffer.from(foo).toString()).toBe('Lorem ipsum dolor sit amet');

    await expect(
      sftpClient.rename('/tmp/a.txt', '/tmp/b.txt'),
    ).resolves.toBe('Successfully renamed /tmp/a.txt to /tmp/b.txt');

    const foo2 = await sftpClient.get('/tmp/b.txt');
    expect(Buffer.from(foo2).toString()).toBe('Lorem ipsum dolor sit amet');

    await expect(
      sftpClient.get('/tmp/a.txt'),
    ).rejects.toEqual(new Error('get: Failure /tmp/a.txt'));
  });

  test('PUT', async () => {
    const fileName = '/c.txt';
    const contents = 'Hello world';

    await expect(
      sftpClient.get(fileName),
    ).rejects.toEqual(new Error(`get: Failure ${fileName}`));

    await expect(
      sftpClient.put(Buffer.from(contents), fileName),
    ).resolves.toBe(`Uploaded data stream to ${fileName}`);

    expect(
      Buffer.from(await sftpClient.get(fileName)).toString(),
    ).toEqual(contents);
  });
});
