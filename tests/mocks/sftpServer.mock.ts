/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-param-reassign */
/* eslint-disable no-shadow */
/* eslint-disable consistent-return */
/* eslint-disable no-bitwise */
/* eslint-disable no-cond-assign */
/* eslint-disable security/detect-buffer-noassert */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-var-requires */
import { timingSafeEqual } from 'crypto';
import { constants, readFileSync } from 'fs';
import { Server } from 'ssh2';
import { SftpStatusCode } from './sftpStatusCode';

function checkValue(input: any, allowed: any) {
  const autoReject = (input.length !== allowed.length);
  if (autoReject) {
    // Prevent leaking length information by always making a comparison with the
    // same input when lengths don't match what we expect ...
    allowed = input;
  }
  const isMatch = timingSafeEqual(input, allowed);
  return (!autoReject && isMatch);
}

export const listen = async (sftpServer: Server, port: number, hostname: string) => new Promise<void>(
  (resolve) => {
    sftpServer.listen(port, hostname, () => {
      console.log(`SftpServer is listening on port: ${sftpServer.address().port}`);
      resolve();
    });
  },
);

export const close = async (sftpServer: Server) => new Promise<void>(
  (resolve, reject) => {
    sftpServer.close((error) => {
      if (error) {
        reject(error);
      }
      resolve();
    });
  },
);

export const newSftpServer = (
  allowedUser: Buffer,
  allowedPassword: Buffer,
  storedFiles: Map<string, string | undefined>,
) => new Server({
  hostKeys: [readFileSync('tests/mocks/host.key')],
}, (client: any) => {
  client.on('authentication', (ctx: any) => {
    let allowed = true;
    if (!checkValue(Buffer.from(ctx.username), allowedUser)) allowed = false;

    switch (ctx.method) {
      case 'password':
        if (!checkValue(Buffer.from(ctx.password), allowedPassword)) return ctx.reject();
        break;
      default:
        return ctx.reject();
    }

    if (allowed) ctx.accept();
    else ctx.reject();
  }).on('ready', () => {
    client.on('session', (accept: any, reject: any) => {
      const session = accept();
      // eslint-disable-next-line @typescript-eslint/no-shadow
      session.on('sftp', (accept: any) => {
        const openFiles = new Map();
        let handleCount = 0;
        const sftp = accept();
        sftp.on('OPEN', (reqid: any, filename: any, flags: any, attrs: any) => {
          // Create a fake handle to return to the client, this could easily
          // be a real file descriptor number for example if actually opening
          // the file on the disk
          const handle = Buffer.alloc(4);
          openFiles.set(handleCount, {
            read: false,
            filename,
          });
          handle.writeUInt32BE(handleCount++, 0);
          sftp.handle(reqid, handle);
        }).on('READ', (reqid: any, handle: any) => {
          let fnum: any;
          if (handle.length !== 4
                    || !openFiles.has(fnum = handle.readUInt32BE(0, true))) {
            return sftp.status(reqid, SftpStatusCode.FAILURE);
          }

          // Fake the read
          const state = openFiles.get(fnum);
          if (state.read) {
            sftp.status(reqid, SftpStatusCode.EOF);
          } else {
            state.read = true;
            if (!storedFiles.has(state.filename)) {
              return sftp.status(reqid, SftpStatusCode.FAILURE);
            }
            sftp.data(reqid, storedFiles.get(state.filename));
          }
        }).on('CLOSE', (reqid: any, handle: any) => {
          let fnum: any;
          if (handle.length !== 4
                    || !openFiles.has(fnum = handle.readUInt32BE(0))) {
            return sftp.status(reqid, SftpStatusCode.FAILURE);
          }

          openFiles.delete(fnum);
          sftp.status(reqid, SftpStatusCode.OK);
        }).on('REALPATH', (reqid: any, path: any) => {
          const files = [{
            filename: path,
            longname: '-rwxrwxrwx 1 foo foo 3 Dec 8 2009 foo.txt',
            attrs: {},
          }];
          sftp.name(reqid, files);
        })
          .on('STAT', onSTAT)
          .on('LSTAT', onSTAT)
          .on('RENAME', (reqid: any, oldPath: any, newPath: any) => {
            if (!storedFiles.has(oldPath)) {
              return sftp.status(reqid, SftpStatusCode.FAILURE);
            }
            storedFiles.set(newPath, storedFiles.get(oldPath));
            storedFiles.delete(oldPath);
            sftp.status(reqid, SftpStatusCode.OK);
          })
          .on('WRITE', (reqid: any, handle: any, offset: any, data: any) => {
            let fnum: any;
            if (handle.length !== 4
                    || !openFiles.has(fnum = handle.readUInt32BE(0))) {
              return sftp.status(reqid, SftpStatusCode.FAILURE);
            }
            const state = openFiles.get(fnum);
            // Fake the write
            storedFiles.set(state.filename, data);
            sftp.status(reqid, SftpStatusCode.OK);
          });

        function onSTAT(reqid: any, path: any) {
          if (!storedFiles.has(path)) return sftp.status(reqid, SftpStatusCode.FAILURE);

          let mode = constants.S_IFREG; // Regular file
          mode |= constants.S_IRWXU; // Read, write, execute for user
          mode |= constants.S_IRWXG; // Read, write, execute for group
          mode |= constants.S_IRWXO; // Read, write, execute for other
          sftp.attrs(reqid, {
            mode,
            uid: 0,
            gid: 0,
            size: 3,
            atime: Date.now(),
            mtime: Date.now(),
          });
        }
      });
    });
  }).on('close', () => {
    console.log('Client disconnected');
  });
});
